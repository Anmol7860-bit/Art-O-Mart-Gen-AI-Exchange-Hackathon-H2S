import BaseAgent from './BaseAgent.js';

export class CustomerSupportAgent extends BaseAgent {
  constructor() {
    super('customer-support');
  }

  /**
   * Handle customer support query
   */
  async handleSupportQuery(query, userId, conversationHistory = []) {
    try {
      // Fetch user order history if userId is provided
      let userOrders = [];
      if (userId) {
        const { data } = await this.supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        userOrders = data || [];
      }

      // Prepare context
      const context = {
        userOrders,
        conversationHistory,
        supportCategories: [
          'Order Status',
          'Shipping Information',
          'Returns & Refunds',
          'Product Information',
          'Payment Issues',
          'Account Management',
          'Technical Support'
        ]
      };

      // Build messages
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: `Customer Query: "${query}"
          
          Recent Orders: ${JSON.stringify(userOrders)}
          
          Please provide helpful customer support. If the issue requires human intervention, indicate that clearly.`
        }
      ];

      const response = await this.generateResponse(messages);
      
      // Check if escalation is needed
      const needsEscalation = await this.checkEscalation(query, response);
      
      return {
        success: true,
        data: {
          response,
          needsEscalation,
          suggestedActions: await this.getSuggestedActions(query),
          category: await this.categorizeQuery(query)
        }
      };
    } catch (error) {
      this.logger.error('Error in customer support:', error);
      throw error;
    }
  }

  /**
   * Check if query needs human escalation
   */
  async checkEscalation(query, aiResponse) {
    const escalationKeywords = [
      'refund',
      'complaint',
      'legal',
      'urgent',
      'emergency',
      'fraud',
      'stolen',
      'damaged'
    ];

    const lowerQuery = query.toLowerCase();
    return escalationKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Get suggested actions for the query
   */
  async getSuggestedActions(query) {
    const functions = [
      {
        name: 'suggest_actions',
        description: 'Suggest actions for customer query',
        parameters: {
          type: 'object',
          properties: {
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] }
                }
              }
            }
          }
        }
      }
    ];

    const messages = [
      {
        role: 'user',
        content: `Suggest appropriate actions for this customer query: "${query}"`
      }
    ];

    try {
      const response = await this.generateStructuredResponse(messages, functions, {
        functionCall: { name: 'suggest_actions' }
      });
      return response.actions || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Categorize customer query
   */
  async categorizeQuery(query) {
    const functions = [
      {
        name: 'categorize',
        description: 'Categorize customer support query',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: [
                'Order Status',
                'Shipping',
                'Returns',
                'Product Info',
                'Payment',
                'Account',
                'Technical',
                'Other'
              ]
            },
            subcategory: { type: 'string' },
            sentiment: {
              type: 'string',
              enum: ['positive', 'neutral', 'negative']
            }
          }
        }
      }
    ];

    const messages = [
      {
        role: 'user',
        content: `Categorize this customer query: "${query}"`
      }
    ];

    try {
      const response = await this.generateStructuredResponse(messages, functions, {
        functionCall: { name: 'categorize' }
      });
      return response;
    } catch (error) {
      return { category: 'Other', sentiment: 'neutral' };
    }
  }

  /**
   * Generate FAQ response
   */
  async getFAQResponse(question) {
    const faqs = await this.fetchContext('faqs', { is_active: true });
    
    const messages = [
      {
        role: 'user',
        content: `Question: "${question}"
        
        Available FAQs: ${JSON.stringify(faqs)}
        
        Find the most relevant FAQ answer or provide a helpful response if no FAQ matches.`
      }
    ];

    return await this.generateResponse(messages);
  }
}

export default CustomerSupportAgent;