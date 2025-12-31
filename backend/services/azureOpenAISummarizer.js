/**
 * Azure OpenAI Summarizer Service
 * Uses Azure OpenAI GPT-4o-mini for text summarization
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure OpenAI Configuration
 */
const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT || "";
const AZURE_API_KEY = process.env.AZURE_API_KEY || "";
const API_VERSION = process.env.AZURE_API_VERSION || "2024-12-01-preview";
const DEPLOYMENT_NAME = process.env.AZURE_DEPLOYMENT || "gpt-4o-mini";

class AzureOpenAISummarizer {
  constructor() {
    this.client = new OpenAI({
      apiKey: AZURE_API_KEY,
      baseURL: `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}`,
      defaultQuery: { 'api-version': API_VERSION },
      defaultHeaders: {
        'api-key': AZURE_API_KEY,
      }
    });
    this.deployment = DEPLOYMENT_NAME;
  }

  /**
   * Summarize text content using Azure OpenAI GPT-4o-mini
   * @param {string} content - Text content to summarize
   * @param {string} type - Type of summarization (medical, general, etc.)
   * @param {number} maxLength - Maximum length of summary in words
   * @returns {Promise<string>} Summarized text
   */
  async summarizeText(content, type = 'general', maxLength = 250) {
    try {
      console.log('[AzureOpenAI] Starting summarization for content length:', content.length);
      console.log('[AzureOpenAI] Using deployment:', this.deployment);
      
      // Create the prompt based on type
      const systemPrompt = this.createPrompt(type, maxLength);
      
      // Make the API call
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: Math.max(maxLength * 2, 1000), // Convert words to approximate tokens
        temperature: 0.3, // Lower temperature for more consistent summaries
        top_p: 1.0,
        model: this.deployment // For Azure, this is not needed as it's in the URL
      });

      const summary = response.choices[0].message.content.trim();
      
      console.log('[AzureOpenAI] Summarization completed successfully');
      console.log('[AzureOpenAI] Summary length:', summary.length);
      
      return summary;
      
    } catch (error) {
      console.error('[AzureOpenAI] Summarization failed:', error.message);
      console.error('[AzureOpenAI] Full error:', error);
      
      // If Azure OpenAI fails, fallback to extractive summarization
      console.log('[AzureOpenAI] Falling back to extractive summarization');
      return this.extractiveSummarize(content, maxLength, type);
    }
  }

  /**
   * Create system prompt based on summarization type
   * @private
   */
  createPrompt(type, maxLength) {
    const basePrompt = `You are a professional summarizer. Create a concise summary of the provided text in approximately ${maxLength} words or less. `;
    
    switch(type) {
      case 'medical':
        return basePrompt + 
          "Focus on key medical information including symptoms, diagnosis, treatment plans, medications, and patient recommendations. " +
          "Use clear, professional medical language while ensuring the summary is easily understandable.";
      
      case 'legal':
        return basePrompt + 
          "Focus on key legal points, arguments, precedents, and conclusions. Use precise legal terminology.";
      
      case 'business':
        return basePrompt + 
          "Focus on key business insights, decisions, action items, and outcomes. Use professional business language.";
      
      default:
        return basePrompt + 
          "Identify and preserve the most important information, main ideas, and key details. Ensure the summary flows well and captures the essence of the original text.";
    }
  }

  /**
   * Generate case sheet using Azure OpenAI GPT-4o-mini
   * @param {string} prompt - Case sheet generation prompt
   * @returns {Promise<string>} Generated case sheet
   */
  async generateCaseSheet(prompt) {
    try {
      console.log('[AzureOpenAI] Starting case sheet generation');
      console.log('[AzureOpenAI] Using deployment:', this.deployment);
      
      // Make the API call
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a medical professional generating structured case sheets. Always maintain professional medical documentation standards."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 3000, // More tokens for comprehensive case sheet
        temperature: 0.3, // Lower temperature for consistency
        top_p: 1.0,
        model: this.deployment
      });

      const caseSheet = response.choices[0].message.content.trim();
      
      console.log('[AzureOpenAI] Case sheet generation completed successfully');
      console.log('[AzureOpenAI] Case sheet length:', caseSheet.length);
      
      return caseSheet;
      
    } catch (error) {
      console.error('[AzureOpenAI] Case sheet generation failed:', error.message);
      console.error('[AzureOpenAI] Full error:', error);
      throw new Error('Failed to generate case sheet: ' + error.message);
    }
  }

  /**
   * Fallback extractive summarization - picks most important sentences
   * @private
   */
  extractiveSummarize(content, maxLength, type) {
    // Split content into sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return '';
    
    // Score sentences based on keywords and position
    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;
      
      // Keywords for different types
      if (type === 'medical') {
        const medicalKeywords = [
          'diagnosis', 'treatment', 'symptoms', 'patient', 'medication',
          'therapy', 'condition', 'disease', 'clinical', 'prescription',
          'recommendation', 'assessment', 'examination', 'diagnostic'
        ];
        
        medicalKeywords.forEach(keyword => {
          if (sentence.toLowerCase().includes(keyword)) {
            score += 2;
          }
        });
      }
      
      // Position scoring - first and last sentences are often important
      if (index === 0 || index === sentences.length - 1) {
        score += 1;
      }
      
      // Length scoring - prefer medium length sentences
      const length = sentence.trim().length;
      if (length > 20 && length < 150) {
        score += 1;
      }
      
      return { sentence: sentence.trim(), score, index };
    });
    
    // Sort by score and select top sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    let currentLength = 0;
    
    for (const item of scoredSentences) {
      if (currentLength + item.sentence.length <= maxLength * 5) { // Rough word to char conversion
        summary += (summary ? '. ' : '') + item.sentence;
        currentLength += item.sentence.length;
      } else {
        break;
      }
    }
    
    // Ensure it ends with proper punctuation
    if (summary && !summary.endsWith('.')) {
      summary += '.';
    }
    
    return summary;
  }
}

// Create and export singleton instance
const azureOpenAISummarizer = new AzureOpenAISummarizer();
export default azureOpenAISummarizer;
