/**
 * Check user password in MongoDB
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://setv2024:setv2024@meddollina.wtngt6e.mongodb.net/meddollina?retryWrites=true&w=majority";

async function checkPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    const User = mongoose.model('User', require('./models/users.js').schema);
    
    // Find the user
    const user = await User.findOne({ email: 'aarnav.kapoors@hospital.com' });
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('\n=== USER DATA ===');
    console.log('Email:', user.email);
    console.log('First Name:', user.firstName);
    console.log('Last Name:', user.lastName);
    console.log('Has Password:', !!user.password);
    
    if (user.password) {
      console.log('Password Hash Length:', user.password.length);
      console.log('Password Hash starts with:', user.password.substring(0, 20) + '...');
      console.log('Password Hash full:', user.password);
    }
    
    // Check all fields
    console.log('\n=== ALL FIELDS ===');
    Object.keys(user.toObject()).forEach(key => {
      if (key !== 'password') {
        console.log(`${key}:`, user[key]);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPassword();
