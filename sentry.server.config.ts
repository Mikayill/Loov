/**
 * Sentry — Node.js server runtime init (route handlers, RSC, server actions).
 * Loaded from src/instrumentation.ts when NEXT_RUNTIME === "nodejs".
 */
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_ENABLED, SENTRY_TRACES_SAMPLE_RATE } from "@/lib/sentry";

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  // Never attach request bodies/cookies etc. beyond Sentry defaults — the
  // store handles personal data (addresses, phone numbers, IBANs).
  sendDefaultPii: false,
});
