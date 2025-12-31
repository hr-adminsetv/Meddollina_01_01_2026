/**
 * Debug Flask AI Context Flow
 */

import PromptTemplates from './services/promptTemplates.js';
import contextManager from './services/contextManager.js';

async function debugFlaskContext() {
  console.log('🔍 Debugging Flask AI Context Flow\n');
  
  // Simulate a real scenario
  const conversationId = 'debug-test';
  
  // Step 1: Update context with medical message
  console.log('📝 Step 1: Updating context...');
  await contextManager.updateContext(conversationId, 
    "Patient has yellow eyes and skin, possible liver issues", 
    'user'
  );
  
  // Step 2: Get context summary
  console.log('\n📊 Step 2: Getting context summary...');
  const contextSummary = contextManager.generateContextSummary(conversationId);
  console.log('Context:', JSON.stringify(contextSummary, null, 2));
  
  // Step 3: Generate system prompt
  console.log('\n🎯 Step 3: Generating specialty prompt...');
  const systemPrompt = PromptTemplates.generateSystemPrompt(contextSummary);
  console.log('System Prompt Length:', systemPrompt.length);
  console.log('System Prompt Preview:');
  console.log(systemPrompt.substring(0, 500) + '...\n');
  
  // Step 4: Test Flask API directly
  console.log('🚀 Step 4: Testing Flask API...');
  
  const testData = {
    message: "What tests should I order for jaundice?",
    conversation_id: conversationId,
    history: [
      {
        role: 'user',
        content: "Patient has yellow eyes and skin, possible liver issues"
      }
    ],
    system_prompt: systemPrompt,
    context: contextSummary
  };
  
  console.log('Sending to Flask:');
  console.log('- Message:', testData.message);
  console.log('- System Prompt Length:', testData.system_prompt.length);
  console.log('- Specialty:', contextSummary.specialty);
  
  try {
    const response = await fetch('http://localhost:5001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'meddollina-internal-api-key-2024'
      },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Flask Error:', error);
      return;
    }
    
    const result = await response.json();
    
    console.log('\n✅ Flask Response:');
    console.log('- Success:', result.success);
    console.log('- Response Length:', result.data?.response?.length || 0);
    console.log('- Response Preview:');
    console.log(result.data?.response?.substring(0, 300) + '...' || 'No response');
    
    // Check if the response mentions the specialty
    if (result.data?.response) {
      const responseText = result.data.response.toLowerCase();
      const hasSpecialtyContext = responseText.includes('liver') || 
                                  responseText.includes('hepatology') ||
                                  responseText.includes('jaundice');
      
      console.log('\n🎯 Context Awareness Check:');
      console.log('- Contains liver/hepatology terms:', hasSpecialtyContext);
      console.log('- AI used specialty context:', hasSpecialtyContext ? '✅ YES' : '❌ NO');
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

// Run the debug
debugFlaskContext().catch(console.error);
