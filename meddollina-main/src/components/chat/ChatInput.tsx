/**
 * =============================================================================
 * CHAT INPUT COMPONENT
 * =============================================================================
 * 
 * This component provides the message composition interface at the bottom
 * of the chat. It handles everything related to user input:
 * 
 * FEATURES:
 * - Auto-expanding textarea (grows with content)
 * - File attachments (images and documents)
 * - Download conversation options
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Responsive design (different layouts for mobile/desktop)
 * 
 * VISUAL STRUCTURE:
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  ┌─────────────────────────────────────────────────────────────────┐ │
 * │  │ [Attached files preview - shown when files are selected]        │ │
 * │  └─────────────────────────────────────────────────────────────────┘ │
 * │  ┌─────────────────────────────────────────────────────────────────┐ │
 * │  │ 📎 🖼️ │ [    Text input area...    ] │ ⬇️ 🎤 [Send] │         │ │
 * │  └─────────────────────────────────────────────────────────────────┘ │
 * │           Disclaimer text about AI-assisted clinical intelligence     │
 * └──────────────────────────────────────────────────────────────────────┘
 * 
 * @file src/components/chat/ChatInput.tsx
 * @module ChatInput
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

/**
 * React Core Imports
 * 
 * - forwardRef: Enables ref forwarding (parent can get DOM reference)
 * - useState: Reactive state management
 * - useRef: DOM element references
 * - useEffect: Side effects (textarea auto-resize)
 */
import { forwardRef, useState, useRef, useEffect, useImperativeHandle } from 'react';

/**
 * Lucide React Icons
 * 
 * Each icon is individually imported for tree-shaking.
 * Only imported icons are included in the final bundle.
 * 
 * ICONS USED:
 * - Send: Send button icon (paper plane)
 * - Paperclip: Document attachment
 * - Mic: Voice input (future feature)
 * - Image: Image attachment
 * - X: Remove/close
 * - FileText: Document icon
 * - Download: Download menu trigger
 * - ClipboardList: Case sheet download option
 * - MessageSquare: Chat download option
 */
import { Send, Paperclip, Mic, Image, X, FileText, Download, ClipboardList, MessageSquare, Sparkles } from 'lucide-react';

/**
 * Internal Dependencies
 */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import setvLogo from '@/assets/setv-logo.png';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DownloadType } from '@/utils/downloadUtils';
import { fileUploadBus } from '@/utils/fileUploadBus';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* =============================================================================
   TYPE DEFINITIONS
   ============================================================================= */

/**
 * AttachedFile Interface
 * 
 * Represents a file that user has attached to their message.
 * 
 * PROPERTIES:
 * - file: The actual File object from browser's File API
 * - preview: Data URL for image thumbnails (optional)
 * - type: Category for UI handling
 */
export interface AttachedFile {
  /** The native File object containing actual file data */
  file: File;
  
  /** 
   * Preview URL for images (created via URL.createObjectURL)
   * Undefined for documents (no preview needed)
   */
  preview?: string;
  
  /** 
   * File type category
   * Used to determine icon and handling
   */
  type: 'image' | 'document';
}

/**
 * Message Interface
 * 
 * Simplified message structure for download feature.
 * Different from the full Message interface in ChatMessage.tsx
 * because we only need these fields for export.
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * ChatInputProps Interface
 * 
 * Props accepted by the ChatInput component.
 */
interface ChatInputProps {
  /**
   * Callback when user sends a message
   * 
   * @param message - Text content of the message
   * @param files - Optional files to send
   * 
   * EXAMPLE USAGE BY PARENT:
   * <ChatInput onSend={(message, files) => sendToAPI(message, files)} />
   */
  onSend: (message: string, files?: AttachedFile[]) => void;
  
  /**
   * Loading state indicator
   * 
   * When true:
   * - Send button is disabled
   * - Prevents double-submission
   */
  isLoading: boolean;
  
  /**
   * Current conversation messages
   * 
   * Used for the download feature.
   * Optional because download might not always be needed.
   */
  messages?: Message[];
  
  /**
   * Current conversation ID
   * 
   * Used for the summarization feature.
   */
  conversationId?: string;
}

/**
 * ChatInputHandle Interface
 * 
 * Methods exposed to parent via ref.
 * Allows parent to control the input programmatically.
 */
export interface ChatInputHandle {
  /**
   * Set the input text value
   * @param text - Text to populate in the input field
   */
  setText: (text: string) => void;
  
  /**
   * Focus the input field
   */
  focus: () => void;
}

