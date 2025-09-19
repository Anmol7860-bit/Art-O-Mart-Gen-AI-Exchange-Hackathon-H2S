# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Start development server (runs on port 4028)
npm start

# Build for production with source maps
npm run build

# Preview production build locally
npm run serve
```

### Environment Setup
```bash
# Install dependencies
npm install

# Environment configuration - create .env with:
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=http://localhost:4028
```

### Database Operations
```bash
# Reset database (if using Supabase CLI)
supabase db reset

# Apply migration manually - use file:
# supabase/migrations/20250917163948_art_o_mart_marketplace.sql
```

## Architecture Overview

### Core System Structure
Art-O-Mart is a React 18 marketplace application built with Vite, using Supabase as the backend. The application follows a dual-role system supporting both customers and artisans.

**Key Architectural Patterns:**
- **Component-based React architecture** with functional components and hooks
- **Context-based state management** for authentication and user profiles
- **Route-based page organization** with React Router v6
- **Utility-first styling** with TailwindCSS and custom design system
- **Backend-as-a-Service** integration with Supabase for auth, database, and storage

### Main Application Flow
1. **Entry Point**: `src/index.jsx` → `src/App.jsx` → `src/Routes.jsx`
2. **Authentication**: `AuthProvider` wraps the entire application providing user context
3. **Routing**: Uses React Router with error boundaries and scroll management
4. **State Management**: Context-based authentication with Supabase real-time subscriptions

### Database Integration
- **Supabase Client**: Configured in `src/lib/supabase.js` with environment variables
- **Authentication Context**: Handles user sessions, profiles, and auth operations
- **Row Level Security**: Database-level security implemented in Supabase
- **Profile Management**: Separate user_profiles table linked to auth users

### Component Architecture
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (buttons, forms, etc.)
│   └── ErrorBoundary.jsx # Error handling wrapper
├── pages/               # Route-specific page components
│   ├── ai-shopping-assistant/
│   ├── artisan-dashboard/
│   ├── marketplace-homepage/
│   └── [other pages]/
├── contexts/            # React contexts for global state
│   └── AuthContext.jsx  # Authentication and user management
├── lib/                 # Configuration and setup
│   └── supabase.js      # Supabase client configuration
└── utils/               # Utility functions and helpers
```

## Key Development Patterns

### Authentication Flow
The application uses a sophisticated authentication system:
- **Synchronous auth state handling** to meet Supabase requirements
- **Separate profile operations** to avoid callback conflicts
- **Fire-and-forget profile loading** for better performance
- **Comprehensive error handling** with network fallbacks

### Custom Design System
Built on TailwindCSS with extensive customization:
- **Custom color palette** using CSS variables for theming
- **Artisan-focused design** with warm earth tones
- **Responsive typography** with font families for different contexts
- **Component variants** using class-variance-authority
- **Animation system** with Framer Motion integration

### Route Organization
Routes are centrally managed in `src/Routes.jsx`:
- Root `/` shows AI Shopping Assistant (primary experience)
- Authentication routes: `/login`, `/register`, `/simple-register`
- Core marketplace: `/marketplace-homepage`, `/shopping-cart`
- Artisan features: `/artisan-dashboard`, `/artisan-storefront`
- User management: `/profile`, `/settings`

## Important Project Context

### Hackathon Project
This is a hackathon project for the Gen AI Exchange Hackathon by team "Cogito Coders". The theme focuses on empowering traditional artisans through modern technology.

### Dual User Roles
The platform serves two primary user types:
- **Customers**: Browse, purchase, and review handcrafted products
- **Artisans**: Manage inventory, process orders, and build their brand
- **Role-based UI**: Different experiences and permissions based on user type

### Supabase Backend
All backend operations use Supabase:
- **Authentication**: Email/password and social login options
- **Database**: PostgreSQL with Row Level Security
- **Storage**: File uploads with type/size restrictions
- **Real-time**: Live updates for orders and notifications

### Build Configuration
- **Vite**: Fast build tool with HMR on port 4028
- **Build Output**: Uses 'build' directory instead of 'dist'
- **Source Maps**: Enabled in production builds for debugging
- **Component Tagging**: DhiWise integration for component tracking

### Environment Requirements
- **Node.js**: v16.x or higher required
- **Supabase Account**: Required for backend services
- **Environment Variables**: Must be configured before running
- **Port 4028**: Default development server port (strict port configuration)

### Critical Dependencies
The project has marked critical dependencies that should not be modified:
- Core React and React-DOM
- Redux Toolkit for state management
- React Router for navigation
- Vite and build tools
- TailwindCSS for styling

## Troubleshooting Notes

### Port Issues
Development server runs on port 4028 with strict port enforcement. If port is in use:
```bash
lsof -ti:4028 | xargs kill -9
```

### Environment Variables
Verify Supabase configuration:
```bash
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

### Build Issues
Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Authentication Context
The AuthContext uses a specific pattern to handle Supabase auth callbacks synchronously while managing profile operations asynchronously. Do not modify the auth state change handlers without understanding this constraint.