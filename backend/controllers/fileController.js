/**
 * File Controller
 * Handles file uploads, OCR processing, and attachment management
 */

import { v4 as uuidv4 } from 'uuid';
import ChatService from '../services/chatService.js';
import azureBlobService from '../services/azureBlobService.js';
import azureOcrService from '../services/azureOcrService.js';
import { Message } from '../models/index.js';

/**
 * Upload files to conversation
 * POST /api/chat/conversations/:id/upload
 */
export const uploadFiles = async (req, res) => {
  try {
    console.log('[FileUpload] Request received:', {
      params: req.params,
      body: req.body,
      headers: req.headers,
      files: req.files ? `Found ${req.files.length} files` : 'No files'
    });
    
    const { id: conversationId } = req.params;
    const userId = req.user.userId;
    const { message: messageContent = '' } = req.body;
    const files = req.files;

    console.log('[FileUpload] Starting upload:', {
      conversationId,
      userId,
      fileCount: files?.length || 0
    });

    // Validation
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    // Verify user owns this conversation
    const conversation = await ChatService.getConversationById(conversationId, userId);

    // Process each file
    const uploadedAttachments = [];
    const uploadPromises = files.map(async (file) => {
      try {
        // Upload to Azure Blob Storage
        const uploadResult = await azureBlobService.uploadFile(file.buffer, {
          userId,
          conversationId,
          fileName: file.originalname,
          mimeType: file.mimetype
        });

        // Create attachment metadata
        const attachment = {
          id: uuidv4(),
          type: file.mimetype.startsWith('image/') ? 'image' : 'document',
          originalName: file.originalname,
          blobUrl: uploadResult.blobUrl,
          blobName: uploadResult.blobName,
          container: uploadResult.container,
          mimeType: file.mimetype,
          size: file.size,
          ocrProcessed: false,
          uploadedAt: new Date().toISOString()
        };

        uploadedAttachments.push(attachment);

        console.log('[FileUpload] File uploaded:', {
          name: file.originalname,
          size: file.size,
          type: attachment.type
        });

        return attachment;
      } catch (error) {
        console.error('[FileUpload] Failed to upload file:', file.originalname, error);
        throw error;
      }
    });

    await Promise.all(uploadPromises);

    // Create user message with attachments
    const userMessage = await ChatService.addMessage(
      conversationId,
      userId,
      'user',
      messageContent || `[Attached ${files.length} file(s)]`,
      {
        hasAttachments: true,
        attachmentCount: uploadedAttachments.length
      }
    );

    // Update message with attachments
    await Message.update(
      { attachments: uploadedAttachments },
      { where: { id: userMessage.id } }
    );

    // Start OCR processing for each file (asynchronously)
    for (const attachment of uploadedAttachments) {
      try {
        console.log('[OCR] Generating SAS URL for:', {
          blobName: attachment.blobName,
          container: attachment.container,
          originalUrl: attachment.blobUrl
        });
        
        // Generate SAS URL for OCR access (valid for 1 hour)
        const sasUrl = await azureBlobService.generateSasUrl(attachment.blobName, attachment.container, 1);
        
        console.log('[OCR] SAS URL generated:', sasUrl?.substring(0, 100) + '...');
        
        if (!sasUrl) {
          throw new Error('SAS URL generation returned null/undefined');
        }
        
        // Replace blob URL with SAS URL for OCR
        const attachmentWithSas = {
          ...attachment,
          blobUrl: sasUrl
        };
        
        console.log('[OCR] Starting OCR processing with SAS URL');
        processOcrAsync(userMessage.id, attachmentWithSas).catch(error => {
          console.error('[OCR] Background processing failed:', error);
        });
      } catch (error) {
        console.error('[OCR] Failed to generate SAS URL for attachment:', attachment.originalName, error);
      }
    }

    console.log('[FileUpload] Upload complete:', {
      messageId: userMessage.id,
      attachmentCount: uploadedAttachments.length
    });

    return res.status(201).json({
      success: true,
      message: 'Files uploaded successfully',
      data: {
        messageId: userMessage.id,
        attachments: uploadedAttachments,
        ocrStatus: 'processing'
      }
    });
  } catch (error) {
    console.error('[FileUpload] Upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload files'
    });
  }
};

/**
 * Get OCR processing status for a message
 * GET /api/chat/messages/:messageId/ocr-status
 */
export const getOcrStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    console.log('[OCR] Status check for message:', messageId);

    // Get message - simplified query without associations
    const message = await Message.findOne({
      where: { id: messageId }
    });

    if (!message) {
      console.log('[OCR] Message not found:', messageId);
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    console.log('[OCR] Message found, checking attachments...');

    // Check OCR status
    const attachments = message.attachments || [];
    const allProcessed = attachments.every(att => att.ocrProcessed);
    const hasErrors = attachments.some(att => att.ocrError);

    console.log('[OCR] Status check result:', {
      attachmentsCount: attachments.length,
      allProcessed,
      hasErrors,
      hasOcrContent: !!message.ocrContent,
      ocrContentLength: message.ocrContent?.length || 0
    });

    return res.status(200).json({
      success: true,
      data: {
        messageId: message.id,
        attachments: attachments,
        ocrContent: message.ocrContent,
        status: hasErrors ? 'failed' : (allProcessed ? 'completed' : 'processing')
      }
    });
  } catch (error) {
    console.error('[OCR] Status check error:', error);
    console.error('[OCR] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to get OCR status',
      error: error.message
    });
  }
};

/**
 * Download file from blob storage
 * GET /api/files/:blobName
 */
