import { EventEmitter } from 'events';
import ProductRecommendationAgent from '../agents/ProductRecommendationAgent.js';
import CustomerSupportAgent from '../agents/CustomerSupportAgent.js';
import ArtisanAssistantAgent from '../agents/ArtisanAssistantAgent.js';
import OrderProcessingAgent from '../agents/OrderProcessingAgent.js';
import ContentGenerationAgent from '../agents/ContentGenerationAgent.js';

// Agent states
const AgentState = {
  IDLE: 'idle',
  RUNNING: 'running',
  BUSY: 'busy',
  ERROR: 'error',
  STOPPED: 'stopped'
};

class AgentManager extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.taskQueues = new Map();
    this.agentStats = new Map();
    this.initializeStats();
  }

  /**
   * Available agent types and their constructors
   */
  static agentTypes = {
    productRecommendation: ProductRecommendationAgent,
    customerSupport: CustomerSupportAgent,
    artisanAssistant: ArtisanAssistantAgent,
    orderProcessing: OrderProcessingAgent,
    contentGeneration: ContentGenerationAgent
  };

  /**
   * Initialize performance stats for all agent types
   */
  initializeStats() {
    Object.keys(AgentManager.agentTypes).forEach(type => {
      this.agentStats.set(type, {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        averageResponseTime: 0,
        lastError: null,
        startTime: null,
        cacheHits: 0,
        cacheMisses: 0
      });
    });
  }

  /**
   * Start an agent instance
   */
  async startAgent(type, config = {}) {
    try {
      if (!AgentManager.agentTypes[type]) {
        throw new Error(`Invalid agent type: ${type}`);
      }

      if (this.agents.has(type)) {
        throw new Error(`Agent ${type} is already running`);
      }

      const AgentClass = AgentManager.agentTypes[type];
      const agent = new AgentClass();
      this.agents.set(type, agent);
      this.taskQueues.set(type, []);
      this.agentStats.get(type).startTime = Date.now();

      this.emit('agent-started', { type, config });
      return { success: true, message: `Agent ${type} started successfully` };
    } catch (error) {
      this.emit('agent-error', { type, error: error.message });
      throw error;
    }
  }

  /**
   * Stop an agent instance
   */
  async stopAgent(type) {
    try {
      const agent = this.agents.get(type);
      if (!agent) {
        throw new Error(`Agent ${type} is not running`);
      }

      // Clear agent's cache
      agent.clearCache();

      // Clean up task queue
      this.taskQueues.delete(type);
      this.agents.delete(type);

      this.emit('agent-stopped', { type });
      return { success: true, message: `Agent ${type} stopped successfully` };
    } catch (error) {
      this.emit('agent-error', { type, error: error.message });
      throw error;
    }
  }

  /**
   * Submit a task to an agent
   */
  async submitTask(type, taskData) {
    try {
      const agent = this.agents.get(type);
      if (!agent) {
        throw new Error(`Agent ${type} is not running`);
      }

      const startTime = Date.now();
      this.emit('agent-task-progress', { type, progress: 0 });

      // Update stats
      const stats = this.agentStats.get(type);
      stats.totalTasks++;

      try {
        // Process the task
        this.emit('agent-task-progress', { type, progress: 25 });
        const result = await agent.processQuery(taskData.query, taskData.userId);
        this.emit('agent-task-progress', { type, progress: 75 });

        // Update success stats
        stats.successfulTasks++;
        stats.averageResponseTime = (stats.averageResponseTime * (stats.successfulTasks - 1) + 
          (Date.now() - startTime)) / stats.successfulTasks;

        if (result.__cached) {
          stats.cacheHits++;
        } else {
          stats.cacheMisses++;
        }

        this.emit('agent-task-complete', { type, result });
        return result;
      } catch (error) {
        // Update failure stats
        stats.failedTasks++;
        stats.lastError = error.message;
        throw error;
      }
    } catch (error) {
      this.emit('agent-error', { type, error: error.message });
      throw error;
    }
  }

  /**
   * Get agent status and stats
   */
  getAgentStatus(type) {
    const agent = this.agents.get(type);
    const stats = this.agentStats.get(type);
    const queueLength = (this.taskQueues.get(type) || []).length;

    return {
      status: agent ? AgentState.RUNNING : AgentState.STOPPED,
      queueLength,
      stats: {
        ...stats,
        uptime: stats.startTime ? Date.now() - stats.startTime : 0,
        cacheHitRate: stats.totalTasks > 0 
          ? (stats.cacheHits / stats.totalTasks) * 100 
          : 0
      }
    };
  }

  /**
   * Get status of all agents
   */
  getAllAgentStatus() {
    return Object.keys(AgentManager.agentTypes).reduce((status, type) => {
      status[type] = this.getAgentStatus(type);
      return status;
    }, {});
  }

  /**
   * Clear agent's cache
   */
  async clearAgentCache(type) {
    try {
      const agent = this.agents.get(type);
      if (!agent) {
        throw new Error(`Agent ${type} is not running`);
      }

      agent.clearCache();
      this.emit('agent-cache-cleared', { type });
      return { success: true, message: `Cache cleared for agent ${type}` };
    } catch (error) {
      this.emit('agent-error', { type, error: error.message });
      throw error;
    }
  }
}

// Create and export singleton instance
const agentManager = new AgentManager();
export default agentManager;