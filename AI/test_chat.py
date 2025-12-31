import requests
import json

# Test Flask AI endpoint directly
url = "http://localhost:5001/api/chat"
data = {
    "message": "What is diabetes?",
    "conversation_id": "test-123",
    "history": []
}

print("Testing Flask AI endpoint...")
print(f"URL: {url}")
print(f"Request: {json.dumps(data, indent=2)}\n")

try:
    response = requests.post(url, json=data, timeout=120)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}\n")
    
    if response.status_code == 200:
        result = response.json()
        print("✅ SUCCESS!")
        print(f"\nResponse keys: {result.keys()}")
        if 'data' in result:
            print(f"Data keys: {result['data'].keys()}")
            print(f"\nHeading: {result['data'].get('heading')}")
            print(f"Response preview: {result['data'].get('response', '')[:200]}...")
            print(f"Sources: {result['data'].get('sources', [])}")
        print(f"\nFull response:\n{json.dumps(result, indent=2)}")
    else:
        print(f"❌ ERROR: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ EXCEPTION: {str(e)}")
    import traceback
    traceback.print_exc()
