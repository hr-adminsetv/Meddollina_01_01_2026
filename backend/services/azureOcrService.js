/**
 * Azure Document Intelligence (OCR) Service
 * Handles document and image text extraction using Azure Cognitive Services
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure Document Intelligence Configuration
 * All values loaded from environment variables
 */
const AZURE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
const AZURE_API_KEY_BACKUP = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY_BACKUP;
const API_VERSION = process.env.AZURE_OCR_API_VERSION || '2023-07-31';

class AzureOcrService {
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
   * Process document with OCR
   * @param {string} documentUrl - URL of the document to process
   * @param {string} documentType - Type of document (pdf, image, etc.)
   * @returns {Promise<Object>} OCR result
   */
  async processDocument(documentUrl, documentType = 'general') {
    try {
      console.log('[OCR] Processing document:', documentUrl);
      
      // Determine the appropriate model based on document type
      const model = this.getModelForDocumentType(documentType);
      
      // Start document analysis
      const analyzeUrl = `${this.endpoint}formrecognizer/documentModels/${model}:analyze?api-version=${this.apiVersion}`;
      
      const requestBody = {
        urlSource: documentUrl
      };

      // Initial request to start processing
      const response = await axios.post(analyzeUrl, requestBody, {
        headers: this.headers,
        timeout: 30000
      });

      // Get operation location from headers
      const operationLocation = response.headers['operation-location'] || response.headers['Operation-Location'];
      
      if (!operationLocation) {
        throw new Error('No operation location returned from OCR service');
      }

      console.log('[OCR] Processing started, polling for results...');

      // Poll for results
      console.log('[OCR] Starting to poll for results from:', operationLocation);
      const result = await this.pollForResults(operationLocation);
      
      // Extract and format text
      const extractedData = this.extractTextFromResult(result);
      
      console.log('[OCR] Processing complete:', {
        textLength: extractedData.text.length,
        pages: extractedData.pageCount
      });
      
      return {
        success: true,
        text: extractedData.text,
        tables: extractedData.tables,
        keyValuePairs: extractedData.keyValuePairs,
        metadata: {
          pages: extractedData.pageCount,
          confidence: extractedData.confidence
        }
      };
    } catch (error) {
      console.error('[OCR] Document processing error:', error.message);
      console.error('[OCR] Full error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: documentUrl
      });
      
      // Try with backup key if primary fails
      if (this.apiKey === AZURE_API_KEY && error.response?.status === 401) {
        console.log('[OCR] Retrying with backup key...');
        this.apiKey = AZURE_API_KEY_BACKUP;
        this.headers['Ocp-Apim-Subscription-Key'] = this.apiKey;
        return this.processDocument(documentUrl, documentType);
      }
      
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * Process image with OCR for text extraction
   * @param {string} imageUrl - URL of the image
   * @returns {Promise<Object>} Extracted text
   */
  async processImage(imageUrl) {
    try {
      console.log('[OCR] Processing image with Document Intelligence:', imageUrl);
      
      // Use the same Document Intelligence API as documents
      const analyzeUrl = `${this.endpoint}formrecognizer/documentModels/prebuilt-read:analyze?api-version=${this.apiVersion}`;
      
      const requestBody = {
        urlSource: imageUrl
      };

      // Start OCR processing
      const response = await axios.post(analyzeUrl, requestBody, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // Get operation location
      const operationLocation = response.headers['operation-location'] || response.headers['Operation-Location'];
      
      if (!operationLocation) {
        throw new Error('No operation location returned from OCR service');
      }

      // Poll for results
      const result = await this.pollForResults(operationLocation);
      
      // Extract text
      const extractedText = this.extractTextFromResult(result);
      
      console.log('[OCR] Image processing complete');
      
      return {
        success: true,
        text: extractedText.text,
        lines: extractedText.lines,
        words: extractedText.words,
        metadata: {
          language: extractedText.language,
          confidence: extractedText.confidence
        }
      };
    } catch (error) {
      console.error('[OCR] Image processing error:', error.message);
      if (error.response) {
        console.error('[OCR] Error response:', error.response.data);
      }
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Get appropriate model for document type
   * @private
   */
  getModelForDocumentType(documentType) {
    const modelMap = {
      'general': 'prebuilt-document',
      'invoice': 'prebuilt-invoice',
      'receipt': 'prebuilt-receipt',
      'id': 'prebuilt-idDocument',
      'businessCard': 'prebuilt-businessCard',
      'medical': 'prebuilt-healthInsuranceCard.us',
      'layout': 'prebuilt-layout'
    };

    return modelMap[documentType] || 'prebuilt-document';
  }

  /**
   * Poll for document processing results
   * @private
   */
  async pollForResults(operationLocation, maxAttempts = 30, delayMs = 3000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(operationLocation, {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey
          },
          timeout: 10000
        });

        const { status, analyzeResult } = response.data;

        if (status === 'succeeded' && analyzeResult) {
          console.log(`[OCR] Success after ${i + 1} attempts`);
          return analyzeResult;
        } else if (status === 'failed') {
          throw new Error('Document analysis failed');
        }

        // Wait before next poll (increased to avoid rate limiting)
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        // Handle rate limiting
        if (error.response?.status === 429) {
          console.log(`[OCR] Rate limited, waiting longer... (attempt ${i + 1})`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          continue;
        }
        
        if (i === maxAttempts - 1) {
          throw new Error(`Polling timeout: ${error.message}`);
        }
      }
    }

    throw new Error('Document processing timeout');
  }

  /**
   * Poll for image OCR results
   * @private
   */
  async pollForImageResults(operationLocation, maxAttempts = 20, delayMs = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(operationLocation, {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey
          },
          timeout: 10000
        });

        const { status, analyzeResult } = response.data;

        if (status === 'succeeded' && analyzeResult) {
          return analyzeResult;
        } else if (status === 'failed') {
          throw new Error('Image OCR failed');
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Polling timeout: ${error.message}`);
        }
      }
    }

    throw new Error('Image processing timeout');
  }

  /**
   * Extract text from document analysis result
   * @private
   */
  extractTextFromResult(analyzeResult) {
    const extractedData = {
      text: '',
      tables: [],
      keyValuePairs: [],
      pageCount: 0,
      confidence: 0
    };

    // Extract plain text
    if (analyzeResult.content) {
      extractedData.text = analyzeResult.content;
    }

    // Extract from pages
    if (analyzeResult.pages) {
      extractedData.pageCount = analyzeResult.pages.length;
      
      let totalConfidence = 0;
      let confidenceCount = 0;
      
      analyzeResult.pages.forEach(page => {
        // Extract lines
        if (page.lines) {
          page.lines.forEach(line => {
            if (line.content && !extractedData.text.includes(line.content)) {
              extractedData.text += line.content + '\n';
            }
          });
        }

        // Calculate average confidence
        if (page.words) {
          page.words.forEach(word => {
            if (word.confidence) {
              totalConfidence += word.confidence;
              confidenceCount++;
            }
          });
        }
      });
      
      if (confidenceCount > 0) {
        extractedData.confidence = totalConfidence / confidenceCount;
      }
    }

    // Extract tables
    if (analyzeResult.tables) {
      extractedData.tables = analyzeResult.tables.map(table => ({
        rowCount: table.rowCount,
        columnCount: table.columnCount,
        cells: table.cells
      }));
    }

    // Extract key-value pairs
    if (analyzeResult.keyValuePairs) {
      extractedData.keyValuePairs = analyzeResult.keyValuePairs.map(pair => ({
        key: pair.key?.content,
        value: pair.value?.content,
        confidence: pair.confidence
      }));
    }

    return extractedData;
  }

  /**
   * Extract text from image OCR result
   * @private
   */
  extractTextFromImageResult(analyzeResult) {
    const extractedData = {
      text: '',
      lines: [],
      words: [],
      language: 'en',
      confidence: 0
    };

    if (!analyzeResult.readResults) {
      return extractedData;
    }

    let totalConfidence = 0;
    let confidenceCount = 0;

    analyzeResult.readResults.forEach(page => {
      // Extract lines
      if (page.lines) {
        page.lines.forEach(line => {
          extractedData.text += line.text + '\n';
          extractedData.lines.push({
            text: line.text,
            boundingBox: line.boundingBox
          });

          // Extract words
          if (line.words) {
            line.words.forEach(word => {
              extractedData.words.push({
                text: word.text,
                boundingBox: word.boundingBox,
                confidence: word.confidence
              });

              if (word.confidence) {
                totalConfidence += word.confidence;
                confidenceCount++;
              }
            });
          }
        });
      }

      // Language
      if (page.language) {
        extractedData.language = page.language;
      }
    });

    if (confidenceCount > 0) {
      extractedData.confidence = totalConfidence / confidenceCount;
    }

    return extractedData;
  }

  /**
   * Health check
   * @returns {Promise<boolean>} Service status
   */
  async healthCheck() {
    try {
      const response = await axios.get(this.endpoint, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        },
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('[OCR] Health check failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export default new AzureOcrService();
