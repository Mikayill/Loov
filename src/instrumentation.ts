/**
 * Next.js server instrumentation — boots Sentry for the matching runtime and
 * forwards every server-side request error (render/route/action/proxy) to it.
 * See sentry.server.config.ts / sentry.edge.config.ts for the actual init.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
