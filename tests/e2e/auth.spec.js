import { test, expect } from '@playwright/test';

// Test data
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpass123',
  firstName: 'Test',
  lastName: 'User'
};

const ARTISAN_USER = {
  email: process.env.TEST_ARTISAN_EMAIL || 'artisan@example.com',
  password: process.env.TEST_ARTISAN_PASSWORD || 'artisanpass123',
  firstName: 'Test',
  lastName: 'Artisan',
  craftSpecialty: 'Traditional Textiles',
  region: 'North India'
};

test.describe('Authentication Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('User login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', TEST_USER.email);
    await page.fill('[data-testid="password-input"]', TEST_USER.password);
    
    // Submit login
    await page.click('[data-testid="login-button"]');
    
    // Wait for potential redirect or success indicator
    // Note: This may need adjustment based on actual auth implementation
    await page.waitForTimeout(2000);
    
    // Check if we're redirected away from login (success)
    // or if there's an error message (we'll just log for now)
    const currentUrl = page.url();
    console.log('After login attempt, current URL:', currentUrl);
  });

  test('User registration - Artisan role', async ({ page }) => {
    // Navigate to registration
    await page.click('[data-testid="sign-up-button"]');
    
    // Fill role selection
    await page.click('[data-testid="artisan-role"]');
    await page.click('[data-testid="continue-button"]');

    // Fill basic information
    await page.fill('[data-testid="first-name"]', ARTISAN_USER.firstName);
    await page.fill('[data-testid="last-name"]', ARTISAN_USER.lastName);
    await page.fill('[data-testid="email"]', `artisan_${Date.now()}_${ARTISAN_USER.email}`);
    await page.fill('[data-testid="password"]', ARTISAN_USER.password);
    await page.fill('[data-testid="confirm-password"]', ARTISAN_USER.password);
    await page.click('[data-testid="continue-button"]');

    // Fill artisan-specific details
    await page.fill('[data-testid="craft-specialty"]', ARTISAN_USER.craftSpecialty);
    await page.selectOption('[data-testid="region-select"]', ARTISAN_USER.region);
    await page.fill('[data-testid="bio"]', 'I am a passionate artisan specializing in traditional crafts.');
    
    // Submit registration
    await page.click('[data-testid="register-button"]');

    // Verify success
    await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
  });

  test('User login flow navigation', async ({ page }) => {
    // Navigate to login
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*\/login/);

    // Fill login form
    await page.fill('[data-testid="email"]', TEST_USER.email);
    await page.fill('[data-testid="password"]', TEST_USER.password);
    
    // Submit login
    await page.click('[data-testid="login-submit"]');

    // Verify successful login - should redirect to marketplace
    await expect(page).toHaveURL(/.*\/marketplace/);
    
    // Verify user is logged in (check for user menu or profile indicator)
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('User login with invalid credentials', async ({ page }) => {
    // Navigate to login
    await page.click('[data-testid="login-button"]');

    // Fill login form with invalid credentials
    await page.fill('[data-testid="email"]', 'invalid@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    
    // Submit login
    await page.click('[data-testid="login-submit"]');

    // Verify error message
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
    
    // Should still be on login page
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Password reset flow', async ({ page }) => {
    // Navigate to login
    await page.click('[data-testid="login-button"]');
    
    // Click forgot password
    await page.click('[data-testid="forgot-password-link"]');
    
    // Fill email for password reset
    await page.fill('[data-testid="reset-email"]', TEST_USER.email);
    
    // Submit reset request
    await page.click('[data-testid="reset-password-button"]');
    
    // Verify success message
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });

  test('Session persistence across page reloads', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', TEST_USER.email);
    await page.fill('[data-testid="password"]', TEST_USER.password);
    await page.click('[data-testid="login-submit"]');
    
    // Verify logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('Logout functionality', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', TEST_USER.email);
    await page.fill('[data-testid="password"]', TEST_USER.password);
    await page.click('[data-testid="login-submit"]');
    
    // Verify logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should be redirected to home page and logged out
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('Protected routes redirect to login when not authenticated', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*\/login/);
    
    // Should show message about needing to log in
    await expect(page.locator('text=Please log in to continue')).toBeVisible();
  });

  test('Authentication state management', async ({ page }) => {
    // Start logged out
    await page.goto('/');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Login
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email"]', TEST_USER.email);
    await page.fill('[data-testid="password"]', TEST_USER.password);
    await page.click('[data-testid="login-submit"]');
    
    // Navigate to different pages and verify auth state persists
    await page.goto('/marketplace');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    await page.goto('/cart');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    await page.goto('/ai-assistant');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});