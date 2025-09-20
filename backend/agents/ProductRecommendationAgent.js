import BaseAgent from './BaseAgent.js';
import { z } from 'zod';

// Schema for product recommendations
const ProductRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    artisanName: z.string(),
    price: z.number(),
    rating: z.number(),
    matchScore: z.number(),
    reason: z.string(),
    culturalInsight: z.string().optional()
  })),
  searchCriteria: z.object({
    budget: z.object({
      min: z.number(),
      max: z.number()
    }).optional(),
    categories: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional()
  }),
  summary: z.string()
});

export class ProductRecommendationAgent extends BaseAgent {
  constructor() {
    super('content-optimizer');
  }

  /**
   * Get personalized product recommendations
   */
  async getRecommendations(userQuery, preferences = {}) {
    try {
      // Fetch available products from database
      const products = await this.fetchProducts(preferences);
      
      // Prepare context for AI
      const context = {
        availableProducts: products.slice(0, 20), // Limit to prevent token overflow
        userPreferences: preferences,
        totalProducts: products.length
      };

      // Define function for structured output
      const functions = [
        {
          name: 'recommend_products',
          description: 'Recommend products based on user query and preferences',
          parameters: {
            type: 'object',
            properties: {
              recommendations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string' },
                    productName: { type: 'string' },
                    artisanName: { type: 'string' },
                    price: { type: 'number' },
                    rating: { type: 'number' },
                    matchScore: { type: 'number', description: 'Score from 0-100 indicating match quality' },
                    reason: { type: 'string', description: 'Why this product matches the query' },
                    culturalInsight: { type: 'string', description: 'Cultural or historical insight about the product' }
                  },
                  required: ['productId', 'productName', 'artisanName', 'price', 'rating', 'matchScore', 'reason']
                }
              },
              searchCriteria: {
                type: 'object',
                properties: {
                  budget: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' }
                    }
                  },
                  categories: { type: 'array', items: { type: 'string' } },
                  regions: { type: 'array', items: { type: 'string' } },
                  materials: { type: 'array', items: { type: 'string' } }
                }
              },
              summary: { type: 'string', description: 'Brief summary of recommendations' }
            },
            required: ['recommendations', 'summary']
          }
        }
      ];

      const messages = [
        {
          role: 'user',
          content: `User Query: "${userQuery}"
          
          Available Products: ${JSON.stringify(context.availableProducts)}
          
          User Preferences: ${JSON.stringify(preferences)}
          
          Please recommend the most suitable products based on the query and preferences. Include cultural insights where relevant.`
        }
      ];

      const response = await this.generateStructuredResponse(messages, functions, {
        functionCall: { name: 'recommend_products' }
      });

      // Validate response against schema
      const validatedResponse = ProductRecommendationSchema.parse(response);
      
      // Enrich with additional product details
      const enrichedRecommendations = await this.enrichRecommendations(validatedResponse.recommendations);
      
      return {
        success: true,
        data: {
          ...validatedResponse,
          recommendations: enrichedRecommendations
        }
      };
    } catch (error) {
      this.logger.error('Error in product recommendations:', error);
      throw error;
    }
  }

  /**
   * Fetch products from database based on filters
   */
  async fetchProducts(filters = {}) {
    try {
      let query = this.supabase
        .from('products')
        .select(`
          *,
          artisans (
            id,
            name,
            location,
            rating,
            specialization
          ),
          product_images (
            image_url,
            is_primary
          )
        `)
        .eq('is_active', true)
        .order('rating', { ascending: false });

      // Apply budget filter
      if (filters.budgetMin) {
        query = query.gte('price', filters.budgetMin);
      }
      if (filters.budgetMax) {
        query = query.lte('price', filters.budgetMax);
      }

      // Apply category filter
      if (filters.categories && filters.categories.length > 0) {
        query = query.in('category', filters.categories);
      }

      // Apply region filter
      if (filters.regions && filters.regions.length > 0) {
        query = query.in('artisans.location', filters.regions);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.logger.error('Error fetching products:', error);
      return [];
    }
  }

  /**
   * Enrich recommendations with additional details
   */
  async enrichRecommendations(recommendations) {
    try {
      const enriched = await Promise.all(
        recommendations.map(async (rec) => {
          // Fetch full product details
          const { data: product } = await this.supabase
            .from('products')
            .select(`
              *,
              artisans (
                id,
                name,
                location,
                bio,
                rating,
                years_experience,
                total_products,
                specialization
              ),
              product_images (
                image_url,
                is_primary
              ),
              product_reviews (
                rating,
                comment,
                created_at
              )
            `)
            .eq('id', rec.productId)
            .single();

          if (product) {
            return {
              ...rec,
              fullDetails: product,
              images: product.product_images || [],
              artisan: product.artisans,
              reviews: product.product_reviews || []
            };
          }
          return rec;
        })
      );
      return enriched;
    } catch (error) {
      this.logger.error('Error enriching recommendations:', error);
      return recommendations;
    }
  }

  /**
   * Get similar products based on a product ID
   */
  async getSimilarProducts(productId, limit = 5) {
    try {
      // Fetch the reference product
      const { data: referenceProduct } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (!referenceProduct) {
        throw new Error('Product not found');
      }

      // Find similar products
      const { data: similarProducts } = await this.supabase
        .from('products')
        .select(`
          *,
          artisans (
            name,
            location
          )
        `)
        .eq('category', referenceProduct.category)
        .neq('id', productId)
        .limit(limit);

      // Use AI to rank similarity
      const messages = [
        {
          role: 'user',
          content: `Reference Product: ${JSON.stringify(referenceProduct)}
          
          Potential Similar Products: ${JSON.stringify(similarProducts)}
          
          Rank these products by similarity to the reference product and provide reasons.`
        }
      ];

      const aiResponse = await this.generateResponse(messages);
      
      return {
        success: true,
        data: {
          referenceProduct,
          similarProducts,
          aiAnalysis: aiResponse
        }
      };
    } catch (error) {
      this.logger.error('Error finding similar products:', error);
      throw error;
    }
  }

  /**
   * Generate product search query from natural language
   */
  async parseSearchQuery(naturalQuery) {
    try {
      const functions = [
        {
          name: 'parse_search',
          description: 'Parse natural language search into structured filters',
          parameters: {
            type: 'object',
            properties: {
              keywords: { type: 'array', items: { type: 'string' } },
              budgetMin: { type: 'number' },
              budgetMax: { type: 'number' },
              categories: { type: 'array', items: { type: 'string' } },
              regions: { type: 'array', items: { type: 'string' } },
              materials: { type: 'array', items: { type: 'string' } },
              artisanNames: { type: 'array', items: { type: 'string' } },
              priceSort: { type: 'string', enum: ['asc', 'desc'] },
              ratingMin: { type: 'number' }
            }
          }
        }
      ];

      const messages = [
        {
          role: 'user',
          content: `Parse this search query into structured filters: "${naturalQuery}"
          
          Available categories: Textiles, Pottery, Jewelry, Paintings, Woodcraft, Metalwork, Leather
          Available regions: Rajasthan, Kerala, West Bengal, Gujarat, Kashmir, Tamil Nadu, Uttar Pradesh`
        }
      ];

      const parsed = await this.generateStructuredResponse(messages, functions, {
        functionCall: { name: 'parse_search' }
      });

      return {
        success: true,
        data: parsed
      };
    } catch (error) {
      this.logger.error('Error parsing search query:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default ProductRecommendationAgent;