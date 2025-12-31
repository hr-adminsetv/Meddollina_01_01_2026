/**
 * Test Azure Blob Upload + OCR Process with PDF
 * 
 * This script tests the complete flow with a PDF document
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import azureBlobService from './services/azureBlobService.js';
import azureOcrService from './services/azureOcrService.js';

// Load environment variables
dotenv.config();

console.log('=== Azure Blob + OCR Integration Test (PDF) ===\n');

// Test data
const userId = 'test-user-123';
const conversationId = 'test-conversation-456';

async function testWithPDF() {
  try {
    // Download a sample PDF for testing
    console.log('1. Downloading sample PDF...');
    const pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(response.data);
    const fileName = 'sample-document.pdf';
    console.log(`   Downloaded: ${fileName} (${pdfBuffer.length} bytes)`);

    // Step 2: Upload to Azure Blob Storage
    console.log('\n2. Uploading to Azure Blob Storage...');
    const uploadResult = await azureBlobService.uploadFile(pdfBuffer, {
      userId,
      conversationId,
      fileName,
      mimeType: 'application/pdf'
    });
    
    console.log('   Upload successful!');
    console.log('   Blob URL:', uploadResult.blobUrl);
    console.log('   Container:', uploadResult.container);
    console.log('   Blob Name:', uploadResult.blobName);

    // Step 3: Generate SAS URL
    console.log('\n3. Generating SAS URL for OCR access...');
    const sasUrl = await azureBlobService.generateSasUrl(
      uploadResult.blobName,
      uploadResult.container,
      1 // 1 hour expiry
    );
    
    console.log('   SAS URL generated!');
    console.log('   SAS URL length:', sasUrl.length);

    // Step 4: Test if SAS URL is accessible
    console.log('\n4. Testing SAS URL accessibility...');
    
    try {
      const headResponse = await axios.head(sasUrl);
      console.log(`   SAS URL accessible! Status: ${headResponse.status}`);
    } catch (error) {
      console.error('   SAS URL not accessible:', error.response?.status, error.response?.statusText);
      return;
    }

    // Step 5: Process with OCR
    console.log('\n5. Processing with Azure Document Intelligence...');
    
    try {
      const ocrResult = await azureOcrService.processDocument(sasUrl, 'general');
      
      console.log('\n✅ SUCCESS: OCR completed!');
      console.log('   Text length:', ocrResult.text?.length || 0);
      console.log('   Pages:', ocrResult.metadata?.pages || 0);
      console.log('\n   First 300 characters of extracted text:');
      console.log('   ' + (ocrResult.text?.substring(0, 300) || 'No text extracted') + '...');
      
      // Test with image as well
      console.log('\n6. Testing with image...');
      await testWithImage();
      
    } catch (ocrError) {
      console.error('\n❌ OCR Processing Error:');
      console.error('   Message:', ocrError.message);
      console.error('   Status:', ocrError.response?.status);
      console.error('   Status Text:', ocrError.response?.statusText);
      console.error('   Error Data:', ocrError.response?.data);
      
      if (ocrError.response?.status === 400) {
        console.log('\n   Debugging 400 Bad Request:');
        console.log('   - URL length:', sasUrl.length);
        console.log('   - URL contains SAS token:', sasUrl.includes('sv='));
        console.log('   - URL is HTTPS:', sasUrl.startsWith('https://'));
        
        // Try without SAS token to see if it's a SAS issue
        console.log('\n   Trying without SAS token (should fail with auth error)...');
        try {
          await azureOcrService.processDocument(uploadResult.blobUrl, 'general');
        } catch (noSasError) {
          console.log('   Without SAS token:', noSasError.response?.status, noSasError.response?.statusText);
        }
      }
    }

    // Clean up
    console.log('\n7. Cleaning up test file...');
    try {
      await azureBlobService.deleteFile(uploadResult.blobName, uploadResult.container);
      console.log('   Test file deleted from blob storage');
    } catch (cleanupError) {
      console.log('   Cleanup failed:', cleanupError.message);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

async function testWithImage() {
  try {
    console.log('\n--- Testing with Image ---');
    
    // Download a sample image
    const imageUrl = 'https://www.learningcontainer.com/wp-content/uploads/2020/04/sample-text-file.txt';
    const imageResponse = await axios.get('https://via.placeholder.com/300x150.png?text=Sample+Document', { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);
    
    // Upload image
    const uploadResult = await azureBlobService.uploadFile(imageBuffer, {
      userId,
      conversationId,
      fileName: 'sample-image.png',
      mimeType: 'image/png'
    });
    
    // Generate SAS URL
    const sasUrl = await azureBlobService.generateSasUrl(
      uploadResult.blobName,
      uploadResult.container,
      1
    );
    
    // Process with OCR
    const ocrResult = await azureOcrService.processImage(sasUrl);
    
    console.log('✅ Image OCR successful!');
    console.log('   Text extracted:', ocrResult.text?.substring(0, 100) + '...');
    
    // Clean up
    await azureBlobService.deleteFile(uploadResult.blobName, uploadResult.container);
    
  } catch (error) {
    console.error('❌ Image test failed:', error.message);
  }
}

// Run the test
testWithPDF().then(() => {
  console.log('\n=== Test Complete ===');
}).catch(console.error);
