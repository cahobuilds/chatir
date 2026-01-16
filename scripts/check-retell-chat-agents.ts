#!/usr/bin/env tsx

/**
 * Script to check Retell directly and count active chat agents
 * Usage: tsx scripts/check-retell-chat-agents.ts [tenant_id] [retell_api_key]
 * 
 * If retell_api_key is provided, it will be used directly.
 * Otherwise, it will try to find it from the tenant's reseller.
 */

import { createClient } from '@supabase/supabase-js';
import Retell from 'retell-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRetellChatAgents(tenantId?: string, providedApiKey?: string) {
  try {
    let retellApiKey: string | null = providedApiKey || null;
    let targetTenantId: string | null = null;

    // If API key is provided directly, use it
    if (retellApiKey) {
      console.log(`\n🔑 Using provided Retell API key`);
      targetTenantId = 'direct';
    } else if (tenantId) {
      // Use provided tenant ID
      targetTenantId = tenantId;
      console.log(`\n🔍 Checking Retell agents for tenant: ${tenantId}`);
      
      // Get tenant info
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, is_reseller, parent_id')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant) {
        console.error(`❌ Error: Tenant ${tenantId} not found`);
        process.exit(1);
      }

      console.log(`   Tenant: ${tenant.name} (${tenant.is_reseller ? 'Reseller' : 'Organization'})`);

      // Get reseller's Retell API key
      // If tenant is a reseller, use its own API key
      if (tenant.is_reseller) {
        const { data: reseller } = await supabase
          .from('tenants')
          .select('retell_api_key')
          .eq('id', tenantId)
          .single();
        retellApiKey = reseller?.retell_api_key || null;
      } else {
        // Use the reseller helper function logic
        let currentTenantId: string | null = tenantId;
        const visited = new Set<string>();
        
        while (currentTenantId && !visited.has(currentTenantId)) {
          visited.add(currentTenantId);
          
          const result = await supabase
            .from('tenants')
            .select('id, parent_id, is_reseller, retell_api_key')
            .eq('id', currentTenantId)
            .single();
          
          if (result.error || !result.data) break;
          
          const t = result.data as any;
          
          if (t.is_reseller === true && t.retell_api_key) {
            retellApiKey = t.retell_api_key;
            break;
          }
          
          currentTenantId = t.parent_id;
        }
      }
    } else {
      // Find first reseller with Retell API key
      console.log('\n🔍 Finding reseller with Retell API key...');
      const { data: resellers } = await supabase
        .from('tenants')
        .select('id, name, retell_api_key')
        .eq('is_reseller', true)
        .not('retell_api_key', 'is', null)
        .limit(1);

      if (!resellers || resellers.length === 0) {
        console.error('❌ Error: No reseller with Retell API key found');
        console.error('   Please provide a tenant_id or configure a reseller with Retell API key');
        process.exit(1);
      }

      const reseller = resellers[0];
      retellApiKey = reseller.retell_api_key;
      targetTenantId = reseller.id;
      console.log(`   Using reseller: ${reseller.name} (${reseller.id})`);
    }

    if (!retellApiKey) {
      console.error('❌ Error: No Retell API key found');
      process.exit(1);
    }

    console.log(`\n📡 Connecting to Retell API...`);

    // Create Retell client
    const retellClient = new Retell({
      apiKey: retellApiKey,
    });

    // List all agents from Retell
    console.log(`\n📋 Fetching agents from Retell...`);
    const retellAgents = await retellClient.agent.list();

    console.log(`\n✅ Found ${retellAgents.length} total agents in Retell\n`);

    // Analyze each agent
    const chatAgents: any[] = [];
    const voiceAgents: any[] = [];
    const unknownAgents: any[] = [];

    for (const agent of retellAgents) {
      let agentType: 'chat' | 'voice' | 'unknown' = 'unknown';
      const agentData = agent as any;
      
      // Check response_engine first - chat agents might have specific response_engine configs
      const responseEngine = agentData.response_engine;
      const hasVoiceId = !!agentData.voice_id;
      
      // Determine type based on response_engine configuration
      if (responseEngine && typeof responseEngine === 'object' && responseEngine !== null) {
        const engine = responseEngine as any;
        
        // If it has llm_websocket_url, it's likely a chat agent (even if it has voice_id)
        if (engine.llm_websocket_url) {
          agentType = 'chat';
        } else if (engine.type === 'custom-llm' && !hasVoiceId) {
          agentType = 'chat';
        } else if (engine.type === 'retell-llm' && !hasVoiceId) {
          agentType = 'chat';
        } else if (hasVoiceId) {
          agentType = 'voice';
        } else {
          agentType = 'chat'; // Default to chat if no voice_id
        }
      } else {
        // No response_engine - check voice_id
        if (hasVoiceId) {
          agentType = 'voice';
        } else {
          agentType = 'chat'; // No voice_id = chat
        }
      }

      const agentInfo = {
        agent_id: agentData.agent_id,
        agent_name: agentData.agent_name || 'Unnamed',
        type: agentType,
        voice_id: agentData.voice_id || null,
        response_engine: agentData.response_engine || null,
      };

      if (agentType === 'chat') {
        chatAgents.push(agentInfo);
      } else if (agentType === 'voice') {
        voiceAgents.push(agentInfo);
      } else {
        unknownAgents.push(agentInfo);
      }
    }

    // Display results
    console.log('📊 Agent Analysis:');
    console.log('━'.repeat(60));
    console.log(`\n💬 Chat Agents: ${chatAgents.length}`);
    if (chatAgents.length > 0) {
      chatAgents.forEach((agent, idx) => {
        console.log(`   ${idx + 1}. ${agent.agent_name} (${agent.agent_id})`);
        if (agent.response_engine) {
          const engine = typeof agent.response_engine === 'object' ? agent.response_engine : {};
          console.log(`      Type: ${(engine as any).type || 'unknown'}`);
          if ((engine as any).llm_websocket_url) {
            console.log(`      LLM: Custom WebSocket`);
          } else if ((engine as any).llm_id) {
            console.log(`      LLM ID: ${(engine as any).llm_id}`);
          }
        }
      });
    }

    console.log(`\n📞 Voice Agents: ${voiceAgents.length}`);
    if (voiceAgents.length > 0) {
      voiceAgents.forEach((agent, idx) => {
        console.log(`   ${idx + 1}. ${agent.agent_name} (${agent.agent_id})`);
        console.log(`      Voice ID: ${agent.voice_id}`);
      });
    }

    if (unknownAgents.length > 0) {
      console.log(`\n❓ Unknown Type Agents: ${unknownAgents.length}`);
      unknownAgents.forEach((agent, idx) => {
        console.log(`   ${idx + 1}. ${agent.agent_name} (${agent.agent_id})`);
        console.log(`      Voice ID: ${agent.voice_id || 'none'}`);
        console.log(`      Response Engine: ${JSON.stringify(agent.response_engine)}`);
      });
    }

    console.log('\n' + '━'.repeat(60));
    console.log(`\n📈 Summary:`);
    console.log(`   Total Agents: ${retellAgents.length}`);
    console.log(`   Chat Agents: ${chatAgents.length} ✅`);
    console.log(`   Voice Agents: ${voiceAgents.length}`);
    console.log(`   Unknown: ${unknownAgents.length}`);
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run script
const tenantId = process.argv[2];
const apiKey = process.argv[3];
checkRetellChatAgents(tenantId, apiKey);

