import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/analytics/timeseries - Get time-series analytics for user's tenants
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
    const granularity = searchParams.get('granularity') || 'day'; // hour, day, week, month

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
      return NextResponse.json({ timeSeries: [], period: null });
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

    // Build query
    let query = clientToUse
      .from('interactions')
      .select('id, status, type, duration, started_at, ended_at')
      .in('tenant_id', tenantIds)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())
      .order('started_at', { ascending: true });

    if (tenant_id && tenantIds.includes(tenant_id)) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: interactions, error: interactionsError } = await query;

    if (interactionsError) {
      console.error('[Time Series Analytics API] Error:', interactionsError);
      return NextResponse.json({ 
        error: interactionsError.message || 'Failed to fetch time series data' 
      }, { status: 500 });
    }

    if (!interactions || interactions.length === 0) {
      return NextResponse.json({
        timeSeries: [],
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          granularity,
        },
        peakAnalysis: {
          busiestHour: null,
          busiestDay: null,
          busiestDayOfWeek: null,
        },
        growthMetrics: {
          monthOverMonth: null,
          yearOverYear: null,
        },
      });
    }

    // Group by granularity
    const grouped = groupByGranularity(interactions, granularity, startDate, endDate);

    // Calculate peak analysis
    const peakAnalysis = calculatePeakAnalysis(interactions);

    // Calculate growth metrics (comparing to previous period)
    const growthMetrics = await calculateGrowthMetrics(
      clientToUse,
      tenantIds,
      tenant_id,
      startDate,
      endDate
    );

    return NextResponse.json({
      timeSeries: grouped,
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        granularity,
      },
      peakAnalysis,
      growthMetrics,
    });
  } catch (error: any) {
    console.error('[Time Series Analytics API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

function groupByGranularity(
  interactions: any[],
  granularity: string,
  startDate: Date,
  endDate: Date
): any[] {
  const groups: Record<string, any> = {};

  interactions.forEach(interaction => {
    const date = new Date(interaction.started_at);
    let key: string;

    switch (granularity) {
      case 'hour':
        key = date.toISOString().slice(0, 13) + ':00:00.000Z';
        break;
      case 'day':
        key = date.toISOString().slice(0, 10) + 'T00:00:00.000Z';
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10) + 'T00:00:00.000Z';
        break;
      case 'month':
        const month = String(date.getMonth() + 1).padStart(2, '0');
        key = `${date.getFullYear()}-${month}-01T00:00:00.000Z`;
        break;
      default:
        key = date.toISOString().slice(0, 10) + 'T00:00:00.000Z';
    }

    if (!groups[key]) {
      groups[key] = {
        period: key,
        totalCalls: 0,
        completedCalls: 0,
        failedCalls: 0,
        inProgressCalls: 0,
        voiceCalls: 0,
        chatConversations: 0,
        totalDuration: 0,
        avgDuration: 0,
        answerRate: 0,
      };
    }

    groups[key].totalCalls++;
    if (interaction.status === 'completed') groups[key].completedCalls++;
    if (interaction.status === 'failed') groups[key].failedCalls++;
    if (interaction.status === 'in_progress') groups[key].inProgressCalls++;
    if (interaction.type === 'voice') groups[key].voiceCalls++;
    if (interaction.type === 'chat') groups[key].chatConversations++;
    if (interaction.duration) {
      groups[key].totalDuration += interaction.duration;
    }
  });

  // Convert to array and calculate derived metrics
  return Object.keys(groups)
    .sort()
    .map(key => {
      const group = groups[key];
      group.avgDuration = group.completedCalls > 0 
        ? Math.round((group.totalDuration / group.completedCalls) / 60 * 100) / 100
        : 0; // in minutes
      group.answerRate = group.totalCalls > 0
        ? Math.round((group.completedCalls / group.totalCalls) * 100 * 100) / 100
        : 0;
      return group;
    });
}

function calculatePeakAnalysis(interactions: any[]): any {
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<string, number> = {};
  const dayOfWeekCounts: Record<number, number> = {};

  interactions.forEach(interaction => {
    const date = new Date(interaction.started_at);
    const hour = date.getHours();
    const dayKey = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay();

    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
  });

  const busiestHour = Object.keys(hourCounts).reduce((a, b) => 
    hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b, '0'
  );

  const busiestDay = Object.keys(dayCounts).reduce((a, b) => 
    dayCounts[a] > dayCounts[b] ? a : b, ''
  );

  const busiestDayOfWeek = Object.keys(dayOfWeekCounts).reduce((a, b) => 
    dayOfWeekCounts[parseInt(a)] > dayOfWeekCounts[parseInt(b)] ? a : b, '0'
  );

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    busiestHour: parseInt(busiestHour),
    busiestHourFormatted: `${busiestHour}:00`,
    busiestDay,
    busiestDayOfWeek: parseInt(busiestDayOfWeek),
    busiestDayOfWeekName: dayNames[parseInt(busiestDayOfWeek)],
    busiestHourCount: hourCounts[parseInt(busiestHour)] || 0,
    busiestDayCount: dayCounts[busiestDay] || 0,
    busiestDayOfWeekCount: dayOfWeekCounts[parseInt(busiestDayOfWeek)] || 0,
  };
}

async function calculateGrowthMetrics(
  client: any,
  tenantIds: string[],
  tenant_id: string | null,
  startDate: Date,
  endDate: Date
): Promise<any> {
  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousPeriodStart = new Date(startDate.getTime() - periodDuration);
  const previousPeriodEnd = startDate;

  // Current period count
  let currentQuery = client
    .from('interactions')
    .select('id', { count: 'exact' })
    .in('tenant_id', tenantIds)
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString());

  if (tenant_id && tenantIds.includes(tenant_id)) {
    currentQuery = currentQuery.eq('tenant_id', tenant_id);
  }

  const { count: currentCount } = await currentQuery;

  // Previous period count
  let previousQuery = client
    .from('interactions')
    .select('id', { count: 'exact' })
    .in('tenant_id', tenantIds)
    .gte('started_at', previousPeriodStart.toISOString())
    .lt('started_at', previousPeriodEnd.toISOString());

  if (tenant_id && tenantIds.includes(tenant_id)) {
    previousQuery = previousQuery.eq('tenant_id', tenant_id);
  }

  const { count: previousCount } = await previousQuery;

  const monthOverMonth = previousCount && previousCount > 0
    ? Math.round(((currentCount || 0) - previousCount) / previousCount * 100 * 100) / 100
    : null;

  // Year over year (same period last year)
  const lastYearStart = new Date(startDate);
  lastYearStart.setFullYear(startDate.getFullYear() - 1);
  const lastYearEnd = new Date(endDate);
  lastYearEnd.setFullYear(endDate.getFullYear() - 1);

  let yoyQuery = client
    .from('interactions')
    .select('id', { count: 'exact' })
    .in('tenant_id', tenantIds)
    .gte('started_at', lastYearStart.toISOString())
    .lte('started_at', lastYearEnd.toISOString());

  if (tenant_id && tenantIds.includes(tenant_id)) {
    yoyQuery = yoyQuery.eq('tenant_id', tenant_id);
  }

  const { count: yoyCount } = await yoyQuery;

  const yearOverYear = yoyCount && yoyCount > 0
    ? Math.round(((currentCount || 0) - yoyCount) / yoyCount * 100 * 100) / 100
    : null;

  return {
    monthOverMonth,
    yearOverYear,
    currentPeriodCount: currentCount || 0,
    previousPeriodCount: previousCount || 0,
    yoyPeriodCount: yoyCount || 0,
  };
}

