import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../../contexts/AuthContext';

const WebSocketContext = createContext(null);

const RETRY_INTERVALS = [1000, 2000, 5000, 10000]; // Retry delays in ms
const MAX_RETRIES = RETRY_INTERVALS.length;

export const WebSocketProvider = ({ children }) => {
  const { session } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [subscribers, setSubscribers] = useState(new Map());

  useEffect(() => {
    if (!session?.access_token) return;

    const socketInstance = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
      auth: {
        token: session.access_token
      },
      reconnectionAttempts: MAX_RETRIES,
      reconnectionDelay: RETRY_INTERVALS[0],
      reconnectionDelayMax: RETRY_INTERVALS[RETRY_INTERVALS.length - 1]
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setRetryCount(0);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setRetryCount((prev) => prev + 1);
    });

    // Agent events
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
        const eventSubscribers = subscribers.get(event) || [];
        eventSubscribers.forEach(callback => callback(data));
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [session?.access_token]);

  const subscribe = (event, callback) => {
    setSubscribers(prev => {
      const eventSubscribers = prev.get(event) || [];
      return new Map(prev).set(event, [...eventSubscribers, callback]);
    });

    return () => {
      setSubscribers(prev => {
        const eventSubscribers = prev.get(event) || [];
        return new Map(prev).set(event,
          eventSubscribers.filter(cb => cb !== callback)
        );
      });
    };
  };

  const emit = (event, data) => {
    if (!socket?.connected) {
      console.error('Cannot emit event: socket not connected');
      return false;
    }
    socket.emit(event, data);
    return true;
  };

  const joinAgentRoom = (agentType) => {
    if (!socket?.connected) return false;
    socket.emit('subscribe-agent', agentType);
    return true;
  };

  const leaveAgentRoom = (agentType) => {
    if (!socket?.connected) return false;
    socket.emit('unsubscribe-agent', agentType);
    return true;
  };

  const value = {
    isConnected,
    retryCount,
    subscribe,
    emit,
    joinAgentRoom,
    leaveAgentRoom
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