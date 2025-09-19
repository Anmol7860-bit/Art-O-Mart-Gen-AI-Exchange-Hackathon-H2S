import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin } from './config/database.js';
import agentManager from './api/agentManager.js';
import WebSocketManager from './api/websocket.js';

// Import routers
import aiRouter from './api/ai.routes.js';
import agentsRouter from './api/agents.routes.js';
import healthRouter from './api/health.routes.js';
import { authenticate } from './api/middleware.js';

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const httpServer = createServer(app);

// Initialize WebSocket manager
const wsManager = new WebSocketManager(httpServer);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4028',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Health check route (no auth required)
app.use('/api/health', healthRouter);

// Auth middleware for protected routes
app.use('/api', authenticate);

// API routes
app.use('/api/ai', aiRouter);
app.use('/api/agents', agentsRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Art-O-Mart AI Backend',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      ai: '/api/ai',
      agents: '/api/agents',
      health: '/api/health'
    }
  });
});
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  wsManager.broadcastNotification('Server error occurred', 'error');
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Initialize agents on startup
const initializeAgents = async () => {
  try {
    await agentManager.initializeAgents();
    wsManager.broadcastNotification('Agent system initialized', 'info');
  } catch (error) {
    console.error('Failed to initialize agents:', error);
    wsManager.broadcastNotification('Agent initialization failed', 'error');
  }
};

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  console.log(`🚀 AI Backend Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:4028'}`);
  await initializeAgents();
});

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...');
  
  // Stop all agents
  await agentManager.stopAllAgents();
  
  // Close database connections
  await supabaseAdmin.pool.end();
  
  // Close server
  httpServer.close(() => {
    console.log('Server shut down successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, httpServer as server };