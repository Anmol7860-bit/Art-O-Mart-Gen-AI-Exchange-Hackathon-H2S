/**
 * Comprehensive Frontend Monitoring Utility
 * Integrates Sentry, performance monitoring, and analytics
 */

import React from 'react';
import * as Sentry from '@sentry/react';
import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

class MonitoringService {
  constructor() {
    this.initialized = false;
    this.environment = import.meta.env.MODE || 'development';
    this.dsn = import.meta.env.VITE_SENTRY_DSN;
    this.analyticsId = import.meta.env.VITE_ANALYTICS_ID;
    this.userId = null;
    this.sessionId = this.generateSessionId();
    
    // Performance metrics storage
    this.metrics = {
      vitals: {},
      custom: {},
      business: {}
    };

    // User consent tracking
    this.hasConsent = this.getStoredConsent();
  }

  /**
   * Initialize monitoring services
   */
  init(options = {}) {
    if (this.initialized) {
      console.warn('Monitoring service already initialized');
      return;
    }

    try {
      this.initSentry(options);
      this.initPerformanceMonitoring();
      this.initAnalytics(options);
      this.initErrorTracking();
      this.setupWebVitals();
      
      this.initialized = true;
      console.log('✅ Monitoring service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error);
      // Fallback to basic error logging
      this.initBasicErrorTracking();
    }
  }

  /**
   * Initialize Sentry for error tracking
   */
  initSentry(options) {
    if (!this.dsn && this.environment === 'production') {
      console.warn('Sentry DSN not configured for production');
      return;
    }

    // Initialize Sentry with routing instrumentation
    const routingInstrumentation = Sentry.reactRouterV6Instrumentation(
      React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes
    );

    Sentry.init({
      dsn: this.dsn,
      environment: this.environment,
      integrations: [
        new Sentry.BrowserTracing({
          // Performance monitoring
          routingInstrumentation,
        }),
        new Sentry.Replay({
          // Session replay for debugging
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance monitoring
      tracesSampleRate: this.environment === 'production' ? 0.1 : 1.0,
      
      // Session replay
      replaysSessionSampleRate: this.environment === 'production' ? 0.01 : 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 
               (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null) || 
               '1.0.0',

      // User context
      beforeSend: (event) => {
        if (!this.hasConsent) {
          return null; // Don't send if no consent
        }
        
        // Add custom context
        event.tags = {
          ...event.tags,
          component: 'frontend',
          session_id: this.sessionId
        };

        return event;
      },

      // Custom error filtering
      ignoreErrors: [
        // Ignore browser extension errors
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',
        // Network errors
        'NetworkError',
        'fetch',
      ],

      ...options.sentry
    });

    // Set initial user context
    if (this.userId) {
      this.setUser({ id: this.userId });
    }
  }

  /**
   * Initialize performance monitoring
   */
  initPerformanceMonitoring() {
    // Monitor navigation timing
    if ('performance' in window && 'getEntriesByType' in window.performance) {
      this.monitorNavigationTiming();
      this.monitorResourceTiming();
    }

    // Monitor memory usage (if available)
    if ('memory' in window.performance) {
      this.monitorMemoryUsage();
    }

    // Monitor connection quality
    if ('connection' in navigator) {
      this.monitorNetworkQuality();
    }
  }

  /**
   * Initialize analytics tracking
   */
  initAnalytics(options) {
    if (!this.analyticsId || !this.hasConsent) {
      console.log('Analytics disabled - no consent or ID');
      return;
    }

    // Initialize Google Analytics 4
    if (typeof gtag === 'function') {
      gtag('config', this.analyticsId, {
        session_id: this.sessionId,
        custom_map: {
          custom_dimension_1: 'user_type',
          custom_dimension_2: 'feature_usage'
        }
      });
    }

    // Track initial page view
    this.trackPageView(window.location.pathname);
  }

  /**
   * Initialize error tracking
   */
  initErrorTracking() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        type: 'unhandled_promise_rejection'
      });
    });
  }

  /**
   * Setup Web Vitals monitoring
   */
  setupWebVitals() {
    const reportVital = (metric) => {
      this.metrics.vitals[metric.name] = metric.value;
      
      // Send to analytics
      if (this.hasConsent && typeof gtag === 'function') {
        gtag('event', metric.name, {
          event_category: 'Web Vitals',
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          non_interaction: true,
        });
      }

      // Send to Sentry as measurement
      Sentry.addBreadcrumb({
        category: 'web-vital',
        message: `${metric.name}: ${metric.value}`,
        level: 'info',
        data: {
          name: metric.name,
          value: metric.value,
          rating: this.getVitalRating(metric.name, metric.value)
        }
      });
    };

    // Collect all Web Vitals
    getCLS(reportVital);
    getFID(reportVital);
    getFCP(reportVital);
    getLCP(reportVital);
    getTTFB(reportVital);
  }

  /**
   * Monitor navigation timing
   */
  monitorNavigationTiming() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const timing = {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
            ttfb: entry.responseStart - entry.requestStart,
            download: entry.responseEnd - entry.responseStart,
            domInteractive: entry.domInteractive - entry.navigationStart,
            domComplete: entry.domComplete - entry.navigationStart,
            loadComplete: entry.loadEventEnd - entry.navigationStart
          };

          this.trackCustomMetric('navigation_timing', timing);
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });
  }

  /**
   * Monitor resource timing
   */
  monitorResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 1000) { // Only track slow resources
          this.trackCustomMetric('slow_resource', {
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            type: entry.initiatorType
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  /**
   * Monitor memory usage
   */
  monitorMemoryUsage() {
    const checkMemory = () => {
      if (window.performance.memory) {
        const memory = {
          used: window.performance.memory.usedJSHeapSize,
          total: window.performance.memory.totalJSHeapSize,
          limit: window.performance.memory.jsHeapSizeLimit,
          usage: (window.performance.memory.usedJSHeapSize / window.performance.memory.jsHeapSizeLimit) * 100
        };

        this.metrics.custom.memory = memory;

        // Alert if memory usage is high
        if (memory.usage > 80) {
          this.captureMessage('High memory usage detected', 'warning', {
            memory_usage: memory.usage,
            used_mb: Math.round(memory.used / 1024 / 1024),
            total_mb: Math.round(memory.total / 1024 / 1024)
          });
        }
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  /**
   * Monitor network quality
   */
  monitorNetworkQuality() {
    const connection = navigator.connection;
    const networkInfo = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };

    this.trackCustomMetric('network_quality', networkInfo);

    // Monitor connection changes
    connection.addEventListener('change', () => {
      const updatedInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
      
      this.trackCustomMetric('network_change', updatedInfo);
    });
  }

  /**
   * Set user context
   */
  setUser(userData) {
    this.userId = userData.id;
    
    if (this.initialized && this.hasConsent) {
      Sentry.setUser({
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        subscription: userData.subscription
      });

      // Set user context in analytics
      if (typeof gtag === 'function') {
        gtag('set', { user_id: userData.id });
        gtag('set', 'user_properties', {
          user_type: userData.role,
          subscription_type: userData.subscription
        });
      }
    }
  }

  /**
   * Capture error with context
   */
  captureError(error, context = {}) {
    console.error('Captured error:', error, context);

    if (!this.hasConsent) {
      return; // Don't send without consent
    }

    // Enhanced error context
    const enhancedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      userId: this.userId,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    if (this.initialized) {
      Sentry.withScope((scope) => {
        scope.setContext('error_details', enhancedContext);
        scope.setLevel('error');
        Sentry.captureException(error);
      });
    } else {
      // Fallback error storage
      this.storeErrorForLater(error, enhancedContext);
    }
  }

  /**
   * Capture message with context
   */
  captureMessage(message, level = 'info', context = {}) {
    console.log(`[${level.toUpperCase()}] ${message}`, context);

    if (this.initialized && this.hasConsent) {
      Sentry.withScope((scope) => {
        scope.setContext('message_details', context);
        scope.setLevel(level);
        Sentry.captureMessage(message);
      });
    }
  }

  /**
   * Track custom metrics
   */
  trackCustomMetric(name, value, category = 'custom') {
    this.metrics.custom[name] = {
      value,
      timestamp: Date.now(),
      category
    };

    // Send to analytics
    if (this.hasConsent && typeof gtag === 'function') {
      gtag('event', 'custom_metric', {
        event_category: category,
        event_label: name,
        value: typeof value === 'number' ? value : 1,
        custom_parameter_1: JSON.stringify(value)
      });
    }

    // Send to Sentry as breadcrumb
    Sentry.addBreadcrumb({
      category: 'metric',
      message: `${name}: ${JSON.stringify(value)}`,
      level: 'info'
    });
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(eventName, properties = {}) {
    this.metrics.business[eventName] = {
      ...properties,
      timestamp: Date.now()
    };

    if (this.hasConsent && typeof gtag === 'function') {
      gtag('event', eventName, {
        event_category: 'business',
        ...properties
      });
    }
  }

  /**
   * Track page views
   */
  trackPageView(path, title) {
    if (this.hasConsent && typeof gtag === 'function') {
      gtag('event', 'page_view', {
        page_path: path,
        page_title: title || document.title,
        session_id: this.sessionId
      });
    }

    // Add navigation breadcrumb
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${path}`,
      level: 'info'
    });
  }

  /**
   * Track user interactions
   */
  trackInteraction(action, element, properties = {}) {
    const interactionData = {
      action,
      element,
      ...properties,
      timestamp: Date.now()
    };

    if (this.hasConsent && typeof gtag === 'function') {
      gtag('event', action, {
        event_category: 'interaction',
        event_label: element,
        ...properties
      });
    }

    // Add interaction breadcrumb
    Sentry.addBreadcrumb({
      category: 'ui.interaction',
      message: `${action} on ${element}`,
      level: 'info',
      data: interactionData
    });
  }

  /**
   * Request user consent for tracking
   */
  async requestConsent() {
    return new Promise((resolve) => {
      // This would typically show a consent dialog
      const consent = window.confirm(
        'This application uses cookies and tracking to improve your experience. Do you consent to data collection for analytics and error tracking?'
      );
      
      this.setConsent(consent);
      resolve(consent);
    });
  }

  /**
   * Set user consent
   */
  setConsent(hasConsent) {
    this.hasConsent = hasConsent;
    localStorage.setItem('monitoring_consent', JSON.stringify(hasConsent));

    if (hasConsent && !this.initialized) {
      // Initialize monitoring now that we have consent
      this.init();
    } else if (!hasConsent && this.initialized) {
      // Disable tracking
      this.disableTracking();
    }
  }

  /**
   * Get stored consent
   */
  getStoredConsent() {
    try {
      const stored = localStorage.getItem('monitoring_consent');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  }

  /**
   * Disable tracking
   */
  disableTracking() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied'
      });
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      session: {
        id: this.sessionId,
        duration: Date.now() - this.sessionStart,
        pageViews: this.pageViews
      }
    };
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get Web Vital rating
   */
  getVitalRating(name, value) {
    const thresholds = {
      CLS: { good: 0.1, needs_improvement: 0.25 },
      FID: { good: 100, needs_improvement: 300 },
      FCP: { good: 1800, needs_improvement: 3000 },
      LCP: { good: 2500, needs_improvement: 4000 },
      TTFB: { good: 800, needs_improvement: 1800 }
    };

    const threshold = thresholds[name];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needs_improvement) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Initialize basic error tracking (fallback)
   */
  initBasicErrorTracking() {
    this.errorQueue = [];
    
    window.addEventListener('error', (event) => {
      this.errorQueue.push({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Store error for later sending
   */
  storeErrorForLater(error, context) {
    const errorData = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: Date.now()
    };

    try {
      const stored = JSON.parse(localStorage.getItem('pending_errors') || '[]');
      stored.push(errorData);
      localStorage.setItem('pending_errors', JSON.stringify(stored.slice(-10))); // Keep last 10
    } catch (e) {
      console.error('Failed to store error for later:', e);
    }
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

export default monitoring;

// Export specific functions for convenience
export const {
  init: initMonitoring,
  setUser,
  captureError,
  captureMessage,
  trackCustomMetric,
  trackBusinessMetric,
  trackPageView,
  trackInteraction,
  requestConsent,
  setConsent,
  getMetrics
} = monitoring;