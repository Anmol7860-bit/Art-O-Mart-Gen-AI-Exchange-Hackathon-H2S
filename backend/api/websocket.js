import { Server } from 'socket.io';
import { supabaseAdmin } from '../config/database.js';
import agentManager from './agentManager.js';

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
    NOTIFICATION: 'system-notification'
  }
};

class WebSocketManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.userSessions = new Map();
    this.messageBuffer = new Map();
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

        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
          return next(new Error('Invalid token'));
        }

        // Attach user data to socket
        socket.user = user;
        socket.join(`user:${user.id}`);
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
      console.log(`Client connected: ${socket.id}`);
      this.userSessions.set(socket.user.id, socket.id);

      // Subscribe to agent events
      socket.on('subscribe-agent', (agentType) => {
        if (agentManager.constructor.agentTypes[agentType]) {
          socket.join(`agent:${agentType}`);
        }
      });

      // Unsubscribe from agent events
      socket.on('unsubscribe-agent', (agentType) => {
        socket.leave(`agent:${agentType}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.userSessions.delete(socket.user.id);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
        this.emitToUser(socket.user.id, EventTypes.SYSTEM.ERROR, {
          message: 'WebSocket error occurred',
          error: error.message
        });
      });
    });
  }

  /**
   * Setup event listeners for agent events
   */
  setupAgentEventListeners() {
    // Agent started event
    agentManager.on(EventTypes.AGENT.STARTED, ({ type, config }) => {
      this.io.to(`agent:${type}`).emit(EventTypes.AGENT.STARTED, {
        type,
        config,
        timestamp: new Date().toISOString()
      });
    });

    // Agent stopped event
    agentManager.on(EventTypes.AGENT.STOPPED, ({ type }) => {
      this.io.to(`agent:${type}`).emit(EventTypes.AGENT.STOPPED, {
        type,
        timestamp: new Date().toISOString()
      });
    });

    // Agent error event
    agentManager.on(EventTypes.AGENT.ERROR, ({ type, error }) => {
      this.io.to(`agent:${type}`).emit(EventTypes.AGENT.ERROR, {
        type,
        error,
        timestamp: new Date().toISOString()
      });
    });

    // Task progress event
    agentManager.on(EventTypes.AGENT.TASK_PROGRESS, ({ type, progress }) => {
      this.io.to(`agent:${type}`).emit(EventTypes.AGENT.TASK_PROGRESS, {
        type,
        progress,
        timestamp: new Date().toISOString()
      });
    });

    // Task complete event
    agentManager.on(EventTypes.AGENT.TASK_COMPLETE, ({ type, result }) => {
      this.io.to(`agent:${type}`).emit(EventTypes.AGENT.TASK_COMPLETE, {
        type,
        result,
        timestamp: new Date().toISOString()
      });
    });

    // Cache cleared event
    agentManager.on(EventTypes.AGENT.CACHE_CLEARED, ({ type }) => {
      this.io.to(`agent:${type}`).emit(EventTypes.AGENT.CACHE_CLEARED, {
        type,
        timestamp: new Date().toISOString()
      });
    });
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