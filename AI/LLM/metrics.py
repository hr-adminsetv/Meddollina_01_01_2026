"""
Module for calculating various response quality metrics.

Classes:
    ResponseMetricsCalculator: Handles calculation of response quality metrics like readability,
                      coherence, hallucination rate, and redundancy.
    MemoryMetrics: Handles logic for memory utilization metrics.
"""

from textstat import flesch_reading_ease
from typing import Dict
import psutil
import os
import numpy as np

# Import heavy dependencies only when needed
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SentenceTransformer = None
    SENTENCE_TRANSFORMERS_AVAILABLE = False

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    spacy = None
    SPACY_AVAILABLE = False

try:
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    cosine_similarity = None
    SKLEARN_AVAILABLE = False

class ResponseMetricsCalculator:
    """
    Calculate various quality metrics for generated responses.

    Attributes:
        sentence_model: SentenceTransformer model for semantic similarity
        nlp: spaCy model for NLP tasks
    """

    def __init__(self):
        """Initialize the metrics calculator with required models."""
        self.sentence_model = None
        self.nlp = None
        
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                print(f"Warning: Could not load SentenceTransformer model: {e}")
                self.sentence_model = None
        else:
            print("Warning: SentenceTransformers not available")
            
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load('en_core_web_sm')
            except Exception as e:
                print(f"Warning: Could not load spaCy model: {e}")
                self.nlp = None
        else:
            print("Warning: spaCy not available")

    def calculate_readability(self, text: str) -> float:
        """
        Calculate Flesch Reading Ease score for the text.

        Args:
            text: Input text to analyze

        Returns:
            float: Readability score (0-100, higher is more readable)
        """
        return flesch_reading_ease(text)

    def calculate_coherence(self, question: str, context: str, response: str) -> float:
        """
        Calculate semantic coherence between question, context, and response.

        Args:
            question: Original question
            context: Retrieved context
            response: Generated response

        Returns:
            float: Coherence score (0-1, higher is more coherent)
        """
        if self.sentence_model is None or not SKLEARN_AVAILABLE:
            print("Warning: SentenceTransformer model or sklearn not available, returning default coherence score")
            return 0.5
            
        try:
            # Encode texts
            embeddings = self.sentence_model.encode([question, context, response])

            # Calculate pairwise similarities
            similarities = cosine_similarity(embeddings)

            # Average of question-response and context-response similarities
            q_r_similarity = similarities[0][2]
            c_r_similarity = similarities[1][2]
        except Exception as e:
            print(f"Warning: Error calculating coherence: {e}")
            return 0.5

        return (q_r_similarity + c_r_similarity) / 2

    def calculate_hallucination_rate(self, response: str, context: str) -> float:
        """
        Estimate hallucination rate by comparing entities and facts in response vs context.

        Args:
            response: Generated response
            context: Source context

        Returns:
            float: Estimated hallucination rate (0-1, lower is better)
        """
        if self.nlp is None:
            print("Warning: spaCy model not available, returning default hallucination rate")
            return 0.1
            
        try:
            # Process texts
            response_doc = self.nlp(response)
            context_doc = self.nlp(context)

            # Extract named entities
            response_ents = set([ent.text.lower() for ent in response_doc.ents])
            context_ents = set([ent.text.lower() for ent in context_doc.ents])

            # Calculate entity overlap
            if not response_ents:
                return 0.0

            unsupported_ents = response_ents - context_ents
            hallucination_rate = len(unsupported_ents) / len(response_ents)

            return hallucination_rate
        except Exception as e:
            print(f"Warning: Error calculating hallucination rate: {e}")
            return 0.1

    def calculate_redundancy_rate(self, text: str) -> float:
        """
        Calculate redundancy rate using n-gram overlap.

        Args:
            text: Input text to analyze

        Returns:
            float: Redundancy rate (0-1, lower is better)
        """
        if self.nlp is None or self.sentence_model is None or not SKLEARN_AVAILABLE:
            print("Warning: Required models not available for redundancy calculation, returning default")
            return 0.1
            
        try:
            # Process text
            doc = self.nlp(text)
            sentences = [sent.text.lower() for sent in doc.sents]

            if len(sentences) <= 1:
                return 0.0

            # Calculate sentence embeddings
            embeddings = self.sentence_model.encode(sentences)

            # Calculate pairwise similarities between sentences
            similarities = cosine_similarity(embeddings)
        except Exception as e:
            print(f"Warning: Error calculating redundancy: {e}")
            return 0.1

        # Calculate average similarity excluding self-similarity
        n = len(sentences)
        total_similarity = 0
        count = 0

        for i in range(n):
            for j in range(i + 1, n):
                total_similarity += similarities[i][j]
                count += 1

        redundancy_rate = total_similarity / count if count > 0 else 0
        return redundancy_rate

    def get_all_metrics(self, question: str, context: str, response: str) -> Dict[str, float]:
        """
        Calculate all response quality metrics.

        Args:
            question: Original question
            context: Retrieved context
            response: Generated response

        Returns:
            Dict containing all calculated metrics
        """
        return {
            'readability_score': self.calculate_readability(response),
            'coherence_score': self.calculate_coherence(question, context, response),
            'hallucination_rate': self.calculate_hallucination_rate(response, context),
            'redundancy_rate': self.calculate_redundancy_rate(response)
        }


class MemoryMetrics:
    """
    A class to monitor and measure memory and resource utilization.
    """

    def __init__(self, vectordb_path: str):
        """Initialize the MemoryMetrics class."""
        self.process = psutil.Process(os.getpid())
        self.vectordb_path = vectordb_path
        self.total_embedding_size = 0
        self.BYTES_TO_KB = 1024

    def get_cpu_utilization(self) -> float:
        """Get the current CPU utilization as a percentage."""
        return self.process.cpu_percent(interval=None)

    def get_memory_usage(self) -> float:  # Return KB
        """Get the current memory usage in kilobytes."""
        return self.process.memory_info().rss / self.BYTES_TO_KB  # Resident Set Size (RSS) in KB

    def record_embedding_size(self, embedding: np.ndarray) -> None:
        """Record the size of an embedding."""
        self.total_embedding_size += embedding.nbytes

    def get_total_embedding_size(self) -> float: # Return KB
        """Return the total size of embeddings generated in KB."""
        return self.total_embedding_size / self.BYTES_TO_KB 
    