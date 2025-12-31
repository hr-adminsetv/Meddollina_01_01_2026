/**
 * =============================================================================
 * CHAT MESSAGE COMPONENT
 * =============================================================================
 * 
 * This component renders individual chat messages in the conversation.
 * It handles both user and AI assistant messages with different styling
 * and functionality for each.
 * 
 * USER MESSAGES:
 * - Aligned to the right
 * - Coral/orange background
 * - Simple display (no actions)
 * 
 * ASSISTANT MESSAGES:
 * - Aligned to the left
 * - Gray/muted background
 * - Action buttons (copy, feedback, regenerate, download)
 * - Loading state with AI thinking animation
 * 
 * VISUAL STRUCTURE:
 * 
 * User Message:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                                    ┌──────────────┐  ┌───┐ │
 * │                                    │ Message text │  │👤│ │
 * │                                    └──────────────┘  └───┘ │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Assistant Message:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ┌───┐  ┌──────────────────────────────────────────────┐    │
 * │ │🤖│  │ Message text...                               │    │
 * │ └───┘  └──────────────────────────────────────────────┘    │
 * │        [📋] [👍] [👎] [🔄] [⬇️]                           │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * @file src/components/chat/ChatMessage.tsx
 * @module ChatMessage
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

/**
 * Lucide React Icons
 * 
 * Icons used in message actions:
 * - User: Avatar for user messages
 * - Copy: Copy to clipboard action
 * - ThumbsUp/Down: Feedback actions
 * - RotateCcw: Regenerate response
 * - Check: Confirmation state
 * - X: Close/cancel
 * - Send: Submit feedback
 * - Download: Download options trigger
 * - FileText: Document download option
 * - MessageSquare: Chat download option
 * - ClipboardList: Case sheet download option
 */
import { 
  User, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCcw, 
  Check, 
  X, 
  Send, 
  Download, 
  FileText, 
  MessageSquare, 
  ClipboardList 
} from 'lucide-react';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AIThinkingAnimation } from './AIThinkingAnimation';
import { toast } from '@/hooks/use-toast';
import MarkdownMessage from './MarkdownMessage';
import { AttachmentList } from './AttachmentPreview';
import { Attachment } from '@/services/chatService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import setvLogo from '@/assets/setv-logo.png';
import { DownloadType } from '@/utils/downloadUtils';
import { DocumentPreviewModal } from './DocumentPreviewModal';

/* =============================================================================
   TYPE DEFINITIONS
   ============================================================================= */

/**
 * Message Interface
 * 
 * Defines the structure of a chat message.
 * Exported for use by parent components (Chat.tsx).
 */
export interface Message {
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
  
  /** Optional file attachments */
  attachments?: Attachment[];
  
  /** Optional OCR extracted text from attachments */
  ocrContent?: string;
  
  /** Optional metadata (heading, sources, etc.) */
  metadata?: {
    heading?: string;
    sources?: string[];
    [key: string]: any;
  };
}

/**
 * ChatMessageProps Interface
 * 
 * Props accepted by the ChatMessage component.
 */
interface ChatMessageProps {
  /** The message data to display */
  message: Message;
  
  /** 
   * Whether this message is currently loading
   * When true, shows AI thinking animation instead of content
   */
  isLoading?: boolean;
  
  /** 
   * Callback to regenerate this assistant response
   * Only provided for assistant messages
   * undefined for user messages (can't regenerate user messages)
   */
  onRegenerate?: () => void;
}

/**
 * FeedbackType
 * 
 * Possible states for user feedback on an assistant message.
 * 
 * VALUES:
 * - 'up': User found message helpful (👍)
 * - 'down': User found message unhelpful (👎)
 * - null: No feedback given yet
 */
type FeedbackType = 'up' | 'down' | null;

/* =============================================================================
   COMPONENT
   ============================================================================= */

/**
 * ChatMessage Component
 * 
 * Renders a single message in the chat conversation.
 * 
 * NOT USING forwardRef HERE:
 * - This component doesn't need ref forwarding
 * - Parent doesn't need direct DOM access
 * - Keeps component simpler
 */
