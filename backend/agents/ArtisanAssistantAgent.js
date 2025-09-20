import { z } from 'zod';
import BaseAgent from './BaseAgent.js';
import { supabaseAdmin } from '../config/database.js';

// Input/Output schemas for validation
const optimizationGoalsSchema = z.object({
  title: z.boolean().optional(),
  description: z.boolean().optional(),
  tags: z.boolean().optional(),
  pricing: z.boolean().optional(),
  images: z.boolean().optional()
});

const listingOptimizationSchema = z.object({
  title: z.object({
    current: z.string(),
    suggestion: z.string(),
    reason: z.string()
  }).optional(),
  description: z.object({
    current: z.string(),
    suggestion: z.string(),
    reason: z.string()
  }).optional(),
  tags: z.object({
    current: z.array(z.string()),
    suggestion: z.array(z.string()),
    reason: z.string()
  }).optional(),
  pricing: z.object({
    current: z.number(),
    suggestion: z.number(),
    reason: z.string()
  }).optional(),
  images: z.object({
    current: z.array(z.string()),
    suggestions: z.array(z.string()),
    reason: z.string()
  }).optional()
});

const pricingInputSchema = z.object({
  productData: z.object({
    title: z.string(),
    description: z.string(),
    materials: z.array(z.string()),
    productionTime: z.number(),
    craftingComplexity: z.string()
  }),
  marketContext: z.object({
    category: z.string(),
    region: z.string(),
    seasonality: z.string().optional(),
    competitorPrices: z.array(z.number()).optional()
  })
});

const pricingRecommendationSchema = z.object({
  basePrice: z.number(),
  recommendedPrice: z.number(),
  priceRange: z.object({
    min: z.number(),
    max: z.number()
  }),
  rationale: z.string(),
  factors: z.array(z.object({
    name: z.string(),
    impact: z.string(),
    description: z.string()
  })),
  strategies: z.array(z.object({
    name: z.string(),
    description: z.string(),
    expectedImpact: z.string()
  }))
});

const businessInsightsSchema = z.object({
  salesTrends: z.object({
    overall: z.string(),
    byProduct: z.array(z.object({
      productId: z.string(),
      trend: z.string(),
      recommendation: z.string()
    }))
  }),
  customerFeedback: z.object({
    summary: z.string(),
    topPositives: z.array(z.string()),
    topConcerns: z.array(z.string()),
    actionItems: z.array(z.string())
  }),
  marketOpportunities: z.array(z.object({
    opportunity: z.string(),
    rationale: z.string(),
    suggestedActions: z.array(z.string())
  })),
  growthRecommendations: z.array(z.object({
    area: z.string(),
    recommendation: z.string(),
    impact: z.string(),
    timeframe: z.string()
  }))
});

const listingContentSchema = z.object({
  title: z.string(),
  description: z.string(),
  shortDescription: z.string(),
  tags: z.array(z.string()),
  culturalStory: z.string(),
  specifications: z.array(z.object({
    name: z.string(),
    value: z.string()
  })),
  seoMetadata: z.object({
    metaTitle: z.string(),
    metaDescription: z.string(),
    focusKeywords: z.array(z.string())
  })
});

export class ArtisanAssistantAgent extends BaseAgent {
  constructor() {
    super('market-analyzer');
  }

  /**
   * Analyzes and optimizes product listings
   */
  async optimizeListing(productId, optimizationGoals) {
    try {
      // Validate input
      const goals = optimizationGoalsSchema.parse(optimizationGoals);

      // Fetch product data
      const { data: product, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      if (!product) throw new Error('Product not found');

      // Define function for structured response
      const functions = [{
        name: 'generateOptimizations',
        description: 'Generate optimization suggestions for product listing',
        parameters: listingOptimizationSchema
      }];

      // Generate optimizations using AI
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            product,
            goals,
            instruction: 'Analyze the product listing and provide optimization suggestions based on the specified goals.'
          })
        }
      ];

      const optimizations = await this.generateStructuredResponse(messages, functions);
      return listingOptimizationSchema.parse(optimizations);
    } catch (error) {
      this.logger.error('Error in optimizeListing:', error);
      throw error;
    }
  }

  /**
   * Provides intelligent pricing recommendations
   */
  async suggestPricing(productData, marketContext) {
    try {
      // Validate input
      const input = pricingInputSchema.parse({ productData, marketContext });

      // Define function for structured response
      const functions = [{
        name: 'generatePricingRecommendation',
        description: 'Generate pricing recommendations based on product and market data',
        parameters: pricingRecommendationSchema
      }];

      // Generate pricing recommendations using AI
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            ...input,
            instruction: 'Analyze the product and market data to provide pricing recommendations.'
          })
        }
      ];

      const recommendation = await this.generateStructuredResponse(messages, functions);
      return pricingRecommendationSchema.parse(recommendation);
    } catch (error) {
      this.logger.error('Error in suggestPricing:', error);
      throw error;
    }
  }

  /**
   * Generates comprehensive business insights
   */
  async getBusinessInsights(artisanId, timeframe) {
    try {
      // Fetch relevant data
      const { data: orders } = await this.supabase
        .from('orders')
        .select('*')
        .eq('artisan_id', artisanId)
        .gte('created_at', timeframe.start)
        .lte('created_at', timeframe.end);

      const { data: reviews } = await this.supabase
        .from('reviews')
        .select('*')
        .eq('artisan_id', artisanId)
        .gte('created_at', timeframe.start)
        .lte('created_at', timeframe.end);

      const { data: products } = await this.supabase
        .from('products')
        .select('*')
        .eq('artisan_id', artisanId);

      // Define function for structured response
      const functions = [{
        name: 'generateBusinessInsights',
        description: 'Generate business insights based on order, review, and product data',
        parameters: businessInsightsSchema
      }];

      // Generate insights using AI
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            orders,
            reviews,
            products,
            timeframe,
            instruction: 'Analyze the business data and provide comprehensive insights and recommendations.'
          })
        }
      ];

      const insights = await this.generateStructuredResponse(messages, functions);
      return businessInsightsSchema.parse(insights);
    } catch (error) {
      this.logger.error('Error in getBusinessInsights:', error);
      throw error;
    }
  }

  /**
   * Creates optimized product listings with cultural context
   */
  async generateListingContent(productDetails, culturalContext) {
    try {
      // Define function for structured response
      const functions = [{
        name: 'generateListingContent',
        description: 'Generate optimized product listing content with cultural context',
        parameters: listingContentSchema
      }];

      // Generate content using AI
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            productDetails,
            culturalContext,
            instruction: 'Create optimized product listing content that emphasizes cultural authenticity and craftsmanship.'
          })
        }
      ];

      const content = await this.generateStructuredResponse(messages, functions);
      return listingContentSchema.parse(content);
    } catch (error) {
      this.logger.error('Error in generateListingContent:', error);
      throw error;
    }
  }
}

export default ArtisanAssistantAgent;