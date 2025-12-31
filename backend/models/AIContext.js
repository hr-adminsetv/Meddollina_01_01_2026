import { DataTypes } from 'sequelize';
import sequelize from '../config/postgres.js';
import Conversation from './Conversation.js';

/**
 * AI Context Model
 * Stores conversation context for AI processing
 */
const AIContext = sequelize.define('AIContext', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'conversation_id',
    references: {
      model: 'conversations',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  contextSummary: {
    type: DataTypes.TEXT,
    field: 'context_summary',
    comment: 'AI-generated summary of conversation'
  },
  keyPoints: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'key_points',
    comment: 'Key medical points extracted'
  },
  medicalTerms: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'medical_terms',
    comment: 'Medical terminology used'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_updated'
  }
}, {
  tableName: 'ai_context',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['conversation_id'] }
  ]
});

// Define relationship
AIContext.belongsTo(Conversation, {
  foreignKey: 'conversationId',
  as: 'conversation'
});

Conversation.hasOne(AIContext, {
  foreignKey: 'conversationId',
  as: 'aiContext'
});

export default AIContext;
