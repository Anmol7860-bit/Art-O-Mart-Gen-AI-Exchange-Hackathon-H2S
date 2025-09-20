# Security Deployment Guide for Art-O-Mart

This document outlines the comprehensive security measures implemented and recommended for the Art-O-Mart marketplace deployment.

## Security Architecture Overview

Art-O-Mart implements a **layered security approach** using proven technologies and patterns:

### **Production Deployment Stack**
- **Frontend**: Vercel/Netlify with built-in edge security
- **Backend**: Express.js with Helmet security middleware
- **Reverse Proxy**: Nginx with security headers and rate limiting
- **Load Balancer**: Traefik with SSL termination and additional security middleware
- **Database**: Supabase with row-level security (RLS)
- **Monitoring**: Sentry for error tracking and security event logging

### **Security Scope**
This guide covers the **implemented and production-ready** security measures. Advanced edge computing solutions (like Cloudflare Workers) and custom security middleware are **out of scope** for this deployment to maintain simplicity and focus on proven, maintainable solutions.

## Implemented Security Measures

### 1. Nginx Security Configuration ✅

The nginx configuration includes multiple security layers:

```nginx
# Security Headers (implemented in nginx/nginx.conf)
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.artomart.com wss://api.artomart.com https://sentry.io;";

# Rate Limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
```

### 2. Traefik Security Configuration ✅

Traefik provides additional security middleware:

```yaml
# Security Middleware (implemented in traefik/traefik.yml)
middlewares:
  secure-headers:
    headers:
      customResponseHeaders:
        X-Frame-Options: DENY
        X-Content-Type-Options: nosniff
        X-XSS-Protection: "1; mode=block"
        Strict-Transport-Security: "max-age=31536000; includeSubDomains"
  
  rate-limit:
    rateLimit:
      average: 100
      burst: 200
      period: 1m
```

### 3. Frontend Security Monitoring ✅

Frontend monitoring includes security event tracking:

```javascript
// Implemented in src/utils/monitoring.js
initializeSentry({
  beforeSend(event) {
    // Security event filtering
    if (event.tags?.security) {
      logSecurityEvent(event);
    }
    return event;
  }
});
```

### 4. Backend Security Monitoring ✅

Backend monitoring tracks security metrics:

```javascript
// Implemented in backend/middleware/monitoring.js
const securityMetrics = new prometheus.Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['type', 'severity']
});
```

## Additional Security Recommendations

### 1. Environment-Specific Security

#### Production Environment
```bash
# Environment Variables (add to .env.production)
NODE_ENV=production
SECURE_COOKIES=true
HTTPS_ONLY=true
TRUST_PROXY=true
SESSION_SECURE=true
BCRYPT_ROUNDS=12
JWT_ALGORITHM=RS256
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

#### Security Headers Middleware (Optional Implementation)
```javascript
// backend/middleware/security.js - Optional additional layer
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.sentry-cdn.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.artomart.com", "https://sentry.io"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),
  
  // General rate limiting
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),
  
  // Progressive delay for repeated requests
  slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 100,
    delayMs: 500,
    maxDelayMs: 20000
  })
];

// Authentication rate limiting
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.'
});
```

### 2. SSL/TLS Configuration

#### Let's Encrypt Integration
```bash
# SSL Certificate Setup Script
#!/bin/bash
# scripts/setup-ssl.sh

# Install Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Obtain certificates
certbot --nginx \
  -d artomart.com \
  -d www.artomart.com \
  -d api.artomart.com \
  -d grafana.artomart.com \
  -d prometheus.artomart.com \
  --email admin@artomart.com \
  --agree-tos \
  --non-interactive

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

#### SSL Configuration for Nginx
```nginx
# Enhanced SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
```

### 3. Database Security

#### PostgreSQL Security Configuration
```postgresql
# postgresql.conf security settings
ssl = on
password_encryption = scram-sha-256
log_connections = on
log_disconnections = on
log_statement = 'ddl'
shared_preload_libraries = 'pg_stat_statements'
```

#### Database Connection Security
```javascript
// backend/config/database.js
export const databaseConfig = {
  ssl: {
    require: true,
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  },
  pool: {
    min: 2,
    max: 10,
    idle: 10000,
    acquire: 60000,
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
};
```

### 4. Container Security

