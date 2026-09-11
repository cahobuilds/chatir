import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/analytics/calls - Get advanced call analytics
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
    const isSystemAdmin = await hasPlatformPermission(user.id, 'analytics.view');

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({
        callOutcomes: {
          successful: 0,
          abandoned: 0,
          transferred: 0,
          escalated: 0,
          failed: 0,
        },
        durationDistribution: {
          p50: 0,
          p95: 0,
          p99: 0,
          min: 0,
          max: 0,
          mean: 0,
        },
        qualityScores: {
          average: 0,
          distribution: {
            excellent: 0,
            good: 0,
            average: 0,
            poor: 0,
          },
        },
        averageSpeedOfAnswer: 0,
        abandonRate: 0,
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

    // Build query
    let query = clientToUse
      .from('interactions')
      .select('id, status, type, duration, started_at, ended_at, metadata, transcript')
      .in('tenant_id', tenantIds)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString());

    if (tenant_id && tenantIds.includes(tenant_id)) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: interactions, error: interactionsError } = await query;

    if (interactionsError) {
      console.error('[Call Analytics API] Error:', interactionsError);
      return NextResponse.json({ 
        error: interactionsError.message || 'Failed to fetch call analytics' 
      }, { status: 500 });
    }

    if (!interactions || interactions.length === 0) {
      return NextResponse.json({
        callOutcomes: {
          successful: 0,
          abandoned: 0,
          transferred: 0,
          escalated: 0,
          failed: 0,
        },
        durationDistribution: {
          p50: 0,
          p95: 0,
          p99: 0,
          min: 0,
          max: 0,
          mean: 0,
        },
        qualityScores: {
          average: 0,
          distribution: {
            excellent: 0,
            good: 0,
            average: 0,
            poor: 0,
          },
        },
        averageSpeedOfAnswer: 0,
        abandonRate: 0,
      });
    }

    // Calculate call outcomes
    const callOutcomes = {
      successful: interactions.filter(i => i.status === 'completed').length,
      abandoned: calculateAbandoned(interactions),
      transferred: calculateTransferred(interactions),
      escalated: calculateEscalated(interactions),
      failed: interactions.filter(i => i.status === 'failed').length,
    };

    // Duration distribution
    const durations = interactions
      .filter(i => i.duration && i.duration > 0)
      .map(i => i.duration)
      .sort((a, b) => a - b) as number[];

    const durationDistribution = calculatePercentiles(durations);

    // Quality scores (based on sentiment analysis from transcripts if available)
    const qualityScores = calculateQualityScores(interactions);

    // Average speed of answer (time from start to first response)
    const averageSpeedOfAnswer = calculateAverageSpeedOfAnswer(interactions);

    // Abandon rate
    const totalCalls = interactions.length;
    const answeredCalls = callOutcomes.successful;
    const abandonedCalls = callOutcomes.abandoned;
    const abandonRate = totalCalls > 0
      ? Math.round((abandonedCalls / totalCalls) * 100 * 100) / 100
      : 0;

    return NextResponse.json({
      callOutcomes,
      durationDistribution: {
        ...durationDistribution,
        p50Formatted: formatDuration(durationDistribution.p50),
        p95Formatted: formatDuration(durationDistribution.p95),
        p99Formatted: formatDuration(durationDistribution.p99),
        meanFormatted: formatDuration(durationDistribution.mean),
      },
      qualityScores,
      averageSpeedOfAnswer: Math.round(averageSpeedOfAnswer * 100) / 100,
      averageSpeedOfAnswerFormatted: formatDuration(averageSpeedOfAnswer),
      abandonRate,
      totalCalls,
      answeredCalls,
      abandonedCalls,
    });
  } catch (error: any) {
    console.error('[Call Analytics API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

function calculateAbandoned(interactions: any[]): number {
  // Calls that started but never completed and are not in progress
  return interactions.filter(i => 
    i.status === 'failed' && 
    i.metadata && 
    typeof i.metadata === 'object' &&
    (i.metadata as any).abandoned === true
  ).length;
}

function calculateTransferred(interactions: any[]): number {
  // Calls that were transferred (check metadata)
  return interactions.filter(i => 
    i.metadata && 
    typeof i.metadata === 'object' &&
    ((i.metadata as any).transferred === true || (i.metadata as any).transfer_count > 0)
  ).length;
}

function calculateEscalated(interactions: any[]): number {
  // Calls that were escalated (check metadata)
  return interactions.filter(i => 
    i.metadata && 
    typeof i.metadata === 'object' &&
    ((i.metadata as any).escalated === true || (i.metadata as any).escalation_count > 0)
  ).length;
}

function calculatePercentiles(durations: number[]): any {
  if (durations.length === 0) {
    return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const getPercentile = (percentile: number) => {
    const index = Math.ceil((sorted.length - 1) * (percentile / 100));
    return sorted[index] || 0;
  };

  const mean = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;

  return {
    p50: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean * 100) / 100,
  };
}

function calculateQualityScores(interactions: any[]): any {
  // Try to extract quality scores from transcripts or metadata
  const scores: number[] = [];

  interactions.forEach(interaction => {
    if (interaction.metadata && typeof interaction.metadata === 'object') {
      const metadata = interaction.metadata as any;
      if (metadata.quality_score !== undefined) {
        scores.push(metadata.quality_score);
      } else if (metadata.sentiment_score !== undefined) {
        // Convert sentiment to quality score (0-100)
        scores.push((metadata.sentiment_score + 1) * 50);
      }
    }

    // Could also analyze transcript for sentiment if available
    // For now, we'll use a basic calculation
  });

  if (scores.length === 0) {
    // Default distribution if no scores available
    return {
      average: 0,
      distribution: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0,
      },
    };
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  const distribution = {
    excellent: scores.filter(s => s >= 90).length,
    good: scores.filter(s => s >= 75 && s < 90).length,
    average: scores.filter(s => s >= 50 && s < 75).length,
    poor: scores.filter(s => s < 50).length,
  };

  return {
    average: Math.round(average * 100) / 100,
    distribution,
  };
}

function calculateAverageSpeedOfAnswer(interactions: any[]): number {
  // Calculate time from call start to first response
  // This would ideally come from transcript timestamps or metadata
  const speeds: number[] = [];

  interactions.forEach(interaction => {
    if (interaction.metadata && typeof interaction.metadata === 'object') {
      const metadata = interaction.metadata as any;
      if (metadata.first_response_time !== undefined) {
        speeds.push(metadata.first_response_time);
      } else if (metadata.answer_time !== undefined) {
        speeds.push(metadata.answer_time);
      }
    }
  });

  if (speeds.length === 0) {
    return 0; // No data available
  }

  const average = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  return average; // in seconds
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

