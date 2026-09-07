import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/knowledge-bases/[id]/agents - List agents this knowledge base is attached to.
// Reads the local agent_knowledge_bases mirror table (see migration
// 20260101000000_create_agent_knowledge_bases.sql) rather than calling Retell, so this is
// fast enough to show inline on the Knowledge Base page without extra API round-trips.
// Retell itself remains the source of truth for whether retrieval actually happens --
// see /api/agents/[id]/knowledge-bases for the authoritative, Retell-backed view.
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

    const { data: knowledgeBase } = await supabase
      .from('knowledge_bases')
      .select('id, tenant_id')
      .eq('id', id)
      .single();

    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
    }

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', knowledgeBase.tenant_id)
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: links, error: linksError } = await supabase
      .from('agent_knowledge_bases')
      .select('agent_id, similarity_threshold, top_k, agents (id, name, type, is_active)')
      .eq('knowledge_base_id', id);

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 });
    }

    const agents = (links || [])
      .map((link: any) => ({
        id: link.agents?.id,
        name: link.agents?.name,
        type: link.agents?.type,
        is_active: link.agents?.is_active,
        similarity_threshold: link.similarity_threshold,
        top_k: link.top_k,
      }))
      .filter((a) => a.id);

    return NextResponse.json({ agents });
  } catch (error: any) {
    console.error('[KB Agents API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
