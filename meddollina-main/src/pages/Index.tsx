import { useState, useRef, useEffect } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessage, Message } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';

const Index = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    setMessages([]);
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateMockResponse(content),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <ChatSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <ChatHeader onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={handleSendMessage} />
          ) : (
            <div className="pb-4">
              {messages.map((message) => (
                <div key={message.id} className="group">
                  <ChatMessage message={message} />
                </div>
              ))}
              {isLoading && (
                <ChatMessage
                  message={{
                    id: 'loading',
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                  }}
                  isLoading
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
};

// Mock response generator
function generateMockResponse(query: string): string {
  const responses: Record<string, string> = {
    default: `Based on your clinical query, I'll provide a comprehensive analysis.

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

Would you like me to elaborate on any specific aspect of this analysis?`,
  };

  return responses.default;
}

export default Index;
