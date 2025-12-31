import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/users.js';

dotenv.config();

async function checkUser() {
  try {
    const email = 'test@meddollina.com';
    const password = 'Test123!';
    
    console.log('🔍 Checking User Login...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log(`❌ User NOT FOUND: ${email}\n`);
      console.log('Available users:');
      const allUsers = await User.find({}, 'email firstName lastName').limit(10);
      allUsers.forEach(u => console.log(`   - ${u.email}`));
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`✅ User Found: ${email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Profession: ${user.profession}\n`);
    
    // Check password format
    console.log('🔐 Password Analysis:');
    console.log(`   Stored Password: ${user.password.substring(0, 20)}...`);
    console.log(`   Password Length: ${user.password.length}`);
    console.log(`   Starts with $2: ${user.password.startsWith('$2')}`);
    console.log(`   Is Hashed: ${user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')}\n`);
    
    // Test password
    console.log('🧪 Testing Password Match:');
    console.log(`   Testing with: "${password}"\n`);
    
    if (user.password.startsWith('$2')) {
      // Hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`   Bcrypt Compare Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      
      if (!isMatch) {
        console.log('\n⚠️  Password does not match!');
        console.log('   Possible reasons:');
        console.log('   1. Wrong password provided');
        console.log('   2. User was created with different password');
        console.log('   3. Password was changed but not updated');
      }
    } else {
      // Plain text password
      const isMatch = password === user.password;
      console.log(`   Plain Text Compare: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      console.log(`   Expected: "${password}"`);
      console.log(`   Got: "${user.password}"`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await mongoose.disconnect();
    console.log('\n✅ Check complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();
