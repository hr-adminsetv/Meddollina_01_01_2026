import express from 'express';
import {
  createConversation,
  getUserConversations,
  getConversation,
  getConversationMessages,
  sendMessage,
  updateConversationTitle,
  deleteConversation,
  getAIContext,
  searchConversations,
  getUserStats
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Chat Routes
 * All routes require authentication
 */

// Conversation management
router.post('/conversations', authenticate, createConversation);
router.get('/conversations', authenticate, getUserConversations);
router.get('/conversations/search', authenticate, searchConversations);
router.get('/conversations/:id', authenticate, getConversation);
router.patch('/conversations/:id', authenticate, updateConversationTitle);
router.delete('/conversations/:id', authenticate, deleteConversation);

// Message management
router.get('/conversations/:id/messages', authenticate, getConversationMessages);
router.post('/conversations/:id/messages', authenticate, sendMessage);

// AI Context
router.get('/conversations/:id/context', authenticate, getAIContext);

// User statistics
router.get('/stats', authenticate, getUserStats);

export default router;
