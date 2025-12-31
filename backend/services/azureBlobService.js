/**
 * Azure Blob Storage Service
 * Handles file uploads, downloads, and management in Azure Blob Storage
 */

import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure Blob Storage Configuration
 * All values loaded from environment variables
 */
const AZURE_CONNECTION_STRING = process.env.AZURE_CONNECTION_STRING;
const DOCUMENT_CONTAINER = process.env.AZURE_BLOB_DOCUMENT_CONTAINER || 'meddollina-chat-convo-documents';
const IMAGE_CONTAINER = process.env.AZURE_BLOB_IMAGE_CONTAINER || 'meddollina-chat-convo-images';
const WAITLIST_CONTAINER = process.env.AZURE_BLOB_WAITLIST_CONTAINER || 'meddollina-waitlist-validation-images';

class AzureBlobService {
  constructor() {
    // Debug: Log configuration
    console.log('[AzureBlobService] Initializing with:');
    console.log('  Connection String:', AZURE_CONNECTION_STRING ? 'Configured' : 'Missing');
    console.log('  Document Container:', DOCUMENT_CONTAINER);
    console.log('  Image Container:', IMAGE_CONTAINER);
    console.log('  Waitlist Container:', WAITLIST_CONTAINER);
    
    if (!AZURE_CONNECTION_STRING) {
      throw new Error('[AzureBlobService] Azure connection string is missing in .env file');
    }
    
    // Use the full connection string directly from .env
    this.blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
    this.documentContainer = this.blobServiceClient.getContainerClient(DOCUMENT_CONTAINER);
    this.imageContainer = this.blobServiceClient.getContainerClient(IMAGE_CONTAINER);
    this.waitlistContainer = this.blobServiceClient.getContainerClient(WAITLIST_CONTAINER);
  }

  /**
   * Upload file to Azure Blob Storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} metadata - File metadata
   * @returns {Promise<Object>} Upload result with blob URL
   */
  async uploadFile(fileBuffer, metadata) {
    try {
      const { userId, conversationId, fileName, mimeType } = metadata;
      
      // Determine container based on file type
      const isImage = mimeType.startsWith('image/');
      const containerClient = isImage ? this.imageContainer : this.documentContainer;
      
      // Generate unique blob name with folder structure
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop();
      const blobName = `${userId}/${conversationId}/${timestamp}_${uuidv4()}.${fileExtension}`;
      
      // Get blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Upload file
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: mimeType,
        },
        metadata: {
          userId,
          conversationId,
          originalName: fileName,
          uploadedAt: new Date().toISOString()
        }
      };
      
      await blockBlobClient.upload(fileBuffer, fileBuffer.length, uploadOptions);
      
      // Get the blob URL
      const blobUrl = blockBlobClient.url;
      
