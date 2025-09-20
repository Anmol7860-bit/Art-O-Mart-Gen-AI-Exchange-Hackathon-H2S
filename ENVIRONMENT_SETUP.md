# Environment Setup Guide

This guide will help you configure all required environment variables for the Art-O-Mart marketplace application.

## 📋 Overview

Art-O-Mart consists of two main components:
- **Frontend**: React application built with Vite
- **Backend**: Node.js Express server with AI agents

Both components require specific environment variables to function properly.

## 🚀 Quick Start

1. **Clone the repository** (if you haven't already)
2. **Set up Supabase** (see [Supabase Setup](#supabase-setup))
3. **Get Google Gemini API key** (see [Google Gemini Setup](#google-gemini-setup))
4. **Configure environment files** (see sections below)
5. **Start both applications**

## 🗄️ Supabase Setup

Supabase provides the database and authentication for Art-O-Mart.

### Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `art-o-mart` (or any name you prefer)
   - **Database Password**: Create a strong password
   - **Region**: Choose the closest region to your users
6. Click "Create new project"
7. Wait for the project to be created (this takes a few minutes)

### Step 2: Get API Credentials

1. In your Supabase dashboard, go to **Settings > API**
2. Copy the following values:
   - **Project URL** (looks like `https://your-project-ref.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **service_role** key (⚠️ Keep this secure! It has admin privileges)

### Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Run the migration file located at `supabase/migrations/20250917163948_art_o_mart_marketplace.sql`
3. This will create all necessary tables and relationships

## 🤖 Google Gemini Setup

Google Gemini provides AI functionality for the application.

### Step 1: Get API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Choose "Create API key in new project" or select an existing project
5. Copy the generated API key (starts with `AI...`)

⚠️ **Important**: Keep this API key secure and never commit it to version control.

## 📁 Frontend Environment Configuration

### Step 1: Create .env file

In the root directory (same level as `package.json`), create a `.env` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API Configuration
VITE_API_URL=http://localhost:5000/api

# WebSocket Configuration
VITE_WS_URL=http://localhost:5000

# Application Configuration
VITE_APP_NAME=Art-O-Mart
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_WEBSOCKETS=true
VITE_ENABLE_ANALYTICS=false

# Development Settings
VITE_DEBUG_MODE=false
VITE_MOCK_DATA=false
```

### Step 2: Replace Placeholder Values

- Replace `https://your-project-ref.supabase.co` with your actual Supabase Project URL
- Replace `your-anon-key-here` with your actual Supabase anon public key

### Frontend Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIs...` |
| `VITE_API_URL` | No | Backend API base URL | `http://localhost:5000/api` |
| `VITE_WS_URL` | No | WebSocket server URL | `http://localhost:5000` |
| `VITE_APP_NAME` | No | Application display name | `Art-O-Mart` |
| `VITE_ENABLE_AI_FEATURES` | No | Enable/disable AI features | `true` |
| `VITE_DEBUG_MODE` | No | Enable debug logging | `false` |

## 🔧 Backend Environment Configuration

### Step 1: Create backend/.env file

In the `backend/` directory, create a `.env` file:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Google Gemini Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-here
JWT_EXPIRY=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:4028

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# AI Agent Configuration
AI_MODEL=gemini-2.0-flash-001
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### Step 2: Replace Placeholder Values

1. **GEMINI_API_KEY**: Your Google Gemini API key from the setup above
2. **SUPABASE_URL**: Same Supabase URL used in frontend
3. **SUPABASE_SERVICE_KEY**: Your Supabase service_role key (⚠️ keep secure!)
4. **SUPABASE_ANON_KEY**: Same anon key used in frontend
5. **JWT_SECRET**: Generate a secure secret (see below)

### Step 3: Generate JWT Secret

Run this command to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as your `JWT_SECRET` value.

### Backend Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key | `AI...` |
| `SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | Supabase service role key | `eyJhbGciOiJIUzI1NiIs...` |
| `JWT_SECRET` | ✅ Yes | JWT signing secret | `a1b2c3d4e5f6...` |
| `PORT` | No | Server port | `5000` |
| `NODE_ENV` | No | Environment mode | `development` |
| `FRONTEND_URL` | No | Frontend URL for CORS | `http://localhost:4028` |

## 🏃 Running the Applications

### Start Backend Server

```bash
cd backend
npm install
npm start
```

The backend server will:
- Validate all environment variables
- Display configuration summary
- Start on the configured port (default: 5000)
- Initialize AI agents
- Set up WebSocket connections

### Start Frontend Application

```bash
# From the root directory
npm install
npm run dev
```

The frontend will:
- Validate environment configuration
- Display helpful error messages if configuration is missing
- Start the Vite development server (usually on port 4028)

## 🔍 Troubleshooting

### Environment Validation Errors

Both applications include built-in environment validation that will show helpful error messages if configuration is missing or invalid.

#### Frontend Issues

If you see an environment configuration error screen:

1. Check that your `.env` file is in the root directory (same level as `package.json`)
2. Ensure all required variables are set with actual values (not placeholders)
3. Verify your Supabase URL format is correct
4. Make sure your Supabase anon key is complete and not truncated

#### Backend Issues

If the backend fails to start with environment errors:

1. Check that your `backend/.env` file exists and is properly formatted
2. Verify your Gemini API key is valid and correctly formatted
3. Ensure your Supabase service key is the service_role key (not anon key)
4. Generate a new JWT secret if the current one is invalid

### Common Issues

#### 1. "Cannot reach backend API"

**Symptoms**: Frontend loads but can't communicate with backend
**Solutions**:
- Ensure backend server is running on port 5000
- Check `VITE_API_URL` in frontend `.env` matches backend URL
- Verify CORS configuration includes your frontend URL

#### 2. "Supabase connection failed"

**Symptoms**: Database operations fail
**Solutions**:
- Double-check Supabase URL and keys
- Ensure database schema is properly migrated
- Verify network connectivity to Supabase

#### 3. "AI features not working"

**Symptoms**: AI agents return errors
**Solutions**:
- Verify Gemini API key is valid and has quota
- Check API key permissions and billing account
- Ensure `VITE_ENABLE_AI_FEATURES=true` in frontend

#### 4. "WebSocket connection failed"

**Symptoms**: Real-time features don't work
**Solutions**:
- Verify `VITE_WS_URL` points to backend server
- Check firewall settings for WebSocket connections
- Ensure backend server is properly started

## 🔒 Security Best Practices

### Development Environment

- Never commit `.env` files to version control
- Use different API keys for development and production
- Rotate API keys regularly
- Keep service role keys secure and limit access

### Production Environment

- Use environment variable injection in your deployment platform
- Enable rate limiting and monitoring
- Use HTTPS for all connections
- Implement proper access controls
- Monitor API usage and costs

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Google AI Studio](https://makersuite.google.com/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)

## 🆘 Getting Help

If you're still having issues after following this guide:

1. Check the browser console for detailed error messages
2. Review server logs for backend issues
3. Verify all environment variables are correctly formatted
4. Ensure all required services (Supabase, Gemini API) are operational
5. Create an issue in the GitHub repository with:
   - Error messages (remove any sensitive information)
   - Steps you've already tried
   - Your environment setup (without sensitive keys)

---

**Note**: This guide assumes a development environment. For production deployment, additional configuration for domains, SSL certificates, and production database setup will be required.