/**
 * AI Service Integration Tests
 * 
 * Comprehensive tests for AI service functionality including Google Gemini integration,
 * response generation, image analysis, content generation, and error handling.
 */

import { jest } from '@jest/globals';

// Mock Google Generative AI
const mockGenerateContent = jest.fn();
const mockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
  getGenerativeModel: jest.fn(() => ({
    generateContent: mockGenerateContent
  }))
}));

jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI
}));

// Mock file system for image processing
const mockReadFileSync = jest.fn();
jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync
}));

describe('AI Service Integration Tests', () => {
  let aiService;
  let AIService;
  
  beforeAll(async () => {
    // Set up environment variables
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key';
    
    const aiModule = await import('../services/aiService.js');
    AIService = aiModule.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService();
  });

  describe('Service Initialization', () => {
    test('should initialize with valid API key', () => {
      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
    });

    test('should handle missing API key', () => {
      const originalKey = process.env.GOOGLE_GEMINI_API_KEY;
      delete process.env.GOOGLE_GEMINI_API_KEY;
      
      expect(() => new AIService()).toThrow('GOOGLE_GEMINI_API_KEY is required');
      
      process.env.GOOGLE_GEMINI_API_KEY = originalKey;
    });
  });

  describe('Response Generation', () => {
    test('should generate text response successfully', async () => {
      const mockResponse = {
        response: {
          text: () => 'This is a generated response about handmade pottery.'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = 'Tell me about handmade pottery';
      const context = { category: 'pottery', region: 'India' };
      
      const result = await aiService.generateResponse(prompt, context);
      
      expect(result).toBe('This is a generated response about handmade pottery.');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(prompt)
      );
    });

    test('should include context in prompt', async () => {
      const mockResponse = {
        response: {
          text: () => 'Response with context'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = 'Recommend products';
      const context = { 
        userId: 'user-123', 
        preferences: ['pottery', 'textiles'],
        budget: 100 
      };
      
      await aiService.generateResponse(prompt, context);
      
      const calledPrompt = mockGenerateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('userId: user-123');
      expect(calledPrompt).toContain('pottery');
      expect(calledPrompt).toContain('textiles');
      expect(calledPrompt).toContain('budget: 100');
    });

    test('should handle generation errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API rate limit exceeded'));

      const prompt = 'Test prompt';
      
      await expect(aiService.generateResponse(prompt)).rejects.toThrow('API rate limit exceeded');
    });

    test('should handle empty responses', async () => {
      const mockResponse = {
        response: {
          text: () => ''
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await aiService.generateResponse('Test prompt');
      
      expect(result).toBe('');
    });
  });

  describe('Product Recommendations', () => {
    test('should generate product recommendations', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            recommendations: [
              { id: 1, name: 'Handmade Bowl', score: 0.95, reason: 'Matches pottery preference' },
              { id: 2, name: 'Ceramic Vase', score: 0.87, reason: 'Similar category' }
            ]
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const userProfile = {
        preferences: ['pottery', 'ceramics'],
        priceRange: { min: 50, max: 200 },
        previousPurchases: [{ category: 'pottery' }]
      };
      
      const result = await aiService.generateProductRecommendations(userProfile);
      
      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0]).toHaveProperty('score');
      expect(result.recommendations[0]).toHaveProperty('reason');
    });

    test('should handle malformed recommendation response', async () => {
      const mockResponse = {
        response: {
          text: () => 'Invalid JSON response'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const userProfile = { preferences: ['pottery'] };
      
      await expect(aiService.generateProductRecommendations(userProfile))
        .rejects.toThrow('Failed to parse recommendations');
    });
  });

  describe('Customer Support Responses', () => {
    test('should generate customer support response', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            response: 'Thank you for contacting us. I can help you with your order inquiry.',
            category: 'order_inquiry',
            escalate: false,
            priority: 'normal'
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const inquiry = {
        message: 'Where is my order?',
        customerId: 'customer-123',
        orderHistory: [{ id: 'order-456', status: 'shipped' }]
      };
      
      const result = await aiService.generateSupportResponse(inquiry);
      
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('category', 'order_inquiry');
      expect(result).toHaveProperty('escalate', false);
      expect(result).toHaveProperty('priority', 'normal');
    });

    test('should identify escalation cases', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            response: 'I understand your concern. Let me escalate this to our team.',
            category: 'complaint',
            escalate: true,
            priority: 'high'
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const inquiry = {
        message: 'This product is completely damaged and I want a full refund!',
        customerId: 'customer-123',
        sentiment: 'negative'
      };
      
      const result = await aiService.generateSupportResponse(inquiry);
      
      expect(result.escalate).toBe(true);
      expect(result.priority).toBe('high');
      expect(result.category).toBe('complaint');
    });
  });

  describe('Marketing Content Generation', () => {
    test('should generate email marketing content', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            subject: 'Discover Handcrafted Treasures',
            body: 'Explore our latest collection of authentic handmade items...',
            cta: 'Shop Now',
            personalization: {
              greeting: 'Hello valued customer',
              productMentions: ['pottery', 'textiles']
            }
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const campaign = {
        type: 'email',
        audience: 'pottery_lovers',
        products: [
          { id: 1, name: 'Handmade Bowl', category: 'pottery' },
          { id: 2, name: 'Ceramic Vase', category: 'pottery' }
        ],
        tone: 'friendly'
      };
      
      const result = await aiService.generateMarketingContent(campaign);
      
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
      expect(result).toHaveProperty('cta');
      expect(result).toHaveProperty('personalization');
    });

    test('should generate social media content', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            content: 'Check out this beautiful handmade pottery! 🏺✨ #Handmade #Pottery #Artisan',
            hashtags: ['#Handmade', '#Pottery', '#Artisan'],
            platform: 'instagram'
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const campaign = {
        type: 'social',
        platform: 'instagram',
        products: [{ id: 1, name: 'Handmade Bowl', category: 'pottery' }],
        tone: 'enthusiastic'
      };
      
      const result = await aiService.generateMarketingContent(campaign);
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('hashtags');
      expect(result.hashtags).toContain('#Handmade');
    });
  });

  describe('Image Analysis', () => {
    test('should analyze product image successfully', async () => {
      const mockImageData = Buffer.from('fake-image-data');
      mockReadFileSync.mockReturnValue(mockImageData);
      
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            description: 'A beautiful handmade ceramic bowl with intricate patterns',
            categories: ['pottery', 'ceramics', 'home-decor'],
            colors: ['blue', 'white', 'gold'],
            style: 'traditional',
            quality: 'high'
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const imagePath = '/path/to/product-image.jpg';
      
      const result = await aiService.analyzeImage(imagePath);
      
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('colors');
      expect(result.categories).toContain('pottery');
      expect(mockReadFileSync).toHaveBeenCalledWith(imagePath);
    });

    test('should handle image analysis errors', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const imagePath = '/path/to/nonexistent-image.jpg';
      
      await expect(aiService.analyzeImage(imagePath))
        .rejects.toThrow('File not found');
    });

    test('should analyze image from buffer', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            description: 'A woven textile with geometric patterns',
            categories: ['textiles', 'weaving']
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const imageBuffer = Buffer.from('fake-image-data');
      const mimeType = 'image/jpeg';
      
      const result = await aiService.analyzeImageBuffer(imageBuffer, mimeType);
      
      expect(result).toHaveProperty('description');
      expect(result.categories).toContain('textiles');
    });
  });

  describe('Content Moderation', () => {
    test('should identify inappropriate content', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            appropriate: false,
            reasons: ['contains profanity', 'inappropriate language'],
            severity: 'high',
            action: 'block'
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const content = 'This is inappropriate content with bad words';
      
      const result = await aiService.moderateContent(content);
      
      expect(result.appropriate).toBe(false);
      expect(result.reasons).toContain('contains profanity');
      expect(result.action).toBe('block');
    });

    test('should approve appropriate content', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            appropriate: true,
            reasons: [],
            severity: 'none',
            action: 'approve'
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const content = 'This is a beautiful handmade pottery piece';
      
      const result = await aiService.moderateContent(content);
      
      expect(result.appropriate).toBe(true);
      expect(result.action).toBe('approve');
    });
  });

  describe('Search and Discovery', () => {
    test('should enhance search queries', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            enhancedQuery: 'handmade ceramic pottery bowls traditional blue',
            suggestions: ['ceramic bowls', 'pottery dishes', 'handmade ceramics'],
            filters: {
              categories: ['pottery', 'ceramics'],
              colors: ['blue'],
              style: ['traditional']
            }
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const originalQuery = 'blue bowl';
      const context = { userPreferences: ['pottery'], location: 'India' };
      
      const result = await aiService.enhanceSearchQuery(originalQuery, context);
      
      expect(result).toHaveProperty('enhancedQuery');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('filters');
      expect(result.filters.categories).toContain('pottery');
    });

    test('should generate semantic search embeddings', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            embeddings: [0.1, 0.2, 0.3, 0.4, 0.5],
            dimensions: 5
          })
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const text = 'handmade pottery bowl ceramic art';
      
      const result = await aiService.generateEmbeddings(text);
      
      expect(result).toHaveProperty('embeddings');
      expect(result).toHaveProperty('dimensions', 5);
      expect(Array.isArray(result.embeddings)).toBe(true);
    });
  });

  describe('Performance and Rate Limiting', () => {
    test('should handle API rate limiting', async () => {
      mockGenerateContent.mockRejectedValue({
        message: 'Rate limit exceeded',
        code: 429
      });

      const prompt = 'Test prompt';
      
      await expect(aiService.generateResponse(prompt))
        .rejects.toMatchObject({
          message: 'Rate limit exceeded',
          code: 429
        });
    });

    test('should implement request caching', async () => {
      const mockResponse = {
        response: {
          text: () => 'Cached response'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = 'Same prompt';
      
      // First request
      const result1 = await aiService.generateResponse(prompt);
      
      // Second request (should use cache)
      const result2 = await aiService.generateResponse(prompt);
      
      expect(result1).toBe(result2);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    test('should handle concurrent requests', async () => {
      const mockResponse = {
        response: {
          text: () => 'Concurrent response'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(aiService.generateResponse(`Prompt ${i}`));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe('Concurrent response');
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should retry on temporary failures', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValue({
          response: { text: () => 'Success on retry' }
        });

      const result = await aiService.generateResponse('Test prompt');
      
      expect(result).toBe('Success on retry');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    test('should fail after max retries', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Persistent error'));

      await expect(aiService.generateResponse('Test prompt'))
        .rejects.toThrow('Persistent error');
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(3); // Original + 2 retries
    });

    test('should handle malformed API responses', async () => {
      const mockResponse = {
        response: null
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      await expect(aiService.generateResponse('Test prompt'))
        .rejects.toThrow('Invalid API response');
    });

    test('should sanitize inputs', async () => {
      const mockResponse = {
        response: {
          text: () => 'Safe response'
        }
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const maliciousPrompt = '<script>alert("xss")</script>Legitimate prompt';
      
      await aiService.generateResponse(maliciousPrompt);
      
      const calledPrompt = mockGenerateContent.mock.calls[0][0];
      expect(calledPrompt).not.toContain('<script>');
    });
  });
});