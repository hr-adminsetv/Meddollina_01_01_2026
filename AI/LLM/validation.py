# llm_modules/validation.py
import json
import time

from .utils import Utils
from .config import Config
from .prompts import Prompts
from .logger import PerformanceLogger
from .metrics import MemoryMetrics

class ValidationError(Exception):
    """Raised when question validation fails."""
    pass

class Validator:
    def __init__(self, client, memory_metrics: MemoryMetrics, logger: PerformanceLogger):
        self.client = client
        self.utils = Utils(Config.MODEL_NAME)
        self.memory_metrics = memory_metrics
        self.logger = logger

    def summarize(self, question: str, history_text: str) -> str:
        """
        Summarize the question and conversation history using the LLM.

        Args:
            question: User's input question
            history_text: Formatted conversation history

        Returns:
            Summary of the question or history
        """

        if question is None and history_text is None:
            raise ValidationError("Either question or history_text must be provided")
    
        # Determine which type of summarization to use
        if question is not None and history_text is None:
            summary_messages = Prompts.build_prompt(prompt_type="summarize question", question=question)
        else:
            summary_messages = Prompts.build_prompt(prompt_type="summarize history", history=history_text)

        try:
            response = self.client.chat_completion(
                messages=summary_messages,
                max_tokens=12,
            )
            summary = response.choices[0].message.content.strip()
            return summary
        except Exception as e:
            raise ValidationError(f"Summarization error: {str(e)}") from e

    def validate(self, question: str, history_text: str) -> tuple[bool, str]:
        """
        Validate if a question is medically relevant using the LLM.

        Args:
            question: User's input question
            history_text: Formatted conversation history

        Returns:
            Tuple containing:
                - bool: Validation result (True if relevant)
                - str: Validation message or explanation
        """
        # Check for malicious patterns FIRST - before any LLM call
        question_lower = question.lower()
        
        # Sexual misconduct patterns - explicit detection
        sexual_misconduct_patterns = [
            "take advantage",
            "advantage of",
            "sedated patient",
            "unconscious patient",
            "exploit patient",
            "inappropriate exam",
            "sexual harassment",
            "non-consensual",
            "without consent",
            "abuse patient"
        ]
        
        # Check for sexual misconduct
        for pattern in sexual_misconduct_patterns:
            if pattern in question_lower:
                # Check for combinations that are clearly malicious
                if ("doctor" in question_lower or "physician" in question_lower or "medical" in question_lower):
                    if any(word in question_lower for word in ["advantage", "exploit", "abuse", "inappropriate"]):
                        return False, "I can't help with that request."
        
        # Check for other malicious patterns
        malicious_patterns = [
            "ignore instruction",
            "bypass rule",
            "show chain of thought",
            "internal prompt",
            "fake medical",
            "forge report",
            "overdose",
            "worsen condition",
            "prescription for",
            "write me a prescription",
            "show your prompt",
            "reveal rule",
            "toxic combination"
        ]
        
        for pattern in malicious_patterns:
            if pattern in question_lower:
                return False, "I can't help with that request."
        
        # Handle simple goodbye cases
        if question.strip().lower() in ["bye", "goodbye", "exit", "quit"]:
            return False, "Goodbye! It was nice interacting with you. Feel free to return if you have more questions."
            
        # Pre-validate common medical patterns to reduce API calls
        if self._is_likely_medical(question, history_text):
            return True, ""
            
        validation_messages = Prompts.build_prompt(prompt_type="validation", history=history_text, question=question)
        start_time = time.time()
        mem_before = self.memory_metrics.get_memory_usage()
        
        try:
            response = self.client.chat_completion(
                messages=validation_messages,
                max_tokens=250,
                response_format={
                    "type": "json_object",
                    "value": {
                        "properties": {
                            "status": {"type": "string"},
                            "explanation": {"type": "string"}
                        },
                        "required": ["status", "explanation"],
                    },
                },
            )
            response_text = response.choices[0].message.content
            print("\nResponse: ", response_text)
            response_json = json.loads(response_text)
            print(response_json)
            mem_after = self.memory_metrics.get_memory_usage()
            
            self.logger.log_operation(
                operation="validation",
                tokens=self.utils.count_tokens(str(validation_messages) + response_text),
                start_time=start_time,
                memory_usage_before=mem_before,
                memory_usage_after=mem_after
            )
            
            status = response_json.get("status", "").lower()
            if status == "relevant":
                return True, ""
            elif status == "salutations":
                return False, response_json.get("explanation", "Hello! I'm Meddollina, your surgical assistant. How can I help you today?")
            elif status == "malicious":
                return False, "I can't help with that request."
            else:
                return False, response_json.get("explanation", "Not relevant")
        except json.JSONDecodeError as e:
            mem_after = self.memory_metrics.get_memory_usage()
            self.logger.log_operation("validation", is_error=True, memory_usage_before=mem_before, memory_usage_after=mem_after)
            return False, "Invalid JSON response from LLM"
        except Exception as e:
            mem_after = self.memory_metrics.get_memory_usage()
            self.logger.log_operation("validation", is_error=True, memory_usage_before=mem_before, memory_usage_after=mem_after)
            raise ValidationError(f"Validation error: {str(e)}") from e
    
    def _is_likely_medical(self, question: str, history_text: str) -> bool:
        """
        Pre-validate common medical patterns to reduce API calls.
        
        Returns True if the question is very likely medical, allowing it to skip LLM validation.
        """
        question_lower = question.lower()
        
        # Medical keywords that indicate high likelihood of medical relevance
        medical_keywords = [
            'symptom', 'symptoms', 'pain', 'ache', 'hurt', 'surgery', 'surgical', 'operation',
            'doctor', 'physician', 'hospital', 'clinic', 'treatment', 'medicine', 'medication',
            'diagnosis', 'diagnose', 'disease', 'condition', 'illness', 'sick', 'health',
            'infection', 'fever', 'headache', 'nausea', 'vomiting', 'bleeding', 'swelling',
            'recovery', 'healing', 'wound', 'injury', 'fracture', 'broken', 'sprain',
            'cancer', 'tumor', 'cyst', 'rash', 'allergic', 'allergy', 'chest pain',
            'abdomen', 'stomach', 'liver', 'kidney', 'heart', 'lung', 'brain', 'spine',
            'blood', 'pressure', 'diabetic', 'diabetes', 'hypertension', 'medication',
            'prescription', 'dosage', 'side effect', 'complication', 'emergency',
            'urgent', 'acute', 'chronic', 'patient', 'medical history'
        ]
        
        # Temporal medical contexts that should be accepted
        temporal_medical = [
            'days ago', 'weeks ago', 'months ago', 'years ago', 'yesterday', 'last week',
            'last month', 'since', 'after', 'before', 'during', 'following', 'prior to',
            'recently', 'lately', 'ongoing', 'persistent', 'recurring', 'intermittent'
        ]
        
        # Check for medical keywords
        for keyword in medical_keywords:
            if keyword in question_lower:
                return True
        
        # Check for temporal medical contexts combined with any health indicators
        health_indicators = ['feel', 'feeling', 'experience', 'experiencing', 'having', 'been', 'was', 'got', 'developed']
        
        for temporal in temporal_medical:
            if temporal in question_lower:
                for indicator in health_indicators:
                    if indicator in question_lower:
                        return True
        
        # Check if there's relevant medical context in history
        if history_text:
            history_lower = history_text.lower()
            for keyword in medical_keywords[:15]:  # Check first 15 most common ones
                if keyword in history_lower and len(question.split()) <= 10:  # Short follow-up questions
                    return True
        
        return False
