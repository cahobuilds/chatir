import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/analytics/realtime - Get real-time analytics for user's tenants
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

    // Check if user is system_admin
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({
        liveCallVolume: {
          activeCalls: 0,
          queueLength: 0,
          avgWaitTime: 0,
          longestWaitTime: 0,
        },
        agentStatus: {
          online: 0,
          busy: 0,
          idle: 0,
          total: 0,
        },
        liveMetrics: {
          currentHourCalls: 0,
          currentHourCompleted: 0,
          currentHourAnswerRate: 0,
          activeConversations: 0,
        },
        systemHealth: {
          apiResponseTime: null, // This would come from monitoring
          errorRate: 0,
          totalErrors: 0,
          uptime: 99.9,
        },
      });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);
    const clientToUse = isSystemAdmin ? adminSupabase : supabase;

    // Get current hour start
    const now = new Date();
    const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);

    // Build base query for active calls (in_progress)
    let activeCallsQuery = clientToUse
      .from('interactions')
      .select('id, status, started_at, type, agent_id')
      .eq('status', 'in_progress')
      .in('tenant_id', tenantIds);

    if (tenant_id && tenantIds.includes(tenant_id)) {
      activeCallsQuery = activeCallsQuery.eq('tenant_id', tenant_id);
    }

    const { data: activeCalls, error: activeCallsError } = await activeCallsQuery;

    // Get current hour metrics
    let currentHourQuery = clientToUse
      .from('interactions')
      .select('id, status, started_at')
      .gte('started_at', currentHourStart.toISOString())
      .in('tenant_id', tenantIds);

    if (tenant_id && tenantIds.includes(tenant_id)) {
      currentHourQuery = currentHourQuery.eq('tenant_id', tenant_id);
    }

    const { data: currentHourInteractions, error: currentHourError } = await currentHourQuery;

    // Get failed interactions for error rate (last 24 hours)
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let errorsQuery = clientToUse
      .from('interactions')
      .select('id, status', { count: 'exact' })
      .eq('status', 'failed')
      .gte('started_at', last24Hours.toISOString())
      .in('tenant_id', tenantIds);

    if (tenant_id && tenantIds.includes(tenant_id)) {
      errorsQuery = errorsQuery.eq('tenant_id', tenant_id);
    }

    const { data: errors, error: errorsError, count: errorCount } = await errorsQuery;

    // Get all interactions in last 24 hours for error rate calculation
    let totalLast24HoursQuery = clientToUse
      .from('interactions')
      .select('id', { count: 'exact' })
      .gte('started_at', last24Hours.toISOString())
      .in('tenant_id', tenantIds);

    if (tenant_id && tenantIds.includes(tenant_id)) {
      totalLast24HoursQuery = totalLast24HoursQuery.eq('tenant_id', tenant_id);
    }

    const { count: totalLast24Hours } = await totalLast24HoursQuery;

    // Get active agents (agents with active calls)
    const activeAgentIds = [...new Set((activeCalls || []).map(call => call.agent_id).filter(Boolean))];
    
    // Get all agents for tenant(s) to calculate agent status
    let agentsQuery = clientToUse
      .from('agents')
      .select('id, is_active')
      .in('tenant_id', tenantIds)
      .eq('is_active', true);

    if (tenant_id && tenantIds.includes(tenant_id)) {
      agentsQuery = agentsQuery.eq('tenant_id', tenant_id);
    }

    const { data: allAgents } = await agentsQuery;
    const totalAgents = allAgents?.length || 0;
    const busyAgents = activeAgentIds.length;
    const idleAgents = Math.max(0, totalAgents - busyAgents);

    // Calculate wait times (for in_progress calls)
    const waitTimes = (activeCalls || []).map(call => {
      const startTime = new Date(call.started_at).getTime();
      return Math.floor((now.getTime() - startTime) / 1000); // Wait time in seconds
    });

    const avgWaitTime = waitTimes.length > 0 
      ? Math.round(waitTimes.reduce((sum, wt) => sum + wt, 0) / waitTimes.length)
      : 0;
    const longestWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

    // Current hour metrics
    const currentHourCalls = currentHourInteractions?.length || 0;
    const currentHourCompleted = currentHourInteractions?.filter(i => i.status === 'completed').length || 0;
    const currentHourAnswerRate = currentHourCalls > 0 
      ? Math.round((currentHourCompleted / currentHourCalls) * 100 * 100) / 100
      : 0;

    // Error rate calculation
    const errorRate = totalLast24Hours && totalLast24Hours > 0
      ? Math.round((errorCount || 0) / totalLast24Hours * 100 * 100) / 100
      : 0;

    if (activeCallsError || currentHourError || errorsError) {
      console.error('[Realtime Analytics API] Error:', { activeCallsError, currentHourError, errorsError });
    }

    return NextResponse.json({
      liveCallVolume: {
        activeCalls: activeCalls?.length || 0,
        queueLength: activeCalls?.filter(c => !c.agent_id).length || 0, // Calls without agent assignment
        avgWaitTime, // in seconds
        longestWaitTime, // in seconds
        avgWaitTimeFormatted: formatDuration(avgWaitTime),
        longestWaitTimeFormatted: formatDuration(longestWaitTime),
      },
      agentStatus: {
        online: totalAgents,
        busy: busyAgents,
        idle: idleAgents,
        total: totalAgents,
      },
      liveMetrics: {
        currentHourCalls,
        currentHourCompleted,
        currentHourAnswerRate,
        activeConversations: activeCalls?.length || 0,
        currentHourStart: currentHourStart.toISOString(),
      },
      systemHealth: {
        apiResponseTime: null, // Would be tracked by monitoring system
        errorRate,
        totalErrors: errorCount || 0,
        uptime: 99.9, // Would be calculated from system monitoring
        totalInteractionsLast24h: totalLast24Hours || 0,
      },
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[Realtime Analytics API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

