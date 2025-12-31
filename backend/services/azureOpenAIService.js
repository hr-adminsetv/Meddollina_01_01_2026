/**
 * Azure OpenAI Service for AI-powered summarization
 * Uses Azure OpenAI to generate intelligent summaries of medical conversations
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure OpenAI Configuration
 * Using Document Intelligence endpoint for now as fallback
 */
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

class AzureOpenAIService {
  constructor() {
    this.endpoint = AZURE_OPENAI_ENDPOINT;
    this.apiKey = AZURE_OPENAI_KEY;
    this.deployment = AZURE_OPENAI_DEPLOYMENT;
    this.apiVersion = AZURE_OPENAI_API_VERSION;
  }

  /**
   * Generate a summary of the conversation using AI
   * @param {string} content - The full conversation content
   * @param {number} targetWords - Target word count for the summary
   * @param {string} type - Type of summary (medical, general, etc.)
   * @returns {Promise<Object>} Summary result
   */
  async summarizeContent(content, targetWords = 110, type = 'medical') {
    try {
      console.log('[OpenAI] Starting AI summarization');
      console.log('[OpenAI] Content length:', content.length);
      console.log('[OpenAI] Target words:', targetWords);
      console.log('[OpenAI] Endpoint:', this.endpoint);
      console.log('[OpenAI] Deployment:', this.deployment);

      // Check if we have valid OpenAI configuration
      if (!this.endpoint || !this.apiKey) {
        throw new Error('Azure OpenAI endpoint or key not configured');
      }

      // Prepare the prompt based on type
      const systemPrompt = this.getSystemPrompt(type, targetWords);
      
      // Create the chat completion request
      const chatUrl = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
      
      const requestBody = {
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please summarize the following medical conversation:\n\n${content}`
          }
        ],
        max_tokens: Math.ceil(targetWords * 1.5), // Give some room for AI to work
        temperature: 0.3, // Lower temperature for more focused summaries
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      };

      console.log('[OpenAI] Sending request to Azure OpenAI');
      console.log('[OpenAI] Request URL:', chatUrl);
      
      const response = await axios.post(chatUrl, requestBody, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const summary = response.data.choices[0].message.content.trim();
      
      console.log('[OpenAI] AI summarization complete');
      console.log('[OpenAI] Summary length:', summary.length);

      // Calculate actual metrics
      const originalWords = content.split(/\s+/).length;
      const summaryWords = summary.split(/\s+/).length;
      const compressionRatio = Math.round((1 - summaryWords / originalWords) * 100);

      return {
        success: true,
        summary,
        original_words: originalWords,
        summary_words: summaryWords,
        compression_ratio: `${compressionRatio}%`
      };
    } catch (error) {
      console.error('[OpenAI] AI summarization failed:', error.message);
      if (error.response) {
        console.error('[OpenAI] Error response:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get the appropriate system prompt based on summary type
   * @private
   */
  getSystemPrompt(type, targetWords) {
    const basePrompt = `You are a medical AI assistant tasked with summarizing medical conversations. Create a concise summary that captures the key medical information, symptoms, diagnoses, treatments, and recommendations discussed.`;

    const wordGuidance = `The summary should be approximately ${targetWords} words. Focus on medical accuracy and clarity.`;

    switch (type) {
      case 'medical':
        return `${basePrompt} ${wordGuidance} 

Include:
- Chief complaints and symptoms
- Key diagnostic findings
- Treatment recommendations
- Medications prescribed
- Follow-up instructions

Format as a clear, professional medical summary.`;
      
      default:
        return `${basePrompt} ${wordGuidance}`;
    }
  }
}

// Export singleton instance
const azureOpenAIService = new AzureOpenAIService();
export default azureOpenAIService;
