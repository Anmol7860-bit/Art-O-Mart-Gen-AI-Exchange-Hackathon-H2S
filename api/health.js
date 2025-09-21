export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Art-O-Mart AI Backend',
    version: '2.0.0',
    environment: 'production',
    features: {
      ai_chat: 'enabled',
      gemini_integration: 'active',
      websocket_simulation: 'enabled',
      cors: 'enabled'
    },
    endpoints: {
      chat: '/api/chat',
      health: '/api/health',
      websocket: '/api/websocket'
    }
  });
}