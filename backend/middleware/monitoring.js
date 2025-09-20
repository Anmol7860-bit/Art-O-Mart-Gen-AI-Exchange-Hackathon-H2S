/**
 * Comprehensive Backend Monitoring Middleware
 * Integrates with logging middleware for enhanced monitoring
 */

import * as Sentry from '@sentry/node';
import * as prometheus from 'prom-client';
import os from 'os';

class BackendMonitoring {
  constructor() {
    this.initialized = false;
    this.environment = process.env.NODE_ENV || 'development';
    this.serviceName = process.env.SERVICE_NAME || 'art-o-mart-backend';
    this.version = process.env.npm_package_version || '1.0.0';
    
    // Initialize Prometheus metrics
    this.initPrometheusMetrics();
    
    // Performance tracking
    this.requestStartTimes = new Map();
    this.activeRequests = new Set();
  }

  /**
   * Initialize monitoring services
   */
  init(options = {}) {
    if (this.initialized) {
      console.warn('Backend monitoring already initialized');
      return;
    }

    try {
      this.initSentry(options);
      this.initPrometheusCollection();
      this.initResourceMonitoring();
      this.initBusinessMetrics();
      
      this.initialized = true;
      console.log('✅ Backend monitoring initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize backend monitoring:', error);
      this.initBasicLogging();
    }
  }

  /**
   * Initialize Sentry for error tracking
   */
  initSentry(options) {
    const dsn = process.env.SENTRY_DSN;
    
    if (!dsn && this.environment === 'production') {
      console.warn('Sentry DSN not configured for production');
      return;
    }

    Sentry.init({
      dsn,
      environment: this.environment,
      serverName: os.hostname(),
      release: this.version,
      
      // Performance monitoring
      tracesSampleRate: this.environment === 'production' ? 0.1 : 1.0,
      
      // Profiling
      profilesSampleRate: this.environment === 'production' ? 0.01 : 0.1,

      // Integrations
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: options.app }),
        new Sentry.Integrations.OnUncaughtException({
          exitExit: false,
        }),
        new Sentry.Integrations.OnUnhandledRejection({
          mode: 'warn',
        }),
      ],

      beforeSend: (event, hint) => {
        // Add custom context
        event.tags = {
          ...event.tags,
          component: 'backend',
          service: this.serviceName,
          hostname: os.hostname()
        };

        // Add system info
        event.contexts = {
          ...event.contexts,
          system: {
            node_version: process.version,
            platform: os.platform(),
            arch: os.arch(),
            memory_usage: process.memoryUsage(),
            uptime: process.uptime()
          }
        };

        return event;
      },

