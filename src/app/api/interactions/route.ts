import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/interactions - Get interactions for user's tenants
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');
    const agent_id = searchParams.get('agent_id');
    const status = searchParams.get('status');
    const type = searchParams.get('type'); // Filter by interaction type: 'voice' or 'chat'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ interactions: [], total: 0 });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);

    // Build query
    let query = supabase
      .from('interactions')
      .select('*, agents(name, type), tenants(name)', { count: 'exact' })
      .in('tenant_id', tenantIds)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tenant_id && tenantIds.includes(tenant_id)) {
      query = query.eq('tenant_id', tenant_id);
    }

    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: interactions, error: interactionsError, count } = await query;

    if (interactionsError) {
      return NextResponse.json({ error: interactionsError.message }, { status: 500 });
    }

    return NextResponse.json({
      interactions: interactions || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

