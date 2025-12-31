/**
 * AI-Powered Medical Topic Detection Service
 * Uses semantic similarity via the existing AI service for intelligent topic detection
 * Falls back to cached keyword patterns for performance
 */

class MedicalTopicDetector {
  constructor(aiService) {
    this.aiService = aiService;
    
    // Core medical specialties with seed keywords for fast initial matching
    this.specialties = {
      'cardiology': {
        keywords: ['heart', 'cardiac', 'chest pain', 'ecg', 'ekg', 'stent', 'bypass', 'valve', 'hypertension', 'cholesterol'],
        embeddings: null,
        lastUpdated: null
      },
      'oncology': {
        keywords: ['cancer', 'tumor', 'chemotherapy', 'radiation', 'metastasis', 'biopsy', 'malignant', 'benign'],
        embeddings: null,
        lastUpdated: null
      },
      'gastroenterology': {
        keywords: ['stomach', 'abdominal', 'nausea', 'vomiting', 'diarrhea', 'endoscopy', 'colonoscopy', 'liver'],
        embeddings: null,
        lastUpdated: null
      },
      'hepatology': {
        keywords: ['liver', 'hepatic', 'jaundice', 'bilirubin', 'hepatitis', 'cirrhosis', 'yellow eyes', 'yellow skin'],
        embeddings: null,
        lastUpdated: null
      },
      'nephrology': {
        keywords: ['kidney', 'renal', 'dialysis', 'creatinine', 'gfr', 'urine', 'proteinuria'],
        embeddings: null,
        lastUpdated: null
      },
      'pulmonology': {
        keywords: ['lung', 'pulmonary', 'respiratory', 'breath', 'cough', 'asthma', 'copd', 'pneumonia', 'oxygen'],
        embeddings: null,
        lastUpdated: null
      },
      'neurology': {
        keywords: ['headache', 'seizure', 'stroke', 'brain', 'neuro', 'migraine', 'dementia', 'parkinson'],
        embeddings: null,
        lastUpdated: null
      },
      'endocrinology': {
        keywords: ['diabetes', 'thyroid', 'hormone', 'insulin', 'glucose', 'metabolic', 'endocrine'],
        embeddings: null,
        lastUpdated: null
      },
      'surgery': {
        keywords: ['surgery', 'surgical', 'operation', 'procedure', 'incision', 'anesthesia', 'scalpel', 'resection'],
        embeddings: null,
        lastUpdated: null
      },
      'emergency': {
        keywords: ['emergency', 'urgent', 'critical', 'icu', 'life threatening', 'severe', 'acute'],
        embeddings: null,
        lastUpdated: null
      },
      'rheumatology': {
        keywords: ['arthritis', 'joint', 'lupus', 'rheumatoid', 'gout', 'fibromyalgia', 'vasculitis'],
        embeddings: null,
        lastUpdated: null
      },
      'infectious_disease': {
        keywords: ['infection', 'fever', 'antibiotic', 'viral', 'bacterial', 'sepsis', 'hiv', 'hepatitis'],
        embeddings: null,
        lastUpdated: null
      },
      'hematology': {
        keywords: ['blood', 'anemia', 'leukemia', 'lymphoma', 'clotting', 'bleeding', 'platelets', 'hemoglobin'],
        embeddings: null,
        lastUpdated: null
      },
      'dermatology': {
        keywords: ['skin', 'rash', 'lesion', 'acne', 'eczema', 'psoriasis', 'melanoma', 'dermatitis'],
        embeddings: null,
        lastUpdated: null
      },
      'psychiatry': {
        keywords: ['depression', 'anxiety', 'bipolar', 'schizophrenia', 'mental health', 'psychiatric', 'therapy'],
        embeddings: null,
        lastUpdated: null
      },
      'obstetrics_gynecology': {
        keywords: ['pregnancy', 'obstetrics', 'gynecology', 'menstrual', 'menopause', 'cervical', 'uterus'],
        embeddings: null,
        lastUpdated: null
      },
      'pediatrics': {
        keywords: ['pediatric', 'child', 'infant', 'newborn', 'vaccine', 'growth', 'development'],
        embeddings: null,
        lastUpdated: null
      },
      'orthopedics': {
        keywords: ['bone', 'fracture', 'joint', 'orthopedic', 'arthritis', 'spine', 'knee', 'hip'],
        embeddings: null,
        lastUpdated: null
      },
      'urology': {
        keywords: ['urinary', 'bladder', 'prostate', 'kidney stone', 'incontinence', 'urology'],
        embeddings: null,
        lastUpdated: null
      },
      'ophthalmology': {
        keywords: ['eye', 'vision', 'cataract', 'glaucoma', 'retina', 'ophthalmology', 'eyelid'],
        embeddings: null,
        lastUpdated: null
      },
      'otorhinolaryngology': {
        keywords: ['ear', 'nose', 'throat', 'ent', 'sinus', 'hearing', 'tonsillitis', 'vertigo'],
        embeddings: null,
        lastUpdated: null
      }
    };
    
    // Cache for detected topics
    this.topicCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Initialize embeddings for all specialties
    this.initializeEmbeddings();
  }

