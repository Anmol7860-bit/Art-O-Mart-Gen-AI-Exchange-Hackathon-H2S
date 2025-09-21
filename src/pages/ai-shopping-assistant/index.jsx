import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import AppIcon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import ConversationSidebar from './components/ConversationSidebar';
import WelcomeScreen from './components/WelcomeScreen';
import AgentManager from './components/AgentManager';
import WebSocketProvider, { useWebSocket } from './components/WebSocketManager';
import TaskProgress from './components/TaskProgress';
import { useAuth } from '../../contexts/AuthContext';
import { chatService } from '../../services/chatService';

const AIShoppingAssistantContent = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { isConnected, subscribe, emit } = useWebSocket();
  const messagesEndRef = useRef(null);

  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentTask, setCurrentTask] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  
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

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to AI responses - handle both camelCase and underscore formats
    const unsubscribeResponse = subscribe('ai-response', (data) => {
      setConversationHistory(prev => [...prev, {
        id: Date.now(),
        sender: 'ai',
        agentType: data.agent_type || data.agentType, // Support both formats
        timestamp: new Date(),
        text: data.message,
        products: data.products || [],
        culturalInsight: data.culturalInsight
      }]);
      setIsLoading(false);
      setCurrentTask(null);
    });

    // Subscribe to task progress
    const unsubscribeProgress = subscribe('agent-task-progress', (data) => {
      setCurrentTask(prev => ({
        ...prev,
        ...data,
        status: 'in-progress'
      }));
    });

    // Subscribe to task completion
    const unsubscribeComplete = subscribe('agent-task-complete', (data) => {
      setCurrentTask(prev => ({
        ...prev,
        ...data,
        status: 'completed'
      }));
    });

    // Subscribe to errors
    const unsubscribeError = subscribe('agent-error', (data) => {
      setCurrentTask(prev => ({
        ...prev,
        status: 'error',
        error: data.error
      }));
      setIsLoading(false);
    });

    return () => {
      unsubscribeResponse();
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [isConnected, subscribe]);

  const handleSendMessage = async (message) => {
    if (!selectedAgent) {
      console.error('No agent selected');
      return;
    }

    // Add user message to conversation
    setConversationHistory(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text: message,
      timestamp: new Date()
    }]);

    setIsLoading(true);
    setShowWelcome(false);

    try {
      // Send message using chat service
      const response = await chatService.sendMessage(message, selectedAgent);
      
      if (response.success) {
        // Add AI response to conversation
        setConversationHistory(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: response.response,
          timestamp: new Date(),
          agent: response.agent
        }]);
      } else {
        // Add error message
        setConversationHistory(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
          isError: true
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setConversationHistory(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: 'I apologize, but I\'m having trouble responding right now. Please try again in a moment.',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTask = () => {
    if (currentTask?.taskId) {
      emit('cancel-task', {
        task_id: currentTask.taskId,
        agent_type: currentTask.agent_type || currentTask.agentType // Support both formats for now
      });
    }
  };

  const handleRetryTask = () => {
    if (currentTask?.taskId && currentTask?.message) {
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
      >
        <AgentManager />
      </ConversationSidebar>

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
            <h1 className="text-xl font-semibold">AI Shopping Assistant</h1>
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
                  {...message}
                  className="max-w-3xl mx-auto"
                />
              ))}
              {currentTask && (
                <TaskProgress
                  {...currentTask}
                  onCancel={handleCancelTask}
                  onRetry={currentTask.status === 'error' ? handleRetryTask : undefined}
                  className="max-w-3xl mx-auto"
                />
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="p-4 border-t">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            selectedAgent={selectedAgent}
            onAgentSelect={setSelectedAgent}
            className="max-w-3xl mx-auto"
          />
        </div>
      </div>
    </div>
  );
};

const AIShoppingAssistant = () => (
  <WebSocketProvider>
    <AIShoppingAssistantContent />
  </WebSocketProvider>
);

export default AIShoppingAssistant;