/**
 * =============================================================================
 * CHAT SIDEBAR COMPONENT
 * =============================================================================
 * 
 * The sidebar component for the chat interface with dynamic chat history.
 * 
 * @file src/components/chat/ChatSidebar.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, LogOut, Trash2, Pencil, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import setvLogo from '@/assets/setv-logo.png';
import { useChatContext, ChatHistory } from '@/contexts/ChatContext';
import { toast } from '@/hooks/use-toast';

/* =============================================================================
   TYPE DEFINITIONS
   ============================================================================= */

interface ChatSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  activeChatId?: string;
}

/* =============================================================================
   COMPONENT DEFINITION
   ============================================================================= */

export function ChatSidebar({ isCollapsed, onToggle, onNewChat }: ChatSidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  
  /**
   * Edit Mode State
   * 
   * Tracks which chat is currently being edited and its new title value.
   * - editingChatId: ID of chat being edited (null if none)
   * - editTitle: Current value of the edit input
   */
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  // Get chat history from context
  const { 
    chatHistory, 
    activeChatId, 
    setActiveChatId, 
    deleteChat,
    updateChatTitle
  } = useChatContext();

  // Filter chat history based on search query
  const filteredHistory = chatHistory.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered chats by their timestamp
  const groupedHistory = filteredHistory.reduce((acc, chat) => {
    if (!acc[chat.timestamp]) acc[chat.timestamp] = [];
    acc[chat.timestamp].push(chat);
    return acc;
  }, {} as Record<string, ChatHistory[]>);

  /**
   * handleChatSelect Function
   * 
   * Handles clicking on a chat to select it.
   * Sets the active chat and navigates to the chat URL.
   */
  const handleChatSelect = (chatId: string) => {
    // Don't navigate if currently editing
    if (editingChatId) return;
    setActiveChatId(chatId);
    navigate(`/chat?id=${chatId}`);
  };

  /**
   * handleDeleteChat Function
   * 
   * Handles deleting a chat from history.
   * Stops event propagation to prevent chat selection.
   */
  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    
    console.log('[ChatSidebar] Delete button clicked for chat:', chatId);
    
    try {
      await deleteChat(chatId);
      console.log('[ChatSidebar] Delete successful');
      
      toast({
        title: 'Chat deleted',
        description: 'Conversation has been removed from history',
      });
    } catch (error: any) {
      console.error('[ChatSidebar] Delete failed:', error);
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
  };

  /**
   * handleStartEdit Function
   * 
   * Initiates edit mode for a chat title.
   * Sets the editing state and populates input with current title.
   * 
   * @param e - Mouse event (stopped to prevent chat selection)
   * @param chat - The chat to edit
   */
  const handleStartEdit = (e: React.MouseEvent, chat: ChatHistory) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  /**
   * handleSaveEdit Function
   * 
   * Saves the edited chat title.
   * Updates the chat in context and exits edit mode.
   */
  const handleSaveEdit = () => {
    if (editingChatId && editTitle.trim()) {
      updateChatTitle(editingChatId, editTitle.trim());
    }
    setEditingChatId(null);
    setEditTitle('');
  };

  /**
   * handleCancelEdit Function
   * 
   * Cancels the edit operation without saving.
   */
  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditTitle('');
  };

  /**
   * handleEditKeyDown Function
   * 
   * Handles keyboard events during edit mode.
   * - Enter: Save the edit
   * - Escape: Cancel the edit
   */
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-72'
      )}
    >
      {/* Header: Logo & Toggle Button */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img src={setvLogo} alt="SETV Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-sidebar-foreground tracking-tight">Meddollina</span>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className={cn(
            'w-full gradient-primary text-white hover:opacity-90 transition-opacity',
            isCollapsed ? 'px-2' : 'px-4'
          )}
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">New Consultation</span>}
        </Button>
      </div>

      {/* Search Input (Only when expanded) */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-sidebar-accent text-sidebar-foreground placeholder:text-muted-foreground rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
            />
          </div>
        </div>
      )}

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3">
        {/* Empty state */}
        {!isCollapsed && chatHistory.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No conversations yet</p>
            <p className="text-xs mt-1">Start a new consultation</p>
          </div>
        )}

        {/* Expanded View: Grouped list with titles */}
        {!isCollapsed && Object.entries(groupedHistory).map(([timestamp, chats]) => (
          <div key={timestamp} className="mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-2">
              {timestamp}
            </p>
            
            {chats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const isHovered = chat.id === hoveredChatId;
              const isEditing = chat.id === editingChatId;
              
              return (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors group",
                    isActive && "bg-sidebar-accent"
                  )}
                >
                  {/* Active indicator (green dot) */}
                  {isActive && !isEditing && (
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                  )}
                  
                  {/* Chat title or edit input */}
                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleSaveEdit}
                        autoFocus
                        className="flex-1 px-2 py-1 text-sm bg-sidebar-accent border border-sidebar-ring rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                        className="p-1 rounded hover:bg-green-500/20 text-green-500 transition-colors"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                        className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Chat title */}
                      <span className={cn("truncate flex-1", !isActive && "ml-5")}>{chat.title}</span>
                      
                      {/* Edit and Delete buttons on hover */}
                      {isHovered && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => handleStartEdit(e, chat)}
                            className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                            title="Edit chat name"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteChat(e, chat.id)}
                            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* No results state */}
        {!isCollapsed && searchQuery && filteredHistory.length === 0 && chatHistory.length > 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No matching conversations</p>
          </div>
        )}

        {/* Collapsed View: Dot indicators only */}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-2 pt-2">
            {chatHistory.slice(0, 5).map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <button
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  title={chat.title}
                >
                  {isActive ? (
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30 block" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          className={cn(
            'w-full text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive justify-start',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