  /**
   * Initialize embeddings for all specialties
   */
  async initializeEmbeddings() {
    console.log('[MedicalTopicDetector] Initializing embeddings for medical specialties...');
    
    for (const [specialty, data] of Object.entries(this.specialties)) {
      try {
        // Generate embedding for the specialty description
        const description = this.generateSpecialtyDescription(specialty, data.keywords);
        const embedding = await this.generateEmbedding(description);
        
        if (embedding) {
          data.embeddings = embedding;
          data.lastUpdated = new Date();
        }
      } catch (error) {
        console.error(`[MedicalTopicDetector] Failed to initialize ${specialty}:`, error);
      }
    }
    
    console.log('[MedicalTopicDetector] Embeddings initialization complete');
  }

  /**
   * Generate a comprehensive description for a medical specialty
   */
  generateSpecialtyDescription(specialty, keywords) {
    const descriptions = {
      'cardiology': 'Cardiology is the medical specialty dealing with disorders of the heart and blood vessels. Includes heart disease, heart attacks, heart failure, arrhythmias, hypertension, cholesterol, coronary artery disease, valvular heart disease, pacemakers, stents, bypass surgery.',
      'oncology': 'Oncology is the branch of medicine that researches, identifies and treats tumors. Cancer, chemotherapy, radiation therapy, immunotherapy, targeted therapy, malignant tumors, benign tumors, biopsies, metastasis, leukemia, lymphoma, solid tumors.',
      'gastroenterology': 'Gastroenterology is the branch of medicine focused on the digestive system and its disorders. Stomach, intestines, liver, pancreas, esophagus, colon, IBD, Crohn disease, ulcerative colitis, GERD, endoscopy, colonoscopy.',
      'hepatology': 'Hepatology is the branch of medicine that incorporates the study of liver, gallbladder, biliary tree, and pancreas. Liver disease, hepatitis, cirrhosis, jaundice, liver failure, liver transplant, bilirubin, liver function tests.',
      'nephrology': 'Nephrology is a specialty of medicine and pediatrics that concerns itself with the kidneys. Kidney disease, dialysis, kidney failure, glomerulonephritis, polycystic kidney disease, kidney stones, electrolyte disorders, hypertension.',
      'pulmonology': 'Pulmonology is a medical specialty that deals with diseases involving the respiratory tract. Lung diseases, asthma, COPD, pneumonia, pulmonary embolism, sleep apnea, tuberculosis, lung cancer, respiratory failure.',
      'neurology': 'Neurology is a branch of medicine dealing with disorders of the nervous system. Brain, spinal cord, nerves, stroke, epilepsy, dementia, Alzheimer disease, Parkinson disease, multiple sclerosis, headache, migraine.',
      'endocrinology': 'Endocrinology is a branch of biology and medicine dealing with the endocrine system. Diabetes, thyroid disorders, hormonal imbalances, metabolism, pituitary gland, adrenal gland, osteoporosis, obesity.',
      'surgery': 'Surgery is a medical specialty that uses operative manual and instrumental techniques. Surgical procedures, operations, anesthesia, incisions, resections, transplants, minimally invasive surgery, laparoscopic surgery.',
      'emergency': 'Emergency medicine is the medical specialty dedicated to the diagnosis and treatment of undifferentiated, unscheduled patients with illnesses or injuries requiring immediate medical attention. Emergency room, trauma, critical care, life threatening conditions.',
      'rheumatology': 'Rheumatology is a branch of medicine devoted to the diagnosis and therapy of rheumatic diseases. Arthritis, autoimmune diseases, joint pain, lupus, rheumatoid arthritis, gout, fibromyalgia, vasculitis.',
      'infectious_disease': 'Infectious diseases are disorders caused by organisms such as bacteria, viruses, fungi or parasites. Infections, fever, sepsis, antibiotics, antivirals, HIV/AIDS, tuberculosis, meningitis, infectious disease control.',
      'hematology': 'Hematology is the branch of medicine concerned with the study of the cause, prognosis, treatment, and prevention of diseases related to blood. Anemia, leukemia, lymphoma, bleeding disorders, clotting disorders, blood transfusions.',
      'dermatology': 'Dermatology is the branch of medicine dealing with the skin. Skin diseases, rashes, acne, eczema, psoriasis, skin cancer, dermatitis, fungal infections, cosmetic dermatology.',
      'psychiatry': 'Psychiatry is the medical specialty devoted to the diagnosis, prevention, study, and treatment of mental disorders. Depression, anxiety, bipolar disorder, schizophrenia, mental health, psychotherapy, psychopharmacology.',
      'obstetrics_gynecology': 'Obstetrics and gynecology is the medical specialty that encompasses the two subspecialties of obstetrics and gynecology. Pregnancy, childbirth, female reproductive health, menstrual disorders, menopause, cervical cancer.',
      'pediatrics': 'Pediatrics is the branch of medicine dealing with the health and medical care of infants, children, and adolescents. Childhood diseases, vaccines, growth and development, pediatric emergencies.',
      'orthopedics': 'Orthopedics is the branch of surgery concerned with conditions involving the musculoskeletal system. Bones, joints, ligaments, tendons, muscles, fractures, arthritis, sports injuries.',
      'urology': 'Urology is the branch of medicine that focuses on surgical and medical diseases of the male and female urinary-tract system and the male reproductive organs. Urinary tract infections, kidney stones, prostate issues, incontinence.',
      'ophthalmology': 'Ophthalmology is a branch of medicine and surgery that deals with the diagnosis and treatment of eye disorders. Eye diseases, vision problems, cataracts, glaucoma, retinal disorders, eye surgery.',
      'otorhinolaryngology': 'Otolaryngology is the surgical subspecialty within medicine that deals with conditions of the ear, nose, and throat and related structures of the head and neck. ENT disorders, sinusitis, hearing loss, voice disorders.'
    };

    return descriptions[specialty] || `${specialty}: ${keywords.join(', ')}`;
  }

