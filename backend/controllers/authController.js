import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/index.js';
import SessionService from '../services/sessionService.js';
import EmailService from '../services/emailService.js';

/**
 * Authentication Controller
 * Handles login, logout, and token management
 */

/**
 * Login user and create session
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

    // Get client info
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log(`[DEBUG] Creating session for user: ${user._id}`);

    // Create session in PostgreSQL
    const sessionData = await SessionService.createSession(user, ipAddress, userAgent);

    console.log(`[DEBUG] Session created successfully`);

    // Determine user role based on profession
    const isStudent = user.profession === 'Medical Student';
    const userRole = isStudent ? 'student' : 'professional';

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
          profession: user.profession,
          role: userRole // Add role field to identify student vs professional
        },
        token: sessionData.token,
        refreshToken: sessionData.refreshToken,
        expiresAt: sessionData.expiresAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Logout user and invalidate session
 */
export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

    if (token) {
      await SessionService.invalidateSession(token);
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user from MongoDB
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Determine user role
    const isStudent = user.profession === 'Medical Student';
    const userRole = isStudent ? 'student' : 'professional';

    // Return user data with role
    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profession: user.profession,
        role: userRole
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const tokens = await SessionService.refreshToken(refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
};

/**
 * Validate current session
 */
export const validateSession = async (req, res) => {
  try {
    // If we reach here, auth middleware has already validated the session
    return res.status(200).json({
      success: true,
      message: 'Session is valid',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Session validation failed',
      error: error.message
    });
  }
};

/**
 * Get user's active sessions
 */
export const getUserSessions = async (req, res) => {
  try {
    const sessions = await SessionService.getUserSessions(req.user.userId);

    return res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve sessions',
      error: error.message
    });
  }
};

/**
 * Logout from all devices
 */
export const logoutAll = async (req, res) => {
  try {
    await SessionService.invalidateAllUserSessions(req.user.userId);

    return res.status(200).json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Logout all failed',
      error: error.message
    });
  }
};

/**
 * Send OTP for password reset
 */
export const sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent'
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP before storing (security best practice)
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    // Set OTP and expiry (10 minutes from now)
    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send OTP via email
    await EmailService.sendPasswordResetOTP(user.email, otp, user.firstName);

    console.log(`✅ Password reset OTP sent to: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email address'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
};

/**
 * Verify OTP
 */
export const verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find user with OTP fields
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+resetPasswordOTP +resetPasswordOTPExpires');

    if (!user || !user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check if OTP is expired
    if (user.resetPasswordOTPExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one'
      });
    }

    // Hash the provided OTP and compare
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    if (hashedOTP !== user.resetPasswordOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    console.log(`✅ OTP verified for: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
};

/**
 * Reset password (after OTP verification)
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Additional password validation (optional but recommended)
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[@#$%^&*]/.test(newPassword);

    if (!hasUppercase || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one number, and one special character (@#$%^&*)'
      });
    }

    // Find user with OTP fields
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +resetPasswordOTP +resetPasswordOTPExpires');

    if (!user || !user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check if OTP is expired
    if (user.resetPasswordOTPExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one'
      });
    }

    // Hash the provided OTP and compare
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    if (hashedOTP !== user.resetPasswordOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP fields
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    // Send confirmation email
    await EmailService.sendPasswordResetConfirmation(user.email, user.firstName);

    // Invalidate all existing sessions for security
    await SessionService.invalidateAllUserSessions(user._id.toString());

    console.log(`✅ Password reset successful for: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};

/**
 * Get student profile from User collection
 */
export const getStudentProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user from MongoDB
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is a student
    if (user.profession !== 'Medical Student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only students can access this endpoint.'
      });
    }

    // Return student profile data
    return res.status(200).json({
      success: true,
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profession: user.profession,
        department: user.department,
        specialization: user.specialization,
        bio: user.bio,
        // Academic info (stored in user model for direct students)
        academic: {
          programType: 'MBBS', // Default for medical students
          studentIdOrRollNumber: 'N/A', // Can be added to user model if needed
          expectedGraduationYear: 2026, // Can be added to user model if needed
          collegeOrUniversityName: 'N/A', // Can be added to user model if needed
          collegeCity: 'N/A',
          collegeCountry: 'N/A',
        }
      }
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student profile',
      error: error.message
    });
  }
};

