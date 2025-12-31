import { DataTypes } from 'sequelize';
import sequelize from '../config/postgres.js';

/**
 * Conversation Model
 * Stores chat conversations for each user
 */
const Conversation = sequelize.define('Conversation', {
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'New Consultation'
  },
  category: {
    type: DataTypes.STRING(100),
    defaultValue: 'general'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    field: 'last_message_at'
  }
}, {
  tableName: 'conversations',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['created_at'] },
    { fields: ['last_message_at'] }
  ]
});

export default Conversation;
