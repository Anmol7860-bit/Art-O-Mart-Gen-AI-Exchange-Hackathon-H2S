/**
 * WebSocket Integration Tests
 * 
 * Comprehensive tests for WebSocket functionality including authentication,
 * event subscriptions, real-time broadcasting, and error handling.
 */

import { createServer } from 'http';
import { jest } from '@jest/globals';
import { Server } from 'socket.io';
import SocketClient from 'socket.io-client';
import jwt from 'jsonwebtoken';

// Mock dependencies
const mockAgentManager = {
  on: jest.fn(),
  off: jest.fn(),
  getAllAgentsStatus: jest.fn(() => ({})),
  agents: new Map()
};

jest.unstable_mockModule('../api/agentManager.js', () => ({
  default: mockAgentManager
}));

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => Promise.resolve({ data: [], error: null }))
  }))
};

jest.unstable_mockModule('../config/database.js', () => ({
  supabaseAdmin: mockSupabase,
  supabaseClient: mockSupabase
}));

describe('WebSocket Integration Tests', () => {
  let httpServer;
  let io;
  let clientSocket;
  let wsManager;
  let validToken;
  let invalidToken;

  beforeAll(async () => {
    // Create test JWT tokens
    const secret = process.env.JWT_SECRET || 'test-secret';
    validToken = jwt.sign({ id: 'test-user-123', email: 'test@example.com' }, secret);
    invalidToken = 'invalid.token.here';

    // Create HTTP server and Socket.IO instance
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Import and initialize WebSocket manager
    const { default: WebSocketManager } = await import('../api/websocket.js');
    wsManager = new WebSocketManager(io, mockAgentManager);

    // Start server
    await new Promise((resolve) => {
      httpServer.listen(0, resolve);
    });
  });

  afterAll(async () => {
    if (io) {
      io.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clean up any existing client connections
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  describe('WebSocket Authentication', () => {
    test('should accept valid JWT token on connection', (done) => {
      const port = httpServer.address().port;
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(new Error(`Connection should succeed with valid token: ${error.message}`));
      });
    });

    test('should reject invalid JWT token', (done) => {
      const port = httpServer.address().port;
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: {
          token: invalidToken
        }
      });

      clientSocket.on('connect', () => {
        done(new Error('Connection should fail with invalid token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });

    test('should reject connection without token', (done) => {
      const port = httpServer.address().port;
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: {}
      });

      clientSocket.on('connect', () => {
        done(new Error('Connection should fail without token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });
  });

  describe('Agent Event Subscriptions', () => {
    beforeEach((done) => {
      const port = httpServer.address().port;
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });

      clientSocket.on('connect', () => {
        done();
      });
    });

    test('should subscribe to agent events', (done) => {
      clientSocket.emit('subscribe', 'agents');
      
      clientSocket.on('subscribed', (channel) => {
        expect(channel).toBe('agents');
        done();
      });
    });

    test('should unsubscribe from agent events', (done) => {
      // First subscribe
      clientSocket.emit('subscribe', 'agents');
      
      clientSocket.on('subscribed', () => {
        // Then unsubscribe
        clientSocket.emit('unsubscribe', 'agents');
      });

      clientSocket.on('unsubscribed', (channel) => {
        expect(channel).toBe('agents');
        done();
      });
    });

    test('should handle invalid subscription channels', (done) => {
      clientSocket.emit('subscribe', 'invalid-channel');
      
      clientSocket.on('error', (error) => {
        expect(error).toMatch(/invalid channel/i);
        done();
      });
    });
  });

  describe('Real-time Event Broadcasting', () => {
    beforeEach((done) => {
      const port = httpServer.address().port;
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('subscribe', 'agents');
        done();
      });
    });

    test('should broadcast agent started event', (done) => {
      const agentType = 'ProductRecommendationAgent';
      
      clientSocket.on('agent:started', (data) => {
        expect(data).toHaveProperty('agentType', agentType);
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Simulate agent started event
      setTimeout(() => {
        wsManager.broadcast('agents', 'agent:started', {
          agentType,
          timestamp: new Date().toISOString()
        });
      }, 10);
    });

    test('should broadcast agent stopped event', (done) => {
      const agentType = 'CustomerSupportAgent';
      
      clientSocket.on('agent:stopped', (data) => {
        expect(data).toHaveProperty('agentType', agentType);
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Simulate agent stopped event
      setTimeout(() => {
        wsManager.broadcast('agents', 'agent:stopped', {
          agentType,
          timestamp: new Date().toISOString()
        });
      }, 10);
    });

    test('should broadcast task completed event', (done) => {
      const taskData = {
        taskId: 'task-123',
        agentType: 'ProductRecommendationAgent',
        result: 'Task completed successfully'
      };
      
      clientSocket.on('task:completed', (data) => {
        expect(data).toHaveProperty('taskId', taskData.taskId);
        expect(data).toHaveProperty('agentType', taskData.agentType);
        expect(data).toHaveProperty('result', taskData.result);
        done();
      });

      // Simulate task completed event
      setTimeout(() => {
        wsManager.broadcast('agents', 'task:completed', taskData);
      }, 10);
    });
  });

  describe('System Notifications', () => {
    beforeEach((done) => {
      const port = httpServer.address().port;
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('subscribe', 'system');
        done();
      });
    });

    test('should receive system health updates', (done) => {
      const healthData = {
        status: 'healthy',
        database: { status: 'connected' },
        agents: { active: 2, total: 5 }
      };
      
      clientSocket.on('system:health', (data) => {
        expect(data).toMatchObject(healthData);
        done();
      });

      // Simulate system health update
      setTimeout(() => {
        wsManager.broadcast('system', 'system:health', healthData);
      }, 10);
    });

    test('should receive error notifications', (done) => {
      const errorData = {
        type: 'agent_error',
        message: 'Agent failed to process task',
        timestamp: new Date().toISOString()
      };
      
      clientSocket.on('system:error', (data) => {
        expect(data).toMatchObject(errorData);
        done();
      });

      // Simulate error notification
      setTimeout(() => {
        wsManager.broadcast('system', 'system:error', errorData);
      }, 10);
    });
  });

  describe('Message Buffering', () => {
    test('should buffer messages for disconnected users', (done) => {
      const port = httpServer.address().port;
      
      // Connect and subscribe
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: { token: validToken }
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('subscribe', 'agents');
        
        // Disconnect after subscribing
        setTimeout(() => {
          clientSocket.disconnect();
          
          // Send message while disconnected
          wsManager.broadcast('agents', 'agent:started', {
            agentType: 'TestAgent',
            timestamp: new Date().toISOString()
          });
          
          // Reconnect after a delay
          setTimeout(() => {
            clientSocket.connect();
          }, 100);
        }, 50);
      });

      // Should receive buffered message on reconnect
      clientSocket.on('agent:started', (data) => {
        expect(data).toHaveProperty('agentType', 'TestAgent');
        done();
      });
    });
  });

  describe('Connection Management', () => {
    test('should track active connections', (done) => {
      const port = httpServer.address().port;
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: { token: validToken }
      });

      clientSocket.on('connect', () => {
        // Verify connection is tracked
        expect(wsManager.getActiveConnections()).toBeGreaterThan(0);
        done();
      });
    });

    test('should clean up on disconnection', (done) => {
      const port = httpServer.address().port;
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: { token: validToken }
      });

      clientSocket.on('connect', () => {
        const initialConnections = wsManager.getActiveConnections();
        
        clientSocket.on('disconnect', () => {
          // Verify connection is removed
          setTimeout(() => {
            expect(wsManager.getActiveConnections()).toBeLessThan(initialConnections);
            done();
          }, 10);
        });
        
        clientSocket.disconnect();
      });
    });

    test('should handle connection errors gracefully', (done) => {
      const port = httpServer.address().port;
      
      // Force connection error by using invalid port
      clientSocket = SocketClient(`http://localhost:${port + 1000}`);

      clientSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should handle high frequency messages', (done) => {
      const port = httpServer.address().port;
      clientSocket = SocketClient(`http://localhost:${port}`, {
        auth: { token: validToken }
      });

      clientSocket.on('connect', () => {
        let messageCount = 0;
        const totalMessages = 10;
        
        clientSocket.on('test:response', () => {
          messageCount++;
          if (messageCount === totalMessages) {
            done();
          }
        });

        // Send multiple messages rapidly
        for (let i = 0; i < totalMessages; i++) {
          clientSocket.emit('test:message', { id: i });
          wsManager.broadcast('test', 'test:response', { id: i });
        }
      });
    });
  });
});