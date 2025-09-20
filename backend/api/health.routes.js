import { Router } from 'express';
import os from 'os';
import { supabaseAdmin } from '../config/database.js';
import { geminiClient } from '../config/ai.js';
import agentManager from './agentManager.js';

const router = Router();

/**
 * Get overall system health
 * GET /api/health
 */
router.get('/', async (req, res) => {
  const systemHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usagePercentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
    },
    cpu: {
      loadAverage: os.loadavg(),
      cpus: os.cpus().length
    }
  };

  res.json(systemHealth);
});

/**
 * Get agent system health
 * GET /api/health/agents
 */
router.get('/agents', async (req, res) => {
  const agentHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    agents: agentManager.getAllAgentStatus(),
    metrics: {
      totalAgents: agentManager.agents.size,
      activeAgents: Array.from(agentManager.agents.values()).filter(
        agent => agent.state !== 'stopped'
      ).length
    }
  };

  // Check if any agents are in error state
  const hasErrors = Object.values(agentHealth.agents).some(
    agent => agent.status === 'error'
  );

  if (hasErrors) {
    agentHealth.status = 'degraded';
  }

  const statusCode = agentHealth.status === 'degraded' ? 503 : 200;
  res.status(statusCode).json(agentHealth);
});

/**
 * Get database health
 * GET /api/health/database
 */
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now();
    const { data, error } = await supabaseAdmin.rpc('health_check');
    const responseTime = Date.now() - startTime;

    const isHealthy = !error;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: isHealthy,
        responseTime,
        version: data?.version ?? null,
        lastError: error?.message ?? null
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        lastError: error.message
      }
    });
  }
});

/**
 * Get AI service health
 * GET /api/health/ai
 */
router.get('/ai', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test Gemini API with a simple prompt
    const model = geminiClient.getGenerativeModel({
      model: process.env.AI_MODEL || 'gemini-2.0-flash-001'
    });
    
    await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Test connection' }] }]
    });

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ai: {
        provider: 'Google Gemini',
        model: process.env.AI_MODEL ?? 'gemini-2.0-flash-001',
        connected: true,
        responseTime
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      ai: {
        provider: 'Google Gemini',
        connected: false,
        lastError: error.message
      }
    });
  }
});

// Combined health check that aggregates all metrics
router.get('/all', async (req, res) => {
  try {
    // Build system health
    const system = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      }
    };

    // Build agents health
    const agentStatus = agentManager.getAllAgentStatus();
    const agents = {
      status: Object.values(agentStatus).some(a => a.status === 'error')
        ? 'degraded'
        : 'healthy',
      agents: agentStatus,
      metrics: {
        totalAgents: agentManager.agents.size,
        activeAgents: Array.from(agentManager.agents.values()).filter(
          agent => agent.state !== 'stopped'
        ).length
      }
    };

    // Build database health
    let database;
    try {
      const startTime = Date.now();
      const { data, error } = await supabaseAdmin.rpc('health_check');
      const responseTime = Date.now() - startTime;
      const isHealthy = !error;
      
      database = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        connected: isHealthy,
        responseTime,
        version: data?.version ?? null,
        lastError: error?.message ?? null
      };
    } catch (error) {
      database = {
        status: 'unhealthy',
        connected: false,
        lastError: error.message
      };
    }

    // Build AI health
    let ai;
    try {
      const startTime = Date.now();
      const model = geminiClient.getGenerativeModel({
        model: process.env.AI_MODEL || 'gemini-2.0-flash-001'
      });
      await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Test connection' }] }]
      });
      const responseTime = Date.now() - startTime;
      
      ai = {
        status: 'healthy',
        provider: 'Google Gemini',
        model: process.env.AI_MODEL ?? 'gemini-2.0-flash-001',
        connected: true,
        responseTime
      };
    } catch (error) {
      ai = {
        status: 'unhealthy',
        provider: 'Google Gemini',
        connected: false,
        lastError: error.message
      };
    }

    // Determine overall status
    const overallStatus = [database.status, ai.status, agents.status, system.status]
      .includes('unhealthy') ? 'unhealthy' 
      : [database.status, ai.status, agents.status, system.status]
        .includes('degraded') ? 'degraded' 
        : 'healthy';

    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database,
      ai,
      agents,
      system
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
});

export default router;