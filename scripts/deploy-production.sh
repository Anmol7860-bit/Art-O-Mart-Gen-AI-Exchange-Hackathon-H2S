#!/bin/bash

# Art-O-Mart Production Deployment Script
# This script deploys your marketplace to production with all required services

set -e

echo "🎨 Art-O-Mart Production Deployment"
echo "===================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.production.template to .env and configure your values"
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY" 
    "SUPABASE_SERVICE_ROLE_KEY"
    "STRIPE_SECRET_KEY"
    "OPENAI_API_KEY"
)

echo "🔍 Validating environment variables..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env file"
        exit 1
    fi
done
echo "✅ Environment variables validated"

# Build frontend
echo "🏗️  Building frontend..."
npm run build
echo "✅ Frontend built successfully"

# Deploy based on chosen platform
deployment_platform=${1:-"vercel"}

case $deployment_platform in
    "vercel")
        echo "🚀 Deploying to Vercel..."
        npx vercel --prod --confirm
        ;;
    "netlify") 
        echo "🚀 Deploying to Netlify..."
        npx netlify deploy --prod --dir=dist
        ;;
    "railway")
        echo "🚀 Deploying to Railway..."
        railway up --service frontend
        ;;
    *)
        echo "❌ Unknown deployment platform: $deployment_platform"
        echo "Supported platforms: vercel, netlify, railway"
        exit 1
        ;;
esac

echo "✅ Frontend deployed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Set up your domain and SSL certificates"
echo "2. Configure Stripe webhooks for payment processing"  
echo "3. Test the complete customer flow"
echo "4. Set up monitoring and alerts"
echo ""
echo "Your Art-O-Mart marketplace is ready for customers! 🎉"