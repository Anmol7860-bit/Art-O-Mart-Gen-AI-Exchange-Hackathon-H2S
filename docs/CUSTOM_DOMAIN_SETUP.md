# Custom Domain and SSL Setup Guide

This guide provides step-by-step instructions for configuring custom domains and SSL certificates for your Art-O-Mart frontend deployment on both Vercel and Netlify.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Domain Purchase and Setup](#domain-purchase-and-setup)
3. [Vercel Custom Domain Setup](#vercel-custom-domain-setup)
4. [Netlify Custom Domain Setup](#netlify-custom-domain-setup)
5. [DNS Configuration](#dns-configuration)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Environment Variable Updates](#environment-variable-updates)
8. [Verification and Testing](#verification-and-testing)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up a custom domain, ensure you have:

- ✅ Successfully deployed your frontend to Vercel or Netlify
- ✅ Access to a domain registrar account (GoDaddy, Namecheap, Google Domains, etc.)
- ✅ Admin access to your deployment platform (Vercel/Netlify)
- ✅ Basic understanding of DNS management

## Domain Purchase and Setup

### Recommended Domain Registrars

1. **Google Domains** - Easy integration, competitive pricing
2. **Namecheap** - Good support, reasonable prices
3. **GoDaddy** - Popular choice, extensive features
4. **Cloudflare Registrar** - Excellent security features

### Domain Selection Guidelines

- Choose a memorable, brandable domain
- Consider `.com` for maximum compatibility
- Avoid hyphens and numbers if possible
- Check trademark conflicts

### Example Domain Suggestions
- `artomart.com` (primary)
- `art-o-mart.com` (alternative)
- `culturalmarketplace.com` (descriptive)
- `aiartisans.com` (AI-focused)

## Vercel Custom Domain Setup

### Step 1: Access Domain Settings

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your Art-O-Mart project
3. Go to **Settings** → **Domains**

### Step 2: Add Custom Domain

1. Click **Add Domain**
2. Enter your domain name (e.g., `artomart.com`)
3. Click **Add**

### Step 3: Configure DNS Records

Vercel will provide you with DNS records to configure. Typical setup:

```dns
# Root domain (A record)
Type: A
Name: @ (or leave blank)
Value: 76.76.19.61

# www subdomain (CNAME)
Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

### Step 4: Verify Domain

1. Configure the DNS records with your registrar
2. Wait for DNS propagation (up to 48 hours, usually 5-10 minutes)
3. Vercel will automatically verify and issue SSL certificates

### Vercel CLI Method (Alternative)

```bash
# Add domain via CLI
vercel domains add artomart.com

# List domains
vercel domains ls

# Remove domain if needed
vercel domains rm artomart.com
```

## Netlify Custom Domain Setup

### Step 1: Access Domain Management

1. Log into your [Netlify Dashboard](https://app.netlify.com)
2. Navigate to your Art-O-Mart site
3. Go to **Site Settings** → **Domain Management**

### Step 2: Add Custom Domain

1. Click **Add custom domain**
2. Enter your domain name (e.g., `artomart.com`)
3. Click **Verify**
4. Choose **Yes, add domain** if you own it

### Step 3: Configure DNS

Netlify provides several DNS configuration options:

#### Option A: Use Netlify DNS (Recommended)
1. Go to **Domain Management** → **Netlify DNS**
2. Click **Set up Netlify DNS**
3. Update nameservers at your registrar:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```

#### Option B: External DNS
Configure these records with your DNS provider:
```dns
# Root domain (A record)
Type: A
Name: @ (or leave blank)  
Value: 75.2.60.5

# www subdomain (CNAME)
Type: CNAME
Name: www
Value: your-site-name.netlify.app
```

### Step 4: SSL Certificate

1. Go to **Site Settings** → **Domain Management** → **HTTPS**
2. Click **Verify DNS configuration**
3. Once verified, click **Provision certificate**
4. Enable **Force HTTPS**

## DNS Configuration

### Common DNS Record Types

| Record Type | Purpose | Example |
|-------------|---------|---------|
| A | Points domain to IP address | `@ → 76.76.19.61` |
| CNAME | Points subdomain to another domain | `www → cname.vercel-dns.com` |
| MX | Mail server routing | For email functionality |
| TXT | Domain verification | For platform verification |

### DNS Propagation

- **Time**: 5 minutes to 48 hours
- **Check Status**: Use tools like [whatsmydns.net](https://whatsmydns.net)
- **Speed up**: Use lower TTL values (300 seconds)

### Example DNS Configuration

```dns
# Primary domain
Type: A
Name: @
Value: [Platform IP Address]
TTL: 300

# www subdomain  
Type: CNAME
Name: www
Value: [Platform CNAME]
TTL: 300

# API subdomain (optional)
Type: CNAME
Name: api
Value: [Backend URL]
TTL: 300
```

## SSL Certificate Setup

### Automatic SSL (Recommended)

Both Vercel and Netlify provide free SSL certificates via Let's Encrypt:

**Vercel**:
- Automatic SSL for all domains
- Includes SAN certificates for multiple subdomains
- Auto-renewal every 90 days

**Netlify**:
- Free SSL via Let's Encrypt
- Manual renewal option available
- Wildcard certificates supported

### Custom SSL Certificate

If you need a custom SSL certificate:

#### Vercel Custom SSL
1. Go to **Project Settings** → **Domains**  
2. Click on your domain
3. Select **Custom Certificate**
4. Upload certificate and private key

#### Netlify Custom SSL
1. Go to **Site Settings** → **Domain Management** → **HTTPS**
2. Click **Install custom certificate**
3. Paste certificate, private key, and intermediate certificates

### SSL Verification

Test SSL setup:
```bash
# Check certificate
openssl s_client -connect artomart.com:443

# Check with curl
curl -I https://artomart.com

# Online tools
# - SSL Labs: https://www.ssllabs.com/ssltest/
# - SSL Checker: https://www.sslshopper.com/ssl-checker.html
```

## Environment Variable Updates

After domain setup, update your environment variables:

### Update .env.production

```bash
# Domain Configuration
VITE_DOMAIN=artomart.com
VITE_APP_URL=https://artomart.com
VITE_CDN_URL=https://artomart.com

# API Configuration (if using custom API subdomain)
VITE_API_URL=https://api.artomart.com
VITE_BACKEND_URL=https://api.artomart.com

# WebSocket URL
VITE_WS_URL=wss://api.artomart.com
```

### Platform Environment Variables

Update environment variables in your platform dashboard:

**Vercel**:
1. Go to **Project Settings** → **Environment Variables**
2. Update relevant VITE_ variables
3. Redeploy to apply changes

**Netlify**:
1. Go to **Site Settings** → **Environment Variables**  
2. Update variables
3. Trigger new deployment

## Verification and Testing

### Domain Verification Checklist

- [ ] Domain resolves to correct IP address
- [ ] HTTPS works without warnings
- [ ] SSL certificate is valid and trusted
- [ ] Both www and non-www versions work
- [ ] Redirects work correctly (www → non-www or vice versa)
- [ ] All pages load correctly
- [ ] API calls work with new domain
- [ ] WebSocket connections work (if applicable)

### Testing Commands

```bash
# Test domain resolution
nslookup artomart.com
dig artomart.com

# Test HTTP/HTTPS
curl -I http://artomart.com
curl -I https://artomart.com

# Test redirects
curl -I -L http://www.artomart.com

# Test SSL
openssl s_client -connect artomart.com:443 -servername artomart.com
```

### Browser Testing

1. **Clear browser cache and cookies**
2. **Test in incognito/private mode**
3. **Verify SSL certificate** (click lock icon)
4. **Test all major pages and functionality**
5. **Check browser console for errors**

## Troubleshooting

### Common Issues and Solutions

#### Domain Not Resolving
**Symptoms**: DNS_PROBE_FINISHED_NXDOMAIN error
**Solutions**:
- Verify DNS records are correctly configured
- Check DNS propagation status
- Ensure nameservers are updated at registrar
- Wait for full propagation (up to 48 hours)

#### SSL Certificate Issues
**Symptoms**: "Not Secure" warning, SSL errors
**Solutions**:
- Verify domain ownership with platform
- Check that DNS records point to correct platform
- Force SSL certificate regeneration
- Ensure all subdomains are included

#### Mixed Content Errors
**Symptoms**: "Mixed Content" warnings in browser
**Solutions**:
- Update all HTTP links to HTTPS
- Check environment variables use HTTPS URLs
- Verify API calls use HTTPS
- Update WebSocket connections to WSS

#### Redirect Loop
**Symptoms**: ERR_TOO_MANY_REDIRECTS
**Solutions**:
- Check platform redirect settings
- Verify DNS configuration
- Clear browser cache
- Review custom redirect rules

### DNS Propagation Tools

- [whatsmydns.net](https://whatsmydns.net) - Global DNS checker
- [dnschecker.org](https://dnschecker.org) - DNS propagation checker  
- [mxtoolbox.com](https://mxtoolbox.com) - Comprehensive DNS tools

### SSL Testing Tools

- [SSL Labs](https://www.ssllabs.com/ssltest/) - Comprehensive SSL testing
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html) - Quick SSL verification
- [Why No Padlock?](https://www.whynopadlock.com) - Mixed content detector

### Performance Testing

- [Google PageSpeed Insights](https://pagespeed.web.dev)
- [GTmetrix](https://gtmetrix.com)
- [WebPageTest](https://webpagetest.org)

## Advanced Configuration

### Subdomains

Set up additional subdomains for different purposes:

```dns
# API subdomain
api.artomart.com → backend-deployment-url

# Admin panel
admin.artomart.com → admin-app-url

# CDN/Assets
cdn.artomart.com → asset-delivery-url

# Staging
staging.artomart.com → staging-deployment-url
```

### Email Setup

Configure email for your domain:

```dns
# MX Records for email
Type: MX
Name: @
Value: 10 mail.artomart.com

# SPF Record
Type: TXT  
Name: @
Value: "v=spf1 include:_spf.google.com ~all"

# DMARC Record
Type: TXT
Name: _dmarc
Value: "v=DMARC1; p=quarantine; rua=mailto:admin@artomart.com"
```

### Content Delivery Network (CDN)

Consider using a CDN for better performance:

**Cloudflare**:
1. Sign up for Cloudflare
2. Add your domain
3. Update nameservers
4. Configure caching rules
5. Enable optimizations

**AWS CloudFront**:
1. Create CloudFront distribution
2. Set origin to your deployment URL
3. Configure caching behaviors
4. Update DNS to point to CloudFront

## Next Steps

After successful domain setup:

1. **Update Documentation**: Record all configuration details
2. **Monitor Performance**: Set up monitoring for uptime and performance
3. **SEO Configuration**: Submit sitemap, configure Google Search Console
4. **Analytics**: Set up Google Analytics or similar tracking
5. **Backup Domain**: Consider purchasing similar domains for protection

## Support Resources

### Vercel Support
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Support](https://vercel.com/support)

### Netlify Support  
- [Netlify Documentation](https://docs.netlify.com)
- [Netlify Community](https://community.netlify.com)
- [Netlify Support](https://www.netlify.com/support)

---

**Last Updated**: September 2025  
**Version**: 1.0  
**Maintainer**: Art-O-Mart Development Team