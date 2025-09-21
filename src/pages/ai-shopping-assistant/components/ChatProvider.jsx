import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true); // Always connected for HTTP mode
  const [connectionError, setConnectionError] = useState(null);

  const sendMessage = async (message, agentType = 'productRecommendation', userId = 'anonymous') => {
    try {
      setConnectionError(null);
      
      // Get the current Vercel app URL or fallback to relative path
      // Use test endpoint to avoid authentication issues
      const apiUrl = window.location.origin + '/api/test-chat';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message,
          agentType,
          userId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Chat API Error:', error);
      setConnectionError(error.message);
      
      // Fallback response
      return {
        response: "I'm here to help! However, I'm experiencing some technical difficulties right now. Please try again in a moment.",
        agentType,
        timestamp: new Date().toISOString(),
        userId,
        conversationId: `conv_${Date.now()}`,
        suggestions: ["Try again", "Help", "Support"],
        metadata: {
          model: "fallback",
          agent: agentType,
          error: error.message
        }
      };
    }
  };

  const subscribe = (event, callback) => {
    // For HTTP mode, we don't need subscriptions
    return () => {}; // Return empty unsubscribe function
  };

  const emit = (event, data) => {
    // For HTTP mode, we don't emit events
    console.log('Emit (HTTP mode):', event, data);
  };

  const value = {
    isConnected,
    connectionError,
    sendMessage,
    subscribe,
    emit
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatProvider;