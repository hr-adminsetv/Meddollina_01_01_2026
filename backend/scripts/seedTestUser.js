/**
 * Seed Test User Script
 * Creates a test user in MongoDB for system testing
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// User Schema (matching your User model)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profession: { type: String, required: true },
  specialization: String,
  hospitalAffiliation: String,
  yearsOfExperience: Number,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Test users to create
const testUsers = [
  {
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    email: 'doctor@meddollina.com',
    password: 'Meddollina2024',
    profession: 'Physician',
    specialization: 'Internal Medicine',
    hospitalAffiliation: 'General Hospital',
    yearsOfExperience: 10
  },
  {
    firstName: 'Dr. Michael',
    lastName: 'Chen',
    email: 'test@meddollina.com',
    password: 'Test123!',
    profession: 'Surgeon',
    specialization: 'General Surgery',
    hospitalAffiliation: 'City Medical Center',
    yearsOfExperience: 8
  },
  {
    firstName: 'Dr. Emily',
    lastName: 'Rodriguez',
    email: 'admin@meddollina.com',
    password: 'Admin123!',
    profession: 'Physician',
    specialization: 'Emergency Medicine',
    hospitalAffiliation: 'University Hospital',
    yearsOfExperience: 15
  }
];

async function seedTestUsers() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    console.log(`   URI: ${process.env.MONGO_URI?.substring(0, 30)}...`);
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check existing users
    const existingCount = await User.countDocuments();
    console.log(`📊 Existing users in database: ${existingCount}\n`);

    // Create test users
    console.log('👤 Creating test users...\n');
    
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existing = await User.findOne({ email: userData.email });
        
        if (existing) {
          console.log(`⚠️  User already exists: ${userData.email}`);
          console.log(`   Name: ${userData.firstName} ${userData.lastName}`);
          console.log(`   Password: ${userData.password} (unchanged)\n`);
          continue;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // Create user
        const user = await User.create({
          ...userData,
          password: hashedPassword
        });

        console.log(`✅ Created user: ${userData.email}`);
        console.log(`   Name: ${userData.firstName} ${userData.lastName}`);
        console.log(`   Password: ${userData.password}`);
        console.log(`   Profession: ${userData.profession}`);
        console.log(`   ID: ${user._id}\n`);
        
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  Duplicate email: ${userData.email}\n`);
        } else {
          console.error(`❌ Error creating ${userData.email}:`, error.message, '\n');
        }
      }
    }

    // Display final count
    const finalCount = await User.countDocuments();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Total users in database: ${finalCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Display login credentials
    console.log('🔑 TEST LOGIN CREDENTIALS:\n');
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Role: ${user.profession}\n`);
    });

    console.log('✅ Seeding complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
seedTestUsers()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
