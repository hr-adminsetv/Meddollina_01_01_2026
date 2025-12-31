/**
 * API Configuration
 * Central configuration for backend API endpoints
 */

// Use relative URLs for development (Vite proxy) and environment variable for production
const isDev = import.meta.env.DEV;
const prodBaseUrl = import.meta.env.VITE_API_URL;

console.log('[API Config] Setting base URL...');
console.log('[API Config] Environment:', isDev ? 'development' : 'production');
console.log('[API Config] VITE_API_URL:', prodBaseUrl);

// In development: use relative path (Vite proxy handles routing)
// In production: use VITE_API_URL environment variable
export const API_BASE_URL = isDev ? '' : (prodBaseUrl || '');
console.log('[API Config] Base URL set to:', API_BASE_URL || '(relative/proxy)');

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    VALIDATE: '/api/auth/validate',
    SESSIONS: '/api/auth/sessions',
    LOGOUT_ALL: '/api/auth/logout-all',
  },
  
  // Chat Management
  CHAT: {
    CONVERSATIONS: '/api/chat/conversations',
    CONVERSATION: (id: string) => `/api/chat/conversations/${id}`,
    MESSAGES: (id: string) => `/api/chat/conversations/${id}/messages`,
    SEND_MESSAGE: (id: string) => `/api/chat/conversations/${id}/messages`,
    UPDATE_TITLE: (id: string) => `/api/chat/conversations/${id}`,
    DELETE: (id: string) => `/api/chat/conversations/${id}`,
    CONTEXT: (id: string) => `/api/chat/conversations/${id}/context`,
    SEARCH: '/api/chat/conversations/search',
    STATS: '/api/chat/stats',
  },
  
  // AI Operations
  AI: {
    CHAT: '/api/ai/chat',
    SUMMARIZE: '/api/ai/summarize',
    SUMMARIZE_CONTENT: '/api/ai/summarize-content',
    GENERATE_CASE_SHEET: '/api/ai/generate-case-sheet',
    SUGGESTIONS: '/api/ai/suggestions',
    HEALTH: '/api/ai/health',
    CONTEXT: (id: string) => `/api/ai/context/${id}`,
    FRONTEND_CONTEXT: (id: string) => `/api/ai/frontend-context/${id}`,
  },
  
  // User Management
  USERS: {
    CREATE: '/api/users',
    GET_ALL: '/api/users',
  },
  
  // Waitlist
  WAITLIST: {
    SUBMIT: '/api/waitlist',
  },
};

export default API_BASE_URL;