  /**
   * Generate embedding for text using the AI service
   */
  async generateEmbedding(text) {
    try {
      // Use the existing AI service to generate embeddings
      const response = await this.aiService.generateEmbedding(text);
      return response.embedding;
    } catch (error) {
      console.error('[MedicalTopicDetector] Failed to generate embedding:', error);
      return null;
    }
  }

  /**
   * Detect medical topics from a message using AI-powered semantic analysis
   */
  async detectTopics(message) {
    // Check cache first
    const cacheKey = message.toLowerCase().trim();
    if (this.topicCache.has(cacheKey)) {
      const cached = this.topicCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.topics;
      }
    }

    const topics = {
      primary: null,
      secondary: [],
      confidence: {},
      entities: {
        symptoms: [],
        medications: [],
        conditions: [],
        procedures: []
      }
    };

    try {
      // Generate embedding for the message
      const messageEmbedding = await this.generateEmbedding(message);
      if (!messageEmbedding) {
        return this.fallbackDetection(message);
      }

      // Compare with specialty embeddings
      let maxSimilarity = 0;
      let primarySpecialty = null;
      const similarities = {};

      for (const [specialty, data] of Object.entries(this.specialties)) {
        if (data.embeddings) {
          const similarity = this.calculateSimilarity(messageEmbedding, data.embeddings);
          similarities[specialty] = similarity;
          
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            primarySpecialty = specialty;
          }
        }
      }

