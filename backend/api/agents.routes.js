import { Router } from 'express';
import { z } from 'zod';
import { authenticate, validateRequest, requireRole, rateLimits } from './middleware.js';
import agentManager from './agentManager.js';

const router = Router();

// Input validation schemas
const agentConfigSchema = z.object({
  body: z.object({
    config: z.record(z.any()).optional()
  })
});

const agentTaskSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query is required'),
    parameters: z.record(z.any()).optional()
  }),
  params: z.object({
    agentType: z.enum(Object.keys(agentManager.constructor.agentTypes))
  })
});

const agentTypeParamSchema = z.object({
  params: z.object({
    agentType: z.enum(Object.keys(agentManager.constructor.agentTypes))
  })
});

/**
 * Get all available agents and their status
 * GET /api/agents
 */
router.get('/',
  authenticate,
  async (req, res, next) => {
    try {
      const status = agentManager.getAllAgentStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Start a specific agent
 * POST /api/agents/:agentType/start
 */
router.post('/:agentType/start',
  authenticate,
  requireRole(['admin']),
  rateLimits.agents,
  validateRequest(z.object({
    ...agentTypeParamSchema.shape,
    ...agentConfigSchema.shape
  })),
  async (req, res, next) => {
    try {
      const { agentType } = req.validated.params;
      const { config } = req.validated.body;

      const result = await agentManager.startAgent(agentType, config);
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
 * Stop a specific agent
 * POST /api/agents/:agentType/stop
 */
router.post('/:agentType/stop',
  authenticate,
  requireRole(['admin']),
  rateLimits.agents,
  validateRequest(agentTypeParamSchema),
  async (req, res, next) => {
    try {
      const { agentType } = req.validated.params;
      const result = await agentManager.stopAgent(agentType);
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
 * Submit task to specific agent
 * POST /api/agents/:agentType/task
 */
router.post('/:agentType/task',
  authenticate,
  rateLimits.agents,
  validateRequest(agentTaskSchema),
  async (req, res, next) => {
    try {
      const { agentType } = req.validated.params;
      const { query, parameters } = req.validated.body;

      const result = await agentManager.submitTask(agentType, {
        query,
        userId: req.user.id,
        parameters
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
 * Get agent status
 * GET /api/agents/:agentType/status
 */
router.get('/:agentType/status',
  authenticate,
  validateRequest(agentTypeParamSchema),
  async (req, res, next) => {
    try {
      const { agentType } = req.validated.params;
      const status = agentManager.getAgentStatus(agentType);
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Clear agent cache
 * DELETE /api/agents/:agentType/cache
 */
router.delete('/:agentType/cache',
  authenticate,
  requireRole(['admin']),
  rateLimits.agents,
  validateRequest(agentTypeParamSchema),
  async (req, res, next) => {
    try {
      const { agentType } = req.validated.params;
      const result = await agentManager.clearAgentCache(agentType);
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