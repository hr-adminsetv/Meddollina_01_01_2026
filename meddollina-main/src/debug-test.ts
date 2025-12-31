/**
 * Debug Test to simulate the exact API request environment
 */

import axios from 'axios';
import API_BASE_URL from '@/config/api';

console.log('=== DEBUG TEST START ===');
console.log('1. API_BASE_URL from config:', API_BASE_URL);
console.log('2. typeof API_BASE_URL:', typeof API_BASE_URL);
console.log('3. API_BASE_URL length:', API_BASE_URL.length);

// Test 1: Create axios instance with empty base URL (like apiClient)
console.log('\n=== TEST 1: Axios with empty base URL ===');
const testAxios1 = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json'
  }
});

console.log('testAxios1 baseURL:', testAxios1.defaults.baseURL);

// Test 2: Create axios instance with explicit localhost:8081
console.log('\n=== TEST 2: Axios with localhost:8081 ===');
const testAxios2 = axios.create({
  baseURL: 'http://localhost:8081',
  headers: {
    'Content-Type': 'application/json'
  }
});

console.log('testAxios2 baseURL:', testAxios2.defaults.baseURL);

// Test 3: Direct fetch
console.log('\n=== TEST 3: Direct fetch ===');

// Test 4: Check if there's any environment override
console.log('\n=== TEST 4: Environment check ===');
console.log('import.meta.env.DEV:', import.meta.env.DEV);
console.log('import.meta.env.MODE:', import.meta.env.MODE);
console.log('import.meta.env.VITE_API_URL:', import.meta.env.VITE_API_URL);

// Test 5: Check authentication
console.log('\n=== TEST 5: Authentication check ===');
const token = localStorage.getItem('meddollina_token');
console.log('Token exists:', !!token);
console.log('Token length:', token?.length || 0);

// Test requests
async function runTests() {
  try {
    // Test with testAxios1 (empty base URL)
    console.log('\n--- Testing testAxios1 POST /api/test-post ---');
    const res1 = await testAxios1.post('/api/test-post', { test: 'test1', source: 'empty baseURL' });
    console.log('testAxios1 success:', res1.data);
  } catch (e: any) {
    console.error('testAxios1 failed:', e.message);
    if (e.response) {
      console.error('Response status:', e.response.status);
      console.error('Response data:', e.response.data);
    }
  }

  try {
    // Test with testAxios2 (localhost:8081)
    console.log('\n--- Testing testAxios2 POST /api/test-post ---');
    const res2 = await testAxios2.post('/api/test-post', { test: 'test2', source: 'localhost:8081' });
    console.log('testAxios2 success:', res2.data);
  } catch (e: any) {
    console.error('testAxios2 failed:', e.message);
    if (e.response) {
      console.error('Response status:', e.response.status);
      console.error('Response data:', e.response.data);
    }
  }

  try {
    // Test with direct fetch
    console.log('\n--- Testing direct fetch POST /api/test-post ---');
    const fetchRes = await fetch('/api/test-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'fetch', source: 'direct fetch' })
    });
    const data = await fetchRes.json();
    console.log('fetch success:', data);
  } catch (e: any) {
    console.error('fetch failed:', e.message);
  }

  // Test AI chat endpoint
  try {
    console.log('\n--- Testing AI chat with testAxios1 ---');
    const authToken = localStorage.getItem('meddollina_token');
    if (!authToken) {
      console.log('❌ Cannot test AI chat - no token found. Please log in first.');
      return;
    }
    
    // Create authenticated axios instance
    const authAxios = axios.create({
      baseURL: '',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const aiRes = await authAxios.post('/api/ai/chat', {
      conversationId: '00000000-0000-0000-0000-000000000000', // Valid UUID format
      message: 'test message',
      ocr_content: 'test OCR content here'
    });
    console.log('✅ AI chat success:', aiRes.data);
  } catch (e: any) {
    console.error('AI chat failed:', e.message);
    if (e.response) {
      console.error('Response status:', e.response.status);
      console.error('Response data:', e.response.data);
    }
  }
}

// Export to run manually
export { runTests };

// Auto-run if in development
if (import.meta.env.DEV) {
  console.log('Running debug test...');
  runTests().then(() => {
    console.log('\n=== DEBUG TEST COMPLETE ===');
  }).catch(e => {
    console.error('Debug test error:', e);
  });
}
