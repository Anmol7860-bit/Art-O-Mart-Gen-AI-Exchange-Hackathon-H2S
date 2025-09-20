/**
 * Global setup for Playwright E2E tests
 * Run once before all tests to set up the testing environment
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting global E2E test setup...');
  
  // Create a browser instance to pre-warm and validate the application
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Check if the application is running
    const baseURL = process.env.BASE_URL || 'http://localhost:4028';
    console.log(`🌐 Validating application at ${baseURL}...`);
    
    await page.goto(baseURL, { timeout: 10000 });
    
    // Wait for the app to load and validate basic functionality
    await page.waitForSelector('body', { timeout: 5000 });
    
    const title = await page.title();
    console.log(`✅ Application loaded successfully. Title: ${title}`);
    
    // Check if the app has any obvious errors
    const hasReactError = await page.locator('[data-testid="error-boundary"]').count();
    if (hasReactError > 0) {
      console.warn('⚠️ React error boundary detected on initial load');
    }
    
    // Validate that routes are working
    const routes = ['/login', '/register', '/marketplace'];
    
    for (const route of routes) {
      try {
        await page.goto(`${baseURL}${route}`, { timeout: 5000 });
        console.log(`✅ Route ${route} accessible`);
      } catch (error) {
        console.warn(`⚠️ Route ${route} not accessible: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global E2E test setup completed successfully');
  
  // Store any setup data in global state if needed
  return {
    baseURL: process.env.BASE_URL || 'http://localhost:4028',
    setupTime: new Date().toISOString()
  };
}

export default globalSetup;