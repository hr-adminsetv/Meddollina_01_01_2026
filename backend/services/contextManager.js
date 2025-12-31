/**
 * =============================================================================
 * CONTEXT MANAGER SERVICE
 * =============================================================================
 * 
 * Advanced context management for maintaining conversation coherence
 * and preventing topic drift in medical consultations
 * 
 * @file backend/services/contextManager.js
 */

import MedicalTopicDetector from './medicalTopicDetector.js';
import AIService from './aiService.js';

class ContextManager {
  constructor() {
    this.contexts = new Map(); // conversationId -> context
    
    // Initialize AI-powered topic detector
    this.aiService = new AIService();
    this.topicDetector = new MedicalTopicDetector(this.aiService);
    
    // Topic patterns for validation
    this.topicPatterns = {
      'cardiology': /chest\s+pain|heart|cardiac|troponin|ecg|ekg|mi|angina|arrhythmia|palpitation/i,
      'neurology': /headache|migraine|seizure|stroke|brain|neural|dizziness|numbness|tingling/i,
      'pulmonology': /breath|lung|respiratory|cough|asthma|pneumonia|oxygen|shortness\s+of\s+breath/i,
      'gastroenterology': /stomach|abdominal|digestive|nausea|vomiting|diarrhea|constipation|gi|endoscopy/i,
      'orthopedics': /bone|joint|fracture|arthritis|muscle|sprain|strain|orthopedic|limb/i,
      'pediatrics': /child|infant|baby|pediatric|newborn|toddler|teenager/i,
      'general': /general|check\s+up|routine|overall|comprehensive/i
    };
    
    this.defaultContext = {
      // Topic tracking
      currentTopic: null,
      subTopic: null,
      topicHistory: [],
      lastContextSwitch: null,
      
      // Medical context
      medicalContext: {
        patientInfo: null,
        currentCondition: null,
        treatmentStage: null,
        medications: [],
        symptoms: [],
        labResults: [],
        imaging: [],
        diagnoses: []
      },
      
      // Context metrics
      contextScore: 1.0,
      messageCount: 0,
      lastUpdated: new Date(),
      
      // Conversation state
      conversationPhase: 'initial', // initial, assessment, diagnosis, treatment, followup
      urgency: 'normal', // normal, urgent, emergency
      specialty: null // primary, cardiology, oncology, etc.
    };
    
    // Entity extraction now handled by AI
    this.entityPatterns = {
      // Keep minimal patterns for emergency fallback
      emergency: /(emergency|urgent|critical|icu|life threatening|severe|acute)/gi
    };
  }

  /**
   * Get or create context for a conversation
   */
  getContext(conversationId) {
    if (!this.contexts.has(conversationId)) {
      this.contexts.set(conversationId, { ...this.defaultContext });
    }
    return this.contexts.get(conversationId);
  }

  /**
   * Update context with new message
   */
  async updateContext(conversationId, message, role = 'user') {
    try {
      const context = this.getContext(conversationId);
      
      // Extract topic and medical entities from message using AI
      const analysis = await this.analyzeMessage(message);
      
      // Update topic if detected
      if (analysis.topic && analysis.topic !== context.currentTopic) {
        // Add to history
        if (context.currentTopic) {
          context.topicHistory.push({
            topic: context.currentTopic,
            subTopic: context.subTopic,
            timestamp: context.lastUpdated,
            messageCount: context.messageCount
          });
        }
        
        context.currentTopic = analysis.topic;
        context.subTopic = analysis.subTopic;
        context.lastContextSwitch = new Date();
        
        // Update specialty based on topic
        context.specialty = this.inferSpecialty(analysis?.topic || 'general');
      }
      
      // Update medical context
      if (analysis.entities) {
        this.updateMedicalContext(context, analysis.entities);
      }
      
      // Update urgency if higher
      if (this.getUrgencyLevel(analysis?.urgency || 'normal') > this.getUrgencyLevel(context?.urgency || 'normal')) {
        context.urgency = analysis?.urgency || 'normal';
      }
      
      // Update conversation phase
      this.updateConversationPhase(context, message, role);
      
      context.messageCount++;
      context.lastUpdated = new Date();
      
      // Calculate context score
      context.contextScore = this.calculateContextScore(context);
      
      return context;
    } catch (error) {
      console.error('[ContextManager] Error updating context:', error);
      return this.defaultContext;
    }
  }

