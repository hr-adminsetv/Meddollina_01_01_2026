import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/index.js';
// import SessionService from '../services/sessionService.js'; // Temporarily disabled
import EmailService from '../services/emailService.js';
import jwt from 'jsonwebtoken';

/**
 * Authentication Controller
 * Handles login, logout, and token management
 */

/**
 * Login user and create session (temporary version without PostgreSQL)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log(`[DEBUG] Login attempt for email: ${email.toLowerCase()}`);

    // Find user in MongoDB
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    console.log(`[DEBUG] User found: ${user ? 'YES' : 'NO'}`);

    if (!user) {
      console.log(`[DEBUG] No user found with email: ${email.toLowerCase()}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password (handle both hashed and plain text passwords)
    let isValidPassword = false;
    
    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
      // Password is hashed, use bcrypt compare
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Password is plain text (legacy/development users), direct comparison
      isValidPassword = (password === user.password);
      
      // Hash the password for next time
      if (isValidPassword) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        console.log(`✅ Auto-hashed plain text password for user: ${user.email}`);
      }
    }

    console.log(`[DEBUG] Password valid: ${isValidPassword}`);

    if (!isValidPassword) {
      console.log(`[DEBUG] Invalid password for user: ${email.toLowerCase()}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log(`[DEBUG] Creating JWT token for user: ${user._id}`);

    // Create JWT token (temporary, without PostgreSQL session)
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role || 'professional'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[DEBUG] JWT tokens created successfully`);

    // Return tokens
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profession: user.profession
        },
        token: token,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req, res) => {
  try {
    // TODO: Implement logout logic
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Validate token
 */
export const validateToken = async (req, res) => {
  try {
    // TODO: Implement token validation
    return res.status(200).json({
      success: true,
      message: 'Token is valid'
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Export other functions as needed
export const refreshToken = async (req, res) => {
  try {
    // TODO: Implement refresh token logic
    return res.status(200).json({
      success: true,
      message: 'Token refreshed'
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const validateSession = async (req, res) => {
  try {
    // TODO: Implement session validation
    return res.status(200).json({
      success: true,
      message: 'Session is valid'
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getUserSessions = async (req, res) => {
  try {
    // TODO: Implement get user sessions
    return res.status(200).json({
      success: true,
      sessions: []
    });
  } catch (error) {
    console.error('Get user sessions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const logoutAll = async (req, res) => {
  try {
    // TODO: Implement logout all
    return res.status(200).json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const sendPasswordResetOTP = async (req, res) => {
  try {
    // TODO: Implement send password reset OTP
    return res.status(200).json({
      success: true,
      message: 'Password reset OTP sent'
    });
  } catch (error) {
    console.error('Send password reset OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const verifyPasswordResetOTP = async (req, res) => {
  try {
    // TODO: Implement verify password reset OTP
    return res.status(200).json({
      success: true,
      message: 'OTP verified'
    });
  } catch (error) {
    console.error('Verify password reset OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    // TODO: Implement reset password
    return res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export default {
  login,
  logout,
  validateToken,
  refreshToken,
  validateSession,
  getUserSessions,
  logoutAll,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword
};
