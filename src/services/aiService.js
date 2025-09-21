import { getEnvVar } from '../utils/envValidator.js';

/**
 * AI Service for making API calls to the backend
 * Handles both mock data and real API calls based on environment configuration
 */
class AIService {
  constructor() {
    this.baseURL = getEnvVar('VITE_API_URL');
    this.isMockMode = getEnvVar('VITE_MOCK_DATA') === 'true';
    
    // Force mock mode if no API URL is configured or if it points to a protected backend
    if (!this.baseURL || this.baseURL.includes('vercel.app')) {
      console.log('AI Service: Using mock mode - Backend is protected or not configured');
      this.isMockMode = true;
    }
  }

  /**
   * Make API request to backend
   */
  async makeRequest(endpoint, options = {}) {
    if (this.isMockMode) {
      console.log('AI Service: Using mock mode for endpoint:', endpoint);
      return this.getMockResponse(endpoint);
    }

    const url = `${this.baseURL}${endpoint}`;
    console.log('AI Service: Making request to:', url);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      console.log('AI Service: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Service: API Error:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('AI Service: Response data:', data);
      return data;
    } catch (error) {
      console.error('AI Service API Error:', error);
      console.log('AI Service: Falling back to mock response');
      return this.getMockResponse(endpoint);
    }
  }

  /**
   * Generate AI content
   */
  async generateContent(data) {
    return this.makeRequest('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'marketing_content', // Map to backend schema
        input: data,
        parameters: {
          contentType: data.contentType,
          culturalContext: data.culturalContext
        }
      })
    });
  }

  /**
   * Chat with AI agent
   */
  async chatWithAgent(data) {
    return this.makeRequest('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: data.message,
        context: {
          type: this.mapAgentTypeToContext(data.agentType),
          data: {
            agentType: data.agentType,
            conversationId: data.conversationId,
            history: data.context?.history || []
          }
        }
      })
    });
  }

  /**
   * Map frontend agent types to backend context types
   */
  mapAgentTypeToContext(agentType) {
    const mapping = {
      'productRecommendation': 'product',
      'customerSupport': 'support',
      'artisanAssistant': 'artisan',
      'orderProcessing': 'order',
      'contentGeneration': 'product'
    };
    return mapping[agentType] || 'support';
  }

  /**
   * Start agent task
   */
  async startAgentTask(agentId, taskData) {
    return this.makeRequest(`/agents/${agentId}/task`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  /**
   * Get agent status
   */
  async getAgentStatus(agentId) {
    return this.makeRequest(`/agents/${agentId}/status`);
  }

  /**
   * Configure agent
   */
  async configureAgent(agentId, config) {
    return this.makeRequest(`/agents/${agentId}/configure`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Mock responses for development/testing
   */
  getMockResponse(endpoint) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (endpoint.includes('/ai/generate')) {
          resolve({
            success: true,
            content: this.generateMockContent(),
            type: "text",
            metadata: {
              model: "gemini-2.0-flash-001",
              timestamp: new Date().toISOString(),
              confidence: 0.95
            }
          });
        } else if (endpoint.includes('/ai/chat')) {
          resolve({
            success: true,
            response: this.generateMockChatResponse(),
            agent: "ai-assistant",
            timestamp: new Date().toISOString(),
            context: "mock"
          });
        } else if (endpoint.includes('/agents/')) {
          if (endpoint.includes('/task')) {
            resolve({
              success: true,
              taskId: "mock-task-" + Date.now(),
              status: "completed",
              result: {
                content: this.generateMockContent(),
                confidence: 0.95
              }
            });
          } else if (endpoint.includes('/status')) {
            resolve({
              success: true,
              status: "active",
              uptime: "24h",
              tasksCompleted: 156
            });
          } else {
            resolve({
              success: true,
              message: "Mock agent operation completed"
            });
          }
        } else {
          resolve({
            success: true,
            message: "Mock API response"
          });
        }
      }, 1000 + Math.random() * 2000); // Simulate network delay
    });
  }

  /**
   * Generate contextually appropriate mock content
   */
  generateMockContent() {
    const contents = [
      "🎨 **Discover the Art of Rajasthani Block Printing**\n\nExperience the timeless tradition of hand-block printing, where skilled artisans use wooden blocks carved with intricate patterns to create stunning textiles. Each piece tells a story of heritage, passed down through generations.\n\n✨ *Handcrafted with love and tradition*",
      
      "🏺 **Authentic Kerala Pottery Collection**\n\nFrom the skilled hands of traditional potters comes this exquisite collection of terracotta vessels. Each piece is shaped on ancient potter's wheels and fired in traditional kilns, preserving techniques that are centuries old.\n\n🌿 *Eco-friendly and sustainable craftsmanship*",
      
      "💍 **Exquisite Kundan Jewelry**\n\nBehold the magnificence of Kundan jewelry, where precious gems are set in gold using traditional techniques. This art form, originating in the royal courts of Rajasthan, represents the pinnacle of Indian jewelry craftsmanship.\n\n👑 *Fit for royalty, made for you*",
      
      "🧵 **Hand-Woven Silk Sarees**\n\nWitness the magic of handloom weaving in these lustrous silk sarees. Each thread is carefully selected and woven by master weavers, creating patterns that dance with light and movement.\n\n✨ *Where tradition meets elegance*"
    ];
    
    return contents[Math.floor(Math.random() * contents.length)];
  }

  /**
   * Generate contextually appropriate mock chat responses
   */
  generateMockChatResponse() {
    const responses = [
      "Hello! I'm here to help you discover amazing handcrafted products from talented artisans across India. What type of traditional craft are you interested in today?",
      
      "I'd be delighted to recommend some beautiful pieces! Based on your preferences, I think you'd love our collection of hand-block printed textiles from Rajasthan. Would you like to see some options?",
      
      "That's a wonderful choice! Traditional pottery has such rich cultural significance. Our Kerala artisans create stunning terracotta pieces using techniques passed down through generations. Let me show you some featured items.",
      
      "Absolutely! Kundan jewelry is truly spectacular. Each piece is a work of art, carefully crafted by skilled jewelers. I can recommend some beautiful sets that would be perfect for special occasions.",
      
      "Great question! All our artisans are verified and we ensure fair trade practices. Each product comes with the artisan's story and details about the traditional techniques used. Would you like to learn more about a specific craft?",
      
      "I can definitely help you find the perfect gift! Traditional Indian crafts make meaningful presents. What's the occasion, and do you have a particular region's crafts in mind?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// Create singleton instance
export const aiService = new AIService();
export default aiService;