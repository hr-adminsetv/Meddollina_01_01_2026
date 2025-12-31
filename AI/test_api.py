"""
Test script for Flask AI Service
Tests the API endpoints without starting the full server
"""

import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

def test_imports():
    """Test that all required modules can be imported"""
    print("🔍 Testing imports...")
    
    try:
        from flask import Flask
        print("✅ Flask imported successfully")
    except ImportError as e:
        print(f"❌ Flask import failed: {e}")
        return False
    
    try:
        from dotenv import load_dotenv
        print("✅ python-dotenv imported successfully")
    except ImportError as e:
        print(f"❌ python-dotenv import failed: {e}")
        return False
    
    try:
        from huggingface_hub import InferenceClient
        print("✅ huggingface_hub imported successfully")
    except ImportError as e:
        print(f"❌ huggingface_hub import failed: {e}")
        return False
    
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
        print("✅ langchain-huggingface imported successfully")
    except ImportError as e:
        print(f"❌ langchain-huggingface import failed: {e}")
        return False
    
    try:
        from langchain_chroma import Chroma
        print("✅ langchain-chroma imported successfully")
    except ImportError as e:
        print(f"❌ langchain-chroma import failed: {e}")
        return False
    
    return True

def test_config():
    """Test configuration loading"""
    print("\n🔍 Testing configuration...")
    
    try:
        from LLM.config import Config
        print("✅ Config class imported successfully")
        
        # Check HF token
        if Config.HF_TOKEN:
            print(f"✅ HF_TOKEN is set (length: {len(Config.HF_TOKEN)})")
        else:
            print("⚠️  HF_TOKEN is not set")
        
        # Check model name
        print(f"✅ MODEL_NAME: {Config.MODEL_NAME}")
        
        # Check vector DB path
        print(f"✅ VECTOR_DB_PATH: {Config.VECTOR_DB_PATH}")
        
        # Check if vector DB exists
        import os
        if os.path.exists(Config.VECTOR_DB_PATH):
            print(f"✅ Vector database exists at {Config.VECTOR_DB_PATH}")
        else:
            print(f"⚠️  Vector database not found at {Config.VECTOR_DB_PATH}")
        
        return True
    except Exception as e:
        print(f"❌ Config test failed: {e}")
        return False

def test_flask_app():
    """Test Flask app creation"""
    print("\n🔍 Testing Flask app...")
    
    try:
        from app import app
        print("✅ Flask app imported successfully")
        
        # Test client
        with app.test_client() as client:
            # Test root endpoint
            response = client.get('/')
            if response.status_code == 200:
                print("✅ Root endpoint (/) works")
                print(f"   Response: {response.json}")
            else:
                print(f"❌ Root endpoint failed: {response.status_code}")
                return False
            
            # Test health endpoint
            response = client.get('/api/health')
            if response.status_code in [200, 503]:  # 503 if LLM not initialized yet
                print(f"✅ Health endpoint (/api/health) works (status: {response.status_code})")
                print(f"   Response: {response.json}")
            else:
                print(f"❌ Health endpoint failed: {response.status_code}")
                return False
        
        return True
    except Exception as e:
        print(f"❌ Flask app test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_llm_initialization():
    """Test LLM initialization (basic check)"""
    print("\n🔍 Testing LLM initialization...")
    
    try:
        from LLM.main import SurgicalLLM
        from LLM.config import Config
        
        print("✅ SurgicalLLM class imported successfully")
        
        # Try to create instance (won't fully initialize heavy models)
        llm = SurgicalLLM(Config())
        print("✅ SurgicalLLM instance created")
        
        if not llm._initialized:
            print("ℹ️  Heavy models not yet loaded (lazy initialization)")
        
        return True
    except Exception as e:
        print(f"❌ LLM initialization test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def run_all_tests():
    """Run all tests"""
    print("=" * 80)
    print("🧪 FLASK AI SERVICE - TEST SUITE")
    print("=" * 80)
    
    results = {
        "Imports": test_imports(),
        "Configuration": test_config(),
        "Flask App": test_flask_app(),
        "LLM Initialization": test_llm_initialization()
    }
    
    print("\n" + "=" * 80)
    print("📊 TEST RESULTS")
    print("=" * 80)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name:<25} {status}")
    
    print("=" * 80)
    
    all_passed = all(results.values())
    
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("\n✅ Flask AI Service is ready to run")
        print("   Start with: python3 app.py")
    else:
        print("⚠️  SOME TESTS FAILED")
        print("   Please fix the issues above before starting the service")
    
    print("=" * 80)
    
    return all_passed

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
