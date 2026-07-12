/**
 * Next.js client instrumentation — runs in the browser before the app becomes
 * interactive. Captures unhandled client errors; error-boundary errors are
 * reported explicitly from error.tsx / global-error.tsx.
 */
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_ENABLED, SENTRY_TRACES_SAMPLE_RATE } from "@/lib/sentry";

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  // No session replay: extra bundle weight + shoppers type addresses/phones.
  sendDefaultPii: false,
});

/** Lets Sentry trace App Router navigations. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
