import { DataTypes } from 'sequelize';
import sequelize from '../config/postgres.js';
import Conversation from './Conversation.js';

/**
 * Message Model
 * Stores individual messages in conversations
 */
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'conversation_id',
    references: {
      model: 'conversations',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant', 'system'),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tokensUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'tokens_used'
  },
  processingTimeMs: {
    type: DataTypes.INTEGER,
    field: 'processing_time_ms'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'attachments',
    comment: 'Array of file attachments with metadata'
  },
  ocrContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'ocr_content',
    comment: 'Extracted text from OCR processing'
  }
}, {
  tableName: 'messages',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['conversation_id'] },
    { fields: ['created_at'] },
    { fields: ['role'] }
  ]
});

// Define relationship
Message.belongsTo(Conversation, {
  foreignKey: 'conversationId',
  as: 'conversation'
});

Conversation.hasMany(Message, {
  foreignKey: 'conversationId',
  as: 'messages'
});

export default Message;
