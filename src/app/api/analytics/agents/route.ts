import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/analytics/agents - Get agent performance analytics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');
    const agent_id = searchParams.get('agent_id'); // Optional: filter by specific agent
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const days = searchParams.get('days') || '30';

    // Check if user is system_admin
    const isSystemAdmin = await hasPlatformPermission(user.id, 'analytics.view');

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ agents: [], summary: null });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);
    const clientToUse = isSystemAdmin ? adminSupabase : supabase;

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      const daysToLookBack = parseInt(days);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLookBack);
    }

    // Get agents
    let agentsQuery = clientToUse
      .from('agents')
      .select('id, name, type, is_active, tenant_id')
      .in('tenant_id', tenantIds)
      .eq('is_active', true);

    if (tenant_id && tenantIds.includes(tenant_id)) {
      agentsQuery = agentsQuery.eq('tenant_id', tenant_id);
    }

    if (agent_id) {
      agentsQuery = agentsQuery.eq('id', agent_id);
    }

    const { data: agents, error: agentsError } = await agentsQuery;

    if (agentsError) {
      console.error('[Agent Analytics API] Error fetching agents:', agentsError);
      return NextResponse.json({ 
        error: agentsError.message || 'Failed to fetch agents' 
      }, { status: 500 });
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({ agents: [], summary: null });
    }

    const agentIds = agents.map(a => a.id);

    // Get interactions for these agents
    let interactionsQuery = clientToUse
      .from('interactions')
      .select('id, agent_id, status, type, duration, started_at, ended_at, metadata')
      .in('agent_id', agentIds)
      .in('tenant_id', tenantIds)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString());

    if (tenant_id && tenantIds.includes(tenant_id)) {
      interactionsQuery = interactionsQuery.eq('tenant_id', tenant_id);
    }

    const { data: interactions, error: interactionsError } = await interactionsQuery;

    if (interactionsError) {
      console.error('[Agent Analytics API] Error fetching interactions:', interactionsError);
      return NextResponse.json({ 
        error: interactionsError.message || 'Failed to fetch interactions' 
      }, { status: 500 });
    }

    // Calculate performance metrics for each agent
    const agentPerformance = agents.map(agent => {
      const agentInteractions = (interactions || []).filter(i => i.agent_id === agent.id);
      return calculateAgentMetrics(agent, agentInteractions);
    });

    // Sort by average score (performance ranking)
    agentPerformance.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

    // Get top and bottom performers
    const topPerformers = agentPerformance.slice(0, 3);
    const bottomPerformers = agentPerformance.slice(-3).reverse();

    // Calculate summary statistics
    const summary = calculateSummary(agentPerformance);

    // Calculate agent utilization
    const utilizationData = calculateUtilization(agentPerformance, interactions || [], startDate, endDate);

    return NextResponse.json({
      agents: agentPerformance,
      summary,
      rankings: {
        topPerformers,
        bottomPerformers,
      },
      utilization: utilizationData,
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Agent Analytics API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

function calculateAgentMetrics(agent: any, interactions: any[]): any {
  const totalCalls = interactions.length;
  const completedCalls = interactions.filter(i => i.status === 'completed').length;
  const failedCalls = interactions.filter(i => i.status === 'failed').length;
  const inProgressCalls = interactions.filter(i => i.status === 'in_progress').length;

  // Calculate durations
  const durations = interactions
    .filter(i => i.duration && i.duration > 0)
    .map(i => i.duration) as number[];

  const avgHandleTime = durations.length > 0
    ? Math.round((durations.reduce((sum, d) => sum + d, 0) / durations.length) / 60 * 100) / 100
    : 0; // in minutes

  // First call resolution (calls that completed without transfer/escalation)
  const resolvedCalls = interactions.filter(i => 
    i.status === 'completed' &&
    (!i.metadata || typeof i.metadata !== 'object' || 
     !(i.metadata as any).transferred && !(i.metadata as any).escalated)
  ).length;

  const firstCallResolution = completedCalls > 0
    ? Math.round((resolvedCalls / completedCalls) * 100 * 100) / 100
    : 0;

  // Answer rate
  const answerRate = totalCalls > 0
    ? Math.round((completedCalls / totalCalls) * 100 * 100) / 100
    : 0;

  // Quality score (composite metric)
  // Weighted average: answerRate (40%), FCR (30%), avgHandleTime inverse (30%)
  const handleTimeScore = avgHandleTime > 0 ? Math.min(100, (300 / avgHandleTime)) : 50; // Inverse relationship
  const averageScore = Math.round(
    (answerRate * 0.4) + 
    (firstCallResolution * 0.3) + 
    (handleTimeScore * 0.3)
  );

  // Customer satisfaction (from metadata if available)
  const satisfactionScores = interactions
    .filter(i => i.metadata && typeof i.metadata === 'object' && (i.metadata as any).satisfaction_score)
    .map(i => (i.metadata as any).satisfaction_score) as number[];

  const customerSatisfaction = satisfactionScores.length > 0
    ? Math.round((satisfactionScores.reduce((sum, s) => sum + s, 0) / satisfactionScores.length) * 100) / 100
    : null;

  // Training needs identification (areas where performance is below threshold)
  const trainingNeeds = [];
  if (answerRate < 80) trainingNeeds.push('Answer Rate');
  if (firstCallResolution < 75) trainingNeeds.push('First Call Resolution');
  if (avgHandleTime > 5) trainingNeeds.push('Handle Time Efficiency');
  if (customerSatisfaction !== null && customerSatisfaction < 4.0) trainingNeeds.push('Customer Satisfaction');

  return {
    agentId: agent.id,
    agentName: agent.name,
    agentType: agent.type,
    isActive: agent.is_active,
    metrics: {
      totalCalls,
      completedCalls,
      failedCalls,
      inProgressCalls,
      avgHandleTime,
      avgHandleTimeFormatted: formatDuration(avgHandleTime * 60),
      firstCallResolution,
      answerRate,
      customerSatisfaction,
      averageScore,
    },
    trainingNeeds,
    trend: 'stable', // Would calculate from historical comparison
  };
}

function calculateSummary(agentPerformance: any[]): any {
  if (agentPerformance.length === 0) {
    return null;
  }

  const totalAgents = agentPerformance.length;
  const totalCalls = agentPerformance.reduce((sum, a) => sum + (a.metrics.totalCalls || 0), 0);
  const avgScore = agentPerformance.reduce((sum, a) => sum + (a.metrics.averageScore || 0), 0) / totalAgents;
  const avgHandleTime = agentPerformance.reduce((sum, a) => sum + (a.metrics.avgHandleTime || 0), 0) / totalAgents;
  const avgFCR = agentPerformance.reduce((sum, a) => sum + (a.metrics.firstCallResolution || 0), 0) / totalAgents;

  return {
    totalAgents,
    totalCalls,
    averageScore: Math.round(avgScore * 100) / 100,
    averageHandleTime: Math.round(avgHandleTime * 100) / 100,
    averageFirstCallResolution: Math.round(avgFCR * 100) / 100,
  };
}

function calculateUtilization(agentPerformance: any[], interactions: any[], startDate: Date, endDate: Date): any {
  const periodDuration = endDate.getTime() - startDate.getTime();
  const periodMinutes = periodDuration / (1000 * 60);

  // For each agent, calculate active time (sum of durations) vs idle time
  const utilization = agentPerformance.map(agent => {
    const agentInteractions = interactions.filter(i => i.agent_id === agent.agentId);
    const totalActiveMinutes = agentInteractions
      .filter(i => i.duration)
      .reduce((sum, i) => sum + ((i.duration || 0) / 60), 0);

    const utilizationRate = periodMinutes > 0
      ? Math.round((totalActiveMinutes / periodMinutes) * 100 * 100) / 100
      : 0;

    return {
      agentId: agent.agentId,
      agentName: agent.agentName,
      activeTime: Math.round(totalActiveMinutes),
      idleTime: Math.round(Math.max(0, periodMinutes - totalActiveMinutes)),
      utilizationRate,
      efficiency: agent.metrics.averageScore || 0,
    };
  });

  return {
    agents: utilization,
    averageUtilization: utilization.length > 0
      ? Math.round(utilization.reduce((sum, u) => sum + u.utilizationRate, 0) / utilization.length * 100) / 100
      : 0,
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (minutes < 60) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

