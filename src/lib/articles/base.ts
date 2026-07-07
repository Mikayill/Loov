/** Locale-invariant article fields — slug, visuals, dates, category id, read time. */

export type BlogCategoryId =
  | "baby-care"
  | "materials"
  | "shopping-guide"
  | "preparation"
  | "safety"
  | "gift-guide";

export interface ArticleBase {
  slug: string;
  categoryId: BlogCategoryId;
  readMinutes: number;
  emoji: string;
  cardColor: string;
  dateISO: string;
}

export const articleBases: ArticleBase[] = [
  { slug: "newborn-skin-care-guide",           categoryId: "baby-care",       readMinutes: 5, emoji: "🌿", cardColor: "#C8DDD8", dateISO: "2026-06-12" },
  { slug: "organic-cotton-vs-bamboo",          categoryId: "materials",       readMinutes: 4, emoji: "☁️", cardColor: "#C4D4E4", dateISO: "2026-05-28" },
  { slug: "building-baby-wardrobe",            categoryId: "shopping-guide",  readMinutes: 6, emoji: "🎀", cardColor: "#D0E0CC", dateISO: "2026-05-05" },
  { slug: "hospital-bag-checklist",            categoryId: "preparation",     readMinutes: 4, emoji: "🏥", cardColor: "#E4D8C4", dateISO: "2026-04-18" },
  { slug: "washing-baby-clothes",               categoryId: "baby-care",       readMinutes: 5, emoji: "🫧", cardColor: "#C8E0D8", dateISO: "2026-06-25" },
  { slug: "safe-sleep-guide",                  categoryId: "safety",          readMinutes: 5, emoji: "😴", cardColor: "#D4CAE4", dateISO: "2026-06-08" },
  { slug: "best-baby-shower-gifts",            categoryId: "gift-guide",      readMinutes: 4, emoji: "🎁", cardColor: "#E8D8E8", dateISO: "2026-05-15" },
  { slug: "dressing-baby-for-georgian-weather",categoryId: "shopping-guide",  readMinutes: 5, emoji: "🌤️", cardColor: "#EED4BC", dateISO: "2026-04-30" },
];

export function getArticleBase(slug: string): ArticleBase | undefined {
  return articleBases.find((a) => a.slug === slug);
}
