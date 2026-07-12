"use client";

/**
 * Last-resort error boundary — replaces the ROOT layout when it crashes, so
 * no providers (locale, cart…) exist here. Must render its own <html>/<body>
 * and can only use static text. Route-level errors use error.tsx instead.
 */
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", backgroundColor: "#F5F0EB" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
          <p style={{ fontSize: "4rem", margin: 0 }}>🌿</p>
          <h1 style={{ color: "#2A2320", fontSize: "1.5rem", margin: "1rem 0 0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#5E5450", fontSize: "0.9rem", maxWidth: "24rem", margin: "0 0 1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{ backgroundColor: "#5E9E8C", color: "#fff", border: "none", borderRadius: "9999px", padding: "0.75rem 1.75rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ color: "#C8B8B0", fontSize: "0.65rem", fontFamily: "monospace", marginTop: "1.5rem" }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
