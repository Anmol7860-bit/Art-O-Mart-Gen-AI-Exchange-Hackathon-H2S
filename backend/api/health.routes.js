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

  res.json({
    success: true,
    data: systemHealth
  });
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

  res.json({
    success: true,
    data: agentHealth
  });
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

    const dbHealth = {
      status: error ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      error: error?.message,
      details: {
        connected: !error,
        version: data?.version,
        lastError: error?.message || null
      }
    };

    res.json({
      success: true,
      data: dbHealth
    });
  } catch (error) {
    res.json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        details: {
          connected: false,
          lastError: error.message
        }
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

    const aiHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      provider: 'Google Gemini',
      model: process.env.AI_MODEL || 'gemini-2.0-flash-001',
      details: {
        connected: true,
        lastError: null
      }
    };

    res.json({
      success: true,
      data: aiHealth
    });
  } catch (error) {
    res.json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        provider: 'Google Gemini',
        error: error.message,
        details: {
          connected: false,
          lastError: error.message
        }
      }
    });
  }
});

// Combined health check that aggregates all metrics
router.get('/all', async (req, res) => {
  try {
    const [system, agents, database, ai] = await Promise.all([
      // System health
      {
        status: 'healthy',
        uptime: process.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem()
        }
      },
      // Agent health
      agentManager.getAllAgentStatus(),
      // Database health
      supabaseAdmin.rpc('health_check'),
      // AI health
      geminiClient.getGenerativeModel({
        model: process.env.AI_MODEL || 'gemini-2.0-flash-001'
      }).generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Test connection' }] }]
      })
    ]);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        system: {
          status: 'healthy',
          metrics: system
        },
        agents: {
          status: Object.values(agents).some(a => a.status === 'error')
            ? 'degraded'
            : 'healthy',
          metrics: agents
        },
        database: {
          status: database.error ? 'unhealthy' : 'healthy',
          error: database.error?.message
        },
        ai: {
          status: 'healthy',
          provider: 'Google Gemini'
        }
      }
    };

    // Determine overall status
    if (Object.values(health.components).some(c => c.status === 'unhealthy')) {
      health.status = 'unhealthy';
    } else if (Object.values(health.components).some(c => c.status === 'degraded')) {
      health.status = 'degraded';
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

export default router;