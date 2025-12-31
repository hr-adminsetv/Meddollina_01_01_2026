/**
 * Check user password through backend connection
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Use the same connection as backend
mongoose.connect('mongodb+srv://setv2024:setv2024@meddollina.wtngt6e.mongodb.net/meddollina?retryWrites=true&w=majority');

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  profession: String
});

const User = mongoose.model('User', userSchema);

async function checkUserPassword() {
  try {
    const user = await User.findOne({ email: 'aarnav.kapoors@hospital.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:', user.firstName, user.lastName);
    console.log('Password exists:', !!user.password);
    
    if (user.password) {
      console.log('Password length:', user.password.length);
      console.log('Password starts with $2a$ or $2b$:', user.password.startsWith('$2'));
      
      // Test with common passwords
      const testPasswords = ['password', '123456', 'personalizing', 'meddollina', 'test'];
      
      if (user.password.startsWith('$2')) {
        // Hashed password
        console.log('\nTesting hashed password against common passwords:');
        for (const pwd of testPasswords) {
          const valid = await bcrypt.compare(pwd, user.password);
          console.log(`- "${pwd}": ${valid ? '✅ VALID' : '❌ invalid'}`);
        }
      } else {
        // Plain text password
        console.log('\nPlain text password detected');
        console.log('Stored password:', user.password);
        console.log('\nTesting against common passwords:');
        for (const pwd of testPasswords) {
          const valid = user.password === pwd;
          console.log(`- "${pwd}": ${valid ? '✅ VALID' : '❌ invalid'}`);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserPassword();
