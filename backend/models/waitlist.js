import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema(
  {
    waitlistNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      enum: ["Healthcare Professional", "Medical Student"],
      required: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true, default: "" },
    lastName: { type: String, required: true, trim: true, default: "" },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      default: "",
    },
    phoneNumber: { type: String, trim: true, default: "" },
    profession: { type: String, default: "" },
    department: { type: String, default: "" },
    specialization: { type: String, default: "" },
    yearsOfExperience: { type: String, default: "" },
    licenseId: { type: String, default: "" },
    practice: {
      hospitalOrInstitutionName: { type: String, default: "" },
      city: { type: String, default: "" },
      country: { type: String, default: "" },
    },

    academic: {
      programType: { type: String, default: "" },
      studentIdOrRollNumber: { type: String, default: "" },
      studentIdDocumentUrl: { type: String, default: "" },
      expectedGraduationYear: { type: Number, default: null },
      collegeOrUniversityName: { type: String, default: "" },
      collegeCity: { type: String, default: "" },
      collegeCountry: { type: String, default: "" },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // link created user after approval
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Optional: prevent duplicate email applications
waitlistSchema.index({ email: 1 }, { unique: true });

const Waitlist = mongoose.model("Waitlist", waitlistSchema);
export default Waitlist;