export function ChatMessage({ message, isLoading, onRegenerate }: ChatMessageProps) {
  // Debug log to see what message is being received
  console.log('[ChatMessage] Render:', {
    id: message.id,
    role: message.role,
    isLoading,
    contentLength: message.content?.length || 0,
    contentPreview: message.content?.substring(0, 50) || 'NO CONTENT',
    hasMetadata: !!message.metadata
  });
  
  /* ---------------------------------------------------------------------------
     DERIVED VALUES
     --------------------------------------------------------------------------- */
  
  /**
   * isAssistant
   * 
   * Boolean indicating if this is an AI assistant message.
   * Used throughout component for conditional rendering and styling.
   * 
   * WHY COMPUTE THIS?
   * - Cleaner code than checking message.role everywhere
   * - Single source of truth
   */
  const isAssistant = message.role === 'assistant';
  
  /* ---------------------------------------------------------------------------
     STATE DECLARATIONS
     --------------------------------------------------------------------------- */
  
  /**
   * copied State
   * 
   * Tracks whether message was recently copied.
   * Shows checkmark instead of copy icon for 2 seconds.
   * 
   * UX PATTERN:
   * - Visual confirmation that action succeeded
   * - Returns to default state after timeout
   */
  const [copied, setCopied] = useState(false);
  
  /**
   * feedback State
   * 
   * Current feedback state for the message.
   * Controls styling of thumbs up/down buttons.
   * 
   * VALUES:
   * - null: No feedback (default styling)
   * - 'up': Positive feedback (green, filled icon)
   * - 'down': Negative feedback (red, filled icon)
   */
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  
  /**
   * Feedback Input State
   * 
   * showFeedbackInput: Whether to show text input for detailed feedback
   * feedbackText: The text user types in feedback input
   * 
   * FLOW:
   * 1. User clicks thumbs down
   * 2. showFeedbackInput becomes true
   * 3. Input appears, user types
   * 4. User submits or closes
   */
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  
  /**
   * Modal State
   * 
   * For document preview/download functionality.
   */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<DownloadType>('chat');

  /* ---------------------------------------------------------------------------
     EVENT HANDLERS
     --------------------------------------------------------------------------- */

  /**
   * handleOpenPreview Function
   * 
   * Opens document preview modal for downloading this message.
   * 
   * @param type - Type of document to generate
   */
  const handleOpenPreview = (type: DownloadType) => {
    setPreviewType(type);
    setPreviewOpen(true);
  };

  /**
   * handleCopy Function
   * 
   * Copies message content to user's clipboard.
   * 
   * ASYNC OPERATION:
   * - navigator.clipboard.writeText is async
   * - Can fail (e.g., no permission)
   * - Wrapped in try/catch for error handling
   * 
   * UX FLOW:
   * 1. User clicks copy button
   * 2. Content copied to clipboard
   * 3. Icon changes to checkmark
   * 4. Toast notification appears
   * 5. After 2 seconds, icon returns to copy
   */
  const handleCopy = async () => {
    try {
      // Copy text to clipboard
      await navigator.clipboard.writeText(message.content);
      
      // Show success state
      setCopied(true);
      
      // Show toast notification
      toast({
        title: "Copied to clipboard",
        description: "Response has been copied successfully",
      });
      
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Handle failure (e.g., permission denied)
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  /**
   * handleUpvote Function
   * 
   * Handles positive feedback (thumbs up).
   * 
   * BEHAVIOR:
   * - Sets feedback to 'up'
   * - Closes any open feedback input
   * - Shows appreciation toast
   * 
   * IN PRODUCTION:
   * - Would send feedback to backend
   * - Used for AI improvement/training
   */
  const handleUpvote = () => {
    setFeedback('up');
    setShowFeedbackInput(false);
    toast({
      title: "Thanks for your feedback!",
      description: "We appreciate you letting us know this was helpful.",
    });
  };

  /**
   * handleDownvote Function
   * 
   * Handles negative feedback (thumbs down).
   * 
   * BEHAVIOR:
   * - Sets feedback to 'down'
   * - Shows feedback input for details
   * 
   * WHY ASK FOR DETAILS?
   * - Generic "unhelpful" isn't actionable
   * - Specific feedback helps improve AI
   * - Shows user we care about their experience
   */
  const handleDownvote = () => {
    setFeedback('down');
    setShowFeedbackInput(true);
  };

  /**
   * handleSubmitFeedback Function
   * 
   * Submits the detailed feedback text.
   * 
   * VALIDATION:
   * - Only shows toast if user typed something
   * - Clears input and hides form after submission
   */
  const handleSubmitFeedback = () => {
    if (feedbackText.trim()) {
      toast({
        title: "Feedback submitted",
        description: "Thank you for helping us improve!",
      });
      // IN PRODUCTION: Send to backend
      // await fetch('/api/feedback', { method: 'POST', body: feedbackText })
    }
    setShowFeedbackInput(false);
    setFeedbackText('');
  };

  /**
   * handleCloseFeedback Function
   * 
   * Closes feedback input without submitting.
   * User can cancel if they change their mind.
   */
  const handleCloseFeedback = () => {
    setShowFeedbackInput(false);
    setFeedbackText('');
  };

  /* ---------------------------------------------------------------------------
     RENDER
     --------------------------------------------------------------------------- */

  return (
    /**
     * Message Container
     * 
     * Outer wrapper for the message.
     * 
     * CLASSES:
     * - py-4: Vertical padding between messages
     * - px-4: Horizontal padding from edges
     * 
     * cn UTILITY:
     * - Conditionally joins class names
     * - Empty string for assistant (no special styling needed)
     */
    <div className={cn('py-4 px-4', isAssistant ? '' : '')}>
      {/**
       * Message Row
       * 
       * Constrains width and handles alignment.
       * 
       * max-w-3xl mx-auto:
       * - Maximum width of 48rem (768px)
       * - Centered horizontally
       * - Matches input width for visual alignment
       * 
       * justify-start/justify-end:
       * - Assistant messages: Align to left
       * - User messages: Align to right
       */}
      <div className={cn(
        'max-w-3xl mx-auto flex',
        isAssistant ? 'justify-start' : 'justify-end'
      )}>
        {/**
         * Message Content Container
         * 
         * Contains avatar and message bubble.
         * 
         * flex-row vs flex-row-reverse:
         * - Assistant: Avatar on left, message on right
         * - User: Message on left, avatar on right
         * 
         * max-w-[80%]:
         * - Prevents messages from stretching too wide
         * - Leaves space for visual balance
         */}
        <div className={cn(
          'flex gap-3 max-w-[80%]',
          isAssistant ? 'flex-row' : 'flex-row-reverse'
        )}>
          
          {/* =================================================================
              AVATAR SECTION
              ================================================================= */}
          
          {/**
           * Avatar
           * 
           * Only shown when not loading (loading shows animation instead).
           * 
           * CONDITIONAL RENDERING:
           * - {!isLoading && (...)} only renders when isLoading is false
           * - Prevents avatar from showing alongside loading animation
           * 
           * STYLING DIFFERENCES:
           * - Assistant: Shows logo image, no background
           * - User: Shows user icon with coral background
           */}
          {!isLoading && (
            <div
              className={cn(
                'chat-avatar',
                isAssistant ? 'chat-avatar-assistant' : 'chat-avatar-user'
              )}
            >
              {isAssistant ? (
                // AI Assistant Avatar - Logo image
                <img src={setvLogo} alt="SETV" className="w-8 h-8 object-cover" />
              ) : (
                // User Avatar - Generic user icon
                <User className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
          )}

          {/* =================================================================
              MESSAGE CONTENT SECTION
              ================================================================= */}
          
          {/**
           * Content Column
           * 
           * Contains message bubble and action buttons.
           * 
           * items-start/items-end:
           * - Assistant: Items align left
           * - User: Items align right
           */}
          <div className={cn(
            'flex flex-col',
            isAssistant ? 'items-start' : 'items-end'
          )}>
            
            {/**
             * Message Bubble / Loading State
             * 
             * TERNARY PATTERN:
             * condition ? ifTrue : ifFalse
             * 
             * If loading:
             * - Show AI thinking animation
             * 
             * If not loading:
             * - Show actual message content
             */}
            {isLoading ? (
              // Loading State: Show animated loader WITHOUT bubble background
              <AIThinkingAnimation />
            ) : (
              // Message bubble - only shown when there's actual content
              <>
                {console.log('[ChatMessage] Rendering message bubble:', {
                  hasContent: !!message.content,
                  contentLength: message.content?.length,
                  isAssistant,
                  message: message.content?.substring(0, 50)
                })}
                <div className={cn(
                  'rounded-2xl px-4 py-3 max-w-[600px]',
                  isAssistant 
                    ? 'bg-muted/50 text-foreground' 
                    : 'bg-primary text-primary-foreground'
                )}>
                {/* Display heading for assistant messages if present */}
                {isAssistant && message.metadata?.heading && (
                  <div className="mb-3 pb-2 border-b border-border/40">
                    <h4 className="font-semibold text-sm text-foreground/90">
                      {message.metadata.heading}
                    </h4>
                  </div>
                )}
                
                {isAssistant ? (
                  <MarkdownMessage content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">
                    {message.content}
                  </p>
                )}
                
                {/* Display sources for assistant messages if present */}
                {isAssistant && message.metadata?.sources && message.metadata.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/40">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Sources:</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {message.metadata.sources.map((source, idx) => (
                        <li key={idx} className="text-xs">{source}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Display attachments if present */}
                {message.attachments && message.attachments.length > 0 && (
                  <AttachmentList 
                    attachments={message.attachments} 
                    messageId={message.id}
                  />
                )}
              </div>
              </>
            )}

          {/* =================================================================
              ACTION BUTTONS (Assistant messages only)
              ================================================================= */}
          
          {/**
           * Action Buttons Container
           * 
           * Only shown for assistant messages when not loading.
           * 
           * DOUBLE CONDITION:
           * - isAssistant: Only assistants have actions
           * - !isLoading: No actions while loading
           */}
          {isAssistant && !isLoading && (
            <div className="flex flex-col gap-2 mt-2">
              
              {/**
               * Primary Actions Row
               * 
               * HOVER-TO-REVEAL PATTERN:
               * - opacity-0: Hidden by default
               * - group-hover:opacity-100: Visible when parent has hover
               * 
               * NOTE: Parent needs 'group' class for this to work
               * (Applied in Chat.tsx on the message container)
               */}
              <div className="chat-message-actions">
                  
                  {/* Copy Button */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="chat-action-btn"
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  >
                    {/**
                     * Conditional Icon
                     * 
                     * Shows Check icon when copied, Copy icon otherwise.
                     * Provides visual feedback for successful copy.
                     */}
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  
                  {/* Upvote Button */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "chat-action-btn",
                      // When upvoted, show green color
                      feedback === 'up' && "text-green-500 hover:text-green-600"
                    )}
                    onClick={handleUpvote}
                    title="Helpful"
                  >
                    {/**
                     * ThumbsUp Icon
                     * 
                     * fill-current:
                     * - Fills the icon with current color
                     * - Applied when feedback is 'up'
                     * - Visual distinction from unfilled state
                     */}
                    <ThumbsUp className={cn("w-3.5 h-3.5", feedback === 'up' && "fill-current")} />
                  </Button>
                  
                  {/* Downvote Button */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "chat-action-btn",
                      feedback === 'down' && "text-red-500 hover:text-red-600"
                    )}
                    onClick={handleDownvote}
                    title="Not helpful"
                  >
                    <ThumbsDown className={cn("w-3.5 h-3.5", feedback === 'down' && "fill-current")} />
                  </Button>
                  
                  {/* Regenerate Button */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="chat-action-btn"
                    onClick={onRegenerate}
                    title="Regenerate response"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  
                  {/* Download Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="chat-action-btn"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="chat-dropdown-content">
                      <DropdownMenuItem onClick={() => handleOpenPreview('casesheet')} className="cursor-pointer">
                        <ClipboardList className="w-4 h-4 mr-2" />
                        Case Sheet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenPreview('summarisation')} className="cursor-pointer">
                        <FileText className="w-4 h-4 mr-2" />
                        Summarisation
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenPreview('chat')} className="cursor-pointer">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* =============================================================
                    FEEDBACK INPUT PANEL
                    ============================================================= */}
                
                {/**
                 * Feedback Input
                 * 
                 * Shown when user clicks thumbs down.
                 * Allows providing detailed feedback.
                 * 
                 * ANIMATION:
                 * - animate-in: Triggers entrance animation
                 * - fade-in: Opacity animation
                 * - slide-in-from-top-2: Slides down from above
                 */}
                {showFeedbackInput && (
                  <div className="chat-feedback-panel">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">What went wrong?</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={handleCloseFeedback}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    
                    {/* Feedback textarea */}
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us how we can improve..."
                      className="chat-feedback-textarea"
                    />
                    
                    {/* Submit button */}
                    <div className="flex justify-end mt-2">
                      <Button 
                        size="sm" 
                        className="h-8 px-3"
                        onClick={handleSubmitFeedback}
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Submit
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================
          DOCUMENT PREVIEW MODAL
          ================================================================= */}
      
      <DocumentPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        type={previewType}
        content={message.content}
        messages={[message]}  // Pass current message as an array
        logoUrl={setvLogo}
      />
    </div>
  );
}
