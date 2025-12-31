import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Waitlist from '../models/waitlist.js';

dotenv.config();

async function checkWaitlist() {
  try {
    console.log('🔍 Checking Waitlist in MongoDB...\n');
    
    const uri = process.env.MONGO_URI;
    console.log('📍 MongoDB URI:', uri.replace(/:[^:@]+@/, ':****@'));
    
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully!\n');
    
    const dbName = mongoose.connection.name;
    console.log(`📊 Database Name: ${dbName}\n`);
    
    // Count waitlist entries
    const waitlistCount = await Waitlist.countDocuments();
    console.log(`📋 Total Waitlist Entries: ${waitlistCount}\n`);
    
    if (waitlistCount > 0) {
      console.log('📋 Recent Waitlist Entries (Last 10):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const entries = await Waitlist.find({})
        .sort({ createdAt: -1 })
        .limit(10);
      
      entries.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.email}`);
        console.log(`   Name: ${entry.firstName} ${entry.lastName}`);
        console.log(`   Type: ${entry.type}`);
        console.log(`   Status: ${entry.status}`);
        console.log(`   Created: ${new Date(entry.createdAt).toLocaleString()}`);
        
        if (entry.type === 'Healthcare Professional') {
          console.log(`   Profession: ${entry.profession}`);
          console.log(`   Hospital: ${entry.practice?.hospitalOrInstitutionName}`);
        }
        
        if (entry.type === 'Medical Student') {
          console.log(`   College: ${entry.academic?.collegeOrUniversityName}`);
          console.log(`   Graduation: ${entry.academic?.expectedGraduationYear}`);
        }
        
        console.log('');
      });
    } else {
      console.log('⚠️  No waitlist entries found!');
      console.log('   Submit the form to create entries.');
    }
    
    await mongoose.connection.close();
    console.log('✅ Check complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkWaitlist();
