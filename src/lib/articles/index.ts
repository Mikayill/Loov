import type { Locale } from "@/lib/i18n/config";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { articleBases, getArticleBase, type BlogCategoryId } from "./base";
import { content as contentEn } from "./content.en";
import { content as contentKa } from "./content.ka";
import { content as contentRu } from "./content.ru";
import { content as contentTr } from "./content.tr";

export type { BlogCategoryId } from "./base";

export interface Article {
  slug: string;
  categoryId: BlogCategoryId;
  readMinutes: number;
  emoji: string;
  cardColor: string;
  dateISO: string;
  title: string;
  excerpt: string;
  body: string[];
}

const contentByLocale: Record<Locale, Record<string, { title: string; excerpt: string; body: string[] }>> = {
  en: contentEn,
  ka: contentKa,
  ru: contentRu,
  tr: contentTr,
};

const CATEGORY_KEYS: Record<BlogCategoryId, TranslationKey> = {
  "baby-care": "blog.category.babyCare",
  materials: "blog.category.materials",
  "shopping-guide": "blog.category.shoppingGuide",
  preparation: "blog.category.preparation",
  safety: "blog.category.safety",
  "gift-guide": "blog.category.giftGuide",
};

export function blogCategoryLabel(id: BlogCategoryId, t: (key: TranslationKey) => string): string {
  return t(CATEGORY_KEYS[id]);
}

function mergeArticle(slug: string, locale: Locale): Article {
  const base = getArticleBase(slug);
  if (!base) throw new Error(`Unknown article slug: ${slug}`);
  const localized = contentByLocale[locale][slug];
  const fallback = contentEn[slug];
  return {
    ...base,
    title: localized?.title ?? fallback.title,
    excerpt: localized?.excerpt ?? fallback.excerpt,
    body: localized?.body ?? fallback.body,
  };
}

export function getArticles(locale: Locale): Article[] {
  return articleBases.map((b) => mergeArticle(b.slug, locale));
}

export function getArticleBySlug(slug: string, locale: Locale): Article | undefined {
  if (!getArticleBase(slug)) return undefined;
  return mergeArticle(slug, locale);
}

export function getAllSlugs(): string[] {
  return articleBases.map((b) => b.slug);
}
