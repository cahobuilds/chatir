import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import Retell from 'retell-sdk';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get reseller Retell API key (direct database query)
async function getResellerRetellConfig(organizationTenantId: string): Promise<string | null> {
  let currentTenantId: string | null = organizationTenantId;
  const visited = new Set<string>();
  
  while (currentTenantId && !visited.has(currentTenantId)) {
    visited.add(currentTenantId);
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, parent_id, is_reseller, retell_api_key')
      .eq('id', currentTenantId)
      .single();
    
    if (error || !tenant) {
      break;
    }
    
    // Type assertion for tenant data
    const tenantData = tenant as {
      id: string;
      parent_id: string | null;
      is_reseller: boolean | null;
      retell_api_key: string | null;
    };
    
    // If this tenant is a reseller and has API key, return it
    if (tenantData.is_reseller === true && tenantData.retell_api_key) {
      return tenantData.retell_api_key;
    }
    
    // Otherwise, check parent
    currentTenantId = tenantData.parent_id;
  }
  
  return null;
}

async function linkAgentToRetell(agentId: string) {
  console.log(`Linking agent ${agentId} to Retell AI...\n`);

  // Get agent details
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    console.error('❌ Error fetching agent:', agentError);
    return;
  }

  console.log('✅ Agent found:');
  console.log(`   Name: ${agent.name}`);
  console.log(`   Type: ${agent.type}`);
  console.log(`   Tenant ID: ${agent.tenant_id}`);
  console.log(`   Current Retell Agent ID: ${agent.retell_agent_id || 'NOT SET'}`);
  console.log('');

  if (agent.retell_agent_id) {
    console.log('✅ Agent is already linked to Retell AI!');
    console.log(`   Retell Agent ID: ${agent.retell_agent_id}`);
    return;
  }

  // Get Retell API key
  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);

  if (!retellApiKey) {
    console.error('❌ Retell API key not configured for this tenant');
    return;
  }

  console.log('✅ Retell API key found');
  console.log('');

  // Get agent configuration
  const config = typeof agent.configuration === 'string' 
    ? JSON.parse(agent.configuration) 
    : agent.configuration || {};

  console.log('Creating agent in Retell AI...');

  try {
    const retellClient = new Retell({
      apiKey: retellApiKey,
      timeout: 30 * 1000,
      maxRetries: 3,
    });

    // For chat agents, we need to set up response_engine
    let agentPayload: any = {
      agent_name: agent.name,
    };

    if (agent.type === 'chat') {
      // Chat agent - need response_engine AND voice_id (Retell requires voice_id even for chat)
      // Always fetch available LLMs from Retell (config.model might be OpenAI model name, not Retell LLM ID)
      console.log('Fetching available LLMs from Retell...');
      const llms = await retellClient.llm.list();
      if (!llms || llms.length === 0) {
        throw new Error('No LLMs available in Retell. Please configure an LLM first.');
      }
      
      console.log('Available LLMs:', JSON.stringify(llms, null, 2));
      
      // Use the first available LLM
      const firstLLM = llms[0];
      let llmId: string;
      
      // LLMs might be objects with llm_id property or just strings
      if (typeof firstLLM === 'string') {
        llmId = firstLLM;
      } else {
        llmId = (firstLLM as any).llm_id || (firstLLM as any).id || (firstLLM as any).llmId;
      }
      
      if (!llmId) {
        throw new Error(`Could not extract LLM ID from: ${JSON.stringify(firstLLM)}`);
      }
      console.log(`Using Retell LLM: ${llmId}`);

      // Set up response_engine - Retell requires this format for chat agents
      // IMPORTANT: Set channel to 'chat' for chat agents (required by Retell API)
      agentPayload.channel = 'chat';
      agentPayload.response_engine = {
        type: 'retell-llm',
        llm_id: llmId,
      };
      
      console.log('Channel:', agentPayload.channel);
      console.log('Response engine config:', JSON.stringify(agentPayload.response_engine, null, 2));

      // Retell requires voice_id even for chat agents - use a default or fetch available voices
      if (!config.voice_id) {
        console.log('No voice_id in config, fetching available voices...');
        try {
          const voices = await retellClient.voice.list();
          if (voices && voices.length > 0) {
            const firstVoice = voices[0];
            const voiceId = typeof firstVoice === 'string' ? firstVoice : (firstVoice as any).voice_id || (firstVoice as any).id;
            agentPayload.voice_id = voiceId;
            console.log(`Using voice: ${voiceId}`);
          } else {
            // Use a common default voice ID if available
            agentPayload.voice_id = 'sarah'; // Common default voice
            console.log('Using default voice: sarah');
          }
        } catch (voiceError) {
          // Use a common default voice ID
          agentPayload.voice_id = 'sarah';
          console.log('Using default voice: sarah (could not fetch voices)');
        }
      } else {
        agentPayload.voice_id = config.voice_id;
      }

      // Add language if configured
      if (config.language) {
        agentPayload.language = config.language;
      } else {
        agentPayload.language = 'en-US';
      }
    } else {
      // Voice agent - need voice_id and channel
      if (!config.voice_id) {
        throw new Error('Voice agent requires voice_id in configuration');
      }
      agentPayload.voice_id = config.voice_id;
      agentPayload.language = config.language || 'en-US';
      agentPayload.channel = 'voice'; // Explicitly set channel for voice agents
    }

    // Create agent in Retell
    const retellAgent = await retellClient.agent.create(agentPayload);

    console.log('✅ Agent created in Retell AI!');
    console.log(`   Retell Agent ID: ${retellAgent.agent_id}`);
    console.log('');

    // Publish the agent (required for chat sessions)
    // Retell's publish API publishes the latest version and creates a new draft
    console.log('Publishing agent...');
    try {
      // The publish endpoint returns 204 No Content, which the SDK handles correctly
      await retellClient.agent.publish(retellAgent.agent_id);
      console.log('✅ Publish request sent successfully');
      
      // Wait for Retell to process the publish
      console.log('Waiting for Retell to process publish...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify publication
      const publishedAgent = await retellClient.agent.retrieve(retellAgent.agent_id);
      const isPublished = (publishedAgent as any).is_published;
      
      if (isPublished) {
        console.log('✅ Agent is published and ready for chat sessions!');
      } else {
        console.warn('⚠️  Agent publish request sent, but agent is not yet showing as published');
        console.warn('   This may require a few moments to process, or manual publishing in Retell dashboard');
        console.warn('   You can check the agent status in the Retell dashboard');
      }
      console.log('');
    } catch (publishError: any) {
      // Handle JSON parse errors (expected for 204 responses)
      if (publishError.message?.includes('JSON') || 
          publishError.message?.includes('Unexpected end') ||
          publishError.message?.includes('empty')) {
        console.log('✅ Publish request sent (empty response is expected)');
        console.log('   Waiting for Retell to process...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if published
        try {
          const checkAgent = await retellClient.agent.retrieve(retellAgent.agent_id);
          const isPublished = (checkAgent as any).is_published;
          if (isPublished) {
            console.log('✅ Agent is published!');
          } else {
            console.warn('⚠️  Agent may need more time to publish, or manual intervention');
          }
        } catch (checkError) {
          console.warn('⚠️  Could not verify publish status');
        }
      } else {
        console.warn('⚠️  Warning: Could not publish agent:', publishError.message);
        console.warn('   The agent was created but may need to be published manually in Retell dashboard');
      }
      console.log('');
    }

    // Update local agent record
    console.log('Linking agent in database...');
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({
        retell_agent_id: retellAgent.agent_id,
        configuration: {
          ...config,
          retell_agent_id: retellAgent.agent_id,
        },
      })
      .eq('id', agentId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating agent:', updateError);
      console.error('⚠️  Agent was created in Retell but not linked in database!');
      console.error(`   Retell Agent ID: ${retellAgent.agent_id}`);
      return;
    }

    console.log('✅ Agent successfully linked!');
    console.log(`   Database ID: ${updatedAgent.id}`);
    console.log(`   Retell Agent ID: ${updatedAgent.retell_agent_id}`);
    console.log('');
    console.log('🎉 Done! The agent is now ready to use.');
  } catch (error: any) {
    console.error('❌ Error creating agent in Retell:', error);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Get agent ID from command line args
const agentId = process.argv[2];

if (!agentId) {
  console.error('Usage: npx tsx scripts/link-agent-to-retell.ts <agent-id>');
  console.error('Example: npx tsx scripts/link-agent-to-retell.ts a3c2cb9c-28bb-4c74-aad0-67cdcae3d558');
  process.exit(1);
}

linkAgentToRetell(agentId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

