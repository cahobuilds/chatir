// Test Tenants API from browser console
// Copy and paste this into your browser console on the preview URL

async function testTenantsAPI() {
  console.log('Testing Tenants API...');
  console.log('Current URL:', window.location.origin);
  
  try {
    const response = await fetch('/api/tenants', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for auth
    });

    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Response Data:', data);

    if (response.ok) {
      console.log('✅ API Success!');
      console.log('Tenants count:', data.tenants?.length || 0);
      if (data.tenants && data.tenants.length > 0) {
        console.log('First tenant:', data.tenants[0]);
      } else {
        console.log('⚠️ No tenants found (this might be expected if none exist)');
      }
    } else {
      console.error('❌ API Error:', data);
      if (response.status === 401) {
        console.error('Authentication failed. Make sure you are logged in.');
      } else if (response.status === 500) {
        console.error('Server error. Check Vercel function logs.');
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
  }
}

// Run the test
testTenantsAPI();