  /**
   * Analyze message to extract topic and entities using AI
   */
  async analyzeMessage(message) {
    const analysis = {
      topic: null,
      subTopic: null,
      entities: {},
      urgency: 'normal',
      confidence: {}
    };
    
    try {
      // Use AI-powered topic detection
      const topics = await this.topicDetector.detectTopics(message);
      
      if (topics.primary) {
        analysis.topic = topics.primary;
        analysis.confidence[topics.primary] = topics.confidence[topics.primary];
      }
      
      // Set secondary topics as subtopics
      if (topics.secondary && topics.secondary.length > 0) {
        analysis.subTopic = topics.secondary[0];
      }
      
      // Extract entities from AI detection
      if (topics.entities) {
        analysis.entities = topics.entities;
      }
      
      // Detect urgency from emergency patterns or AI
      if (this.entityPatterns.emergency.test(message)) {
        analysis.urgency = 'emergency';
      } else if (/severe|acute|worsening|sudden|immediate|can't breathe|chest pain|difficulty breathing/i.test(message)) {
        analysis.urgency = 'urgent';
      }
      
      return analysis;
    } catch (error) {
      console.error('[ContextManager] Error in AI analysis, using fallback:', error);
      
      // Fallback to simple keyword detection
      const messageLower = message.toLowerCase();
      
      // Simple emergency detection
      if (this.entityPatterns.emergency.test(message)) {
        analysis.urgency = 'emergency';
        analysis.topic = 'emergency';
      }
      
      // Basic symptom extraction
      const symptoms = message.match(/pain|fever|cough|nausea|vomiting|headache|dizziness|fatigue|weakness|shortness of breath|chest pain|abdominal pain|yellow eyes|yellow skin|jaundice/gi);
      if (symptoms) {
        analysis.entities.symptoms = [...new Set(symptoms.map(s => s.toLowerCase()))];
      }
      
      return analysis;
    }
  }

  /**
   * Update medical context with extracted entities
   */
  updateMedicalContext(context, entities) {
    const medical = context.medicalContext;
    
    // Update symptoms
    if (entities.symptoms) {
      medical.symptoms = [...new Set([...medical.symptoms, ...entities.symptoms])];
    }
    
    // Update medications
    if (entities.medications) {
      entities.medications.forEach(match => {
        const med = match.split(/\s+/).slice(-2).join(' ').trim();
        if (med && !medical.medications.includes(med)) {
          medical.medications.push(med);
        }
      });
    }
    
    // Update lab results
    if (entities.labValues) {
      medical.labResults = [...new Set([...medical.labResults, ...entities.labValues])];
    }
    
    // Update patient info
    if (entities.age) {
      const age = entities.age[0].match(/\d+/)[0];
      medical.patientInfo = { ...medical.patientInfo, age };
    }
    
    if (entities.gender) {
      const gender = entities.gender[0].toLowerCase().includes('female') ? 'female' : 'male';
      medical.patientInfo = { ...medical.patientInfo, gender };
    }
    
    // Infer condition from symptoms and topic
    if (!medical.currentCondition && context.currentTopic) {
      medical.currentCondition = this.inferCondition(context.currentTopic, entities.symptoms);
    }
  }

  /**
   * Infer medical specialty from topic
   */
  inferSpecialty(topic) {
    const specialtyMap = {
      'cardiology': 'cardiology',
      'oncology': 'oncology',
      'gastroenterology': 'gastroenterology',
      'hepatology': 'hepatology',
      'nephrology': 'nephrology',
      'pulmonology': 'pulmonology',
      'neurology': 'neurology',
      'endocrinology': 'endocrinology',
      'surgery': 'surgery',
      'emergency': 'emergency'
    };
    
    return specialtyMap[topic] || 'primary';
  }

  /**
   * Infer condition from topic and symptoms
   */
  inferCondition(topic, symptoms) {
    const conditions = {
      'hepatology': 'liver disorder',
      'cardiology': 'cardiac condition',
      'oncology': 'suspected malignancy',
      'nephrology': 'kidney disorder',
      'pulmonology': 'respiratory condition',
      'gastroenterology': 'gi disorder'
    };
    
    return conditions[topic] || 'medical condition';
  }

  /**
   * Update conversation phase based on content
   */
  updateConversationPhase(context, message, role) {
    const messageLower = message.toLowerCase();
    
    // Phase transitions
    if (context.conversationPhase === 'initial') {
      if (messageLower.includes('history') || messageLower.includes('symptom')) {
        context.conversationPhase = 'assessment';
      }
    } else if (context.conversationPhase === 'assessment') {
      if (messageLower.includes('diagnosis') || messageLower.includes('result')) {
        context.conversationPhase = 'diagnosis';
      }
    } else if (context.conversationPhase === 'diagnosis') {
      if (messageLower.includes('treatment') || messageLower.includes('therapy')) {
        context.conversationPhase = 'treatment';
      }
    } else if (context.conversationPhase === 'treatment') {
      if (messageLower.includes('follow up') || messageLower.includes('check')) {
        context.conversationPhase = 'followup';
      }
    }
  }

