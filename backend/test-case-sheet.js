/**
 * Test Case Sheet Generation
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';
const API_KEY = 'meddollina-internal-api-key-2024';
const TEST_CONVERSATION_ID = 'cf8bf188-e30e-4354-b9fb-6abf845ac1f6'; // Replace with actual conversation ID

async function testCaseSheetGeneration() {
  console.log('🧪 Testing Case Sheet Generation\n');
  
  try {
    const response = await fetch(`${API_URL}/api/ai/generate-case-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        conversationId: TEST_CONVERSATION_ID,
        patientInfo: {
          age: '70 years',
          gender: 'male',
          identifier: 'TEST-001'
        }
      })
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Case sheet generated successfully!');
      console.log('\n📋 Case Sheet Preview:');
      console.log('===================');
      console.log(result.data.case_sheet.substring(0, 1000) + '...');
      console.log('\n📊 Metadata:');
      console.log('- Message Count:', result.data.message_count);
      console.log('- Generated At:', result.data.generated_at);
      console.log('- Patient Info:', result.data.patient_info);
    } else {
      console.error('❌ Failed to generate case sheet:', result.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCaseSheetGeneration();
