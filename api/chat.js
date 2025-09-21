import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'demo-key');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, agentType = 'productRecommendation', userId = 'anonymous' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Agent-specific prompts for different AI assistants
    const agentPrompts = {
      productRecommendation: `You are an AI product recommendation assistant for Art-O-Mart, a handcrafted marketplace. Help users find beautiful artisan-made products based on their preferences. Be enthusiastic and knowledgeable about crafts and cultural art. User message: "${message}"`,
      
      customerSupport: `You are a helpful customer support agent for Art-O-Mart marketplace. Answer questions about orders, shipping, returns, and general marketplace policies. Be professional and helpful. User message: "${message}"`,
      
      artisanAssistant: `You are an AI assistant helping artisans on Art-O-Mart marketplace. Provide advice on product listings, photography, pricing, and growing their craft business. Be encouraging and practical. User message: "${message}"`,
      
      orderProcessing: `You are an order processing assistant for Art-O-Mart. Help with order status, tracking, modifications, and processing issues. Be accurate and efficient. User message: "${message}"`,
      
      contentGeneration: `You are a creative content assistant for Art-O-Mart. Help generate product descriptions, marketing content, and cultural stories about handcrafted items. Be creative and culturally respectful. User message: "${message}"`
    };

    const prompt = agentPrompts[agentType] || agentPrompts.productRecommendation;

    // Use Gemini 2.0 Flash for fast responses
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Generate contextual suggestions based on agent type
    const suggestions = {
      productRecommendation: ["Show me pottery", "Find jewelry", "Cultural artifacts", "Custom orders"],
      customerSupport: ["Track my order", "Return policy", "Shipping info", "Account help"],
      artisanAssistant: ["Pricing advice", "Photography tips", "Market trends", "Business growth"],
      orderProcessing: ["Order status", "Modify order", "Cancel order", "Payment issues"],
      contentGeneration: ["Product descriptions", "Cultural stories", "Marketing copy", "SEO content"]
    };

    res.status(200).json({
      response: text,
      agentType,
      timestamp: new Date().toISOString(),
      userId,
      conversationId: `conv_${Date.now()}`,
      suggestions: suggestions[agentType] || suggestions.productRecommendation,
      metadata: {
        model: "gemini-2.0-flash-exp",
        agent: agentType,
        powered_by: "Google Gemini AI"
      }
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Fallback response if Gemini fails
    const fallbackResponses = {
      productRecommendation: "I'd love to help you find amazing handcrafted items! What type of art or craft are you interested in today?",
      customerSupport: "I'm here to help with any questions about your Art-O-Mart experience. What can I assist you with?",
      artisanAssistant: "I'm here to help you grow your craft business on Art-O-Mart. What would you like to know?",
      orderProcessing: "I can help with your order information. What would you like to check?",
      contentGeneration: "I can help create compelling content for your artisan products. What do you need?"
    };

    const { agentType = 'productRecommendation' } = req.body;
    
    res.status(200).json({
      response: fallbackResponses[agentType] || fallbackResponses.productRecommendation,
      agentType,
      timestamp: new Date().toISOString(),
      userId: req.body.userId || 'anonymous',
      conversationId: `conv_${Date.now()}`,
      suggestions: ["Tell me more", "How can you help?", "What services do you offer?"],
      metadata: {
        model: "fallback-mode",
        agent: agentType,
        note: "Using fallback response - check Gemini API configuration"
      }
    });
  }
}