      return {
        success: true,
        blobName,
        blobUrl,
        container: isImage ? IMAGE_CONTAINER : DOCUMENT_CONTAINER,
        size: fileBuffer.length,
        mimeType
      };
    } catch (error) {
      console.error('Azure Blob upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Generate SAS URL for secure file access
   * @param {string} blobName - Blob name
   * @param {string} containerName - Container name
   * @param {number} expiryHours - URL expiry in hours
   * @returns {Promise<string>} SAS URL
   */
  async generateSasUrl(blobName, containerName, expiryHours = 24) {
    try {
      const containerClient = containerName === IMAGE_CONTAINER ? 
        this.imageContainer : this.documentContainer;
      
      const blobClient = containerClient.getBlobClient(blobName);
      
      // Generate SAS token with read permission
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + expiryHours);
      
      // For now, return the blob URL directly since we have SAS in connection string
      // In production, generate a proper SAS token here
      return blobClient.url;
    } catch (error) {
      console.error('SAS URL generation error:', error);
      throw new Error(`Failed to generate SAS URL: ${error.message}`);
    }
  }

  /**
   * Download file from Azure Blob Storage
   * @param {string} blobName - Blob name
   * @param {string} containerName - Container name
   * @returns {Promise<Buffer>} File buffer
   */
  async downloadFile(blobName, containerName) {
    try {
      console.log('[AzureBlobService] Downloading:', { blobName, containerName });
      
      // Select container client based on container name
      let containerClient;
      if (containerName === IMAGE_CONTAINER || containerName === 'meddollina-chat-convo-images') {
        containerClient = this.imageContainer;
      } else if (containerName === DOCUMENT_CONTAINER || containerName === 'meddollina-chat-convo-documents') {
        containerClient = this.documentContainer;
      } else if (containerName === WAITLIST_CONTAINER || containerName === 'meddollina-waitlist-validation-images') {
        containerClient = this.waitlistContainer;
      } else {
        throw new Error(`Unknown container: ${containerName}`);
      }
      
      const blobClient = containerClient.getBlobClient(blobName);
      
      // Download blob to buffer
      const downloadResponse = await blobClient.download();
      const downloaded = await this.streamToBuffer(downloadResponse.readableStreamBody);
      
      return downloaded;
    } catch (error) {
      console.error('Azure Blob download error:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Delete file from Azure Blob Storage
   * @param {string} blobName - Blob name
   * @param {string} containerName - Container name
   * @returns {Promise<boolean>} Deletion status
   */
  async deleteFile(blobName, containerName) {
    try {
      const containerClient = containerName === IMAGE_CONTAINER ? 
        this.imageContainer : this.documentContainer;
      
      const blobClient = containerClient.getBlobClient(blobName);
      await blobClient.delete();
      
      return true;
    } catch (error) {
      console.error('Azure Blob deletion error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * List files for a user/conversation
   * @param {string} userId - User ID
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Array>} List of files
   */
  async listFiles(userId, conversationId) {
    try {
      const prefix = `${userId}/${conversationId}/`;
      const files = [];
      
      // List from documents container
      for await (const blob of this.documentContainer.listBlobsFlat({ prefix })) {
        files.push({
          name: blob.name,
          container: DOCUMENT_CONTAINER,
          size: blob.properties.contentLength,
          contentType: blob.properties.contentType,
          createdOn: blob.properties.createdOn,
          metadata: blob.metadata
        });
      }
      
      // List from images container
      for await (const blob of this.imageContainer.listBlobsFlat({ prefix })) {
        files.push({
          name: blob.name,
          container: IMAGE_CONTAINER,
          size: blob.properties.contentLength,
          contentType: blob.properties.contentType,
          createdOn: blob.properties.createdOn,
          metadata: blob.metadata
        });
      }
      
      return files;
    } catch (error) {
      console.error('Azure Blob list error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Check if blob exists
   * @param {string} blobName - Blob name
   * @param {string} containerName - Container name
   * @returns {Promise<boolean>} Existence status
   */
  async blobExists(blobName, containerName) {
    try {
      const containerClient = containerName === IMAGE_CONTAINER ? 
        this.imageContainer : this.documentContainer;
      
      const blobClient = containerClient.getBlobClient(blobName);
      return await blobClient.exists();
    } catch (error) {
      console.error('Blob existence check error:', error);
      return false;
    }
  }

  /**
   * Convert stream to buffer
   * @private
   */
  async streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on('error', reject);
    });
  }

  /**
   * Upload student ID file to waitlist container
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} metadata - File metadata (email, studentId, fileName, mimeType)
   * @returns {Promise<Object>} Upload result with blob URL
   */
  async uploadStudentIdCard(fileBuffer, metadata) {
    try {
      console.log('[AzureBlobService] Received metadata:', metadata);
      const { email, studentId, fileName, mimeType, firstName } = metadata;
      
      // Create unique blob name: FIRSTNAME_EMAIL_TIMESTAMP
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // Keep email as-is (with @ and .)
      const sanitizedEmail = email;
      // Sanitize first name (remove special characters)
      const sanitizedFirstName = firstName ? firstName.replace(/[^a-zA-Z0-9]/g, '') : 'unknown';
      const blobName = `student-ids/${sanitizedFirstName}_${sanitizedEmail}_${timestamp}`;
      
      console.log('[AzureBlobService] Uploading student ID card:', blobName);
      
      // Get block blob client
      const blockBlobClient = this.waitlistContainer.getBlockBlobClient(blobName);
      
      // Upload with metadata
      await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        metadata: {
          originalFileName: fileName,
          uploadDate: new Date().toISOString(),
          email: email,
          studentId: studentId
        },
        blobHTTPHeaders: {
          blobContentType: mimeType
        }
      });
      
      // Return the blob URL
      const blobUrl = blockBlobClient.url;
      console.log('[AzureBlobService] Student ID uploaded successfully:', blobUrl);
      
      return {
        success: true,
        url: blobUrl,
        blobName: blobName
      };
    } catch (error) {
      console.error('Student ID upload error:', error);
      throw new Error(`Failed to upload student ID: ${error.message}`);
    }
  }

  /**
   * Get blob metadata
   * @param {string} blobName - Blob name
   * @param {string} containerName - Container name
   * @returns {Promise<Object>} Blob metadata
   */
  async getBlobMetadata(blobName, containerName) {
    try {
      // Select container client based on container name
      let containerClient;
      if (containerName === IMAGE_CONTAINER || containerName === 'meddollina-chat-convo-images') {
        containerClient = this.imageContainer;
      } else if (containerName === DOCUMENT_CONTAINER || containerName === 'meddollina-chat-convo-documents') {
        containerClient = this.documentContainer;
      } else if (containerName === WAITLIST_CONTAINER || containerName === 'meddollina-waitlist-validation-images') {
        containerClient = this.waitlistContainer;
      } else {
        throw new Error(`Unknown container: ${containerName}`);
      }
      
      const blobClient = containerClient.getBlobClient(blobName);
      const properties = await blobClient.getProperties();
      
      return {
        contentType: properties.contentType,
        contentLength: properties.contentLength,
        lastModified: properties.lastModified,
        metadata: properties.metadata
      };
    } catch (error) {
      console.error('Get blob metadata error:', error);
      throw new Error(`Failed to get blob metadata: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new AzureBlobService();
