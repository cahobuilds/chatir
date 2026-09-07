import { createClient } from '@supabase/supabase-js';
import { Retell } from 'retell-sdk';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    if (error || !tenant) break;
    
    const tenantData = tenant as {
      id: string;
      parent_id: string | null;
      is_reseller: boolean | null;
      retell_api_key: string | null;
    };
    
    if (tenantData.is_reseller === true && tenantData.retell_api_key) {
      return tenantData.retell_api_key;
    }
    
    currentTenantId = tenantData.parent_id;
  }
  
  return null;
}

async function investigatePublishFailure() {
  console.log('Investigating why agent version 7 is not publishing\n');
  console.log('='.repeat(60));
  
  const agentId = 'a3c2cb9c-28bb-4c74-aad0-67cdcae3d558';
  const retellAgentId = 'agent_61e0863a6f6a118daf0da48586';
  
  const { data: agent } = await supabase
    .from('agents')
    .select('tenant_id')
    .eq('id', agentId)
    .single();
  
  if (!agent) {
    console.error('Agent not found');
    return;
  }
  
  const retellApiKey = await getResellerRetellConfig(agent.tenant_id);
  if (!retellApiKey) {
    console.error('No Retell API key');
    return;
  }
  
  const retellClient = new Retell({
    apiKey: retellApiKey,
    timeout: 30 * 1000,
    maxRetries: 3,
  });
  
  // Get all versions
  console.log('1. Retrieving all agent versions...');
  const versions = await retellClient.agent.getVersions(retellAgentId);
  const versionsArray = versions as any[];
  
  console.log(`   Found ${versionsArray.length} versions\n`);
  
  // Compare published vs unpublished versions
  console.log('2. Comparing published vs unpublished versions...');
  const publishedVersions = versionsArray.filter(v => v.is_published);
  const unpublishedVersions = versionsArray.filter(v => !v.is_published);
  
  console.log(`   Published versions: ${publishedVersions.length}`);
  console.log(`   Unpublished versions: ${unpublishedVersions.length}\n`);
  
  // Get current version (should be latest)
  const currentVersion = versionsArray[0];
  console.log('3. Current version details:');
  console.log(`   Version: ${currentVersion.version}`);
  console.log(`   Published: ${currentVersion.is_published}`);
  console.log(`   Channel: ${currentVersion.channel}`);
  console.log(`   Last modified: ${new Date(currentVersion.last_modification_timestamp).toISOString()}`);
  console.log(`   Has voice_id: ${!!currentVersion.voice_id}`);
  console.log(`   Has response_engine: ${!!currentVersion.response_engine}`);
  if (currentVersion.response_engine) {
    console.log(`   Response engine version: ${currentVersion.response_engine.version}`);
  }
  console.log('');
  
  // Compare with last published version
  if (publishedVersions.length > 0) {
    const lastPublished = publishedVersions[0];
    console.log('4. Last published version details:');
    console.log(`   Version: ${lastPublished.version}`);
    console.log(`   Published: ${lastPublished.is_published}`);
    console.log(`   Channel: ${lastPublished.channel}`);
    console.log(`   Last modified: ${new Date(lastPublished.last_modification_timestamp).toISOString()}`);
    console.log(`   Has voice_id: ${!!lastPublished.voice_id}`);
    console.log(`   Has response_engine: ${!!lastPublished.response_engine}`);
    if (lastPublished.response_engine) {
      console.log(`   Response engine version: ${lastPublished.response_engine.version}`);
    }
    console.log('');
    
    // Find differences
    console.log('5. Differences between current and last published:');
    const differences: string[] = [];
    
    if (currentVersion.channel !== lastPublished.channel) {
      differences.push(`Channel: ${lastPublished.channel} → ${currentVersion.channel}`);
    }
    if (currentVersion.voice_id !== lastPublished.voice_id) {
      differences.push(`Voice ID: ${lastPublished.voice_id} → ${currentVersion.voice_id}`);
    }
    if (JSON.stringify(currentVersion.response_engine) !== JSON.stringify(lastPublished.response_engine)) {
      differences.push(`Response engine changed`);
      if (currentVersion.response_engine?.version !== lastPublished.response_engine?.version) {
        differences.push(`  Response engine version: ${lastPublished.response_engine?.version} → ${currentVersion.response_engine?.version}`);
      }
    }
    if (currentVersion.agent_name !== lastPublished.agent_name) {
      differences.push(`Agent name: ${lastPublished.agent_name} → ${currentVersion.agent_name}`);
    }
    
    if (differences.length === 0) {
      console.log('   No differences found (versions are identical)');
    } else {
      differences.forEach(diff => console.log(`   - ${diff}`));
    }
    console.log('');
  }
  
  // Try to publish and capture any errors
  console.log('6. Attempting to publish current version...');
  try {
    const agentToPublish = await retellClient.agent.retrieve(retellAgentId);
    await retellClient.agent.publish(retellAgentId, { version: agentToPublish.version });
    console.log('   ✅ Publish request sent (204 expected)');
    
    // Wait and check
    await new Promise(resolve => setTimeout(resolve, 5000));
    const checkAgent = await retellClient.agent.retrieve(retellAgentId);
    const checkData = checkAgent as any;
    
    console.log(`   Current published status: ${checkData.is_published ? '✅ YES' : '❌ NO'}`);
    console.log(`   Current version: ${checkData.version}`);
    
    // Check versions again
    const versionsAfter = await retellClient.agent.getVersions(retellAgentId);
    const versionsAfterArray = versionsAfter as any[];
    const publishedAfter = versionsAfterArray.filter(v => v.is_published);
    
    console.log(`   Published versions after: ${publishedAfter.length}`);
    
    if (publishedAfter.length > publishedVersions.length) {
      console.log('   ✅ New version was published!');
    } else {
      console.log('   ⚠️  No new version was published');
    }
    
  } catch (publishError: any) {
    console.log(`   ❌ Publish error: ${publishError.message}`);
    if (publishError.response) {
      console.log(`   Status: ${publishError.response.status}`);
      console.log(`   Data: ${JSON.stringify(publishError.response.data, null, 2)}`);
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Investigation Complete!');
}

investigatePublishFailure()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

