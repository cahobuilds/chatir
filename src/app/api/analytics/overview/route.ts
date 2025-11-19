import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/analytics/overview - Get analytics overview for user's tenants
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
    const start_date = searchParams.get('start_date'); // ISO date string
    const end_date = searchParams.get('end_date'); // ISO date string
    const days = searchParams.get('days'); // Number of days to look back (default: 30)

    // Check if user is system_admin (can access all analytics)
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
        overview: {
          totalCalls: 0,
          answeredCalls: 0,
          failedCalls: 0,
          inProgressCalls: 0,
          answerRate: 0,
          avgHandleTime: 0,
          totalDuration: 0,
          voiceCalls: 0,
          chatConversations: 0,
          completedCalls: 0,
        },
        period: {
          start_date: null,
          end_date: null,
        },
      });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);
    
    // Use admin client for system admin to bypass RLS, regular client for others
    const clientToUse = isSystemAdmin ? adminSupabase : supabase;

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      const daysToLookBack = days ? parseInt(days) : 30;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToLookBack);
    }

    // Build base query
    let query = clientToUse
      .from('interactions')
      .select('id, status, type, duration, started_at, ended_at, tenant_id')
      .in('tenant_id', tenantIds)
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString());

    // Apply tenant filter if provided
    if (tenant_id && tenantIds.includes(tenant_id)) {
      query = query.eq('tenant_id', tenant_id);
    }

    const { data: interactions, error: interactionsError } = await query;

    if (interactionsError) {
      console.error('[Analytics Overview API] Error fetching interactions:', interactionsError);
      return NextResponse.json({ 
        error: interactionsError.message || 'Failed to fetch analytics data' 
      }, { status: 500 });
    }

    if (!interactions || interactions.length === 0) {
      return NextResponse.json({
        overview: {
          totalCalls: 0,
          answeredCalls: 0,
          failedCalls: 0,
          inProgressCalls: 0,
          answerRate: 0,
          avgHandleTime: 0,
          totalDuration: 0,
          voiceCalls: 0,
          chatConversations: 0,
          completedCalls: 0,
        },
        period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      });
    }

    // Calculate metrics
    const totalCalls = interactions.length;
    const completedCalls = interactions.filter(i => i.status === 'completed').length;
    const failedCalls = interactions.filter(i => i.status === 'failed').length;
    const inProgressCalls = interactions.filter(i => i.status === 'in_progress').length;
    const answeredCalls = completedCalls; // Completed calls are answered

    // Calculate answer rate (completed / total)
    const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;

    // Calculate average handle time (in seconds, then convert to minutes)
    const durations = interactions
      .filter(i => i.duration !== null && i.duration !== undefined)
      .map(i => i.duration as number);
    
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const avgHandleTimeSeconds = durations.length > 0 ? totalDuration / durations.length : 0;
    const avgHandleTimeMinutes = avgHandleTimeSeconds / 60;

    // Break down by type
    const voiceCalls = interactions.filter(i => i.type === 'voice').length;
    const chatConversations = interactions.filter(i => i.type === 'chat').length;

    // Format average handle time for display
    const formatDuration = (minutes: number): string => {
      if (minutes < 1) {
        const seconds = Math.round(minutes * 60);
        return `${seconds}s`;
      }
      const mins = Math.floor(minutes);
      const secs = Math.round((minutes - mins) * 60);
      return `${mins}m ${secs}s`;
    };

    return NextResponse.json({
      overview: {
        totalCalls,
        answeredCalls,
        failedCalls,
        inProgressCalls,
        answerRate: Math.round(answerRate * 100) / 100, // Round to 2 decimal places
        avgHandleTime: Math.round(avgHandleTimeMinutes * 100) / 100, // In minutes, rounded to 2 decimals
        avgHandleTimeFormatted: formatDuration(avgHandleTimeMinutes),
        totalDuration: Math.round(totalDuration), // Total duration in seconds
        voiceCalls,
        chatConversations,
        completedCalls,
      },
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
      breakdown: {
        byStatus: {
          completed: completedCalls,
          failed: failedCalls,
          in_progress: inProgressCalls,
        },
        byType: {
          voice: voiceCalls,
          chat: chatConversations,
        },
      },
    });
  } catch (error: any) {
    console.error('[Analytics Overview API] Unexpected error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

