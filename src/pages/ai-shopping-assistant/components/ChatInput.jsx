import React, { useState, useRef } from 'react';
import AppIcon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import AgentSelector from './AgentSelector';
import { useWebSocket } from './WebSocketManager';

const ChatInput = ({
  onSendMessage,
  isLoading,
  selectedAgent,
  onAgentSelect,
  className = ''
}) => {
  const { isConnected } = useWebSocket();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);

  const suggestedQueries = [
    "Show me handwoven textiles from Rajasthan",
    "I'm looking for pottery under ₹2000",
    "Find jewelry with cultural significance",
    "What crafts are popular in South India?"
  ];

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (message?.trim() && !isLoading && selectedAgent) {
      onSendMessage(message?.trim());
      setMessage('');
      if (textareaRef?.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e?.key === 'Enter' && !e?.shiftKey) {
      e?.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e) => {
    setMessage(e?.target?.value);
    
    // Auto-resize textarea
    if (textareaRef?.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef?.current?.scrollHeight, 120)}px`;
    }
  };

  const handleSuggestedQuery = (query) => {
    if (!isLoading && selectedAgent) {
      onSendMessage(query);
    }
  };

  const toggleRecording = () => {
    if (!selectedAgent) return;

    setIsRecording(!isRecording);
    // In a real implementation, this would handle voice recording
    if (!isRecording) {
      // Start recording
      setTimeout(() => {
        setIsRecording(false);
        onSendMessage("Voice message: Show me traditional crafts from Kerala");
      }, 2000);
    }
  };

  return (
    <div className={`border-t border-border bg-background p-4 ${className}`}>
      {/* Agent Selector */}
      <div className="mb-4">
        <AgentSelector
          query={message}
          selectedAgent={selectedAgent}
          onSelect={onAgentSelect}
          className="mb-3"
        />
      </div>

      {!selectedAgent && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          Please select an AI agent to start the conversation
        </div>
      )}

      {!isConnected && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          Connection lost. Attempting to reconnect...
        </div>
      )}

      {/* Suggested Queries */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {suggestedQueries?.map((query, index) => (
            <button
              key={index}
              onClick={() => handleSuggestedQuery(query)}
              disabled={isLoading || !selectedAgent || !isConnected}
              className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {query}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Voice Recording Button */}
        <Button
          type="button"
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          onClick={toggleRecording}
          disabled={isLoading || !selectedAgent || !isConnected}
          className="flex-shrink-0"
        >
          <AppIcon 
            name={isRecording ? "square" : "mic"} 
            className={`w-5 h-5 ${isRecording ? "animate-pulse" : ""}`}
          />
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyPress={handleKeyPress}
            placeholder={selectedAgent 
              ? "Ask me about crafts, artisans, or specific products..."
              : "Select an AI agent to start chatting"
            }
            disabled={isLoading || isRecording || !selectedAgent || !isConnected}
            className="w-full px-4 py-3 pr-12 bg-input border border-border rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            rows="1"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          
          {/* Character Count */}
          <div className="absolute bottom-2 right-3 text-xs text-muted-foreground">
            {message?.length}/500
          </div>
        </div>

        {/* Send Button */}
        <Button
          type="submit"
          variant="default"
          size="icon"
          disabled={!message?.trim() || isLoading || isRecording || !selectedAgent || !isConnected}
          className="flex-shrink-0"
        >
          {isLoading ? (
            <AppIcon name="loader" className="w-5 h-5 animate-spin" />
          ) : (
            <AppIcon name="send" className="w-5 h-5" />
          )}
        </Button>
      </form>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="mt-3 flex items-center justify-center space-x-2 text-destructive">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Recording... Tap to stop</span>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="mt-3 flex items-center justify-center space-x-2 text-muted-foreground">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-sm">AI is thinking...</span>
        </div>
      )}
    </div>
  );
};

export default ChatInput;