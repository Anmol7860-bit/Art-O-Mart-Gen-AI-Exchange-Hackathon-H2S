import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import AppIcon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import ConversationSidebar from './components/ConversationSidebar';
import WelcomeScreen from './components/WelcomeScreen';
import ChatProvider, { useChat } from './components/ChatProvider';
import { useAuth } from '../../contexts/AuthContext';

const AIShoppingAssistantContent = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { isConnected, connectionError, sendMessage } = useChat();
  const messagesEndRef = useRef(null);

  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('productRecommendation');
  const [currentTask, setCurrentTask] = useState(null);
  const [userPreferences, setUserPreferences] = useState({
    budgetMin: 500,
    budgetMax: 10000,
    regions: ['Rajasthan', 'Kerala', 'West Bengal'],
    culturalStories: true,
    craftTypes: ['Textiles', 'Pottery', 'Jewelry']
  });

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message, selectedAgentType = null) => {
    const agentType = selectedAgentType || selectedAgent || 'productRecommendation';
    const userId = session?.user?.id || 'anonymous';

    // Add user message to conversation
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      timestamp: new Date(),
      text: message
    };

    setConversationHistory(prev => [...prev, userMessage]);
    setIsLoading(true);
    setShowWelcome(false);

    // Simulate task progress for better UX
    setCurrentTask({
      id: `task_${Date.now()}`,
      name: `${agentType === 'productRecommendation' ? 'Finding products' : 'Processing request'}`,
      status: 'in-progress',
      progress: 25
    });

    try {
      // Send message to Gemini-powered API
      const response = await sendMessage(message, agentType, userId);
      
      // Add AI response to conversation
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        agentType: response.agentType,
        timestamp: new Date(response.timestamp),
        text: response.response,
        products: response.products || [],
        culturalInsight: response.culturalInsight,
        suggestions: response.suggestions || [],
        metadata: response.metadata
      };

      setConversationHistory(prev => [...prev, aiMessage]);
      
      // Complete the task
      setCurrentTask({
        id: `task_${Date.now()}`,
        name: 'Complete',
        status: 'completed',
        progress: 100
      });

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        agentType: 'customerSupport',
        timestamp: new Date(),
        text: "I'm sorry, I encountered an issue processing your request. Please try again.",
        error: true
      };

      setConversationHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setCurrentTask(null), 2000); // Clear task after 2 seconds
    }
  };

  const handleCancelTask = () => {
    setCurrentTask(null);
    setIsLoading(false);
  };

  const handleRetryTask = () => {
    if (currentTask?.message) {
      handleSendMessage(currentTask.message);
    }
  };

  return (
    <div className="flex h-screen">
      <ConversationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        history={conversationHistory}
        preferences={userPreferences}
        onPreferencesChange={setUserPreferences}
      />

      <div className="flex-1 flex flex-col">
        <Header className="px-4">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
            >
              <AppIcon name="menu" className="w-6 h-6" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                {isConnected ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <span className="text-red-600">
                    {connectionError || 'Disconnected'}
                  </span>
                )}
              </div>
              <h1 className="text-lg font-semibold">AI Shopping Assistant</h1>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <AppIcon name="x" className="w-6 h-6" />
            </Button>
          </div>
        </Header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {showWelcome ? (
            <WelcomeScreen onStart={() => setShowWelcome(false)} />
          ) : (
            <>
              {conversationHistory.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onAgentSelect={(agentType) => {
                    setSelectedAgent(agentType);
                    if (message.text) {
                      handleSendMessage(message.text, agentType);
                    }
                  }}
                  preferences={userPreferences}
                />
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t bg-gray-50 p-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            isConnected={isConnected}
            currentTask={currentTask}
            onCancelTask={handleCancelTask}
            onRetryTask={handleRetryTask}
          />
        </div>
      </div>
    </div>
  );
};

const AIShoppingAssistant = () => (
  <ChatProvider>
    <AIShoppingAssistantContent />
  </ChatProvider>
);

export default AIShoppingAssistant;
