/**
 * Fully Dynamic Context Analyzer
 * Azure OpenAI reads all messages and determines everything dynamically
 */

import AIService from './aiService.js';

class DynamicContextAnalyzer {
  constructor() {
    this.aiService = new AIService();
    this.cache = new Map();
  }

  /**
   * Analyze entire conversation and return complete context
   */
  async analyzeConversation(conversationHistory, currentMessage) {
    const cacheKey = this.generateCacheKey(conversationHistory, currentMessage);
    
    // Check cache (2 minute cache for fresh context)
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 120000) {
        console.log('[DynamicAnalyzer] Using cached analysis');
        return cached.context;
      }
    }

    try {
      // Format entire conversation for AI analysis
      const conversationText = this.formatFullConversation(conversationHistory, currentMessage);
      
      // Use Azure OpenAI to analyze everything
      const analysisPrompt = `You are a medical conversation analyzer. Read this entire conversation and provide a comprehensive analysis.

CONVERSATION:
${conversationText}

Provide a JSON response with:
{
  "specialty": "primary medical specialty (e.g., hepatology, cardiology, oncology)",
  "condition": "patient's primary condition or complaint",
  "symptoms": ["list of current symptoms"],
  "findings": ["key test results or physical findings"],
  "phase": "current consultation phase (initial/assessment/diagnosis/treatment/followup)",
  "urgency": "urgency level (normal/urgent/emergency)",
  "summary": "brief summary of patient status",
  "nextSteps": ["what should be done next"],
  "contextPrompt": "detailed system prompt for the next AI response"
}

Be specific and accurate based on the conversation. Include actual values from tests mentioned.

IMPORTANT: Create a context prompt that:
- Clearly identifies and maintains the detected specialty throughout
- Emphasizes the primary concern based on the conversation
- Ensures context consistency across all responses
- Includes all relevant findings and maintains focus on the detected medical specialty

The context prompt MUST:
1. Clearly state the detected specialty (e.g., "You are a [SPECIALTY] specialist")
2. Emphasize the primary medical concern identified
3. Include all relevant findings from the conversation
4. Maintain consistent focus on the detected specialty throughout the response`;

      console.log('[DynamicAnalyzer] Analyzing conversation with Azure OpenAI...');
      
      const response = await this.aiService.generateResponse(analysisPrompt);
      
      if (!response) {
        throw new Error('Empty response from AI service');
      }
      
      // Parse and validate the response
      const analysis = this.parseAnalysisResponse(response);
      
      // Cache the result
      this.cache.set(cacheKey, {
        context: analysis,
        timestamp: Date.now()
      });
      
      console.log('[DynamicAnalyzer] Dynamic analysis complete');
      console.log('- Specialty:', analysis?.specialty || 'general');
      console.log('- Condition:', analysis?.condition || 'being evaluated');
      console.log('- Phase:', analysis?.phase || 'initial');
      
      return analysis;
      
    } catch (error) {
      console.error('[DynamicAnalyzer] Analysis failed:', error);
      console.error('[DynamicAnalyzer] Error details:', error.stack);
      return this.getEmergencyFallback();
    }
  }

  /**
   * Format full conversation for AI analysis
   */
  formatFullConversation(history, currentMessage) {
    let formatted = '';
    
    // Add conversation history
    if (history && history.length > 0) {
      history.forEach((msg, index) => {
        const role = msg.role === 'user' ? 'Doctor/Patient' : 'AI Assistant';
        formatted += `${index + 1}. ${role}: ${msg.content}\n`;
      });
    }
    
    // Add current message
    formatted += `\nLatest message: ${currentMessage}`;
    
    return formatted;
  }

  /**
   * Parse and clean the AI analysis response
   */
  parseAnalysisResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Safety check for parsed object
        if (!parsed || typeof parsed !== 'object') {
          console.error('[DynamicAnalyzer] Invalid parsed object:', parsed);
          return this.getEmergencyFallback();
        }
        
        // Ensure required fields with fallbacks
        return {
          specialty: parsed.specialty || 'general',
          condition: parsed.condition || 'being evaluated',
          symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
          findings: Array.isArray(parsed.findings) ? parsed.findings : [],
          phase: parsed.phase || 'initial',
          urgency: parsed.urgency || 'normal',
          summary: parsed.summary || 'Medical consultation in progress',
          nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
          contextPrompt: parsed.contextPrompt || this.generateBasicPrompt(parsed)
        };
      }
    } catch (error) {
      console.error('[DynamicAnalyzer] Failed to parse response:', error);
      console.error('[DynamicAnalyzer] Response was:', response.substring(0, 200));
    }
    
    return this.getEmergencyFallback();
  }

  /**
   * Generate basic prompt if none provided
   */
  generateBasicPrompt(analysis) {
    // Safety check for analysis
    if (!analysis || typeof analysis !== 'object') {
      analysis = {
        specialty: 'general',
        condition: 'being evaluated',
        symptoms: [],
        findings: [],
        phase: 'initial'
      };
    }
    
    let prompt = `You are a ${analysis?.specialty || 'general'} specialist assisting with a patient who has ${analysis?.condition || 'being evaluated'}. 

Current consultation phase: ${analysis?.phase || 'initial'}
Urgency level: ${analysis?.urgency || 'normal'}

Current symptoms: ${Array.isArray(analysis?.symptoms) ? analysis?.symptoms.join(', ') : 'none specified'}
Key findings: ${Array.isArray(analysis?.findings) ? analysis?.findings.join(', ') : 'none specified'}
Provide appropriate medical guidance based on this context.`;

    // Add emphasis for maintaining specialty context
    const specialty = analysis?.specialty || 'general';
    const condition = analysis?.condition || 'being evaluated';
    
    prompt += `\n\nIMPORTANT: Maintain ${specialty} context throughout the conversation.
Focus on:
- ${specialty}-specific evaluation and management
- Primary concern: ${condition}
- Relevant findings and follow-up
- Do not deviate from ${specialty} focus`;

    return prompt;
  }

  /**
   * Generate cache key
   */
  generateCacheKey(history, message) {
    const recentMessages = history.slice(-3).map(h => h.content).join(' ');
    const key = (recentMessages + ' ' + message).substring(0, 200);
    return this.simpleHash(key);
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Emergency fallback if analysis fails
   */
  getEmergencyFallback() {
    return {
      specialty: 'general',
      condition: 'medical evaluation',
      symptoms: [],
      findings: [],
      phase: 'initial',
      urgency: 'normal',
      summary: 'Medical consultation in progress',
      nextSteps: ['Continue evaluation'],
      contextPrompt: 'You are a medical AI assistant. Provide helpful medical information based on the conversation.'
    };
  }

  /**
   * Get context for frontend display
   */
  getFrontendContext(analysis) {
    return {
      specialty: analysis?.specialty || 'general',
      condition: analysis?.condition || 'being evaluated',
      phase: analysis?.phase || 'initial',
      urgency: analysis?.urgency || 'normal',
      summary: analysis.summary,
      symptoms: analysis.symptoms.slice(0, 3), // Show top 3 symptoms
      findings: analysis.findings.slice(0, 3), // Show top 3 findings
      nextSteps: analysis.nextSteps.slice(0, 2) // Show next 2 steps
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[DynamicAnalyzer] Cache cleared');
  }
}

export default DynamicContextAnalyzer;