      // Set primary topic if confidence is high enough
      if (maxSimilarity > 0.3) {
        topics.primary = primarySpecialty;
        topics.confidence[primarySpecialty] = maxSimilarity;
      }

      // Find secondary topics
      Object.entries(similarities)
        .filter(([specialty, similarity]) => similarity > 0.2 && specialty !== primarySpecialty)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([specialty, similarity]) => {
          topics.secondary.push(specialty);
          topics.confidence[specialty] = similarity;
        });

      // Extract medical entities using AI
      const entities = await this.extractMedicalEntities(message);
      if (entities) {
        topics.entities = { ...topics.entities, ...entities };
      }

      // Cache the result
      this.topicCache.set(cacheKey, {
        topics,
        timestamp: Date.now()
      });

      return topics;
    } catch (error) {
      console.error('[MedicalTopicDetector] AI detection failed, using fallback:', error);
      return this.fallbackDetection(message);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Fallback detection using keyword matching
   */
  fallbackDetection(message) {
    const topics = {
      primary: null,
      secondary: [],
      confidence: {},
      entities: {
        symptoms: [],
        medications: [],
        conditions: [],
        procedures: []
      }
    };

    const messageLower = message.toLowerCase();
    let maxMatches = 0;
    let primarySpecialty = null;

    // Simple keyword matching as fallback
    for (const [specialty, data] of Object.entries(this.specialties)) {
      const matches = data.keywords.filter(keyword => 
        messageLower.includes(keyword.toLowerCase())
      ).length;

      if (matches > 0) {
        topics.confidence[specialty] = matches * 0.1;
        
        if (matches > maxMatches) {
          maxMatches = matches;
          primarySpecialty = specialty;
        }
      }
    }

    if (primarySpecialty) {
      topics.primary = primarySpecialty;
      
      // Add other specialties with matches as secondary
      Object.entries(topics.confidence)
        .filter(([specialty]) => specialty !== primarySpecialty)
        .forEach(([specialty]) => {
          topics.secondary.push(specialty);
        });
    }

    return topics;
  }

  /**
   * Extract medical entities using AI
   */
  async extractMedicalEntities(message) {
    try {
      const prompt = `Extract medical entities from the following text. Return a JSON object with these categories:
      - symptoms: List of symptoms mentioned
      - medications: List of medications mentioned
      - conditions: List of medical conditions mentioned
      - procedures: List of medical procedures mentioned

      Text: "${message}"

      Respond only with valid JSON.`;

      const response = await this.aiService.generateResponse(prompt);
      const entities = JSON.parse(response);
      return entities;
    } catch (error) {
      console.error('[MedicalTopicDetector] Entity extraction failed:', error);
      return null;
    }
  }

  /**
   * Update specialty knowledge with new terms
   */
  async updateSpecialtyKnowledge(specialty, newTerms) {
    if (!this.specialties[specialty]) {
      console.warn(`[MedicalTopicDetector] Unknown specialty: ${specialty}`);
      return;
    }

    // Add new unique keywords
    const currentKeywords = this.specialties[specialty].keywords;
    const uniqueNewTerms = newTerms.filter(term => !currentKeywords.includes(term));
    
    if (uniqueNewTerms.length > 0) {
      this.specialties[specialty].keywords.push(...uniqueNewTerms);
      
      // Regenerate embedding with updated knowledge
      const description = this.generateSpecialtyDescription(specialty, this.specialties[specialty].keywords);
      const embedding = await this.generateEmbedding(description);
      
      if (embedding) {
        this.specialties[specialty].embeddings = embedding;
        this.specialties[specialty].lastUpdated = new Date();
        console.log(`[MedicalTopicDetector] Updated ${specialty} with ${uniqueNewTerms.length} new terms`);
      }
    }
  }

  /**
   * Get specialty information
   */
  getSpecialtyInfo(specialty) {
    return this.specialties[specialty] || null;
  }

  /**
   * Clear the topic cache
   */
  clearCache() {
    this.topicCache.clear();
    console.log('[MedicalTopicDetector] Cache cleared');
  }
}

export default MedicalTopicDetector;
