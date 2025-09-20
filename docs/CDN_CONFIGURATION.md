# CDN Configuration for Art-O-Mart

This document provides comprehensive guidance for setting up Content Delivery Network (CDN) configuration for the Art-O-Mart marketplace to ensure optimal performance and global accessibility.

## CDN Strategy

### Static Assets Distribution
- **Frontend Assets**: JavaScript, CSS, images, fonts
- **Media Content**: Product images, artisan portfolios, cultural content
- **API Caching**: Selected API endpoints with appropriate cache policies

### Recommended CDN Providers

#### Option 1: CloudFlare (Recommended)
```yaml
# CloudFlare Configuration
zones:
  - name: artomart.com
    type: full
    settings:
      ssl: flexible # or strict for end-to-end
      cache_level: aggressive
      browser_cache_ttl: 31536000 # 1 year for static assets
      edge_cache_ttl: 2592000 # 30 days
      
cache_rules:
  - name: "Static Assets"
    expression: '(http.request.uri.path matches "\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$")'
    action: cache
    cache_ttl: 31536000
    
  - name: "API Responses"
    expression: '(http.request.uri.path contains "/api/products" and http.request.method eq "GET")'
    action: cache
    cache_ttl: 3600 # 1 hour
    
  - name: "HTML Pages"
    expression: '(http.request.uri.path matches "\\.(html|htm)$" or http.request.uri.path eq "/")'
    action: cache
    cache_ttl: 300 # 5 minutes
```

#### Option 2: AWS CloudFront
```yaml
# CloudFront Distribution Configuration
distributions:
  - domain_name: artomart.com
    origins:
      - domain_name: origin.artomart.com
        origin_path: ""
        custom_origin_config:
          http_port: 80
          https_port: 443
          origin_protocol_policy: https-only
    
    default_cache_behavior:
      target_origin_id: origin.artomart.com
      viewer_protocol_policy: redirect-to-https
      allowed_methods: [GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE]
      cached_methods: [GET, HEAD, OPTIONS]
      compress: true
      
    cache_behaviors:
      - path_pattern: "/static/*"
        target_origin_id: origin.artomart.com
        ttl:
          default_ttl: 86400 # 1 day
          max_ttl: 31536000 # 1 year
        compress: true
        
      - path_pattern: "/api/products*"
        target_origin_id: origin.artomart.com
        ttl:
          default_ttl: 3600 # 1 hour
          max_ttl: 86400 # 1 day
        compress: true
        
    price_class: PriceClass_All
    geo_restriction:
      restriction_type: none
```

## Infrastructure as Code Templates

### Terraform Configuration (AWS CloudFront + S3)
```hcl
# terraform/cdn.tf

resource "aws_s3_bucket" "static_assets" {
  bucket = "artomart-static-assets"
}

resource "aws_s3_bucket_policy" "static_assets_policy" {
  bucket = aws_s3_bucket.static_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.static_assets.arn}/*"
      }
    ]
  })
}

resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.static_assets.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  origin {
    domain_name = "api.artomart.com"
    origin_id   = "API-Origin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = ["artomart.com", "www.artomart.com"]

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.static_assets.id}"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # Cache behavior for API calls
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "API-Origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward = "all"
      }
    }

    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 3600
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern           = "*.js"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.static_assets.id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 31536000
    default_ttl            = 31536000
    max_ttl                = 31536000
  }

  price_class = "PriceClass_All"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = "production"
    Project     = "artomart"
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
  }
}

resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "Art-O-Mart CloudFront OAI"
}
```

### Docker Integration for CDN Push
```dockerfile
# docker/Dockerfile.cdn-deploy
FROM node:18-alpine

WORKDIR /app

# Install AWS CLI and build tools
RUN apk add --no-cache aws-cli

# Copy build artifacts
COPY dist/ ./dist/
COPY scripts/deploy-cdn.sh ./scripts/

# Set permissions
RUN chmod +x ./scripts/deploy-cdn.sh

CMD ["./scripts/deploy-cdn.sh"]
```

```bash
#!/bin/bash
# scripts/deploy-cdn.sh

set -e

echo "Deploying static assets to CDN..."

# Upload to S3 with proper cache headers
aws s3 sync ./dist/ s3://${AWS_S3_BUCKET}/ \
  --delete \
  --cache-control "max-age=31536000,public,immutable" \
  --exclude "*.html" \
  --exclude "index.html"

# Upload HTML files with shorter cache
aws s3 sync ./dist/ s3://${AWS_S3_BUCKET}/ \
  --cache-control "max-age=300,public" \
  --include "*.html"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"

echo "CDN deployment completed successfully!"
```

## Build Integration

### Vite Configuration for CDN
```javascript
// vite.config.mjs - CDN Configuration
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Ensure consistent naming for CDN caching
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const extType = info[info.length - 1]
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `images/[name].[hash][extname]`
          }
          if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
            return `fonts/[name].[hash][extname]`
          }
          return `assets/[name].[hash][extname]`
        }
      }
    },
    // Generate source maps for production debugging
    sourcemap: true
  },
  // Configure public path for CDN
  base: process.env.VITE_CDN_URL || '/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  }
})
```

## Monitoring and Analytics

### CDN Performance Metrics
```yaml
# Monitoring Configuration
metrics:
  cloudfront:
    - cache_hit_rate
    - origin_latency
    - error_rate
    - bandwidth_usage
    
  alerts:
    - name: "Low Cache Hit Rate"
      condition: "cache_hit_rate < 0.85"
      severity: warning
      
    - name: "High Origin Latency"
      condition: "origin_latency > 2000ms"
      severity: critical
      
    - name: "CDN Error Rate High"
      condition: "error_rate > 0.01"
      severity: critical
```

## Security Configuration

### CDN Security Headers
```yaml
security_headers:
  - name: "Content-Security-Policy"
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.artomart.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://cdn.artomart.com;"
    
  - name: "X-Frame-Options"
    value: "DENY"
    
  - name: "X-Content-Type-Options"
    value: "nosniff"
    
  - name: "Strict-Transport-Security"
    value: "max-age=31536000; includeSubDomains"
```

## Implementation Checklist

- [ ] Choose CDN provider (CloudFlare/AWS CloudFront)
- [ ] Configure DNS settings
- [ ] Set up SSL certificates
- [ ] Configure cache policies
- [ ] Implement build script integration
- [ ] Set up monitoring and alerts
- [ ] Test CDN performance
- [ ] Document purge/invalidation procedures
- [ ] Set up automated deployment pipeline
- [ ] Configure security headers and policies

## Performance Targets

- **Cache Hit Rate**: > 85%
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Origin Load Reduction**: > 80%

This CDN configuration ensures optimal global performance for Art-O-Mart while maintaining security and reliability standards.