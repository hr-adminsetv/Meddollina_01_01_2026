"""
Utility functions for token management and response processing.

Classes:
    Utils: Provides token counting and response cleaning functionality.
"""

import re
from transformers import AutoTokenizer

class Utils:
    """
    A utility class for token management and text processing.

    Attributes:
        tokenizer: Pretrained tokenizer from HuggingFace
        total_input_tokens: Cumulative count of input tokens
        total_output_tokens: Cumulative count of output tokens
    """

    def __init__(self, model_name: str):
        """
        Initialize the Utils instance.

        Args:
            model_name: Name of the pretrained model to load tokenizer for
        """
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        except Exception as e:
            print(f"Warning: Could not load tokenizer for {model_name}: {e}")
            print("Using fallback tokenizer...")
            try:
                # Try a fallback tokenizer that's more compatible
                self.tokenizer = AutoTokenizer.from_pretrained("gpt2")
            except Exception as e2:
                print(f"Warning: Could not load fallback tokenizer: {e2}")
                self.tokenizer = None
        
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in a given text string.

        Args:
            text: Input text to tokenize

        Returns:
            Number of tokens in the text
        """
        if self.tokenizer is None:
            # Fallback: approximate token count (roughly 4 characters per token)
            return len(text) // 4
        
        try:
            tokens = self.tokenizer.encode(text, return_tensors="pt")
            return tokens.shape[1] # Return the number of tokens
        except Exception as e:
            print(f"Warning: Error counting tokens: {e}")
            # Fallback: approximate token count
            return len(text) // 4

    def clean_response(self, response: str) -> str:
        """
        Clean and format LLM response text.

        Args:
            response: Raw response text from LLM

        Returns:
            Cleaned and formatted response text
        """
        lines = response.splitlines()
        cleaned_lines = []
        previous_line_empty = True
        
        for line in lines:
            cleaned_line = re.sub(r"(?i)(?:Please provide.?\.|Here['']s.?:|Let me explain:|According to the data:|In summary:|Explanation:|Clarification:|Here is my response:|AI Assistant:|Response:|Answer:|System:)", "", line).strip()
            if cleaned_line:
                if previous_line_empty:
                    cleaned_lines.append("")
                    previous_line_empty = False
                cleaned_lines.append(cleaned_line)
            else:
                if not previous_line_empty:
                    previous_line_empty = True

        result = []
        blank_count = 0
        for line in cleaned_lines:
            if line == "":
                blank_count += 1
            else:
                blank_count = 0
            if blank_count <= 1:
                result.append(line)

        return "\n".join(result).strip()
