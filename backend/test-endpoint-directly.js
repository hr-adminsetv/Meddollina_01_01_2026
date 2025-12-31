/**
 * Test the endpoint directly with authentication
 */

// This simulates exactly what the frontend does
async function testEndpoint() {
  console.log('🔍 Testing Frontend Context Endpoint\n');
  
  // You need to replace this with a valid conversation ID and token
  const conversationId = 'YOUR_CONVERSATION_ID';
  const authToken = 'YOUR_AUTH_TOKEN';
  
  console.log('To test this properly:');
  console.log('1. Open browser dev tools');
  console.log('2. Go to Network tab');
  console.log('3. Send a message in the chat');
  console.log('4. Look for the request to /api/ai/frontend-context/xxx');
  console.log('5. Check the response data\n');
  
  console.log('Expected response format:');
  console.log('{');
  console.log('  "success": true,');
  console.log('  "data": {');
  console.log('    "specialty": "hepatology",  // Should NOT be cardiology');
  console.log('    "condition": "liver mass",');
  console.log('    "phase": "assessment",');
  console.log('    ...');
  console.log('  }');
  console.log('}');
  
  console.log('\nIf you still see cardiology:');
  console.log('- Check the backend logs for the debug output');
  console.log('- The logs will show what Azure OpenAI actually returned');
  console.log('- Look for "[GetFrontendContext] Dynamic result:" in logs');
}

testEndpoint();
