/**
 * Product search — multi-token matching across name, category, color and
 * size (raw canonical values AND their localized labels, so a shopper can
 * type in their own language). Every token must match something ("siyah
 * body" → both "siyah" and "body" must each hit a field) — an AND, not OR,
 * across tokens.
 */

import type { Product } from "@/types";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { categoryLabel, categoryPlural, colorLabel, sizeLabel } from "@/lib/i18n/labels";

export type CatKey = "all" | Product["category"];

export const CATEGORY_FILTERS: { key: CatKey; emoji: string }[] = [
  { key: "all",     emoji: "✨" },
  { key: "body",    emoji: "👶" },
  { key: "romper",  emoji: "🐻" },
  { key: "set",     emoji: "🎀" },
  { key: "blanket", emoji: "☁️" },
  { key: "towel",   emoji: "🛁" },
  { key: "bag",     emoji: "🐰" },
];

export const TRENDING = ["Bodysuit", "Swaddle", "Gift set", "Hooded towel", "Romper"];
export const MAX_RESULTS = 8;
export const RECENT_KEY = "loov_recent_searches";

export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).map((s) => s.trim()).filter(Boolean);
}

function matchesToken(p: Product, token: string, t: (key: TranslationKey) => string): boolean {
  if (p.name.toLowerCase().includes(token)) return true;
  if (categoryLabel(p.category, t).toLowerCase().includes(token)) return true;
  if (categoryPlural(p.category, t).toLowerCase().includes(token)) return true;
  if (p.colors.some((c) => c.toLowerCase().includes(token) || colorLabel(c, t).toLowerCase().includes(token))) return true;
  if (p.sizes.some((s) => s.toLowerCase().includes(token) || sizeLabel(s, t).toLowerCase().includes(token))) return true;
  return false;
}

/** A product matches a query if EVERY whitespace-separated token hits at
 *  least one field (name/category/color/size, raw or localized). */
export function matchesQuery(p: Product, tokens: string[], t: (key: TranslationKey) => string): boolean {
  return tokens.every((tok) => matchesToken(p, tok, t));
}

export function loadRecentSearches(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string, prev: string[]): string[] {
  const trimmed = query.trim();
  if (!trimmed) return prev;
  const updated = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 5);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* */ }
  return updated;
}

export function clearRecentSearches(): void {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* */ }
}
