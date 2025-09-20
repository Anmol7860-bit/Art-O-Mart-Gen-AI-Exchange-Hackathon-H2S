import { test, expect } from '@playwright/test';

// Helper function to login before AI assistant tests
async function loginUser(page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpass123');
  await page.click('[data-testid="login-button"]');
  await page.waitForTimeout(2000); // Wait for potential redirect
}

test.describe('AI Shopping Assistant Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page);
    
    // Navigate to AI assistant using correct route
    await page.goto('/ai-shopping-assistant');
  });

  test('AI assistant page loads and initializes', async ({ page }) => {
    // Check if AI assistant page loads
    await expect(page).toHaveURL(/.*\/ai-shopping-assistant/);
    
    // For now, just verify basic page elements until we add data-testid attributes
    console.log('AI assistant test needs component data-testid attributes');
    
    // Basic page structure check
    await expect(page.locator('body')).toBeVisible();
    
    // Verify welcome message
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    await expect(page.locator('text=Welcome to your AI Shopping Assistant')).toBeVisible();
    
    // Check connection status
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toBeVisible();
    
    // Should show either connected or mock mode
    const statusText = await connectionStatus.textContent();
    expect(statusText.toLowerCase()).toMatch(/(connected|mock mode|offline)/);
  });

  test('Agent selection functionality', async ({ page }) => {
    // Verify default agent is selected
    const agentSelector = page.locator('[data-testid="agent-selector"]');
    await expect(agentSelector).toBeVisible();
    
    // Get available agent options
    await page.click('[data-testid="agent-dropdown"]');
    const agentOptions = page.locator('[data-testid="agent-option"]');
    await expect(agentOptions.first()).toBeVisible();
    
    // Select different agent
    const culturalAgent = page.locator('[data-testid="agent-option"][data-agent="cultural-context"]');
    if (await culturalAgent.isVisible()) {
      const agentName = await culturalAgent.textContent();
      await culturalAgent.click();
      
      // Verify agent changed
      await expect(page.locator('[data-testid="selected-agent"]')).toContainText(agentName);
      
      // Verify agent status updated
      await expect(page.locator('[data-testid="agent-status"]')).toContainText('Ready');
    }
    
    // Test switching between multiple agents
    const personalAgent = page.locator('[data-testid="agent-option"][data-agent="personal-shopper"]');
    if (await personalAgent.isVisible()) {
      await page.click('[data-testid="agent-dropdown"]');
      await personalAgent.click();
      
      // Verify switch was successful
      const selectedAgentText = await page.locator('[data-testid="selected-agent"]').textContent();
      expect(selectedAgentText.toLowerCase()).toContain('personal');
    }
  });

  test('Send message and receive AI response', async ({ page }) => {
    // Wait for connection
    await page.waitForSelector('[data-testid="connection-status"]', { timeout: 10000 });
    
    // Send a message
    const testMessage = 'I am looking for traditional Indian textiles for a wedding';
    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    // Verify message appears in conversation
    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toContainText(testMessage);
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 15000 });
    
    // Verify AI response is present
    const aiResponse = page.locator('[data-testid="ai-response"]').last();
    await expect(aiResponse).toBeVisible();
    
    // Verify response contains relevant content
    const responseText = await aiResponse.textContent();
    expect(responseText.length).toBeGreaterThan(10);
    expect(responseText.toLowerCase()).toMatch(/(wedding|textile|traditional|recommend|suggest)/);
  });

  test('Chat input functionality', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    // Test typing in chat input
    await chatInput.fill('What are the best handmade jewelry options?');
    await expect(chatInput).toHaveValue('What are the best handmade jewelry options?');
    
    // Test send button becomes active when text is present
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeEnabled();
    
    // Test clearing input disables send button
    await chatInput.clear();
    await expect(sendButton).toBeDisabled();
    
    // Test Enter key sends message
    await chatInput.fill('Send this with Enter key');
    await chatInput.press('Enter');
    
    // Verify message was sent
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Send this with Enter key');
    
    // Verify input is cleared after sending
    await expect(chatInput).toHaveValue('');
  });

  test('WebSocket connection handling', async ({ page }) => {
    // Check initial connection status
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toBeVisible();
    
    const initialStatus = await connectionStatus.textContent();
    
    if (initialStatus.toLowerCase().includes('connected')) {
      // Test real WebSocket connection
      await expect(page.locator('[data-testid="websocket-indicator"]')).toHaveClass(/connected/);
      
      // Send message to test connection
      await page.fill('[data-testid="chat-input"]', 'Test WebSocket connection');
      await page.click('[data-testid="send-button"]');
      
      // Verify response received (indicating working connection)
      await page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });
      
    } else if (initialStatus.toLowerCase().includes('mock')) {
      // Test mock mode functionality
      await expect(page.locator('[data-testid="mock-mode-indicator"]')).toBeVisible();
      
      // Send message in mock mode
      await page.fill('[data-testid="chat-input"]', 'Test mock response');
      await page.click('[data-testid="send-button"]');
      
      // Verify mock response
      await page.waitForSelector('[data-testid="ai-response"]', { timeout: 5000 });
      const mockResponse = await page.locator('[data-testid="ai-response"]').last().textContent();
      expect(mockResponse).toContain('Mock response');
    }
  });

  test('Agent status indicators', async ({ page }) => {
    // Verify agent status indicator exists
    await expect(page.locator('[data-testid="agent-status"]')).toBeVisible();
    
    // Send message and check status changes
    await page.fill('[data-testid="chat-input"]', 'Help me find pottery items');
    await page.click('[data-testid="send-button"]');
    
    // Should show processing status
    const processingStatus = page.locator('[data-testid="agent-processing"]');
    if (await processingStatus.isVisible()) {
      await expect(processingStatus).toContainText(/processing|thinking|working/i);
    }
    
    // Should return to ready status after response
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="agent-status"]')).toContainText(/ready|idle/i);
  });

  test('Real-time response handling', async ({ page }) => {
    // Send message
    await page.fill('[data-testid="chat-input"]', 'What are some unique gift ideas under $100?');
    await page.click('[data-testid="send-button"]');
    
    // Check for typing indicator or loading state
    const typingIndicator = page.locator('[data-testid="typing-indicator"]');
    if (await typingIndicator.isVisible()) {
      await expect(typingIndicator).toBeVisible();
    }
    
    // Wait for response
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 15000 });
    
    // Verify response formatting
    const response = page.locator('[data-testid="ai-response"]').last();
    await expect(response).toBeVisible();
    
    // Check if response includes product recommendations
    const productLinks = response.locator('[data-testid="product-recommendation"]');
    if (await productLinks.first().isVisible()) {
      // Test clicking on product recommendation
      await productLinks.first().click();
      
      // Should navigate to product page or show product details
      await expect(page).toHaveURL(/product|marketplace/);
    }
  });

  test('Error handling for connection failures', async ({ page }) => {
    // This test simulates network issues
    await page.route('**/socket.io/**', route => route.abort());
    
    // Reload page to trigger connection failure
    await page.reload();
    
    // Check for error handling
    const errorMessage = page.locator('[data-testid="connection-error"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText(/connection|error|failed/i);
      
      // Check for retry button
      const retryButton = page.locator('[data-testid="retry-connection"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      }
    } else {
      // Should fallback to mock mode
      await expect(page.locator('[data-testid="mock-mode-indicator"]')).toBeVisible();
    }
  });

  test('Conversation context maintenance', async ({ page }) => {
    // Send first message
    await page.fill('[data-testid="chat-input"]', 'I am interested in handwoven carpets');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });
    
    // Send follow-up message that requires context
    await page.fill('[data-testid="chat-input"]', 'What sizes are available?');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="ai-response"]:nth-child(4)', { timeout: 10000 });
    
    // Verify second response acknowledges context
    const secondResponse = page.locator('[data-testid="ai-response"]').last();
    const responseText = await secondResponse.textContent();
    expect(responseText.toLowerCase()).toMatch(/(carpet|rug|size|dimension)/);
  });

  test('Agent switching with conversation history', async ({ page }) => {
    // Start conversation with one agent
    await page.fill('[data-testid="chat-input"]', 'Tell me about regional art styles');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 10000 });
    
    // Switch to different agent
    await page.click('[data-testid="agent-dropdown"]');
    const personalAgent = page.locator('[data-testid="agent-option"][data-agent="personal-shopper"]');
    if (await personalAgent.isVisible()) {
      await personalAgent.click();
      
      // Continue conversation with new agent
      await page.fill('[data-testid="chat-input"]', 'Based on what I asked earlier, what would you recommend?');
      await page.click('[data-testid="send-button"]');
      await page.waitForSelector('[data-testid="ai-response"]:nth-child(4)', { timeout: 10000 });
      
      // Verify conversation history is maintained
      const messages = page.locator('[data-testid="user-message"], [data-testid="ai-response"]');
      await expect(messages).toHaveCountGreaterThan(2);
    }
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    const container = page.locator('[data-testid="ai-assistant-container"]');
    await expect(container).toBeVisible();
    
    // Verify chat input is accessible on mobile
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();
    
    // Test mobile chat functionality
    await chatInput.fill('Mobile test message');
    await page.click('[data-testid="send-button"]');
    
    // Verify messages display properly on mobile
    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();
    
    // Verify agent selector works on mobile
    const agentSelector = page.locator('[data-testid="agent-selector"]');
    await expect(agentSelector).toBeVisible();
  });
});