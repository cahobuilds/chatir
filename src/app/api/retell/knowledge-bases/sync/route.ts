import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/retell/knowledge-bases/sync - Sync knowledge bases from Retell AI to local database
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Forbidden: No access to this tenant' }, { status: 403 });
    }

    // Get reseller's Retell API key (organizations inherit from reseller)
    const retellApiKey = await getResellerRetellConfig(tenant_id);

    if (!retellApiKey) {
      return NextResponse.json(
        { error: 'Voice provider not connected for this organization. Please connect it in Settings.' },
        { status: 400 }
      );
    }

    // Create Retell client
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 30 * 1000,
      maxRetries: 2,
    });

    // List knowledge bases from Retell AI
    console.log(`[KB Sync] Fetching knowledge bases from Retell for tenant ${tenant_id}...`);
    const retellKBResponse = await retellClient.knowledgeBase.list();
    
    // Handle both array and object response formats
    const retellKnowledgeBases = Array.isArray(retellKBResponse) 
      ? retellKBResponse 
      : (retellKBResponse as any).knowledge_bases || (retellKBResponse as any).data || [];
    
    console.log(`[KB Sync] Found ${retellKnowledgeBases.length} knowledge bases from Retell`);

    const syncedKBs: Array<{ action: 'created' | 'updated'; kb: any }> = [];
    const errors: Array<{ retell_kb_id: string; error: string }> = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each knowledge base
    for (const retellKB of retellKnowledgeBases) {
      try {
        const retellKBData = retellKB as any;
        const retellKBId = retellKBData.knowledge_base_id || retellKBData.id;
        const kbName = retellKBData.knowledge_base_name || retellKBData.name || 'Unnamed Knowledge Base';
        
        // Retrieve detailed knowledge base info to get sources
        let retellKBDetails: any = retellKBData;
        try {
          retellKBDetails = await retellClient.knowledgeBase.retrieve(retellKBId);
        } catch (retrieveError: any) {
          console.warn(`[KB Sync] Could not retrieve details for KB ${retellKBId}, using list data:`, retrieveError.message);
        }
        
        // Determine type from sources or default to 'text'
        let kbType: 'notion' | 'web' | 'file' | 'text' = 'text';
        const sources = retellKBDetails.knowledge_base_sources || retellKBDetails.sources || retellKBData.knowledge_base_sources || retellKBData.sources || [];
        if (sources.length > 0) {
          const firstSource = sources[0];
          const sourceType = firstSource.type || firstSource.source_type;
          if (sourceType === 'notion' || sourceType === 'notion_page') {
            kbType = 'notion';
          } else if (sourceType === 'url' || sourceType === 'webpage') {
            kbType = 'web';
          } else if (sourceType === 'document' || sourceType === 'file') {
            kbType = 'file';
          } else if (sourceType === 'text') {
            kbType = 'text';
          }
        }

        // Check if knowledge base already exists
        const { data: existingKB } = await supabase
          .from('knowledge_bases')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('name', kbName)
          .single();

        const kbData = {
          tenant_id,
          name: kbName,
          type: kbType,
          description: retellKBDetails.description || retellKBData.description || null,
          configuration: {
            retell_knowledge_base_id: retellKBId,
            enable_auto_refresh: retellKBDetails.enable_auto_refresh || retellKBData.enable_auto_refresh || false,
            ...retellKBDetails,
          },
          status: 'synced' as const,
          page_count: sources.length,
          last_synced_at: new Date().toISOString(),
        };

        if (existingKB) {
          // Update existing knowledge base
          const { data: updatedKB, error: updateError } = await supabase
            .from('knowledge_bases')
            .update(kbData)
            .eq('id', existingKB.id)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          updatedCount++;
          syncedKBs.push({ action: 'updated', kb: updatedKB });
          console.log(`[KB Sync] Updated knowledge base: ${kbName} (${retellKBId})`);

          // Sync sources (use already retrieved details to avoid extra API call)
          await syncKnowledgeBaseSources(supabase, updatedKB.id, retellKBId, retellClient, retellKBDetails);
        } else {
          // Create new knowledge base
          const { data: newKB, error: createError } = await supabase
            .from('knowledge_bases')
            .insert(kbData)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          createdCount++;
          syncedKBs.push({ action: 'created', kb: newKB });
          console.log(`[KB Sync] Created knowledge base: ${kbName} (${retellKBId})`);

          // Sync sources (use already retrieved details to avoid extra API call)
          await syncKnowledgeBaseSources(supabase, newKB.id, retellKBId, retellClient, retellKBDetails);
        }
      } catch (error: any) {
        const retellKBId = (retellKB as any).knowledge_base_id || (retellKB as any).id || 'unknown';
        const errorMessage = error.message || 'Unknown error';
        console.error(`[KB Sync] Error syncing knowledge base ${retellKBId}:`, errorMessage);
        errors.push({ retell_kb_id: retellKBId, error: errorMessage });
      }
    }

    console.log(`[KB Sync] Sync complete for tenant ${tenant_id}:`);
    console.log(`  - Created: ${createdCount}`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      synced: syncedKBs.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length,
      error_details: errors,
      knowledge_bases: syncedKBs,
    });
  } catch (error: any) {
    console.error('[KB Sync] Fatal error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync knowledge bases',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to sync knowledge base sources
async function syncKnowledgeBaseSources(
  supabase: any,
  knowledgeBaseId: string,
  retellKBId: string,
  retellClient: any,
  retellKBDetails?: any
) {
  try {
    // Use provided details or retrieve if not provided
    let retellKBData = retellKBDetails;
    if (!retellKBData) {
      retellKBData = await retellClient.knowledgeBase.retrieve(retellKBId);
    }
    const sources = (retellKBData as any).knowledge_base_sources || (retellKBData as any).sources || [];

    console.log(`[KB Sync] Syncing ${sources.length} sources for knowledge base ${retellKBId}`);

    // Delete existing sources for this knowledge base
    await supabase
      .from('knowledge_base_sources')
      .delete()
      .eq('knowledge_base_id', knowledgeBaseId);

    // Insert new sources
    for (const source of sources) {
      const sourceData = source as any;
      const sourceType = sourceData.type || sourceData.source_type || 'text';
      
      let mappedType: 'notion' | 'web' | 'file' | 'text' = 'text';
      if (sourceType === 'notion' || sourceType === 'notion_page') {
        mappedType = 'notion';
      } else if (sourceType === 'url' || sourceType === 'webpage') {
        mappedType = 'web';
      } else if (sourceType === 'document' || sourceType === 'file') {
        mappedType = 'file';
      } else if (sourceType === 'text') {
        mappedType = 'text';
      }

      // Extract URL based on source type
      let sourceUrl: string | null = null;
      if (sourceType === 'url') {
        sourceUrl = sourceData.url || null;
      } else if (sourceType === 'document') {
        sourceUrl = sourceData.file_url || null;
      } else if (sourceType === 'text') {
        sourceUrl = sourceData.content_url || null;
      }

      await supabase
        .from('knowledge_base_sources')
        .insert({
          knowledge_base_id: knowledgeBaseId,
          source_type: mappedType,
          source_url: sourceUrl,
          source_data: sourceData,
          status: 'synced' as const,
          last_synced_at: new Date().toISOString(),
        });
    }
  } catch (error: any) {
    console.error(`[KB Sync] Error syncing sources for KB ${retellKBId}:`, error.message);
    // Don't fail the entire sync if sources fail
  }
}

