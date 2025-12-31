import { Conversation, Message, AIContext } from '../models/index.js';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chat Service
 * Handles conversation and message management
 */
class ChatService {
  /**
   * Create new conversation
   */
  static async createConversation(userId, title = 'New Consultation', category = 'general') {
    try {
      const conversation = await Conversation.create({
        userId,
        title,
        category,
        isActive: true,
        lastMessageAt: new Date()
      });

      // Initialize AI context for this conversation
      await AIContext.create({
        conversationId: conversation.id,
        contextSummary: '',
        keyPoints: [],
        medicalTerms: []
      });

      return conversation;
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId, options = {}) {
    try {
      const { page = 1, limit = 20, isActive = true } = options;
      const offset = (page - 1) * limit;

      const whereClause = {
        userId
      };

      if (isActive !== null) {
        whereClause.isActive = isActive;
      }

      const { count, rows } = await Conversation.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['lastMessageAt', 'DESC']],
        attributes: ['id', 'title', 'category', 'isActive', 'createdAt', 'lastMessageAt']
      });

      return {
        conversations: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get conversations: ${error.message}`);
    }
  }

  /**
   * Get single conversation by ID (with user validation)
   */
  static async getConversationById(conversationId, userId) {
    try {
      const conversation = await Conversation.findOne({
        where: {
          id: conversationId,
          userId
        }
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      return conversation;
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(conversationId, userId, options = {}) {
    try {
      // Verify user owns this conversation
      await this.getConversationById(conversationId, userId);

      const { page = 1, limit = 50 } = options;
      const offset = (page - 1) * limit;

      console.log('[ChatService] Loading messages for conversation:', conversationId);
      
      const { count, rows } = await Message.findAndCountAll({
        where: {
          conversationId
        },
        limit,
        offset,
        order: [['createdAt', 'ASC']],
        attributes: ['id', 'role', 'content', 'tokensUsed', 'processingTimeMs', 'metadata', 'attachments', 'ocrContent', 'createdAt']
      });

      console.log('[ChatService] Found', count, 'messages');
      console.log('[ChatService] Messages with attachments:', rows.filter(m => m.attachments && m.attachments.length > 0).length);

      // Log all messages to check for duplicates
      rows.forEach((msg, index) => {
        console.log(`[ChatService] Message ${index + 1}:`, {
          id: msg.id,
          role: msg.role,
          content: msg.content.substring(0, 50) + '...',
          hasAttachments: msg.attachments && msg.attachments.length > 0,
          attachmentCount: msg.attachments ? msg.attachments.length : 0
        });
      });

      // Generate SAS URLs for attachments
      const { default: azureBlobService } = await import('../services/azureBlobService.js');
      
      for (const message of rows) {
        if (message.attachments && message.attachments.length > 0) {
          for (const attachment of message.attachments) {
            if (attachment.blobName && attachment.container) {
              try {
                attachment.url = await azureBlobService.generateSasUrl(
                  attachment.blobName, 
                  attachment.container, 
                  24 // 24 hours expiry
                );
              } catch (error) {
                console.error('Failed to generate SAS URL for attachment:', error);
                attachment.url = null;
              }
            }
          }
        }
      }

      return {
        messages: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  /**
   * Add message to conversation
   */
  static async addMessage(conversationId, userId, role, content, metadata = {}) {
    try {
      // Verify user owns this conversation
      const conversation = await this.getConversationById(conversationId, userId);

      const messageData = {
        id: uuidv4(),
        conversationId,
        role,
        content,
        metadata,
        createdAt: new Date()
      };

      // Handle attachments if provided
      if (metadata.attachments) {
        messageData.attachments = metadata.attachments;
        
        // Generate SAS URLs for new attachments
        const { default: azureBlobService } = await import('../services/azureBlobService.js');
        
        for (const attachment of messageData.attachments) {
          if (attachment.blobName && attachment.container) {
            try {
              attachment.url = await azureBlobService.generateSasUrl(
                attachment.blobName, 
                attachment.container, 
                24 // 24 hours expiry
              );
            } catch (error) {
              console.error('Failed to generate SAS URL for new attachment:', error);
              attachment.url = null;
            }
          }
        }
      }

      const message = await Message.create(messageData);

      // Update conversation's last message timestamp
      await Conversation.update(
        { lastMessageAt: new Date() },
        { where: { id: conversationId } }
      );

      return message;
    } catch (error) {
      throw new Error(`Failed to add message: ${error.message}`);
    }
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(conversationId, userId, title) {
    try {
      const conversation = await this.getConversationById(conversationId, userId);

      await conversation.update({ title });

      return conversation;
    } catch (error) {
      throw new Error(`Failed to update conversation title: ${error.message}`);
    }
  }

  /**
   * Delete conversation (soft delete)
   */
  static async deleteConversation(conversationId, userId) {
    try {
      const conversation = await this.getConversationById(conversationId, userId);

      await conversation.update({ isActive: false });

      return true;
    } catch (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  /**
   * Get AI context for conversation
   */
  static async getAIContext(conversationId, userId) {
    try {
      // Verify user owns this conversation
      await this.getConversationById(conversationId, userId);

      const context = await AIContext.findOne({
        where: { conversationId }
      });

      return context;
    } catch (error) {
      throw new Error(`Failed to get AI context: ${error.message}`);
    }
  }

  /**
   * Update AI context
   */
  static async updateAIContext(conversationId, userId, updates) {
    try {
      // Verify user owns this conversation
      await this.getConversationById(conversationId, userId);

      const context = await AIContext.findOne({
        where: { conversationId }
      });

      if (!context) {
        throw new Error('AI context not found');
      }

      await context.update({
        ...updates,
        lastUpdated: new Date()
      });

      return context;
    } catch (error) {
      throw new Error(`Failed to update AI context: ${error.message}`);
    }
  }

  /**
   * Search conversations by title or content
   */
  static async searchConversations(userId, query, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const { count, rows } = await Conversation.findAndCountAll({
        where: {
          userId,
          isActive: true,
          title: {
            [Op.iLike]: `%${query}%`
          }
        },
        limit,
        offset,
        order: [['lastMessageAt', 'DESC']]
      });

      return {
        conversations: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to search conversations: ${error.message}`);
    }
  }

  /**
   * Get conversation statistics for user
   */
  static async getUserStats(userId) {
    try {
      const totalConversations = await Conversation.count({
        where: { userId, isActive: true }
      });

      const totalMessages = await Message.count({
        include: [{
          model: Conversation,
          as: 'conversation',
          where: { userId },
          attributes: []
        }]
      });

      const tokensUsed = await Message.sum('tokensUsed', {
        include: [{
          model: Conversation,
          as: 'conversation',
          where: { userId },
          attributes: []
        }]
      });

      return {
        totalConversations,
        totalMessages,
        tokensUsed: tokensUsed || 0
      };
    } catch (error) {
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
  }
}

export default ChatService;