  /**
   * Calculate context coherence score
   */
  calculateContextScore(context) {
    let score = 1.0;
    
    // Penalize frequent topic switches
    const recentSwitches = context.topicHistory.slice(-5);
    if (recentSwitches.length > 0) {
      const avgMessagesPerTopic = context.messageCount / (recentSwitches.length + 1);
      if (avgMessagesPerTopic < 3) {
        score -= 0.2;
      }
    }
    
    // Boost for consistent medical context
    if (context.medicalContext.currentCondition) {
      score += 0.1;
    }
    
    // Boost for appropriate conversation phase
    if (context.conversationPhase !== 'initial' && context.messageCount > 5) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Store dynamic context from Azure OpenAI
   */
  setDynamicContext(conversationId, dynamicContext) {
    const context = this.getContext(conversationId);
    context.dynamicContext = dynamicContext;
    
    // Safety checks before accessing properties
    if (dynamicContext && typeof dynamicContext === 'object') {
      context.specialty = dynamicContext.specialty || 'primary';
      context.currentCondition = dynamicContext.condition || 'being evaluated';
      context.conversationPhase = dynamicContext.phase || 'initial';
      context.urgency = dynamicContext.urgency || 'normal';
    }
    context.lastUpdated = new Date();
  }

  /**
   * Get dynamic context if available
   */
  getDynamicContext(conversationId) {
    const context = this.getContext(conversationId);
    return context.dynamicContext || null;
  }

  /**
   * Generate context summary for prompts
   */
  generateContextSummary(conversationId) {
    try {
      const context = this.getContext(conversationId);
      
      return {
        // Topic information
        currentTopic: context.currentTopic || 'general medical consultation',
        subTopic: context.subTopic,
        topicHistory: context.topicHistory.slice(-3),
        
        // Medical context
        medicalContext: context.medicalContext,
        currentCondition: context.medicalContext.currentCondition,
        
        // Conversation state
        conversationPhase: context?.conversationPhase || 'initial',
        urgency: context?.urgency || 'normal',
        specialty: context?.specialty || 'general',
        
        // Metrics
        contextScore: context.contextScore,
        messageCount: context.messageCount,
        lastUpdated: context.lastUpdated
      };
    } catch (error) {
      console.error('[ContextManager] Error generating context summary:', error);
      return {
        currentTopic: 'general medical consultation',
        subTopic: null,
        topicHistory: [],
        medicalContext: this.defaultContext.medicalContext,
        currentCondition: null,
        conversationPhase: 'initial',
        urgency: 'normal',
        specialty: 'primary',
        contextScore: 1.0,
        messageCount: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Validate if response maintains context
   */
  validateContextResponse(conversationId, response) {
    const context = this.getContext(conversationId);
    
    // If no current topic, any response is valid
    if (!context.currentTopic) {
      return { valid: true, score: 1.0 };
    }
    
    const responseLower = response.toLowerCase();
    const topicKeywords = this.topicPatterns[context.currentTopic];
    
    // Check if response contains topic-relevant content
    const hasTopicRelevance = topicKeywords ? topicKeywords.test(responseLower) : true;
    
    // Check for topic drift indicators
    const driftIndicators = [
      'let me help you with',
      'i notice you asked about',
      'back to your original',
      'regarding your question about'
    ];
    
    const hasDriftIndicators = driftIndicators.some(indicator => 
      responseLower.includes(indicator)
    );
    
    const score = hasTopicRelevance ? 1.0 : (hasDriftIndicators ? 0.7 : 0.5);
    
    return {
      valid: score > 0.6,
      score,
      hasTopicRelevance,
      hasDriftIndicators
    };
  }

  /**
   * Get context for frontend display
   */
  getFrontendContext(conversationId) {
    const context = this.getContext(conversationId);
    
    return {
      topic: context.currentTopic || 'Medical Consultation',
      subTopic: context.subTopic,
      condition: context.medicalContext.currentCondition || 'Assessment in progress',
      stage: context.conversationPhase,
      score: Math.round(context.contextScore * 100),
      messageCount: context.messageCount,
      urgency: context.urgency,
      specialty: context.specialty
    };
  }

  /**
   * Clear context for conversation
   */
  clearContext(conversationId) {
    this.contexts.delete(conversationId);
  }

  /**
   * Get all active contexts
   */
  getAllContexts() {
    return Array.from(this.contexts.entries()).map(([id, context]) => ({
      conversationId: id,
      ...context
    }));
  }

  /**
   * Get urgency level as numeric value
   */
  getUrgencyLevel(urgency) {
    const levels = {
      'normal': 0,
      'urgent': 1,
      'emergency': 2
    };
    return levels[urgency] || 0;
  }

  /**
   * Clean up old contexts
   */
  cleanup() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [id, context] of this.contexts.entries()) {
      if (context.lastUpdated < oneHourAgo) {
        this.contexts.delete(id);
      }
    }
  }
}

// Export singleton instance
export default new ContextManager();
