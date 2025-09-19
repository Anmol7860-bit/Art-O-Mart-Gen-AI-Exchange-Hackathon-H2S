import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { supabaseAdmin } from '../config/database.js';

// Input validation schemas
const tokenSchema = z.string().min(1, 'Authorization token is required');

const userRoles = ['customer', 'artisan', 'admin'];
const userRoleSchema = z.enum(userRoles);

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});

/**
 * Authentication middleware that validates JWT tokens
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No valid authorization token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    tokenSchema.parse(token);

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: error?.message || 'Invalid token'
      });
    }

    // Fetch user profile with role information
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        error: 'Profile not found',
        message: 'User profile is missing'
      });
    }

    // Attach user and profile to request
    req.user = user;
    req.userProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.userProfile) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'No user profile found'
        });
      }

      const userRole = userRoleSchema.parse(req.userProfile.role);
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Request validation middleware factory
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Attach validated data to request
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};

/**
 * Rate limiting middleware configurations
 */
export const rateLimits = {
  // General API endpoints
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Too many requests',
      message: 'Please try again later'
    }
  }),

  // AI operations (more restricted)
  ai: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 requests per window
    message: {
      error: 'AI request limit exceeded',
      message: 'Please try again in an hour'
    }
  }),

  // Agent management operations
  agents: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 requests per window
    message: {
      error: 'Agent operation limit exceeded',
      message: 'Please try again in 5 minutes'
    }
  })
};

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }

  // Handle Supabase errors
  if (err?.message?.includes('Supabase')) {
    return res.status(503).json({
      error: 'Database error',
      message: 'Service temporarily unavailable'
    });
  }

  // Handle rate limit errors
  if (err?.message?.includes('rate limit')) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later'
    });
  }

  // Handle AI service errors
  if (err?.message?.includes('AI service')) {
    return res.status(503).json({
      error: 'AI service error',
      message: 'AI service temporarily unavailable'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// Export common schemas for reuse
export const schemas = {
  pagination: paginationSchema,
  userRole: userRoleSchema
};