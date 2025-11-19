import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/knowledge-bases/[id]/sources - Get sources for a knowledge base
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

    // Get sources from database
    const { data: sources, error: sourcesError } = await supabase
      .from('knowledge_base_sources')
      .select('*')
      .eq('knowledge_base_id', id)
      .order('created_at', { ascending: false });

    if (sourcesError) {
      console.error('[KB Sources API] Error fetching sources:', sourcesError);
      return NextResponse.json({ error: sourcesError.message }, { status: 500 });
    }

    return NextResponse.json({ sources: sources || [] });
  } catch (error: any) {
    console.error('[KB Sources API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/knowledge-bases/[id]/sources - Add sources to a knowledge base
export async function POST(
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
    const formData = await request.formData();

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

    // Get Retell API key
    const retellApiKey = await getResellerRetellConfig(knowledgeBase.tenant_id);
    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller.' },
        { status: 400 }
      );
    }

    // Get Retell knowledge base ID from configuration
    const retellKBId = knowledgeBase.configuration?.retell_knowledge_base_id;
    if (!retellKBId) {
      return NextResponse.json(
        { error: 'Knowledge base not linked to Retell. Please sync from Retell first.' },
        { status: 400 }
      );
    }

    const retellClient = createRetellClient(retellApiKey, {
      timeout: 60 * 1000, // 60 seconds for file uploads
      maxRetries: 2,
    });

    // Prepare sources for Retell API
    const urls: string[] = [];
    const texts: Array<{ text: string; title: string }> = [];
    const files: File[] = [];

    // Extract URLs
    const urlInput = formData.get('urls') as string;
    if (urlInput) {
      const urlList = urlInput.split('\n').map(u => u.trim()).filter(u => u && u.startsWith('http'));
      urls.push(...urlList);
    }

    // Extract text sources
    const textInput = formData.get('texts') as string;
    if (textInput) {
      try {
        const textArray = JSON.parse(textInput);
        if (Array.isArray(textArray)) {
          texts.push(...textArray);
        }
      } catch (e) {
        // If single text entry
        const title = formData.get('text_title') as string || 'Untitled';
        const text = formData.get('text_content') as string;
        if (text) {
          texts.push({ text, title });
        }
      }
    }

    // Extract files
    const fileInputs = formData.getAll('files') as File[];
    for (const file of fileInputs) {
      if (file && file.size > 0) {
        files.push(file);
      }
    }

    if (urls.length === 0 && texts.length === 0 && files.length === 0) {
      return NextResponse.json(
        { error: 'No sources provided. Please provide URLs, text, or files.' },
        { status: 400 }
      );
    }

    // Add sources to Retell knowledge base
    const addSourcesParams: any = {};
    if (urls.length > 0) {
      addSourcesParams.knowledge_base_urls = urls;
    }
    if (texts.length > 0) {
      addSourcesParams.knowledge_base_texts = texts;
    }
    if (files.length > 0) {
      addSourcesParams.knowledge_base_files = files;
    }

    console.log(`[KB Sources API] Adding sources to Retell KB ${retellKBId}:`, {
      urls: urls.length,
      texts: texts.length,
      files: files.length,
    });

    const retellResponse = await retellClient.knowledgeBase.addSources(retellKBId, addSourcesParams);

    // Sync sources back to database
    if (retellResponse.knowledge_base_sources) {
      // Delete existing sources
      await supabase
        .from('knowledge_base_sources')
        .delete()
        .eq('knowledge_base_id', id);

      // Insert new sources
      for (const source of retellResponse.knowledge_base_sources) {
        const sourceType = (source as any).type || 'text';
        let mappedType: 'notion' | 'web' | 'file' | 'text' = 'text';
        if (sourceType === 'notion' || sourceType === 'notion_page') {
          mappedType = 'notion';
        } else if (sourceType === 'url' || sourceType === 'webpage') {
          mappedType = 'web';
        } else if (sourceType === 'document' || sourceType === 'file') {
          mappedType = 'file';
        }

        let sourceUrl: string | null = null;
        if (sourceType === 'url') {
          sourceUrl = (source as any).url || null;
        } else if (sourceType === 'document') {
          sourceUrl = (source as any).file_url || null;
        } else if (sourceType === 'text') {
          sourceUrl = (source as any).content_url || null;
        }

        await supabase
          .from('knowledge_base_sources')
          .insert({
            knowledge_base_id: id,
            source_type: mappedType,
            source_url: sourceUrl,
            source_data: source,
            status: 'synced',
            last_synced_at: new Date().toISOString(),
          });
      }

      // Update knowledge base page count
      await supabase
        .from('knowledge_bases')
        .update({ page_count: retellResponse.knowledge_base_sources.length })
        .eq('id', id);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${urls.length + texts.length + files.length} source(s)`,
      knowledge_base: retellResponse,
    });
  } catch (error: any) {
    console.error('[KB Sources API] Error adding sources:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add sources' },
      { status: 500 }
    );
  }
}

