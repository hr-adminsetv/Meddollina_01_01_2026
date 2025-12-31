/**
 * Local File Service - Fallback when Azure Blob Storage is not accessible
 * Stores files locally and processes with OCR
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LocalFileService {
  constructor() {
    // Create upload directory if it doesn't exist
    this.uploadDir = path.join(__dirname, '..', 'uploads');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log('[LocalFileService] Created upload directory:', this.uploadDir);
    }
  }

  /**
   * Upload file to local storage
   * @param {Buffer} buffer - File buffer
   * @param {Object} metadata - File metadata
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(buffer, metadata) {
    try {
      const { userId, conversationId, fileName, mimeType } = metadata;
      
      // Generate unique file path
      const timestamp = Date.now();
      const uniqueId = uuidv4();
      const fileDir = path.join(this.uploadDir, userId, conversationId, uniqueId);
      const filePath = path.join(fileDir, fileName);
      
      // Create directory structure
      await fs.mkdir(fileDir, { recursive: true });
      
      // Write file to disk
      await fs.writeFile(filePath, buffer);
      
      console.log('[LocalFileService] File saved locally:', filePath);
      
      // Return result mimicking Azure Blob Storage response
      return {
        blobUrl: `file://${filePath}`, // Local file URL
        blobName: path.relative(this.uploadDir, filePath),
        container: 'local-storage',
        localPath: filePath,
        success: true
      };
    } catch (error) {
      console.error('[LocalFileService] Upload error:', error);
      throw error;
    }
  }

  /**
   * Download file from local storage
   * @param {string} blobName - Relative file path
   * @returns {Promise<Buffer>} File buffer
   */
  async downloadFile(blobName) {
    try {
      const filePath = path.join(this.uploadDir, blobName);
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      console.error('[LocalFileService] Download error:', error);
      throw error;
    }
  }

  /**
   * Delete file from local storage
   * @param {string} blobName - Relative file path
   * @returns {Promise<void>}
   */
  async deleteFile(blobName) {
    try {
      const filePath = path.join(this.uploadDir, blobName);
      await fs.unlink(filePath);
      console.log('[LocalFileService] File deleted:', filePath);
    } catch (error) {
      console.error('[LocalFileService] Delete error:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param {string} blobName - Relative file path
   * @returns {Promise<Object>} File metadata
   */
  async getBlobMetadata(blobName) {
    try {
      const filePath = path.join(this.uploadDir, blobName);
      const stats = await fs.stat(filePath);
      
      return {
        contentType: 'application/octet-stream',
        contentLength: stats.size,
        lastModified: stats.mtime
      };
    } catch (error) {
      console.error('[LocalFileService] Metadata error:', error);
      throw error;
    }
  }
}

export default new LocalFileService();
