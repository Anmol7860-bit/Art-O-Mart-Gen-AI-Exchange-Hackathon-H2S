import { aiService } from './aiService';

/**
 * Chat Service for AI Shopping Assistant
 * Handles chat interactions with AI agents
 */
class ChatService {
  constructor() {
    this.conversations = new Map(); // Store conversation history
  }

  /**
   * Send message to AI agent
   */
  async sendMessage(message, agentType = 'productRecommendation', conversationId = null) {
    if (!conversationId) {
      conversationId = this.generateConversationId();
    }

    // Get conversation history
    const conversation = this.conversations.get(conversationId) || [];
    
    try {
      const response = await aiService.chatWithAgent({
        message,
        agentType,
        conversationId,
        context: {
          history: conversation,
          timestamp: new Date().toISOString()
        }
      });

      // Handle both real API responses and mock responses
      const aiResponse = response.response || response.content || "I'm here to help you with your queries!";

      // Update conversation history
      const updatedConversation = [
        ...conversation,
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
      ];
      
      this.conversations.set(conversationId, updatedConversation);

      return {
        success: true,
        response: aiResponse,
        conversationId,
        agent: response.agent || this.getAgentName(agentType),
        timestamp: response.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('Chat service error:', error);
      
      // Provide a helpful fallback response
      const fallbackResponse = this.getFallbackResponse(message, agentType);
      
      return {
        success: true, // Still return success to provide user experience
        response: fallbackResponse,
        conversationId,
        agent: this.getAgentName(agentType),
        timestamp: new Date().toISOString(),
        isFallback: true
      };
    }
  }

  /**
   * Get agent-specific fallback responses
   */
  getFallbackResponse(message, agentType) {
    const agentResponses = {
      'productRecommendation': "I'd love to help you find the perfect handcrafted products! Let me suggest some beautiful items from our talented artisans.",
      'customerSupport': "Thank you for reaching out! I'm here to assist you with any questions about our marketplace and artisan products.",
      'artisanAssistant': "I'm excited to share the rich cultural stories behind our traditional crafts. Each piece has a beautiful heritage!",
      'orderProcessing': "I can help you with order-related queries and track your purchases from our amazing artisan community.",
      'contentGeneration': "I specialize in creating engaging content about traditional crafts and cultural heritage. How can I help?"
    };
    
    return agentResponses[agentType] || agentResponses['customerSupport'];
  }

  /**
   * Get friendly agent names
   */
  getAgentName(agentType) {
    const agentNames = {
      'productRecommendation': 'Product Expert Maya',
      'customerSupport': 'Support Specialist Arjun',
      'artisanAssistant': 'Cultural Guide Priya',
      'orderProcessing': 'Order Assistant Rahul',
      'contentGeneration': 'Content Creator Kavya'
    };
    
    return agentNames[agentType] || 'AI Assistant';
  }

  /**
   * Get conversation history
   */
  getConversation(conversationId) {
    return this.conversations.get(conversationId) || [];
  }

  /**
   * Clear conversation
   */
  clearConversation(conversationId) {
    this.conversations.delete(conversationId);
  }

  /**
   * Generate unique conversation ID
   */
  generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get available agents
   */
  getAvailableAgents() {
    return [
      {
        id: 'productRecommendation',
        name: 'Product Recommendation',
        description: 'Analyzes preferences and suggests personalized products',
        icon: '🛍️',
        status: 'active'
      },
      {
        id: 'customerSupport',
        name: 'Customer Support',
        description: 'Handles inquiries and provides shopping assistance',
        icon: '💬',
        status: 'active'
      },
      {
        id: 'artisanAssistant',
        name: 'Artisan Assistant',
        description: 'Provides cultural context and artisan information',
        icon: '🎨',
        status: 'active'
      },
      {
        id: 'orderProcessing',
        name: 'Order Processing',
        description: 'Manages orders and inventory queries',
        icon: '📦',
        status: 'active'
      },
      {
        id: 'contentGeneration',
        name: 'Content Generation',
        description: 'Creates product descriptions and cultural insights',
        icon: '✍️',
        status: 'active'
      }
    ];
  }
}

// Create singleton instance
export const chatService = new ChatService();
export default chatService;