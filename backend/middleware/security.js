// Security middleware for Express.js backend
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const hpp = require('hpp');
const xss = require('xss');

// Security configuration
const securityConfig = {
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: true,
    // Skip failed requests
    skipFailedRequests: false
  },
  
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://artomart.com', 'https://www.artomart.com', 'https://admin.artomart.com']
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  },

  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        scriptSrc: [
          "'self'",
          process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : '',
          "https://www.google-analytics.com",
          "https://www.googletagmanager.com"
        ].filter(Boolean),
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:"
        ],
        mediaSrc: ["'self'", "https:"],
        connectSrc: [
          "'self'",
          "https://api.artomart.com",
          "wss://api.artomart.com",
          "https://*.supabase.co"
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }
};

// Initialize security middleware
function initializeSecurity(app) {
  console.log('🛡️ Initializing security middleware...');
  
  // Basic security headers
  app.use(helmet(securityConfig.helmet));
  
  // Compression middleware
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
  
  // CORS configuration
  app.use(cors(securityConfig.cors));
  
  // Parameter pollution protection
  app.use(hpp());
  
  // Global rate limiting
  const globalLimiter = rateLimit({
    ...securityConfig.rateLimiting,
    keyGenerator: (req) => {
      // Use forwarded IP if behind proxy
      return req.ip || req.connection.remoteAddress;
    }
  });
  app.use('/api/', globalLimiter);
  
  // Stricter rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
    message: {
      error: 'Too many authentication attempts',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
  });
  app.use('/api/auth/', authLimiter);
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);
  
  // API-specific rate limiting
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute for API endpoints
    message: {
      error: 'API rate limit exceeded',
      retryAfter: '1 minute'
    }
  });
  app.use('/api/products/', apiLimiter);
  app.use('/api/orders/', apiLimiter);
  app.use('/api/users/', apiLimiter);
  
  console.log('✅ Security middleware initialized successfully');
}

// Input sanitization middleware
function sanitizeInput(req, res, next) {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

// Recursive object sanitization
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? xss(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = xss(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }
  
  return sanitized;
}

// Request logging middleware
function requestLogger(req, res, next) {
  const start = Date.now();
  const originalSend = res.send;
  
  // Override res.send to capture response
  res.send = function(data) {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      size: data ? Buffer.byteLength(data, 'utf8') : 0
    };
    
    // Log request (you can send this to your monitoring service)
    if (process.env.NODE_ENV !== 'test') {
      console.log('📊 API Request:', JSON.stringify(logData));
    }
    
    // Call original send
    originalSend.call(this, data);
  };
  
  next();
}

// Security headers middleware
function securityHeaders(req, res, next) {
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Cache control for sensitive endpoints
  if (req.path.includes('/api/auth/') || req.path.includes('/api/admin/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

// IP whitelisting middleware for admin endpoints
function adminIPWhitelist(allowedIPs = []) {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Skip in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    // Check if IP is in whitelist
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      console.warn(`🚫 Unauthorized admin access attempt from IP: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource'
      });
    }
    
    next();
  };
}

// CSRF protection middleware
function csrfProtection(req, res, next) {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token'
    });
  }
  
  next();
}

// File upload security
function fileUploadSecurity(options = {}) {
  const {
    maxFileSize = 5 * 1024 * 1024, // 5MB
    allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFiles = 10
  } = options;
  
  return (req, res, next) => {
    // Check if files are present
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }
    
    const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    
    // Check file count
    if (files.length > maxFiles) {
      return res.status(400).json({
        error: 'Too many files',
        message: `Maximum ${maxFiles} files allowed`
      });
    }
    
    // Validate each file
    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        return res.status(400).json({
          error: 'File too large',
          message: `File size must be less than ${maxFileSize / 1024 / 1024}MB`
        });
      }
      
      // Check MIME type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type',
          message: `Allowed file types: ${allowedMimeTypes.join(', ')}`
        });
      }
      
      // Basic filename validation
      if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
        return res.status(400).json({
          error: 'Invalid filename',
          message: 'Filename contains invalid characters'
        });
      }
    }
    
    next();
  };
}

// Error handling middleware
function securityErrorHandler(err, req, res, next) {
  // Log security-related errors
  if (err.type === 'security') {
    console.error('🔒 Security Error:', {
      error: err.message,
      ip: req.ip,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
  
  next(err);
}

// Health check endpoint with security info
function healthCheckEndpoint(req, res) {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    security: {
      rateLimitingEnabled: true,
      corsConfigured: true,
      securityHeadersEnabled: true,
      sanitizationEnabled: true
    }
  };
  
  res.json(healthData);
}

module.exports = {
  initializeSecurity,
  sanitizeInput,
  requestLogger,
  securityHeaders,
  adminIPWhitelist,
  csrfProtection,
  fileUploadSecurity,
  securityErrorHandler,
  healthCheckEndpoint,
  securityConfig
};