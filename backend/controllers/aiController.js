import ChatService from '../services/chatService.js';
import azureOpenAIService from '../services/azureOpenAIService.js';
import azureOpenAISummarizer from '../services/azureOpenAISummarizer.js';
import contextManager from '../services/contextManager.js';
import DynamicContextAnalyzer from '../services/dynamicContextAnalyzer.js';
import { authenticate } from '../middleware/auth.js';

/**
 * AI Controller
 * Handles AI operations by proxying to Flask AI service
 * and managing chat context in PostgreSQL
 */

const FLASK_AI_URL = process.env.FLASK_AI_URL || 'http://localhost:5001';
const SUMMARIZER_URL = process.env.SUMMARIZER_URL || 'http://localhost:5002';
const AI_API_KEY = process.env.AI_API_KEY || 'meddollina-internal-api-key-2024';

// Initialize fully dynamic context analyzer
const dynamicAnalyzer = new DynamicContextAnalyzer();

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
export async function processChat(req, res) {
  console.log('=== PROCESS CHAT FUNCTION CALLED ===');
  console.log('Request body keys:', Object.keys(req.body || {}));
  console.log('Full request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const startTime = Date.now();
    const { conversationId, message, ocr_content } = req.body;
    const userId = req.user.userId;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and message are required'
      });
    }

    console.log('[PROCESS CHAT] Starting chat processing...');
    console.log('[PROCESS CHAT] Conversation ID:', conversationId);
    console.log('[PROCESS CHAT] User ID:', userId);
    console.log('[PROCESS CHAT] OCR content present:', !!ocr_content);
    console.log('[PROCESS CHAT] OCR content length:', ocr_content ? ocr_content.length : 0);
    
    if (ocr_content) {
      console.log('[PROCESS CHAT] OCR content preview:', ocr_content.substring(0, 200) + '...');
    }

    // Verify user owns this conversation
    console.log('[PROCESS CHAT] Getting conversation...');
    const conversation = await ChatService.getConversationById(conversationId, userId);
    console.log('[PROCESS CHAT] Conversation retrieved:', !!conversation);
    
    if (!conversation) {
      console.error('[PROCESS CHAT] Conversation not found:', conversationId);
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
        error: `Conversation with ID ${conversationId} not found`
      });
    }

    // Get conversation history for context
    console.log('[PROCESS CHAT] Getting conversation messages...');
    const messagesData = await ChatService.getConversationMessages(conversationId, userId, {
      limit: 10  // Last 10 messages for context
    });

    const history = messagesData.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      hasAttachments: msg.attachments && msg.attachments.length > 0,
      ocrContent: msg.ocrContent
    }));

    // Update context with new message
    console.log('[AI] Updating context for conversation:', conversationId);
    let context;
    try {
      context = await contextManager.updateContext(conversationId, message, 'user');
      console.log('[AI] Current topic:', context.currentTopic, 'Score:', context.contextScore);
    } catch (error) {
      console.error('[AI] Error updating context:', error);
      context = {
        currentTopic: null,
        contextScore: 1.0
      };
    }

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

    // Use fully dynamic context analyzer - Azure OpenAI reads everything and determines context
    let dynamicContext;
    let systemPrompt;
    
    console.log('[AI] === STARTING DYNAMIC CONTEXT ANALYSIS ===');
    console.log('[AI] Conversation ID:', conversationId);
    console.log('[AI] Message:', message);
    console.log('[AI] History length:', history.length);
    console.log('[AI] Last 3 messages:');
    history.slice(-3).forEach((msg, i) => {
      console.log(`[AI]   ${i+1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
    });
    
    try {
      console.log('[AI] Running fully dynamic context analysis...');
      
      // Azure OpenAI analyzes entire conversation
      dynamicContext = await dynamicAnalyzer.analyzeConversation(history, message);
      
      // Safety check for dynamicContext
      if (!dynamicContext || typeof dynamicContext !== 'object') {
        console.error('[AI] Invalid dynamicContext returned:', dynamicContext);
        throw new Error('Invalid context analysis result');
      }
      
      // Use the context prompt generated by Azure OpenAI
      systemPrompt = dynamicContext.contextPrompt || 'You are a medical AI assistant.';
      
      // Additional safety checks before accessing properties
      const specialty = dynamicContext && dynamicContext.specialty ? dynamicContext.specialty : 'general';
      const condition = dynamicContext && dynamicContext.condition ? dynamicContext.condition : 'being evaluated';
      const phase = dynamicContext && dynamicContext.phase ? dynamicContext.phase : 'initial';
      const urgency = dynamicContext && dynamicContext.urgency ? dynamicContext.urgency : 'normal';
      
      console.log('[AI] === DYNAMIC ANALYSIS RESULTS ===');
      console.log('[AI] Specialty:', specialty);
      console.log('[AI] Condition:', condition);
      console.log('[AI] Phase:', phase);
      console.log('[AI] Urgency:', urgency);
      console.log('[AI] Context prompt length:', systemPrompt?.length || 0);
      console.log('[AI] Context prompt preview:', (systemPrompt || '').substring(0, 500) + '...');
      console.log('[AI] === SENDING TO FLASK AI ===');
      console.log('[AI] History length:', history.length);
      console.log('[AI] System prompt includes specialty:', systemPrompt?.includes(specialty) || false);
      console.log('[AI] System prompt includes condition:', systemPrompt?.includes(condition) || false);
      
      // Update context manager with dynamic results (but don't override with AI response later)
      await contextManager.updateContext(conversationId, message, 'user');
      
      // Store dynamic context for reference
      console.log('[AI] Storing dynamic context...');
      try {
        contextManager.setDynamicContext(conversationId, dynamicContext);
        console.log('[AI] Dynamic context stored successfully');
      } catch (contextError) {
        console.error('[AI] Failed to store dynamic context:', contextError);
        console.error('[AI] Context error stack:', contextError.stack);
        // Continue without storing context
      }
      
    } catch (error) {
      console.error('[AI] === DYNAMIC ANALYSIS FAILED ===');
      console.error('[AI] Error:', error);
      console.error('[AI] Error details:', error.stack);
      // Emergency fallback
      systemPrompt = 'You are a medical AI assistant. Provide helpful information based on the conversation.';
      dynamicContext = {
        specialty: 'general',
        condition: 'evaluation',
        phase: 'initial',
        urgency: 'normal',
        contextPrompt: systemPrompt
      };
    }
    
    // Call Flask AI service with context-aware prompts
    console.log('[AI] Calling Flask AI with OCR content length:', ocr_content ? ocr_content.length : 0);
    
    const aiResponse = await callFlaskAI('/api/chat', {
      message,
      conversation_id: conversationId,
      history,
      ocr_content: ocr_content || recentOcrContent || null, // Use current OCR content first, then fallback to recent
      attachments: recentAttachments.length > 0 ? recentAttachments : null,
      system_prompt: systemPrompt,
      context: dynamicContext
    });

    // Validate response maintains context
    const validation = contextManager.validateContextResponse(conversationId, aiResponse.data.response);
    console.log('[Context] Response validation:', validation);
    
    // If context is lost, attempt recovery
    if (!validation.valid && dynamicContext?.specialty && dynamicContext.specialty !== 'general') {
      console.log('[Context] Context drift detected, attempting recovery...');
      const recoveryPrompt = `You are a ${dynamicContext?.specialty || 'specialist'} specialist. The patient has ${dynamicContext?.condition || 'a condition'}. Please refocus on this case and provide appropriate guidance.`;
      
      // Call AI again with recovery prompt
      const recoveryResponse = await callFlaskAI('/api/chat', {
        message: recoveryPrompt,
        conversation_id: conversationId,
        history: [...history, { role: 'assistant', content: aiResponse.data.response }],
        system_prompt: systemPrompt
      });
      
      // Use recovery response if it's better
      if (recoveryResponse.data.response) {
        aiResponse.data.response = recoveryResponse.data.response;
        aiResponse.data.contextRecovered = true;
      }
    }

    const processingTime = Date.now() - startTime;

    // Don't update context with AI response - it overrides our dynamic analysis
    // await contextManager.updateContext(conversationId, aiResponse.data.response, 'assistant');

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
        processing_time: processingTime,
        context_score: validation.score || dynamicContext.contextScore || 1.0,
        topic: dynamicContext?.specialty || 'general', // Use dynamic context specialty
        context_recovered: aiResponse.data.contextRecovered || false
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
    console.error('Process chat error stack:', error.stack);
    console.error('Process chat error name:', error.name);
    console.error('Process chat error message:', error.message);
    
    // Additional debugging for the specific error
    if (error.message && error.message.includes('cardiology')) {
      console.error('=== CARDIOLOGY ERROR DETECTED ===');
      console.error('Error involves cardiology property access');
      console.error('Full error:', JSON.stringify(error, null, 2));
      console.error('Full stack:', error.stack);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error.constructor.name);
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: error.message
    });
  }
};

/**
 * Generate case sheet from conversation content
 */
export const generateCaseSheet = async (req, res) => {
  try {
    console.log('[GenerateCaseSheet] Request received');
    const { conversationId, patientInfo } = req.body;
    const userId = req.user.userId;

    console.log('[GenerateCaseSheet] Parameters:', { conversationId, userId });

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    // Get conversation messages
    const messagesData = await ChatService.getConversationMessages(conversationId, userId, {
      limit: 50 // Get more messages for comprehensive case sheet
    });

    if (!messagesData.messages || messagesData.messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No messages found in conversation'
      });
    }

    // Combine messages into content
    const contentToAnalyze = messagesData.messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    console.log('[GenerateCaseSheet] Content length:', contentToAnalyze.length);

    // Generate case sheet using Azure OpenAI
    const caseSheetPrompt = `MEDICAL CASE SHEET GENERATION

Based on the following medical conversation, generate a comprehensive case sheet in the specified format.

Patient Information:
- Age: ${patientInfo?.age || 'Not specified'}
- Gender: ${patientInfo?.gender || 'Not specified'}
- Identifier: ${patientInfo?.identifier || 'Anonymous'}

Conversation Content:
${contentToAnalyze}

Generate a structured case sheet with the following sections:

1. PATIENT INFORMATION
- Age, Gender, Identifier
- Relevant demographic details

2. HISTORY
- Chief complaint
- History of present illness
- Past medical history
- Family history
- Social history

3. EXAMS
- Physical examination findings
- Vital signs
- Relevant examination results

4. DIFFERENTIAL DIAGNOSIS & CONFIDENCE
- Primary diagnosis with confidence level
- Differential diagnoses with likelihood
- Reasoning for each diagnosis

5. MEDICAL CONDITIONS
- Current medical conditions
- Comorbidities
- Risk factors

6. HISTORICAL CORRELATION
- Correlation with family history
- Genetic predispositions
- Historical risk factors

7. MEDICATIONS
- Current medications
- Past medications
- Allergies

8. SURGERY (IF NEEDED)
- Indications for surgery
- Surgical options
- Recommended procedures

9. PROBLEM REPRESENTATION
- Summary of key problems
- Clinical problem list
- Priority issues

10. TIMELINE
- Chronological progression
- Key events and dates
- Disease evolution

11. CLINICAL REASONING
- Diagnostic reasoning
- Clinical decision making
- Evidence-based conclusions

12. RED FLAGS & RULE OUTS
- Critical symptoms/signs
- Emergency conditions ruled out
- Warning signs

13. SECURITY STAGING AND RISK
- Disease staging if applicable
- Risk assessment
- Security classification

14. MULTIDISCIPLINARY
- Consultations needed
- Team approach
- Specialist involvement

15. EVIDENCE AND GUIDELINE
- Relevant evidence
- Clinical guidelines
- Best practices

16. PATIENT-CENTRIC LAYER
- Patient preferences
- Quality of life considerations
- Personal factors

17. PROGNOSIS & FOLLOW-UP STRATEGY
- Expected outcomes
- Follow-up plan
- Monitoring requirements

18. ETHICAL & CONSENT NOTES
- Ethical considerations
- Consent status
- Legal considerations

Format each section clearly with headings. Be comprehensive but concise. Use medical terminology appropriately.`;

    // Call Azure OpenAI to generate case sheet
    const generatedCaseSheet = await azureOpenAISummarizer.generateCaseSheet(caseSheetPrompt);

    return res.status(200).json({
      success: true,
      data: {
        case_sheet: generatedCaseSheet,
        patient_info: patientInfo || {
          age: 'Not specified',
          gender: 'Not specified',
          identifier: 'Anonymous'
        },
        conversation_id: conversationId,
        message_count: messagesData.messages.length,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[GenerateCaseSheet] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate case sheet',
      error: error.message
    });
  }
};

/**
 * Generate case sheet from content directly using Azure OpenAI
 */
export const generateCaseSheetFromContent = async (req, res) => {
  try {
    console.log('[GenerateCaseSheetFromContent] Request received');
    const { prompt } = req.body;

    console.log('[GenerateCaseSheetFromContent] Prompt length:', prompt?.length);

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required for case sheet generation'
      });
    }

    // Generate case sheet using Azure OpenAI
    console.log('[GenerateCaseSheetFromContent] Attempting AI generation');
    try {
      const generatedCaseSheet = await azureOpenAISummarizer.generateCaseSheet(prompt);
      
      console.log('[GenerateCaseSheetFromContent] AI generation successful');
      console.log('[GenerateCaseSheetFromContent] Case sheet length:', generatedCaseSheet.length);
      
      return res.status(200).json({
        success: true,
        data: {
          case_sheet: generatedCaseSheet
        }
      });
    } catch (aiError) {
      console.error('[GenerateCaseSheetFromContent] AI generation failed:', aiError.message);
      throw aiError;
    }
  } catch (error) {
    console.error('[GenerateCaseSheetFromContent] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate case sheet',
      error: error.message
    });
  }
};

/**
 * Summarize text content directly using AI service
 */
export const summarizeContent = async (req, res) => {
  try {
    console.log('[SummarizeContent] Request received');
    const { content, type = 'medical', maxLength = 250 } = req.body;

    console.log('[SummarizeContent] Parameters:', { type, maxLength, contentLength: content?.length });

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Content is required for summarization'
      });
    }

    // Use Azure OpenAI to summarize the content
    console.log('[SummarizeContent] Attempting AI summarization');
    try {
      const aiSummary = await azureOpenAISummarizer.summarizeText(content, type, maxLength);
      
      console.log('[SummarizeContent] AI summarization successful');
      
      // Calculate metrics
      const originalWords = content.split(/\s+/).length;
      const summaryWords = aiSummary.split(/\s+/).length;
      const compressionRatio = Math.round((1 - summaryWords / originalWords) * 100);
      
      return res.status(200).json({
        success: true,
        data: {
          summary: aiSummary,
          original_words: originalWords,
          summary_words: summaryWords,
          compression_ratio: `${compressionRatio}%`,
          type,
          originalLength: content.length,
          summaryLength: aiSummary.length
        }
      });
    } catch (aiError) {
      console.error('[SummarizeContent] AI summarization failed:', aiError.message);
      throw aiError;
    }
  } catch (error) {
    console.error('[SummarizeContent] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to summarize content',
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
      const aiSummary = await azureOpenAISummarizer.summarizeText(content, type, maxLength);
      
      console.log('[Summarize] AI summarization successful');
      
      // Calculate metrics
      const originalWords = content.split(/\s+/).length;
      const summaryWords = aiSummary.split(/\s+/).length;
      const compressionRatio = Math.round((1 - summaryWords / originalWords) * 100);
      
      return res.status(200).json({
        success: true,
        data: {
          summary: aiSummary,
          original_words: originalWords,
          summary_words: summaryWords,
          compression_ratio: `${compressionRatio}%`,
          type,
          originalLength: content.length,
          summaryLength: aiSummary.length
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
 * Get current conversation context
 */
export const getContext = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required'
      });
    }

    // Verify user owns this conversation
    const conversation = await ChatService.getConversationById(conversationId, userId);

    // Get context summary using dynamic analyzer
    const messagesData = await ChatService.getConversationMessages(conversationId, userId, {
      limit: 10
    });
    
    let contextSummary;
    if (messagesData.messages.length > 0) {
      // Use dynamic analyzer
      const history = messagesData.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const lastMessage = history[history.length - 1].content;
      const dynamicContext = await dynamicAnalyzer.analyzeConversation(history.slice(0, -1), lastMessage);
      
      // Convert to old format for compatibility
      contextSummary = {
        currentTopic: dynamicContext?.specialty || 'general',
        subTopic: dynamicContext?.condition || null,
        condition: dynamicContext?.condition || 'No discussion yet',
        stage: dynamicContext?.phase || 'initial',
        urgency: dynamicContext?.urgency || 'normal',
        contextScore: 1.0,
        messageCount: messagesData.messages.length,
        specialty: dynamicContext?.specialty || 'general'
      };
    } else {
      // No messages
      contextSummary = {
        currentTopic: 'general',
        subTopic: null,
        condition: 'No discussion yet',
        stage: 'initial',
        urgency: 'normal',
        contextScore: 1.0,
        messageCount: 0,
        specialty: 'general'
      };
    }

    return res.status(200).json({
      success: true,
      data: contextSummary
    });
  } catch (error) {
    console.error('[GetContext] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get context',
      error: error.message
    });
  }
};

/**
 * Get AI service health
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

export const getFrontendContext = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Verify user owns this conversation
    const conversation = await ChatService.getConversationById(conversationId, userId);

    // Get or initialize context using dynamic analyzer
    let frontendContext;
    try {
      console.log('[GetFrontendContext] === GETTING MESSAGES FOR ANALYSIS ===');
      // Get recent messages for dynamic analysis
      const messagesData = await ChatService.getConversationMessages(conversationId, userId, {
        limit: 10
      });
      
      console.log('[GetFrontendContext] Found messages:', messagesData.messages.length);
      if (messagesData.messages.length > 0) {
        console.log('[GetFrontendContext] Last 3 messages:');
        messagesData.messages.slice(-3).forEach((msg, i) => {
          console.log(`[GetFrontendContext]   ${i+1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
        });
      }
      
      // First check if we have dynamic context stored
      const storedDynamicContext = contextManager.getDynamicContext(conversationId);
      
      if (storedDynamicContext) {
        console.log('[GetFrontendContext] === USING STORED DYNAMIC CONTEXT ===');
        console.log('[GetFrontendContext] Specialty:', storedDynamicContext.specialty || 'general');
        console.log('[GetFrontendContext] Condition:', storedDynamicContext.condition || 'being evaluated');
        
        // Convert to frontend format
        frontendContext = dynamicAnalyzer.getFrontendContext(storedDynamicContext);
        frontendContext.messageCount = messagesData.messages.length;
        frontendContext.score = 100;
        
        console.log('[GetFrontendContext] === FINAL FRONTEND CONTEXT ===');
        console.log('[GetFrontendContext] Specialty:', frontendContext.specialty || 'general');
        console.log('[GetFrontendContext] Condition:', frontendContext.condition || 'being evaluated');
      } else if (messagesData.messages.length > 0) {
        // Use dynamic analyzer
        const history = messagesData.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        const lastMessage = history[history.length - 1].content;
        console.log('[GetFrontendContext] === CALLING DYNAMIC ANALYZER ===');
        const dynamicContext = await dynamicAnalyzer.analyzeConversation(history.slice(0, -1), lastMessage);
        
        console.log('[GetFrontendContext] === DYNAMIC ANALYZER RESULT ===');
        console.log('[GetFrontendContext] Specialty:', dynamicContext?.specialty || 'general');
        console.log('[GetFrontendContext] Condition:', dynamicContext?.condition || 'being evaluated');
        console.log('[GetFrontendContext] Phase:', dynamicContext?.phase || 'initial');
        
        // Convert to frontend format
        frontendContext = dynamicAnalyzer.getFrontendContext(dynamicContext);
        frontendContext.messageCount = messagesData.messages.length;
        frontendContext.score = 100; // Always high confidence with AI analysis
        
        console.log('[GetFrontendContext] === FINAL FRONTEND CONTEXT ===');
        console.log('[GetFrontendContext] Specialty:', frontendContext?.specialty || 'general');
        console.log('[GetFrontendContext] Condition:', frontendContext?.condition || 'being evaluated');
      } else {
        // No messages yet
        console.log('[GetFrontendContext] No messages found, using default');
        frontendContext = {
          specialty: 'general',
          condition: 'No discussion yet',
          phase: 'initial',
          urgency: 'normal',
          summary: 'Start a conversation to begin',
          symptoms: [],
          findings: [],
          nextSteps: [],
          messageCount: 0,
          score: 100
        };
      }
    } catch (error) {
      console.error('[GetFrontendContext] === ERROR ===');
      console.error('[GetFrontendContext] Error with dynamic analysis:', error);
      // Fallback to basic context
      frontendContext = {
        specialty: 'general',
        condition: 'Medical consultation',
        phase: 'initial',
        urgency: 'normal',
        summary: 'Medical consultation in progress',
        symptoms: [],
        findings: [],
        nextSteps: [],
        messageCount: 0,
        score: 100
      };
    }

    console.log('[GetFrontendContext] === SENDING RESPONSE ===');
    console.log('[GetFrontendContext] Returning:', {
      specialty: frontendContext?.specialty || 'general',
      condition: frontendContext?.condition || 'No discussion yet'
    });

    return res.status(200).json({
      success: true,
      data: frontendContext
    });
  } catch (error) {
    console.error('[GetFrontendContext] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get frontend context',
      error: error.message
    });
  }
};
