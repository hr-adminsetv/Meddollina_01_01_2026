/**
 * =============================================================================
 * CONTEXT-AWARE PROMPT TEMPLATES
 * =============================================================================
 * 
 * Advanced prompt templates designed to maintain context and prevent topic drift
 * in medical consultations using SETV AI
 * 
 * @file backend/services/promptTemplates.js
 */

import SpecialtyPrompts from './specialtyPrompts.js';

class PromptTemplates {
  /**
   * Generate system prompt with full context and specialty-specific guidance
   */
  static generateSystemPrompt(context) {
    try {
      // Get specialty-specific prompt if available
      const specialtyPrompt = SpecialtyPrompts.getSpecialtyPrompt(context?.specialty || 'general', context);
      
      // Get phase-specific instructions
      const phaseInstructions = SpecialtyPrompts.getPhaseInstructions(context.conversationPhase);
      
      const basePrompt = `${specialtyPrompt.system}

CURRENT CONSULTATION CONTEXT:
${this.formatContextForPrompt(context)}

PATIENT'S CURRENT CONDITION: ${context.medicalContext?.currentCondition || 'Being evaluated'}
PRESENTING SYMPTOMS: ${context.medicalContext?.symptoms?.join(', ') || 'None specified'}

PHASE-SPECIFIC FOCUS (${context.conversationPhase || 'initial'}):
- Current Focus: ${phaseInstructions.focus}
- Key Tasks: ${phaseInstructions.tasks.join(', ')}

RESPONSE GUIDELINES:
1. Maintain specialty expertise in ${context.specialty || 'general medicine'}
2. Address the patient's specific condition: ${context.medicalContext?.currentCondition || 'being assessed'}
3. ${context.urgency === 'emergency' ? '🚨 URGENT: Prioritize critical information and immediate actions' : context.urgency === 'urgent' ? '⚡ Provide timely assessment and recommendations' : '📋 Provide thorough, detailed information'}
4. Use evidence-based medical knowledge
5. Consider differential diagnoses systematically
6. Provide clear explanations of medical concepts

IMPORTANT: Continue the conversation based on the patient's ongoing evaluation. Reference previous findings and build upon them.

${this.generateContextualInstructions(context)}`;

      return basePrompt;
    } catch (error) {
      console.error('[PromptTemplates] Error generating system prompt:', error);
      return 'You are SETV, a Surgical Expert and Treatment Advisor AI assistant.';
    }
  }

  /**
   * Format context information for prompt
   */
  static formatContextForPrompt(context) {
    let formatted = '';
    
    // Medical context
    if (context.medicalContext) {
      formatted += '\nMEDICAL INFORMATION:\n';
      
      if (context.medicalContext.patientInfo?.age) {
        formatted += `- Patient Age: ${context.medicalContext.patientInfo.age}\n`;
      }
      
      if (context.medicalContext.patientInfo?.gender) {
        formatted += `- Patient Gender: ${context.medicalContext.patientInfo.gender}\n`;
      }
      
      if (context.medicalContext.currentCondition) {
        formatted += `- Current Condition: ${context.medicalContext.currentCondition}\n`;
      }
      
      if (context.medicalContext.symptoms?.length > 0) {
        formatted += `- Symptoms: ${context.medicalContext.symptoms.join(', ')}\n`;
      }
      
      if (context.medicalContext.medications?.length > 0) {
        formatted += `- Current Medications: ${context.medicalContext.medications.join(', ')}\n`;
      }
      
      if (context.medicalContext.labResults?.length > 0) {
        formatted += `- Lab Results: ${context.medicalContext.labResults.join(', ')}\n`;
      }
    }
    
    // Conversation context
    formatted += '\nCONSULTATION DETAILS:\n';
    formatted += `- Specialty: ${context.specialty || 'primary care'}\n`;
    formatted += `- Phase: ${context.conversationPhase || 'initial'}\n`;
    formatted += `- Message Count: ${context.messageCount || 0}\n`;
    
    // Topic history
    if (context.topicHistory?.length > 0) {
      formatted += '\nPREVIOUSLY DISCUSSED:\n';
      context.topicHistory.slice(-3).forEach(topic => {
        formatted += `- ${topic.topic} (${topic.messageCount} messages)\n`;
      });
    }
    
    return formatted;
  }

  /**
   * Generate contextual instructions based on phase
   */
  static generateContextualInstructions(context) {
    const phase = context.conversationPhase || 'initial';
    const specialty = context.specialty || 'primary';
    
    const phaseInstructions = {
      'initial': 'Focus on understanding the patient\'s chief complaint and gathering relevant history.',
      'assessment': 'Provide differential diagnoses and explain your reasoning process.',
      'diagnosis': 'Confirm or refine diagnoses and explain the pathophysiology.',
      'treatment': 'Detail treatment options, including risks, benefits, and alternatives.',
      'followup': 'Monitor progress, adjust treatment as needed, and provide long-term guidance.'
    };
    
    const specialtyInstructions = {
      'cardiology': 'Pay special attention to cardiovascular risk factors, ECG findings, and cardiac biomarkers.',
      'oncology': 'Consider cancer staging, treatment protocols, and multidisciplinary approaches.',
      'surgery': 'Evaluate surgical indications, operative approaches, and postoperative care.',
      'emergency': 'Prioritize ABCs (Airway, Breathing, Circulation) and immediate life-saving interventions.',
      'hepatology': 'Focus on liver function tests, viral markers, and hepatic decompensation signs.',
      'nephrology': 'Consider renal function, electrolyte management, and dialysis indications.',
      'pulmonology': 'Assess respiratory status, oxygenation, and pulmonary function tests.',
      'neurology': 'Evaluate neurological deficits, imaging findings, and seizure management.',
      'endocrinology': 'Review hormonal levels, metabolic status, and endocrine emergencies.',
      'gastroenterology': 'Focus on GI bleeding, liver disease, and nutritional status.'
    };
    
    return `
SPECIALTY FOCUS:
${specialtyInstructions[specialty] || 'Provide comprehensive medical assessment.'}

PHASE FOCUS:
${phaseInstructions[phase]}

Remember to maintain medical professionalism, show empathy, and ensure patient safety is the priority.`;
  }

