import jwt from 'jsonwebtoken';
import { Session } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Session Management Service
 */
class SessionService {
  /**
   * Create new session with JWT token
   */
  static async createSession(user, ipAddress, userAgent) {
    try {
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
          role: user.profession === 'Medical Student' ? 'student' : 'professional'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        { userId: user._id.toString() },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Store session in PostgreSQL
      const session = await Session.create({
        userId: user._id.toString(),
        token,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
        isActive: true
      });

      return {
        token,
        refreshToken,
        expiresAt,
        sessionId: session.id
      };
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
   * Validate session
   */
  static async validateSession(token) {
    try {
      const session = await Session.findOne({
        where: {
          token,
          isActive: true
        }
      });

      if (!session) {
        return null;
      }

      if (new Date() > new Date(session.expiresAt)) {
        await session.update({ isActive: false });
        return null;
      }

      return session;
    } catch (error) {
      throw new Error(`Failed to validate session: ${error.message}`);
    }
  }

  /**
   * Refresh token
   */
  static async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Find session
      const session = await Session.findOne({
        where: {
          refreshToken,
          isActive: true
        }
      });

      if (!session) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          email: session.email
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Update session
      await session.update({
        token: newToken,
        lastActivity: new Date()
      });

      return {
        token: newToken,
        refreshToken: session.refreshToken
      };
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Invalidate session (logout)
   */
  static async invalidateSession(token) {
    try {
      const session = await Session.findOne({
        where: { token }
      });

      if (session) {
        await session.update({ isActive: false });
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Failed to invalidate session: ${error.message}`);
    }
  }

  /**
   * Invalidate all user sessions
   */
  static async invalidateAllUserSessions(userId) {
    try {
      await Session.update(
        { isActive: false },
        {
          where: {
            userId: userId.toString(),
            isActive: true
          }
        }
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to invalidate user sessions: ${error.message}`);
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions() {
    try {
      const result = await Session.update(
        { isActive: false },
        {
          where: {
            expiresAt: {
              [Op.lt]: new Date()
            },
            isActive: true
          }
        }
      );

      return result[0]; // Number of affected rows
    } catch (error) {
      console.error('Session cleanup error:', error.message);
      return 0;
    }
  }

  /**
   * Get active sessions for user
   */
  static async getUserSessions(userId) {
    try {
      const sessions = await Session.findAll({
        where: {
          userId: userId.toString(),
          isActive: true
        },
        order: [['lastActivity', 'DESC']],
        attributes: ['id', 'ipAddress', 'userAgent', 'createdAt', 'lastActivity']
      });

      return sessions;
    } catch (error) {
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }
}

export default SessionService;
