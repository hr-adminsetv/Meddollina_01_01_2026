import express from 'express';
import {
  login,
  logout,
  refreshToken,
  validateSession,
  getUserSessions,
  logoutAll,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
  getStudentProfile,
  getProfile
} from '../controllers/authController.js'; // Back to original controller
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Debug middleware for all auth routes
router.use((req, res, next) => {
  console.log(`[DEBUG AUTH ROUTE] ${req.method} ${req.path}`);
  next();
});

/**
 * Authentication Routes
 */

// Public routes
router.post('/login', (req, res, next) => {
  console.log('[DEBUG] Login route handler reached');
  next();
}, login);
router.post('/refresh', refreshToken);

// Password reset routes (public - no auth required)
router.post('/forgot-password/send-otp', sendPasswordResetOTP);
router.post('/forgot-password/verify-otp', verifyPasswordResetOTP);
router.post('/forgot-password/reset', resetPassword);

// Protected routes (require authentication)
router.post('/logout', authenticate, logout);
router.get('/validate', authenticate, validateSession);
router.get('/sessions', authenticate, getUserSessions);
router.post('/logout-all', authenticate, logoutAll);
router.get('/student-profile', authenticate, getStudentProfile);
router.get('/profile', authenticate, getProfile);

export default router;
