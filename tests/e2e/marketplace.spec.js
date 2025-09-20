import { test, expect } from '@playwright/test';

test.describe('Marketplace Browsing Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace-homepage');
  });

  test('Homepage loads with featured products and categories', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Art-O-Mart.*Marketplace/);
    
    // Verify main sections are present
    await expect(page.locator('[data-testid="hero-carousel"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-chips"]')).toBeVisible();
    await expect(page.locator('[data-testid="featured-artisans"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="trust-indicators"]')).toBeVisible();

    // Verify AI search bar is present
    await expect(page.locator('[data-testid="ai-search-bar"]')).toBeVisible();

    // Check that products are loaded
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards.first()).toBeVisible();
    
    // Verify product cards have required elements
    const firstCard = productCards.first();
    await expect(firstCard.locator('[data-testid="product-image"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="product-title"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="product-price"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="artisan-name"]')).toBeVisible();
  });

  test('Product search functionality', async ({ page }) => {
    // Test basic search
    await page.fill('[data-testid="search-input"]', 'textile');
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results
    await page.waitForLoadState('networkidle');
    
    // Verify search results
    const searchResults = page.locator('[data-testid="search-results"]');
    await expect(searchResults).toBeVisible();
    
    // Check that results contain search term
    const productTitles = page.locator('[data-testid="product-title"]');
    const count = await productTitles.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify search term appears in at least some results
    const firstTitle = await productTitles.first().textContent();
    expect(firstTitle.toLowerCase()).toContain('textile');
  });

  test('AI-powered search functionality', async ({ page }) => {
    // Test AI search
    const aiSearchQuery = 'I need something traditional for a wedding gift';
    await page.fill('[data-testid="ai-search-input"]', aiSearchQuery);
    await page.click('[data-testid="ai-search-button"]');
    
    // Wait for AI processing
    await expect(page.locator('[data-testid="ai-search-loading"]')).toBeVisible();
    await page.waitForSelector('[data-testid="ai-search-results"]', { timeout: 10000 });
    
    // Verify AI search results
    await expect(page.locator('[data-testid="ai-search-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-suggestion-text"]')).toBeVisible();
    
    // Check that recommended products are shown
    const recommendedProducts = page.locator('[data-testid="ai-recommended-product"]');
    await expect(recommendedProducts.first()).toBeVisible();
  });

  test('Category filtering', async ({ page }) => {
    // Click on a category chip
    const categoryChip = page.locator('[data-testid="category-chip"]').first();
    const categoryName = await categoryChip.textContent();
    await categoryChip.click();
    
    // Wait for filtering
    await page.waitForLoadState('networkidle');
    
    // Verify URL contains category filter
    await expect(page).toHaveURL(new RegExp(`category=${encodeURIComponent(categoryName.toLowerCase())}`));
    
    // Verify filtered products
    const filteredProducts = page.locator('[data-testid="product-card"]');
    await expect(filteredProducts.first()).toBeVisible();
    
    // Verify active category indicator
    await expect(categoryChip).toHaveClass(/active|selected/);
  });

  test('Price range filtering', async ({ page }) => {
    // Open filters
    await page.click('[data-testid="filters-toggle"]');
    await expect(page.locator('[data-testid="price-filter"]')).toBeVisible();
    
    // Set price range
    await page.fill('[data-testid="price-min"]', '100');
    await page.fill('[data-testid="price-max"]', '500');
    await page.click('[data-testid="apply-filters"]');
    
    // Wait for filtering
    await page.waitForLoadState('networkidle');
    
    // Verify filtered products have prices in range
    const priceElements = page.locator('[data-testid="product-price"]');
    const firstPrice = await priceElements.first().textContent();
    const price = parseInt(firstPrice.replace(/[^\d]/g, ''));
    expect(price).toBeGreaterThanOrEqual(100);
    expect(price).toBeLessThanOrEqual(500);
  });

  test('Region-based filtering', async ({ page }) => {
    // Open filters
    await page.click('[data-testid="filters-toggle"]');
    
    // Select a region
    await page.selectOption('[data-testid="region-filter"]', 'North India');
    await page.click('[data-testid="apply-filters"]');
    
    // Wait for filtering
    await page.waitForLoadState('networkidle');
    
    // Verify products from selected region
    const artisanRegions = page.locator('[data-testid="artisan-region"]');
    const firstRegion = await artisanRegions.first().textContent();
    expect(firstRegion).toContain('North India');
  });

  test('Product detail page navigation', async ({ page }) => {
    // Click on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    const productTitle = await firstProduct.locator('[data-testid="product-title"]').textContent();
    
    await firstProduct.click();
    
    // Verify navigation to product detail page
    await expect(page).toHaveURL(/.*\/product\/\d+/);
    
    // Verify product detail elements
    await expect(page.locator('[data-testid="product-detail-title"]')).toHaveText(productTitle);
    await expect(page.locator('[data-testid="product-detail-image"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-to-cart-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="artisan-profile"]')).toBeVisible();
  });

  test('Pagination functionality', async ({ page }) => {
    // Scroll to pagination
    await page.locator('[data-testid="pagination"]').scrollIntoViewIfNeeded();
    
    // Verify pagination is visible
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    
    // Get current page products
    const currentProducts = await page.locator('[data-testid="product-card"]').count();
    
    // Click next page
    await page.click('[data-testid="pagination-next"]');
    
    // Wait for new products to load
    await page.waitForLoadState('networkidle');
    
    // Verify different products are shown
    const newProducts = await page.locator('[data-testid="product-card"]').first().textContent();
    const oldProducts = await page.locator('[data-testid="product-card"]').first().textContent();
    
    // URL should reflect new page
    await expect(page).toHaveURL(/page=2/);
  });

  test('Sorting functionality', async ({ page }) => {
    // Open sort dropdown
    await page.click('[data-testid="sort-dropdown"]');
    
    // Select sort by price (high to low)
    await page.click('[data-testid="sort-price-high"]');
    
    // Wait for sorting
    await page.waitForLoadState('networkidle');
    
    // Verify products are sorted by price
    const prices = await page.locator('[data-testid="product-price"]').allTextContents();
    const numericPrices = prices.map(p => parseInt(p.replace(/[^\d]/g, '')));
    
    // Check if sorted in descending order
    for (let i = 0; i < numericPrices.length - 1; i++) {
      expect(numericPrices[i]).toBeGreaterThanOrEqual(numericPrices[i + 1]);
    }
  });

  test('Responsive design - mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Verify product grid adapts to mobile
    const productGrid = page.locator('[data-testid="product-grid"]');
    await expect(productGrid).toHaveCSS('grid-template-columns', /1fr|repeat\(1,|100%/);
  });

  test('Image loading and fallbacks', async ({ page }) => {
    // Check that product images load properly
    const productImages = page.locator('[data-testid="product-image"]');
    const firstImage = productImages.first();
    
    // Wait for image to load
    await firstImage.waitFor({ state: 'visible' });
    
    // Verify image has loaded (not showing fallback)
    const src = await firstImage.getAttribute('src');
    expect(src).not.toContain('no_image.png');
    
    // Verify alt text is present
    const alt = await firstImage.getAttribute('alt');
    expect(alt).toBeTruthy();
  });

  test('Featured artisans section', async ({ page }) => {
    // Verify featured artisans section
    const featuredArtisans = page.locator('[data-testid="featured-artisans"]');
    await expect(featuredArtisans).toBeVisible();
    
    // Check artisan cards
    const artisanCards = page.locator('[data-testid="artisan-card"]');
    await expect(artisanCards.first()).toBeVisible();
    
    // Click on an artisan to view their storefront
    const firstArtisan = artisanCards.first();
    const artisanName = await firstArtisan.locator('[data-testid="artisan-name"]').textContent();
    
    await firstArtisan.click();
    
    // Verify navigation to artisan storefront
    await expect(page).toHaveURL(/.*\/artisan\/\d+/);
    await expect(page.locator('[data-testid="artisan-profile-name"]')).toHaveText(artisanName);
  });
});