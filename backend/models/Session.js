import { DataTypes } from 'sequelize';
import sequelize from '../config/postgres.js';

/**
 * Session Model
 * Stores JWT tokens and user sessions
 */
const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'user_id',
    comment: 'MongoDB user ID'
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  refreshToken: {
    type: DataTypes.STRING(500),
    field: 'refresh_token'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  ipAddress: {
    type: DataTypes.STRING,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_activity'
  }
}, {
  tableName: 'sessions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token'] },
    { fields: ['expires_at'] }
  ]
});

export default Session;
