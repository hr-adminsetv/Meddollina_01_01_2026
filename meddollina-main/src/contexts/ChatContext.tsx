/**
 * =============================================================================
 * CHAT CONTEXT
 * =============================================================================
 * 
 * This context provides shared state management for the chat interface.
 * It allows sidebar, mobile menu, and chat history state to be accessed 
 * and modified from any component in the chat feature tree.
 * 
 * @file src/contexts/ChatContext.tsx
 */

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import chatService, { Conversation, Message as APIMessage } from '@/services/chatService';
import { useAuth } from './AuthContext';

/* =============================================================================
   TYPE DEFINITIONS
   ============================================================================= */

/**
 * ChatMessage Interface
 * 
 * Represents a single message within a chat conversation.
 * 
 * STRUCTURE:
 * - id: Unique identifier for the message
 * - role: Who sent the message ('user' or 'assistant')
 * - content: The actual message text (may contain markdown)
 * - timestamp: When the message was sent
 * 
 * WHY SEPARATE FROM ChatHistory?
 * - Messages are the atomic units of conversation
 * - ChatHistory is the container that holds messages
 * - This separation allows efficient message updates without recreating history
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;
  
  /** 
   * Who sent the message
   * - 'user': Human user
   * - 'assistant': AI assistant
   */
  role: 'user' | 'assistant';
  
  /** The actual message content (may contain markdown) */
  content: string;
  
  /** When the message was sent */
  timestamp: Date;
}

/**
 * ChatHistory Interface
 * 
 * Represents a single chat conversation in history.
 * 
 * STRUCTURE:
 * - id: Unique identifier for the chat
 * - title: Display title (usually first message truncated)
 * - category: Type of consultation (general, diagnosis, etc.)
 * - timestamp: Human-readable time label (Today, Yesterday, etc.)
 * - createdAt: Actual Date object for sorting/calculations
 * - messages: Array of all messages in this conversation
 * 
 * WHY STORE MESSAGES HERE?
 * - Enables persistence across page refreshes
 * - Allows loading specific chat conversations
 * - Maintains conversation context for each chat
 */
export interface ChatHistory {
  /** Unique identifier for the chat */
  id: string;
  
  /** Display title (truncated to 50 chars) */
  title: string;
  
  /** Type of consultation */
  category: string;
  
  /** Human-readable time label */
  timestamp: string;
  
  /** Actual creation date for calculations */
  createdAt: Date;
  
  /** All messages in this conversation */
  messages: ChatMessage[];
}

/**
 * ChatContextType Interface
 * 
 * Defines all values and functions available in the ChatContext.
 * 
 * CATEGORIES:
 * 1. Sidebar State - Controls sidebar collapse/expand
 * 2. Mobile Menu State - Controls mobile navigation
 * 3. Chat History State - Manages conversation history
 * 
 * WHY A CONTEXT?
 * - Sidebar, chat list, and main content need shared state
 * - Avoids prop drilling through multiple component levels
 * - Centralizes chat history management logic
 */
interface ChatContextType {
  /* ----- Loading State ----- */
  
  /** Whether conversations are loading */
  isLoading: boolean;
  
  /* ----- Sidebar State ----- */
  
  /** Whether sidebar is collapsed */
  sidebarCollapsed: boolean;
  
  /** Set sidebar collapsed state */
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  /** Toggle sidebar between collapsed/expanded */
  toggleSidebar: () => void;
  
  /* ----- Mobile Menu State ----- */
  
  /** Whether mobile menu is open */
  mobileMenuOpen: boolean;
  
  /** Set mobile menu open state */
  setMobileMenuOpen: (open: boolean) => void;
  
  /* ----- Chat History State ----- */
  
  /** Array of all chat conversations */
  chatHistory: ChatHistory[];
  
  /** ID of currently selected chat (null if none) */
  activeChatId: string | null;
  
  /** Set the active chat ID */
  setActiveChatId: (id: string | null) => void;
  
  /** 
   * Add a new chat to history
   * @param title - Chat title (usually first message)
   * @param category - Type of consultation
   * @returns Promise that resolves to the new chat's ID
   */
  addChat: (title: string, category?: string) => Promise<string>;
  
  /** Update an existing chat's title */
  updateChatTitle: (id: string, title: string) => Promise<void>;
  
  /** 
   * Update messages for a specific chat
   * @param id - Chat ID to update
   * @param messages - New messages array
   */
  updateChatMessages: (id: string, messages: ChatMessage[]) => void;
  
  /** 
   * Get a chat by its ID
   * @param id - Chat ID to find
   * @returns ChatHistory or undefined if not found
   */
  getChatById: (id: string) => ChatHistory | undefined;
  
  /** Delete a chat from history */
  deleteChat: (id: string) => Promise<void>;
  
  /** Clear all chat history */
  clearHistory: () => void;
}

/* =============================================================================
   HELPER FUNCTIONS
   ============================================================================= */

/**
 * Get timestamp label based on date
 */
const getTimestampLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (chatDate.getTime() >= today.getTime()) return 'Today';
  if (chatDate.getTime() >= yesterday.getTime()) return 'Yesterday';
  if (chatDate.getTime() >= lastWeek.getTime()) return 'Last week';
  return 'Older';
};

/**
 * Generate unique ID
 */
