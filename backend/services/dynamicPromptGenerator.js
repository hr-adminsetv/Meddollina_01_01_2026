/**
 * Dynamic Prompt Generator using Azure OpenAI
 * Reads conversation history and generates contextual prompts
 */

import AIService from './aiService.js';

class DynamicPromptGenerator {
  constructor() {
    this.aiService = new AIService();
    this.promptCache = new Map();
  }

  /**
   * Generate dynamic system prompt based on conversation history
   */
  async generateDynamicPrompt(conversationHistory, currentMessage, detectedSpecialty) {
    const cacheKey = this.generateCacheKey(conversationHistory, detectedSpecialty);
    
    // Check cache first (5 minute cache)
    if (this.promptCache.has(cacheKey)) {
      const cached = this.promptCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) {
        console.log('[DynamicPrompt] Using cached prompt');
        return cached.prompt;
      }
    }

    try {
      // Format conversation history for AI analysis
      const conversationText = this.formatConversationForAI(conversationHistory);
      
      // Generate contextual prompt using Azure OpenAI
      const analysisPrompt = `You are a medical AI prompt generator. Analyze this conversation and create a contextual system prompt.

CONVERSATION HISTORY:
${conversationText}

CURRENT MESSAGE: "${currentMessage}"
DETECTED SPECIALTY: ${detectedSpecialty || 'general medicine'}

Generate a system prompt that:
1. Identifies the patient's primary condition/complaint
2. Lists key symptoms and findings mentioned
3. Notes any test results or diagnostic information
4. Indicates the current phase of evaluation
5. Provides specific context for the next AI response

Return ONLY the system prompt, nothing else. The prompt should be:
- Concise but comprehensive
- Focused on medical context
- Helpful for guiding the next response
- Include personalizing information`;

      console.log('[DynamicPrompt] Generating contextual prompt with Azure OpenAI...');
      
      const dynamicPrompt = await this.aiService.generateResponse(analysisPrompt);
      
      // Clean up the response
      const cleanedPrompt = this.cleanPromptResponse(dynamicPrompt);
      
      // Add specialty-specific guidance
      const finalPrompt = this.addSpecialtyGuidance(cleanedPrompt, detectedSpecialty);
      
      // Cache the result
      this.promptCache.set(cacheKey, {
        prompt: finalPrompt,
        timestamp: Date.now()
      });
      
      console.log('[DynamicPrompt] Generated dynamic prompt (length:', finalPrompt.length, ')');
      return finalPrompt;
      
    } catch (error) {
      console.error('[DynamicPrompt] Failed to generate dynamic prompt:', error);
      return this.getFallbackPrompt(detectedSpecialty);
    }
  }

  /**
   * Format conversation history for AI analysis
   */
  formatConversationForAI(history) {
    if (!history || history.length === 0) {
      return "No previous messages.";
    }
    
    return history.map((msg, index) => {
      const role = msg.role === 'user' ? 'Patient/Doctor' : 'AI Assistant';
      const content = msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : '');
      return `${index + 1}. ${role}: ${content}`;
    }).join('\n');
  }

  /**
   * Clean up the AI response to extract just the prompt
   */
  cleanPromptResponse(response) {
    // Remove any markdown code blocks
    let cleaned = response.replace(/```[\s\S]*?```/g, '');
    
    // Remove common prefixes
    cleaned = cleaned.replace(/^(System Prompt:|Here is the system prompt:|Generated prompt:)/i, '').trim();
    
    // Extract the main prompt content
    const lines = cleaned.split('\n');
    const promptLines = [];
    let inPrompt = false;
    
    for (const line of lines) {
      if (line.includes('You are') || line.includes('As a') || inPrompt) {
        inPrompt = true;
        promptLines.push(line);
      }
    }
    
    return promptLines.length > 0 ? promptLines.join('\n') : cleaned;
  }

  /**
   * Add specialty-specific guidance to the dynamic prompt
   */
  addSpecialtyGuidance(prompt, specialty) {
    if (!specialty || specialty === 'general') {
      return prompt;
    }
    
    const specialtyGuidance = {
      'cardiology': '\n\nSPECIALTY FOCUS: Cardiovascular medicine - prioritize cardiac risk assessment, ECG interpretation, chest pain evaluation, and heart failure management.',
      'hepatology': '\n\nSPECIALTY FOCUS: Liver diseases - prioritize liver function tests, jaundice evaluation, hepatitis management, and cirrhosis assessment.',
      'nephrology': '\n\nSPECIALTY FOCUS: Kidney diseases - prioritize renal function, electrolyte management, dialysis considerations, and hypertension.',
      'emergency': '\n\nSPECIALTY FOCUS: Emergency medicine - prioritize ABCDE assessment, stabilize vital signs, identify life-threatening conditions, and urgent interventions.',
      'oncology': '\n\nSPECIALTY FOCUS: Cancer care - prioritize staging, treatment protocols, symptom management, and multidisciplinary approach.',
      'pulmonology': '\n\nSPECIALTY FOCUS: Respiratory medicine - prioritize pulmonary function, oxygenation, asthma/COPD management, and sleep disorders.',
      'neurology': '\n\nSPECIALTY FOCUS: Neurological disorders - prioritize neurological exam, imaging interpretation, seizure management, and stroke care.',
      'endocrinology': '\n\nSPECIALTY FOCUS: Endocrine disorders - prioritize hormonal balance, diabetes management, thyroid disorders, and metabolic conditions.',
      'gastroenterology': '\n\nSPECIALTY FOCUS: Digestive health - prioritize GI evaluation, endoscopy considerations, nutrition, and inflammatory bowel disease.',
      'surgery': '\n\nSPECIALTY FOCUS: Surgical care - prioritize operative indications, pre-operative assessment, surgical risks, and post-operative care.'
    };
    
    const guidance = specialtyGuidance[specialty] || '';
    return prompt + guidance;
  }

  /**
   * Generate cache key for conversation
   */
  generateCacheKey(history, specialty) {
    const lastMessage = history.length > 0 ? history[history.length - 1].content : '';
    const hash = this.simpleHash(lastMessage + specialty);
    return hash;
  }

  /**
   * Simple hash function for cache key
   */
  simpleHash(str) {
    let hash = 21;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Fallback prompt if AI generation fails
   */
  getFallbackPrompt(specialty) {
    return `You are a medical AI assistant specializing in ${specialty || 'general medicine'}. Provide accurate, helpful medical information based on the conversation context. Consider the patient's symptoms, history, and current findings to give appropriate guidance.`;
  }

  /**
   * Clear the prompt cache
   */
  clearCache() {
    this.promptCache.clear();
    console.log('[DynamicPrompt] Cache cleared');
  }
}

export default DynamicPromptGenerator;
