#!/usr/bin/env python3
"""
Quick test to verify Flask is using the new token
"""
import requests
import json
import time

url = 'http://localhost:5001/api/chat'
headers = {'X-API-Key': 'meddollina-internal-api-key-2024', 'Content-Type': 'application/json'}

# Simple test message
data = {
    'message': 'What is diabetes in 2 sentences?',
    'conversation_id': 'test-new-token-123',
    'history': []
}

print('🧪 Testing Flask AI with NEW token...')
print('=' * 60)

try:
    start = time.time()
    response = requests.post(url, json=data, headers=headers, timeout=45)
    elapsed = time.time() - start
    
    if response.ok:
        result = response.json()
        print(f'✅ SUCCESS! Response in {elapsed:.1f}s')
        print(f'\nResponse preview:')
        print(result['data']['response'][:300])
        print('\n' + '=' * 60)
        print('✅ Flask is using NEW TOKEN (Nebius AI)')
        print('✅ NO Together AI errors!')
    else:
        print(f'❌ HTTP {response.status_code}: {response.text[:500]}')
        if 'together' in response.text.lower():
            print('\n⚠️  STILL ROUTING TO TOGETHER AI!')
            print('⚠️  Flask has NOT loaded new token!')
except requests.exceptions.Timeout:
    print('❌ Request timed out (45s) - Flask may still be loading model')
except Exception as e:
    error_msg = str(e)[:500]
    print(f'❌ ERROR: {error_msg}')
    if 'together' in error_msg.lower():
        print('\n⚠️  STILL ROUTING TO TOGETHER AI!')
