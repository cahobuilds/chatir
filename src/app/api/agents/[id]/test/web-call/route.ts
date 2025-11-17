import { createClient } from '@/lib/supabase/server';
import { createRetellClient } from '@/lib/retell';
import { getResellerRetellConfig } from '@/lib/reseller';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/agents/[id]/test/web-call - Create a web call for browser-based audio testing
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

    // Get agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.type !== 'voice') {
      return NextResponse.json({ error: 'Web calls are only available for voice agents' }, { status: 400 });
    }

    if (!agent.retell_agent_id) {
      return NextResponse.json({ error: 'Agent not linked to Retell AI' }, { status: 400 });
    }

    // Check if user is system_admin (can test any agent)
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
        .eq('tenant_id', agent.tenant_id)
        .single();

      if (!userTenant) {
        return NextResponse.json({ error: 'Forbidden: No access to this agent' }, { status: 403 });
      }
    }

    // Get reseller's Retell API key
    console.log(`[Web Call API] Getting Retell API key for tenant: ${agent.tenant_id}`);
    const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

    if (!retellApiKey) {
      console.error(`[Web Call API] No Retell API key found for tenant: ${agent.tenant_id}`);
      return NextResponse.json(
        { error: 'Retell AI not configured for this organization\'s reseller. Please contact your reseller administrator.' },
        { status: 400 }
      );
    }

    console.log(`[Web Call API] Retell API key retrieved (length: ${retellApiKey.length}, prefix: ${retellApiKey.substring(0, 10)}...)`);

    // Create Retell client with enhanced configuration for web calls
    // Longer timeout (45s) and more retries (3) for web call creation
    const retellClient = createRetellClient(retellApiKey, {
      timeout: 45 * 1000, // 45 seconds for web call creation
      maxRetries: 3, // More retries for transient failures
    });
    
    // First, verify the agent exists and is properly configured in Retell
    console.log(`[Web Call API] Validating agent ${agent.retell_agent_id} in Retell...`);
    try {
      const retellAgent = await retellClient.agent.retrieve(agent.retell_agent_id);
      console.log(`[Web Call API] Agent retrieved successfully:`, {
        agent_id: retellAgent.agent_id,
        agent_name: retellAgent.agent_name,
        response_engine_type: retellAgent.response_engine?.type,
        is_published: retellAgent.is_published,
      });
      
      // Validate agent has a response engine configured
      if (!retellAgent.response_engine) {
        return NextResponse.json(
          { 
            error: 'Agent is not properly configured in Retell AI. Please ensure the agent has a response engine (LLM) configured in the Retell dashboard.',
            details: 'The agent exists but has no response engine configured.'
          },
          { status: 400 }
        );
      }
      
      // Validate response engine type
      if (retellAgent.response_engine.type === 'retell-llm') {
        const llmId = (retellAgent.response_engine as any).llm_id;
        if (!llmId) {
          return NextResponse.json(
            { 
              error: 'Agent LLM is not properly configured in Retell AI.',
              details: 'The agent uses Retell LLM but the LLM ID is missing.'
            },
            { status: 400 }
          );
        }
      } else if (retellAgent.response_engine.type === 'custom-llm') {
        const websocketUrl = (retellAgent.response_engine as any).llm_websocket_url;
        if (!websocketUrl) {
          return NextResponse.json(
            { 
              error: 'Agent custom LLM is not properly configured in Retell AI.',
              details: 'The agent uses a custom LLM but the websocket URL is missing.'
            },
            { status: 400 }
          );
        }
      }
      
      console.log(`[Web Call API] Agent ${agent.retell_agent_id} validated successfully in Retell`);
    } catch (retellError: any) {
      console.error('[Web Call API] Error validating agent in Retell:', {
        error: retellError.message,
        status: retellError.status,
        statusCode: retellError.statusCode,
        code: retellError.code,
        response: retellError.response?.data || retellError.response,
        stack: retellError.stack,
      });
      
      if (retellError.status === 404 || retellError.statusCode === 404 || retellError.message?.includes('not found')) {
        return NextResponse.json(
          { 
            error: 'Agent not found in Retell AI. Please ensure the agent is properly synced.',
            details: `Agent ID ${agent.retell_agent_id} does not exist in Retell.`
          },
          { status: 404 }
        );
      }
      
      // Check for authentication/authorization errors
      if (retellError.status === 401 || retellError.statusCode === 401 || 
          retellError.message?.includes('unauthorized') || 
          retellError.message?.includes('authentication') ||
          retellError.message?.includes('Invalid API key')) {
        console.error('[Web Call API] Retell API authentication error - API key may be invalid or expired');
        return NextResponse.json(
          { 
            error: 'Retell AI authentication failed. The API key may be invalid, expired, or lack necessary permissions.',
            details: 'Please check the Retell API key configuration in the reseller settings.'
          },
          { status: 401 }
        );
      }
      
      // Check for permission errors
      if (retellError.status === 403 || retellError.statusCode === 403 || 
          retellError.message?.includes('forbidden') ||
          retellError.message?.includes('permission')) {
        console.error('[Web Call API] Retell API permission error - API key may lack required permissions');
        return NextResponse.json(
          { 
            error: 'Retell AI permission denied. The API key may not have permission to create web calls or access this agent.',
            details: 'Please check the Retell API key permissions in the Retell dashboard.'
          },
          { status: 403 }
        );
      }
      
      // Continue anyway - validation might fail but call creation might still work
      console.warn('[Web Call API] Agent validation failed, but proceeding with call creation:', retellError.message);
    }
    
    // Create web call
    console.log(`[Web Call API] Creating web call for agent ${agent.retell_agent_id}...`);
    try {
      const webCall = await retellClient.call.createWebCall({
        agent_id: agent.retell_agent_id,
        metadata: {
          test: true,
          test_user_id: user.id,
          agent_id: agent.id,
          tenant_id: agent.tenant_id,
        },
      });

      console.log(`[Web Call API] Web call created successfully:`, {
        call_id: webCall.call_id,
        access_token_length: webCall.access_token?.length || 0,
        access_token_prefix: webCall.access_token?.substring(0, 20) || 'N/A',
      });

      return NextResponse.json({
        access_token: webCall.access_token,
        call_id: webCall.call_id,
        agent_id: agent.retell_agent_id,
      });
    } catch (webCallError: any) {
      console.error('[Web Call API] Error creating web call:', {
        error: webCallError.message,
        status: webCallError.status,
        statusCode: webCallError.statusCode,
        code: webCallError.code,
        response: webCallError.response?.data || webCallError.response,
        stack: webCallError.stack,
      });
      
      // Check for specific error types
      if (webCallError.status === 401 || webCallError.statusCode === 401 || 
          webCallError.message?.includes('unauthorized') || 
          webCallError.message?.includes('authentication') ||
          webCallError.message?.includes('Invalid API key')) {
        return NextResponse.json(
          { 
            error: 'Retell AI authentication failed when creating web call. The API key may be invalid or expired.',
            details: 'Please check the Retell API key configuration in the reseller settings.'
          },
          { status: 401 }
        );
      }
      
      if (webCallError.status === 403 || webCallError.statusCode === 403 || 
          webCallError.message?.includes('forbidden') ||
          webCallError.message?.includes('permission')) {
        return NextResponse.json(
          { 
            error: 'Retell AI permission denied when creating web call. The API key may not have permission to create web calls.',
            details: 'Please check the Retell API key permissions in the Retell dashboard.'
          },
          { status: 403 }
        );
      }
      
      throw webCallError; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('[Web Call API] Unexpected error:', {
      error: error.message,
      name: error.name,
      status: error.status,
      statusCode: error.statusCode,
      code: error.code,
      response: error.response?.data || error.response,
      stack: error.stack,
    });
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to create web call';
    let statusCode = 500;
    
    if (error.status || error.statusCode) {
      statusCode = error.status || error.statusCode;
    }
    
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      errorMessage = 'Network error connecting to Retell AI. Please check your internet connection and try again.';
    } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      errorMessage = 'Cannot connect to Retell AI service. Please check your network configuration.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.response?.data || error.details,
      },
      { status: statusCode }
    );
  }
}

