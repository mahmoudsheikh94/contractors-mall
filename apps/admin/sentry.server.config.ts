import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  integrations: [
    Sentry.prismaIntegration(),
  ],

  beforeSend(event, hint) {
    // Don't send events in development unless it's a real error
    if (process.env.NODE_ENV === 'development' && !hint.originalException) {
      return null;
    }

    // Scrub sensitive data from server-side events
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove query params that might contain sensitive data
      if (event.request.query_string) {
        event.request.query_string = event.request.query_string.replace(/token=[\w-]+/g, 'token=[REDACTED]');
        event.request.query_string = event.request.query_string.replace(/key=[\w-]+/g, 'key=[REDACTED]');
      }
    }

    // Scrub database queries
    if (event.contexts?.trace) {
      const description = (event.contexts.trace as any).description;
      if (description && typeof description === 'string') {
        // Redact potential sensitive data in SQL queries
        (event.contexts.trace as any).description = description
          .replace(/password\s*=\s*'[^']+'/gi, "password='[REDACTED]'")
          .replace(/token\s*=\s*'[^']+'/gi, "token='[REDACTED]'");
      }
    }

    return event;
  },

  beforeSendTransaction(event) {
    // Don't send health check transactions
    if (event.transaction?.startsWith('/api/health')) {
      return null;
    }

    // Don't send static asset transactions
    if (event.transaction?.startsWith('/_next/')) {
      return null;
    }

    return event;
  },
});
