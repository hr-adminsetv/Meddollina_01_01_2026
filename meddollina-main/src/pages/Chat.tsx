/**
 * =============================================================================
 * CHAT PAGE COMPONENT
 * =============================================================================
 * 
 * This is the main chat interface page for the Meddollina medical AI assistant.
 * It handles the complete chat experience including:
 * 
 * - Displaying conversation messages (user and AI responses)
 * - Sending new messages to the AI
 * - Managing loading states during AI response generation
 * - Auto-scrolling to keep the latest messages visible
 * - Regenerating AI responses on user request
 * - Showing unread message indicators when user scrolls up
 * 
 * ARCHITECTURE OVERVIEW:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      ChatLayout                              │
 * │  ┌─────────────┐  ┌───────────────────────────────────────┐ │
 * │  │   Sidebar   │  │            Main Content               │ │
 * │  │             │  │  ┌─────────────────────────────────┐  │ │
 * │  │  - History  │  │  │     Messages Container          │  │ │
 * │  │  - New Chat │  │  │     (ChatMessage components)    │  │ │
 * │  │             │  │  └─────────────────────────────────┘  │ │
 * │  │             │  │  ┌─────────────────────────────────┐  │ │
 * │  │             │  │  │        ChatInput                │  │ │
 * │  │             │  │  └─────────────────────────────────┘  │ │
 * │  └─────────────┘  └───────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * @file src/pages/Chat.tsx
 * @module Chat
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

/**
 * React Hooks Import
 * 
 * - useState: Creates reactive state variables that trigger re-renders when changed
 * - useRef: Creates mutable references that persist across renders without causing re-renders
 * - useEffect: Runs side effects (API calls, subscriptions, DOM manipulation) after render
 * - useCallback: Memoizes functions to prevent unnecessary re-creations
 * 
 * WHY THESE HOOKS?
 * - useState for UI state (messages, loading)
 * - useRef for DOM elements (scroll container) and values that shouldn't trigger re-renders
 * - useEffect for scroll behavior and initial message handling
 * - useCallback for optimized event handlers
 */
import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * React Router Hooks
 * 
 * - useNavigate: Programmatic navigation (redirecting to other pages)
 * - useLocation: Access current route info and navigation state
 */
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Lucide React Icon
 */
import { ChevronDown } from 'lucide-react';

/**
 * Internal Component Imports
 */
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessage, Message } from '@/components/chat/ChatMessage';
import { ChatInput, AttachedFile } from '@/components/chat/ChatInput';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { ContextDisplay } from '@/components/chat/ContextDisplay';
import { Button } from '@/components/ui/button';
import { useChatContext } from '@/contexts/ChatContext';
import chatService from '@/services/chatService';
import aiService from '@/services/aiService';
import { toast } from '@/hooks/use-toast';
import { fileUploadBus } from '@/utils/fileUploadBus';
import apiClient from '@/utils/apiClient';

/* =============================================================================
   CONSTANTS
   ============================================================================= */

/**
 * SCROLL_THRESHOLD
 * 
 * Distance from bottom (in pixels) within which we consider the user "near bottom"
 * 
 * PURPOSE:
 * - When user is within 100px of bottom, auto-scroll is active
 * - Beyond 100px, show "scroll to bottom" button
 * 
 * WHAT HAPPENS IF YOU CHANGE IT?
 * - Increase (e.g., 200): Button appears sooner, more aggressive auto-scroll
 * - Decrease (e.g., 50): Button appears later, user can scroll more before it shows
 * - Zero: Button only appears when not at absolute bottom
 */
const SCROLL_THRESHOLD = 100;

/**
 * AI_RESPONSE_DELAY
 * 
 * Simulated delay for AI response in milliseconds
 * 
 * PURPOSE:
 * - Mimics real API response time
 * - Gives user feedback that AI is "thinking"
 * 
 * WHAT HAPPENS IF YOU CHANGE IT?
 * - Increase (e.g., 3000): Longer loading animation, feels slower
 * - Decrease (e.g., 500): Faster responses, may feel unrealistic
 * - In production, this would be replaced with actual API call duration
 */
const AI_RESPONSE_DELAY = 1500;

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */

/**
 * Chat Component
 * 
 * The main functional component that renders the entire chat page.
 * 
 * REACT FUNCTIONAL COMPONENT PATTERN:
 * - Function that returns JSX (UI elements)
 * - Uses hooks for state and side effects
 * - Re-renders when state or props change
 */
