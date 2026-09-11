import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission, canAccessTenant } from '@/lib/permissions-server';
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// GET /api/knowledge-bases - Get knowledge bases for current user's tenant(s)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Platform staff can access all knowledge bases.
    const isSystemAdmin = await hasPlatformPermission(user.id, 'orgs.view');

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

    // Verify user can manage this tenant's knowledge base (or is platform staff).
    if (!(await canAccessTenant(user.id, tenant_id, 'knowledge.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    const clientToUse = createAdminClient(); // access already verified via canAccessTenant above

    const { data: knowledgeBase, error: kbError } = await clientToUse
      .from('knowledge_bases')
      .insert({
        tenant_id,
        name,
        type,
        description: description || null,
        configuration: configuration || {},
        status: 'syncing', // not yet created in the voice provider -- first source add will create it there
        page_count: 0,
      })
      .select()
      .single();

    if (kbError) {
      return NextResponse.json({ error: kbError.message }, { status: 500 });
    }

    // Create directory for knowledge base files (if not in serverless environment)
    try {
      // Only create directories if we're in a file system environment
      // This will work in local/dev but gracefully fail in serverless environments
      const kbDirectory = path.join(process.cwd(), 'knowledge-bases', tenant_id, knowledgeBase.id);
      await fs.mkdir(kbDirectory, { recursive: true });
      console.log(`[KB API] Created directory for knowledge base: ${kbDirectory}`);
    } catch (dirError: any) {
      // Directory creation is optional - log but don't fail the request
      // This is expected in serverless environments (Vercel, etc.)
      console.log(`[KB API] Could not create directory (may be serverless environment): ${dirError.message}`);
    }

    return NextResponse.json({ knowledge_base: knowledgeBase }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

