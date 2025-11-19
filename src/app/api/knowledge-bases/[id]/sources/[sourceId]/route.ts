import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/knowledge-bases/[id]/sources/[sourceId] - Delete a source from a knowledge base
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  try {
    const { id, sourceId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get knowledge base
    const { data: knowledgeBase, error: kbError } = await supabase
      .from('knowledge_bases')
      .select('*')
      .eq('id', id)
      .single();

    if (kbError || !knowledgeBase) {
      return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 });
    }

    // Verify user has access to this tenant
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

    // Get source to find Retell source ID
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_base_sources')
      .select('*')
      .eq('id', sourceId)
      .eq('knowledge_base_id', id)
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Get Retell API key
    const retellApiKey = await getResellerRetellConfig(knowledgeBase.tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller.' },
        { status: 400 }
      );
    }

    // Get Retell knowledge base ID and source ID
    const retellKBId = knowledgeBase.configuration?.retell_knowledge_base_id;
    const retellSourceId = source.source_data?.source_id || sourceId;

    if (!retellKBId) {
      return NextResponse.json(
        { error: 'Knowledge base not linked to Retell.' },
        { status: 400 }
      );
    }

    // Delete from Retell
    const retellClient = createRetellClient(retellApiKey);
    try {
      await retellClient.knowledgeBase.deleteSource(retellKBId, retellSourceId);
    } catch (retellError: any) {
      console.warn(`[KB Sources API] Error deleting from Retell (continuing with DB delete):`, retellError.message);
      // Continue with database deletion even if Retell deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('knowledge_base_sources')
      .delete()
      .eq('id', sourceId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Update knowledge base page count
    const { data: remainingSources } = await supabase
      .from('knowledge_base_sources')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_base_id', id);

    await supabase
      .from('knowledge_bases')
      .update({ page_count: remainingSources?.length || 0 })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[KB Sources API] Error deleting source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete source' },
      { status: 500 }
    );
  }
}

