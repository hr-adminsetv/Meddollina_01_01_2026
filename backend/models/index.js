/**
 * Database Models Index
 * Exports all PostgreSQL models
 */

import Session from './Session.js';
import Conversation from './Conversation.js';
import Message from './Message.js';
import AIContext from './AIContext.js';

// MongoDB models (existing)
import User from './users.js';
import Waitlist from './waitlist.js';

export {
  // PostgreSQL models
  Session,
  Conversation,
  Message,
  AIContext,
  
  // MongoDB models
  User,
  Waitlist
};
