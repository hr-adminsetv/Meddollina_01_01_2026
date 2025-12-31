import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatInput, ChatInputHandle, AttachedFile } from '@/components/chat/ChatInput';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { useChatContext } from '@/contexts/ChatContext';

const ChatHome = () => {
  const navigate = useNavigate();
  const chatInputRef = useRef<ChatInputHandle>(null);
  const { setActiveChatId } = useChatContext();

  // Clear active chat when landing on home page
  useEffect(() => {
    setActiveChatId(null);
  }, [setActiveChatId]);

  const handleNewChat = () => {
    // Already on chat home, just stay here
  };

  const handleSendMessage = (content: string, files?: AttachedFile[]) => {
    // Navigate to chat with the initial message
    // Note: files are not passed through navigation, only the message
    navigate('/chat', { state: { initialMessage: content } });
  };

  const handleSuggestionClick = (text: string) => {
    // Populate the input field instead of sending immediately
    chatInputRef.current?.setText(text);
  };

  return (
    <ChatLayout onNewChat={handleNewChat}>
      {/* Welcome Screen with entrance animation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-bottom-4 duration-500">
        <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
      </div>

      {/* Input Area */}
      <ChatInput ref={chatInputRef} onSend={handleSendMessage} isLoading={false} />
    </ChatLayout>
  );
};

export default ChatHome;
