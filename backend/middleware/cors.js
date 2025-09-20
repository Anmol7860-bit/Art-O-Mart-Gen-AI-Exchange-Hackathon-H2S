/**
 * Advanced CORS Middleware
 * 
 * Production-ready CORS configuration with environment-based origins,
 * credential handling, and comprehensive security headers.
 */

import cors from 'cors';

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins() {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  
  switch (NODE_ENV) {
    case 'production':
      return [
        'https://art-o-mart.com',
        'https://www.art-o-mart.com',
        'https://artomart.vercel.app',
        'https://artomart.netlify.app',
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
      ];
      
    case 'staging':
      return [
        'https://staging.art-o-mart.com',
        'https://dev.art-o-mart.com',
        'https://artomart-staging.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
      ];
      
    case 'development':
    default:
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173',
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
      ];
  }
}

/**
 * Dynamic origin checker
 */
function checkOrigin(origin, callback) {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = !origin || allowedOrigins.includes(origin);
  
  if (isAllowed) {
    callback(null, true);
  } else {
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  }
}

/**
 * CORS configuration
 */
const corsOptions = {
  origin: checkOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-API-Key',
    'X-Client-Version',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
    'X-Request-ID'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

/**
 * Create CORS middleware
 */
const corsMiddleware = cors(corsOptions);

/**
 * Enhanced CORS middleware with additional security headers
 */
function enhancedCorsMiddleware(req, res, next) {
  // Apply CORS
  corsMiddleware(req, res, (err) => {
    if (err) {
      return next(err);
    }
    
    // Add additional security headers
    addSecurityHeaders(res);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
}

/**
 * Add comprehensive security headers
 */
function addSecurityHeaders(res) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.supabase.co wss://api.supabase.co https://generativelanguage.googleapis.com",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // Permissions Policy (formerly Feature Policy)
  const permissionsPolicy = [
    'camera=(),',
    'microphone=(),',
    'geolocation=(),',
    'payment=(),',
    'usb=(),',
    'magnetometer=(),',
    'gyroscope=(),',
    'accelerometer=()'
  ].join(' ');
  
  res.setHeader('Permissions-Policy', permissionsPolicy);
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
}

/**
 * CORS middleware for WebSocket
 */
function corsWebSocketMiddleware(origin) {
  const allowedOrigins = getAllowedOrigins();
  return !origin || allowedOrigins.includes(origin);
}

/**
 * CORS configuration for file uploads
 */
const fileUploadCorsOptions = {
  ...corsOptions,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    ...corsOptions.allowedHeaders,
    'Content-Length',
    'Content-Range',
    'X-Upload-Content-Type',
    'X-Upload-Content-Length'
  ]
};

const fileUploadCorsMiddleware = cors(fileUploadCorsOptions);

/**
 * CORS configuration for API routes
 */
const apiCorsOptions = {
  ...corsOptions,
  allowedHeaders: [
    ...corsOptions.allowedHeaders,
    'X-API-Version',
    'X-Client-ID',
    'X-User-Agent'
  ],
  exposedHeaders: [
    ...corsOptions.exposedHeaders,
    'X-API-Version',
    'X-Server-Time',
    'X-Response-Time'
  ]
};

const apiCorsMiddleware = cors(apiCorsOptions);

/**
 * Development-only CORS middleware (allows all origins)
 */
const developmentCorsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: '*',
  exposedHeaders: '*',
  preflightContinue: false,
  optionsSuccessStatus: 200
};

const developmentCorsMiddleware = cors(developmentCorsOptions);

/**
 * Get appropriate CORS middleware based on environment and route
 */
function getCorsMiddleware(type = 'default') {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  
  // In development, use permissive CORS
  if (NODE_ENV === 'development' && process.env.STRICT_CORS !== 'true') {
    return developmentCorsMiddleware;
  }
  
  // In production/staging, use appropriate middleware based on type
  switch (type) {
    case 'api':
      return apiCorsMiddleware;
    case 'upload':
      return fileUploadCorsMiddleware;
    case 'websocket':
      return corsWebSocketMiddleware;
    case 'enhanced':
      return enhancedCorsMiddleware;
    default:
      return corsMiddleware;
  }
}

/**
 * Logging middleware for CORS debugging
 */
function corsLoggingMiddleware(req, res, next) {
  const origin = req.get('Origin');
  const method = req.method;
  
  if (origin) {
    console.log(`CORS Request: ${method} from ${origin}`);
  }
  
  next();
}

/**
 * Rate limiting for preflight requests
 */
function preflightRateLimiting(req, res, next) {
  if (req.method === 'OPTIONS') {
    // Cache preflight response
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }
  next();
}

export {
  corsMiddleware,
  enhancedCorsMiddleware,
  apiCorsMiddleware,
  fileUploadCorsMiddleware,
  developmentCorsMiddleware,
  corsWebSocketMiddleware,
  getCorsMiddleware,
  corsLoggingMiddleware,
  preflightRateLimiting,
  getAllowedOrigins,
  addSecurityHeaders
};

export default enhancedCorsMiddleware;