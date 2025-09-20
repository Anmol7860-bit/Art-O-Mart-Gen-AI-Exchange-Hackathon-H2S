/**
 * Advanced Logging Middleware
 * 
 * Comprehensive logging solution with structured logging, performance monitoring,
 * error tracking, and security event logging.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';

// Winston logger setup
let winston;
try {
  winston = require('winston');
} catch (error) {
  console.warn('Winston not installed. Using console logging.');
}

/**
 * Logger Configuration
 */
class Logger {
  constructor() {
    this.setupWinstonLogger();
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.enablePerformanceLogging = process.env.ENABLE_PERFORMANCE_LOGGING !== 'false';
    this.enableSecurityLogging = process.env.ENABLE_SECURITY_LOGGING !== 'false';
  }

  setupWinstonLogger() {
    if (!winston) {
      this.logger = console;
      return;
    }

    const { combine, timestamp, colorize, printf, json, errors } = winston.format;

    // Custom format for console output
    const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaStr}`;
    });

    // Create Winston logger
    this.logger = winston.createLogger({
      level: this.logLevel,
      format: combine(
        errors({ stack: true }),
        timestamp(),
        json()
      ),
      defaultMeta: {
        service: 'art-o-mart-api',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: combine(
            colorize(),
            timestamp(),
            consoleFormat
          )
        }),
        // File transports for production
        ...(process.env.NODE_ENV === 'production' ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
          })
        ] : [])
      ]
    });
  }

  info(message, meta = {}) {
    if (winston && this.logger.info) {
      this.logger.info(message, meta);
    } else {
      console.log(`[INFO] ${message}`, meta);
    }
  }

  error(message, meta = {}) {
    if (winston && this.logger.error) {
      this.logger.error(message, meta);
    } else {
      console.error(`[ERROR] ${message}`, meta);
    }
  }

  warn(message, meta = {}) {
    if (winston && this.logger.warn) {
      this.logger.warn(message, meta);
    } else {
      console.warn(`[WARN] ${message}`, meta);
    }
  }

  debug(message, meta = {}) {
    if (winston && this.logger.debug) {
      this.logger.debug(message, meta);
    } else {
      console.log(`[DEBUG] ${message}`, meta);
    }
  }
}

// Global logger instance
const logger = new Logger();

/**
 * Request ID middleware - Adds unique ID to each request
 */
function requestIdMiddleware(req, res, next) {
  const requestId = req.get('X-Request-ID') || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Request logging middleware
 */
function requestLoggingMiddleware(req, res, next) {
  const startTime = performance.now();
  const originalSend = res.send;
  const originalJson = res.json;

  // Extract relevant request information
  const requestInfo = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    origin: req.get('Origin'),
    referer: req.get('Referer'),
    timestamp: new Date().toISOString()
  };

  // Add user information if available
  if (req.user) {
    requestInfo.userId = req.user.id;
    requestInfo.userEmail = req.user.email;
  }

  // Add authentication information
  if (req.get('Authorization')) {
    requestInfo.hasAuth = true;
    requestInfo.authType = req.get('Authorization').split(' ')[0];
  }

  // Log the incoming request
  logger.info('Incoming request', requestInfo);

  // Override response methods to capture response data
  res.send = function(body) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      responseTime: duration,
      contentLength: Buffer.byteLength(body || '', 'utf8')
    };

    // Log the response
    if (res.statusCode >= 400) {
      logger.error('Request completed with error', responseInfo);
    } else {
      logger.info('Request completed', responseInfo);
    }

    // Performance logging
    if (logger.enablePerformanceLogging && duration > 1000) {
      logger.warn('Slow request detected', {
        ...responseInfo,
        performance: {
          duration,
          threshold: 1000,
          slow: true
        }
      });
    }

    return originalSend.call(this, body);
  };

  res.json = function(obj) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      responseTime: duration,
      responseType: 'json'
    };

    // Log the response
    if (res.statusCode >= 400) {
      logger.error('Request completed with error', responseInfo);
    } else {
      logger.info('Request completed', responseInfo);
    }

    return originalJson.call(this, obj);
  };

  next();
}

/**
 * Error logging middleware
 */
function errorLoggingMiddleware(err, req, res, next) {
  const errorInfo = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      status: err.status || err.statusCode
    },
    timestamp: new Date().toISOString()
  };

  // Add user information if available
  if (req.user) {
    errorInfo.userId = req.user.id;
    errorInfo.userEmail = req.user.email;
  }

  // Log the error
  logger.error('Unhandled error', errorInfo);

  // Pass to next error handler
  next(err);
}

/**
 * Security event logging middleware
 */
function securityLoggingMiddleware(req, res, next) {
  if (!logger.enableSecurityLogging) {
    return next();
  }

  const securityChecks = {
    requestId: req.requestId,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript protocol
    /onload=/i,  // Event handlers
    /eval\(/i,  // Code execution
    /exec\(/i,  // Command execution
  ];

  const fullUrl = req.originalUrl || req.url;
  const requestBody = JSON.stringify(req.body || {});
  const queryString = req.query ? JSON.stringify(req.query) : '';

  let suspiciousActivity = false;
  const detectedPatterns = [];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl) || pattern.test(requestBody) || pattern.test(queryString)) {
      suspiciousActivity = true;
      detectedPatterns.push(pattern.toString());
    }
  }

  if (suspiciousActivity) {
    logger.warn('Suspicious activity detected', {
      ...securityChecks,
      url: fullUrl,
      detectedPatterns,
      requestBody: requestBody.substring(0, 500), // Limit body size in logs
      queryString
    });
  }

  // Check for brute force attempts (multiple failed auth requests)
  if (req.url.includes('/auth/') || req.url.includes('/login')) {
    logger.info('Authentication attempt', {
      ...securityChecks,
      url: fullUrl,
      authType: 'login_attempt'
    });
  }

  // Check for rate limiting headers
  const rateLimitRemaining = res.get('X-RateLimit-Remaining');
  if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10) {
    logger.warn('Rate limit approaching', {
      ...securityChecks,
      rateLimitRemaining,
      url: fullUrl
    });
  }

  next();
}

/**
 * Database query logging middleware
 */
function createDatabaseLoggingMiddleware() {
  return {
    logQuery: (query, params = [], duration = 0) => {
      const queryInfo = {
        query: query.substring(0, 500), // Limit query length
        paramCount: params.length,
        duration,
        timestamp: new Date().toISOString()
      };

      if (duration > 1000) {
        logger.warn('Slow database query', {
          ...queryInfo,
          slow: true,
          threshold: 1000
        });
      } else {
        logger.debug('Database query executed', queryInfo);
      }
    },

    logError: (query, error, params = []) => {
      logger.error('Database query failed', {
        query: query.substring(0, 500),
        error: {
          message: error.message,
          code: error.code,
          severity: error.severity
        },
        paramCount: params.length,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * AI service logging middleware
 */
function createAILoggingMiddleware() {
  return {
    logRequest: (service, prompt, config = {}) => {
      logger.info('AI service request', {
        service,
        promptLength: prompt.length,
        config: {
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature
        },
        timestamp: new Date().toISOString()
      });
    },

    logResponse: (service, prompt, response, duration) => {
      logger.info('AI service response', {
        service,
        promptLength: prompt.length,
        responseLength: response.length,
        duration,
        timestamp: new Date().toISOString()
      });
    },

    logError: (service, error, prompt = '') => {
      logger.error('AI service error', {
        service,
        error: {
          message: error.message,
          code: error.code,
          status: error.status
        },
        promptLength: prompt.length,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Agent activity logging middleware
 */
function createAgentLoggingMiddleware() {
  return {
    logAgentStart: (agentType, config = {}) => {
      logger.info('Agent started', {
        agentType,
        config,
        timestamp: new Date().toISOString()
      });
    },

    logAgentStop: (agentType, reason = 'manual') => {
      logger.info('Agent stopped', {
        agentType,
        reason,
        timestamp: new Date().toISOString()
      });
    },

    logAgentError: (agentType, error, context = {}) => {
      logger.error('Agent error', {
        agentType,
        error: {
          message: error.message,
          stack: error.stack
        },
        context,
        timestamp: new Date().toISOString()
      });
    },

    logTaskCompletion: (agentType, taskId, duration, result) => {
      logger.info('Agent task completed', {
        agentType,
        taskId,
        duration,
        success: !!result,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * WebSocket logging middleware
 */
function createWebSocketLoggingMiddleware() {
  return {
    logConnection: (socketId, userId = null) => {
      logger.info('WebSocket connection established', {
        socketId,
        userId,
        timestamp: new Date().toISOString()
      });
    },

    logDisconnection: (socketId, reason = 'unknown') => {
      logger.info('WebSocket connection closed', {
        socketId,
        reason,
        timestamp: new Date().toISOString()
      });
    },

    logMessage: (socketId, event, data = {}) => {
      logger.debug('WebSocket message', {
        socketId,
        event,
        dataSize: JSON.stringify(data).length,
        timestamp: new Date().toISOString()
      });
    },

    logError: (socketId, error) => {
      logger.error('WebSocket error', {
        socketId,
        error: {
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Cleanup old log files
 */
function cleanupLogs() {
  if (process.env.NODE_ENV !== 'production') return;

  const fs = require('fs');
  const path = require('path');
  const logsDir = 'logs';

  if (!fs.existsSync(logsDir)) return;

  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  const now = Date.now();

  fs.readdirSync(logsDir).forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      fs.unlinkSync(filePath);
      logger.info('Cleaned up old log file', { file: filePath });
    }
  });
}

// Schedule log cleanup (run daily)
if (process.env.NODE_ENV === 'production') {
  setInterval(cleanupLogs, 24 * 60 * 60 * 1000);
}

export {
  logger,
  requestIdMiddleware,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  securityLoggingMiddleware,
  createDatabaseLoggingMiddleware,
  createAILoggingMiddleware,
  createAgentLoggingMiddleware,
  createWebSocketLoggingMiddleware,
  cleanupLogs
};

export default requestLoggingMiddleware;