      ...options.sentry
    });
  }

  /**
   * Initialize Prometheus metrics
   */
  initPrometheusMetrics() {
    // Clear existing metrics
    prometheus.register.clear();

    // HTTP request metrics
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'user_type'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestTotal = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_type']
    });

    this.httpRequestSize = new prometheus.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000]
    });

    this.httpResponseSize = new prometheus.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000]
    });

    // Database metrics
    this.dbQueryDuration = new prometheus.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries',
      labelNames: ['operation', 'table', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.dbConnectionsTotal = new prometheus.Gauge({
      name: 'db_connections_total',
      help: 'Total number of database connections',
      labelNames: ['status']
    });

    // AI service metrics
    this.aiRequestDuration = new prometheus.Histogram({
      name: 'ai_request_duration_seconds',
      help: 'Duration of AI service requests',
      labelNames: ['service', 'model', 'status'],
      buckets: [0.5, 1, 2, 5, 10, 15, 30, 60]
    });

    this.aiTokensUsed = new prometheus.Counter({
      name: 'ai_tokens_used_total',
      help: 'Total AI tokens consumed',
      labelNames: ['service', 'model', 'type'] // type: input/output
    });

    // Business metrics
    this.userRegistrations = new prometheus.Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['user_type', 'source']
    });

    this.orderTotal = new prometheus.Counter({
      name: 'orders_total',
      help: 'Total number of orders',
      labelNames: ['status', 'payment_method']
    });

    this.revenueTotal = new prometheus.Counter({
      name: 'revenue_total',
      help: 'Total revenue generated',
      labelNames: ['currency', 'payment_method']
    });

    // System metrics
    this.activeUsers = new prometheus.Gauge({
      name: 'active_users_current',
      help: 'Current number of active users',
      labelNames: ['user_type']
    });

    this.memoryUsage = new prometheus.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'] // rss, heapTotal, heapUsed, external
    });

    this.cpuUsage = new prometheus.Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage'
    });

    // Error metrics
    this.errorTotal = new prometheus.Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity', 'component']
    });

    // Register default metrics
    prometheus.collectDefaultMetrics({
      prefix: 'nodejs_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });
  }

  /**
   * Initialize Prometheus collection
   */
  initPrometheusCollection() {
    // Collect system metrics every 10 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    // Initial collection
    this.collectSystemMetrics();
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'external' }, memUsage.external);

    // CPU usage
    const cpuUsage = process.cpuUsage();
    const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.cpuUsage.set(totalUsage);
  }

  /**
   * Initialize resource monitoring
   */
  initResourceMonitoring() {
    // Monitor process events
    process.on('warning', (warning) => {
      this.captureWarning(warning);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.captureError(reason, { type: 'unhandled_rejection', promise });
    });

    process.on('uncaughtException', (error) => {
      this.captureError(error, { type: 'uncaught_exception' });
    });
  }

  /**
   * Initialize business metrics collection
   */
  initBusinessMetrics() {
    // Track active users (in-memory store for demo)
    this.activeUserSessions = new Map();
    
    // Clean up inactive sessions every minute
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000);
  }

  /**
   * Express middleware for request monitoring
   */
  requestMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add request ID to headers
      req.requestId = requestId;
      res.setHeader('X-Request-ID', requestId);
      
      // Store start time
      this.requestStartTimes.set(requestId, startTime);
      this.activeRequests.add(requestId);

      // Track request size
      const requestSize = parseInt(req.get('content-length') || '0', 10);
      if (requestSize > 0) {
        this.httpRequestSize.observe(
          { method: req.method, route: this.getRoutePattern(req) },
          requestSize
        );
      }

      // Use res.on('finish') to avoid overriding res.send/json
      res.on('finish', () => {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        // Clean up tracking
        this.requestStartTimes.delete(requestId);
        this.activeRequests.delete(requestId);
        
        // Get labels
        const labels = {
          method: req.method,
          route: this.getRoutePattern(req),
          status_code: res.statusCode,
          user_type: req.user?.role || 'anonymous'
        };

        // Record metrics
        this.httpRequestDuration.observe(labels, duration);
        this.httpRequestTotal.inc(labels);

        // Track response size from Content-Length header if available
        const contentLength = res.getHeader('Content-Length');
        if (contentLength) {
          this.httpResponseSize.observe({
            method: req.method,
            route: this.getRoutePattern(req),
            status_code: res.statusCode
          }, parseInt(contentLength, 10));
        }

        // Track slow requests
        if (duration > 2) {
          this.captureSlowRequest(req, res, duration);
        }

        // Track errors
        if (res.statusCode >= 400) {
          this.trackError(req, res);
        }
      });

      next();
    };
  }

  /**
   * Get route pattern from request
   */
  getRoutePattern(req) {
    if (req.route) {
      return req.route.path;
    }
    
    if (req.baseUrl && req.path) {
      return req.baseUrl + req.path;
    }
    
    return req.path || req.url || 'unknown';
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(operation, table, duration, error = null) {
    const labels = {
      operation,
      table,
      status: error ? 'error' : 'success'
    };

    this.dbQueryDuration.observe(labels, duration / 1000);

    if (error) {
      this.captureError(error, {
        type: 'database_error',
        operation,
        table,
        duration
      });
    }
  }

  /**
   * Track AI service requests
   */
  trackAIRequest(service, model, duration, tokensUsed = {}, error = null) {
    const labels = {
      service,
      model,
      status: error ? 'error' : 'success'
    };

    this.aiRequestDuration.observe(labels, duration / 1000);

    // Track token usage
    if (tokensUsed.input) {
      this.aiTokensUsed.inc({ service, model, type: 'input' }, tokensUsed.input);
    }
    if (tokensUsed.output) {
      this.aiTokensUsed.inc({ service, model, type: 'output' }, tokensUsed.output);
    }

    if (error) {
      this.captureError(error, {
        type: 'ai_service_error',
        service,
        model,
        duration,
        tokens_used: tokensUsed
      });
    }
  }

  /**
   * Track business events
   */
  trackUserRegistration(userType, source = 'direct') {
    this.userRegistrations.inc({ user_type: userType, source });
  }

  trackOrder(status, paymentMethod, amount = 0, currency = 'INR') {
    this.orderTotal.inc({ status, payment_method: paymentMethod });
    
    if (status === 'completed' && amount > 0) {
      this.revenueTotal.inc({ currency, payment_method: paymentMethod }, amount);
    }
  }

  trackActiveUser(userId, userType) {
    const sessionKey = `${userId}_${userType}`;
    this.activeUserSessions.set(sessionKey, {
      userId,
      userType,
      lastSeen: Date.now()
    });

    // Update active users gauge
    this.updateActiveUsersGauge();
  }

  /**
   * Update active users gauge
   */
  updateActiveUsersGauge() {
    const userTypes = {};
    
    for (const session of this.activeUserSessions.values()) {
      userTypes[session.userType] = (userTypes[session.userType] || 0) + 1;
    }

    // Reset all user type gauges
    this.activeUsers.reset();
    
    // Set current values
    for (const [userType, count] of Object.entries(userTypes)) {
      this.activeUsers.set({ user_type: userType }, count);
    }
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions() {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 minutes

    for (const [key, session] of this.activeUserSessions.entries()) {
      if (now - session.lastSeen > timeout) {
        this.activeUserSessions.delete(key);
      }
    }

    this.updateActiveUsersGauge();
  }

  /**
   * Capture error with context
   */
  captureError(error, context = {}) {
    console.error('Backend error captured:', error, context);

    // Track error metrics
    this.errorTotal.inc({
      type: context.type || 'unknown',
      severity: context.severity || 'error',
      component: context.component || 'backend'
    });

    if (this.initialized) {
      Sentry.withScope((scope) => {
        scope.setContext('error_details', context);
        scope.setLevel(context.severity || 'error');
        Sentry.captureException(error);
      });
    }
  }

  /**
   * Capture warning
   */
  captureWarning(warning) {
    console.warn('Warning captured:', warning);

    if (this.initialized) {
      Sentry.captureMessage(warning.message, 'warning');
    }
  }

  /**
   * Track slow requests
   */
  captureSlowRequest(req, res, duration) {
    const context = {
      method: req.method,
      url: req.url,
      duration,
      status_code: res.statusCode,
      user_agent: req.get('User-Agent'),
      user_id: req.user?.id,
      request_id: req.requestId
    };

    console.warn(`Slow request detected: ${req.method} ${req.url} - ${duration}s`);

    if (this.initialized) {
      Sentry.withScope((scope) => {
        scope.setContext('slow_request', context);
        scope.setLevel('warning');
        Sentry.captureMessage(`Slow request: ${req.method} ${req.url}`, 'warning');
      });
    }
  }

  /**
   * Track HTTP errors
   */
  trackError(req, res) {
    const context = {
      method: req.method,
      url: req.url,
      status_code: res.statusCode,
      user_agent: req.get('User-Agent'),
      user_id: req.user?.id,
      request_id: req.requestId
    };

    if (res.statusCode >= 500) {
      this.captureError(new Error(`HTTP ${res.statusCode}: ${req.method} ${req.url}`), {
        ...context,
        type: 'http_error',
        severity: 'error'
      });
    } else if (res.statusCode >= 400) {
      // Client errors (4xx) - log as warnings
      if (this.initialized) {
        Sentry.withScope((scope) => {
          scope.setContext('client_error', context);
          scope.setLevel('warning');
          Sentry.captureMessage(`Client error: ${res.statusCode} ${req.method} ${req.url}`, 'warning');
        });
      }
    }
  }

  /**
   * Get Prometheus metrics
   */
  getMetrics() {
    return prometheus.register.metrics();
  }

  /**
   * Get metrics endpoint middleware
   */
  metricsEndpoint() {
    return async (req, res) => {
      try {
        const metrics = await this.getMetrics();
        res.set('Content-Type', prometheus.register.contentType);
        res.send(metrics);
      } catch (error) {
        console.error('Error generating metrics:', error);
        res.status(500).send('Error generating metrics');
      }
    };
  }

  /**
   * Initialize basic logging (fallback)
   */
  initBasicLogging() {
    console.log('Initializing basic logging fallback');
    
    // Basic error tracking
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
    });
  }

  /**
   * Health check endpoint
   */
  healthCheck() {
    return (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        version: this.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeRequests: this.activeRequests.size,
        environment: this.environment
      };

      res.json(health);
    };
  }
}

// Create singleton instance
const backendMonitoring = new BackendMonitoring();

export default backendMonitoring;