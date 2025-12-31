/**
 * File Routes
 * Handles file upload, OCR processing, and attachment management
 */

import express from 'express';
import multer from 'multer';
import {
  uploadFiles,
  getOcrStatus,
  downloadFile,
  deleteAttachment
} from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Configure Multer for file uploads
 * Store files in memory as Buffer for direct Azure upload
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

/**
 * File Routes
 * All routes require authentication
 */

// Upload files to conversation
// Route: POST /api/files/conversations/:id/upload
router.post(
  '/conversations/:id/upload',
  authenticate,
  upload.array('files', 5), // Accept up to 5 files
  uploadFiles
);

// Get OCR processing status for a message
router.get(
  '/messages/:messageId/ocr-status',
  getOcrStatus
);

// Download file
router.get(
  '/download',
  (req, res, next) => {
    console.log('[FileRoutes] Download request received:', req.query);
    next();
  },
  authenticate,
  downloadFile
);

// Delete attachment
router.delete(
  '/files/:messageId/:attachmentId',
  authenticate,
  deleteAttachment
);

// Error handler for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 10MB limit'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files allowed'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
});

export default router;
