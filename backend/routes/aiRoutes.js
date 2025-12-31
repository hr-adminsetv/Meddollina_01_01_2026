import express from 'express';
import { 
  processChat, 
  summarizeConversation, 
  generateCaseSheet, 
  generateCaseSheetFromContent,
  getSuggestions,
  getFrontendContext,
  summarizeContent,
  checkAIHealth,
  testSummarize,
  getContext
} from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * AI Routes
 * All routes require authentication except health check
 */

// Health check (public)
router.get('/health', checkAIHealth);

// Test route
router.get('/test', testSummarize);

// Chat with AI
router.post('/chat', authenticate, processChat);

// New v2 endpoint to bypass cache
router.post('/chat/v2', authenticate, processChat);

// New v3 endpoint to bypass cache
router.post('/chat/v3', authenticate, processChat);

// New v4 endpoint to bypass cache
router.post('/chat/v4', authenticate, processChat);

// Dedicated no-cache endpoint
router.post('/chat-no-cache', authenticate, processChat);

// Wildcard route for dynamic chat endpoints to bypass cache (must be after specific routes)
router.post('/chat/*', authenticate, processChat);

// Protected AI endpoints
router.post('/summarize', authenticate, summarizeConversation);
router.post('/summarize-content', authenticate, summarizeContent);
router.post('/generate-case-sheet', authenticate, generateCaseSheet);
router.post('/generate-case-sheet-content', authenticate, generateCaseSheetFromContent);
router.post('/suggestions', authenticate, getSuggestions);

// Context endpoints
router.get('/context/:conversationId', authenticate, getContext);
router.get('/frontend-context/:conversationId', authenticate, getFrontendContext);

export default router;
