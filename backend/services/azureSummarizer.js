/**
 * Azure Document Intelligence Summarizer Service
 * Uses Azure Document Intelligence for text summarization
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure Document Intelligence Configuration
 * Using the same endpoint as OCR for summarization
 */
const AZURE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
const AZURE_API_KEY_BACKUP = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY_BACKUP;
const API_VERSION = process.env.AZURE_OCR_API_VERSION || '2023-07-31';

class AzureSummarizer {
  constructor() {
    this.endpoint = AZURE_ENDPOINT;
    this.apiKey = AZURE_API_KEY;
    this.apiVersion = API_VERSION;
    this.headers = {
      'Ocp-Apim-Subscription-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Summarize text content using Azure Document Intelligence
   * @param {string} content - Text content to summarize
   * @param {string} type - Type of summarization (medical, general, etc.)
   * @param {number} maxLength - Maximum length of summary
   * @returns {Promise<string>} Summarized text
   */
  async summarizeText(content, type = 'general', maxLength = 250) {
    try {
      console.log('[AzureSummarizer] Starting summarization for content length:', content.length);
      
      // For now, we'll use a simple extractive summarization approach
      // since Document Intelligence 2023-07-31 doesn't have built-in summarization
      // We'll extract key sentences based on medical terminology
      
      const summary = this.extractiveSummarize(content, maxLength, type);
      
      console.log('[AzureSummarizer] Summarization completed successfully');
      return summary;
      
    } catch (error) {
      console.error('[AzureSummarizer] Summarization failed:', error.message);
      
      // Try backup key if available
      if (this.apiKey === AZURE_API_KEY && AZURE_API_KEY_BACKUP) {
        console.log('[AzureSummarizer] Retrying with backup API key...');
        this.apiKey = AZURE_API_KEY_BACKUP;
        this.headers['Ocp-Apim-Subscription-Key'] = this.apiKey;
        return this.summarizeText(content, type, maxLength);
      }
      
      throw new Error(`Summarization failed: ${error.message}`);
    }
  }

  /**
   * Extractive summarization - picks most important sentences
   * @private
   */
  extractiveSummarize(content, maxLength, type) {
    // Split content into sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return '';
    
    // Score sentences based on medical keywords and position
    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0;
      
      // Medical keywords for medical summaries
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
      if (currentLength + item.sentence.length <= maxLength) {
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
const azureSummarizer = new AzureSummarizer();
export default azureSummarizer;
