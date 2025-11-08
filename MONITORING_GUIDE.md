# Contractors Mall - Monitoring & Error Tracking Guide

## Overview

This guide explains how to use the monitoring system built on Sentry for tracking errors, performance, and business events.

## Setup Complete ✅

### Installed Components
1. **Sentry SDK** - Installed in both web and admin apps
2. **Error Boundaries** - React error boundaries for graceful error handling
3. **Custom Event Tracking** - Business event monitoring utilities
4. **Performance Monitoring** - Transaction and performance tracking
5. **Instrumentation** - Automatic error capture in Next.js

### Files Created

#### Web App
- `apps/web/sentry.client.config.ts` - Client-side Sentry config
- `apps/web/sentry.server.config.ts` - Server-side Sentry config
- `apps/web/sentry.edge.config.ts` - Edge runtime Sentry config
- `apps/web/instrumentation.ts` - Next.js instrumentation
- `apps/web/src/lib/monitoring.ts` - Custom event tracking utilities
- `apps/web/src/components/ErrorBoundary.tsx` - Error boundary components

#### Admin App
- `apps/admin/sentry.client.config.ts` - Client-side Sentry config
- `apps/admin/sentry.server.config.ts` - Server-side Sentry config
- `apps/admin/sentry.edge.config.ts` - Edge runtime Sentry config
- `apps/admin/instrumentation.ts` - Next.js instrumentation
- `apps/admin/src/lib/monitoring.ts` - Custom event tracking utilities

## Configuration Required

### 1. Create Sentry Account & Projects

1. Go to https://sentry.io and create an account
2. Create two projects:
   - **contractors-mall-web** (for the contractor app)
   - **contractors-mall-admin** (for the supplier/admin portal)
3. Get your DSN from each project's settings

### 2. Update Environment Variables

Add to `.env.local` in both apps:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/123456
SENTRY_AUTH_TOKEN=your-auth-token-here
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-name

# Already set (for release tracking)
NEXT_PUBLIC_VERCEL_ENV=production
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=auto-set-by-vercel
```

### 3. Enable Instrumentation in next.config.js

The configuration is already set up. Sentry will automatically:
- Capture unhandled errors
- Track API route errors
- Monitor performance
- Upload source maps (in production)

## Usage Examples

### 1. Tracking Business Events

```typescript
import {
  trackOrderEvent,
  trackPaymentEvent,
  trackDeliveryEvent,
  trackDisputeEvent,
} from '@/lib/monitoring';

// Track order creation
trackOrderEvent('order_created', orderId, {
  total_amount: 250,
  supplier_id: supplierId,
  items_count: 5,
});

// Track payment
trackPaymentEvent('payment_succeeded', orderId, 250, {
  payment_method: 'card',
});

// Track delivery
trackDeliveryEvent('delivery_confirmed', orderId, 'pin', {
  driver_id: driverId,
});

// Track dispute
trackDisputeEvent('dispute_created', disputeId, orderId, {
  reason: 'damaged_goods',
  reporter_role: 'contractor',
});
```

### 2. Tracking Errors

```typescript
import { trackError, trackAPIError, trackDatabaseError } from '@/lib/monitoring';

// Track general errors
try {
  // ... code ...
} catch (error) {
  trackError(error as Error, 'checkout_flow', {
    step: 'payment',
    user_id: userId,
  });
}

// Track API errors
try {
  const response = await fetch('/api/orders');
  if (!response.ok) {
    throw new Error('API request failed');
  }
} catch (error) {
  trackAPIError(error as Error, '/api/orders', 'GET', 500, {
    user_id: userId,
  });
}

// Track database errors
try {
  await supabase.from('orders').insert(orderData);
} catch (error) {
  trackDatabaseError(error as Error, 'INSERT', 'orders', {
    order_id: orderId,
  });
}
```

### 3. Setting User Context

```typescript
import { setUserContext, clearUserContext } from '@/lib/monitoring';

// On login
setUserContext({
  id: user.id,
  email: user.email,
  role: user.role,
});

// On logout
clearUserContext();
```

### 4. Performance Monitoring

```typescript
import { measurePerformance, startTransaction } from '@/lib/monitoring';

// Measure async function
const orders = await measurePerformance(
  'fetch_orders',
  'database.query',
  async () => {
    return await supabase.from('orders').select('*');
  }
);

// Manual transaction
const transaction = startTransaction('checkout_flow', 'user.interaction');
try {
  // ... checkout steps ...
  transaction?.setStatus('ok');
} catch (error) {
  transaction?.setStatus('internal_error');
  throw error;
} finally {
  transaction?.finish();
}
```

### 5. Using Error Boundaries

```typescript
import { ErrorBoundary, CheckoutErrorBoundary, PaymentErrorBoundary } from '@/components/ErrorBoundary';

// General error boundary
<ErrorBoundary context="product_listing">
  <ProductList />
</ErrorBoundary>

// Checkout-specific
<CheckoutErrorBoundary>
  <CheckoutFlow />
</CheckoutErrorBoundary>

