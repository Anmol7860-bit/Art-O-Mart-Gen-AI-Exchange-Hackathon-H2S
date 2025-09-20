import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import compression from 'compression';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin } from './config/database.js';
import agentManager from './api/agentManager.js';
import WebSocketManager from './api/websocket.js';
import { initializeEnvironment } from './utils/envValidator.js';

// Import enhanced middleware
import { getCorsMiddleware } from './middleware/cors.js';
import {
  requestIdMiddleware,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  securityLoggingMiddleware,
  logger
} from './middleware/logging.js';

// Import routers
import aiRouter from './api/ai.routes.js';
import agentsRouter from './api/agents.routes.js';
import healthRouter from './api/health.routes.js';
import { configureLogging } from './middleware/logger.js';
import { configureCORS } from './middleware/cors.js';
import { configureRateLimit } from './middleware/rateLimit.js';
import { handleError } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// Initialize and validate environment before starting server
const envVars = initializeEnvironment();

// Create Express app and HTTP server
const app = express();
const httpServer = createServer(app);

// Initialize WebSocket manager
const wsManager = new WebSocketManager(httpServer, agentManager);

// Trust proxy (important for accurate client IP detection)
app.set('trust proxy', 1);

// Core middleware
app.use(compression()); // Enable gzip compression
app.use(helmet()); // Security headers
app.use(requestIdMiddleware); // Add unique request ID
app.use(getCorsMiddleware('enhanced')); // Advanced CORS with security headers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLoggingMiddleware);
app.use(securityLoggingMiddleware);

// Rate limiting with enhanced configuration
const limiter = rateLimit({
  windowMs: parseInt(envVars.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(envVars.RATE_LIMIT_MAX || '100'), // requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(envVars.RATE_LIMIT_WINDOW_MS || '900000') / 1000 / 60)
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(parseInt(envVars.RATE_LIMIT_WINDOW_MS || '900000') / 1000 / 60)
    });
  }
});

app.use('/api/', limiter);

// Health check route (no auth required)
app.use('/api/health', healthRouter);

// API routes - authentication handled per route
app.use('/api/ai', aiRouter);
app.use('/api/agents', agentsRouter);

// Root route with enhanced information
app.get('/', (req, res) => {
  res.json({
    name: 'Art-O-Mart AI Backend',
    version: process.env.npm_package_version || '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      ai: '/api/ai',
      agents: '/api/agents'
    },
    features: {
      websocket: true,
      rateLimit: true,
      cors: true,
      compression: true,
      logging: true
    }
  });
});

// Error handling middleware with enhanced logging
app.use(errorLoggingMiddleware);
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    url: req.originalUrl,
    method: req.method
  });

  // Notify via WebSocket about server errors (without sensitive details)
  wsManager.broadcast('system', 'system:error', {
    type: 'server_error',
    message: 'A server error occurred',
    timestamp: new Date().toISOString()
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: {
      message: isDevelopment ? err.message : 'Internal server error',
      status: err.status || 500,
      requestId: req.requestId,
      ...(isDevelopment && { stack: err.stack })
    }
  });
});

// 404 handler with enhanced logging
app.use((req, res) => {
  logger.warn('Route not found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId
  });

  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      requestId: req.requestId,
      suggestion: 'Check the API documentation for available endpoints'
    }
  });
});

// Initialize agents with enhanced logging
const initializeAgents = async () => {
  try {
    logger.info('Starting agent system initialization...');
    await agentManager.initializeAgents();
    
    // Broadcast agent system ready event
    wsManager.broadcast('system', 'system:agents_ready', {
      message: 'Agent system initialized successfully',
      timestamp: new Date().toISOString(),
      agentCount: Object.keys(agentManager.getAllAgentsStatus()).length
    });
    
    logger.info('Agent system initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize agents', { error: error.message });
    
    // Broadcast error event
    wsManager.broadcast('system', 'system:error', {
      type: 'agent_initialization_failed',
      message: 'Failed to initialize agent system',
      timestamp: new Date().toISOString()
    });
  }
};

// Start server with enhanced logging and health checks
const PORT = parseInt(envVars.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, async () => {
  logger.info('🎉 Art-O-Mart Backend Server Started Successfully!');
  logger.info(`🚀 Server running on ${HOST}:${PORT}`);
  logger.info(`📡 WebSocket server ready for connections`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Frontend URL: ${envVars.FRONTEND_URL || 'Not configured'}`);
  logger.info(`🤖 AI Model: ${envVars.AI_MODEL || 'Default'}`);
  logger.info(`🔐 JWT Expiry: ${envVars.JWT_EXPIRY || '24h'}`);
  logger.info(`📊 Rate Limit: ${envVars.RATE_LIMIT_MAX || 100} requests per ${Math.floor((envVars.RATE_LIMIT_WINDOW_MS || 900000) / 60000)} minutes`);
  
  // Initialize agents after server starts
  logger.info('🔄 Initializing AI agents...');
  await initializeAgents();
  
  // Broadcast server ready event
  wsManager.broadcast('system', 'system:server_ready', {
    message: 'Server started successfully',
    timestamp: new Date().toISOString(),
    port: PORT,
    host: HOST
  });
  
  logger.info('✅ All systems operational!');
});

// Enhanced graceful shutdown
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Broadcast shutdown event
    wsManager.broadcast('system', 'system:shutdown', {
      message: 'Server shutting down',
      timestamp: new Date().toISOString()
    });
    
    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Stop all agents
    logger.info('Stopping AI agents...');
    await agentManager.stopAllAgents();
    logger.info('AI agents stopped');
    
    // Close WebSocket connections
    wsManager.closeAllConnections();
    logger.info('WebSocket connections closed');
    
    // Close database connections (if applicable)
    if (supabaseAdmin.pool && supabaseAdmin.pool.end) {
      await supabaseAdmin.pool.end();
      logger.info('Database connections closed');
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

// Handle various shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGQUIT', () => shutdown('SIGQUIT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  shutdown('unhandledRejection');
});

export { app, httpServer as server };