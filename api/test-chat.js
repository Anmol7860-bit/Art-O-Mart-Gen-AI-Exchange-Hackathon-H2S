// Simple test API endpoint
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

    // Simple fallback response for testing
    const response = {
      response: `Hello! I'm your AI shopping assistant. You said: "${message}". I'm here to help you find beautiful handcrafted items on Art-O-Mart!`,
      agentType,
      timestamp: new Date().toISOString(),
      userId,
      conversationId: `conv_${Date.now()}`,
      suggestions: [
        "Show me jewelry",
        "Find pottery items", 
        "Tell me about textiles",
        "Help me find a gift"
      ],
      metadata: {
        model: "test-mode",
        agent: agentType,
        status: "success"
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}