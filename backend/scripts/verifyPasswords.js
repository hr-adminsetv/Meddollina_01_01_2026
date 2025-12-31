import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/users.js';

dotenv.config();

const testCredentials = [
  { email: 'doctor@meddollina.com', password: 'Meddollina2024' },
  { email: 'test@meddollina.com', password: 'Test123!' },
  { email: 'admin@meddollina.com', password: 'Admin123!' },
];

async function verifyPasswords() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log(`📍 URI: ${process.env.MONGO_URI.substring(0, 50)}...\n`);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    console.log(`📊 Database: ${mongoose.connection.name}\n`);
    
    console.log('🔐 Verifying Passwords:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    for (const cred of testCredentials) {
      const user = await User.findOne({ email: cred.email }).select('+password');
      
      if (!user) {
        console.log(`❌ ${cred.email}`);
        console.log(`   User NOT FOUND in database\n`);
        continue;
      }
      
      const isValid = await bcrypt.compare(cred.password, user.password);
      
      if (isValid) {
        console.log(`✅ ${cred.email}`);
        console.log(`   Password: ${cred.password}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Status: PASSWORD WORKS ✓\n`);
      } else {
        console.log(`❌ ${cred.email}`);
        console.log(`   Password: ${cred.password}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Status: PASSWORD INCORRECT ✗\n`);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.disconnect();
    console.log('✅ Verification complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyPasswords();
