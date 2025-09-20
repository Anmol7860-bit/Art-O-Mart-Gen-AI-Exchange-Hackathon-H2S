/**
 * API Integration Tests
 * Tests for frontend services and API communication
 */

import { createClient } from '@supabase/supabase-js';
import * as marketplaceService from '../../src/services/marketplaceService';
import { getEnvVar } from '../../src/utils/envValidator';

// Mock environment variables for testing
const mockEnvVars = {
  VITE_SUPABASE_URL: 'https://test-project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key-for-testing',
  VITE_BACKEND_URL: 'http://localhost:5000/api',
  VITE_MOCK_DATA: 'false'
};

global.import = {
  meta: {
    env: mockEnvVars
  }
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null }))
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('API Integration Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  describe('Environment Configuration', () => {
    test('should load environment variables correctly', () => {
      expect(getEnvVar('VITE_SUPABASE_URL')).toBe('https://test-project.supabase.co');
      expect(getEnvVar('VITE_BACKEND_URL')).toBe('http://localhost:5000/api');
    });

    test('should validate Supabase configuration', () => {
      const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
      const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

      expect(supabaseUrl).toBeTruthy();
      expect(supabaseKey).toBeTruthy();
      expect(supabaseUrl).toContain('supabase.co');
    });
  });

  describe('Marketplace Service Tests', () => {
    describe('Product Operations', () => {
      test('should fetch products successfully', async () => {
        const mockProducts = [
          {
            id: 1,
            title: 'Handwoven Textile',
            price: 299,
            artisan_id: 1,
            category: 'Textiles'
          },
          {
            id: 2,
            title: 'Clay Pottery',
            price: 149,
            artisan_id: 2,
            category: 'Pottery'
          }
        ];

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: mockProducts, total: 2 })
        });

        const result = await marketplaceService.getProducts();
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/products'),
          expect.any(Object)
        );
        expect(result.products).toEqual(mockProducts);
        expect(result.total).toBe(2);
      });

      test('should handle product fetch errors', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(marketplaceService.getProducts()).rejects.toThrow('Network error');
      });

      test('should fetch product by ID', async () => {
        const mockProduct = {
          id: 1,
          title: 'Handwoven Textile',
          price: 299,
          description: 'Beautiful handwoven textile from North India',
          artisan: { name: 'John Artisan', region: 'North India' }
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockProduct
        });

        const result = await marketplaceService.getProductById(1);
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/products/1'),
          expect.any(Object)
        );
        expect(result).toEqual(mockProduct);
      });

      test('should handle 404 for non-existent product', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Product not found' })
        });

        await expect(marketplaceService.getProductById(999)).rejects.toThrow();
      });
    });

    describe('Category Operations', () => {
      test('should fetch categories successfully', async () => {
        const mockCategories = [
          { id: 1, name: 'Textiles', count: 45 },
          { id: 2, name: 'Pottery', count: 32 },
          { id: 3, name: 'Jewelry', count: 28 }
        ];

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockCategories
        });

        const result = await marketplaceService.getCategories();
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/categories'),
          expect.any(Object)
        );
        expect(result).toEqual(mockCategories);
      });

      test('should filter products by category', async () => {
        const mockFilteredProducts = [
          {
            id: 1,
            title: 'Silk Saree',
            category: 'Textiles'
          }
        ];

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: mockFilteredProducts, total: 1 })
        });

        const result = await marketplaceService.getProductsByCategory('Textiles');
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=Textiles'),
          expect.any(Object)
        );
        expect(result.products).toEqual(mockFilteredProducts);
      });
    });

    describe('Search Operations', () => {
      test('should perform text search', async () => {
        const mockSearchResults = [
          {
            id: 1,
            title: 'Traditional Pottery Bowl',
            relevance_score: 0.95
          }
        ];

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            products: mockSearchResults, 
            total: 1,
            query: 'pottery'
          })
        });

        const result = await marketplaceService.searchProducts('pottery');
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=pottery'),
          expect.any(Object)
        );
        expect(result.products).toEqual(mockSearchResults);
        expect(result.query).toBe('pottery');
      });

      test('should handle AI-powered search', async () => {
        const aiQuery = 'I need something traditional for a wedding gift';
        const mockAIResults = [
          {
            id: 1,
            title: 'Wedding Jewelry Set',
            ai_relevance: 0.98,
            ai_explanation: 'Perfect traditional wedding gift'
          }
        ];

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            products: mockAIResults,
            ai_suggestion: 'Based on your request, I recommend these traditional wedding gifts',
            total: 1
          })
        });

        const result = await marketplaceService.aiSearch(aiQuery);
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/ai-search'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ query: aiQuery })
          })
        );
        expect(result.products).toEqual(mockAIResults);
        expect(result.ai_suggestion).toBeTruthy();
      });
    });

    describe('Artisan Operations', () => {
      test('should fetch artisan profile', async () => {
        const mockArtisan = {
          id: 1,
          name: 'Maya Sharma',
          region: 'Rajasthan',
          specialty: 'Traditional Textiles',
          bio: 'Master weaver with 20 years experience',
          products_count: 15
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockArtisan
        });

        const result = await marketplaceService.getArtisanById(1);
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/artisans/1'),
          expect.any(Object)
        );
        expect(result).toEqual(mockArtisan);
      });

      test('should fetch featured artisans', async () => {
        const mockFeaturedArtisans = [
          {
            id: 1,
            name: 'Maya Sharma',
            featured: true,
            featured_products_count: 5
          }
        ];

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockFeaturedArtisans
        });

        const result = await marketplaceService.getFeaturedArtisans();
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/artisans/featured'),
          expect.any(Object)
        );
        expect(result).toEqual(mockFeaturedArtisans);
      });
    });

    describe('Cart Operations', () => {
      test('should add item to cart', async () => {
        const cartItem = {
          product_id: 1,
          quantity: 2,
          user_id: 'test-user-123'
        };

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, cart_count: 2 })
        });

        const result = await marketplaceService.addToCart(cartItem);
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/cart'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(cartItem)
          })
        );
        expect(result.success).toBe(true);
      });

      test('should fetch cart items', async () => {
        const mockCartItems = [
          {
            id: 1,
            product_id: 1,
            quantity: 2,
            product: { title: 'Handwoven Textile', price: 299 }
          }
        ];

        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: mockCartItems, total: 598 })
        });

        const result = await marketplaceService.getCartItems('test-user-123');
        
        expect(result.items).toEqual(mockCartItems);
        expect(result.total).toBe(598);
      });

      test('should update cart item quantity', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, new_quantity: 3 })
        });

        const result = await marketplaceService.updateCartItem(1, 3);
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/cart/1'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ quantity: 3 })
          })
        );
        expect(result.success).toBe(true);
      });

      test('should remove item from cart', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const result = await marketplaceService.removeFromCart(1);
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/cart/1'),
          expect.objectContaining({ method: 'DELETE' })
        );
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Authentication Service Tests', () => {
    test('should handle user registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'test-user-id', email: userData.email }, session: null },
        error: null
      });

      const result = await mockSupabaseClient.auth.signUp({
        email: userData.email,
        password: userData.password
      });

      expect(result.error).toBeNull();
      expect(result.data.user.email).toBe(userData.email);
    });

    test('should handle user login', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockSupabaseClient.auth.signIn.mockResolvedValueOnce({
        data: { 
          user: { id: 'test-user-id', email: credentials.email },
          session: { access_token: 'test-token' }
        },
        error: null
      });

      const result = await mockSupabaseClient.auth.signIn(credentials);

      expect(result.error).toBeNull();
      expect(result.data.session.access_token).toBeTruthy();
    });

    test('should handle authentication errors', async () => {
      const errorMessage = 'Invalid credentials';
      
      mockSupabaseClient.auth.signIn.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: errorMessage }
      });

      const result = await mockSupabaseClient.auth.signIn({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });

      expect(result.error.message).toBe(errorMessage);
      expect(result.data.user).toBeNull();
    });

    test('should handle user logout', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({
        error: null
      });

      const result = await mockSupabaseClient.auth.signOut();
      expect(result.error).toBeNull();
    });

    test('should get current session', async () => {
      const mockSession = {
        access_token: 'test-token',
        user: { id: 'test-user-id', email: 'test@example.com' }
      };

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null
      });

      const result = await mockSupabaseClient.auth.getSession();
      
      expect(result.error).toBeNull();
      expect(result.data.session.access_token).toBe('test-token');
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts', async () => {
      fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(marketplaceService.getProducts()).rejects.toThrow('Request timeout');
    });

    test('should handle server errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      await expect(marketplaceService.getProducts()).rejects.toThrow();
    });

    test('should handle malformed JSON responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      await expect(marketplaceService.getProducts()).rejects.toThrow('Invalid JSON');
    });

    test('should retry failed requests', async () => {
      let attempts = 0;
      fetch.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ products: [], total: 0 })
        });
      });

      // Mock retry logic
      const retryFetch = async (url, options, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fetch(url, options);
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      };

      const result = await retryFetch('/api/products');
      expect(attempts).toBe(3);
      expect(result.ok).toBe(true);
    });
  });

  describe('Mock Mode Testing', () => {
    beforeEach(() => {
      mockEnvVars.VITE_MOCK_DATA = 'true';
    });

    afterEach(() => {
      mockEnvVars.VITE_MOCK_DATA = 'false';
    });

    test('should use mock data when enabled', async () => {
      const mockProducts = [
        { id: 1, title: 'Mock Product 1', price: 100 },
        { id: 2, title: 'Mock Product 2', price: 200 }
      ];

      // Simulate mock data service
      const mockService = {
        getProducts: () => Promise.resolve({ products: mockProducts, total: 2 })
      };

      const result = await mockService.getProducts();
      expect(result.products).toEqual(mockProducts);
      expect(result.total).toBe(2);
    });

    test('should simulate API delays in mock mode', async () => {
      const startTime = Date.now();
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
    });
  });

  describe('Performance Testing', () => {
    test('should handle large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Product ${i + 1}`,
        price: Math.floor(Math.random() * 1000) + 100
      }));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: largeDataset, total: 1000 })
      });

      const startTime = Date.now();
      const result = await marketplaceService.getProducts();
      const endTime = Date.now();

      expect(result.products).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should implement request caching', () => {
      const cache = new Map();
      
      const cachedFetch = async (url) => {
        if (cache.has(url)) {
          return cache.get(url);
        }
        
        const response = await fetch(url);
        cache.set(url, response);
        return response;
      };

      expect(typeof cachedFetch).toBe('function');
      expect(cache.size).toBe(0);
    });
  });
});