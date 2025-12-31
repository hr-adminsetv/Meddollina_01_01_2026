/**
 * Direct API test to bypass any caching
 */

// Test function to run in browser console
export async function testDirectAPI() {
  console.clear();
  console.log('=== DIRECT API TEST ===\n');
  
  // 1. Check current page origin
  console.log('1. Current page origin:', window.location.origin);
  console.log('2. Current hostname:', window.location.hostname);
  console.log('3. Current port:', window.location.port);
  
  // 2. Test with window.fetch (no axios)
  console.log('\n--- Test with window.fetch ---');
  try {
    const response = await fetch('/api/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('✅ fetch /api/test success:', data);
  } catch (e) {
    console.error('❌ fetch /api/test failed:', e);
  }
  
  // 3. Test POST with fetch
  console.log('\n--- Test POST with window.fetch ---');
  try {
    const postResponse = await fetch('/api/test-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'direct fetch test' })
    });
    const postData = await postResponse.json();
    console.log('✅ fetch POST success:', postData);
  } catch (e) {
    console.error('❌ fetch POST failed:', e);
  }
  
  // 4. Check if axios is somehow overriding
  console.log('\n--- Checking axios configuration ---');
  const axios = (window as any).axios;
  if (axios) {
    console.log('Axios found in window');
    const testInstance = axios.create({
      baseURL: '',
      timeout: 5000
    });
    console.log('Created axios instance with baseURL:', testInstance.defaults.baseURL);
    
    try {
      const axiosRes = await testInstance.get('/api/test');
      console.log('✅ axios /api/test success:', axiosRes.data);
    } catch (e: any) {
      console.error('❌ axios /api/test failed:', e.message);
      if (e.response) {
        console.error('Response URL:', e.response.config.url);
        console.error('Full URL:', e.response.config.baseURL + e.response.config.url);
      }
    }
  } else {
    console.log('Axios not found in window');
  }
  
  // 5. Check for any service workers
  console.log('\n--- Service Workers ---');
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('Service workers found:', registrations.length);
    registrations.forEach(reg => console.log(' -', reg.scope));
  }
  
  // 6. Check for any fetch interceptors
  console.log('\n--- Fetch Interceptors ---');
  const originalFetch = window.fetch;
  console.log('Original fetch:', originalFetch.toString().substring(0, 100) + '...');
  
  // 7. Check localStorage for tokens
  console.log('\n--- LocalStorage Tokens ---');
  const token = localStorage.getItem('meddollina_token');
  const refreshToken = localStorage.getItem('meddollina_refresh_token');
  console.log('Token exists:', !!token);
  console.log('Token length:', token?.length || 0);
  console.log('Refresh Token exists:', !!refreshToken);
  
  if (!token) {
    console.log('\n❌ NO TOKEN FOUND - You need to log in first!');
    console.log('Go to http://localhost:8081/login to log in');
  } else {
    console.log('✅ Token found - you are logged in');
  }
  
  console.log('\n=== TEST COMPLETE ===');
  console.log('Check the Network tab in DevTools to see actual request URLs!');
}

// Auto-expose to window for manual running
(window as any).testDirectAPI = testDirectAPI;

console.log('testDirectAPI function available. Run testDirectAPI() in console to test.');