const generateId = (): string => {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Convert backend conversation to ChatHistory format
 */
const conversationToChatHistory = (conv: Conversation): ChatHistory => ({
  id: conv.id,
  title: conv.title,
  category: conv.category,
  createdAt: new Date(conv.createdAt),
  timestamp: getTimestampLabel(new Date(conv.lastMessageAt || conv.createdAt)),
  messages: [] // Messages loaded separately when needed
});

/**
 * Convert API message to ChatMessage format
 */
const apiMessageToChatMessage = (msg: APIMessage): ChatMessage => ({
  id: msg.id,
  role: msg.role === 'system' ? 'assistant' : msg.role,
  content: msg.content,
  timestamp: new Date(msg.createdAt)
});

/* =============================================================================
   CONTEXT CREATION
   ============================================================================= */

const ChatContext = createContext<ChatContextType | null>(null);

/* =============================================================================
   PROVIDER COMPONENT
   ============================================================================= */

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Chat history state
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load conversations from backend
  useEffect(() => {
    if (!isAuthenticated) {
      setChatHistory([]);
      setActiveChatId(null);
      return;
    }
    
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const { conversations } = await chatService.getConversations();
        const history = conversations.map(conversationToChatHistory);
        setChatHistory(history);
        
        // Don't auto-select any chat - let user explicitly choose
        // This ensures fresh login shows welcome screen without highlighting old chats
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConversations();
  }, [isAuthenticated]);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  /**
   * Add a new chat to history
   */
  const addChat = useCallback(async (title: string, category: string = 'general'): Promise<string> => {
    try {
      const conversation = await chatService.createConversation(title, category);
      const newChat = conversationToChatHistory(conversation);
      
      setChatHistory(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      
      return newChat.id;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }, []);

  /**
   * updateChatMessages Function
   * 
   * Updates the messages array for a specific chat in history.
   * 
   * @param id - The chat ID to update
   * @param messages - The new messages array
   * 
   * WHY THIS FUNCTION?
   * - Messages need to be persisted as user sends/receives them
   * - Enables loading chat history when user clicks on a chat
   * - Keeps localStorage in sync with current conversation
   * 
   * FLOW:
   * 1. Map through all chats
   * 2. Find chat with matching ID
   * 3. Update its messages array
   * 4. Save to localStorage
   */
  const updateChatMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === id 
          ? { ...chat, messages }
          : chat
      )
    );
  }, []);

  /**
   * getChatById Function
   * 
   * Retrieves a specific chat from history by its ID.
   * 
   * @param id - The chat ID to find
   * @returns ChatHistory object or undefined if not found
   * 
   * USE CASES:
   * - Loading messages when user clicks on a chat in sidebar
   * - Checking if a chat exists before updating
   * - Getting chat details for display
   * 
   * WHY useCallback WITH chatHistory DEPENDENCY?
   * - Function needs to access current chatHistory state
   * - Memoized to prevent unnecessary re-creations
   * - Re-creates when chatHistory changes to have fresh data
   */
  const getChatById = useCallback((id: string): ChatHistory | undefined => {
    return chatHistory.find(chat => chat.id === id);
  }, [chatHistory]);

  /**
   * Update chat title
   */
  const updateChatTitle = useCallback(async (id: string, title: string) => {
    try {
      await chatService.updateTitle(id, title);
      
      setChatHistory(prev => 
        prev.map(chat => 
          chat.id === id 
            ? { ...chat, title: title.length > 50 ? title.substring(0, 50) + '...' : title }
            : chat
        )
      );
    } catch (error) {
      console.error('Failed to update chat title:', error);
      throw error;
    }
  }, []);

  /**
   * Delete a chat from history
   */
  const deleteChat = useCallback(async (id: string) => {
    console.log('[ChatContext] Deleting chat:', id);
    try {
      await chatService.deleteConversation(id);
      console.log('[ChatContext] API delete successful, updating state...');
      
      setChatHistory(prev => {
        const updated = prev.filter(chat => chat.id !== id);
        console.log('[ChatContext] Filtered history:', { before: prev.length, after: updated.length });
        
        // If deleted chat was active, switch to first available or null
        if (activeChatId === id) {
          const newActiveId = updated.length > 0 ? updated[0].id : null;
          console.log('[ChatContext] Switching active chat to:', newActiveId);
          setActiveChatId(newActiveId);
        }
        
        return updated;
      });
      console.log('[ChatContext] Delete complete!');
    } catch (error: any) {
      console.error('[ChatContext] Failed to delete conversation:', error);
      console.error('[ChatContext] Error details:', error.response?.data || error.message);
      throw error;
    }
  }, [activeChatId]);

  /**
   * Clear all chat history
   */
  const clearHistory = useCallback(() => {
    setChatHistory([]);
    setActiveChatId(null);
  }, []);

  return (
    <ChatContext.Provider value={{ 
      sidebarCollapsed, 
      setSidebarCollapsed, 
      toggleSidebar,
      mobileMenuOpen,
      setMobileMenuOpen,
      chatHistory,
      activeChatId,
      setActiveChatId,
      addChat,
      updateChatTitle,
      updateChatMessages,
      getChatById,
      deleteChat,
      clearHistory,
      isLoading
    }}>
      {children}
    </ChatContext.Provider>
  );
}

/* =============================================================================
   CONSUMER HOOK
   ============================================================================= */

export function useChatContext() {
  const context = useContext(ChatContext);
  
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  
  return context;
}
