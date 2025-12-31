import mongoose from "mongoose";
import User from "../models/users.js";

export const createUser = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message:
        "Database not connected. Set MONGO_URI in backend/.env to enable persistent storage.",
    });
  }

  try {
    const user = await User.create(req.body);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    // duplicate email
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserByEmail = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message:
        "Database not connected. Set MONGO_URI in backend/.env to enable persistent storage.",
    });
  }

  try {
    const email = (req.query.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required. Use /api/users?email=someone@example.com",
      });
    }

    const user = await User.findOne({ email }); // password stays hidden if schema has select:false

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get current user profile (authenticated)
export const getCurrentUserProfile = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database not connected.",
    });
  }

  try {
    const userId = req.user.userId; // From auth middleware
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('[Profile] Error fetching user profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update current user profile
export const updateUserProfile = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database not connected.",
    });
  }

  try {
    const userId = req.user.userId;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.password;
    delete updates.email; // Email update should be done separately with verification
    delete updates._id;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error('[Profile] Error updating user profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
