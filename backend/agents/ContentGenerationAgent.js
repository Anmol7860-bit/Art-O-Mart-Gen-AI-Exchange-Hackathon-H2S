import { z } from 'zod';
import BaseAgent from './BaseAgent.js';
import { supabaseAdmin } from '../config/database.js';

// Input/Output schemas for validation
const productDescriptionSchema = z.object({
  main: z.object({
    title: z.string(),
    shortDescription: z.string().max(200),
    longDescription: z.string(),
    highlights: z.array(z.string()),
    materials: z.array(z.string()),
    dimensions: z.string().optional(),
    care: z.string().optional()
  }),
  cultural: z.object({
    significance: z.string(),
    technique: z.string(),
    history: z.string(),
    region: z.string()
  }),
  technical: z.object({
    specifications: z.array(z.object({
      name: z.string(),
      value: z.string()
    })),
    keywords: z.array(z.string()),
    categoryTags: z.array(z.string())
  }),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string())
  })
});

const artisanStorySchema = z.object({
  biography: z.object({
    introduction: z.string(),
    background: z.string(),
    journey: z.string(),
    philosophy: z.string()
  }),
  craft: z.object({
    tradition: z.string(),
    techniques: z.array(z.object({
      name: z.string(),
      description: z.string(),
      significance: z.string()
    })),
    materials: z.array(z.object({
      name: z.string(),
      description: z.string(),
      sourcing: z.string()
    }))
  }),
  achievements: z.array(z.object({
    title: z.string(),
    description: z.string(),
    year: z.string().optional()
  })),
  impact: z.object({
    community: z.string(),
    cultural: z.string(),
    environmental: z.string().optional()
  }),
  media: z.object({
    quotes: z.array(z.string()),
    highlightImages: z.array(z.object({
      url: z.string(),
      caption: z.string()
    })).optional()
  })
});

const marketingContentSchema = z.object({
  socialMedia: z.array(z.object({
    platform: z.enum(['instagram', 'facebook', 'twitter', 'pinterest']),
    content: z.object({
      text: z.string(),
      hashtags: z.array(z.string()),
      callToAction: z.string()
    }),
    imagePrompts: z.array(z.string()).optional()
  })),
  email: z.object({
    subject: z.string(),
    preheader: z.string(),
    body: z.string(),
    sections: z.array(z.object({
      type: z.enum(['header', 'product', 'story', 'cta']),
      content: z.string()
    }))
  }),
  blog: z.object({
    title: z.string(),
    excerpt: z.string(),
    content: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      content: z.string(),
      imagePrompt: z.string().optional()
    })),
    conclusion: z.string(),
    callToAction: z.string()
  })
});

const seoOptimizationSchema = z.object({
  analysis: z.object({
    currentScore: z.number(),
    improvements: z.array(z.object({
      type: z.string(),
      suggestion: z.string(),
      priority: z.enum(['high', 'medium', 'low'])
    }))
  }),
  optimized: z.object({
    title: z.string(),
    description: z.string(),
    headers: z.array(z.object({
      level: z.number(),
      text: z.string()
    })),
    content: z.string(),
    keywords: z.array(z.object({
      word: z.string(),
      density: z.number(),
      placement: z.array(z.string())
    }))
  }),
  technical: z.object({
    canonicalUrl: z.string().optional(),
    structuredData: z.record(z.any()),
    alternates: z.array(z.object({
      lang: z.string(),
      url: z.string()
    })).optional()
  })
});

export class ContentGenerationAgent extends BaseAgent {
  constructor() {
    super('contentGeneration');
  }

  /**
   * Generate compelling product descriptions
   */
  async generateProductDescription(productDetails, targetAudience) {
    try {
      // Define function for structured response
      const functions = [{
        name: 'generateDescription',
        description: 'Generate comprehensive product description with cultural context',
        parameters: productDescriptionSchema
      }];

      // Generate description using AI
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            productDetails,
            targetAudience,
            instruction: 'Create a compelling product description that highlights craftsmanship and cultural significance.'
          })
        }
      ];

      const description = await this.generateStructuredResponse(messages, functions);
      return productDescriptionSchema.parse(description);
    } catch (error) {
      this.logger.error('Error in generateProductDescription:', error);
      throw error;
    }
  }

  /**
   * Create engaging artisan biographies
   */
  async createArtisanStory(artisanProfile, achievements) {
    try {
      // Define function for structured response
      const functions = [{
        name: 'generateArtisanStory',
        description: 'Create engaging artisan biography with cultural context',
        parameters: artisanStorySchema
      }];

      // Generate story using AI
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            artisanProfile,
            achievements,
            instruction: 'Create an engaging artisan biography that highlights their journey, craft, and cultural impact.'
          })
        }
      ];

      const story = await this.generateStructuredResponse(messages, functions);
      return artisanStorySchema.parse(story);
    } catch (error) {
      this.logger.error('Error in createArtisanStory:', error);
      throw error;
    }
  }

  /**
   * Generate marketing content across channels
   */
  async generateMarketingContent(campaign, products, audience) {
    try {
      // Define function for structured response
      const functions = [{
        name: 'generateMarketingContent',
        description: 'Generate multi-channel marketing content',
        parameters: marketingContentSchema
      }];

      // Generate content using AI
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            campaign,
            products,
            audience,
            instruction: 'Create marketing content for various channels while maintaining cultural authenticity.'
          })
        }
      ];

      const content = await this.generateStructuredResponse(messages, functions);
      return marketingContentSchema.parse(content);
    } catch (error) {
      this.logger.error('Error in generateMarketingContent:', error);
      throw error;
    }
  }

  /**
   * Optimize content for SEO
   */
  async optimizeForSEO(content, keywords, platform) {
    try {
      // Define function for structured response
      const functions = [{
        name: 'optimizeContent',
        description: 'Optimize content for SEO while maintaining readability',
        parameters: seoOptimizationSchema
      }];

      // Generate optimizations using AI
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            content,
            keywords,
            platform,
            instruction: 'Optimize content for search engines while preserving cultural authenticity and readability.'
          })
        }
      ];

      const optimized = await this.generateStructuredResponse(messages, functions);
      return seoOptimizationSchema.parse(optimized);
    } catch (error) {
      this.logger.error('Error in optimizeForSEO:', error);
      throw error;
    }
  }
}

export default ContentGenerationAgent;