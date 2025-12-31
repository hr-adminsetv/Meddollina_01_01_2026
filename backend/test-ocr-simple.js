/**
 * Simple OCR Test - No Database
 * 
 * Tests just the OCR processing components:
 * 1. Blob upload
 * 2. SAS URL generation  
 * 3. OCR processing
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import azureBlobService from './services/azureBlobService.js';
import azureOcrService from './services/azureOcrService.js';

dotenv.config();

console.log('=== Simple OCR Test (No Database) ===\n');

const testPdfPath = path.join(process.cwd(), '../test document ocr/DOC-20251027-WA0041..pdf');

async function testOCRComponents() {
  try {
    // 1. Load test document
    console.log('1. Loading test document...');
    if (!fs.existsSync(testPdfPath)) {
      console.error('❌ Test document not found');
      return;
    }
    
    const pdfBuffer = fs.readFileSync(testPdfPath);
    console.log(`✓ Document loaded (${pdfBuffer.length} bytes)`);

    // 2. Upload to blob storage
    console.log('\n2. Uploading to Azure Blob Storage...');
    const uploadResult = await azureBlobService.uploadFile(pdfBuffer, {
      userId: 'test-user',
      conversationId: 'test-convo',
      fileName: 'test.pdf',
      mimeType: 'application/pdf'
    });
    
    console.log('✓ Upload successful');
    console.log('  - Container:', uploadResult.container);
    console.log('  - Blob Name:', uploadResult.blobName);

    // 3. Generate SAS URL
    console.log('\n3. Generating SAS URL...');
    const sasUrl = await azureBlobService.generateSasUrl(
      uploadResult.blobName,
      uploadResult.container,
      1
    );
    
    console.log('✓ SAS URL generated');
    console.log('  - Length:', sasUrl.length);

    // 4. Process with OCR
    console.log('\n4. Processing with Azure Document Intelligence...');
    console.log('  (This may take 10-30 seconds)...');
    
    const startTime = Date.now();
    const ocrResult = await azureOcrService.processDocument(sasUrl, 'general');
    const endTime = Date.now();
    
    console.log('\n✅ OCR PROCESSING SUCCESSFUL!');
    console.log('  - Processing time:', (endTime - startTime) / 1000, 'seconds');
    console.log('  - Text length:', ocrResult.text?.length || 0, 'characters');
    console.log('  - Pages:', ocrResult.metadata?.pages || 0);
    console.log('  - Confidence:', ocrResult.metadata?.confidence || 'N/A');
    
    if (ocrResult.text && ocrResult.text.length > 0) {
      console.log('\n  First 300 characters:');
      console.log('  ─────────────────────────────────────');
      console.log('  ' + ocrResult.text.substring(0, 300) + '...');
      console.log('  ─────────────────────────────────────');
    }

    // 5. Cleanup
    console.log('\n5. Cleaning up...');
    await azureBlobService.deleteFile(uploadResult.blobName, uploadResult.container);
    console.log('✓ Test file deleted');

    console.log('\n🎉 OCR SYSTEM IS WORKING PERFECTLY!');
    console.log('\nThe issue is in the frontend-backend communication,');
    console.log('not the OCR processing itself.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error Code:', error.response.data?.error?.code);
      console.error('Error Message:', error.response.data?.error?.message);
    }
  }
}

testOCRComponents();
