import { test, expect } from '@playwright/test';

test('Basic connectivity test', async ({ page }) => {
  // Go to the application
  console.log('Navigating to application...');
  await page.goto('http://localhost:4028');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle', { timeout: 5000 });
  
  // Check if the title is correct
  const title = await page.title();
  console.log('Page title:', title);
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-homepage.png' });
  
  expect(title).toContain('Art O Mart');
});