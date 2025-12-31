/**
 * Enhanced Context Manager with Dynamic Suggestions
 * Extends the base ContextManager with intelligent features
 */

import contextManager from './contextManager.js';
import PromptTemplates from './promptTemplates.js';
import AIService from './aiService.js';

// Since ContextManager is exported as a singleton, we'll enhance it with new methods
class EnhancedContextManager {
  constructor() {
    this.base = contextManager;
    this.aiService = new AIService();
    this.suggestionCache = new Map();
  }

  /**
   * Get context from base manager
   */
  getContext(conversationId) {
    return this.base.getContext(conversationId);
  }

  /**
   * Update context using base manager
   */
  async updateContext(conversationId, message, role) {
    return await this.base.updateContext(conversationId, message, role);
  }

  /**
   * Get intelligent suggestions based on current context
   */
  async getSuggestions(conversationId) {
    const context = this.getContext(conversationId);
    const cacheKey = `${conversationId}-${context.currentTopic}-${context.conversationPhase}`;
    
    // Check cache first
    if (this.suggestionCache.has(cacheKey)) {
      const cached = this.suggestionCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes
        return cached.suggestions;
      }
    }

    const suggestions = {
      followUpQuestions: [],
      possibleTopics: [],
      recommendedTests: [],
      redFlags: []
    };

    try {
      // Get specialty-specific follow-up questions
      suggestions.followUpQuestions = PromptTemplates.generateFollowUpQuestions(
        context?.specialty || 'general',
        context
      );

      // Generate AI-powered suggestions
      if (context.specialty && context.medicalContext?.symptoms?.length > 0) {
        const aiSuggestions = await this.generateAISuggestions(context);
        suggestions.possibleTopics = aiSuggestions.topics || [];
        suggestions.recommendedTests = aiSuggestions.tests || [];
        suggestions.redFlags = aiSuggestions.redFlags || [];
      }

      // Cache the suggestions
      this.suggestionCache.set(cacheKey, {
        suggestions,
        timestamp: Date.now()
      });

      return suggestions;
    } catch (error) {
      console.error('[EnhancedContextManager] Error generating suggestions:', error);
      return {
        followUpQuestions: suggestions.followUpQuestions,
        possibleTopics: [],
        recommendedTests: [],
        redFlags: []
      };
    }
  }

  /**
   * Generate AI-powered suggestions based on context
   */
  async generateAISuggestions(context) {
    const prompt = `Based on the current medical context, provide suggestions:

Current Context:
- Specialty: ${context?.specialty || 'general'}
- Symptoms: ${context?.medicalContext?.symptoms?.join(', ') || 'None'}
- Phase: ${context?.conversationPhase || 'initial'}

Return JSON with:
{
  "topics": ["related specialty 1", "related specialty 2"],
  "tests": ["recommended test 1", "recommended test 2"],
  "redFlags": ["warning sign 1", "warning sign 2"]
}

Only include items with high relevance.`;

    try {
      const response = await this.aiService.generateResponse(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[EnhancedContextManager] AI suggestions failed:', error);
    }

    return { topics: [], tests: [], redFlags: [] };
  }

  /**
   * Update conversation phase intelligently
   */
  async updateConversationPhase(context, message, role) {
    const currentPhase = context.conversationPhase;
    
    // Phase transition logic
    if (role === 'assistant') {
      // AI responses can trigger phase changes
      if (currentPhase === 'initial' && message.includes('diagnosis')) {
        context.conversationPhase = 'assessment';
      } else if (currentPhase === 'assessment' && message.includes('confirmed')) {
        context.conversationPhase = 'diagnosis';
      } else if (currentPhase === 'diagnosis' && message.includes('treatment')) {
        context.conversationPhase = 'treatment';
      } else if (currentPhase === 'treatment' && message.includes('follow')) {
        context.conversationPhase = 'followup';
      }
    } else if (role === 'user') {
      // User messages can also trigger phase changes
      if (currentPhase === 'treatment' && (message.includes('worse') || message.includes('side effect'))) {
        context.conversationPhase = 'assessment'; // Re-assess needed
      }
    }

    // Update medical context based on phase
    this.updatePhaseSpecificContext(context);
  }

  /**
   * Update context based on conversation phase
   */
  updatePhaseSpecificContext(context) {
    const phase = context.conversationPhase;
    
    switch (phase) {
      case 'assessment':
        context.medicalContext.assessmentStatus = 'gathering information';
        break;
      case 'diagnosis':
        context.medicalContext.assessmentStatus = 'diagnosis confirmed';
        break;
      case 'treatment':
        context.medicalContext.assessmentStatus = 'treatment initiated';
        break;
      case 'followup':
        context.medicalContext.assessmentStatus = 'monitoring progress';
        break;
      default:
        context.medicalContext.assessmentStatus = 'initial evaluation';
    }
  }

  /**
   * Get enhanced prompt for AI with dynamic adjustments
   */
  async getEnhancedPrompt(conversationId, userMessage) {
    const context = this.getContext(conversationId);
    const suggestions = await this.getSuggestions(conversationId);
    
    // Generate base prompt
    const systemPrompt = PromptTemplates.generateSystemPrompt(context);
    
    // Add dynamic suggestions to prompt
    const enhancedPrompt = `${systemPrompt}

RELEVANT FOLLOW-UP QUESTIONS TO CONSIDER:
${suggestions.followUpQuestions.map(q => `- ${q}`).join('\n')}

${suggestions.redFlags.length > 0 ? `
⚠️ RED FLAGS TO MONITOR:
${suggestions.redFlags.map(r => `- ${r}`).join('\n')}
` : ''}

${suggestions.recommendedTests.length > 0 ? `
🔬 RELEVANT DIAGNOSTIC TESTS:
${suggestions.recommendedTests.map(t => `- ${t}`).join('\n')}
` : ''}`;

    return {
      systemPrompt: enhancedPrompt,
      suggestions
    };
  }

  /**
   * Clear suggestion cache
   */
  clearSuggestionCache() {
    this.suggestionCache.clear();
    console.log('[EnhancedContextManager] Suggestion cache cleared');
  }
}

export default EnhancedContextManager;
