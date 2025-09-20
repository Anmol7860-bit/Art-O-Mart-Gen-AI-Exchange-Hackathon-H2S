import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../../contexts/AuthContext';
import { getEnvVar, isDevelopment, shouldUseMockData } from '../../../utils/envValidator';

const WebSocketContext = createContext(null);

const RETRY_INTERVALS = [1000, 2000, 5000, 10000, 20000]; // Exponential backoff
const MAX_RETRIES = RETRY_INTERVALS.length;

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { session } = useAuth();

  // Use ref to avoid stale closures in event handlers
  const subscribersRef = useRef(new Map());

  // Check if we should use mock data or WebSockets are disabled
  const shouldUseMockMode = shouldUseMockData() || getEnvVar('VITE_ENABLE_WEBSOCKETS') !== 'true';

  useEffect(() => {
    if (shouldUseMockMode) {
      console.log('WebSocket: Using mock mode - WebSockets disabled or mock data enabled');
      setIsConnected(true); // Simulate connection for UI purposes
      return;
    }

    if (!session?.access_token) {
      console.log('WebSocket: No session token available');
      return;
    }

    const wsUrl = getEnvVar('VITE_WS_URL');
    if (!wsUrl) {
      console.error('WebSocket: VITE_WS_URL not configured');
      setConnectionError('WebSocket URL not configured');
      return;
    }

    console.log('WebSocket: Attempting connection to:', wsUrl);
    
    const socketInstance = io(wsUrl, {
      auth: {
        token: session.access_token
      },
      reconnectionAttempts: MAX_RETRIES,
      reconnectionDelay: RETRY_INTERVALS[0],
      reconnectionDelayMax: RETRY_INTERVALS[RETRY_INTERVALS.length - 1],
      timeout: 10000,
      forceNew: true
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      setRetryCount(0);
      setConnectionError(null);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setConnectionError(error.message);
      setRetryCount((prev) => {
        const newCount = prev + 1;
        console.log(`WebSocket retry attempt ${newCount}/${MAX_RETRIES}`);
        return newCount;
      });
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('WebSocket: All reconnection attempts failed');
      setConnectionError('Failed to reconnect after multiple attempts');
      setIsConnected(false);
    });

    // Agent events with error handling
    const agentEvents = [
      'agent-started',
      'agent-stopped',
      'agent-error',
      'agent-task-progress',
      'agent-task-complete',
      'ai-response'
    ];

    agentEvents.forEach(event => {
      socketInstance.on(event, (data) => {
        try {
          const eventSubscribers = subscribersRef.current.get(event) || [];
          eventSubscribers.forEach(callback => callback(data));
        } catch (error) {
          console.error(`Error handling WebSocket event ${event}:`, error);
        }
      });
    });

    setSocket(socketInstance);

    return () => {
      console.log('WebSocket: Cleaning up connection');
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [session?.access_token, shouldUseMockMode]);

  const subscribe = (event, callback) => {
    const currentSubscribers = subscribersRef.current.get(event) || [];
    subscribersRef.current.set(event, [...currentSubscribers, callback]);

    return () => {
      const updatedSubscribers = (subscribersRef.current.get(event) || []).filter(cb => cb !== callback);
      subscribersRef.current.set(event, updatedSubscribers);
    };
  };

  const emit = (event, data) => {
    if (shouldUseMockMode) {
      console.log(`[MOCK MODE] Emitting event: ${event}`, data);
      // Simulate a mock response for development
      setTimeout(() => {
        const eventSubscribers = subscribersRef.current.get('ai-response') || [];
        eventSubscribers.forEach(callback => callback({
          message: `Mock response for ${event}: Here's a simulated AI assistant response.`,
          data: data,
          timestamp: new Date().toISOString(),
          agent_type: data?.agent_type || data?.agentType || 'general-assistant', // Support both formats
          agentType: data?.agentType || data?.agent_type || 'general-assistant', // Include both for compatibility
          status: 'completed'
        }));
      }, Math.random() * 2000 + 1000); // Random delay 1-3 seconds
      return true;
    }

    if (!socket?.connected) {
      console.error('Cannot emit event: socket not connected');
      setConnectionError('Socket not connected');
      return false;
    }

    try {
      socket.emit(event, data);
      console.log(`WebSocket: Emitted event ${event}`, data);
      return true;
    } catch (error) {
      console.error(`Error emitting WebSocket event ${event}:`, error);
      setConnectionError(error.message);
      return false;
    }
  };

  const joinAgentRoom = (agentType) => {
    if (shouldUseMockMode) {
      console.log(`[MOCK MODE] Joining agent room: ${agentType}`);
      return true;
    }

    if (!socket?.connected) {
      console.error('Cannot join agent room: socket not connected');
      return false;
    }

    try {
      socket.emit('subscribe-agent', agentType);
      console.log(`WebSocket: Joined agent room ${agentType}`);
      return true;
    } catch (error) {
      console.error(`Error joining agent room ${agentType}:`, error);
      return false;
    }
  };

  const leaveAgentRoom = (agentType) => {
    if (shouldUseMockMode) {
      console.log(`[MOCK MODE] Leaving agent room: ${agentType}`);
      return true;
    }

    if (!socket?.connected) {
      console.error('Cannot leave agent room: socket not connected');
      return false;
    }

    try {
      socket.emit('unsubscribe-agent', agentType);
      console.log(`WebSocket: Left agent room ${agentType}`);
      return true;
    } catch (error) {
      console.error(`Error leaving agent room ${agentType}:`, error);
      return false;
    }
  };

  const reconnect = () => {
    if (shouldUseMockMode) {
      console.log('[MOCK MODE] Simulating reconnect');
      setIsConnected(true);
      setConnectionError(null);
      return;
    }

    if (socket) {
      console.log('WebSocket: Attempting manual reconnect');
      socket.connect();
    }
  };

  const value = {
    isConnected,
    retryCount,
    connectionError,
    isMockMode: shouldUseMockMode,
    subscribe,
    emit,
    joinAgentRoom,
    leaveAgentRoom,
    reconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketProvider;