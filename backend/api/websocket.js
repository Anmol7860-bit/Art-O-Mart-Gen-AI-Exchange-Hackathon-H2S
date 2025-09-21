import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/database.js';
import { getAllowedOrigins } from '../middleware/cors.js';

// Event types for WebSocket communication
const EventTypes = {
  AGENT: {
    STARTED: 'agent-started',
    STOPPED: 'agent-stopped',
    ERROR: 'agent-error',
    TASK_PROGRESS: 'agent-task-progress',
    TASK_COMPLETE: 'agent-task-complete',
    CACHE_CLEARED: 'agent-cache-cleared'
  },
  AI: {
    RESPONSE: 'ai-response',
    ERROR: 'ai-error',
    THINKING: 'ai-thinking'
  },
  SYSTEM: {
    ERROR: 'system-error',
    NOTIFICATION: 'system-notification',
    HEALTH: 'system-health',
    SERVER_READY: 'system-server-ready',
    SHUTDOWN: 'system-shutdown'
  }
};

class WebSocketManager {
  constructor(serverOrIo, agentManager) {
    // Store references
    this.agentManager = agentManager;
    
    // Accept either an HTTP server or a pre-created Socket.IO instance
    if (serverOrIo instanceof Server) {
      // Pre-created Socket.IO instance
      this.io = serverOrIo;
      this.server = null;
    } else {
      // HTTP server - create Socket.IO instance
      this.server = serverOrIo;
      this.io = new Server(serverOrIo, {
        cors: {
          origin: (origin, callback) => {
            const allowedOrigins = getAllowedOrigins();
            const isAllowed = !origin || allowedOrigins.includes(origin);
            callback(null, isAllowed);
          },
          methods: ['GET', 'POST'],
          credentials: true
        }
      });
    }

    this.userSessions = new Map();
    this.messageBuffer = new Map();
    this.connectedClients = new Set();
    this.setupAuthMiddleware();
    this.setupEventHandlers();
    this.setupAgentEventListeners();
  }

  /**
   * Setup authentication middleware for Socket.IO
   */
  setupAuthMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
          return next(new Error('Invalid token'));
        }

        // Attach user data to socket
        socket.user = decoded;
        socket.join(`user:${decoded.id}`);
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id} (User: ${socket.user?.id})`);
      this.connectedClients.add(socket.id);
      this.userSessions.set(socket.user?.id || socket.id, socket.id);

      // Handle both subscribe and subscribe-agent events
      socket.on('subscribe', (channel) => {
        this.handleSubscription(socket, channel);
      });

      socket.on('subscribe-agent', (agentType) => {
        this.handleSubscription(socket, `agent:${agentType}`);
      });

      // Handle both unsubscribe and unsubscribe-agent events
      socket.on('unsubscribe', (channel) => {
        this.handleUnsubscription(socket, channel);
      });

      socket.on('unsubscribe-agent', (agentType) => {
        this.handleUnsubscription(socket, `agent:${agentType}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
        this.userSessions.delete(socket.user?.id || socket.id);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
        this.emitToUser(socket.user?.id, EventTypes.SYSTEM.ERROR, {
          message: 'WebSocket error occurred',
          error: error.message
        });
      });
    });
  }

  /**
   * Handle subscription to channels
   */
  handleSubscription(socket, channel) {
    const validChannels = ['agents', 'system', 'ai'];
    
    // Normalize channel names
    if (channel.startsWith('agent:')) {
      socket.join(channel);
      socket.emit('subscribed', channel);
      return;
    }
    
    if (validChannels.includes(channel)) {
      socket.join(channel);
      socket.emit('subscribed', channel);
    } else {
      socket.emit('error', `Invalid channel: ${channel}`);
    }
  }

  /**
   * Handle unsubscription from channels
   */
  handleUnsubscription(socket, channel) {
    if (channel.startsWith('agent:')) {
      socket.leave(channel);
      socket.emit('unsubscribed', channel);
      return;
    }
    
    socket.leave(channel);
    socket.emit('unsubscribed', channel);
  }

  /**
   * Setup event listeners for agent events
   */
  setupAgentEventListeners() {
    if (!this.agentManager) return;
    
    // Agent started event
    this.agentManager.on('agent:started', ({ type, config }) => {
      this.io.to(`agent:${type}`).emit('agent:started', {
        agentType: type,
        config,
        timestamp: new Date().toISOString()
      });
      this.io.to('agents').emit('agent:started', {
        agentType: type,
        config,
        timestamp: new Date().toISOString()
      });
    });

    // Agent stopped event
    this.agentManager.on('agent:stopped', ({ type }) => {
      this.io.to(`agent:${type}`).emit('agent:stopped', {
        agentType: type,
        timestamp: new Date().toISOString()
      });
      this.io.to('agents').emit('agent:stopped', {
        agentType: type,
        timestamp: new Date().toISOString()
      });
    });

    // Agent error event
    this.agentManager.on('agent:error', ({ type, error }) => {
      this.io.to(`agent:${type}`).emit('agent:error', {
        agentType: type,
        error,
        timestamp: new Date().toISOString()
      });
    });

    // Task completed event
    this.agentManager.on('task:completed', ({ type, taskId, result }) => {
      this.io.to(`agent:${type}`).emit('task:completed', {
        agentType: type,
        taskId,
        result,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Broadcast to a specific channel
   */
  broadcast(channel, event, data) {
    if (channel === 'agents') {
      this.io.to('agents').emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    } else if (channel === 'system') {
      this.io.to('system').emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    } else if (channel.startsWith('agent:')) {
      this.io.to(channel).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback to general broadcast
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get active connections count
   */
  getActiveConnections() {
    return this.connectedClients.size;
  }

  /**
   * Close all connections
   */
  closeAllConnections() {
    this.io.close();
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId, event, data) {
    const socketId = this.userSessions.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Emit event to all users subscribed to an agent
   */
  emitToAgent(agentType, event, data) {
    this.io.to(`agent:${agentType}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast system notification to all connected users
   */
  broadcastNotification(message, level = 'info') {
    this.io.emit(EventTypes.SYSTEM.NOTIFICATION, {
      message,
      level,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Buffer messages for disconnected users
   */
  bufferMessage(userId, event, data) {
    if (!this.messageBuffer.has(userId)) {
      this.messageBuffer.set(userId, []);
    }
    this.messageBuffer.get(userId).push({ event, data });
  }

  /**
   * Replay buffered messages for reconnected user
   */
  replayBufferedMessages(userId) {
    const messages = this.messageBuffer.get(userId);
    if (messages?.length) {
      messages.forEach(({ event, data }) => {
        this.emitToUser(userId, event, data);
      });
      this.messageBuffer.delete(userId);
    }
  }
}

export default WebSocketManager;
export { EventTypes };