export const downloadFile = async (req, res) => {
  try {
    // Get blobName from query parameter
    const { blobName, container } = req.query;
    const userId = req.user.userId;
    
    console.log('[Download] Request for blob:', blobName, 'from container:', container);
    
    if (!blobName) {
      return res.status(400).json({
        success: false,
        message: 'blobName is required'
      });
    }

    // Log for debugging
    console.log('[Download] UserId:', userId);
    console.log('[Download] BlobName:', blobName);
    
    // Skip userId check for now - the blob path structure uses conversationId, not userId
    // TODO: Implement proper access control by checking if user owns the conversation

    // Download from Azure
    console.log('[Download] Attempting to download:', { blobName, container });
    
    let fileBuffer;
    try {
      fileBuffer = await azureBlobService.downloadFile(blobName, container);
      console.log('[Download] File buffer retrieved, size:', fileBuffer?.length);
    } catch (downloadError) {
      console.error('[Download] Error downloading from Azure:', downloadError.message);
      throw downloadError;
    }

    // Get metadata for content type
    let metadata;
    try {
      metadata = await azureBlobService.getBlobMetadata(blobName, container);
      console.log('[Download] Metadata retrieved:', metadata);
    } catch (metadataError) {
      console.error('[Download] Error getting metadata:', metadataError.message);
      // Use default content type if metadata fails
      metadata = { contentType: 'application/octet-stream' };
    }

    console.log('[Download] Sending file response...');
    res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${blobName.split('/').pop()}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    console.error('[FileDownload] Error:', error);
    console.error('[FileDownload] Error stack:', error.stack);
    console.error('[FileDownload] Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    });
    
    // Send error as text since frontend expects blob
    res.status(500).send(`Failed to download file: ${error.message}`);
  }
};

/**
 * Delete attachment
 * DELETE /api/files/:messageId/:attachmentId
 */
export const deleteAttachment = async (req, res) => {
  try {
    const { messageId, attachmentId } = req.params;
    const userId = req.user.userId;

    // Get message
    const message = await Message.findOne({
      where: { id: messageId },
      include: [{
        model: require('../models/Conversation.js').default,
        as: 'conversation',
        where: { userId }
      }]
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Find attachment
    const attachments = message.attachments || [];
    const attachmentIndex = attachments.findIndex(att => att.id === attachmentId);

    if (attachmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    const attachment = attachments[attachmentIndex];

    // Delete from Azure Blob Storage
    await azureBlobService.deleteFile(attachment.blobName, attachment.container);

    // Remove from message attachments
    attachments.splice(attachmentIndex, 1);
    await Message.update(
      { attachments },
      { where: { id: messageId } }
    );

    return res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('[FileDelete] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete attachment'
    });
  }
};

/**
 * Process OCR asynchronously (background job)
 * @private
 */
async function processOcrAsync(messageId, attachment) {
  try {
    console.log('[OCR] Starting background processing:', {
      messageId,
      attachmentId: attachment.id,
      fileName: attachment.originalName,
      blobUrl: attachment.blobUrl
    });

    let ocrResult;

    // Process based on file type
    if (attachment.type === 'image') {
      ocrResult = await azureOcrService.processImage(attachment.blobUrl);
    } else {
      // Determine document type from extension
      const extension = attachment.originalName.split('.').pop().toLowerCase();
      const documentType = ['pdf', 'docx', 'doc'].includes(extension) ? 'general' : 'general';
      ocrResult = await azureOcrService.processDocument(attachment.blobUrl, documentType);
    }

    if (ocrResult.success) {
      // Get current message
      const message = await Message.findByPk(messageId);
      if (!message) {
        console.error('[OCR] Message not found:', messageId);
        return;
      }

      // Update attachments array
      const attachments = message.attachments || [];
      console.log('[OCR] Looking for attachment ID:', attachment.id);
      console.log('[OCR] Available attachments:', attachments.map(a => ({ id: a.id, name: a.originalName })));
      
      const attachmentIndex = attachments.findIndex(att => att.id === attachment.id);

      if (attachmentIndex !== -1) {
        console.log('[OCR] Found attachment at index:', attachmentIndex);
        attachments[attachmentIndex].ocrProcessed = true;
        attachments[attachmentIndex].ocrCompletedAt = new Date().toISOString();
      } else {
        console.error('[OCR] Attachment not found in message!');
        console.error('[OCR] Searched for:', attachment.id);
        console.error('[OCR] Available IDs:', attachments.map(a => a.id));
      }

      // Combine existing OCR content with new content
      const existingOcrContent = message.ocrContent || '';
      const newOcrContent = existingOcrContent 
        ? `${existingOcrContent}\n\n--- ${attachment.originalName} ---\n${ocrResult.text}`
        : `--- ${attachment.originalName} ---\n${ocrResult.text}`;

      // Update message
      await Message.update(
        {
          attachments,
          ocrContent: newOcrContent
        },
        { where: { id: messageId } }
      );

      console.log('[OCR] Processing complete:', {
        messageId,
        fileName: attachment.originalName,
        textLength: ocrResult.text.length
      });

      // TODO: Emit WebSocket event for real-time update
      // io.to(userId).emit('ocr-complete', { messageId, attachmentId: attachment.id });
    }
  } catch (error) {
    console.error('[OCR] Background processing error:', error);

    // Mark as failed
    try {
      const message = await Message.findByPk(messageId);
      if (message) {
        const attachments = message.attachments || [];
        const attachmentIndex = attachments.findIndex(att => att.id === attachment.id);

        if (attachmentIndex !== -1) {
          attachments[attachmentIndex].ocrProcessed = false;
          attachments[attachmentIndex].ocrError = error.message;
        }

        await Message.update({ attachments }, { where: { id: messageId } });
      }
    } catch (updateError) {
      console.error('[OCR] Failed to update error status:', updateError);
    }
  }
}

export default {
  uploadFiles,
  getOcrStatus,
  downloadFile,
  deleteAttachment
};
