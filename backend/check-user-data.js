import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/users.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find user by email
    const user = await User.findOne({ email: 'aarnav.kapoors@hospital.com' }).select('-password');
    
    if (user) {
      console.log('\n=== USER DATA FOUND ===');
      console.log('Full user document:');
      console.log(JSON.stringify(user.toObject(), null, 2));
      
      console.log('\n=== INDIVIDUAL FIELDS ===');
      console.log('firstName:', user.firstName);
      console.log('lastName:', user.lastName);
      console.log('email:', user.email);
      console.log('phoneNumber:', user.phoneNumber);
      console.log('profession:', user.profession);
      console.log('department:', user.department);
      console.log('specialization:', user.specialization);
      console.log('yearsOfExperience:', user.yearsOfExperience);
      console.log('medicalLicenseId:', user.medicalLicenseId);
      console.log('licenseExpiryDate:', user.licenseExpiryDate);
      console.log('bio:', user.bio);
      console.log('hospital:', user.hospital);
    } else {
      console.log('User not found with email: aarnav.kapoors@hospital.com');
      
      // List all users
      const allUsers = await User.find({}).select('firstName lastName email');
      console.log('\nAll users in database:');
      console.log(allUsers);
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err);
    mongoose.connection.close();
  });