const Chat = () => {
  
  /* ---------------------------------------------------------------------------
     NAVIGATION HOOKS
     --------------------------------------------------------------------------- */
  
  /**
   * useNavigate Hook
   * 
   * Returns a function to programmatically navigate to different routes
   * 
   * USAGE: navigate('/chathome') redirects user to ChatHome page
   * 
   * WHAT HAPPENS IF REMOVED?
   * - "New Chat" button won't work
   * - User can't start fresh conversations
   */
  const navigate = useNavigate();
  const location = useLocation();
  
  /**
   * Chat Context Hook
   * 
   * Access chat history management functions
   * Note: Using database only, no localStorage!
   */
  const { addChat, updateChatTitle, activeChatId, setActiveChatId, isLoading: contexLoading } = useChatContext();

  /* ---------------------------------------------------------------------------
     STATE MANAGEMENT
     --------------------------------------------------------------------------- */
  
  /**
   * Messages State
   * 
   * Stores all chat messages in the conversation
   * 
   * TYPE: Message[] (array of Message objects)
   * Each Message has: { id, role, content, timestamp }
   * 
   * INITIAL VALUE: [] (empty array - no messages at start)
   * 
   * WHAT HAPPENS IF YOU CHANGE INITIAL VALUE?
   * - Pre-populating with messages would show them immediately
   * - Could be used for chat history restoration
   */
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  /**
   * Loading State
   * 
   * Indicates whether AI is currently generating a response
   * 
   * TYPE: boolean
   * - true: Show loading animation, disable input
   * - false: Normal state, user can send messages
   * 
   * WHY SEPARATE FROM MESSAGES?
   * - Loading state affects UI globally (input disabled)
   * - Needs to be tracked independently for UX feedback
   */
  const [isLoading, setIsLoading] = useState(false);
  
  /**
   * Summarization Loading State
   * 
   * Indicates whether current chat is being summarized
   * 
   * TYPE: boolean
   * - false: Not summarizing
   * - true: Currently generating summary
   */
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  /**
   * Context State
   * 
   * Tracks the current conversation context
   * 
   * TYPE: object | null
   * - null: No context loaded yet
   * - object: Contains topic, score, and other context info
   */
  const [currentContext, setCurrentContext] = useState<{
    topic: string;
    subTopic: string;
    condition: string;
    stage: string;
    score: number;
    messageCount: number;
  } | null>(null);
  
  /**
   * Pending Assistant ID State
   * 
   * Tracks which assistant message is currently being generated
   * 
   * TYPE: string | null
   * - string: ID of the message being generated
   * - null: No message currently being generated
   * 
   * PURPOSE:
   * - Allows us to show loading state on specific message
   * - Enables updating the correct message when response arrives
   * 
   * PATTERN: "Optimistic UI Update"
   * - We add placeholder message immediately
   * - Update it when actual response comes
   */
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null);
  
  /**
   * Regenerating ID State
   * 
   * Tracks which assistant message is being regenerated
   * 
   * TYPE: string | null
   * - Similar to pendingAssistantId but for regeneration
   * 
   * WHY SEPARATE FROM PENDING?
   * - Regeneration is a different flow (updating existing message)
   * - Needs different UI treatment (show loading in place)
   */
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  
  /**
   * Content Visibility State
   * 
   * Controls entrance animation for the messages container
   * 
   * TYPE: boolean
   * - false: Content is hidden (initial state)
   * - true: Content is visible with animation
   * 
   * WHY THIS PATTERN?
   * - Prevents flash of unstyled content
   * - Creates smooth entrance animation on page load
   */
  const [isContentVisible, setIsContentVisible] = useState(false);
  
  /**
   * Scroll Button Visibility State
   * 
   * Controls whether "scroll to bottom" button is shown
   * 
   * TYPE: boolean
   * - true: User has scrolled up, show button
   * - false: User is near bottom, hide button
   */
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  /**
   * Unread Count State
   * 
   * Number of new messages received while user is scrolled up
   * 
   * TYPE: number
   * - 0: No unread messages
   * - >0: Shows badge on scroll button
   * 
   * PURPOSE:
   * - Notifies user of new messages they haven't seen
   * - Similar to notification badges in messaging apps
   */
  const [unreadCount, setUnreadCount] = useState(0);

  /* ---------------------------------------------------------------------------
     REFS (References to DOM/Values that don't trigger re-render)
     --------------------------------------------------------------------------- */
  
  /**
   * Current Chat ID Reference
   * 
   * Tracks the active conversation ID
   * 
   * WHY useRef INSTEAD OF STATE?
   * - Need to access current chat ID in callbacks
   * - Don't want to add to dependency arrays
   * - Avoids infinite loops in useEffect
   */
  const currentChatIdRef = useRef<string | null>(null);
  
  /**
   * Messages Loading Reference
   * 
   * Tracks if messages are currently being loaded
   * 
   * PURPOSE:
   * - Prevents duplicate message loads
   * - Avoids race conditions
   */
  const isLoadingMessagesRef = useRef(false);
  
  /**
   * Messages End Ref
   * 
   * Reference to invisible div at the bottom of messages list
   * 
   * PURPOSE:
   * - Target for scrollIntoView() to scroll to bottom
   * - Acts as an anchor point for auto-scroll
   * 
   * WHY REF INSTEAD OF STATE?
   * - Don't need re-renders when scroll position changes
   * - Direct DOM manipulation is more efficient for scrolling
   */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  /**
   * Scroll Container Ref
   * 
   * Reference to the scrollable messages container div
   * 
   * PURPOSE:
   * - Access scroll position (scrollTop, scrollHeight, clientHeight)
   * - Attach scroll event listener
   * 
   * PROPERTIES WE USE:
   * - scrollTop: How far user has scrolled from top
   * - scrollHeight: Total scrollable height
   * - clientHeight: Visible height of container
   */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  /**
   * Initial Message Processed Ref
   * 
   * Flag to prevent processing initial message multiple times
   * 
   * TYPE: { current: boolean }
   * 
   * WHY REF INSTEAD OF STATE?
   * - Changing this shouldn't trigger re-render
   * - Need to persist across renders without causing re-renders
   * 
   * PROBLEM IT SOLVES:
   * - useEffect runs multiple times in React Strict Mode
   * - Without this flag, initial message could be sent multiple times
   */
  const initialMessageProcessed = useRef(false);
  const isSendingMessageRef = useRef(false); // Track if we're sending a message
  
  /**
   * Effect to load messages when conversation changes
   */
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeChatId) {
        console.log('[Chat] No active chat ID, clearing messages');
        setMessages([]);
        currentChatIdRef.current = null;
        isLoadingMessagesRef.current = false;
        return;
      }
      
      if (activeChatId === currentChatIdRef.current || isLoadingMessagesRef.current) {
        console.log('[Chat] Skipping message load - already loaded or loading');
        return;
      }
      
      // Don't reload if we're currently sending a message
      if (isSendingMessageRef.current) {
        console.log('[Chat] Skipping message load - currently sending message');
        return;
      }
      
      isLoadingMessagesRef.current = true;
      
      try {
        setMessagesLoading(true);
        console.log('[Chat] Loading messages for conversation:', activeChatId);
        const { messages: apiMessages } = await chatService.getMessages(activeChatId);
        
        console.log('[Chat] Received', apiMessages.length, 'messages from backend');
        console.log('[Chat] Messages with attachments:', apiMessages.filter(m => m.attachments && m.attachments.length > 0).length);
        
        // Log all messages to check for duplicates
        apiMessages.forEach((msg, index) => {
          console.log(`[Chat] API Message ${index + 1}:`, {
            id: msg.id,
            role: msg.role,
            content: msg.content.substring(0, 50) + '...',
            hasAttachments: msg.attachments && msg.attachments.length > 0,
            attachmentCount: msg.attachments ? msg.attachments.length : 0
          });
        });
        
        // Convert API messages to Message format with all fields
        const convertedMessages: Message[] = apiMessages.map(msg => ({
          id: msg.id,
          role: msg.role === 'system' ? 'assistant' : msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          attachments: msg.attachments || [],
          ocrContent: msg.ocrContent,
          metadata: msg.metadata
        }));
        
        console.log('[Chat] Converted messages count:', convertedMessages.length);
        setMessages(convertedMessages);
        currentChatIdRef.current = activeChatId;
      } catch (error) {
        console.error('Failed to load messages:', error);
        
        // If conversation doesn't exist, clear the URL and start fresh
        if (error.message?.includes('Conversation not found') || error.message?.includes('404')) {
          console.log('[Chat] Conversation not found, clearing URL and starting fresh');
          // Clear the invalid conversation ID from URL
          window.history.replaceState({}, '', '/chat');
          setActiveChatId(null);
          currentChatIdRef.current = null;
          setMessages([]);
          
          toast({
            title: 'Conversation not found',
            description: 'Starting a new conversation',
            variant: 'default'
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load messages',
            variant: 'destructive'
          });
        }
      } finally {
        setMessagesLoading(false);
        isLoadingMessagesRef.current = false;
      }
    };
    
    loadMessages();
  }, [activeChatId]);
  
  /**
   * Is Near Bottom Ref
   * 
   * Tracks whether user is currently near the bottom of chat
   */
  const isNearBottomRef = useRef(true);

  /* ---------------------------------------------------------------------------
     SCROLL HANDLERS
     --------------------------------------------------------------------------- */

  /**
   * scrollToBottom Function
   * 
   * Smoothly scrolls the chat to the most recent message
   * 
   * HOW IT WORKS:
   * 1. Gets reference to the invisible div at bottom
   * 2. Calls scrollIntoView with smooth behavior
   * 3. Resets unread count since user will see all messages
   * 
   * WHAT HAPPENS IF YOU CHANGE 'smooth' TO 'instant'?
   * - Instant jump instead of animation
   * - Less polished UX but faster
   */
  const scrollToBottom = () => {
    // scrollIntoView is a native DOM method that scrolls the element into view
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Reset unread count because user is now at the bottom
    setUnreadCount(0);
  };

  /**
   * handleScroll Function (Memoized with useCallback)
   * 
   * Handles scroll events to determine user's scroll position
   * 
   * useCallback EXPLANATION:
   * - Memoizes the function so it's not recreated on every render
   * - Empty dependency array [] means function is created once
   * - Important for performance when used as event listener
   * 
   * SCROLL MATH EXPLAINED:
   * scrollHeight: 2000px (total content height)
   * clientHeight: 500px (visible area height)
   * scrollTop: 1400px (pixels scrolled from top)
   * 
   * Distance from bottom = scrollHeight - scrollTop - clientHeight
   *                      = 2000 - 1400 - 500 = 100px
   * 
   * If distance < SCROLL_THRESHOLD (100), user is "near bottom"
   */
  const handleScroll = useCallback(() => {
    // Early return if scroll container doesn't exist
    if (!scrollContainerRef.current) return;
    
    // Destructure scroll properties from the container
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Calculate if user is within threshold of bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
    
    // Update the ref (doesn't cause re-render)
    isNearBottomRef.current = isNearBottom;
    
    // Update state to show/hide scroll button (causes re-render)
    setShowScrollButton(!isNearBottom);
    
    // If user scrolled to bottom, clear unread count
    if (isNearBottom) {
      setUnreadCount(0);
    }
  }, []); // Empty dependency array - function never changes

  /**
   * handleNewChat Function
   * 
   * Starts a new conversation by resetting state and navigating
   */
  const handleNewChat = () => {
    // Reset the current chat ID for a fresh conversation
    currentChatIdRef.current = null;
    isLoadingMessagesRef.current = false;
    initialMessageProcessed.current = false; // Reset this to prevent old messages from reappearing
    setMessages([]);
    setActiveChatId(null);
    setCurrentContext(null); // Clear the current context
    
    // Clear URL parameters if any
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    navigate('/chathome');
    
    // Clear any stale state from location
    window.history.replaceState({}, document.title);
  };

  /* ---------------------------------------------------------------------------
     MESSAGE HANDLERS
     --------------------------------------------------------------------------- */

  /**
   * handleSendMessage Function
   * 
   * Processes sending a new message and generates AI response
   * 
   * @param content - The text message from user
   * @param files - Optional array of attached files
   * 
   * FLOW:
   * 1. Build message content (add file info if present)
   * 2. Create user message object
   * 3. Create placeholder for assistant response
   * 4. Add both to messages array (optimistic update)
   * 5. Set loading state
   * 6. Simulate AI response after delay
   * 7. Update placeholder with actual response
   * 8. Clear loading state
   * 
   * OPTIMISTIC UI PATTERN:
   * - We add the assistant message placeholder immediately
   * - User sees loading state in the right place
   * - When response arrives, we update in place (no jump/flash)
   */
  const handleSendMessage = async (content: string) => {
    // NEW FLOW: Get files from the event bus instead of parameter
    console.log('[CHAT] ========== handleSendMessage called (NEW FLOW) ==========');
    console.log('[CHAT] Content:', content);
    
    // Set sending flag to prevent message reload
    isSendingMessageRef.current = true;
    
    // Retrieve files from the global event bus
    console.log('[CHAT] 📥 Retrieving files from FileUploadBus...');
    const files = fileUploadBus.getAndClearFiles();
    
    console.log('[CHAT] Files from bus:', files);
    console.log('[CHAT] typeof files:', typeof files);
    console.log('[CHAT] Array.isArray(files):', Array.isArray(files));
    console.log('[CHAT] Files count:', files ? files.length : 0);
    
    if (files && files.length > 0) {
      console.log('[CHAT] 🎉🎉🎉 FILES SUCCESSFULLY RECEIVED FROM BUS! 🎉🎉🎉');
      console.log('[CHAT] File details:', files.map(f => ({ 
        name: f.file.name, 
        size: f.file.size, 
        type: f.type 
      })));
      
      // We'll upload files after creating/getting conversation ID
      // Store files for upload after conversation is ready
    } else {
      console.log('[CHAT] No files in bus');
    }
    
    // Generate assistant ID outside try block so it's accessible in catch
    const assistantId = (Date.now() + 1).toString();
    
    try {
      /* ----- Step 1: Create or Get Conversation ID ----- */
      
      // If this is the first message in a new conversation, create it
      if (!currentChatIdRef.current) {
        // For file uploads, use a more descriptive title
        let chatTitle = content.length > 40 ? content.substring(0, 40) + '...' : content || 'New consultation';
        
        if (files && files.length > 0) {
          // If uploading files, mention that in the title
          const fileName = files[0].file.name;
          chatTitle = fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName;
        }
        
        const newChatId = await addChat(chatTitle, 'general');
        currentChatIdRef.current = newChatId;
        setActiveChatId(newChatId);
        
        // Don't navigate immediately - let the message send first
        // This prevents the message reload from clearing our state
        setTimeout(() => {
          navigate(`/chat?id=${newChatId}`);
        }, 100);
      }

      const conversationId = currentChatIdRef.current;
      
      if (!conversationId) {
        throw new Error('No conversation ID');
      }

      /* ----- Step 2: Handle File Uploads (if any) ----- */
      
      let uploadedMessage: Message | null = null;
      let extractedOcrContent = ''; // Define in proper scope
      
      if (files && files.length > 0) {
        console.log('[CHAT] Starting file upload...');
        console.log('[CHAT] Conversation ID:', conversationId);
        
        // Extract File objects from the attachment structure
        const fileObjects = files.map(f => f.file);
        console.log('[CHAT] File objects:', fileObjects.length);
        
        try {
          // Upload files to backend
          console.log('[CHAT] Calling chatService.uploadFiles...');
          console.log('[CHAT] Files to upload:', fileObjects.map(f => ({ name: f.name, size: f.size, type: f.type })));
          
          const uploadResponse = await chatService.uploadFiles(conversationId, fileObjects, content);
          console.log('[CHAT] Upload response:', uploadResponse);
          
          // Create user message with attachments from upload response
          uploadedMessage = {
            id: uploadResponse.data.messageId,
            role: 'user' as const,
            content: content || `[Attached ${files.length} file(s)]`,
            timestamp: new Date(),
            attachments: uploadResponse.data.attachments,
          };
          
          // Add uploaded message to UI
          setMessages(prev => [...prev, uploadedMessage]);
          
          toast({
            title: "Files uploaded",
            description: `${files.length} file(s) uploaded successfully. Processing OCR...`,
          });
          
          // Wait for OCR processing to complete
          console.log('[CHAT] Waiting for OCR processing to complete...');
          let ocrComplete = false;
          let attempts = 0;
          const maxAttempts = 60; // Maximum 60 attempts (60 seconds)
          
          while (!ocrComplete && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            try {
              // Check OCR status
              const statusResponse = await apiClient.get(`/api/files/messages/${uploadResponse.data.messageId}/ocr-status`);
              console.log(`[CHAT] OCR status check #${attempts + 1}:`, statusResponse.data);
              
              // Check if any attachments have errors
              const attachments = statusResponse.data.data.attachments || [];
              const hasErrors = attachments.some(att => att.ocrError);
              
              // Check if all OCR processing is complete
              const allProcessed = attachments.every(att => att.ocrProcessed || att.ocrError);
              
              if (allProcessed) {
                console.log('[CHAT] OCR processing complete!');
                ocrComplete = true;
              }
              
              if (hasErrors) {
                console.error('[CHAT] OCR processing errors found:', attachments.filter(att => att.ocrError));
                toast({
                  title: "OCR Error",
                  description: "Some documents couldn't be processed. Proceeding without OCR.",
                  variant: "destructive"
                });
                break;
              }
              
              if (statusResponse.data.data.status === 'completed') {
                ocrComplete = true;
                console.log('[CHAT] OCR processing complete!');
                
                // Store OCR content to send with the message
                if (statusResponse.data.data.ocrContent) {
                  extractedOcrContent = statusResponse.data.data.ocrContent;
                  console.log('[CHAT] OCR content ready, length:', extractedOcrContent.length);
                }
              }
            } catch (statusError) {
              console.error('[CHAT] Failed to check OCR status:', statusError);
              // Don't break on status check errors, continue trying
            }
            
            attempts++;
            
            // Show progress to user every 10 seconds
            if (attempts % 10 === 0 && attempts > 0) {
              console.log(`[CHAT] OCR still processing... (${attempts}s elapsed)`);
            }
          }
          
          if (!ocrComplete) {
            console.warn('[CHAT] OCR processing timed out, proceeding without OCR content');
            toast({
              title: "OCR Processing",
              description: "OCR is taking longer than expected. Proceeding without document analysis.",
              variant: "default"
            });
          }
        } catch (uploadError: any) {
          console.error('[CHAT] File upload error:', uploadError);
          toast({
            title: "Upload failed",
            description: uploadError.message || "Failed to upload files",
            variant: "destructive"
          });
          throw uploadError;
        }
      }

      /* ----- Step 3: Create User Message Object (if no files) ----- */
      
      const userMessage: Message = uploadedMessage || {
        // Unique ID using timestamp (simple but effective for demo)
        id: Date.now().toString(),
        
        // Role indicates who sent the message
        role: 'user',
        
        // The actual message content
        content: content,
        
        // When the message was sent
        timestamp: new Date(),
      };
      
      // Add user message to state only if we didn't upload files (already added above)
      if (!uploadedMessage) {
        setMessages(prev => [...prev, userMessage]);
      }

      /* ----- Step 4: Create Assistant Placeholder ----- */
      
      const pendingAssistant: Message = {
        id: assistantId,
        role: 'assistant',
        content: '', // Empty - will be filled when response arrives
        timestamp: new Date(),
      };

      /* ----- Step 5: Update State (Optimistic Update) ----- */
      
      console.log('[CHAT] About to add messages. Current count:', messages.length);
      console.log('[CHAT] Adding user message:', uploadedMessage ? 'from upload' : 'new');
      console.log('[CHAT] Adding assistant placeholder with ID:', assistantId);
      
      // Add user message to state only if we didn't upload files (already added above)
      if (!uploadedMessage) {
        setMessages(prev => {
          console.log('[CHAT] Adding user message. Current count:', prev.length);
          return [...prev, userMessage];
        });
      }
      
      // Add assistant placeholder to messages
      setMessages(prev => {
        console.log('[CHAT] Adding assistant placeholder. Current count:', prev.length);
        const newMessages = [...prev, pendingAssistant];
        console.log('[CHAT] Messages after adding placeholder:', newMessages.length);
        return newMessages;
      });
      
      // Track which message is pending
      setPendingAssistantId(assistantId);
      
      // Enable loading state
      setIsLoading(true);

      /* ----- Step 6: Call Real AI Backend ----- */
      
      // Use user message content for AI request
      const messageText = userMessage.content;
      
      // Include OCR content if available
      const ocrContent = extractedOcrContent || '';
      
      // Call real AI service with OCR content
      console.log('[CHAT] Calling AI service with:', {
        conversationId,
        messageText: messageText.substring(0, 100) + '...',
        ocrContentLength: ocrContent.length
      });
      
      const response = await aiService.chat(conversationId, messageText, ocrContent);
      console.log('[CHAT] AI response received:', response);
      console.log('[CHAT] AI response structure:', {
        hasAiData: !!response.aiData,
        hasResponse: !!response.aiData?.response,
        responseLength: response.aiData?.response?.length || 0
      });

      /* ----- Step 6: Update with Real AI Response ----- */
      
      console.log('[CHAT] Updating assistant message with ID:', assistantId);
      console.log('[CHAT] Current messages count:', messages.length);
      
      // Clear loading state FIRST to ensure message displays properly
      setIsLoading(false);
      setPendingAssistantId(null);
      
      // Force a re-render by updating messages in the next tick
      setTimeout(() => {
        setMessages(prev => {
          console.log('[CHAT] Delayed setMessages called with', prev.length, 'messages');
          console.log('[CHAT] Message IDs in array:', prev.map(m => ({ id: m.id, role: m.role })));
          
          const updated = prev.map(m => {
            if (m.id === assistantId) {
              console.log('[CHAT] Found assistant message to update, ID:', m.id);
              console.log('[CHAT] Assistant message before update:', { id: m.id, content: m.content?.substring(0, 50) });
              
              const updatedMessage = { 
                ...m, 
                content: response.aiData.response,
                metadata: {
                  heading: response.aiData.heading,
                  sources: response.aiData.sources,
                  tokens_used: response.aiData.tokens_used,
                  processing_time: response.aiData.processing_time
                },
                timestamp: new Date() 
              };
              
              console.log('[CHAT] Assistant message after update:', { 
                id: updatedMessage.id, 
                content: updatedMessage.content?.substring(0, 50),
                hasContent: !!updatedMessage.content 
              });
              
              return updatedMessage;
            }
            return m;
          });
          
          console.log('[CHAT] Updated messages count:', updated.length);
          console.log('[CHAT] Updated message IDs:', updated.map(m => ({ id: m.id, hasContent: !!m.content })));
          return updated;
        });
      }, 0);
      
      /* ----- Step 7: Clear Sending Flag ----- */
      
      // Clear sending flag
      isSendingMessageRef.current = false;

      /* ----- Step 8: Handle Unread Count ----- */
      
      if (!isNearBottomRef.current) {
        setUnreadCount(prev => prev + 1);
      }
      
      // Show success toast
      toast({
        title: 'Response received',
        description: 'AI response generated successfully',
      });
      
    } catch (error: any) {
      console.error('Failed to send message:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Remove the pending assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantId));
      
      setIsLoading(false);
      setPendingAssistantId(null);
      
      // Clear sending flag on error
      isSendingMessageRef.current = false;
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get AI response. Please try again.';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  /**
   * handleRegenerate Function
   * 
   * Regenerates an AI response with a new answer
   * 
   * @param messageId - ID of the assistant message to regenerate
   * 
   * USE CASE:
   * - User isn't satisfied with AI response
   * - Clicks regenerate button
   * - AI generates a new response
   * 
   * FLOW:
   * 1. Find the message in the array
   * 2. Find the preceding user message (for context)
   * 3. Set regenerating state (shows loading)
   * 4. Generate new response
   * 5. Update the message in place
   */
  const handleRegenerate = async (messageId: string) => {
    // Find the index of the message to regenerate
    const messageIndex = messages.findIndex(m => m.id === messageId);
    
    // Guard clause: If message not found, exit
    if (messageIndex === -1) return;
    
    if (!currentChatIdRef.current) {
      toast({
        title: 'Error',
        description: 'No active conversation',
        variant: 'destructive'
      });
      return;
    }

    // Find the preceding user message for context
    let userMessage = '';
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMessage = messages[i].content;
        break;
      }
    }

    // Set regenerating state (triggers loading animation on this message)
    setRegeneratingId(messageId);
    
    try {
      // Call real AI service to regenerate
      const response = await aiService.chat(currentChatIdRef.current, userMessage);
      
      // Update the specific message with new content
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            content: response.aiData.response + '\n\n*[Regenerated response]*',
            metadata: {
              heading: response.aiData.heading,
              sources: response.aiData.sources,
              tokens_used: response.aiData.tokens_used,
              processing_time: response.aiData.processing_time
            },
            timestamp: new Date(),
          };
        }
        return m;
      }));
      
      toast({
        title: 'Response regenerated',
        description: 'New AI response generated successfully',
      });
      
    } catch (error) {
      console.error('Failed to regenerate:', error);
      toast({
        title: 'Error',
        description: 'Failed to regenerate response. Please try again.',
        variant: 'destructive'
      });
    } finally {
      // Clear regenerating state
      setRegeneratingId(null);
    }
  };

  /* ---------------------------------------------------------------------------
     EFFECTS (Side Effects)
     --------------------------------------------------------------------------- */

  /**
   * Context Fetch Effect
   * 
   * Fetches conversation context when conversation changes
   * 
   * DEPENDENCY: [currentChatIdRef.current]
   * - Runs whenever conversation ID changes
   * - Updates context display in UI
   */
  useEffect(() => {
    const fetchContext = async () => {
      const conversationId = currentChatIdRef.current;
      if (conversationId) {
        try {
          const context = await aiService.getContext(conversationId);
          console.log('[Chat] Context fetched:', context);
          setCurrentContext(context);
        } catch (error) {
          console.error('[Chat] Failed to fetch context:', error);
        }
      } else {
        setCurrentContext(null);
      }
    };

    fetchContext();
  }, [activeChatId]); // Only depend on activeChatId, not the ref

  /**
   * Auto-Scroll Effect
   * 
   * Automatically scrolls to bottom when messages change
   * 
   * DEPENDENCY: [messages, handleScroll]
   * - Runs whenever messages array changes (new message added)
   * - handleScroll is included because it's used inside
   * 
   * WHY requestAnimationFrame?
   * - Ensures scroll calculation happens after DOM update
   * - Prevents measuring stale scroll positions
   */
  useEffect(() => {
    scrollToBottom();
    // requestAnimationFrame schedules callback for next frame
    // This ensures DOM has updated before we calculate scroll position
    requestAnimationFrame(() => handleScroll());
  }, [messages, handleScroll]);

  /**
   * Track messages changes for debugging
   */
  useEffect(() => {
    console.log('[Chat Debug] Messages array changed:', messages.length, 'messages');
  }, [messages]);
  
  /**
   * Entrance Animation Effect
   * 
   * Triggers fade-in animation after component mounts
   * 
   * DEPENDENCY: [] (empty array)
   * - Runs only once on mount
   * - Never runs again
   * 
   * WHY 50ms DELAY?
   * - Gives browser time to paint initial state
   * - Makes transition visible (from hidden to visible)
   * - Without delay, animation might not be noticeable
   * 
   * CLEANUP:
   * - clearTimeout prevents memory leak if component unmounts quickly
   */
  useEffect(() => {
    const timer = setTimeout(() => setIsContentVisible(true), 50);
    // Cleanup function runs when component unmounts
    return () => clearTimeout(timer);
  }, []);

  /**
   * Initial Message Effect
   * 
   * Handles initial message passed from ChatHome page
   * 
   * DEPENDENCY: [location.state]
   * - Runs when navigation state changes
   * 
   * FLOW:
   * 1. Check if state contains initialMessage
   * 2. Check if we haven't already processed it
   * 3. Mark as processed (prevents duplicate)
   * 4. Send the message
   * 5. Clear navigation state (prevents re-trigger on refresh)
   * 
   * WHY location.state?
   * - React Router allows passing data during navigation
   * - navigate('/chat', { state: { initialMessage: 'Hello' } })
   */
  useEffect(() => {
    // Type assertion: location.state could be anything
    const state = location.state as { initialMessage?: string } | null;
    
    // Guard: Check if we have an initial message and haven't processed it
    if (state?.initialMessage && !initialMessageProcessed.current) {
      // Mark as processed
      initialMessageProcessed.current = true;
      
      // Send the message (async, but we don't await in useEffect)
      handleSendMessage(state.initialMessage).catch((error) => {
        console.error('Failed to send initial message:', error);
        toast({
          title: 'Error',
          description: 'Failed to send message. Please try again.',
          variant: 'destructive'
        });
      });
      
      // Clear the state from history
      // This prevents the message from being re-sent on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, handleSendMessage, toast]);

  /**
   * URL Parameter Loading Effect
   * Loads conversation from database when URL has ?id= parameter.
   * NO localStorage - everything loaded from database!
   */
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const chatId = searchParams.get('id');
    
    console.log('[URL Effect] URL changed:', { chatId, currentRef: currentChatIdRef.current, activeChatId });
    
    // Only check against currentChatIdRef to avoid race condition
    // (activeChatId might already be set by ChatSidebar before navigation)
    if (chatId && chatId !== currentChatIdRef.current) {
      console.log('[URL Effect] New chat detected, setting activeChatId');
      // Defer state update to avoid updating parent while rendering
      // DON'T set currentChatIdRef here - let API effect do it after loading
      setTimeout(() => {
        setActiveChatId(chatId);
        // Don't set initialMessageProcessed here - it should only be set for actual initial messages
      }, 0);
    } else {
      console.log('[URL Effect] Skipping - same chat or no chatId');
    }
  }, [location.search]);

  /* ---------------------------------------------------------------------------
     RENDER
     --------------------------------------------------------------------------- */

  /**
   * JSX Return Statement
   * 
   * Returns the UI structure for the chat page
   * 
   * STRUCTURE:
   * - ChatLayout: Wrapper with sidebar and header
   *   - Scrollable messages container
   *     - Animated messages list
   *       - Individual ChatMessage components
   *     - Scroll anchor (invisible div)
   *     - Scroll-to-bottom button (conditional)
   *   - ChatInput at bottom
   */
  return (
    <ChatLayout onNewChat={handleNewChat} currentContext={currentContext}>
      {/* 
        Messages Container
        
        This div is the scrollable area containing all messages.
        
        CLASSES:
        - flex-1: Take up remaining vertical space
        - overflow-y-auto: Enable vertical scrolling
        - scrollbar-thin: Custom thin scrollbar styling
        - relative: Position context for absolute children (scroll button)
      */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin relative"
      >
        {/* 
          Animated Messages List
          
          Wrapper div that handles entrance animation.
          
          ANIMATION:
          - Initial: opacity-0 translate-y-8 (invisible, shifted down)
          - After mount: opacity-100 translate-y-0 (visible, normal position)
          - Duration: 700ms ease-out
          
          WHAT HAPPENS IF YOU CHANGE DURATION?
          - Increase: Slower, more dramatic entrance
          - Decrease: Faster, snappier feel
        */}
        <div
          className={`pb-4 transition-all duration-700 ease-out ${
            isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Loading State for Messages */}
          {messagesLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          )}
          
          {/* 
            Messages Map
            
            Renders each message as a ChatMessage component.
            
            WHY .map()?
            - Transforms array of data into array of components
            - React's standard pattern for rendering lists
            
            KEY PROP:
            - message.id ensures React can efficiently update the list
            - Without keys, React would re-render all messages on change
          */}
          {!messagesLoading && messages.map((message) => (
            <div key={message.id} className="group">
              {/* 
                Conditional Rendering
                
                If this message is being regenerated, show loading state.
                Otherwise, show the actual message content.
                
                TERNARY SYNTAX: condition ? ifTrue : ifFalse
              */}
              {regeneratingId === message.id ? (
                // Regenerating: Show loading state with empty content
                <ChatMessage
                  message={{ ...message, content: '' }}
                  isLoading={true}
                />
              ) : (
                // Normal: Show message with content
                <ChatMessage 
                  message={message} 
                  // isLoading is true only for the pending assistant message
                  isLoading={isLoading && message.id === pendingAssistantId}
                  // Only assistant messages can be regenerated
                  onRegenerate={message.role === 'assistant' ? () => handleRegenerate(message.id) : undefined}
                />
              )}
            </div>
          ))}
          
          {/* 
            Scroll Anchor
            
            Invisible div at the end of messages.
            scrollToBottom() targets this element.
            
            WHY NEEDED?
            - Provides consistent target for scrollIntoView
            - Position updates automatically as messages are added
          */}
          <div ref={messagesEndRef} />
          
          </div>

        {/* 
          Scroll to Bottom Button
          
          Floating button shown when user scrolls up.
          
          CONDITIONAL RENDERING:
          - {showScrollButton && ...} renders nothing if false
          - Button appears with animation when condition is true
          
          FEATURES:
          - Shows unread count badge
          - Smooth scroll on click
          - Fixed positioning (always visible)
        */}
        {showScrollButton && (
          <Button
            onClick={scrollToBottom}
            size="icon"
            className="chat-scroll-btn"
          >
            <ChevronDown className="w-5 h-5" />
            {/* 
              Unread Badge
              
              Only shown when there are unread messages.
              Uses pulse animation to draw attention.
            */}
            {unreadCount > 0 && (
              <span className="chat-unread-badge">
                {unreadCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* 
        Chat Input Area
        
        Fixed at the bottom, handles message composition.
        
        PROPS:
        - onSend: Callback when user sends a message
        - isLoading: Disables input while AI is responding
        - messages: Used for download feature (export conversation)
      */}
      <div className="border-t bg-background p-4">
        <div className="max-w-4xl mx-auto mb-4">
          <ContextDisplay conversationId={currentChatIdRef.current || ''} />
        </div>
        <ChatInput 
          onSend={handleSendMessage} 
          isLoading={isLoading} 
          messages={messages}
          conversationId={currentChatIdRef.current}
        />
      </div>
    </ChatLayout>
  );
};

/* =============================================================================
   MOCK RESPONSE GENERATORS
   ============================================================================= */

/**
 * generateMockResponse Function
 * 
 * Creates a simulated AI response for text queries.
 * 
 * IN PRODUCTION:
 * - This would be replaced with actual API call
 * - Response would come from AI model (GPT, Claude, etc.)
 * 
 * @param query - The user's question (currently unused but available)
 * @returns Formatted markdown response string
 * 
 * MARKDOWN IN RESPONSE:
 * - **text**: Bold text
 * - - item: Bullet point
 * - 1. item: Numbered list
 * - \n: New line
 */
function generateMockResponse(query: string): string {
  return `Based on your clinical query, I'll provide a comprehensive analysis.

**Clinical Assessment:**
Your question touches on important aspects of patient care that require careful consideration of multiple factors.

**Key Considerations:**
1. Patient history and presenting symptoms
2. Relevant laboratory findings
3. Current evidence-based guidelines
4. Risk stratification and prognosis

**Recommendations:**
- Consider ordering additional diagnostic workup if indicated
- Review current medications for potential interactions
- Implement monitoring protocols as appropriate
- Schedule follow-up assessment

**Evidence Base:**
This assessment is based on current clinical guidelines and peer-reviewed literature. Please verify with your institutional protocols and clinical judgment.

Would you like me to elaborate on any specific aspect of this analysis?`;
}

/**
 * generateFileResponse Function
 * 
 * Creates a simulated AI response for file uploads.
 * 
 * @param files - Array of uploaded files with type information
 * @returns Formatted response acknowledging the files
 * 
 * STRUCTURE:
 * 1. Filter files by type (image vs document)
 * 2. Generate specific response for each category
 * 3. Combine into single response
 */
function generateFileResponse(files: { file: File; type: 'image' | 'document' }[]): string {
  // Separate files by type
  const imageFiles = files.filter(f => f.type === 'image');
  const documentFiles = files.filter(f => f.type === 'document');
  
  let response = `I've received your uploaded files. Here's my analysis:\n\n`;
  
  // Add image analysis section if images present
  if (imageFiles.length > 0) {
    response += `**Image Analysis:**\n`;
    imageFiles.forEach(f => {
      response += `- **${f.file.name}**: I've reviewed this medical image. For accurate interpretation, please describe the clinical context or specific areas of concern you'd like me to focus on.\n`;
    });
    response += `\n`;
  }
  
  // Add document review section if documents present
  if (documentFiles.length > 0) {
    response += `**Document Review:**\n`;
    documentFiles.forEach(f => {
      response += `- **${f.file.name}**: Document received. I can help analyze lab results, clinical notes, or medical reports. Please let me know what specific information you need extracted or reviewed.\n`;
    });
  }
  
  response += `\nWould you like me to proceed with a detailed analysis of any specific file?`;
  
  return response;
}

/* =============================================================================
   EXPORT
   ============================================================================= */

/**
 * Default Export
 * 
 * Exports the Chat component as the default export of this module.
 * 
 * USAGE:
 * import Chat from '@/pages/Chat';
 * 
 * WHY DEFAULT EXPORT?
 * - Standard pattern for page components
 * - Cleaner import syntax
 * - React Router expects default exports for lazy loading
 */
export default Chat;
