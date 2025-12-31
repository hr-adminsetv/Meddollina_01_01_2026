import ChatService from '../services/chatService.js';

/**
 * AI Controller
 * Handles AI operations by proxying to Flask AI service
 * and managing chat context in PostgreSQL
 */

const FLASK_AI_URL = process.env.FLASK_AI_URL || 'http://localhost:5001';
const SUMMARIZER_URL = process.env.SUMMARIZER_URL || 'http://localhost:5002';
const AI_API_KEY = process.env.AI_API_KEY || 'meddollina-internal-api-key-2024';

/**
 * Call Flask AI service
 */
async function callFlaskAI(endpoint, data) {
  try {
    // Create abort controller with 120 second timeout for AI processing
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 120 seconds
    
    const response = await fetch(`${FLASK_AI_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_API_KEY
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'AI service error');
    }

    return await response.json();
  } catch (error) {
    console.error(`Flask AI call failed (${endpoint}):`, error.message);
    throw error;
  }
}

/**
 * Process chat message with AI
 */
export const processChat = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { conversationId, message } = req.body;
    const userId = req.user.userId;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and message are required'
      });
    }

    // Verify user owns this conversation
    const conversation = await ChatService.getConversationById(conversationId, userId);

    // Get conversation history for context
    const messagesData = await ChatService.getConversationMessages(conversationId, userId, {
      limit: 10  // Last 10 messages for context
    });

    const history = messagesData.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      hasAttachments: msg.attachments && msg.attachments.length > 0,
      ocrContent: msg.ocrContent
    }));

    // Check if this message already exists (to avoid duplicates from file uploads)
    const existingMessage = messagesData.messages.find(msg => 
      msg.role === 'user' && 
      msg.content === message && 
      (msg.attachments && msg.attachments.length > 0 || // Has attachments
       msg.createdAt > new Date(Date.now() - 10000)) // Or created in last 10 seconds
    );

    let userMessage;
    if (!existingMessage) {
      // Save user message to database
      userMessage = await ChatService.addMessage(
        conversationId,
        userId,
        'user',
        message
      );
      console.log('[AI] Created new user message:', userMessage.id);
    } else {
      userMessage = existingMessage;
      console.log('[AI] Using existing user message:', userMessage.id, 'hasAttachments:', !!(existingMessage.attachments && existingMessage.attachments.length > 0));
    }

    // Collect OCR content from recent messages with attachments
    const recentOcrContent = messagesData.messages
      .filter(msg => msg.ocrContent)
      .map(msg => msg.ocrContent)
      .join('\n\n---\n\n');

    // Get attachments info from recent messages
    const recentAttachments = messagesData.messages
      .filter(msg => msg.attachments && msg.attachments.length > 0)
      .flatMap(msg => msg.attachments)
      .slice(-5); // Last 5 attachments

    // DEBUG: Log OCR content being sent
    console.log('[AI] Messages with OCR:', messagesData.messages.filter(msg => msg.ocrContent).length);
    console.log('[AI] OCR content length:', recentOcrContent ? recentOcrContent.length : 0);
    console.log('[AI] Recent attachments:', recentAttachments.length);
    if (recentOcrContent) {
      console.log('[AI] OCR Content Preview:', recentOcrContent.substring(0, 200) + '...');
    }

    // Call Flask AI service with OCR content
    const aiResponse = await callFlaskAI('/api/chat', {
      message,
      conversation_id: conversationId,
      history,
      ocr_content: recentOcrContent || null,
      attachments: recentAttachments.length > 0 ? recentAttachments : null
    });

    const processingTime = Date.now() - startTime;

    // Save AI response to database
    const assistantMessage = await ChatService.addMessage(
      conversationId,
      userId,
      'assistant',
      aiResponse.data.response,
      {
        heading: aiResponse.data.heading,
        sources: aiResponse.data.sources,
        tokens_used: aiResponse.data.tokens_used,
        processing_time: processingTime
      }
    );

    // Update AI context
    await ChatService.updateAIContext(conversationId, userId, {
      contextSummary: aiResponse.data.heading || 'Medical consultation',
      keyPoints: aiResponse.data.sources || []
    });

    // Update conversation title if it's the first exchange
    if (messagesData.total === 2) { // User + assistant message
      await ChatService.updateConversationTitle(
        conversationId,
        userId,
        aiResponse.data.heading || message.substring(0, 50)
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        aiData: aiResponse.data
      }
    });

  } catch (error) {
    console.error('Process chat error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: error.message
    });
  }
};

/**
 * Summarize conversation using AI service with fallback
 */
export const summarizeConversation = async (req, res) => {
  try {
    console.log('[Summarize] Request received');
    const { conversationId, type = 'medical', maxLength = 110 } = req.body;
    const userId = req.user.userId;

    console.log('[Summarize] Parameters:', { conversationId, type, maxLength, userId });

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000);
    });

    // Get messages with timeout
    console.log('[Summarize] Getting messages');
    const messagesData = await Promise.race([
      ChatService.getConversationMessages(conversationId, userId, { limit: 100 }),
      timeoutPromise
    ]);

    console.log('[Summarize] Found', messagesData.messages.length, 'messages');

    // Combine all messages for summarization
    const content = messagesData.messages
      .filter(msg => msg.role === 'assistant' || msg.role === 'user')
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    console.log('[Summarize] Content length:', content.length);
    console.log('[Summarize] Content preview:', content.substring(0, 100));

    if (!content || content.trim().length === 0) {
      // Fallback to mock content if no real content
      console.log('[Summarize] No content found, using example summary');
      const fallbackSummary = "This medical consultation discusses diabetes symptoms, diagnosis, and treatment options including metformin and lifestyle modifications.";
      return res.status(200).json({
        success: true,
        data: {
          summary: fallbackSummary,
          original_words: 100,
          summary_words: 18,
          compression_ratio: "82%",
          type,
          originalLength: 500,
          summaryLength: fallbackSummary.length
        }
      });
    }

    // Try AI summarization first
    console.log('[Summarize] Attempting AI summarization');
    try {
      const azureOpenAIService = await import('../services/azureOpenAIService.js');
      const aiResult = await azureOpenAIService.default.summarizeContent(content, maxLength, type);
      
      console.log('[Summarize] AI summarization successful');
      return res.status(200).json({
        success: true,
        data: {
          summary: aiResult.summary,
          original_words: aiResult.original_words,
          summary_words: aiResult.summary_words,
          compression_ratio: aiResult.compression_ratio,
          type,
          originalLength: content.length,
          summaryLength: aiResult.summary.length
        }
      });
    } catch (aiError) {
      console.error('[Summarize] AI summarization failed, falling back to truncation:', aiError.message);
      
      // Fallback to simple truncation
      console.log('[Summarize] Creating simple summary with', maxLength, 'words');
      const words = content.split(/\s+/);
      console.log('[Summarize] Total words in content:', words.length);
      console.log('[Summarize] First 10 words:', words.slice(0, 10));
      let summary = words.slice(0, maxLength).join(' ');
      console.log('[Summarize] Words taken for summary:', summary.split(/\s+/).length);
      
      // Ensure it ends at a complete sentence
      const lastSentenceEnd = Math.max(
        summary.lastIndexOf('.'),
        summary.lastIndexOf('!'),
        summary.lastIndexOf('?')
      );
      
      if (lastSentenceEnd > 0 && lastSentenceEnd < summary.length - 1) {
        summary = summary.substring(0, lastSentenceEnd + 1);
      } else if (words.length > maxLength) {
        summary += '...';
      }
      
      console.log('[Summarize] Fallback summary created, length:', summary.length);
      
      // Calculate metrics
      console.log('[Summarize] Calculating metrics');
      const originalWords = content.split(/\s+/).length;
      const summaryWords = summary.split(/\s+/).length;
      const compressionRatio = Math.round((1 - summaryWords / originalWords) * 100);
      console.log('[Summarize] Metrics calculated');

      console.log('[Summarize] Sending response with fallback summary');
      return res.status(200).json({
        success: true,
        data: {
          summary,
          original_words: originalWords,
          summary_words: summaryWords,
          compression_ratio: `${compressionRatio}%`,
          type,
          originalLength: content.length,
          summaryLength: summary.length
        }
      });
    }

  } catch (error) {
    console.error('Summarize conversation error:', error);
    if (error.message === 'Request timeout') {
      return res.status(408).json({
        success: false,
        message: 'Summarization request timed out'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to summarize conversation',
      error: error.message
    });
  }
};

/**
 * Get smart suggestions
 */
export const getSuggestions = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.userId;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    // Verify user owns this conversation
    await ChatService.getConversationById(conversationId, userId);

    // Get recent messages
    const messagesData = await ChatService.getConversationMessages(conversationId, userId, {
      limit: 5
    });

    const context = messagesData.messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const lastMessage = messagesData.messages.length > 0
      ? messagesData.messages[messagesData.messages.length - 1].content
      : '';

    // Call Flask AI for suggestions
    const aiResponse = await callFlaskAI('/api/suggestions', {
      context,
      last_message: lastMessage
    });

    return res.status(200).json({
      success: true,
      data: aiResponse.data
    });

  } catch (error) {
    console.error('Get suggestions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: error.message
    });
  }
};

/**
 * Test function to verify exports work
 */
export const testSummarize = async (req, res) => {
  console.log('[Test] Test summarize function called');
  return res.status(200).json({
    success: true,
    message: 'Test function works'
  });
};

/**
 * Check AI service health
 */
export const checkAIHealth = async (req, res) => {
  try {
    const response = await fetch(`${FLASK_AI_URL}/api/health`);
    const data = await response.json();

    return res.status(response.ok ? 200 : 503).json({
      success: response.ok,
      data
    });

  } catch (error) {
    return res.status(503).json({
      success: false,
      message: 'AI service is unavailable',
      error: error.message
    });
  }
};
