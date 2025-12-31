import jwt from 'jsonwebtoken';
import { Session } from '../models/index.js';

/**
 * Authentication Middleware
 * Validates JWT token and checks session validity
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session exists and is active in PostgreSQL
    const session = await Session.findOne({
      where: {
        token: token,
        isActive: true
      }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session.'
      });
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      await session.update({ isActive: false });
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.'
      });
    }

    // Update last activity
    await session.update({
      lastActivity: new Date()
    });

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sessionId: session.id
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
      error: error.message
    });
  }
};

/**
 * Optional Authentication
 * Allows requests through but attaches user if token is valid
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const session = await Session.findOne({
        where: { token, isActive: true }
      });

      if (session && new Date() <= new Date(session.expiresAt)) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          sessionId: session.id
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
