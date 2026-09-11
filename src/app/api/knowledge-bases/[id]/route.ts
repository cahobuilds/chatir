import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hasPlatformPermission, canAccessTenant } from '@/lib/permissions-server';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/knowledge-bases/[id] - Get knowledge base by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Platform staff can access any knowledge base.
    const isSystemAdmin = await hasPlatformPermission(user.id, 'orgs.view');

    // Use admin client for system admin to bypass RLS, regular client for others
    const clientToUse = isSystemAdmin ? createAdminClient() : supabase;

    // Get knowledge base (RLS will ensure user can only access KBs from their tenant, unless system_admin)
    const { data: knowledgeBase, error: kbError } = await clientToUse
      .from('knowledge_bases')
      .select('*')
      .eq('id', id)
      .single();

    if (kbError) {
      return NextResponse.json({ error: kbError.message }, { status: 500 });
    }

    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
    }

    // Also fetch sources for this knowledge base
    const { data: sources } = await clientToUse
      .from('knowledge_base_sources')
      .select('*')
      .eq('knowledge_base_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ 
      knowledge_base: knowledgeBase,
      sources: sources || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/knowledge-bases/[id] - Update knowledge base
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, get the knowledge base to check tenant access
    const { data: knowledgeBase } = await supabase
      .from('knowledge_bases')
      .select('tenant_id')
      .eq('id', id)
      .single();

    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
    }

    // Verify user has access to this tenant
    if (!(await canAccessTenant(user.id, knowledgeBase.tenant_id, 'knowledge.manage'))) {
      return NextResponse.json({ error: 'Forbidden: No access to this knowledge base' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, description, configuration, status, page_count, last_synced_at } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (configuration !== undefined) updateData.configuration = configuration;
    if (status !== undefined) updateData.status = status;
    if (page_count !== undefined) updateData.page_count = page_count;
    if (last_synced_at !== undefined) updateData.last_synced_at = last_synced_at;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedKb, error: updateError } = await supabase
      .from('knowledge_bases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ knowledge_base: updatedKb });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/knowledge-bases/[id] - Delete knowledge base
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, get the knowledge base to check tenant access
    const { data: knowledgeBase } = await supabase
      .from('knowledge_bases')
      .select('tenant_id, configuration')
      .eq('id', id)
      .single();

    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
    }

    // Verify user is tenant_admin or super_admin
    if (!(await canAccessTenant(user.id, knowledgeBase.tenant_id, 'knowledge.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const retellKBId = (knowledgeBase.configuration as any)?.retell_knowledge_base_id;
    if (retellKBId) {
      try {
        const retellApiKey = await getResellerRetellConfig(knowledgeBase.tenant_id);
        if (retellApiKey) {
          const { createRetellClient } = await import('@/lib/retell');
          const retellClient = createRetellClient(retellApiKey);
          await retellClient.knowledgeBase.delete(retellKBId);
        }
      } catch (retellError: any) {
        console.error(`[KB API] Failed to delete voice-provider knowledge base ${retellKBId} (continuing with local delete):`, retellError?.message);
      }
    }

    const { error: deleteError } = await supabase
      .from('knowledge_bases')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

