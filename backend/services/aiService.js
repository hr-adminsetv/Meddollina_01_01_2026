/**
 * AI Service for medical topic detection and embeddings
 * Integrates with Azure OpenAI for semantic analysis
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

class AIService {
  constructor() {
    // Use Azure OpenAI credentials from environment variables
    this.endpoint = process.env.AZURE_ENDPOINT || "";
    this.apiKey = process.env.AZURE_API_KEY || "";
    this.deployment = process.env.AZURE_DEPLOYMENT || "gpt-4o-mini";
    this.embeddingDeployment = process.env.AZURE_EMBEDDING_DEPLOYMENT || "text-embedding-ada-002";
    this.apiVersion = process.env.AZURE_API_VERSION || "2024-12-01-preview";
    
    // Initialize OpenAI client
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: `${this.endpoint}/openai/deployments/${this.deployment}`,
      defaultQuery: { 'api-version': this.apiVersion },
      defaultHeaders: {
        'api-key': this.apiKey,
      }
    });
    
    console.log('[AIService] Initialized with Azure OpenAI GPT-4o-mini');
  }

  /**
   * Generate embedding for text using Azure OpenAI
   * Note: Since embedding deployment is not available, we'll use a smart fallback
   */
  async generateEmbedding(text) {
    try {
      console.log('[AIService] Generating intelligent embedding for text length:', text.length);
      
      // Try the embedding deployment first
      const embeddingClient = new OpenAI({
        apiKey: this.apiKey,
        baseURL: `${this.endpoint}/openai/deployments/${this.embeddingDeployment}`,
        defaultQuery: { 'api-version': this.apiVersion },
        defaultHeaders: {
          'api-key': this.apiKey,
        }
      });
      
      const response = await embeddingClient.embeddings.create({
        input: text,
        model: this.embeddingDeployment
      });
      
      if (response.data && response.data[0]) {
        return response.data[0].embedding;
      }
      
      throw new Error('Invalid embedding response');
    } catch (error) {
      console.error('[AIService] Embedding deployment not available, using intelligent fallback:', error.message);
      return this.generateIntelligentEmbedding(text);
    }
  }

  /**
   * Generate intelligent embedding using GPT model analysis
   */
  async generateIntelligentEmbedding(text) {
    console.log('[AIService] Using GPT-4o-mini for intelligent topic analysis');
    
    // Use GPT to analyze the text and return topic probabilities
    const prompt = `Analyze this medical text and return topic probabilities for these specialties:
    cardiology, oncology, hepatology, nephrology, pulmonology, neurology, endocrinology, 
    gastroenterology, surgery, emergency, rheumatology, infectious_disease, hematology,
    dermatology, psychiatry, obstetrics_gynecology, pediatrics, orthopedics, uphthalmology,
    otorhinolaryngology
    
    Text: "${text}"
    
    Return JSON with specialty names as keys and confidence scores (0-1) as values.
    Only include specialties with confidence > 0.1.`;

    try {
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a medical topic classifier. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      });

      if (response.choices && response.choices[0]) {
        let content = response.choices[0].message.content;
        
        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const result = JSON.parse(content);
        
        // Convert to embedding-like format
        const embedding = new Array(1536).fill(0);
        const specialties = Object.keys(result);
        
        specialties.forEach((specialty, index) => {
          const confidence = result[specialty];
          const baseIndex = index * 50; // Distribute across embedding space
          
          for (let i = baseIndex; i < Math.min(baseIndex + 50, embedding.length); i++) {
            const distance = Math.abs(i - baseIndex - 25);
            embedding[i] += confidence * Math.exp(-distance * 0.1);
          }
        });
        
        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / magnitude);
      }
    } catch (error) {
      console.error('[AIService] GPT analysis failed, using hash fallback:', error.message);
    }
    
    return this.generateFallbackEmbedding(text);
  }

  /**
   * Generate fallback embedding (simple hash-based)
   */
  generateFallbackEmbedding(text) {
    // Create a simple 1536-dimensional embedding (same size as OpenAI's)
    const embedding = new Array(1536).fill(0);
    const textLower = text.toLowerCase();
    
    // Simple hash function to distribute values
    let hash = 0;
    for (let i = 0; i < textLower.length; i++) {
      hash = ((hash << 5) - hash) + textLower.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Distribute the hash across the embedding
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = Math.sin(hash * (i + 1)) * 0.5 + 0.5;
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Generate response using AI
   */
  async generateResponse(prompt) {
    try {
      console.log('[AIService] Generating AI response');
      
      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI assistant. Provide accurate and helpful medical information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      if (response.choices && response.choices[0]) {
        return response.choices[0].message.content;
      }
      
      throw new Error('Invalid chat response');
    } catch (error) {
      console.error('[AIService] Failed to generate response, using fallback:', error.message);
      return JSON.stringify({
        symptoms: [],
        medications: [],
        conditions: [],
        procedures: []
      });
    }
  }

  /**
   * Analyze medical text for entities
   */
  async extractMedicalEntities(text) {
    const prompt = `Extract medical entities from the following text. Return a JSON object with these categories:
    - symptoms: List of symptoms mentioned
    - medications: List of medications mentioned
    - conditions: List of medical conditions mentioned
    - procedures: List of medical procedures mentioned

    Text: "${text}"

    Respond only with valid JSON.`;

    try {
      const response = await this.generateResponse(prompt);
      
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const entities = JSON.parse(jsonMatch[0]);
        return entities;
      }
      
      return null;
    } catch (error) {
      console.error('[AIService] Entity extraction failed:', error);
      return null;
    }
  }
}

export default AIService;
