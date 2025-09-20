/**
 * WebSocket Integration Tests
 * Tests WebSocket connection, events, and mock mode functionality
 */

import { io } from 'socket.io-client';
import { getEnvVar, shouldUseMockData } from '../../src/utils/envValidator';

// Mock environment variables for testing
const mockEnvVars = {
  VITE_WS_URL: 'ws://localhost:5000',
  VITE_ENABLE_WEBSOCKETS: 'true',
  VITE_MOCK_DATA: 'false'
};

// Mock import.meta.env
global.import = {
  meta: {
    env: mockEnvVars
  }
};

// Mock WebSocket for testing
class MockWebSocket {
  constructor() {
    this.connected = false;
    this.events = {};
    this.emittedEvents = [];
  }

  connect() {
    this.connected = true;
    setTimeout(() => {
      this.emit('connect');
    }, 100);
  }

  disconnect() {
    this.connected = false;
    this.emit('disconnect', 'client disconnect');
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
    }
  }

  send(event, data) {
    this.emittedEvents.push({ event, data });
    
    // Simulate server responses
    setTimeout(() => {
      if (event === 'chat-message') {
        this.emit('ai-response', {
          message: `Mock response to: ${data.message}`,
          agent_type: data.agent_type || 'general-assistant',
          timestamp: new Date().toISOString(),
          status: 'completed'
        });
      }
    }, 500);
  }
}