// Payment-specific
<PaymentErrorBoundary>
  <PaymentForm />
</PaymentErrorBoundary>
```

### 6. Adding Breadcrumbs for Debugging

```typescript
import { addBreadcrumb } from '@/lib/monitoring';

// Track user actions
addBreadcrumb('User added item to cart', 'user.action', 'info', {
  product_id: productId,
  quantity: 2,
});

// Track navigation
addBreadcrumb('User navigated to checkout', 'navigation', 'info');

// Track state changes
addBreadcrumb('Cart total calculated', 'state.change', 'debug', {
  total: 150,
  items: 3,
});
```

## Critical Events to Monitor

### Must Track (High Priority)
1. **Order Events**
   - Order creation
   - Order payment
   - Order status changes
   - Order completion/cancellation

2. **Payment Events**
   - Payment initiation
   - Payment success/failure
   - Escrow release
   - Refunds

3. **Delivery Events**
   - Delivery started
   - Delivery confirmation (photo/PIN)
   - Delivery failures

4. **Dispute Events**
   - Dispute creation
   - Dispute resolution
   - Site visit scheduling

5. **Authentication Events**
   - Login failures
   - Signup issues
   - Permission denials

### Should Track (Medium Priority)
1. API errors (4xx, 5xx)
2. Database errors (RLS violations, timeouts)
3. Form validation errors
4. File upload failures
5. External service failures (Supabase, payment gateway)

### Nice to Track (Low Priority)
1. Page views
2. Feature usage
3. User preferences
4. Search queries
5. Filter usage

## Monitoring Dashboard

### Key Metrics to Watch

1. **Error Rate**
   - Target: < 0.1% of requests
   - Alert: > 0.5%

2. **Response Time**
   - Target: P95 < 400ms (read), < 800ms (write)
   - Alert: P95 > 1000ms

3. **Payment Success Rate**
   - Target: > 99%
   - Alert: < 95%

4. **Order Completion Rate**
   - Target: > 95%
   - Alert: < 90%

5. **RLS Policy Violations**
   - Target: 0
   - Alert: > 0

## Alert Configuration

### Critical Alerts (Immediate)
- Payment processing failures
- RLS policy violations
- Database connection errors
- Authentication system failures

### Warning Alerts (15min aggregation)
- Error rate > 5/min
- API response time > 2s (P95)
- Failed deliveries > 3/hour

### Info Alerts (Daily digest)
- New user signups
- Total orders
- Revenue summary
- System health report

## Testing

### Test in Development

```typescript
// Test error tracking
throw new Error('Test error - can be ignored');

// Test event tracking
trackOrderEvent('order_created', 'test-order-id', { test: true });

// Test performance
measurePerformance('test', 'test', async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
});
```

### Verify in Sentry Dashboard
1. Go to your Sentry project
2. Check "Issues" for errors
3. Check "Performance" for transactions
4. Check "Discover" for custom events

## Privacy & Data Scrubbing

### Automatically Scrubbed
- Passwords (any field with "password" in name)
- Credit cards (PAN detection)
- JWT tokens
- API keys
- Cookies and auth headers

### Custom Scrubbing
- Order details (keeps only order_id)
- Addresses (keeps only zone)
- Phone numbers (last 4 digits only)
- Email addresses (domain only in some contexts)

## Cost Optimization

### Current Configuration
- **Errors**: 100% sampling (all errors captured)
- **Performance**: 10% sampling (1 in 10 transactions)
- **Session Replays**: 10% on error, 1% otherwise

### Monthly Estimates
- **Free Tier**: Up to 5,000 errors/month
- **Team Plan** ($26/month): Up to 50,000 errors/month
- **Business Plan** ($80/month): Up to 100,000 errors/month

### Optimization Tips
1. Filter out noisy errors in `beforeSend`
2. Reduce sampling rate in production if needed
3. Use environments to separate staging/production
4. Set up inbound filters in Sentry dashboard

## Troubleshooting

### Sentry Not Capturing Errors

1. Check DSN is set: `process.env.NEXT_PUBLIC_SENTRY_DSN`
2. Check environment: Sentry is disabled in development by default
3. Check beforeSend hooks: They might be filtering too aggressively
4. Check browser console for Sentry init messages

### Too Many Events

1. Add more filters in `beforeSend`
2. Reduce sampling rates
3. Add ignoreErrors patterns
4. Use rate limiting in Sentry dashboard

### Source Maps Not Uploading

1. Check `SENTRY_AUTH_TOKEN` is set
2. Check `SENTRY_ORG` and `SENTRY_PROJECT` are correct
3. Verify Vercel build logs for source map upload
4. Check Sentry project settings → Source Maps

## Next Steps

1. Create Sentry account and projects
2. Add environment variables
3. Deploy to staging and test
4. Configure alerts in Sentry dashboard
5. Review and tune sampling rates after a week
6. Set up integration with Slack/Discord for alerts

## Support

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Claude Code**: See CLAUDE.md for engineering principles
- **Team**: Contact the development team for custom events or alerts
