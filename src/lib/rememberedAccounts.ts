/**
 * Remembered accounts — a *token-free* list of accounts that have signed in on
 * this browser, so /account can offer a "switch account" picker without the
 * security cost of keeping multiple live sessions around. We store ONLY a
 * profile snapshot (id/email/name/avatar/provider); switching always goes
 * through a real re-authentication on the login page. No access/refresh tokens
 * are ever persisted here, so an XSS bug can't harvest other sessions.
 */

export interface RememberedAccount {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: "email" | "google" | "facebook" | "phone";
  lastUsed: number;
}

const KEY = "loov_accounts";
const MAX = 5;
const EVENT = "loov-accounts-changed";

export function getRememberedAccounts(): RememberedAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((a) => a && typeof a.id === "string");
  } catch {
    return [];
  }
}

/** Add/refresh the current account, newest first, capped at MAX. */
export function rememberAccount(a: Omit<RememberedAccount, "lastUsed">) {
  try {
    const others = getRememberedAccounts().filter((x) => x.id !== a.id);
    const next = [{ ...a, lastUsed: Date.now() }, ...others].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* private mode / storage full — the feature just degrades to none */
  }
}

/** Forget one account on this device (does NOT sign anyone out). */
export function removeRememberedAccount(id: string) {
  try {
    const next = getRememberedAccounts().filter((x) => x.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export const ACCOUNTS_EVENT = EVENT;
