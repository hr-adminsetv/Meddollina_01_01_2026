# suggestions.py
from typing import List
from .main import SurgicalLLM
from .prompts import Prompts
from .config import Config

# Global variable for lazy initialization
_llm = None

def _get_llm():
    """Get or create LLM instance with lazy initialization."""
    global _llm
    if _llm is None:
        try:
            _llm = SurgicalLLM(config=Config)
        except Exception as e:
            print(f"Error initializing LLM in suggestions: {e}")
            raise e
    return _llm

def generate_suggestions(num_suggestions: int = 5) -> List[str]:
    """Generates a list of surgical question suggestions using the LLM."""
    try:
        llm = _get_llm()
        # Ensure LLM is fully initialized before using
        llm._ensure_initialized()
        suggestions = []
        for seed in range(num_suggestions):
            suggestion_messages = Prompts.build_prompt(prompt_type="suggestion")
            response = llm.client.chat_completion(
                messages=suggestion_messages,
                max_tokens=20,
                temperature=0.7,
                seed=seed  # Pass the seed parameter
            )
            suggestion = response.choices[0].message.content.strip().replace("\n", "")
            suggestions.append(suggestion)
        print(suggestions)
        return suggestions
    except Exception as e:
        print(f"Error generating suggestions: {e}")
        return []