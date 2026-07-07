/**
 * CSRF token placeholder (frontend scaffolding only).
 *
 * NOTE (Phase 2 / backend): real CSRF protection MUST be enforced server-side.
 * The backend should issue a token (e.g. via an httpOnly, SameSite=Strict
 * cookie + a readable mirror) and reject any mutating request whose submitted
 * token does not match. This helper only generates a client-side token and
 * exposes it as a hidden form field so forms are wired up and ready.
 */

const CSRF_STORAGE_KEY = "loov_csrf_token";

/** Cryptographically-random token; falls back gracefully during SSR. */
export function getCsrfToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (existing) return existing;
    const bytes = new Uint8Array(16);
    window.crypto?.getRandomValues?.(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    window.sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    return token;
  } catch {
    return "";
  }
}