/* =============================================================================
   CONSTANTS
   ============================================================================= */

/**
 * MAX_FILE_SIZE
 * 
 * Maximum allowed file size in bytes.
 * 10MB = 10 * 1024 * 1024 = 10,485,760 bytes
 * 
 * WHY 10MB?
 * - Reasonable balance between functionality and performance
 * - Prevents browser memory issues
 * - Common limit for file uploads
 * 
 * WHAT HAPPENS IF YOU INCREASE IT?
 * - Larger files can be uploaded
 * - More memory usage
 * - Slower upload experience
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * MAX_TEXTAREA_HEIGHT
 * 
 * Maximum height the textarea can grow to (in pixels).
 * 
 * WHY 200px?
 * - Prevents textarea from taking over the screen
 * - Still allows for reasonably long messages
 * - Scrollbar appears when content exceeds this
 */
const MAX_TEXTAREA_HEIGHT = 200;

/* =============================================================================
   COMPONENT
   ============================================================================= */

/**
 * ChatInput Component
 * 
 * Wrapped in forwardRef to allow parent components to pass refs.
 * The ref exposes methods to control the input programmatically.
 */
export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  ({ onSend, isLoading, messages, conversationId }, ref) => {
    
    /* -------------------------------------------------------------------------
       STATE DECLARATIONS
       ------------------------------------------------------------------------- */
    
    /**
     * input State
     * 
     * Stores the current text in the textarea.
     * 
     * TYPE: string
     * INITIAL: '' (empty string)
     * 
     * CONTROLLED INPUT PATTERN:
     * - Value comes from state (value={input})
     * - Changes update state (onChange -> setInput)
     * - React has full control over the input
     */
    const [input, setInput] = useState('');
    
    /**
     * attachedFiles State
     * 
     * Array of files user has attached to their message.
     * 
     * TYPE: AttachedFile[]
     * INITIAL: [] (no files attached)
     * 
     * CAN CONTAIN:
     * - Multiple images
     * - Multiple documents
     * - Mix of both
     */
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    
    /**
     * Modal State for Document Preview
     * 
     * previewOpen: Controls modal visibility
     * previewType: Which download format to preview
     */
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewType, setPreviewType] = useState<DownloadType>('chat');
    
    /* -------------------------------------------------------------------------
       REF DECLARATIONS
       ------------------------------------------------------------------------- */
    
    /**
     * textareaRef
     * 
     * Reference to the textarea DOM element.
     * 
     * USED FOR:
     * - Auto-resizing based on content
     * - Direct DOM manipulation (faster than state for this)
     */
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    /**
     * Hidden File Input Refs
     * 
     * References to hidden <input type="file"> elements.
     * 
     * WHY HIDDEN INPUTS?
     * - Native file inputs are hard to style
     * - We click them programmatically
     * - Browser opens native file picker
     * 
     * PATTERN:
     * 1. User clicks styled button
     * 2. Button triggers ref.current.click()
     * 3. Hidden input opens file picker
     * 4. onChange handler processes selected files
     */
    const imageInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);

    /* -------------------------------------------------------------------------
       EXPOSED METHODS (via ref)
       ------------------------------------------------------------------------- */

    /**
     * useImperativeHandle
     * 
     * Exposes methods to parent components via ref.
     * Parent can call: inputRef.current.setText('text')
     */
    useImperativeHandle(ref, () => ({
      setText: (text: string) => {
        setInput(text);
        // Focus and resize textarea after setting text
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Trigger resize on next frame
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
            }
          }, 0);
        }
      },
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    /* -------------------------------------------------------------------------
       EVENT HANDLERS
       ------------------------------------------------------------------------- */

    /**
     * handleOpenPreview Function
     * 
     * Opens the document preview modal for download.
     * 
     * @param type - Type of document to generate ('chat', 'casesheet', 'summarisation')
     * 
     * VALIDATION:
     * - If no messages, show error toast
     * - Can't download empty conversation
     */
    const handleOpenPreview = (type: DownloadType) => {
      // Guard: Check if there are messages to download
      if (!messages || messages.length === 0) {
        toast({
          title: "No messages",
          description: "There are no messages to download",
          variant: "destructive",
        });
        return;
      }
      
      // Set the type and open modal
      setPreviewType(type);
      setPreviewOpen(true);
    };

    /**
     * handleFileSelect Function
     * 
     * Processes files when user selects them from file picker.
     * 
     * @param e - The change event from file input
     * @param type - Whether this is 'image' or 'document'
     * 
     * VALIDATION:
     * 1. File size (must be under MAX_FILE_SIZE)
     * 2. File type (images must start with 'image/')
     * 
     * PROCESSING:
     * 1. Loop through selected files
     * 2. Validate each file
     * 3. Create preview URL for images
     * 4. Add to attachedFiles array
     */
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
      console.log('[ChatInput] handleFileSelect called, type:', type);
      
      // Get files from the input element
      const files = e.target.files;
      console.log('[ChatInput] Files selected:', files ? files.length : 0);
      
      // Guard: If no files selected, exit
      if (!files) {
        console.log('[ChatInput] No files, returning');
        return;
      }

      // Array to collect valid files
      const newFiles: AttachedFile[] = [];

      // Process each file
      Array.from(files).forEach(file => {
        /* ----- Validation: File Size ----- */
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 10MB limit`,
            variant: "destructive"
          });
          return; // Skip this file, continue to next
        }

        /* ----- Validation: Image Type ----- */
        if (type === 'image' && !file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: "Please select an image file",
            variant: "destructive"
          });
          return; // Skip this file
        }

        /* ----- Create AttachedFile Object ----- */
        const attachedFile: AttachedFile = { file, type };
        
        /* ----- Generate Preview for Images ----- */
        if (type === 'image') {
          /**
           * URL.createObjectURL
           * 
           * Creates a temporary URL pointing to the file in memory.
           * Used for displaying image preview without uploading.
           * 
           * IMPORTANT: Must be revoked when done to free memory
           * (See removeFile function)
           */
          attachedFile.preview = URL.createObjectURL(file);
        }
        
        newFiles.push(attachedFile);
      });

      console.log('[ChatInput] New files to add:', newFiles.length);
      console.log('[ChatInput] Files:', newFiles.map(f => ({ name: f.file.name, size: f.file.size, type: f.type })));
      
      // Add new files to existing array
      // Using functional update to ensure we have latest state
      setAttachedFiles(prev => {
        const updated = [...prev, ...newFiles];
        console.log('[ChatInput] Updated attachedFiles count:', updated.length);
        return updated;
      });
      
      // Reset input value to allow re-selecting same file
      e.target.value = '';
    };

    /**
     * removeFile Function
     * 
     * Removes a file from the attached files list.
     * 
     * @param index - Index of the file to remove
     * 
     * MEMORY MANAGEMENT:
     * - Revokes object URL to prevent memory leak
     * - URL.createObjectURL creates blob in memory
     * - Must call URL.revokeObjectURL when done
     */
    const removeFile = (index: number) => {
      setAttachedFiles(prev => {
        const file = prev[index];
        
        // Clean up: Revoke object URL if it exists
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
        
        // Return new array without the removed file
        return prev.filter((_, i) => i !== index);
      });
    };

    /**
     * handleSubmit Function
     * 
     * Handles form submission when user sends a message.
     * 
     * @param e - Form submit event
     * 
     * VALIDATION:
     * - Must have text input OR attached files
     * - Must not be in loading state
     * 
     * ACTIONS:
     * 1. Prevent default form submission
     * 2. Validate input
     * 3. Call onSend callback
     * 4. Clear input and files
     */
    const handleSubmit = (e: React.FormEvent) => {
      // Prevent browser's default form submission (page reload)
      e.preventDefault();
      
      // Validate: Need content and not loading
      if ((input.trim() || attachedFiles.length > 0) && !isLoading) {
        console.log('[ChatInput] Sending message');
        console.log('[ChatInput] Input:', input.trim());
        console.log('[ChatInput] Attached files count:', attachedFiles.length);
        console.log('[ChatInput] Attached files:', attachedFiles.map(f => ({ name: f.file.name, type: f.type })));
        
        const filesToSend = attachedFiles.length > 0 ? attachedFiles : undefined;
        const messageToSend = input.trim();
        
        console.log('[ChatInput] NEW FLOW - Using FileUploadBus');
        console.log('[ChatInput] Message:', messageToSend);
        console.log('[ChatInput] Files:', filesToSend);
        console.log('[ChatInput] Files count:', filesToSend?.length);
        
        // NEW: Store files in the global event bus
        if (filesToSend && filesToSend.length > 0) {
          console.log('[ChatInput] 📤 Storing files in FileUploadBus:', filesToSend);
          fileUploadBus.setFiles(filesToSend);
        } else {
          console.log('[ChatInput] No files to store in bus');
          fileUploadBus.clear();
        }
        
        // Call parent's send handler with ONLY the message
        // Files will be retrieved from the bus in Chat.tsx
        console.log('[ChatInput] Calling onSend with message only');
        const result = onSend(messageToSend, undefined);
        console.log('[ChatInput] onSend called');
        
        // Reset input state
        setInput('');
        setAttachedFiles([]);
      }
    };

    /**
     * handleKeyDown Function
     * 
     * Handles keyboard shortcuts in the textarea.
     * 
     * SHORTCUTS:
     * - Enter: Submit message
     * - Shift+Enter: Insert newline (default behavior)
     * 
     * WHY NOT JUST onKeyPress?
     * - onKeyDown fires before the character is inserted
     * - Allows preventing default behavior
     * - More reliable for shortcuts
     */
    const handleKeyDown = (e: React.KeyboardEvent) => {
      // Check if Enter is pressed without Shift
      if (e.key === 'Enter' && !e.shiftKey) {
        // Prevent newline from being inserted
        e.preventDefault();
        // Submit the form
        handleSubmit(e);
      }
      // If Shift+Enter, default behavior inserts newline
    };

    /* -------------------------------------------------------------------------
       EFFECTS (Side Effects)
       ------------------------------------------------------------------------- */

    /**
     * Textarea Auto-Resize Effect
     * 
     * Automatically adjusts textarea height based on content.
     * 
     * DEPENDENCY: [input]
     * - Runs whenever input text changes
     * 
     * HOW IT WORKS:
     * 1. Reset height to 'auto' (collapse to minimum)
     * 2. Read scrollHeight (height needed for all content)
     * 3. Set height to smaller of scrollHeight or max
     * 
     * WHY 'auto' FIRST?
     * - Without it, height only grows, never shrinks
     * - 'auto' allows measurement of true content height
     */
    useEffect(() => {
      if (textareaRef.current) {
        // Step 1: Reset to auto to get true content height
        textareaRef.current.style.height = 'auto';
        
        // Step 2: Calculate new height (capped at max)
        const newHeight = Math.min(
          textareaRef.current.scrollHeight,
          MAX_TEXTAREA_HEIGHT
        );
        
        // Step 3: Apply the height
        textareaRef.current.style.height = `${newHeight}px`;
      }
    }, [input]);

    /* -------------------------------------------------------------------------
       COMPUTED VALUES
       ------------------------------------------------------------------------- */

    /**
     * hasContent
     * 
     * Boolean indicating if there's any content to send.
     * Used for:
     * - Enabling/disabling send button
     * - Styling send button (active vs inactive)
     */
    const hasContent = input.trim() || attachedFiles.length > 0;

    /* -------------------------------------------------------------------------
       RENDER
       ------------------------------------------------------------------------- */

    return (
      /**
       * Root Container
       * 
       * ref: Forwarded from parent
       * className: Uses CSS class defined in index.css
       * 
       * STYLING:
       * - Border top separates from messages
       * - Semi-transparent background with blur
       */
      <div className="chat-input-container">
        {/* 
          Inner Container
          
          Constrains width and adds padding.
          max-w-3xl matches the messages container for alignment.
        */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          
          {/* =================================================================
              ATTACHED FILES PREVIEW SECTION
              ================================================================= */}
          
          {/**
           * Conditional Rendering
           * 
           * Only shows when files are attached.
           * Pattern: {condition && <Component />}
           * If condition is false, nothing renders.
           */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {/**
               * Files Map
               * 
               * Renders each attached file as a removable chip.
               * 
               * KEY:
               * - Using index as key is okay here because:
               *   - List is small
               *   - Items are only added/removed, not reordered
               * - For larger/dynamic lists, use unique IDs
               */}
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="chat-attached-file"
                >
                  {/**
                   * File Preview/Icon
                   * 
                   * Images: Show thumbnail
                   * Documents: Show file icon
                   */}
                  {file.type === 'image' && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <FileText className="w-5 h-5 text-primary" />
                  )}
                  
                  {/* File Name (truncated if too long) */}
                  <span className="text-sm text-foreground max-w-[120px] truncate">
                    {file.file.name}
                  </span>
                  
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="chat-file-remove-btn"
                    aria-label={`Remove ${file.file.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* =================================================================
              MAIN INPUT FORM
              ================================================================= */}
          
          <form onSubmit={handleSubmit}>
            <div className="chat-input-wrapper">
              
              {/* -------------------------------------------------------------
                  HIDDEN FILE INPUTS
                  ------------------------------------------------------------- */}
              
              {/**
               * Hidden Image Input
               * 
               * type="file": Native file picker
               * accept="image/*": Only allow image files
               * multiple: Allow selecting multiple files
               * className="hidden": Visually hidden
               * ref: For programmatic clicking
               * 
               * WHY HIDDEN?
               * - Native file inputs are ugly and inconsistent
               * - We use styled buttons that trigger this
               */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'image')}
                aria-label="Upload images"
              />
              
              {/**
               * Hidden Document Input
               * 
               * accept: Specifies allowed file extensions
               * .pdf, .doc, .docx, .txt, .csv, .xls, .xlsx
               */}
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'document')}
                aria-label="Upload documents"
              />

              {/* -------------------------------------------------------------
                  LEFT ACTION BUTTONS - ATTACHMENTS
                  ------------------------------------------------------------- */}
              
              <div className="flex items-center gap-1 sm:gap-1.5 pb-1">
                {/**
                 * Document Attach Button
                 * 
                 * onClick: Programmatically clicks the hidden input
                 * documentInputRef.current?.click(): Safe navigation
                 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="chat-input-icon-btn"
                  onClick={() => documentInputRef.current?.click()}
                  title="Attach document"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                {/* Image Attach Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="chat-input-icon-btn"
                  onClick={() => imageInputRef.current?.click()}
                  title="Attach image"
                >
                  <Image className="w-4 h-4" />
                </Button>
              </div>

              {/* -------------------------------------------------------------
                  TEXTAREA
                  ------------------------------------------------------------- */}
              
              {/**
               * Message Textarea
               * 
               * CONTROLLED COMPONENT:
               * - value={input}: Display state value
               * - onChange={...}: Update state on change
               * 
               * AUTO-RESIZE:
               * - rows={1}: Start with single line
               * - Height controlled via useEffect
               * 
               * ACCESSIBILITY:
               * - aria-label: Describes purpose for screen readers
               * - placeholder: Visual hint for users
               */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your clinical question..."
                rows={1}
                className="chat-textarea"
                aria-label="Message input"
              />

              {/* -------------------------------------------------------------
                  RIGHT ACTION BUTTONS
                  ------------------------------------------------------------- */}
              
              <div className="flex items-center gap-1 sm:gap-1.5 pb-1">
                
                {/**
                 * Download Dropdown
                 * 
                 * Only shown when there are messages to download.
                 * 
                 * DropdownMenu: Radix UI component
                 * - Handles positioning, keyboard nav, focus
                 * - Accessible by default
                 */}
                {messages && messages.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="chat-input-icon-btn"
                        title="Download chat"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="chat-dropdown-content">
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
                        Chat History
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/**
                 * Voice Input Button
                 * 
                 * PLACEHOLDER for future feature.
                 * hidden sm:flex: Only show on larger screens
                 */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="chat-input-icon-btn hidden sm:flex"
                  title="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </Button>
                
                {/**
                 * Send Button
                 * 
                 * STATES:
                 * - Disabled: No content or loading
                 * - Active: Has content, shows gradient
                 * - Inactive: No content, muted style
                 * 
                 * cn UTILITY:
                 * - Merges class names conditionally
                 * - Handles className conflicts
                 */}
                <Button
                  type="submit"
                  disabled={!hasContent || isLoading}
                  className={cn(
                    'chat-send-btn',
                    hasContent ? 'chat-send-btn-active' : 'chat-send-btn-inactive'
                  )}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* =================================================================
              DISCLAIMER TEXT
              ================================================================= */}
          
          {/**
           * Disclaimer
           * 
           * Important for medical AI applications.
           * Reminds users that AI is assistive, not definitive.
           */}
          <p className="text-xs text-center text-muted-foreground mt-3">
            Meddollina provides AI-assisted clinical intelligence. Always verify with clinical judgment and guidelines.
          </p>
        </div>

        {/* =================================================================
            DOCUMENT PREVIEW MODAL
            ================================================================= */}
        
        {/**
         * DocumentPreviewModal
         * 
         * Modal for previewing and downloading conversations.
         * 
         * PROPS:
         * - isOpen: Controls visibility
         * - onClose: Called when modal should close
         * - type: Document format to generate
         * - content: Text content for the document
         * - messages: Full conversation (for chat export)
         * - logoUrl: Logo to include in document
         * - isFullChat: Whether to include full conversation
         */}
        <DocumentPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          type={previewType}
          content={previewType === 'casesheet' ? messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n\n') : ''}
          messages={messages}
          logoUrl={setvLogo}
          isFullChat={previewType === 'chat' || previewType === 'casesheet' || previewType === 'summarisation'}
          conversationId={conversationId}
        />
      </div>
    );
  }
);
