import { Router } from 'express';
import { z } from 'zod';
import { authenticate, validateRequest, rateLimits } from './middleware.js';
import agentManager, { normalizeAgentType } from './agentManager.js';

const router = Router();

// Input validation schemas
const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required'),
    context: z.object({
      type: z.enum(['product', 'support', 'artisan', 'order']),
      data: z.record(z.any()).optional()
    })
  })
});

const generateSchema = z.object({
  body: z.object({
    type: z.enum([
      'product_description',
      'artisan_story',
      'marketing_content',
      'seo_content'
    ]),
    input: z.record(z.any()),
    parameters: z.record(z.any()).optional()
  })
});

const analyzeSchema = z.object({
  body: z.object({
    type: z.enum([
      'business_insights',
      'market_analysis',
      'customer_feedback',
      'performance_metrics'
    ]),
    data: z.record(z.any()),
    timeframe: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional()
  })
});

/**
 * Route for general AI chat functionality
 * POST /api/ai/chat
 */
router.post('/chat',
  authenticate,
  rateLimits.ai,
  validateRequest(chatSchema),
  async (req, res, next) => {
    try {
      const { message, context } = req.validated.body;

      // Select appropriate agent based on context
      let agentType;
      switch (context.type) {
        case 'product':
          agentType = normalizeAgentType('productRecommendation');
          break;
        case 'support':
          agentType = normalizeAgentType('customerSupport');
          break;
        case 'artisan':
          agentType = normalizeAgentType('artisanAssistant');
          break;
        case 'order':
          agentType = normalizeAgentType('orderProcessing');
          break;
        default:
          throw new Error('Invalid context type');
      }

      // Submit task to agent
      const result = await agentManager.submitTask(agentType, {
        query: message,
        userId: req.user.id,
        context: context.data
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Route for content generation
 * POST /api/ai/generate
 */
router.post('/generate',
  authenticate,
  rateLimits.ai,
  validateRequest(generateSchema),
  async (req, res, next) => {
    try {
      const { type, input, parameters } = req.validated.body;
      const agent = agentManager.agents.get(normalizeAgentType('contentGeneration'));

      let result;
      switch (type) {
        case 'product_description':
          result = await agent.generateProductDescription(input, parameters);
          break;
        case 'artisan_story':
          result = await agent.createArtisanStory(input, parameters);
          break;
        case 'marketing_content':
          result = await agent.generateMarketingContent(input, parameters);
          break;
        case 'seo_content':
          result = await agent.optimizeForSEO(input, parameters);
          break;
        default:
          throw new Error('Invalid generation type');
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Route for data analysis
 * POST /api/ai/analyze
 */
router.post('/analyze',
  authenticate,
  rateLimits.ai,
  validateRequest(analyzeSchema),
  async (req, res, next) => {
    try {
      const { type, data, timeframe } = req.validated.body;

      // Select appropriate agent based on analysis type
      let agentType;
      let method;
      switch (type) {
        case 'business_insights':
          agentType = normalizeAgentType('artisanAssistant');
          method = 'getBusinessInsights';
          break;
        case 'market_analysis':
          agentType = normalizeAgentType('artisanAssistant');
          method = 'suggestPricing';
          break;
        case 'customer_feedback':
          agentType = normalizeAgentType('customerSupport');
          method = 'analyzeFeedback';
          break;
        case 'performance_metrics':
          agentType = normalizeAgentType('orderProcessing');
          method = 'analyzePerformance';
          break;
        default:
          throw new Error('Invalid analysis type');
      }

      const agent = agentManager.agents.get(agentType);
      const result = await agent[method](data, timeframe);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;