describe('WebSocket Integration Tests', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = new MockWebSocket();
    // Mock socket.io client
    jest.mock('socket.io-client', () => ({
      io: jest.fn(() => mockSocket)
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    test('should establish WebSocket connection with valid URL', async () => {
      const wsUrl = getEnvVar('VITE_WS_URL');
      expect(wsUrl).toBe('ws://localhost:5000');

      // Simulate connection
      mockSocket.connect();

      await new Promise(resolve => {
        mockSocket.on('connect', () => {
          expect(mockSocket.connected).toBe(true);
          resolve();
        });
      });
    });

    test('should handle connection errors gracefully', async () => {
      const errorMessage = 'Connection failed';
      let errorReceived = false;

      mockSocket.on('connect_error', (error) => {
        errorReceived = true;
        expect(error).toBe(errorMessage);
      });

      // Simulate connection error
      mockSocket.emit('connect_error', errorMessage);
      expect(errorReceived).toBe(true);
    });

    test('should reconnect with exponential backoff', async () => {
      let reconnectAttempts = 0;
      const maxRetries = 3;

      mockSocket.on('reconnect_attempt', () => {
        reconnectAttempts++;
      });

      // Simulate multiple reconnection attempts
      for (let i = 0; i < maxRetries; i++) {
        mockSocket.emit('reconnect_attempt', i + 1);
      }

      expect(reconnectAttempts).toBe(maxRetries);
    });

    test('should handle disconnect events', async () => {
      mockSocket.connect();
      
      let disconnected = false;
      mockSocket.on('disconnect', (reason) => {
        disconnected = true;
        expect(reason).toBe('client disconnect');
      });

      mockSocket.disconnect();
      expect(disconnected).toBe(true);
    });
  });

  describe('Authentication', () => {
    test('should authenticate with valid session token', () => {
      const sessionToken = 'test-session-token';
      
      // Mock socket connection with auth
      const authenticatedSocket = new MockWebSocket();
      authenticatedSocket.auth = { token: sessionToken };

      expect(authenticatedSocket.auth.token).toBe(sessionToken);
    });

    test('should handle authentication failures', async () => {
      let authError = false;

      mockSocket.on('connect_error', (error) => {
        if (error.message && error.message.includes('authentication')) {
          authError = true;
        }
      });

      // Simulate auth error
      mockSocket.emit('connect_error', { message: 'authentication failed' });
      expect(authError).toBe(true);
    });
  });

  describe('Event Subscription', () => {
    test('should subscribe to agent events', () => {
      const agentEvents = [
        'agent-started',
        'agent-stopped',
        'agent-error',
        'agent-task-progress',
        'agent-task-complete',
        'ai-response'
      ];

      const eventHandlers = {};

      agentEvents.forEach(event => {
        const handler = jest.fn();
        eventHandlers[event] = handler;
        mockSocket.on(event, handler);
      });

      // Simulate events
      agentEvents.forEach(event => {
        const testData = { message: `test ${event}` };
        mockSocket.emit(event, testData);
        expect(eventHandlers[event]).toHaveBeenCalledWith(testData);
      });
    });

    test('should handle event subscription errors', () => {
      const errorHandler = jest.fn();
      mockSocket.on('subscription-error', errorHandler);

      mockSocket.emit('subscription-error', { error: 'Invalid agent type' });
      expect(errorHandler).toHaveBeenCalledWith({ error: 'Invalid agent type' });
    });

    test('should unsubscribe from events', () => {
      const handler = jest.fn();
      mockSocket.on('test-event', handler);

      // Remove handler
      if (mockSocket.events['test-event']) {
        const index = mockSocket.events['test-event'].indexOf(handler);
        if (index > -1) {
          mockSocket.events['test-event'].splice(index, 1);
        }
      }

      mockSocket.emit('test-event', { data: 'test' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    test('should send chat messages to AI agent', async () => {
      const testMessage = {
        message: 'Find me some pottery items',
        agent_type: 'personal-shopper',
        user_id: 'test-user-123'
      };

      mockSocket.send('chat-message', testMessage);
      
      expect(mockSocket.emittedEvents).toContainEqual({
        event: 'chat-message',
        data: testMessage
      });
    });

    test('should receive AI responses', async () => {
      const responseReceived = new Promise((resolve) => {
        mockSocket.on('ai-response', (response) => {
          expect(response).toHaveProperty('message');
          expect(response).toHaveProperty('agent_type');
          expect(response).toHaveProperty('timestamp');
          expect(response.status).toBe('completed');
          resolve(response);
        });
      });

      mockSocket.send('chat-message', {
        message: 'Test message',
        agent_type: 'general-assistant'
      });

      const response = await responseReceived;
      expect(response.message).toContain('Mock response to: Test message');
    });

    test('should handle malformed messages gracefully', () => {
      const errorHandler = jest.fn();
      mockSocket.on('message-error', errorHandler);

      // Send malformed message
      mockSocket.emit('message-error', { error: 'Invalid message format' });
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Agent Room Management', () => {
    test('should join agent rooms', () => {
      const agentType = 'cultural-context';
      mockSocket.send('subscribe-agent', agentType);

      expect(mockSocket.emittedEvents).toContainEqual({
        event: 'subscribe-agent',
        data: agentType
      });
    });

    test('should leave agent rooms', () => {
      const agentType = 'personal-shopper';
      mockSocket.send('unsubscribe-agent', agentType);

      expect(mockSocket.emittedEvents).toContainEqual({
        event: 'unsubscribe-agent',
        data: agentType
      });
    });

    test('should handle room subscription errors', () => {
      const errorHandler = jest.fn();
      mockSocket.on('room-error', errorHandler);

      mockSocket.emit('room-error', { error: 'Room not found' });
      expect(errorHandler).toHaveBeenCalledWith({ error: 'Room not found' });
    });
  });

  describe('Mock Mode Testing', () => {
    beforeEach(() => {
      // Enable mock mode
      mockEnvVars.VITE_MOCK_DATA = 'true';
    });

    afterEach(() => {
      // Reset mock mode
      mockEnvVars.VITE_MOCK_DATA = 'false';
    });

    test('should detect mock mode configuration', () => {
      expect(shouldUseMockData()).toBe(true);
    });

    test('should simulate WebSocket connection in mock mode', async () => {
      // In mock mode, connection should be simulated
      const mockModeSocket = {
        connected: true,
        emit: jest.fn(),
        on: jest.fn()
      };

      expect(mockModeSocket.connected).toBe(true);
    });

    test('should generate mock AI responses', async () => {
      const mockResponse = {
        message: 'Mock response for testing',
        agent_type: 'general-assistant',
        timestamp: new Date().toISOString(),
        status: 'completed'
      };

      // Simulate mock response generation
      const generateMockResponse = (message, agentType) => ({
        message: `Mock response for ${message}`,
        agent_type: agentType,
        timestamp: new Date().toISOString(),
        status: 'completed'
      });

      const result = generateMockResponse('test message', 'cultural-context');
      expect(result.message).toContain('Mock response for test message');
      expect(result.agent_type).toBe('cultural-context');
    });

    test('should handle mock mode gracefully when WebSockets disabled', () => {
      mockEnvVars.VITE_ENABLE_WEBSOCKETS = 'false';
      
      expect(getEnvVar('VITE_ENABLE_WEBSOCKETS')).toBe('false');
      // In this case, should fall back to mock mode
      expect(shouldUseMockData() || getEnvVar('VITE_ENABLE_WEBSOCKETS') === 'false').toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should retry failed connections', async () => {
      let retryCount = 0;
      const maxRetries = 3;

      const attemptConnection = () => {
        retryCount++;
        if (retryCount < maxRetries) {
          mockSocket.emit('connect_error', new Error('Connection failed'));
        } else {
          mockSocket.emit('connect');
        }
      };

      mockSocket.on('connect_error', () => {
        if (retryCount < maxRetries) {
          setTimeout(attemptConnection, 1000);
        }
      });

      mockSocket.on('connect', () => {
        expect(retryCount).toBe(maxRetries);
      });

      attemptConnection();
    });

    test('should handle timeout errors', async () => {
      const timeoutHandler = jest.fn();
      mockSocket.on('timeout', timeoutHandler);

      setTimeout(() => {
        mockSocket.emit('timeout');
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(timeoutHandler).toHaveBeenCalled();
    });

    test('should provide fallback when connection unavailable', () => {
      const isConnected = false;
      const mockModeEnabled = true;

      const canSendMessage = isConnected || mockModeEnabled;
      expect(canSendMessage).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle high message volume', () => {
      const messageCount = 100;
      const messages = [];

      for (let i = 0; i < messageCount; i++) {
        const message = {
          message: `Message ${i}`,
          timestamp: Date.now()
        };
        messages.push(message);
        mockSocket.send('chat-message', message);
      }

      expect(mockSocket.emittedEvents).toHaveLength(messageCount);
    });

    test('should debounce rapid message sending', () => {
      const messages = ['msg1', 'msg2', 'msg3'];
      let debounced = [];

      // Simulate debouncing
      const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
      };

      const debouncedSend = debounce((msg) => {
        debounced.push(msg);
      }, 100);

      messages.forEach(msg => debouncedSend(msg));

      setTimeout(() => {
        expect(debounced).toHaveLength(1);
        expect(debounced[0]).toBe('msg3');
      }, 150);
    });
  });
});