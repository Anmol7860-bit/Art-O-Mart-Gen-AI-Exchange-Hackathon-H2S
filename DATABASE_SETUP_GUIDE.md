# Art-O-Mart Database Setup & Migration Guide

This guide provides comprehensive instructions for setting up, migrating, and validating the Art-O-Mart database using our automated migration and validation system.

## 🚀 Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 2. Initialize database
npm run db:migrate

# 3. Validate setup
npm run db:status

# 4. Seed with test data (optional)
npm run db:seed
```

## 📋 Prerequisites

### Required Software
- **Node.js 18+** - JavaScript runtime
- **npm** - Package manager (comes with Node.js)
- **Supabase CLI** - For database management

### Environment Variables
Create a `.env` file in the project root with these variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional: Local Development
SUPABASE_LOCAL_URL=http://localhost:54321
```

### Getting Supabase Credentials
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to Settings > API
4. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_KEY` ⚠️ Keep this secret!

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies (if separate backend)
cd backend
npm install
cd ..
```

### 2. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (via npm)
npm install -g supabase

# Linux
curl -fsSL https://supabase.com/install.sh | sh
```

### 3. Initialize Supabase

```bash
# Link to your Supabase project
supabase login
supabase link --project-ref your-project-ref

# Or use local development
supabase start
```

## 📊 Database Management Commands

### Status & Health Checks

```bash
# Check database health and connection
npm run db:status

# Comprehensive migration validation  
npm run db:validate

# Backend health check (if backend is running)
cd backend && npm run db:health
```

### Migration Management

```bash
# Apply all migrations
npm run db:migrate

# Reset database (⚠️ DESTRUCTIVE - deletes all data)
npm run db:reset

# Create new migration file
supabase migration new migration_name
```

### Data Management

```bash
# Populate database with test data
npm run db:seed

# Run database tests
npm run db:test

# Backend-specific tests
cd backend && npm run test:db
cd backend && npm run test:auth
```

## 🗃️ Database Schema Overview

### Core Tables

| Table | Purpose | Key Relationships |
|-------|---------|------------------|
| `user_profiles` | User accounts & roles | → `artisan_profiles`, `orders` |
| `categories` | Product categories | ← `products` |
| `artisan_profiles` | Artisan business info | ← `products` |
| `products` | Product catalog | → `categories`, `artisan_profiles` |
| `orders` & `order_items` | Order management | → `user_profiles`, `products` |
| `product_reviews` | Customer reviews | → `products`, `user_profiles` |
| `wishlists` & `carts` | Shopping features | → `user_profiles`, `products` |
| `payments` | Payment tracking | → `orders` |

### Key Features

- **Row Level Security (RLS)** - User-based data access control
- **Real-time subscriptions** - Live updates via Supabase
- **Storage buckets** - Image and file management
- **Database triggers** - Automated user profile creation
- **Health monitoring** - Built-in health check function

## 🔧 Migration System

### Migration Files

All migrations are stored in `supabase/migrations/`:
- **`20250917163948_art_o_mart_marketplace.sql`** - Complete schema & seed data
- Migration files are timestamped and idempotent
- Each migration includes rollback instructions in comments

### Migration Features

- ✅ **Idempotent operations** - Safe to run multiple times
- ✅ **Health check RPC** - Built-in database monitoring
- ✅ **Comprehensive indexes** - Optimized query performance
- ✅ **Foreign key constraints** - Data integrity enforcement
- ✅ **Row Level Security** - User-based access control
- ✅ **Storage configuration** - Image and file handling
- ✅ **Mock data included** - Ready-to-use test data

### Configuration Files

- **`supabase/config.toml`** - Supabase CLI configuration
- **`backend/jest.config.json`** - Test framework setup
- **`scripts/`** - Database management utilities

## 🧪 Testing & Validation

### Automated Test Suites

```bash
# Run all database tests (run from backend directory)
cd backend && npm run test:all-db

# Individual test suites (run from backend directory)
cd backend && npm run test:db          # Database connectivity & schema
cd backend && npm run test:auth        # Authentication & authorization  
cd backend && npm run test:migration   # Migration validation & data integrity

