# Backend Deployment Guide

This comprehensive guide covers deploying the Art-O-Mart backend to various platforms with production-ready configurations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Platform Overview](#platform-overview)
3. [Environment Configuration](#environment-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Platform-Specific Deployments](#platform-specific-deployments)
6. [Health Checks & Monitoring](#health-checks--monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

## Prerequisites

### Required Tools
- Node.js 18.0.0 or higher
- npm or yarn
- Docker (for containerized deployments)
- Git

### Required Accounts
- Supabase account with project
- Google Cloud Platform account (for Gemini API)
- Deployment platform account (Render/Railway/Fly.io)

### Required Secrets
- Supabase URL and API keys
- Google Gemini API key
- JWT secret (minimum 32 characters)
- Platform-specific deployment tokens

## Platform Overview

The backend supports deployment to multiple platforms:

| Platform | Pros | Cons | Best For |
|----------|------|------|----------|
| **Render** | Easy setup, automatic SSL, GitHub integration | Limited free tier | Small to medium projects |
| **Railway** | Simple deployments, good DX | Newer platform | Modern CI/CD workflows |
| **Fly.io** | Global edge deployment, Docker-native | More complex setup | High-performance applications |

## Environment Configuration

### 1. Copy Environment Template
```bash
cp .env.production.example .env.production
```

### 2. Required Environment Variables

**Essential Variables:**
```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
JWT_SECRET=your-super-secure-jwt-secret-32-chars-minimum
```

**Security Variables:**
```env
ALLOWED_ORIGINS=https://your-frontend-domain.com
STRICT_CORS=true
RATE_LIMIT_MAX_REQUESTS=100
```

**Performance Variables:**
```env
LOG_LEVEL=info
ENABLE_PERFORMANCE_LOGGING=true
CACHE_DEFAULT_TTL=3600
```

### 3. Validate Configuration
```bash
node scripts/health-check.js
```

## Docker Deployment

### 1. Build Docker Image
```bash
# Build the image
docker build -t art-o-mart-backend .

# Run locally for testing
docker run -p 5000:5000 --env-file .env.production art-o-mart-backend
```

### 2. Docker Compose (Optional)
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5000:5000"
    env_file:
      - .env.production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 3. Docker Registry Push
```bash
# Tag for registry
docker tag art-o-mart-backend your-registry/art-o-mart-backend:latest

# Push to registry
docker push your-registry/art-o-mart-backend:latest
```

## Platform-Specific Deployments

### Render Deployment

#### 1. Automatic Deployment
1. Connect GitHub repository to Render
2. Use the provided `render.yaml` configuration
3. Set environment variables in Render dashboard

#### 2. Manual Deployment
```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render auth login

# Deploy using script
node scripts/deploy.js render
```

#### 3. Render Configuration
```yaml
# render.yaml
services:
  - type: web
    name: art-o-mart-backend
    runtime: node
    buildCommand: npm ci && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
```

### Railway Deployment

#### 1. Railway CLI Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
node scripts/deploy.js railway
```

#### 2. Railway Configuration
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300
  }
}
```

### Fly.io Deployment

#### 1. Fly CLI Deployment
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly
fly auth login

# Initialize app
fly launch

# Deploy
node scripts/deploy.js fly
```

#### 2. Fly Configuration
```toml
# fly.toml
app = "art-o-mart-backend"
primary_region = "dfw"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  interval = "10s"
  method = "get"
  path = "/api/health"
  timeout = "2s"
```

## Database Setup

### 1. Supabase Configuration
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Run migrations
-- (Migrations are automatically applied via the migration files)
```

### 2. Database Security
```sql
-- Enable RLS (Row Level Security) on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
```

## SSL/TLS Configuration

### Automatic SSL (Recommended)
Most platforms provide automatic SSL certificates:
- **Render**: Automatic SSL with custom domains
- **Railway**: Automatic SSL for all deployments
- **Fly.io**: Automatic SSL with edge termination

### Custom SSL Configuration
```bash
# For custom SSL certificates
mkdir -p ssl
# Place your certificates in the ssl/ directory
# Update Docker configuration to use certificates
```

## Health Checks & Monitoring

### 1. Built-in Health Check
```bash
# Test health endpoint
curl https://your-backend-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600000,
  "checks": {
    "database": { "status": "healthy" },
    "ai_service": { "status": "healthy" },
    "system_resources": { "status": "healthy" }
  }
}
```

### 2. Monitoring Setup
```bash
# Run comprehensive health check
node scripts/health-check.js

# Set up monitoring (choose one)
# - New Relic
# - DataDog
# - Application Insights
# - Custom monitoring solution
```

### 3. Log Monitoring
```bash
# View logs in production
tail -f logs/combined.log
tail -f logs/error.log

# Platform-specific log viewing
render logs                    # Render
railway logs                   # Railway
fly logs                       # Fly.io
```

## Performance Optimization

### 1. Enable Compression
```javascript
// Already configured in server.js
app.use(compression());
```

### 2. Database Connection Pooling
```env
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
```

### 3. Caching Strategy
```env
CACHE_DEFAULT_TTL=3600        # 1 hour
CACHE_SHORT_TTL=300           # 5 minutes
CACHE_LONG_TTL=86400          # 24 hours
```

### 4. Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000   # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100   # Requests per window
```

## Security Checklist

### Pre-Deployment Security
- [ ] Environment variables are properly set
- [ ] JWT secret is secure (32+ characters)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are configured
- [ ] Input validation is implemented
- [ ] SQL injection protection is active
- [ ] XSS protection is enabled

### Post-Deployment Security
- [ ] SSL/TLS is working
- [ ] Security headers are present
- [ ] Error messages don't leak sensitive info
- [ ] Logs don't contain sensitive data
- [ ] Database access is restricted
- [ ] API endpoints require authentication
- [ ] Rate limiting is working

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
npm run logs

# Validate environment
node -e "console.log('NODE_ENV:', process.env.NODE_ENV)"

# Test dependencies
npm run health-check
```

#### 2. Database Connection Issues
```bash
# Test Supabase connection
node -e "
const { supabaseClient } = require('./config/database.js');
supabaseClient.from('products').select('count').then(console.log);
"
```

#### 3. AI Service Issues
```bash
# Test Google Gemini API
node -e "
const AIService = require('./services/aiService.js');
const ai = new AIService();
ai.generateResponse('test').then(console.log).catch(console.error);
"
```

#### 4. Memory Issues
```bash
# Check memory usage
node scripts/health-check.js | grep memory

# Optimize memory
export NODE_OPTIONS="--max-old-space-size=512"
```

#### 5. Performance Issues
```bash
# Enable performance logging
export ENABLE_PERFORMANCE_LOGGING=true

# Check slow queries
grep "slow" logs/combined.log
```

### Debugging Tools

#### 1. Health Check Script
```bash
# Comprehensive health check
node scripts/health-check.js

# Specific checks
node scripts/health-check.js --check=database
node scripts/health-check.js --check=ai_service
```

#### 2. Log Analysis
```bash
# Error analysis
grep -i error logs/error.log | tail -20

# Performance analysis
grep -i slow logs/combined.log | tail -20

# Security analysis
grep -i suspicious logs/combined.log | tail -20
```

#### 3. Database Analysis
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries (if using PostgreSQL)
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Check application health
- [ ] Review error logs
- [ ] Monitor resource usage

#### Weekly
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Performance analysis
- [ ] Database maintenance

#### Monthly
- [ ] Security audit
- [ ] Backup verification
- [ ] Capacity planning
- [ ] Documentation updates

### Backup Strategy

#### 1. Database Backups
```bash
# Supabase automatic backups are enabled by default
# Configure additional backup retention if needed
```

#### 2. File Backups
```bash
# Backup uploaded files
tar -czf backups/files-$(date +%Y%m%d).tar.gz uploads/
```

#### 3. Configuration Backups
```bash
# Backup configuration
cp .env.production backups/env-$(date +%Y%m%d).backup
```

### Updates and Patches

#### 1. Dependency Updates
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit fix
```

#### 2. Application Updates
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Run tests
npm test

# Deploy
node scripts/deploy.js <platform>
```

#### 3. Rollback Procedure
```bash
# Rollback deployment
node scripts/deploy.js <platform> --rollback

# Verify rollback
curl https://your-backend-domain.com/api/health
```

## Support

### Getting Help
- Check the [troubleshooting](#troubleshooting) section
- Review application logs
- Test with the health check script
- Contact the development team

### Emergency Procedures
1. Check application status
2. Review error logs
3. Verify database connectivity
4. Check external service status
5. Escalate to on-call engineer

### Monitoring Alerts
Configure alerts for:
- Application downtime
- High error rates
- Database connection issues
- Memory/CPU usage spikes
- Security events

---

## Appendix

### A. Environment Variables Reference
See [.env.production.example](.env.production.example) for complete list.

### B. API Endpoints
- `GET /api/health` - Health check
- `GET /api/agents/status` - Agent status
- `GET /api/products` - Product listings
- `POST /api/auth/login` - User authentication

### C. Platform Documentation Links
- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Fly.io Documentation](https://fly.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API](https://cloud.google.com/vertex-ai/docs)

### D. Security Best Practices
- Use environment variables for secrets
- Enable HTTPS everywhere
- Implement proper authentication
- Set up monitoring and alerting
- Regular security audits
- Keep dependencies updated