#### Docker Security Best Practices
```dockerfile
# Security-enhanced Dockerfile
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001

# Set proper permissions
COPY --chown=appuser:appuser . /app
WORKDIR /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### 5. Monitoring and Incident Response

#### Security Event Monitoring
```yaml
# Prometheus alerting rules for security
- alert: SuspiciousTrafficSpike
  expr: rate(http_requests_total[1m]) > 1000
  for: 2m
  labels:
    severity: warning
    category: security
  annotations:
    summary: "Unusual traffic spike detected"
    description: "Request rate {{ $value }} req/sec is unusually high"

- alert: HighErrorRate
  expr: rate(http_requests_total{status_code=~"4.."}[5m]) > 50
  for: 5m
  labels:
    severity: critical
    category: security
  annotations:
    summary: "High client error rate"
    description: "Error rate {{ $value }} may indicate attack"

- alert: AuthenticationFailures
  expr: rate(auth_failures_total[5m]) > 10
  for: 2m
  labels:
    severity: warning
    category: security
  annotations:
    summary: "High authentication failure rate"
    description: "{{ $value }} auth failures per second"
```

#### Log Analysis Configuration
```yaml
# ELK Stack Security Rules
security_rules:
  - name: "Brute Force Detection"
    query: "status:401 AND path:/api/login"
    threshold: 10
    timeframe: "5m"
    action: "alert"
    
  - name: "SQL Injection Attempt"
    query: "query:*UNION* OR query:*SELECT* OR query:*DROP*"
    threshold: 1
    timeframe: "1m"
    action: "block_ip"
    
  - name: "XSS Attempt"
    query: "query:*<script* OR query:*javascript:*"
    threshold: 1
    timeframe: "1m"
    action: "alert"
```

### 6. Backup and Recovery Security

#### Encrypted Backup Strategy
```bash
#!/bin/bash
# scripts/secure-backup.sh

# Create encrypted database backup
BACKUP_FILE="artomart-$(date +%Y%m%d_%H%M%S).sql"
pg_dump $DATABASE_URL > $BACKUP_FILE

# Encrypt backup
gpg --cipher-algo AES256 --compress-algo 1 --symmetric --output $BACKUP_FILE.gpg $BACKUP_FILE

# Upload to secure storage
aws s3 cp $BACKUP_FILE.gpg s3://$SECURE_BACKUP_BUCKET/ --server-side-encryption AES256

# Cleanup
rm $BACKUP_FILE $BACKUP_FILE.gpg
```

## Security Checklist

### Pre-Deployment Security Audit
- [ ] Update all dependencies to latest versions
- [ ] Run security vulnerability scans (npm audit, snyk)
- [ ] Configure environment variables securely
- [ ] Set up SSL certificates
- [ ] Enable security headers
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Test authentication and authorization
- [ ] Validate input sanitization
- [ ] Configure CORS policies
- [ ] Set up backup encryption
- [ ] Document incident response procedures

### Runtime Security Monitoring
- [ ] Monitor failed authentication attempts
- [ ] Track unusual traffic patterns
- [ ] Monitor error rates and types
- [ ] Watch for suspicious user behavior
- [ ] Track resource usage anomalies
- [ ] Monitor certificate expiration
- [ ] Review security logs regularly
- [ ] Test disaster recovery procedures

## Incident Response Plan

### Security Incident Classifications
1. **Low**: Minor configuration issues, false alarms
2. **Medium**: Attempted attacks blocked by security measures
3. **High**: Successful exploitation of minor vulnerabilities
4. **Critical**: Data breach, system compromise, service disruption

### Response Procedures
1. **Immediate Response** (< 5 minutes)
   - Assess incident severity
   - Isolate affected systems if necessary
   - Notify security team

2. **Investigation** (< 30 minutes)
   - Analyze logs and monitoring data
   - Identify attack vectors
   - Assess potential damage

3. **Containment** (< 1 hour)
   - Block malicious IPs
   - Patch vulnerabilities
   - Update security rules

4. **Recovery** (< 4 hours)
   - Restore services if disrupted
   - Validate system integrity
   - Monitor for recurring issues

5. **Post-Incident** (< 24 hours)
   - Document lessons learned
   - Update security measures
   - Report to stakeholders

## Conclusion

The Art-O-Mart security implementation follows defense-in-depth principles with multiple layers of protection:

1. **Perimeter Security**: Nginx and Traefik with rate limiting and security headers
2. **Application Security**: Input validation, authentication, and authorization
3. **Infrastructure Security**: Container security, encrypted communications
4. **Monitoring Security**: Comprehensive logging and alerting
5. **Data Security**: Encrypted storage and secure backups

This security approach ensures robust protection while maintaining system performance and user experience.