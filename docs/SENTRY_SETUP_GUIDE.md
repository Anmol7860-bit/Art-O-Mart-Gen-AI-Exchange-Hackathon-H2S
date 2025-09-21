# Sentry Setup Guide for Art-O-Mart

This guide provides step-by-step instructions for setting up Sentry error tracking and performance monitoring for the Art-O-Mart application.

## Table of Contents
- [Overview](#overview)
- [Creating a Sentry Account](#creating-a-sentry-account)
- [Setting up a React Project](#setting-up-a-react-project)
- [Configuration](#configuration)
- [Performance Monitoring](#performance-monitoring)
- [Session Replay](#session-replay)
- [Error Filtering](#error-filtering)
- [User Context](#user-context)
- [Alerts and Notifications](#alerts-and-notifications)
- [Testing Integration](#testing-integration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

Sentry provides real-time error tracking and performance monitoring for the Art-O-Mart application. It helps identify and fix issues quickly, monitor application performance, and improve user experience.

### Features Enabled
- ✅ Error tracking and crash reporting
- ✅ Performance monitoring and transaction tracing
- ✅ Session replay for debugging
- ✅ User context and custom tags
- ✅ Alert notifications
- ✅ Integration with CI/CD pipeline

## Creating a Sentry Account

1. **Visit Sentry Website**
   - Go to [sentry.io](https://sentry.io)
   - Click "Get Started" or "Sign Up"

2. **Account Creation**
   - Sign up with email or GitHub/Google account
   - Choose organization name: `art-o-mart` (or your preferred name)
   - Select your plan (Free tier is sufficient for development)

3. **Organization Setup**
   - Verify your email address
   - Complete the organization setup wizard

## Setting up a React Project

1. **Create New Project**
   - Click "Create Project" in your Sentry dashboard
   - Select **React** as the platform
   - Name your project: `art-o-mart-frontend`
   - Choose your team (if applicable)

2. **Get Your DSN**
   - After creating the project, you'll see the DSN (Data Source Name)
   - Copy this DSN - it looks like:
     ```
     https://abcdef1234567890@o123456.ingest.sentry.io/7890123
     ```

3. **Install Dependencies**
   ```bash
   # Already installed in package.json
   npm install @sentry/react @sentry/tracing
   ```

## Configuration

### 1. Environment Variables

Add your Sentry DSN to `.env.production`:

```bash
# Sentry Monitoring Configuration
VITE_SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=1.0.0
```

For development, create `.env.local`:

```bash
VITE_SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_RELEASE=dev
```

### 2. Initialize Sentry

The application already has Sentry configured in `src/utils/monitoring.js`. The configuration includes:

- **Error Tracking**: Automatic error capture
- **Performance Monitoring**: Transaction tracking
- **Session Replay**: User session recording
- **User Context**: Authentication state tracking
- **Custom Tags**: Environment and feature flags

### 3. Verify Configuration

Check that Sentry is properly configured:

1. **DSN Validation**
   - Ensure your DSN doesn't contain placeholder values
   - Verify the DSN format is correct

2. **Environment Settings**
   - `VITE_SENTRY_ENVIRONMENT` should match your deployment environment
   - `VITE_SENTRY_RELEASE` should match your application version

## Performance Monitoring

### Enable Performance Monitoring

In your Sentry project settings:

1. Go to **Settings** > **Performance**
2. Enable **Performance Monitoring**
3. Set **Transaction Sample Rate**: `1.0` (100% for development, 0.1 for production)
4. Configure **Performance Rules** as needed

### Performance Features

The application monitors:
- ✅ Page load times
- ✅ API request performance
- ✅ User interactions
- ✅ Web Vitals (LCP, FID, CLS)
- ✅ Custom business metrics

## Session Replay

### Enable Session Replay

1. In Sentry project settings, go to **Settings** > **Replays**
2. Enable **Session Replay**
3. Set **Sample Rate**: `0.1` (10% of sessions)
4. Configure **Error Sample Rate**: `1.0` (100% of error sessions)

### Privacy Settings

Configure what to capture:
- ✅ User interactions
- ✅ Console logs
- ✅ Network requests (filtered)
- ❌ Sensitive form inputs (automatically masked)

## Error Filtering

### Set Up Filters

1. Go to **Settings** > **Inbound Filters**
2. Configure filters to reduce noise:

```javascript
// Already configured in monitoring.js
beforeSend(event) {
  // Filter out network errors
  if (event.exception?.values?.[0]?.type === 'NetworkError') {
    return null;
  }
  
  // Filter development errors
  if (event.environment === 'development' && 
      event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
    return null;
  }
  
  return event;
}
```

### Custom Error Boundaries

The application includes error boundaries for:
- ✅ Route-level error handling
- ✅ Component-level error isolation
- ✅ API error tracking
- ✅ WebSocket error monitoring

## User Context

### Automatic Context

The monitoring system automatically captures:
- ✅ User ID and email (when authenticated)
- ✅ User role (customer, artisan)
- ✅ Browser and device information
- ✅ Current page and route
- ✅ Feature flags and environment

### Custom Context

Add custom context for debugging:

```javascript
import { setUser, setTag, setContext } from '@sentry/react';

// Set user information
setUser({
  id: user.id,
  email: user.email,
  role: user.role
});

// Add custom tags
setTag('feature.ai_enabled', true);
setTag('subscription.plan', 'premium');

// Add custom context
setContext('shopping_cart', {
  items: cart.items.length,
  total_value: cart.total
});
```

## Alerts and Notifications

### Set Up Alerts

1. **Go to Alerts**
   - Navigate to **Alerts** in your Sentry project
   - Click "Create Alert Rule"

2. **Error Alerts**
   ```
   Rule Name: Production Errors
   Conditions: 
   - When the count of events is greater than 10 in 1 minute
   - Environment equals production
   Actions:
   - Send notification to #alerts Slack channel
   - Send email to dev team
   ```

3. **Performance Alerts**
   ```
   Rule Name: Slow Page Load
   Conditions:
   - When p95 of transaction duration is greater than 3000ms in 5 minutes
   - Transaction equals pageload
   Actions:
   - Send notification to #performance Slack channel
   ```

### Integration Setup

1. **Slack Integration**
   - Go to **Settings** > **Integrations**
   - Add Slack workspace
   - Configure channel notifications

2. **Email Notifications**
   - Go to **Settings** > **Notifications**
   - Configure email preferences
   - Set up team distribution lists

## Testing Integration

### 1. Test Error Tracking

Create a test error to verify Sentry is working:

```javascript
// In browser console or temporary button
throw new Error('Test Sentry Integration');
```

### 2. Test Performance Monitoring

Generate a slow transaction:

```javascript
// Create artificial delay
setTimeout(() => {
  // Slow operation
  const start = Date.now();
  while (Date.now() - start < 2000) {
    // Blocking operation
  }
}, 100);
```

### 3. Verify in Dashboard

1. Check **Issues** tab for the test error
2. Check **Performance** tab for slow transactions
3. Verify **Releases** shows your deployment
4. Confirm **User Context** displays correctly

## Troubleshooting

### Common Issues

1. **DSN Not Working**
   ```bash
   # Check DSN format
   echo $VITE_SENTRY_DSN
   # Should start with https:// and contain @sentry.io
   ```

2. **No Events Appearing**
   - Verify DSN is correct
   - Check browser network tab for Sentry requests
   - Ensure environment allows external requests
   - Check Sentry project settings

3. **Too Many Events**
   ```javascript
   // Increase sample rate filtering
   sampleRate: 0.1, // 10% of events
   tracesSampleRate: 0.1, // 10% of transactions
   ```

4. **Missing User Context**
   - Verify user is authenticated
   - Check AuthContext integration
   - Ensure setUser is called after login

### Debug Mode

Enable Sentry debug mode for troubleshooting:

```javascript
Sentry.init({
  debug: true, // Enable in development only
  // ... other options
});
```

### Verification Commands

```bash
# Check environment variables
node -e "console.log(process.env.VITE_SENTRY_DSN)"

# Test Sentry connection
curl -X POST "YOUR_SENTRY_DSN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test from curl"}'
```

## Best Practices

### 1. Error Handling

```javascript
// Good: Contextual error reporting
try {
  await api.createOrder(orderData);
} catch (error) {
  Sentry.withScope(scope => {
    scope.setTag('operation', 'create_order');
    scope.setContext('order_data', orderData);
    Sentry.captureException(error);
  });
  throw error;
}
```

### 2. Performance Monitoring

```javascript
// Good: Custom transaction tracking
const transaction = Sentry.startTransaction({
  name: 'AI Product Recommendation',
  op: 'ai.recommendation'
});

try {
  const recommendations = await ai.getRecommendations(user);
  transaction.setTag('recommendations_count', recommendations.length);
} finally {
  transaction.finish();
}
```

### 3. User Privacy

```javascript
// Good: Sanitize sensitive data
Sentry.init({
  beforeSend(event) {
    // Remove sensitive user data
    if (event.user) {
      delete event.user.password;
      delete event.user.credit_card;
    }
    return event;
  }
});
```

### 4. Release Tracking

```bash
# Good: Create releases for deployments
npx @sentry/cli releases new "$VITE_SENTRY_RELEASE"
npx @sentry/cli releases files "$VITE_SENTRY_RELEASE" upload-sourcemaps ./dist
npx @sentry/cli releases finalize "$VITE_SENTRY_RELEASE"
```

### 5. Environment-Specific Configuration

```javascript
// Good: Environment-appropriate settings
const sentryConfig = {
  development: {
    sampleRate: 1.0,
    tracesSampleRate: 1.0,
    debug: true
  },
  production: {
    sampleRate: 0.1,
    tracesSampleRate: 0.1,
    debug: false
  }
}[environment];
```

## Next Steps

After completing this setup:

1. ✅ **Deploy with Sentry**: Update `.env.production` with your actual DSN
2. ✅ **Configure Alerts**: Set up email/Slack notifications
3. ✅ **Team Access**: Invite team members to Sentry project
4. ✅ **Documentation**: Update deployment docs with Sentry info
5. ✅ **Monitoring**: Regularly review error and performance data

## Resources

- 📚 [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- 🔧 [Performance Monitoring Guide](https://docs.sentry.io/product/performance/)
- 🎬 [Session Replay Documentation](https://docs.sentry.io/product/session-replay/)
- 📧 [Alerts and Notifications](https://docs.sentry.io/product/alerts-notifications/)

---

**Need Help?**
- Check the [Sentry Community Forum](https://forum.sentry.io/)
- Review the [troubleshooting section](#troubleshooting) above
- Contact the development team for Art-O-Mart specific issues