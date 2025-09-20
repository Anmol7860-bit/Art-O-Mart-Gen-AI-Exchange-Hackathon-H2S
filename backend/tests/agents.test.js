/**
 * Agent System Integration Tests
 * 
 * Comprehensive tests for the agent management system including lifecycle,
 * task execution, error handling, and AI integration.
 */

import { jest } from '@jest/globals';
import EventEmitter from 'events';

// Mock AI service
const mockAIService = {
  generateResponse: jest.fn(),
  analyzeImage: jest.fn(),
  generateContent: jest.fn()
};

jest.unstable_mockModule('../services/aiService.js', () => ({
  default: mockAIService
}));

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => Promise.resolve({ data: [], error: null })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [], error: null })),
    delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
  }))
};

jest.unstable_mockModule('../config/database.js', () => ({
  supabaseAdmin: mockSupabase,
  supabaseClient: mockSupabase
}));

describe('Agent System Integration Tests', () => {
  let agentManager;
  let AgentManager;
  let ProductRecommendationAgent;
  let CustomerSupportAgent;
  let InventoryManagementAgent;
  let MarketingAutomationAgent;

  beforeAll(async () => {
    // Import agent classes
    const agentModule = await import('../api/agentManager.js');
    AgentManager = agentModule.default;
    
    const prodRecommendation = await import('../agents/ProductRecommendationAgent.js');
    ProductRecommendationAgent = prodRecommendation.default;
    
    const customerSupport = await import('../agents/CustomerSupportAgent.js');
    CustomerSupportAgent = customerSupport.default;
    
    const inventoryMgmt = await import('../agents/InventoryManagementAgent.js');
    InventoryManagementAgent = inventoryMgmt.default;
    
    const marketingAuto = await import('../agents/MarketingAutomationAgent.js');
    MarketingAutomationAgent = marketingAuto.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    agentManager = new AgentManager();
  });

  afterEach(() => {
    if (agentManager) {
      agentManager.stopAllAgents();
    }
  });

  describe('Agent Lifecycle Management', () => {
    test('should start agent successfully', async () => {
      const agentType = 'ProductRecommendationAgent';
      
      const result = await agentManager.startAgent(agentType);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('started successfully');
      expect(agentManager.isAgentRunning(agentType)).toBe(true);
    });

    test('should stop agent successfully', async () => {
      const agentType = 'ProductRecommendationAgent';
      
      await agentManager.startAgent(agentType);
      const result = await agentManager.stopAgent(agentType);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('stopped successfully');
      expect(agentManager.isAgentRunning(agentType)).toBe(false);
    });

    test('should handle starting invalid agent type', async () => {
      const invalidType = 'NonExistentAgent';
      
      const result = await agentManager.startAgent(invalidType);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown agent type');
    });

    test('should handle stopping non-running agent', async () => {
      const agentType = 'ProductRecommendationAgent';
      
      const result = await agentManager.stopAgent(agentType);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not running');
    });

    test('should restart agent successfully', async () => {
      const agentType = 'ProductRecommendationAgent';
      
      await agentManager.startAgent(agentType);
      const result = await agentManager.restartAgent(agentType);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('restarted successfully');
      expect(agentManager.isAgentRunning(agentType)).toBe(true);
    });

    test('should get all agents status', () => {
      const status = agentManager.getAllAgentsStatus();
      
      expect(status).toHaveProperty('ProductRecommendationAgent');
      expect(status).toHaveProperty('CustomerSupportAgent');
      expect(status).toHaveProperty('InventoryManagementAgent');
      expect(status).toHaveProperty('MarketingAutomationAgent');
      
      Object.values(status).forEach(agentStatus => {
        expect(agentStatus).toHaveProperty('running');
        expect(agentStatus).toHaveProperty('lastStarted');
        expect(agentStatus).toHaveProperty('tasksCompleted');
        expect(agentStatus).toHaveProperty('errors');
      });
    });
  });

  describe('Product Recommendation Agent', () => {
    let agent;

    beforeEach(async () => {
      await agentManager.startAgent('ProductRecommendationAgent');
      agent = agentManager.agents.get('ProductRecommendationAgent').instance;
    });

    test('should generate product recommendations', async () => {
      const mockRecommendations = [
        { id: 1, name: 'Handmade Pottery', score: 0.95 },
        { id: 2, name: 'Woven Basket', score: 0.87 }
      ];

      mockAIService.generateResponse.mockResolvedValue({
        recommendations: mockRecommendations
      });

      const userId = 'user-123';
      const preferences = { categories: ['pottery', 'textiles'] };
      
      const result = await agent.getRecommendations(userId, preferences);
      
      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations).toHaveLength(2);
      expect(mockAIService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('recommendations'),
        expect.objectContaining({ userId, preferences })
      );
    });

    test('should handle recommendation errors gracefully', async () => {
      mockAIService.generateResponse.mockRejectedValue(new Error('AI service error'));

      const userId = 'user-123';
      const preferences = { categories: ['pottery'] };
      
      const result = await agent.getRecommendations(userId, preferences);
      
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Failed to generate recommendations');
    });

    test('should update recommendation model', async () => {
      const trainingData = [
        { userId: 'user-1', productId: 'prod-1', rating: 5 },
        { userId: 'user-2', productId: 'prod-2', rating: 4 }
      ];

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: trainingData, error: null })
      });

      const result = await agent.updateModel(trainingData);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('recommendation_training');
    });
  });

  describe('Customer Support Agent', () => {
    let agent;

    beforeEach(async () => {
      await agentManager.startAgent('CustomerSupportAgent');
      agent = agentManager.agents.get('CustomerSupportAgent').instance;
    });

    test('should process customer inquiry', async () => {
      const mockResponse = {
        message: 'Thank you for your inquiry. I can help you with that.',
        category: 'general',
        escalate: false
      };

      mockAIService.generateResponse.mockResolvedValue(mockResponse);

      const inquiry = {
        customerId: 'customer-123',
        message: 'I need help with my order',
        timestamp: new Date().toISOString()
      };
      
      const result = await agent.processInquiry(inquiry);
      
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('category');
      expect(result.escalate).toBe(false);
      expect(mockAIService.generateResponse).toHaveBeenCalled();
    });

    test('should escalate complex issues', async () => {
      const mockResponse = {
        message: 'This issue requires human assistance.',
        category: 'complex',
        escalate: true,
        priority: 'high'
      };

      mockAIService.generateResponse.mockResolvedValue(mockResponse);

      const inquiry = {
        customerId: 'customer-123',
        message: 'I want to file a complaint about damaged goods',
        timestamp: new Date().toISOString()
      };
      
      const result = await agent.processInquiry(inquiry);
      
      expect(result.escalate).toBe(true);
      expect(result.priority).toBe('high');
    });

    test('should track conversation history', async () => {
      const customerId = 'customer-123';
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 1, message: 'Previous inquiry', timestamp: '2024-01-01' }
          ],
          error: null
        })
      });

      const history = await agent.getConversationHistory(customerId);
      
      expect(history).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('customer_conversations');
    });
  });

  describe('Inventory Management Agent', () => {
    let agent;

    beforeEach(async () => {
      await agentManager.startAgent('InventoryManagementAgent');
      agent = agentManager.agents.get('InventoryManagementAgent').instance;
    });

    test('should check low stock items', async () => {
      const mockLowStockItems = [
        { id: 1, name: 'Handmade Bowl', stock: 2, threshold: 5 },
        { id: 2, name: 'Woven Scarf', stock: 1, threshold: 3 }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockLowStockItems,
          error: null
        })
      });

      const result = await agent.checkLowStock();
      
      expect(result).toHaveProperty('lowStockItems');
      expect(result.lowStockItems).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('products');
    });

    test('should generate reorder recommendations', async () => {
      const mockRecommendations = {
        items: [
          { productId: 1, suggestedQuantity: 10, reason: 'High demand' },
          { productId: 2, suggestedQuantity: 5, reason: 'Low stock' }
        ]
      };

      mockAIService.generateResponse.mockResolvedValue(mockRecommendations);

      const salesData = [
        { productId: 1, salesCount: 15, period: '30days' },
        { productId: 2, salesCount: 8, period: '30days' }
      ];

      const result = await agent.generateReorderRecommendations(salesData);
      
      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations).toHaveLength(2);
      expect(mockAIService.generateResponse).toHaveBeenCalled();
    });

    test('should update inventory levels', async () => {
      const updates = [
        { productId: 1, quantity: -2, type: 'sale' },
        { productId: 2, quantity: 10, type: 'restock' }
      ];

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockResolvedValue({ data: [], error: null })
      });

      const result = await agent.updateInventoryLevels(updates);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('products');
    });
  });

  describe('Marketing Automation Agent', () => {
    let agent;

    beforeEach(async () => {
      await agentManager.startAgent('MarketingAutomationAgent');
      agent = agentManager.agents.get('MarketingAutomationAgent').instance;
    });

    test('should generate marketing content', async () => {
      const mockContent = {
        subject: 'Discover Handmade Treasures',
        body: 'Explore our collection of unique handcrafted items...',
        cta: 'Shop Now'
      };

      mockAIService.generateContent.mockResolvedValue(mockContent);

      const campaign = {
        type: 'email',
        target: 'pottery-lovers',
        products: [1, 2, 3]
      };

      const result = await agent.generateMarketingContent(campaign);
      
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveProperty('subject');
      expect(result.content).toHaveProperty('body');
      expect(mockAIService.generateContent).toHaveBeenCalled();
    });

    test('should segment customers', async () => {
      const mockSegments = [
        { segment: 'high-value', customers: ['user-1', 'user-2'] },
        { segment: 'pottery-enthusiasts', customers: ['user-3', 'user-4'] }
      ];

      mockAIService.generateResponse.mockResolvedValue({
        segments: mockSegments
      });

      const customerData = [
        { id: 'user-1', totalSpent: 500, categories: ['pottery'] },
        { id: 'user-2', totalSpent: 300, categories: ['textiles'] }
      ];

      const result = await agent.segmentCustomers(customerData);
      
      expect(result).toHaveProperty('segments');
      expect(result.segments).toHaveLength(2);
      expect(mockAIService.generateResponse).toHaveBeenCalled();
    });

    test('should schedule campaigns', async () => {
      const campaign = {
        id: 'campaign-123',
        type: 'email',
        scheduledFor: new Date().toISOString(),
        recipients: ['user-1', 'user-2']
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: [campaign], error: null })
      });

      const result = await agent.scheduleCampaign(campaign);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('marketing_campaigns');
    });
  });

  describe('Agent Error Handling', () => {
    test('should handle agent crash and restart', async () => {
      const agentType = 'ProductRecommendationAgent';
      
      await agentManager.startAgent(agentType);
      const agent = agentManager.agents.get(agentType).instance;
      
      // Simulate agent error
      agent.emit('error', new Error('Simulated error'));
      
      // Wait for restart
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(agentManager.isAgentRunning(agentType)).toBe(true);
    });

    test('should track error counts', async () => {
      const agentType = 'ProductRecommendationAgent';
      
      await agentManager.startAgent(agentType);
      const agent = agentManager.agents.get(agentType).instance;
      
      // Simulate multiple errors
      agent.emit('error', new Error('Error 1'));
      agent.emit('error', new Error('Error 2'));
      
      const status = agentManager.getAllAgentsStatus();
      expect(status[agentType].errors).toBeGreaterThan(0);
    });

    test('should stop agent after max errors', async () => {
      const agentType = 'ProductRecommendationAgent';
      
      await agentManager.startAgent(agentType);
      const agent = agentManager.agents.get(agentType).instance;
      
      // Simulate many errors
      for (let i = 0; i < 10; i++) {
        agent.emit('error', new Error(`Error ${i}`));
      }
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(agentManager.isAgentRunning(agentType)).toBe(false);
    });
  });

  describe('Agent Communication', () => {
    test('should allow inter-agent communication', async () => {
      await agentManager.startAgent('ProductRecommendationAgent');
      await agentManager.startAgent('InventoryManagementAgent');
      
      const productAgent = agentManager.agents.get('ProductRecommendationAgent').instance;
      const inventoryAgent = agentManager.agents.get('InventoryManagementAgent').instance;
      
      let messageReceived = false;
      inventoryAgent.on('message', (data) => {
        if (data.from === 'ProductRecommendationAgent') {
          messageReceived = true;
        }
      });
      
      productAgent.sendMessage('InventoryManagementAgent', {
        type: 'stock_check',
        productIds: [1, 2, 3]
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(messageReceived).toBe(true);
    });

    test('should handle message to non-existent agent', async () => {
      await agentManager.startAgent('ProductRecommendationAgent');
      const agent = agentManager.agents.get('ProductRecommendationAgent').instance;
      
      const result = agent.sendMessage('NonExistentAgent', { test: 'data' });
      
      expect(result).toBe(false);
    });
  });
});