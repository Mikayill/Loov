/**
 * Shared Sentry constants — used by the client, server and edge init files.
 *
 * The DSN is NOT a secret (it only lets browsers send events to our project),
 * so a hardcoded fallback is safe and means production keeps reporting even
 * if the env var is missing. Override with NEXT_PUBLIC_SENTRY_DSN.
 */
export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://85962a5bab8efee276011d88b5778b8f@o4511720590802944.ingest.de.sentry.io/4511720598929488";

/** Only report from real deployments — local dev errors stay in the console. */
export const SENTRY_ENABLED = process.env.NODE_ENV === "production";

/** Keep performance tracing cheap (errors are always captured regardless). */
export const SENTRY_TRACES_SAMPLE_RATE = 0.1;
