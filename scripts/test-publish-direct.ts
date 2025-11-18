import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

const retellApiKey = process.env.RETELL_API_KEY;

if (!retellApiKey) {
  console.error('Missing RETELL_API_KEY environment variable');
  process.exit(1);
}

async function testPublishDirect() {
  const agentId = 'agent_0098ffcfc061f90ba191896e7a'; // The agent we just created
  
  console.log('Testing direct publish API call...\n');
  console.log(`Agent ID: ${agentId}\n`);

  try {
    const response = await axios.post(
      `https://api.retellai.com/publish-agent/${agentId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${retellApiKey}`,
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => status < 500, // Don't throw on 4xx
      }
    );

    console.log('Response Status:', response.status);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Data:', response.data);
    console.log('Response Data Type:', typeof response.data);
    console.log('Response Data Length:', response.data?.length || 0);
    
    if (response.status === 204) {
      console.log('\n✅ Got 204 No Content (expected for publish)');
    } else if (response.status === 200) {
      console.log('\n✅ Got 200 OK');
    } else {
      console.log(`\n⚠️  Got status ${response.status}`);
    }

    // Wait and check if agent is published
    console.log('\nWaiting 10 seconds and checking agent status...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const agentResponse = await axios.get(
      `https://api.retellai.com/get-agent/${agentId}`,
      {
        headers: {
          'Authorization': `Bearer ${retellApiKey}`,
        },
      }
    );

    const isPublished = agentResponse.data.is_published;
    console.log(`Agent Published Status: ${isPublished ? '✅ YES' : '❌ NO'}`);
    
    if (isPublished) {
      console.log('\n🎉 Agent is now published!');
    } else {
      console.log('\n⚠️  Agent is still not published after 10 seconds');
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPublishDirect()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

