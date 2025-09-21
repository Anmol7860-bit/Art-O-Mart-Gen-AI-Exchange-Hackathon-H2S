// Test script to identify the specific error
console.log('Testing API endpoints...');

// Test 1: Basic health check
async function testHealth() {
    try {
        const response = await fetch('https://art-o-mart-gen-ai-exchange-hackathon-h2-7jrzixwz0.vercel.app/api/health');
        const data = await response.text();
        console.log('Health check response:', response.status, data.substring(0, 200));
        return response.ok;
    } catch (error) {
        console.error('Health check failed:', error.message);
        return false;
    }
}

// Test 2: Chat API
async function testChat() {
    try {
        const response = await fetch('https://art-o-mart-gen-ai-exchange-hackathon-h2-7jrzixwz0.vercel.app/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Hello, can you help me find pottery?',
                agentType: 'productRecommendation'
            })
        });
        const data = await response.text();
        console.log('Chat API response:', response.status, data.substring(0, 200));
        return response.ok;
    } catch (error) {
        console.error('Chat API failed:', error.message);
        return false;
    }
}

// Test 3: Main app access
async function testApp() {
    try {
        const response = await fetch('https://art-o-mart-gen-ai-exchange-hackathon-h2-7jrzixwz0.vercel.app/');
        const data = await response.text();
        console.log('App response:', response.status, data.substring(0, 200));
        return response.ok;
    } catch (error) {
        console.error('App access failed:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('=== API Endpoint Tests ===');
    
    console.log('\n1. Testing Health Endpoint...');
    await testHealth();
    
    console.log('\n2. Testing Chat API...');
    await testChat();
    
    console.log('\n3. Testing Main App...');
    await testApp();
    
    console.log('\n=== Tests Complete ===');
}

runTests();