  /**
   * Generate user message with context reinforcement
   */
  static generateUserPrompt(userMessage, context) {
    return `User Message: ${userMessage}

CONTEXT REMINDER:
- Current Topic: ${context.currentTopic || 'medical consultation'}
- Patient Condition: ${context.currentCondition || 'assessment in progress'}
- Conversation Phase: ${context.conversationPhase || 'initial'}

Please address the user's message while maintaining the medical context of this consultation.`;
  }

  /**
   * Generate validation prompt
   */
  static generateValidationPrompt(response, expectedTopic) {
    return `Please validate if this medical response maintains focus on the topic: ${expectedTopic}

Response to validate:
"${response}"

Check if:
1. Response addresses the medical topic directly
2. No unrelated medical conditions are discussed
3. No topic drift indicators present
4. Medical information is consistent with the topic

Respond with "VALID" if appropriate, or "INVALID" if topic drift is detected.`;
  }

  /**
   * Generate emergency protocol prompt
   */
  static generateEmergencyPrompt(context) {
    return `EMERGENCY PROTOCOL ACTIVATED

Patient presents with urgent symptoms requiring immediate attention.

Current Assessment:
${this.formatContextForPrompt(context)}

IMMEDIATE ACTIONS:
1. Assess ABCs (Airway, Breathing, Circulation)
2. Identify life-threatening conditions
3. Provide immediate interventions
4. Arrange emergency transport if needed
5. Document all findings and actions

CRITICAL CONSIDERATIONS:
- Time-sensitive treatments
- Red flag symptoms
- Emergency department criteria
- Stabilization priorities

Provide urgent, clear, and actionable medical guidance.`;
  }

  /**
   * Generate follow-up prompt
   */
  static generateFollowUpPrompt(context) {
    return `FOLLOW-UP CONSULTATION

Reviewing patient progress:
${this.formatContextForPrompt(context)}

FOLLOW-UP ASSESSMENT:
1. Response to previous treatment
2. Symptom improvement or worsening
3. Side effects or complications
4. Adherence to treatment plan
5. New symptoms or concerns

MONITORING RECOMMENDATIONS:
- Vital signs to track
- Lab test frequency
- Red flag symptoms
- When to seek urgent care
- Lifestyle modifications

Provide comprehensive follow-up guidance and monitoring plan.`;
  }

  /**
   * Generate context recovery prompt
   */
  static generateRecoveryPrompt(context, lastValidTopic) {
    return `CONTEXT RECOVERY NEEDED:

The conversation has drifted from the medical topic. 

ORIGINAL TOPIC: ${lastValidTopic}
CURRENT DISCUSSION: ${context.currentTopic}

Please acknowledge the drift and gently redirect back to discussing ${lastValidTopic} related to the patient's condition: ${context.medicalContext.currentCondition || 'their medical situation'}

Example: "I notice we've moved away from discussing ${lastValidTopic}. Let's refocus on that important aspect of your care."`;
  }

  /**
   * Generate topic lock prompt
   */
  static generateTopicLockPrompt(topic, medicalContext) {
    return `TOPIC LOCK ACTIVATED

You must strictly discuss only: ${topic}

Medical Context:
- Condition: ${medicalContext.currentCondition || 'being evaluated'}
- Treatment Stage: ${medicalContext.treatmentStage || 'initial assessment'}

Any response about unrelated topics must be redirected back to ${topic}. 

If user asks unrelated questions, respond: "I understand you're curious about that, but let's focus on the important ${topic} discussion we're having about your medical care."`;
  }

  /**
   * Generate context summary for frontend
   */
  static generateFrontendSummary(context) {
    return {
      topic: context.currentTopic || 'Medical Consultation',
      condition: context.currentCondition || 'Assessment in progress',
      phase: context.conversationPhase || 'initial',
      specialty: context.specialty || 'primary care',
      score: Math.round((context.contextScore || 1.0) * 100),
      messageCount: context.messageCount || 0
    };
  }

  /**
   * Generate follow-up questions based on specialty and context
   */
  static generateFollowUpQuestions(specialty, context) {
    try {
      const specialtyPrompt = SpecialtyPrompts.getSpecialtyPrompt(specialty, context);
      
      // Add context-aware questions
      const contextualQuestions = [];
      
      // Based on current symptoms
      if (context.medicalContext?.symptoms?.length > 0) {
        contextualQuestions.push(`Can you tell me more about your ${context.medicalContext.symptoms[0]}?`);
      }
      
      // Based on conversation phase
      if (context.conversationPhase === 'assessment') {
        contextualQuestions.push('What tests have you had done so far?');
      } else if (context.conversationPhase === 'treatment') {
        contextualQuestions.push('How are you responding to the current treatment?');
      }
      
      // Combine specialty-specific and contextual questions
      return [...specialtyPrompt.followUp, ...contextualQuestions].slice(0, 5);
    } catch (error) {
      console.error('[PromptTemplates] Error generating follow-up questions:', error);
      return [
        'Can you provide more details about your symptoms?',
        'How long have you been experiencing this?',
        'Have you seen any other doctors for this?'
      ];
    }
  }
}

export default PromptTemplates;
