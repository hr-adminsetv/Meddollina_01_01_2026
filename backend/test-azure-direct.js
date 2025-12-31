/**
 * Direct Azure Blob Storage Test
 * Tests Azure credentials without DNS resolution
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const AZURE_BLOB_ENDPOINT = process.env.AZURE_BLOB_ENDPOINT;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;
const AZURE_BLOB_DOCUMENT_CONTAINER = process.env.AZURE_BLOB_DOCUMENT_CONTAINER;

console.log('==============================================');
console.log('🔍 DIRECT AZURE BLOB STORAGE TEST');
console.log('==============================================\n');

console.log('📋 Configuration:');
console.log('Endpoint:', AZURE_BLOB_ENDPOINT);
console.log('Container:', AZURE_BLOB_DOCUMENT_CONTAINER);
console.log('SAS Token:', AZURE_STORAGE_SAS_TOKEN ? 'Configured' : 'Missing');
console.log('');

async function testAzure() {
  console.log('🔍 Testing Azure Blob Storage Access...\n');
  
  // Test 1: List containers
  console.log('Test 1: List containers using REST API');
  const listContainersUrl = `${AZURE_BLOB_ENDPOINT}/?comp=list&${AZURE_STORAGE_SAS_TOKEN}`;
  
  try {
    const response = await axios.get(listContainersUrl, {
      headers: {
        'x-ms-version': '2020-04-08'
      },
      timeout: 10000
    });
    
    console.log('✅ Successfully connected to Azure Blob Storage!');
    console.log('Response status:', response.status);
    
    // Try to parse container list
    if (response.data) {
      const containerMatch = response.data.match(/<Name>([^<]+)<\/Name>/g);
      if (containerMatch) {
        console.log('\nContainers found:');
        containerMatch.forEach(match => {
          const name = match.replace(/<\/?Name>/g, '');
          console.log(`  - ${name}`);
        });
      }
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.log('❌ Cannot resolve Azure endpoint. Storage account may not exist.');
    } else if (error.response) {
      console.log('❌ Azure returned error:', error.response.status);
      console.log('Error details:', error.response.data || error.response.statusText);
      
      if (error.response.status === 403) {
        console.log('\n⚠️  Authentication failed. Check your SAS token permissions.');
      } else if (error.response.status === 404) {
        console.log('\n⚠️  Storage account or container not found.');
      }
    } else if (error.request) {
      console.log('❌ No response received:', error.message);
    } else {
      console.log('❌ Error:', error.message);
    }
    return;
  }
  
  // Test 2: List blobs in specific container
  console.log('\n\nTest 2: List blobs in container:', AZURE_BLOB_DOCUMENT_CONTAINER);
  const listBlobsUrl = `${AZURE_BLOB_ENDPOINT}/${AZURE_BLOB_DOCUMENT_CONTAINER}?restype=container&comp=list&${AZURE_STORAGE_SAS_TOKEN}`;
  
  try {
    const response = await axios.get(listBlobsUrl, {
      headers: {
        'x-ms-version': '2020-04-08'
      },
      timeout: 10000
    });
    
    console.log('✅ Successfully accessed container!');
    
    // Try to parse blob list
    if (response.data) {
      const blobMatches = response.data.match(/<Name>([^<]+)<\/Name>/g);
      if (blobMatches && blobMatches.length > 0) {
        console.log('\nBlobs found (showing first 5):');
        blobMatches.slice(0, 5).forEach(match => {
          const name = match.replace(/<\/?Name>/g, '');
          console.log(`  - ${name}`);
        });
      } else {
        console.log('(Container is empty)');
      }
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`⚠️  Container '${AZURE_BLOB_DOCUMENT_CONTAINER}' not found.`);
      console.log('You may need to create this container first.');
    } else {
      console.log('❌ Error accessing container:', error.message);
    }
  }
  
  // Test 3: Try to upload a test blob
  console.log('\n\nTest 3: Upload test blob');
  const testBlobName = `test/azure-test-${Date.now()}.txt`;
  const uploadUrl = `${AZURE_BLOB_ENDPOINT}/${AZURE_BLOB_DOCUMENT_CONTAINER}/${testBlobName}?${AZURE_STORAGE_SAS_TOKEN}`;
  const testContent = 'Azure Blob Storage test content';
  
  try {
    const response = await axios.put(uploadUrl, testContent, {
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'text/plain',
        'x-ms-version': '2020-04-08'
      },
      timeout: 10000
    });
    
    console.log('✅ Successfully uploaded test blob!');
    console.log(`Blob URL: ${AZURE_BLOB_ENDPOINT}/${AZURE_BLOB_DOCUMENT_CONTAINER}/${testBlobName}`);
    
    // Try to delete the test blob
    console.log('Cleaning up test blob...');
    await axios.delete(uploadUrl, {
      headers: {
        'x-ms-version': '2020-04-08'
      }
    });
    console.log('✅ Test blob deleted');
    
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('⚠️  No write permission. Check SAS token permissions.');
    } else {
      console.log('❌ Upload failed:', error.message);
    }
  }
}

// Run the test
testAzure().then(() => {
  console.log('\n==============================================');
  console.log('📊 TEST COMPLETE');
  console.log('==============================================');
}).catch(error => {
  console.error('\n❌ Unexpected error:', error);
});
