import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/users.js';

dotenv.config();

async function checkMongoDB() {
  try {
    console.log('🔍 Checking MongoDB Connection...\n');
    
    const uri = process.env.MONGO_URI;
    console.log('📍 MongoDB URI:', uri.replace(/:[^:@]+@/, ':****@'));
    
    // Connect to MongoDB
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully!\n');
    
    // Get database name
    const dbName = mongoose.connection.name;
    console.log(`📊 Database Name: ${dbName}\n`);
    
    // Count users
    const userCount = await User.countDocuments();
    console.log(`👥 Total Users in MongoDB: ${userCount}\n`);
    
    if (userCount > 0) {
      console.log('📋 User List:');
      const users = await User.find({}, 'email firstName lastName profession').limit(10);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - ${user.firstName} ${user.lastName} (${user.profession})`);
      });
    } else {
      console.log('⚠️  No users found in MongoDB!');
      console.log('   Run: npm run seed to create test users');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Check complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ MongoDB Error:', error.message);
    process.exit(1);
  }
}

checkMongoDB();
