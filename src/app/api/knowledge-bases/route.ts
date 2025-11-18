import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/knowledge-bases - Get knowledge bases for current user's tenant(s)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system_admin (can access all knowledge bases)
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type'); // 'notion', 'web', 'file', 'text'

    // If system admin, get all knowledge bases using admin client to bypass RLS
    if (isSystemAdmin) {
      let kbQuery = adminSupabase
        .from('knowledge_bases')
        .select('*');

      // Apply type filter if provided
      if (typeFilter && ['notion', 'web', 'file', 'text'].includes(typeFilter)) {
        kbQuery = kbQuery.eq('type', typeFilter);
      }

      const { data: knowledgeBases, error: kbError } = await kbQuery
        .order('created_at', { ascending: false });

      if (kbError) {
        console.error(`[Knowledge Bases API] Error fetching knowledge bases (system admin):`, kbError);
        return NextResponse.json({ error: kbError.message }, { status: 500 });
      }

      console.log(`[Knowledge Bases API] System admin found ${knowledgeBases?.length || 0} knowledge bases (type: ${typeFilter || 'all'})`);

      return NextResponse.json({ knowledge_bases: knowledgeBases || [] });
    }

    // For regular users, get their tenant IDs
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!userTenants || userTenants.length === 0) {
      console.log(`[Knowledge Bases API] User ${user.id} has no active tenant access`);
      return NextResponse.json({ knowledge_bases: [] });
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id);
    
    console.log(`[Knowledge Bases API] User ${user.id} has access to tenants:`, tenantIds);
    
    let kbQuery = supabase
      .from('knowledge_bases')
      .select('*');

    // Apply tenant filter
    kbQuery = kbQuery.in('tenant_id', tenantIds);

    // Apply type filter if provided
    if (typeFilter && ['notion', 'web', 'file', 'text'].includes(typeFilter)) {
      kbQuery = kbQuery.eq('type', typeFilter);
    }

    // Execute query
    const { data: knowledgeBases, error: kbError } = await kbQuery
      .order('created_at', { ascending: false });

    if (kbError) {
      console.error(`[Knowledge Bases API] Error fetching knowledge bases:`, kbError);
      return NextResponse.json({ error: kbError.message }, { status: 500 });
    }

    console.log(`[Knowledge Bases API] Found ${knowledgeBases?.length || 0} knowledge bases for user ${user.id} (type: ${typeFilter || 'all'})`);

    return NextResponse.json({ knowledge_bases: knowledgeBases || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/knowledge-bases - Create a new knowledge base
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id, name, type, description, configuration } = body;

    if (!tenant_id || !name || !type) {
      return NextResponse.json(
        { error: 'tenant_id, name, and type are required' },
        { status: 400 }
      );
    }

    if (!['notion', 'web', 'file', 'text'].includes(type)) {
      return NextResponse.json({ 
        error: 'type must be "notion", "web", "file", or "text"' 
      }, { status: 400 });
    }

    // Check if user is system_admin (can create knowledge bases for any tenant)
    const { data: systemAdminCheck } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['system_admin'])
      .single();

    const isSystemAdmin = !!systemAdminCheck;

    // If not system_admin, verify user has access to this tenant
    if (!isSystemAdmin) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant_id)
        .in('role', ['tenant_admin', 'super_admin', 'agent'])
        .single();

      if (!userTenant) {
        return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
      }
    }

    // Use admin client for system admin to bypass RLS, regular client for others
    const clientToUse = isSystemAdmin ? createAdminClient() : supabase;

    // Create knowledge base
    const { data: knowledgeBase, error: kbError } = await clientToUse
      .from('knowledge_bases')
      .insert({
        tenant_id,
        name,
        type,
        description: description || null,
        configuration: configuration || {},
        status: 'synced',
        page_count: 0,
      })
      .select()
      .single();

    if (kbError) {
      return NextResponse.json({ error: kbError.message }, { status: 500 });
    }

    return NextResponse.json({ knowledge_base: knowledgeBase }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

