/**
 * AI Service
 * Handles AI operations with backend API
 */

import apiClient from '@/utils/apiClient';
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import { Message } from './chatService';
import axios from 'axios';

export interface AIResponse {
  userMessage: Message;
  assistantMessage: Message;
  aiData: {
    response: string;
    heading: string;
    sources: string[];
    tokens_used: number;
    processing_time: number;
  };
}

export interface SummarizeResponse {
  summary: string;
  type: string;
  original_length: number;
  original_words: number;
  summary_length: number;
  summary_words: number;
  compression_ratio: string;
}

export interface SuggestionsResponse {
  suggestions: string[];
}

export interface PatientInfo {
  age?: string;
  gender?: string;
  identifier?: string;
}

export interface CaseSheetResponse {
  case_sheet: string;
  patient_info: PatientInfo;
  conversation_id: string;
  message_count: number;
  generated_at: string;
}

export interface AIHealthResponse {
  success: boolean;
  data: {
    status: string;
    llm_initialized: boolean;
    model: string;
    success: boolean;
  };
}

export interface ContextResponse {
  success: boolean;
  data: {
    topic: string;
    subTopic: string;
    condition: string;
    stage: string;
    score: number;
    messageCount: number;
  };
}

class AIService {
  /**
   * Send message to AI and get response
   */
  async chat(conversationId: string, message: string, ocrContent?: string): Promise<AIResponse> {
    const uniqueId = Math.random().toString(36).substring(7);
    const timestamp = Date.now();
    
    // Debug: Check the actual base URL being used
    console.log('[AIService] DEBUG - API Base URL:', apiClient.defaults.baseURL);
    console.log('[AIService] DEBUG - Full URL will be:', apiClient.defaults.baseURL + '/api/ai/chat');
    
    // CRITICAL DEBUG: Force create a new axios instance
    console.log('[AIService] CRITICAL - Creating fresh axios instance...');
    const freshAxios = axios.create({
      baseURL: '',
      timeout: 30000
    });
    
    // Test with fresh instance
    try {
      const testResponse = await freshAxios.post('/api/test-post', { test: 'fresh axios' });
      console.log('[AIService] Fresh axios test:', testResponse.data);
    } catch (e) {
      console.error('[AIService] Fresh axios failed:', e);
    }
    
    console.log('[AIService] Sending chat request:', { conversationId, message: message.substring(0, 50) + '...', hasOcr: !!ocrContent, uniqueId, timestamp });
    console.log('[AIService] Full request payload:', {
      conversationId,
      message,
      ocr_content: ocrContent ? ocrContent.substring(0, 200) + '...' + ` (length: ${ocrContent.length})` : undefined
    });
    
    try {
      // Use the standard endpoint
      const response = await apiClient.post<{ success: boolean; data: AIResponse }>(
        `/api/ai/chat`, // Back to standard endpoint
        {
          conversationId,
          message,
          ocr_content: ocrContent,
          _timestamp: timestamp,
          _uniqueId: uniqueId
        }
      );
      
      console.log('[AIService] Received response:', response.data);
      console.log('[AIService] Response URL:', response.config.url);
      console.log('[AIService] Response status:', response.status);
      console.log('[AIService] Response data type:', typeof response.data);
      
      // CRITICAL: Check response structure to identify source
      console.log('[AIService] Full response object:', response.data);
      if (response.data.data && response.data.data.aiData) {
        console.log('[AIService] ✅ Backend response structure (has aiData)');
        console.log('[AIService] AI Response content:', response.data.data.aiData.response?.substring(0, 200) + '...');
      } else if ((response.data as any).response) {
        console.log('[AIService] ❌ Flask AI direct response structure (has response)');
        console.log('[AIService] Response preview:', (response.data as any).response?.substring(0, 200) + '...');
      } else {
        console.log('[AIService] ❓ Unknown response structure');
        console.log('[AIService] Response keys:', Object.keys(response.data));
      }
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        console.error('[AIService] Invalid response structure:', response.data);
        throw new Error('Invalid response structure from API');
      }
    } catch (error) {
      console.error('[AIService] Chat request failed:', error);
      throw error;
    }
  }

  /**
   * Summarize conversation
   */
  async summarize(conversationId: string, type = 'medical', maxLength = 250): Promise<SummarizeResponse> {
    const response = await apiClient.post<{ success: boolean; data: SummarizeResponse }>(
      API_ENDPOINTS.AI.SUMMARIZE,
      {
        conversationId,
        type,
        maxLength,
      }
    );
    
    // Extract the summary data from the response
    const responseData = response.data;
    
    if (responseData.success && responseData.data) {
      return responseData.data;
    } else {
      throw new Error('Invalid response structure from API');
    }
  }

  /**
   * Summarize text content directly
   */
  async summarizeContent(content: string, type = 'medical', maxLength = 250): Promise<SummarizeResponse> {
    const response = await apiClient.post<{ success: boolean; data: SummarizeResponse }>(
      API_ENDPOINTS.AI.SUMMARIZE_CONTENT,
      {
        content,
        type,
        maxLength,
      }
    );
    
    // Extract the summary data from the response
    const responseData = response.data;
    
    if (responseData.success && responseData.data) {
      return responseData.data;
    } else {
      throw new Error('Invalid response structure from API');
    }
  }

  /**
   * Generate case sheet from conversation
   */
  async generateCaseSheet(conversationId: string, patientInfo?: PatientInfo): Promise<CaseSheetResponse> {
    const response = await apiClient.post<{ success: boolean; data: CaseSheetResponse }>(
      API_ENDPOINTS.AI.GENERATE_CASE_SHEET,
      {
        conversationId,
        patientInfo
      }
    );
    
    return response.data.data;
  }

  /**
   * Generate case sheet directly from content using Azure OpenAI
   */
  async generateCaseSheetFromContent(prompt: string): Promise<string> {
    const response = await apiClient.post<{ success: boolean; data: { case_sheet: string } }>(
      '/api/ai/generate-case-sheet-content',
      {
        prompt
      }
    );
    
    return response.data.data.case_sheet;
  }

  /**
   * Get AI suggestions
   */
  async getSuggestions(conversationId: string): Promise<string[]> {
    const response = await apiClient.post<{ success: boolean; data: SuggestionsResponse }>(
      API_ENDPOINTS.AI.SUGGESTIONS,
      {
        conversationId,
      }
    );
    return response.data.data.suggestions;
  }

  /**
   * Check AI service health
   */
  async checkHealth(): Promise<AIHealthResponse['data']> {
    const response = await apiClient.get<AIHealthResponse>(API_ENDPOINTS.AI.HEALTH);
    return response.data.data;
  }

  /**
   * Get conversation context
   */
  async getContext(conversationId: string): Promise<ContextResponse['data']> {
    const response = await apiClient.get<{ success: boolean; data: ContextResponse['data'] }>(
      API_ENDPOINTS.AI.CONTEXT(conversationId)
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid response structure from API');
    }
  }
}

export default new AIService();
