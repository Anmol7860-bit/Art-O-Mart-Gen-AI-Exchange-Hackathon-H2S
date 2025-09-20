# SSL Certificate Placeholder
# 
# In production, replace this with your actual SSL certificate.
# You can obtain free SSL certificates from Let's Encrypt or use
# certificates from your cloud provider (AWS Certificate Manager, etc.)
#
# For Let's Encrypt with Certbot:
# sudo certbot --nginx -d artomart.com -d www.artomart.com
#
# For manual certificate setup:
# 1. Place your certificate in: /etc/nginx/ssl/cert.pem
# 2. Place your private key in: /etc/nginx/ssl/key.pem
# 3. Uncomment the SSL server block in nginx.conf
#
# Self-signed certificate for development (DO NOT USE IN PRODUCTION):
# openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#   -keyout /etc/nginx/ssl/key.pem \
#   -out /etc/nginx/ssl/cert.pem \
#   -subj "/C=US/ST=CA/L=San Francisco/O=Art-O-Mart/OU=Development/CN=localhost"

echo "SSL certificates should be placed in this directory"