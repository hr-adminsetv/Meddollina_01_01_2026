import ChatService from '../services/chatService.js';

/**
 * Chat Controller
 * Handles HTTP requests for chat operations
 */

/**
 * Create new conversation
 */
export const createConversation = async (req, res) => {
  try {
    const { title, category } = req.body;
    const userId = req.user.userId;

    const conversation = await ChatService.createConversation(
      userId,
      title || 'New Consultation',
      category || 'general'
    );

    return res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: error.message
    });
  }
};

/**
 * Get user's conversations
 */
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page, limit, isActive } = req.query;

    const result = await ChatService.getUserConversations(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      isActive: isActive !== undefined ? isActive === 'true' : true
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
};

/**
 * Get single conversation
 */
export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const conversation = await ChatService.getConversationById(id, userId);

    return res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get conversation messages
 */
export const getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { page, limit } = req.query;

    const result = await ChatService.getConversationMessages(id, userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Send message to conversation
 */
export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { content, role = 'user', metadata = {} } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const message = await ChatService.addMessage(
      id,
      userId,
      role,
      content,
      metadata
    );

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update conversation title
 */
export const updateConversationTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const conversation = await ChatService.updateConversationTitle(id, userId, title);

    return res.status(200).json({
      success: true,
      message: 'Conversation title updated',
      data: conversation
    });
  } catch (error) {
    console.error('Update title error:', error);
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete conversation
 */
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await ChatService.deleteConversation(id, userId);

    return res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get AI context for conversation
 */
export const getAIContext = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const context = await ChatService.getAIContext(id, userId);

    return res.status(200).json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('Get AI context error:', error);
    return res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Search conversations
 */
export const searchConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { q, page, limit } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const result = await ChatService.searchConversations(userId, q, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Search conversations error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await ChatService.getUserStats(userId);

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
