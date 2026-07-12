/**
 * Sentry — Edge runtime init (src/proxy.ts and any edge routes).
 * Loaded from src/instrumentation.ts when NEXT_RUNTIME === "edge".
 */
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_ENABLED, SENTRY_TRACES_SAMPLE_RATE } from "@/lib/sentry";

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  sendDefaultPii: false,
});
