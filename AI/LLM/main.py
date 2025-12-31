"""
Main module for the logic behind Meddollina, the Surgical AI Assistant.

Classes:
    SurgicalLLM: Core class for surgical question answering system.
"""

from huggingface_hub import InferenceClient

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

import time
import numpy as np
import json

from .config import Config
from .prompts import Prompts
from .utils import Utils
from .logger import PerformanceLogger
from .metrics import MemoryMetrics
from .validation import Validator, ValidationError

class SurgicalLLM:
    """
    Class for surgical question answering chatbot using LLM and vector retrieval (RAG).

    Attributes:
        utils: Utility functions instance
        logger: Performance logging instance
        embeddings: Text embeddings model
        vectordb: Vector database instance
        chat: LLM chat instance
        memory_metrics: Memory metrics instance
    """

    def __init__(self, config: Config):
        """
        Initialize the SurgicalLLM class.

        Raises:
            ValueError: If HF_TOKEN is not found in configuration
        """
        if Config.HF_TOKEN is None:
            raise ValueError("HF_TOKEN not found in the .env file or the file path is incorrect")

        self.config = config
        self.utils = Utils(config.MODEL_NAME)
        self.logger = PerformanceLogger()
        
        # Initialize basic components first
        self.embeddings = None
        self.vectordb = None
        self.memory_metrics = None
        self.client = None
        self.validator = None
        self._initialized = False
        
        print("SurgicalLLM basic initialization completed. Heavy models will be loaded on first use.")

    def _ensure_initialized(self):
        """Initialize heavy components if not already done."""
        if self._initialized:
            return
            
        print("Initializing heavy LLM components...")
        
        try:
            print("Loading embeddings...")
            self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-l6-v2")
            print("Embeddings loaded successfully")
        except Exception as e:
            print(f"Error loading embeddings: {e}")
            raise e
            
        try:
            print("Loading vector database...")
            self.vectordb = Chroma(persist_directory=self.config.VECTOR_DB_PATH, embedding_function=self.embeddings)
            print("Vector database loaded successfully")
        except Exception as e:
            print(f"Error loading vector database: {e}")
            raise e
            
        try:
            print("Loading memory metrics...")
            self.memory_metrics = MemoryMetrics(self.config.VECTOR_DB_PATH)
            self.logger.set_memory_metrics(self.memory_metrics)
            print("Memory metrics loaded successfully")
        except Exception as e:
            print(f"Error loading memory metrics: {e}")
            raise e
            
        try:
            print("Loading inference client...")
            self.client = InferenceClient(
                model=Config.MODEL_NAME,
                token=Config.HF_TOKEN,
                timeout=60  # Set 60 second timeout for paid tier
            )
            
            # Create a separate client for quick operations like intent detection
            self.quick_client = InferenceClient(
                model=Config.MODEL_NAME,
                token=Config.HF_TOKEN,
                timeout=30  # Shorter timeout for intent detection
            )
            print("Inference clients loaded successfully")
        except Exception as e:
            print(f"Error loading inference client: {e}")
            raise e
            
        try:
            print("Loading validator...")
            self.validator = Validator(self.client, self.memory_metrics, self.logger)
            print("Validator loaded successfully")
        except Exception as e:
            print(f"Error loading validator: {e}")
            raise e
            
        self._initialized = True
        print("All LLM components initialized successfully!")

    def _generate_heading(self, question: str) -> str:
        """Generate a heading for the question using the LLM."""
        self._ensure_initialized()
        heading_messages = Prompts.build_prompt(prompt_type="heading", question=question)
        try:
            response = self.client.chat_completion(
                messages=heading_messages,
                max_tokens=12,
                temperature=0.5,
            )
            heading = response.choices[0].message.content.strip('"')
            return heading
        except Exception as e:
            print(f"Error generating heading: {e}")
            return f"{question[:50]}..."

    def _generate_clarification_response(self, intent_data: dict, question: str) -> str:
        """Generate a clarification question for ambiguous queries."""
        needs_clarification = intent_data.get("needs_clarification", "")
        
        symptoms_prompt = ("To provide you with the most accurate medical information, I need more specific details about your symptoms. "
                          "Could you please tell me:\n\n• When did the symptoms start?\n• How severe are they on a scale of 1-10?\n"
                          "• Are there any associated symptoms?\n• Does anything make them better or worse?")
        
        condition_prompt = ("I'd like to help you with specific information about your medical concern. "
                           "Could you please provide more details such as:\n\n• What specific condition or symptoms are you experiencing?\n"
                           "• How long have you been experiencing this?\n• Have you been diagnosed with anything specific?")
        
        treatment_prompt = ("To recommend appropriate treatment options, I need to understand your specific situation better. "
                           "Please tell me:\n\n• What condition are you seeking treatment for?\n• Have you tried any treatments before?\n"
                           "• Do you have any allergies or other medical conditions?")
        
        medications_prompt = ("For medication information, I need more specific details:\n\n• What condition do you need medication for?\n"
                             "• Are you currently taking any medications?\n• Do you have any known allergies?\n"
                             "• What is your age and general health status?")
        
        clarification_prompts = {
            "symptoms": symptoms_prompt,
            "condition": condition_prompt,
            "treatment": treatment_prompt,
            "medications": medications_prompt
        }
        
        # Determine the type of clarification needed
        if "symptoms" in needs_clarification.lower():
            return clarification_prompts.get("symptoms", clarification_prompts["condition"])
        elif "treatment" in needs_clarification.lower() or "medication" in needs_clarification.lower():
            return clarification_prompts.get("treatment", clarification_prompts["condition"])
        elif "medication" in needs_clarification.lower() or "dosage" in needs_clarification.lower():
            return clarification_prompts.get("medications", clarification_prompts["condition"])
        else:
            return clarification_prompts["condition"]

    def _detect_intent(self, question: str, history_text: str = "") -> dict:
        """Detect the intent of the user's question for dynamic response generation."""
        try:
            # Check for malicious patterns FIRST
            question_lower = question.lower()
            
            # Explicit malicious pattern detection
            if any(phrase in question_lower for phrase in [
                "take advantage", "advantage of", "sedated patient",
                "exploit patient", "abuse patient", "inappropriate exam",
                "sexual harassment", "without consent"
            ]):
                # If any context suggests doctor/medical professional exploitation
                if any(word in question_lower for word in ["doctor", "physician", "medical", "nurse", "staff"]):
                    # Return a special malicious intent that will be handled
                    return {
                        "intent": "malicious",
                        "urgency": "blocked",
                        "main_condition": "malicious_request",
                        "focus_area": "blocked",
                        "needs_clarification": ""
                    }
            
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    print(f"[DEBUG] Intent detection attempt {attempt + 1}/{max_retries}")
                    intent_messages = Prompts.build_prompt(
                        prompt_type="intent_detection", 
                        history=history_text, 
                        question=question
                    )
                    
                    # Use quick client with shorter timeout for intent detection
                    response = self.quick_client.chat_completion(
                        messages=intent_messages,
                        max_tokens=250,  # Increased to prevent truncation
                        temperature=0.1,
                        top_p=0.9
                    )
                    print(f"[DEBUG] Intent detection completed successfully on attempt {attempt + 1}")
                    
                    # Debug: Print the raw response
                    raw_response = response.choices[0].message.content
                    print(f"[DEBUG] Raw intent detection response: '{raw_response}'")
                    
                    break
                    
                except Exception as e:
                    print(f"[ERROR] Intent detection attempt {attempt + 1} failed: {str(e)}")
                    if attempt == max_retries - 1:
                        print(f"[ERROR] All intent detection attempts failed, using fallback")
                        # Return default intent when all attempts fail
                        return {
                            "intent": "medical",
                            "urgency": "medium", 
                            "main_condition": "unknown",
                            "focus_area": "general",
                            "needs_clarification": ""
                        }
                    else:
                        print(f"[DEBUG] Retrying intent detection in {2 ** attempt} seconds...")
                        import time
                        time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s
                        
            raw_content = response.choices[0].message.content
            print(f"[DEBUG] Attempting to parse JSON: '{raw_content}'")
            
            # Clean the response to extract JSON
            cleaned_content = raw_content.strip()
            
            # Remove markdown code blocks if present
            if "```json" in cleaned_content:
                start = cleaned_content.find("```json") + 7
                end = cleaned_content.find("```", start)
                if end != -1:
                    cleaned_content = cleaned_content[start:end].strip()
                else:
                    cleaned_content = cleaned_content[start:].strip()
            
            # Find JSON object boundaries
            if cleaned_content.startswith('{') and '}' in cleaned_content:
                end_brace = cleaned_content.rfind('}')
                cleaned_content = cleaned_content[:end_brace + 1]
            elif '{' in cleaned_content:
                start_brace = cleaned_content.find('{')
                if '}' in cleaned_content[start_brace:]:
                    end_brace = cleaned_content.rfind('}')
                    cleaned_content = cleaned_content[start_brace:end_brace + 1]
            
            print(f"[DEBUG] Cleaned JSON content: '{cleaned_content}'")
            
            try:
                intent_data = json.loads(cleaned_content)
                print(f"[DEBUG] JSON parsing successful: {intent_data}")
            except json.JSONDecodeError as json_error:
                print(f"[ERROR] JSON parsing failed after cleaning: {json_error}")
                print(f"[ERROR] Cleaned content that failed to parse: '{cleaned_content}'")
                raise json_error
            
            # Post-process to ensure main_condition is extracted even if not explicitly in current question
            if not intent_data.get("main_condition") and history_text:
                # Extract condition from history if current question doesn't have one (e.g., "now give me the treatment plan")
                history_lower = history_text.lower()
                medical_conditions = [
                    "anaplastic oligodendroglioma", "brain mass", "seizures", "glioma", "tumor", 
                    "cancer", "stroke", "heart attack", "pneumonia", "diabetes", "hypertension",
                    "chest pain", "headache", "fever", "covid", "infection", "surgery"
                ]
                
                for condition in medical_conditions:
                    if condition in history_lower:
                        intent_data["main_condition"] = condition.replace(" ", "_")
                        break
            
            # Enhanced intent classification for common patterns
            question_lower = question.lower()
            if any(phrase in question_lower for phrase in ["treatment plan", "surgical plan", "complete plan", "entire plan", "dosage", "medication"]):
                intent_data["intent"] = "specific_info"
                if "surgical" in question_lower or "surgery" in question_lower:
                    intent_data["focus_area"] = "surgical_plan"
                elif "medication" in question_lower or "dosage" in question_lower:
                    intent_data["focus_area"] = "medications"
                else:
                    intent_data["focus_area"] = "treatment"
            
            print(f"[DEBUG] Detected intent: {intent_data}")
            return intent_data
            
        except Exception as e:
            print(f"[ERROR] Intent detection failed completely: {e}")
            import traceback
            traceback.print_exc()
            # Return basic fallback
            return {"intent": "full_analysis", "focus_area": "", "urgency": "medium", "requires_full_structure": True, "main_condition": "", "needs_clarification": ""}

    def _format_conversation_history(self, memory, question: str) -> str:
        """Format conversation history from memory with enhanced context preservation."""
        if memory is None:
            print("[DEBUG] No memory available, returning empty history")
            return ""
        
        # Handle both list (from backend) and memory object
        if isinstance(memory, list):
            print(f"[DEBUG] Memory is a list with {len(memory)} items")
            history_data = memory
        else:
            # Memory object from LangChain
            conversation_history = memory.load_memory_variables({"input": question})
            print(f"[DEBUG] Loaded conversation_history: {conversation_history}")
            history_data = conversation_history.get("history", "")
        
        print(f"[DEBUG] Extracted history_data: {history_data}")
        
        if isinstance(history_data, list):
            formatted_history = []
            # Process messages in pairs (assuming even index = human, odd index = AI)
            for i in range(0, len(history_data), 2):
                # Handle both dict format (from backend) and message object format
                if isinstance(history_data[i], dict):
                    human_msg = history_data[i].get('content', '').replace('Human:', '').strip()
                else:
                    human_msg = history_data[i].content.replace('Human:', '').strip()
                
                ai_msg = ""
                if i + 1 < len(history_data):
                    if isinstance(history_data[i + 1], dict):
                        ai_msg = history_data[i + 1].get('content', '').strip()
                    else:
                        ai_msg = history_data[i + 1].content.strip()
                    # Truncate very long AI responses but preserve key medical context
                    if len(ai_msg) > 800:
                        # Extract key medical information from the start and any diagnoses/conditions mentioned
                        lines = ai_msg.split('\n')
                        key_lines = []
                        condition_lines = []
                        
                        for line in lines[:10]:  # First 10 lines for context
                            key_lines.append(line.strip())
                            
                        # Look for specific medical conditions, diagnoses, treatments mentioned
                        for line in lines:
                            if any(keyword in line.lower() for keyword in ['diagnosis:', 'condition:', 'treatment:', 'medication:', 'patient:', 'symptoms:', 'surgery:', 'procedure:']):
                                condition_lines.append(line.strip())
                        
                        # Combine key context with medical specifics
                        preserved_context = '\n'.join(key_lines[:5]) + '\n...\n' + '\n'.join(condition_lines[:5])
                        ai_msg = preserved_context
                
                formatted_history.append(f"Previous Question: {human_msg}\nPrevious Response Summary: {ai_msg}")
            
            # Keep the most recent 10 interactions to maintain relevant context
            if len(formatted_history) > 10:
                formatted_history = formatted_history[-10:]
                
            final_history = "\n\n".join(formatted_history)
            print(f"[DEBUG] Formatted conversation history: {final_history[:500]}...")
            return final_history
        
        print("[DEBUG] history_data is not a list, returning empty string")
        return ""

    def _process_retrieved_docs(self, retrieved_docs) -> list:
        """Process retrieved documents into source links."""
        source_links = []
        sources = []
        for doc in retrieved_docs:
            source = doc.metadata.get("source")
            sources.append(source)
            page_number = doc.metadata.get("page_number")
            if source and page_number:
                source_links.append(f"{source} (Page: {page_number})")

        context = "\n\n".join(doc.page_content for doc in retrieved_docs)
        return source_links, sources, context
    
    def QA(self, question: str, memory) -> tuple[str, list, str, dict]:
        """
        Process a medical question through the full QA pipeline.

        Args:
            question: User's input question
            memory: Conversation memory object

        Returns:
            Tuple containing:
                - str: Generated answer
                - list: Source documents  
                - str: Generated response heading
                - dict: Response metadata (intent, urgency, etc.)
        """
        # Ensure all components are initialized before processing
        self._ensure_initialized()
        
        processing_start_time = time.time()

        # Generate heading
        heading = self._generate_heading(question)

        # Process conversation history
        history_text = self._format_conversation_history(memory, question)

        # Validate question
        try:
            valid, message = self.validator.validate(question, history_text)
            if not valid:
                self.logger.log_processing_time(time.time() - processing_start_time)
                return message, [], heading, {"intent": "validation_failed", "urgency": "low"}
        except ValidationError as ve:
            return str(ve), [], heading, {"intent": "validation_error", "urgency": "low"}
            
        # Detect intent for dynamic response
        intent_data = self._detect_intent(question, history_text)
        print(f"[DEBUG] Using intent data: {intent_data}")
        
        # Handle malicious intent immediately
        if intent_data.get("intent") == "malicious":
            self.logger.log_processing_time(time.time() - processing_start_time)
            return "I can't help with that request.", [], heading, {"intent": "malicious", "urgency": "blocked"}
        
        # Handle clarification needed
        if intent_data.get("intent") == "clarification_needed":
            clarification_response = self._generate_clarification_response(intent_data, question)
            response_metadata = {
                "intent": "clarification_needed",
                "focus_area": intent_data.get("focus_area", ""),
                "urgency": intent_data.get("urgency", "low"),
                "needs_clarification": intent_data.get("needs_clarification", "")
            }
            self.logger.log_processing_time(time.time() - processing_start_time)
            return clarification_response, [], heading, response_metadata

        # If question is valid, retrieve the relevant documents
        retrieval_start = time.time()
        memory_usage_before = self.memory_metrics.get_memory_usage()  # Memory before retrieval
        retriever = self.vectordb.as_retriever(search_type="mmr", search_kwargs={"k": 3})
        try:
            retrieved_docs = retriever.invoke(question)
        except Exception as e:
            print(f"Error retrieving documents: {e}")
            retrieved_docs = []

        # Record embedding size during retrieval (or wherever embeddings are generated)
        for doc in retrieved_docs:
            embedding = self.embeddings.embed_query(doc.page_content) #Or embed_documents if not using query
            embedding = np.array(embedding) #Converting list to np array

            self.memory_metrics.record_embedding_size(embedding)

        memory_usage_after = self.memory_metrics.get_memory_usage()  # Memory after retrieval

        # Prepare context and sources
        source_links, sources, context = self._process_retrieved_docs(retrieved_docs)
        self.logger.log_operation(
            operation="retrieval",
            start_time=retrieval_start,
            sources=sources,
            memory_usage_before=memory_usage_before,
            memory_usage_after=memory_usage_after
        )

        # Generate response
        try:
            # Chain of thought generation
            cotMessages = Prompts.build_prompt(prompt_type="cot", history=history_text, context=context, question=question)
            generation_start = time.time()
            memory_usage_before = self.memory_metrics.get_memory_usage() 

            # Count tokens and generate
            input_tokens = self.utils.count_tokens(str(cotMessages))
            cotResponse = self.client.chat_completion(
                messages=cotMessages,
                max_tokens=2000,
            )
            cotResponseText = cotResponse.choices[0].message.content.strip()
            print("--------------------------\nCOT Response: \n", cotResponseText)
            output_tokens = self.utils.count_tokens(cotResponseText)

            memory_usage_after = self.memory_metrics.get_memory_usage()  # Memory after generation
            # Log generation metrics
            self.logger.log_operation(
                operation="chain of thought",
                tokens=input_tokens + output_tokens,
                start_time=generation_start,
                question=question,
                context=context,
                response=cotResponseText,
                memory_usage_before=memory_usage_before,
                memory_usage_after=memory_usage_after
            )
        except Exception as e:
            cotResponseText = "" #Set cot response to empty string, to avoid errors
            print(f"Error generating chain of thought: {e}")

        ############## Main prompt generation  
        try:
            # Check if Student COT is being used (for filtering)
            use_filtered_cot = (cotResponseText and "QUESTION TYPE IDENTIFIED:" in cotResponseText)
            
            # Build dynamic prompts based on intent
            mainMessages = Prompts.build_prompt(
                prompt_type="main", 
                history=history_text, 
                context=context, 
                question=question, 
                intent_data=intent_data,
                cot=cotResponseText,
                use_filtered_cot=use_filtered_cot
            )
            
            generation_start = time.time()
            memory_usage_before = self.memory_metrics.get_memory_usage()

            # Get dynamic parameters based on intent - increased limits for complete responses
            if intent_data.get('intent') == 'quick_answer':
                max_tokens, temperature = 800, 0.1
            elif intent_data.get('intent') == 'emergency':
                max_tokens, temperature = 1000, 0.2
            elif intent_data.get('intent') == 'specific_info' and intent_data.get('focus_area') in ['treatment', 'surgical_plan', 'medications']:
                max_tokens, temperature = 1500, 0.2  # Increased for detailed treatment plans
            elif intent_data.get('intent') == 'follow_up':
                max_tokens, temperature = 1200, 0.2  # Increased for follow-up context
            elif intent_data.get('urgency') == 'high':
                max_tokens, temperature = 1000, 0.2
            else:
                max_tokens, temperature = 1200, 0.3  # Default increased for comprehensive responses
            
            # Count tokens and generate
            input_tokens = self.utils.count_tokens(str(mainMessages))
            
            # Truncate input if too long (Llama 3.3 has ~8k context window, leave room for response)
            max_input_tokens = 6000  # Leave room for response tokens
            if input_tokens > max_input_tokens:
                print(f"Input too long ({input_tokens} tokens), truncating context...")
                # Truncate the context while keeping question and intent intact
                if len(mainMessages) > 1:
                    # Keep system message and user question, truncate middle content
                    truncated_context = context[:2000] + "...[truncated for length]"
                    mainMessages = Prompts.build_prompt(
                        prompt_type="main", 
                        history=history_text[:1000] if history_text else "", 
                        context=truncated_context, 
                        question=question, 
                        intent_data=intent_data,
                        cot=cotResponseText[:1000] if cotResponseText else "",
                        use_filtered_cot=use_filtered_cot
                    )
                    input_tokens = self.utils.count_tokens(str(mainMessages))
                    print(f"Truncated to {input_tokens} tokens")
            
            # Make LLM request with AGGRESSIVE retry logic - NEVER GIVE UP
            max_retries = 5
            base_delay = 2
            response = None
            
            for attempt in range(max_retries):
                try:
                    print(f"[DEBUG] Making main LLM request to {Config.MODEL_NAME} (attempt {attempt + 1}/{max_retries})")
                    print(f"[DEBUG] Request parameters: max_tokens={max_tokens}, temperature={temperature}")
                    
                    response = self.client.chat_completion(
                        messages=mainMessages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        top_p=0.9,
                        stream=False,  # Disable streaming for faster processing
                    )
                    print(f"[DEBUG] Main LLM request completed successfully on attempt {attempt + 1}")
                    break  # Success - exit retry loop
                    
                except Exception as e:
                    error_type = type(e).__name__
                    print(f"[ERROR] Main LLM request failed on attempt {attempt + 1}: {str(e)}")
                    print(f"[ERROR] Error type: {error_type}")
                    
                    if attempt < max_retries - 1:  # Not the last attempt
                        delay = base_delay * (2 ** attempt)  # Exponential backoff
                        print(f"[RETRY] Retrying in {delay} seconds... (attempt {attempt + 2}/{max_retries})")
                        time.sleep(delay)
                        continue
                    else:
                        # Last attempt failed - this should NEVER happen in production
                        print(f"[CRITICAL ERROR] All {max_retries} attempts failed. This system MUST work!")
                        import traceback
                        traceback.print_exc()
                        raise Exception(f"Hugging Face API failed after {max_retries} attempts. System must be operational at all costs. Error: {str(e)}")
            
            if not response:
                raise Exception("Failed to get response from Hugging Face API after all retry attempts")
            
            if response and response.choices and len(response.choices) > 0:
                responseText = response.choices[0].message.content
                output_tokens = self.utils.count_tokens(responseText)
            else:
                return "Error: Invalid response from LLM", [], heading, {"intent": "error", "urgency": "low"}

            # Process and return response
            cleaned_response = self.utils.clean_response(responseText).rstrip()
            if memory is not None and not isinstance(memory, list):
                # Only save context if memory is a LangChain memory object, not a list from backend
                memory.save_context({"input": question}, {"response": cleaned_response})
            
            memory_usage_after = self.memory_metrics.get_memory_usage()

            # Log generation metrics with intent info
            self.logger.log_operation(
                operation="generation",
                tokens=input_tokens + output_tokens,
                start_time=generation_start,
                question=question,
                context=context,
                response=cleaned_response,
                memory_usage_before=memory_usage_before,
                memory_usage_after=memory_usage_after,
                intent=intent_data.get("intent", "unknown")
            )

            # Log total processing time
            self.logger.log_processing_time(time.time() - processing_start_time)

            # Get performance summary
            self.logger.get_performance_summary(memory)

            # Reset tokens:
            input_tokens = 0
            output_tokens = 0

            # Return response with intent metadata
            response_metadata = {
                "intent": intent_data.get("intent"),
                "focus_area": intent_data.get("focus_area"),
                "urgency": intent_data.get("urgency"),
                "main_condition": intent_data.get("main_condition", "")
            }
            
            return cleaned_response, source_links, heading, response_metadata

        except Exception as e:
            try:
                memory_usage_after = self.memory_metrics.get_memory_usage()
                self.logger.log_operation(operation="generation", is_error=True, memory_usage_before=memory_usage_before, memory_usage_after=memory_usage_after)
            except:
                pass
            return f"An error occurred: {str(e)}", [], heading, {"intent": "error", "urgency": "low", "main_condition": "", "focus_area": ""}


if __name__ == "__main__":
    llm = SurgicalLLM()