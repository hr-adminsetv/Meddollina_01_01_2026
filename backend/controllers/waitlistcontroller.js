import mongoose from "mongoose";
import Waitlist from "../models/waitlist.js";
import Counter from "../models/counter.js";
import azureBlobService from "../services/azureBlobService.js";

export const submitWaitlist = async (req, res) => {
  // Ensure DB connection is ready before trying to write
  // mongoose.connection.readyState === 1 means connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message:
        "Database not connected. Set MONGO_URI in backend/.env to enable persistent storage.",
    });
  }

  try {
    // Parse form data
    const formData = req.body;
    
    // Check for duplicate email first
    const existingEntry = await Waitlist.findOne({ email: formData.email });
    if (existingEntry) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered in the waitlist",
      });
    }
    
    // Get next waitlist number atomically (start from 546 so first user gets 547)
    const counter = await Counter.findOneAndUpdate(
      { _id: 'waitlist' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    
    // Calculate waitlist number (start from 547)
    const waitlistNumber = counter.seq + 546;
    
    let studentIdDocumentUrl = null;
    
    // Handle student ID file upload for students
    if (req.file && formData.type === 'Medical Student') {
      const studentIdFile = req.file;
      
      console.log('[Waitlist] Form data received:', formData);
      console.log('[Waitlist] First name from formData:', formData.firstName);
      
      try {
        // Upload to Azure
        const uploadResult = await azureBlobService.uploadStudentIdCard(
          studentIdFile.buffer,
          {
            email: formData.email,
            firstName: formData.firstName,
            studentId: formData['academic.studentIdOrRollNumber'] || formData.studentId,
            fileName: studentIdFile.originalname,
            mimeType: studentIdFile.mimetype
          }
        );
        
        studentIdDocumentUrl = uploadResult.url;
        console.log('[Waitlist] Student ID uploaded to Azure:', studentIdDocumentUrl);
      } catch (uploadError) {
        console.error('[Waitlist] Student ID upload failed:', uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload student ID. Please try again.",
        });
      }
    }
    
    // Prepare waitlist data
    const waitlistData = {
      waitlistNumber: waitlistNumber,
      type: formData.type,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
    };
    
    // Add professional-specific fields
    if (formData.type === 'Healthcare Professional') {
      waitlistData.profession = formData.profession;
      waitlistData.department = formData.department;
      waitlistData.specialization = formData.specialization;
      waitlistData.yearsOfExperience = formData.yearsOfExperience;
      waitlistData.licenseId = formData.licenseId;
      waitlistData.practice = {
        hospitalOrInstitutionName: formData['practice.hospitalOrInstitutionName'],
        city: formData['practice.city'],
        country: formData['practice.country'],
      };
    }
    
    // Add student-specific fields
    if (formData.type === 'Medical Student') {
      waitlistData.academic = {
        programType: formData['academic.programType'],
        studentIdOrRollNumber: formData['academic.studentIdOrRollNumber'],
        studentIdDocumentUrl: studentIdDocumentUrl,
        expectedGraduationYear: formData['academic.expectedGraduationYear'] ? parseInt(formData['academic.expectedGraduationYear']) : null,
        collegeOrUniversityName: formData['academic.collegeOrUniversityName'],
        collegeCity: formData['academic.collegeCity'],
        collegeCountry: formData['academic.collegeCountry'],
      };
    }
    
    // Create waitlist entry
    const waitlistEntry = await Waitlist.create(waitlistData);

    return res.status(201).json({
      success: true,
      message: "Waitlist form submitted successfully",
      data: waitlistEntry,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered in the waitlist",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
