import { test, expect } from '@playwright/test';

// Helper function to login before cart tests
async function loginUser(page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.fill('[data-testid="password-input"]', process.env.TEST_USER_PASSWORD || 'testpass123');
  await page.click('[data-testid="login-button"]');
  await page.waitForTimeout(2000); // Wait for potential redirect
}

test.describe('Shopping Cart Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page);
  });

  test('Add product to cart from product page', async ({ page }) => {
    // Navigate to marketplace
    await page.goto('/marketplace-homepage');
    
    // For now, just verify the cart page is accessible
    await page.goto('/shopping-cart');
    
    // Check if cart page loads (basic test until we add data-testid attributes)
    await expect(page).toHaveURL(/.*\/shopping-cart/);
    
    console.log('Cart test needs product and cart component data-testid attributes');
    
    // Verify success message
    await expect(page.locator('[data-testid="add-to-cart-success"]')).toBeVisible();
    await expect(page.locator('text=Added to cart')).toBeVisible();
    
    // Verify cart badge updates
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toHaveText('1');
    
    // Navigate to cart and verify item
    await page.click('[data-testid="cart-button"]');
  });

  test('Verify cart item details', async ({ page }) => {
    // First add a product to cart (this test assumes a product was added)
    await page.goto('/marketplace');
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    const productTitle = await firstProduct.locator('[data-testid="product-title"]').textContent();
    const productPrice = await firstProduct.locator('[data-testid="product-price"]').textContent();
    
    await firstProduct.locator('[data-testid="add-to-cart-button"]').click();
    await page.click('[data-testid="cart-button"]');
    
    await expect(page).toHaveURL(/.*\/cart/);
    
    const cartItem = page.locator('[data-testid="cart-item"]').first();
    await expect(cartItem.locator('[data-testid="cart-item-title"]')).toHaveText(productTitle);
    await expect(cartItem.locator('[data-testid="cart-item-price"]')).toContainText(productPrice);
  });

  test('Add multiple products to cart', async ({ page }) => {
    // Add first product
    await page.goto('/marketplace');
    let firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Go back and add second product
    await page.goBack();
    let secondProduct = page.locator('[data-testid="product-card"]').nth(1);
    await secondProduct.click();
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Check cart has 2 items
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toHaveText('2');
    
    // Navigate to cart and verify both items
    await page.click('[data-testid="cart-button"]');
    const cartItems = page.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(2);
  });

  test('Update cart item quantity', async ({ page }) => {
    // Add product to cart first
    await page.goto('/marketplace');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Navigate to cart
    await page.click('[data-testid="cart-button"]');
    
    // Get initial price
    const initialPrice = await page.locator('[data-testid="cart-item-total"]').first().textContent();
    const initialTotal = await page.locator('[data-testid="cart-total"]').textContent();
    
    // Update quantity to 2
    const quantityInput = page.locator('[data-testid="quantity-input"]').first();
    await quantityInput.clear();
    await quantityInput.fill('2');
    await quantityInput.blur();
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Verify price updated
    const updatedPrice = await page.locator('[data-testid="cart-item-total"]').first().textContent();
    const updatedTotal = await page.locator('[data-testid="cart-total"]').textContent();
    
    expect(updatedPrice).not.toBe(initialPrice);
    expect(updatedTotal).not.toBe(initialTotal);
    
    // Verify quantity is updated
    await expect(quantityInput).toHaveValue('2');
  });

  test('Remove item from cart', async ({ page }) => {
    // Add two products to cart
    await page.goto('/marketplace');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.click('[data-testid="add-to-cart-button"]');
    await page.goBack();
    await page.locator('[data-testid="product-card"]').nth(1).click();
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Navigate to cart
    await page.click('[data-testid="cart-button"]');
    
    // Verify 2 items initially
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);
    
    // Remove first item
    await page.click('[data-testid="remove-item-button"]', { first: true });
    
    // Verify confirmation dialog
    await expect(page.locator('[data-testid="confirm-remove-dialog"]')).toBeVisible();
    await page.click('[data-testid="confirm-remove"]');
    
    // Verify item removed
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    
    // Verify cart badge updated
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toHaveText('1');
  });

  test('Cart total calculation', async ({ page }) => {
    // Add products with known prices
    await page.goto('/marketplace');
    
    // Add first product and get price
    await page.locator('[data-testid="product-card"]').first().click();
    const firstPrice = await page.locator('[data-testid="product-price"]').textContent();
    await page.click('[data-testid="add-to-cart-button"]');
    
    await page.goBack();
    
    // Add second product and get price
    await page.locator('[data-testid="product-card"]').nth(1).click();
    const secondPrice = await page.locator('[data-testid="product-price"]').textContent();
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Navigate to cart
    await page.click('[data-testid="cart-button"]');
    
    // Calculate expected total
    const price1 = parseFloat(firstPrice.replace(/[^\d.]/g, ''));
    const price2 = parseFloat(secondPrice.replace(/[^\d.]/g, ''));
    const expectedSubtotal = price1 + price2;
    
    // Verify subtotal
    const subtotalText = await page.locator('[data-testid="cart-subtotal"]').textContent();
    const actualSubtotal = parseFloat(subtotalText.replace(/[^\d.]/g, ''));
    expect(actualSubtotal).toBeCloseTo(expectedSubtotal, 2);
    
    // Verify total includes taxes/fees (if applicable)
    const totalText = await page.locator('[data-testid="cart-total"]').textContent();
    const actualTotal = parseFloat(totalText.replace(/[^\d.]/g, ''));
    expect(actualTotal).toBeGreaterThanOrEqual(expectedSubtotal);
  });

  test('Empty cart state', async ({ page }) => {
    // Navigate to cart without adding anything
    await page.goto('/cart');
    
    // Verify empty cart message
    await expect(page.locator('[data-testid="empty-cart-message"]')).toBeVisible();
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
    
    // Verify continue shopping button
    await expect(page.locator('[data-testid="continue-shopping-button"]')).toBeVisible();
    
    // Click continue shopping
    await page.click('[data-testid="continue-shopping-button"]');
    await expect(page).toHaveURL(/.*\/marketplace/);
  });

  test('Cart persistence across sessions', async ({ page, context }) => {
    // Add item to cart
    await page.goto('/marketplace');
    await page.locator('[data-testid="product-card"]').first().click();
    const productTitle = await page.locator('[data-testid="product-detail-title"]').textContent();
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Close browser and create new page
    await page.close();
    const newPage = await context.newPage();
    
    // Login again (simulating new session)
    await loginUser(newPage);
    
    // Navigate to cart
    await newPage.click('[data-testid="cart-button"]');
    
    // Verify cart item persisted
    const cartItem = newPage.locator('[data-testid="cart-item"]').first();
    await expect(cartItem.locator('[data-testid="cart-item-title"]')).toHaveText(productTitle);
  });

  test('Cart item limit validation', async ({ page }) => {
    // Add product to cart multiple times to reach limit
    await page.goto('/marketplace');
    await page.locator('[data-testid="product-card"]').first().click();
    
    // Try to add item to cart many times
    for (let i = 0; i < 15; i++) {
      await page.click('[data-testid="add-to-cart-button"]');
      await page.waitForTimeout(200);
    }
    
    // Navigate to cart
    await page.click('[data-testid="cart-button"]');
    
    // Try to increase quantity beyond limit
    const quantityInput = page.locator('[data-testid="quantity-input"]').first();
    await quantityInput.clear();
    await quantityInput.fill('999');
    await quantityInput.blur();
    
    // Verify error message or quantity limit
    const errorMessage = page.locator('[data-testid="quantity-error"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('Maximum quantity');
    } else {
      // Check that quantity is capped at reasonable limit
      const finalQuantity = await quantityInput.inputValue();
      expect(parseInt(finalQuantity)).toBeLessThanOrEqual(10);
    }
  });

  test('Recommended products in cart', async ({ page }) => {
    // Add item to cart
    await page.goto('/marketplace');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Navigate to cart
    await page.click('[data-testid="cart-button"]');
    
    // Verify recommended products section
    await expect(page.locator('[data-testid="recommended-products"]')).toBeVisible();
    
    // Verify recommended products are displayed
    const recommendedItems = page.locator('[data-testid="recommended-item"]');
    await expect(recommendedItems.first()).toBeVisible();
    
    // Test adding recommended item to cart
    const recommendedItem = recommendedItems.first();
    const recommendedTitle = await recommendedItem.locator('[data-testid="product-title"]').textContent();
    
    await recommendedItem.locator('[data-testid="add-to-cart-button"]').click();
    
    // Verify item added to cart
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);
    
    // Verify the new item is in the cart
    const cartItemTitles = await page.locator('[data-testid="cart-item-title"]').allTextContents();
    expect(cartItemTitles).toContain(recommendedTitle);
  });

  test('Cart responsiveness on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Add item to cart
    await page.goto('/marketplace');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Navigate to cart
    await page.click('[data-testid="cart-button"]');
    
    // Verify mobile cart layout
    const cartContainer = page.locator('[data-testid="cart-container"]');
    await expect(cartContainer).toBeVisible();
    
    // Verify cart items stack properly on mobile
    const cartItem = page.locator('[data-testid="cart-item"]').first();
    await expect(cartItem).toBeVisible();
    
    // Verify mobile-specific controls are accessible
    const quantityControls = page.locator('[data-testid="quantity-controls"]');
    await expect(quantityControls).toBeVisible();
  });
});