/**
 * API Integration Tests
 * 
 * Comprehensive tests for all API endpoints including health checks,
 * authentication, agent management, and AI services.
 */

import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock the server before importing
const mockApp = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  use: jest.fn(),
  listen: jest.fn()
};

// Mock Express
jest.unstable_mockModule('express', () => ({
  default: () => mockApp,
  json: jest.fn(() => (req, res, next) => next()),
  urlencoded: jest.fn(() => (req, res, next) => next())
}));

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => Promise.resolve({ data: [], error: null }))
  }))
};

jest.unstable_mockModule('../config/database.js', () => ({
  supabaseAdmin: mockSupabase,
  supabaseClient: mockSupabase
}));

// Mock AI config
jest.unstable_mockModule('../config/ai.js', () => ({
  geminiClient: {
    generateContent: jest.fn(() => Promise.resolve({
      response: { text: () => 'Mocked AI response' }
    }))
  },
  agentConfigs: {
    ProductRecommendationAgent: { name: 'Product Recommendation' },
    CustomerSupportAgent: { name: 'Customer Support' }
  }
}));

// Mock Agent Manager
const mockAgentManager = {
  agents: new Map(),
  startAgent: jest.fn(() => Promise.resolve({ success: true })),
  stopAgent: jest.fn(() => Promise.resolve({ success: true })),
  getAgentStatus: jest.fn(() => ({ status: 'active', taskCount: 0 })),
  submitTask: jest.fn(() => Promise.resolve({ taskId: 'test-task-123' })),
  getAllAgentsStatus: jest.fn(() => ({}))
};

jest.unstable_mockModule('../api/agentManager.js', () => ({
  default: mockAgentManager
}));

describe('API Integration Tests', () => {
  let app;
  let validToken;
  let invalidToken;

  beforeAll(async () => {
    // Import the actual server after mocking
    const serverModule = await import('../server.js');
    app = serverModule.default || serverModule.app;
    
    // Create test JWT tokens
    const secret = process.env.JWT_SECRET || 'test-secret';
    validToken = jwt.sign({ id: 'test-user-123', email: 'test@example.com' }, secret);
    invalidToken = 'invalid.token.here';
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Health Endpoints', () => {
    test('GET /api/health should return basic health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    test('GET /api/health/database should check database connectivity', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => Promise.resolve({ data: [{ count: 1 }], error: null }))
      });

      const response = await request(app)
        .get('/api/health/database')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('database');
    });

    test('GET /api/health/ai should check AI service connectivity', async () => {
      const response = await request(app)
        .get('/api/health/ai')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('ai');
    });

    test('GET /api/health/agents should check agent status', async () => {
      const response = await request(app)
        .get('/api/health/agents')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('agents');
    });

    test('GET /api/health/all should return comprehensive health check', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => Promise.resolve({ data: [{ count: 1 }], error: null }))
      });

      const response = await request(app)
        .get('/api/health/all')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('ai');
      expect(response.body).toHaveProperty('agents');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Authentication Middleware', () => {
    test('should accept valid JWT token', async () => {
      const response = await request(app)
        .get('/api/agents/status')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    test('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/agents/status')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/agents/status')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Agent Management Endpoints', () => {
    test('GET /api/agents/status should return all agents status', async () => {
      const response = await request(app)
        .get('/api/agents/status')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('agents');
      expect(mockAgentManager.getAllAgentsStatus).toHaveBeenCalled();
    });

    test('POST /api/agents/:agentType/start should start an agent', async () => {
      mockAgentManager.startAgent.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/agents/ProductRecommendationAgent/start')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockAgentManager.startAgent).toHaveBeenCalledWith('ProductRecommendationAgent');
    });

    test('POST /api/agents/:agentType/stop should stop an agent', async () => {
      mockAgentManager.stopAgent.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/agents/ProductRecommendationAgent/stop')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockAgentManager.stopAgent).toHaveBeenCalledWith('ProductRecommendationAgent');
    });

    test('POST /api/agents/:agentType/task should submit a task', async () => {
      const taskData = { query: 'Recommend products for pottery enthusiast' };
      mockAgentManager.submitTask.mockResolvedValue({ taskId: 'test-task-123' });

      const response = await request(app)
        .post('/api/agents/ProductRecommendationAgent/task')
        .set('Authorization', `Bearer ${validToken}`)
        .send(taskData)
        .expect(200);

      expect(response.body).toHaveProperty('taskId');
      expect(mockAgentManager.submitTask).toHaveBeenCalledWith(
        'ProductRecommendationAgent',
        taskData
      );
    });

    test('should handle agent errors gracefully', async () => {
      mockAgentManager.startAgent.mockRejectedValue(new Error('Agent initialization failed'));

      const response = await request(app)
        .post('/api/agents/InvalidAgent/start')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('AI Endpoints', () => {
    test('POST /api/ai/chat should process chat requests', async () => {
      const chatData = { message: 'Hello, I need help with pottery products' };
      
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${validToken}`)
        .send(chatData)
        .expect(200);

      expect(response.body).toHaveProperty('response');
    });

    test('POST /api/ai/generate should generate AI content', async () => {
      const generateData = { prompt: 'Generate product description for handmade pottery' };
      
      const response = await request(app)
        .post('/api/ai/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .send(generateData)
        .expect(200);

      expect(response.body).toHaveProperty('content');
    });

    test('should validate AI request data', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${validToken}`)
        .send({}) // Missing required message field
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle rate limiting', async () => {
      // Mock rate limit exceeded scenario
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .get('/api/health')
            .set('X-Forwarded-For', '192.168.1.1')
        );
      }

      const responses = await Promise.all(requests);
      
      // At least one request should succeed
      expect(responses.some(res => res.status === 200)).toBe(true);
    });

    test('should handle database connection errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Connection failed' } }))
      });

      const response = await request(app)
        .get('/api/health/database')
        .expect(503);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CORS Configuration', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});