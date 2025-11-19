import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/analytics/customer-experience - Get customer experience metrics
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
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const days = searchParams.get('days') || '30';

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
        satisfactionTrends: [],
        sentimentAnalysis: {
          positive: 0,
          neutral: 0,
          negative: 0,
          average: 0,
        },
        resolutionRate: 0,
        escalationPatterns: {
          total: 0,
          byReason: {},
          trends: [],
        },
        customerJourney: {
          singleCallResolution: 0,
          multiCallResolution: 0,
          averageCallsPerCustomer: 0,
        },
      });
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

    // Get interactions with transcripts and metadata
    let query = clientToUse
      .from('interactions')
      .select('id, status, started_at, ended_at, transcript, metadata, customer_phone, customer_email')
      .in('tenant_id', tenantIds)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString());

    if (tenant_id && tenantIds.includes(tenant_id)) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: interactions, error: interactionsError } = await query;

    if (interactionsError) {
      console.error('[Customer Experience API] Error:', interactionsError);
      return NextResponse.json({ 
        error: interactionsError.message || 'Failed to fetch customer experience data' 
      }, { status: 500 });
    }

    if (!interactions || interactions.length === 0) {
      return NextResponse.json({
        satisfactionTrends: [],
        sentimentAnalysis: {
          positive: 0,
          neutral: 0,
          negative: 0,
          average: 0,
        },
        resolutionRate: 0,
        escalationPatterns: {
          total: 0,
          byReason: {},
          trends: [],
        },
        customerJourney: {
          singleCallResolution: 0,
          multiCallResolution: 0,
          averageCallsPerCustomer: 0,
        },
      });
    }

    // Customer satisfaction trends (grouped by time period)
    const satisfactionTrends = calculateSatisfactionTrends(interactions, startDate, endDate);

    // Sentiment analysis from transcripts
    const sentimentAnalysis = analyzeSentiment(interactions);

    // Resolution rate (issues resolved on first call)
    const resolutionRate = calculateResolutionRate(interactions);

    // Escalation patterns
    const escalationPatterns = calculateEscalationPatterns(interactions);

    // Customer journey analytics (multi-call resolution paths)
    const customerJourney = await calculateCustomerJourney(
      clientToUse,
      tenantIds,
      tenant_id,
      interactions,
      startDate,
      endDate
    );

    return NextResponse.json({
      satisfactionTrends,
      sentimentAnalysis,
      resolutionRate,
      escalationPatterns,
      customerJourney,
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Customer Experience API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

function calculateSatisfactionTrends(interactions: any[], startDate: Date, endDate: Date): any[] {
  // Group by day
  const dailyGroups: Record<string, { scores: number[]; count: number }> = {};

  interactions.forEach(interaction => {
    if (interaction.metadata && typeof interaction.metadata === 'object') {
      const metadata = interaction.metadata as any;
      const satisfactionScore = metadata.satisfaction_score || metadata.csat_score;
      
      if (satisfactionScore !== undefined) {
        const date = new Date(interaction.started_at);
        const dayKey = date.toISOString().slice(0, 10);

        if (!dailyGroups[dayKey]) {
          dailyGroups[dayKey] = { scores: [], count: 0 };
        }

        dailyGroups[dayKey].scores.push(satisfactionScore);
        dailyGroups[dayKey].count++;
      }
    }
  });

  return Object.keys(dailyGroups)
    .sort()
    .map(dayKey => {
      const group = dailyGroups[dayKey];
      const average = group.scores.reduce((sum, s) => sum + s, 0) / group.scores.length;
      return {
        date: dayKey,
        average: Math.round(average * 100) / 100,
        count: group.count,
      };
    });
}

function analyzeSentiment(interactions: any[]): any {
  const sentiments: number[] = [];

  interactions.forEach(interaction => {
    // Extract sentiment from metadata or analyze transcript
    if (interaction.metadata && typeof interaction.metadata === 'object') {
      const metadata = interaction.metadata as any;
      if (metadata.sentiment_score !== undefined) {
        sentiments.push(metadata.sentiment_score);
      } else if (metadata.sentiment) {
        // Convert sentiment label to score
        const sentimentMap: Record<string, number> = {
          positive: 0.8,
          neutral: 0.0,
          negative: -0.8,
        };
        sentiments.push(sentimentMap[metadata.sentiment.toLowerCase()] || 0);
      }
    }

    // Could also analyze transcript here if available
    // For now, we'll use metadata values
  });

  if (sentiments.length === 0) {
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      average: 0,
    };
  }

  const positive = sentiments.filter(s => s > 0.3).length;
  const neutral = sentiments.filter(s => s >= -0.3 && s <= 0.3).length;
  const negative = sentiments.filter(s => s < -0.3).length;
  const average = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;

  return {
    positive,
    neutral,
    negative,
    total: sentiments.length,
    average: Math.round(average * 1000) / 1000,
    distribution: {
      positive: Math.round((positive / sentiments.length) * 100 * 100) / 100,
      neutral: Math.round((neutral / sentiments.length) * 100 * 100) / 100,
      negative: Math.round((negative / sentiments.length) * 100 * 100) / 100,
    },
  };
}

function calculateResolutionRate(interactions: any[]): any {
  const completed = interactions.filter(i => i.status === 'completed');
  const resolved = completed.filter(i => 
    !i.metadata || 
    typeof i.metadata !== 'object' || 
    (!(i.metadata as any).transferred && !(i.metadata as any).escalated && !(i.metadata as any).follow_up_required)
  );

  const resolutionRate = completed.length > 0
    ? Math.round((resolved.length / completed.length) * 100 * 100) / 100
    : 0;

  return {
    rate: resolutionRate,
    resolved: resolved.length,
    total: completed.length,
  };
}

function calculateEscalationPatterns(interactions: any[]): any {
  const escalated = interactions.filter(i => 
    i.metadata && 
    typeof i.metadata === 'object' && 
    ((i.metadata as any).escalated === true || (i.metadata as any).escalation_count > 0)
  );

  const byReason: Record<string, number> = {};

  escalated.forEach(interaction => {
    if (interaction.metadata && typeof interaction.metadata === 'object') {
      const metadata = interaction.metadata as any;
      const reason = metadata.escalation_reason || metadata.reason || 'Unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;
    }
  });

  // Calculate escalation rate
  const escalationRate = interactions.length > 0
    ? Math.round((escalated.length / interactions.length) * 100 * 100) / 100
    : 0;

  return {
    total: escalated.length,
    rate: escalationRate,
    byReason,
  };
}

async function calculateCustomerJourney(
  client: any,
  tenantIds: string[],
  tenant_id: string | null,
  interactions: any[],
  startDate: Date,
  endDate: Date
): Promise<any> {
  // Group interactions by customer (phone or email)
  const customerInteractions: Record<string, any[]> = {};

  interactions.forEach(interaction => {
    const customerId = interaction.customer_phone || interaction.customer_email || 'unknown';
    if (!customerInteractions[customerId]) {
      customerInteractions[customerId] = [];
    }
    customerInteractions[customerId].push(interaction);
  });

  // Calculate single vs multi-call resolution
  let singleCallResolution = 0;
  let multiCallResolution = 0;
  let totalCallsForCustomers = 0;

  Object.values(customerInteractions).forEach(customerCalls => {
    totalCallsForCustomers += customerCalls.length;
    if (customerCalls.length === 1) {
      const call = customerCalls[0];
      if (call.status === 'completed' && 
          (!call.metadata || typeof call.metadata !== 'object' || 
           !(call.metadata as any).follow_up_required)) {
        singleCallResolution++;
      }
    } else {
      // Multi-call customer
      const resolved = customerCalls.some(call => 
        call.status === 'completed' && 
        (!call.metadata || typeof call.metadata !== 'object' || 
         !(call.metadata as any).follow_up_required)
      );
      if (resolved) {
        multiCallResolution++;
      }
    }
  });

  const uniqueCustomers = Object.keys(customerInteractions).filter(k => k !== 'unknown').length;
  const averageCallsPerCustomer = uniqueCustomers > 0
    ? Math.round((totalCallsForCustomers / uniqueCustomers) * 100) / 100
    : 0;

  return {
    singleCallResolution,
    multiCallResolution,
    totalCustomers: uniqueCustomers,
    averageCallsPerCustomer,
    singleCallRate: uniqueCustomers > 0
      ? Math.round((singleCallResolution / uniqueCustomers) * 100 * 100) / 100
      : 0,
  };
}

