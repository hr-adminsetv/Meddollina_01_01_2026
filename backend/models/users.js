import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
    },


    profession: {
      type: String,
      enum: [
        "Physician",
        "Surgeon",
        "Medical Specialist",
        "Resident",
        "Fellow",
        "Nurse Practitioner",
        "Medical Student",
      ],
      required: true,
    },

    department: {
      type: String,
      trim: true,
    },

    specialization: {
      type: String,
      trim: true,
    },

    yearsOfExperience: {
      type: Number,
      min: 0,
    },

    medicalLicenseId: {
      type: String,
      trim: true,
    },

    licenseExpiryDate: {
      type: Date,
    },

    hospital: {
      name: {
        type: String,
        trim: true,
      },
      streetAddress: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
      },
    },

    bio: {
      type: String,
      maxlength: 1000,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    // Password Reset OTP fields
    resetPasswordOTP: {
      type: String,
      select: false,
    },
    resetPasswordOTPExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

const User = mongoose.model("User", userSchema);
export default User;
