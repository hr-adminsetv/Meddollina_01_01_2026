/**
 * Test login directly to find valid password
 */

const fetch = require('node-fetch');

async function testLogin() {
  const testPasswords = [
    'password',
    '123456',
    'personalizing',
    'meddollina',
    'test',
    'admin',
    'aarnav',
    'kapoors',
    'hospital',
    'physician'
  ];
  
  console.log('Testing login with different passwords...\n');
  
  for (const password of testPasswords) {
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'aarnav.kapoors@hospital.com',
          password: password
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`✅ SUCCESS! Password is: "${password}"`);
        console.log('User data:', data.data.user);
        break;
      } else {
        console.log(`❌ "${password}": ${data.message || 'Unauthorized'}`);
      }
    } catch (error) {
      console.log(`❌ "${password}": Network error`);
    }
  }
}

testLogin();
