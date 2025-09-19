import { geminiClient, agentConfigs } from '../config/ai.js';
import { supabaseAdmin } from '../config/database.js';
import winston from 'winston';
import NodeCache from 'node-cache';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/agents.log' })
  ]
});

// Initialize cache for AI responses
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

export class BaseAgent {
  constructor(agentType) {
    this.agentType = agentType;
    this.config = agentConfigs[agentType];
    this.geminiClient = geminiClient;
    this.supabase = supabaseAdmin;
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * Generate AI response using OpenAI
   */
  async generateResponse(messages, options = {}) {
    try {
      const modelName = options.model || process.env.AI_MODEL || 'gemini-2.0-flash-001';
      const temp = options.temperature ?? this.config.temperature;
      const maxOut = options.maxTokens ?? this.config.maxTokens;
      const cacheKey = `${this.agentType}:${modelName}:${temp}:${maxOut}:${JSON.stringify(messages)}`;
      const cached = this.cache.get(cacheKey);

      if (cached && !options.skipCache) {
        this.logger.info(`Cache hit for ${this.agentType}`);
        return Object.assign(cached, { __cached: true });
      }

      const model = this.geminiClient.getGenerativeModel({ 
        model: options.model || process.env.AI_MODEL || 'gemini-2.0-flash-001',
      });

      const genCfg = {
        temperature: options.temperature ?? this.config.temperature,
        maxOutputTokens: options.maxTokens ?? this.config.maxTokens,
      };
      if (options.topP != null) genCfg.topP = options.topP;
      if (options.topK != null) genCfg.topK = options.topK;
      if (options.stopSequences) genCfg.stopSequences = options.stopSequences;
      if (options.candidateCount) genCfg.candidateCount = options.candidateCount;

      const prompt = {
        contents: [
          { role: 'user', parts: [{ text: this.config.systemPrompt }] },
          ...messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          }))
        ],
        generationConfig: genCfg
      };

      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.();
      if (!text) throw new Error('Gemini returned no content');
      
      // Cache the response
      this.cache.set(cacheKey, text);
      
      // Log the interaction
      await this.logInteraction(messages, text);
      
      return text;
    } catch (error) {
      this.logger.error(`Error in ${this.agentType} agent:`, error);
      throw error;
    }
  }

  /**
   * Generate structured response using function calling
   */
  async generateStructuredResponse(messages, functions, options = {}) {
    try {
      const modelName = options.model || process.env.AI_MODEL || 'gemini-2.0-flash-001';
      const temp = options.temperature ?? this.config.temperature;
      const maxOut = options.maxTokens ?? this.config.maxTokens;
      const fnName = options.functionCall?.name || functions[0]?.name;
      const cacheKey = `${this.agentType}:${modelName}:${temp}:${maxOut}:${fnName}:${JSON.stringify(messages)}`;
      const cached = this.cache.get(cacheKey);

      if (cached && !options.skipCache) {
        this.logger.info(`Cache hit for structured response in ${this.agentType}`);
        return Object.assign(cached, { __cached: true });
      }

      const model = this.geminiClient.getGenerativeModel({
        model: modelName,
        systemInstruction: { role: 'system', parts: [{ text: this.config.systemPrompt }] }
      });

      const selectedFn = options.functionCall?.name
        ? functions.find(f => f.name === options.functionCall.name)
        : functions[0];
      if (!selectedFn) throw new Error('Selected function not found');

      const contents = [
        { role: 'user', parts: [{ text: this.config.systemPrompt }] },
        ...messages.map(m => ({ 
          role: m.role === 'assistant' ? 'model' : 'user', 
          parts: [{ text: m.content }] 
        }))
      ];

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: options.temperature ?? this.config.temperature,
          maxOutputTokens: options.maxTokens ?? this.config.maxTokens,
          responseMimeType: 'application/json',
          responseSchema: selectedFn.parameters,
        },
      });

      const text = result?.response?.text?.();
      if (!text) throw new Error('No JSON response from model');
      
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        this.logger.error('Invalid JSON from model', { text });
        throw new Error('Invalid JSON from model');
      }

      this.cache.set(cacheKey, parsed);
      await this.logInteraction(messages, parsed);
      return parsed;
    } catch (error) {
      this.logger.error(`Error in structured response for ${this.agentType}:`, error);
      throw error;
    }
  }

  /**
   * Log AI interactions to database
   */
  async logInteraction(input, output) {
    try {
      const { error } = await this.supabase
        .from('ai_interactions')
        .insert({
          agent_type: this.agentType,
          input: JSON.stringify(input),
          output: JSON.stringify(output),
          timestamp: new Date().toISOString()
        });

      if (error) {
        this.logger.error('Failed to log interaction:', error);
      }
    } catch (error) {
      this.logger.error('Error logging interaction:', error);
    }
  }

  /**
   * Fetch context from database
   */
  async fetchContext(contextType, params = {}) {
    try {
      let query = this.supabase.from(contextType);
      
      // Apply filters based on params
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error(`Error fetching context ${contextType}:`, error);
      throw error;
    }
  }

  /**
   * Process user query with context enrichment
   */
  async processQuery(query, userId = null, additionalContext = {}) {
    try {
      // Fetch user context if userId is provided
      let userContext = {};
      if (userId) {
        const { data: userData } = await this.supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (userData) {
          userContext = userData;
        }
      }

      // Build messages with context
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            query: query,
            userContext: userContext,
            additionalContext: additionalContext
          })
        }
      ];

      // Generate response
      const response = await this.generateResponse(messages);
      
      return {
        success: true,
        response: response,
        metadata: {
          agentType: this.agentType,
          timestamp: new Date().toISOString(),
          cached: false
        }
      };
    } catch (error) {
      this.logger.error(`Error processing query in ${this.agentType}:`, error);
      return {
        success: false,
        error: error.message,
        metadata: {
          agentType: this.agentType,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Clear cache for this agent
   */
  clearCache() {
    const keys = this.cache.keys();
    keys.forEach(key => {
      if (key.startsWith(this.agentType)) {
        this.cache.del(key);
      }
    });
    this.logger.info(`Cache cleared for ${this.agentType}`);
  }
}

export default BaseAgent;