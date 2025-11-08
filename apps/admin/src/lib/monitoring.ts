/**
 * Monitoring and Error Tracking Utilities
 *
 * This module provides functions for tracking custom events,
 * errors, and performance metrics in the application.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Track a custom business event
 */
export function trackEvent(
  eventName: string,
  data?: Record<string, any>,
  severity: Sentry.SeverityLevel = 'info'
) {
  Sentry.captureMessage(eventName, {
    level: severity,
    extra: data,
  });
}

/**
 * Track order state transitions
 */
export function trackOrderEvent(
  event: 'order_created' | 'order_paid' | 'order_delivered' | 'order_completed' | 'order_cancelled',
  orderId: string,
  metadata?: Record<string, any>
) {
  trackEvent(`Order: ${event}`, {
    order_id: orderId,
    event_type: event,
    ...metadata,
  });
}

/**
 * Track payment events
 */
export function trackPaymentEvent(
  event: 'payment_initiated' | 'payment_succeeded' | 'payment_failed' | 'payment_released' | 'payment_refunded',
  orderId: string,
  amount: number,
  metadata?: Record<string, any>
) {
  trackEvent(`Payment: ${event}`, {
    order_id: orderId,
    amount_jod: amount,
    event_type: event,
    ...metadata,
  }, event === 'payment_failed' ? 'error' : 'info');
}

/**
 * Track delivery confirmation events
 */
export function trackDeliveryEvent(
  event: 'delivery_started' | 'delivery_confirmed' | 'delivery_failed',
  orderId: string,
  confirmationType?: 'photo' | 'pin',
  metadata?: Record<string, any>
) {
  trackEvent(`Delivery: ${event}`, {
    order_id: orderId,
    confirmation_type: confirmationType,
    event_type: event,
    ...metadata,
  }, event === 'delivery_failed' ? 'warning' : 'info');
}

/**
 * Track dispute events
 */
export function trackDisputeEvent(
  event: 'dispute_created' | 'dispute_resolved' | 'dispute_escalated' | 'site_visit_scheduled',
  disputeId: string,
  orderId: string,
  metadata?: Record<string, any>
) {
  trackEvent(`Dispute: ${event}`, {
    dispute_id: disputeId,
    order_id: orderId,
    event_type: event,
    ...metadata,
  }, 'warning');
}

/**
 * Track authentication events
 */
export function trackAuthEvent(
  event: 'login_success' | 'login_failed' | 'signup_success' | 'signup_failed' | 'logout',
  userId?: string,
  metadata?: Record<string, any>
) {
  trackEvent(`Auth: ${event}`, {
    user_id: userId,
    event_type: event,
    ...metadata,
  }, event.includes('failed') ? 'error' : 'info');
}

/**
 * Track critical errors with context
 */
export function trackError(
  error: Error,
  context: string,
  metadata?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setContext('error_context', {
      context,
      ...metadata,
    });
    Sentry.captureException(error);
  });
}

/**
 * Track API errors with request context
 */
export function trackAPIError(
  error: Error,
  endpoint: string,
  method: string,
  statusCode?: number,
  metadata?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setContext('api_error', {
      endpoint,
      method,
      status_code: statusCode,
      ...metadata,
    });
    scope.setTag('api_endpoint', endpoint);
    scope.setTag('http_method', method);
    if (statusCode) {
      scope.setTag('status_code', statusCode.toString());
    }
    Sentry.captureException(error);
  });
}

/**
 * Track database errors
 */
export function trackDatabaseError(
  error: Error,
  operation: string,
  table?: string,
  metadata?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setContext('database_error', {
      operation,
      table,
      ...metadata,
    });
    scope.setTag('db_operation', operation);
    if (table) {
      scope.setTag('db_table', table);
    }
    Sentry.captureException(error);
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  role?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction | undefined {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Measure a function's performance
 */
export async function measurePerformance<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, operation);

  try {
    const result = await fn();
    transaction?.setStatus('ok');
    return result;
  } catch (error) {
    transaction?.setStatus('internal_error');
    throw error;
  } finally {
    transaction?.finish();
  }
}

/**
 * Track a breadcrumb (for debugging)
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Set global tags for filtering
 */
export function setGlobalTags(tags: Record<string, string>) {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
}

/**
 * Capture a warning (non-error issue)
 */
export function captureWarning(
  message: string,
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level: 'warning',
    extra: context,
  });
}

/**
 * Check if Sentry is initialized and ready
 */
export function isSentryReady(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}
