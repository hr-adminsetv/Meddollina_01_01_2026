"""
Independent Summarization Service
This service provides medical text summarization without interfering with the main Meddollina AI
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import traceback
from huggingface_hub import InferenceClient

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5000", "http://localhost:8080"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Global LLM client
summarizer_client = None

def get_summarizer_client():
    """Get or initialize the summarizer client"""
    global summarizer_client
    
    if summarizer_client is not None:
        return summarizer_client
    
    try:
        print("Initializing Summarizer LLM client...")
        summarizer_client = InferenceClient(
            model="meta-llama/Llama-3.3-70B-Instruct",
            token=os.getenv('HF_TOKEN'),
            timeout=60
        )
        print("Summarizer client initialized successfully")
        return summarizer_client
    except Exception as e:
        print(f"Failed to initialize summarizer client: {e}")
        raise e

# API Key validation middleware
def validate_api_key():
    """Validate API key from request headers"""
    api_key = request.headers.get('X-API-Key')
    expected_key = os.getenv('AI_API_KEY', 'meddollina-internal-api-key-2024')
    
    if api_key != expected_key:
        return jsonify({
            'success': False,
            'message': 'Invalid or missing API key'
        }), 401
    
    return None

@app.before_request
def before_request():
    """Run before each request"""
    # Skip API key validation for health check
    if request.path == '/api/health':
        return None
    
    # Validate API key for all other endpoints
    if request.path.startswith('/api/'):
        error_response = validate_api_key()
        if error_response:
            return error_response

@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'Meddollina Summarization Service',
        'version': '1.0.0',
        'status': 'running'
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        client = get_summarizer_client()
        return jsonify({
            'success': True,
            'status': 'healthy',
            'service': 'summarization',
            'model': 'meta-llama/Llama-3.3-70B-Instruct'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/api/summarize', methods=['POST'])
def summarize_text():
    """
    Summarize medical text with strict constraints
    
    Expected JSON body:
    {
        "content": "text to summarize",
        "type": "medical|diagnostic|treatment",
        "max_length": 250  # optional, default 250 words
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'content' not in data:
            return jsonify({
                'success': False,
                'message': 'Content is required'
            }), 400
        
        content = data['content']
        summary_type = data.get('type', 'medical')
        max_words = data.get('max_length', 250)
        
        # Get LLM client
        client = get_summarizer_client()
        
        # Calculate content statistics
        content_words = len(content.split())
        content_chars = len(content)
        
        # Build strict summarization prompt
        summary_prompt = f"""MEDICAL TEXT SUMMARIZATION

You MUST create a concise medical summary. This is a SUMMARIZATION task - condense the information, do not repeat it.

Original Text ({content_chars} characters, {content_words} words):
{content}

CRITICAL REQUIREMENTS:
• Summary MUST be under {max_words} words
• Aim for 10-20% of original length
• Use bullet points for key information
• Extract ONLY: symptoms, diagnosis, treatment, medications, prognosis
• NO conversational filler or verbose explanations
• Focus on actionable medical insights

CONCISE SUMMARY:"""

        messages = [
            {"role": "system", "content": "You are a medical summarizer that creates brief bullet-point summaries. Always condense to 10-20% of original length."},
            {"role": "user", "content": summary_prompt}
        ]
        
        # Generate summary with strict limits
        response = client.chat_completion(
            messages=messages,
            max_tokens=300,  # Strict token limit
            temperature=0.2  # Lower temperature for consistency
        )
        
        summary = response.choices[0].message.content.strip()
        
        # Post-process to ensure conciseness
        summary_words = len(summary.split())
        if summary_words > max_words:
            # Truncate if still too long
            sentences = summary.split('. ')
            truncated = []
            word_count = 0
            for sentence in sentences:
                sentence_words = len(sentence.split())
                if word_count + sentence_words <= max_words:
                    truncated.append(sentence)
                    word_count += sentence_words
                else:
                    break
            summary = '. '.join(truncated)
            if summary and not summary.endswith('.'):
                summary += '.'
        
        return jsonify({
            'success': True,
            'data': {
                'summary': summary,
                'type': summary_type,
                'original_length': len(content),
                'original_words': content_words,
                'summary_length': len(summary),
                'summary_words': len(summary.split()),
                'compression_ratio': f"{(len(summary.split()) / content_words * 100):.1f}%"
            }
        })
        
    except Exception as e:
        print(f"Summarization error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to generate summary',
            'error': str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('SUMMARIZER_PORT', 5002))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    
    print(f"\n{'='*60}")
    print(f"📝 Starting Meddollina Summarization Service")
    print(f"{'='*60}")
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"Model: meta-llama/Llama-3.3-70B-Instruct")
    print(f"{'='*60}\n")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )
