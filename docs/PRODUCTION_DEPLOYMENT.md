# Art-O-Mart Production Deployment Guide

This guide provides clear, step-by-step instructions for deploying Art-O-Mart to production using recommended technologies and services.

## Deployment Architecture

Art-O-Mart follows a **modern serverless-first approach** with fallback to containerized deployment:

### **Recommended: Serverless Deployment**
- **Frontend**: Vercel (primary) or Netlify (alternative)
- **Backend**: Express.js on VPS/cloud with Nginx reverse proxy
- **Database**: Supabase PostgreSQL (managed)
- **Monitoring**: Sentry + basic observability stack

### **Alternative: Full Docker Stack**
- **Full Stack**: Docker Compose with all services
- **Orchestration**: Docker Swarm or Kubernetes (optional)
- **Monitoring**: Prometheus + Grafana + AlertManager

## Quick Start: Serverless Deployment (Recommended)

### Step 1: Frontend Deployment (Vercel)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Configure Environment Variables**
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SENTRY_DSN=your_sentry_dsn
   VITE_APP_URL=https://your-domain.vercel.app
   ```

3. **Custom Domain** (Optional)
   - Add domain in Vercel dashboard
   - Configure DNS records
   - SSL is automatic

### Step 2: Backend Deployment (VPS/Cloud)

1. **Server Setup**
   ```bash
   # Install Node.js, PM2, Nginx
   sudo apt update
   sudo apt install nodejs npm nginx
   npm install -g pm2
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd Art-O-Mart-Gen-AI-Exchange-Hackathon-H2S/backend
   
   # Install dependencies
   npm install --production
   
   # Start with PM2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

3. **Nginx Configuration**
   ```nginx
   # /etc/nginx/sites-available/artomart-api
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Step 3: Database Setup (Supabase)

1. **Create Project**
   - Sign up at supabase.com
   - Create new project
   - Note down URL and anon key

2. **Run Migrations**
   ```bash
   # Install Supabase CLI
   npm install -g @supabase/cli
   
   # Link project
   supabase link --project-ref your-project-ref
   
   # Push migrations
   supabase db push
   ```

## Alternative: Docker Compose Deployment

### Prerequisites
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Deployment Steps

1. **Environment Configuration**
   ```bash
   # Create .env.production file
   cp .env.example .env.production
   # Edit with production values
   ```

2. **Deploy Stack**
   ```bash
   # Build and start services
   docker-compose -f docker-compose.prod.yml up -d
   
   # Check status
   docker-compose -f docker-compose.prod.yml ps
   ```

3. **SSL Setup** (Let's Encrypt)
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Obtain certificates
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## Monitoring and Observability

### Basic Monitoring (Included)
- **Error Tracking**: Sentry (configured in monitoring.js)
- **Health Checks**: Built-in `/health` endpoints
- **Logging**: Structured logging with Winston

### Advanced Monitoring (Docker Stack)
- **Metrics**: Prometheus + Grafana
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Alerting**: AlertManager + PagerDuty/Slack

## Security Checklist

### Pre-Deployment
- [ ] Update all dependencies (`npm audit fix`)
- [ ] Configure environment variables securely
- [ ] Enable SSL/TLS certificates
- [ ] Set up error tracking (Sentry)
- [ ] Configure CORS policies
- [ ] Enable rate limiting

### Post-Deployment
- [ ] Test all critical user journeys
- [ ] Verify health check endpoints
- [ ] Monitor error rates and performance
- [ ] Set up backup procedures
- [ ] Document incident response plan

## Performance Optimization

### Frontend (Vercel/Netlify)
- **Build Optimization**: Automatic via platform
- **CDN**: Global edge network included
- **Compression**: Gzip/Brotli enabled by default
- **Image Optimization**: Automatic with Vercel Image Optimization

### Backend
- **Reverse Proxy**: Nginx with caching
- **Database**: Connection pooling via Supabase
- **Static Assets**: Serve via CDN
- **Session Storage**: Redis for scalability

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `FRONTEND_URL` environment variable
   - Verify origin in CORS middleware

2. **Database Connection Issues**
   - Verify Supabase credentials
   - Check network connectivity
   - Review connection string format

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review environment variables

### Debug Commands
```bash
# Check backend logs
pm2 logs artomart-backend

# Check Docker logs
docker-compose -f docker-compose.prod.yml logs backend

# Check Nginx status
sudo systemctl status nginx

# Test API connectivity
curl -I http://your-api-domain.com/health
```

## Scaling Considerations

### Horizontal Scaling
- **Frontend**: Automatic with Vercel/Netlify
- **Backend**: Multiple PM2 instances or Docker replicas
- **Database**: Supabase handles scaling automatically

### Performance Monitoring
- Set up alerts for response time > 2s
- Monitor error rates > 1%
- Track memory and CPU usage
- Database query performance monitoring

This deployment guide focuses on **production-ready, maintainable solutions** using proven technologies and services. For advanced requirements, consider consulting with a DevOps engineer or cloud architect.