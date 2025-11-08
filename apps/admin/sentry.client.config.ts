import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable Session Replay for error debugging
  replaysOnErrorSampleRate: 0.1, // 10% of errors will have replays
  replaysSessionSampleRate: 0.01, // 1% of sessions will have replays

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Filter out noise
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Facebook borked
    'fb_xd_fragment',
    // ISP "optimizing" proxy - `Cache-Control: no-transform` seems to
    // reduce this. (thanks @acdha)
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    // See http://toolbar.conduit.com/Developer/HtmlAndGadget/Methods/JSInjection.aspx
    'conduitPage',
    // Generic error messages that are not actionable
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  beforeSend(event, hint) {
    // Filter out non-error events in development
    if (process.env.NODE_ENV === 'development' && !hint.originalException) {
      return null;
    }

    // Scrub sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }

    // Scrub user data except essentials
    if (event.user) {
      const { id, email, role } = event.user as any;
      event.user = { id, email, role };
    }

    return event;
  },

  beforeSendTransaction(event) {
    // Don't send health check transactions
    if (event.transaction?.startsWith('/api/health')) {
      return null;
    }

    return event;
  },
});
