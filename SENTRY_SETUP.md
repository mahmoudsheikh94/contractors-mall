# Sentry Error Monitoring Setup

## Overview
This document describes the Sentry error monitoring setup for Contractors Mall.

## Architecture
- **Web App**: Real-time error tracking for contractors
- **Admin Portal**: Real-time error tracking for suppliers/admins
- **Source Maps**: Enabled for both apps for better stack traces
- **Performance Monitoring**: Transaction sampling at 10%

## Installation

```bash
# Web app
cd apps/web
pnpm add @sentry/nextjs

# Admin app
cd apps/admin
pnpm add @sentry/nextjs
```

## Configuration

### Environment Variables (.env.local)
```bash
# Get these from https://sentry.io/settings/YOUR_PROJECT/keys/
NEXT_PUBLIC_SENTRY_DSN=your-dsn-here
SENTRY_AUTH_TOKEN=your-auth-token-here
SENTRY_ORG=your-org
SENTRY_PROJECT=contractors-mall
```

## Features Enabled

### 1. Error Tracking
- All unhandled exceptions
- Console errors
- API failures
- Database errors

### 2. Performance Monitoring
- Page load times
- API request duration
- Database query performance
- Transaction tracing

### 3. Release Tracking
- Git commit SHA as release version
- Source map uploads for readable stack traces
- Deploy notifications

### 4. User Context
- User ID (when authenticated)
- User role (contractor/supplier_admin/driver/admin)
- User email (when available)

### 5. Custom Events
- Order state transitions
- Payment events
- Dispute creation
- Delivery confirmations

## Error Boundaries

### Global Error Boundary
Catches all React component errors

### Specific Boundaries
- Checkout flow errors
- Payment processing errors
- Product management errors (admin)
- Delivery confirmation errors

## Privacy & Data Scrubbing

### Automatically Scrubbed
- Passwords
- API keys
- Credit card numbers
- JWT tokens
- Personal phone numbers

### Custom Scrubbing
- Order details (keep order_id only)
- Address details (keep zone only)
- Payment details (keep amount only)

## Alerts

### Critical Alerts (Immediate notification)
- Payment processing failures
- RLS policy violations
- Authentication failures
- Database connection errors

### Warning Alerts (15min threshold)
- High error rate (>5/min)
- Slow API responses (>2s P95)
- Failed deliveries

## Testing

### Test Error in Development
```javascript
throw new Error('Sentry Test Error');
```

### Test Performance
```javascript
Sentry.startTransaction({
  name: 'test-transaction',
  op: 'test'
});
```

## Monitoring Dashboards

### Web App Dashboard
- https://sentry.io/contractors-mall-web

### Admin Portal Dashboard
- https://sentry.io/contractors-mall-admin

## Integration with CI/CD

Sentry releases are automatically created on deployment with:
- Git commit SHA
- Deploy environment (production/staging)
- Source maps
- Deployment timestamp

## Cost Optimization

### Sampling Rates
- Errors: 100% (all errors captured)
- Performance: 10% (1 in 10 transactions)
- Replays: 10% on error, 1% otherwise

### Data Retention
- Errors: 90 days
- Performance: 30 days
- Releases: 90 days

## Next Steps

1. Create Sentry account at https://sentry.io
2. Create two projects: `contractors-mall-web` and `contractors-mall-admin`
3. Get DSN and auth token
4. Run installation commands
5. Deploy and verify errors are being tracked
