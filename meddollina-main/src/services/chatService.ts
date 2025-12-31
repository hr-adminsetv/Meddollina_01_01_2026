/**
 * Chat Service
 * Handles chat operations with backend API
 */

import apiClient from '@/utils/apiClient';
import { API_ENDPOINTS } from '@/config/api';

export interface Conversation {
  id: string;
  title: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  lastMessageAt: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'document';
  originalName: string;
  blobUrl: string;
  blobName: string;
  container: string;
  mimeType: string;
  size: number;
  ocrProcessed: boolean;
  uploadedAt: string;
  ocrCompletedAt?: string;
  ocrError?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed: number;
  processingTimeMs?: number;
  metadata?: Record<string, any>;
  attachments?: Attachment[];
  ocrContent?: string;
  createdAt: string;
}

export interface ConversationsResponse {
  success: boolean;
  data: {
    conversations: Conversation[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  tokensUsed: number;
}

class ChatService {
  /**
   * Create new conversation
   */
  async createConversation(title?: string, category?: string): Promise<Conversation> {
    const response = await apiClient.post<{ success: boolean; data: Conversation }>(
      API_ENDPOINTS.CHAT.CONVERSATIONS,
      { title, category },
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
    return response.data.data;
  }

  /**
   * Get user's conversations
   */
  async getConversations(page = 1, limit = 20): Promise<ConversationsResponse['data']> {
    const response = await apiClient.get<ConversationsResponse>(
      API_ENDPOINTS.CHAT.CONVERSATIONS,
      {
        params: { page, limit },
      }
    );
    return response.data.data;
  }

  /**
   * Get single conversation
   */
  async getConversation(id: string): Promise<Conversation> {
    const response = await apiClient.get<{ success: boolean; data: Conversation }>(
      API_ENDPOINTS.CHAT.CONVERSATION(id)
    );
    return response.data.data;
  }

  /**
   * Get conversation messages
   */
  async getMessages(conversationId: string, page = 1, limit = 50): Promise<MessagesResponse['data']> {
    const response = await apiClient.get<MessagesResponse>(
      API_ENDPOINTS.CHAT.MESSAGES(conversationId),
      {
        params: { 
          page, 
          limit,
          _t: Date.now() // Cache-busting timestamp
        },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    );
    return response.data.data;
  }

  /**
   * Send message (non-AI)
   */
  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const response = await apiClient.post<{ success: boolean; data: Message }>(
      API_ENDPOINTS.CHAT.SEND_MESSAGE(conversationId),
      { content, role: 'user' }
    );
    return response.data.data;
  }

  /**
   * Update conversation title
   */
  async updateTitle(conversationId: string, title: string): Promise<Conversation> {
    const response = await apiClient.patch<{ success: boolean; data: Conversation }>(
      API_ENDPOINTS.CHAT.UPDATE_TITLE(conversationId),
      { title }
    );
    return response.data.data;
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CHAT.DELETE(conversationId));
  }

  /**
   * Search conversations
   */
  async searchConversations(query: string, page = 1, limit = 20): Promise<ConversationsResponse['data']> {
    const response = await apiClient.get<ConversationsResponse>(
      API_ENDPOINTS.CHAT.SEARCH,
      {
        params: { q: query, page, limit },
      }
    );
    return response.data.data;
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<ChatStats> {
    const response = await apiClient.get<{ success: boolean; data: ChatStats }>(
      API_ENDPOINTS.CHAT.STATS
    );
    return response.data.data;
  }

  /**
   * Upload files to conversation
   */
  async uploadFiles(conversationId: string, files: File[], message?: string): Promise<any> {
    const formData = new FormData();
    
    // Append all files
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Append message if provided
    if (message) {
      formData.append('message', message);
    }

    const response = await apiClient.post(
      `/api/files/conversations/${conversationId}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  }

  /**
   * Get OCR processing status for a message
   */
  async getOcrStatus(messageId: string): Promise<any> {
    const response = await apiClient.get(
      `/api/files/messages/${messageId}/ocr-status`
    );
    return response.data;
  }

  /**
   * Download file
   */
  async downloadFile(blobName: string, container: string): Promise<Blob> {
    // Don't encode here - axios will handle it automatically
    const response = await apiClient.get(
      `/api/files/download`,
      {
        params: { blobName, container },
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(messageId: string, attachmentId: string): Promise<void> {
    await apiClient.delete(
      `/api/files/files/${messageId}/${attachmentId}`
    );
  }
}

export default new ChatService();
