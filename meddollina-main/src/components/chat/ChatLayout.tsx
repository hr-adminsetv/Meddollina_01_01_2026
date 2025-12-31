/**
 * =============================================================================
 * CHAT LAYOUT COMPONENT
 * =============================================================================
 * 
 * Main layout wrapper for the chat interface with responsive sidebar.
 * Desktop: Persistent sidebar | Mobile: Drawer overlay
 * 
 * @file src/components/chat/ChatLayout.tsx
 */

import { forwardRef, ReactNode } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { useChatContext } from '@/contexts/ChatContext';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface ChatLayoutProps {
  /** Child components (messages area and input) */
  children: ReactNode;
  /** Callback when user initiates a new chat */
  onNewChat: () => void;
  /** Current conversation context */
  currentContext?: {
    topic: string;
    score: number;
    messageCount: number;
  } | null;
}

/**
 * ChatLayout - Responsive chat interface layout using forwardRef
 */
export const ChatLayout = forwardRef<HTMLDivElement, ChatLayoutProps>(
  function ChatLayout({ children, onNewChat, currentContext }, ref) {
    // Access shared sidebar state from context
    const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useChatContext();

    return (
      <div ref={ref} className="flex h-screen bg-background">
        {/* Desktop Sidebar - Hidden on mobile (< 1024px), visible on large screens */}
        <div className="hidden lg:block">
          <ChatSidebar
            isCollapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            onNewChat={onNewChat}
          />
        </div>

        {/* Mobile Sidebar Drawer - Slides in from left on small screens */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <SheetTitle className="sr-only">Chat History</SheetTitle>
            <SheetDescription className="sr-only">
              View and manage your chat history
            </SheetDescription>
            <ChatSidebar
              isCollapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
              onNewChat={() => {
                onNewChat();
                setMobileMenuOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content Area - flex-1 takes remaining space, min-w-0 prevents overflow */}
        <main className="flex-1 flex flex-col min-w-0">
          <ChatHeader onMenuClick={() => setMobileMenuOpen(true)} currentContext={currentContext} />
          {children}
        </main>
      </div>
    );
  }
);