# For extended test data requirements, seed additional data  
SEED_EXTENDED=true npm run db:seed
```

**Note:** Mock data completeness tests use lower thresholds by default to match migration baseline data. Set `SEED_EXTENDED=true` before running additional seeding if you need higher row counts for testing.

### Test Coverage

- **Database Connectivity** - Connection validation
- **Schema Validation** - Table structure & constraints  
- **Authentication Flow** - User registration, login, roles
- **Authorization (RLS)** - Row-level security policies
- **Data Integrity** - Foreign keys, constraints, triggers
- **Business Logic** - Application-specific validations
- **Mock Data Completeness** - Tests adapt to baseline migration data or extended seeded data
- **Performance** - Query optimization & response times

### Manual Validation

```bash
# Check all systems
npm run db:status

# Validate migration completion
npm run db:validate

# Test with sample queries
npm run db:test
```

## 🚨 Troubleshooting

### Common Issues

#### Connection Errors
```bash
❌ Database connection failed: fetch failed
```
**Solutions:**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Check internet connection
- Confirm Supabase project is active

#### Missing Tables
```bash
❌ relation "user_profiles" does not exist
```
**Solutions:**
```bash
npm run db:migrate
npm run db:validate
```

#### Permission Errors
```bash
❌ insufficient_privilege: must be owner of table
```
**Solutions:**
- Use `SUPABASE_SERVICE_KEY` for admin operations
- Check RLS policies are properly configured

#### Migration Conflicts
```bash
❌ duplicate key value violates unique constraint
```
**Solutions:**
- Migrations are idempotent - safe to re-run
- Check for data conflicts in seed data
- Use `ON CONFLICT DO NOTHING` for inserts

### Environment-Specific Issues

#### Local Development
```bash
# Start local Supabase stack
supabase start

# Use local environment variables
SUPABASE_URL=http://localhost:54321
```

#### Production Deployment
- Always validate migrations in staging first
- Use environment-specific `.env` files
- Monitor database performance after migrations

### Getting Help

1. **Check logs**: Look at browser console and server logs
2. **Run diagnostics**: `npm run db:status` for health overview
3. **Validate setup**: `npm run db:validate` for comprehensive checks
4. **Test connection**: Use Supabase Dashboard SQL editor
5. **Reset if needed**: `npm run db:reset` then `npm run db:migrate`

## 📈 Performance & Optimization

### Query Optimization

- **Indexes**: All foreign keys and frequently queried columns
- **RLS Policies**: Optimized for minimal performance impact
- **Pagination**: Built-in support for large result sets
- **Real-time**: Efficient subscriptions for live updates

### Monitoring

- **Health checks**: Automated database health monitoring
- **Performance metrics**: Query timing and resource usage
- **Error tracking**: Comprehensive error logging and reporting

### Scaling Considerations

- **Connection pooling**: Managed by Supabase
- **Read replicas**: Available in Supabase Pro plans
- **Caching**: Consider implementing application-level caching
- **CDN**: Use for static assets and images

## 🔐 Security

### Authentication
- **JWT tokens**: Secure session management
- **Password policies**: Strong password requirements
- **Email verification**: Automated verification flow

### Authorization
- **Row Level Security**: User-based data access
- **Role-based access**: Customer, Artisan, Admin roles
- **API security**: Service key protection

### Data Protection
- **Encryption**: Data encrypted at rest and in transit
- **Backup**: Automated daily backups
- **Audit logs**: Database activity tracking

## 📚 Additional Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### Support
- Check the project's GitHub issues
- Supabase Discord community
- Stack Overflow with `supabase` tag

---

## 🎯 Next Steps

1. **Complete setup**: Follow the Quick Start guide above
2. **Explore data**: Use `npm run db:seed` to populate with test data
3. **Run tests**: Execute `npm run test:db` to validate everything works
4. **Start developing**: Begin building your application features
5. **Monitor health**: Set up regular health checks in production

Happy coding! 🚀