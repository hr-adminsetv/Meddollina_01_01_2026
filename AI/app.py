"""
Flask AI Service for Meddollina
Wraps the SurgicalLLM and exposes REST API endpoints
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import traceback

# Load environment variables
load_dotenv()

# Import LLM components
from LLM.main import SurgicalLLM
from LLM.config import Config

app = Flask(__name__)

# Configure CORS - allow requests from Express backend
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5000", "http://localhost:8080"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Global LLM instance (lazy initialization)
surgical_llm = None
llm_init_error = None

def get_llm():
    """Get or initialize the SurgicalLLM instance"""
    global surgical_llm, llm_init_error
    
    if surgical_llm is not None:
        return surgical_llm
    
    if llm_init_error is not None:
        raise llm_init_error
    
    try:
        print("Initializing SurgicalLLM...")
        surgical_llm = SurgicalLLM(Config())
        print("SurgicalLLM initialized successfully")
        return surgical_llm
    except Exception as e:
        llm_init_error = e
        print(f"Failed to initialize LLM: {e}")
        raise e

# API Key validation middleware
def validate_api_key():
    """Validate API key from request headers"""
    api_key = request.headers.get('X-API-Key')
    expected_key = os.getenv('AI_API_KEY', 'default-dev-key')
    
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
        'service': 'Meddollina AI Service',
        'version': '1.0.0',
        'status': 'running'
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        llm = get_llm()
        return jsonify({
            'success': True,
            'status': 'healthy',
            'llm_initialized': llm._initialized,
            'model': Config.MODEL_NAME
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Process chat message with AI
    
    Expected JSON body:
    {
        "message": "user message",
        "conversation_id": "uuid",
        "history": [{"role": "user/assistant", "content": "..."}]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'success': False,
                'message': 'Message is required'
            }), 400
        
        message = data['message']
        conversation_id = data.get('conversation_id')
        history = data.get('history', [])
        ocr_content = data.get('ocr_content')
        attachments = data.get('attachments')
        system_prompt = data.get('system_prompt')
        context = data.get('context')
        
        # DEBUG: Log what we received
        print(f"[FLASK] Received request:")
        print(f"[FLASK] - Message: {message[:100]}...")
        print(f"[FLASK] - Conversation ID: {conversation_id}")
        print(f"[FLASK] - History items: {len(history) if history else 0}")
        print(f"[FLASK] - OCR content: {'YES (' + str(len(ocr_content)) + ' chars)' if ocr_content else 'NO'}")
        print(f"[FLASK] - Attachments: {len(attachments) if attachments else 0}")
        
        if ocr_content:
            print(f"[FLASK] OCR Content Preview: {ocr_content[:300]}...")
            print(f"[FLASK] OCR Content Full Length: {len(ocr_content)}")
            print(f"[FLASK] OCR Content Type: {type(ocr_content)}")
            if len(ocr_content) > 1000:
                print(f"[FLASK] ✅ OCR content has substantial data")
            else:
                print(f"[FLASK] ⚠️ OCR content seems short")
        
        # Get LLM instance
        llm = get_llm()
        
        # Process the query using QA method
        print(f"[FLASK] Processing query: {message[:100]}...")
        
        # If OCR content is present, add it to the history context with consistent formatting
        enhanced_history = history
        
        # Add system prompt if provided
        if system_prompt:
            print(f"[FLASK] ✅ Using custom system prompt ({len(system_prompt)} chars)")
            system_message = {
                'role': 'system',
                'content': system_prompt
            }
            enhanced_history = [system_message] + (history if history else [])
        elif ocr_content:
            print(f"[FLASK] ✅ Including OCR content in context ({len(ocr_content)} chars)")
            # Add OCR content as a system message with consistent format instruction
            ocr_context_message = {
                'role': 'system',
                'content': f'Additional context from user\'s documents:\n\n{ocr_content}\n\nIMPORTANT: Respond in the same format as you would for a normal medical consultation. Use this information naturally but maintain your standard response structure.'
            }
            # Insert at the beginning of history so it's always available as context
            enhanced_history = [ocr_context_message] + (history if history else [])
        else:
            print(f"[FLASK] ⚠️  No OCR content or system prompt - processing without document context")
        
        if ocr_content and not system_prompt:
            print(f"[FLASK] Enhanced history now has {len(enhanced_history)} items")
        
        answer, sources, heading, context_data = llm.QA(message, enhanced_history)
        
        return jsonify({
            'success': True,
            'data': {
                'response': answer,
                'heading': heading,
                'sources': sources,
                'tokens_used': context_data.get('tokens_used', 0),
                'processing_time': context_data.get('processing_time', 0)
            }
        })
        
    except Exception as e:
        print(f"Chat error: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to process chat message',
            'error': str(e)
        }), 500

@app.route('/api/summarize', methods=['POST'])
def summarize():
    """
    Summarize conversation or text
    
    Expected JSON body:
    {
        "content": "text to summarize",
        "type": "medical|diagnostic|treatment"
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
        
        # Get LLM instance
        llm = get_llm()
        llm._ensure_initialized()
        
        # Build summarization prompt
        from LLM.prompts import Prompts
        
        summary_prompt = f"""Summarize the following medical conversation or text. 
Focus on: key symptoms, diagnoses, treatments, and recommendations.

Text to summarize:
{content}

Provide a clear, concise medical summary:"""
        
        messages = [
            {"role": "system", "content": "You are a medical AI assistant specializing in summarizing medical information."},
            {"role": "user", "content": summary_prompt}
        ]
        
        # Generate summary
        response = llm.client.chat_completion(
            messages=messages,
            max_tokens=500,
            temperature=0.3
        )
        
        summary = response.choices[0].message.content.strip()
        
        return jsonify({
            'success': True,
            'data': {
                'summary': summary,
                'type': summary_type,
                'original_length': len(content),
                'summary_length': len(summary)
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

@app.route('/api/suggestions', methods=['POST'])
def get_suggestions():
    """
    Get smart suggestions based on context
    
    Expected JSON body:
    {
        "context": "current conversation context",
        "last_message": "last user message"
    }
    """
    try:
        data = request.get_json()
        
        # Get LLM instance
        llm = get_llm()
        llm._ensure_initialized()
        
        context = data.get('context', '')
        last_message = data.get('last_message', '')
        
        # Import suggestions module
        from LLM.suggestions import get_smart_suggestions
        
        suggestions = get_smart_suggestions(context, last_message)
        
        return jsonify({
            'success': True,
            'data': {
                'suggestions': suggestions
            }
        })
        
    except Exception as e:
        print(f"Suggestions error: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to get suggestions',
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
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    
    print(f"\n{'='*60}")
    print(f"🤖 Starting Meddollina AI Service")
    print(f"{'='*60}")
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"Model: {Config.MODEL_NAME}")
    print(f"{'='*60}\n")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )
