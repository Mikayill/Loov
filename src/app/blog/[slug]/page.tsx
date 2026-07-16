import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticles, getArticleBySlug, getAllSlugs, blogCategoryLabel } from "@/lib/articles";
import { getT } from "@/lib/i18n/server";
import { fmtDate } from "@/lib/i18n/format";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug, "en");
  if (!article) return { title: "Not Found — Loov" };
  return {
    title: `${article.title} — Loov Journal`,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const { t, locale } = await getT();
  const article = getArticleBySlug(slug, locale);
  if (!article) notFound();

  const related = getArticles(locale).filter((a) => a.slug !== slug).slice(0, 2);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back to journal — a plain 3-segment breadcrumb here used to read as
          "Home › Journal › {article title}", which on mobile felt like it
          had wandered away from the journal into some unrelated deep page.
          A single, unambiguous back-link reads clearer. */}
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-accent transition-colors mb-8">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t("blog.backToJournal")}
      </Link>

      {/* Hero */}
      <div
        className="rounded-card flex items-center justify-center py-14 mb-8 text-8xl select-none border border-line"
        style={{ backgroundColor: article.cardColor + "80" }}
      >
        {article.emoji}
      </div>

      {/* Meta */}
      <div className="flex items-center flex-wrap gap-2 mb-4">
        <span className="text-[11px] font-bold text-accent bg-accent-soft px-3 py-1 rounded-full border border-sage">
          {blogCategoryLabel(article.categoryId, t)}
        </span>
        <span className="text-[11px] text-ink-muted font-medium">{article.readMinutes} {t("blog.minRead")}</span>
        <span className="text-[11px] text-ink-muted">·</span>
        <span className="text-[11px] text-ink-muted">{fmtDate(article.dateISO, locale, "long")}</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-ink leading-tight mb-4">
        {article.title}
      </h1>
      <p className="text-ink-soft text-base leading-relaxed mb-8 border-l-4 pl-4" style={{ borderColor: "var(--color-accent)" }}>
        {article.excerpt}
      </p>

      <div className="h-px bg-line mb-8" />

      {/* Body */}
      <div className="space-y-5">
        {article.body.map((para, i) => (
          <p key={i} className="text-ink-soft leading-relaxed text-sm sm:text-base">
            {para}
          </p>
        ))}
      </div>

      {/* Author note */}
      <div className="mt-10 flex items-center gap-4 p-5 bg-accent-soft rounded-card border border-sage">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          🌿
        </div>
        <div>
          <p className="font-bold text-ink text-sm">{t("blog.authorName")}</p>
          <p className="text-xs text-ink-soft leading-relaxed">
            {t("blog.authorNote")}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div
        className="mt-10 rounded-card p-6 text-center"
        style={{ background: "linear-gradient(135deg, #EAF2F0 0%, #E8EDF5 100%)" }}
      >
        <p className="font-extrabold text-ink mb-1">{t("blog.shopBebeco")}</p>
        <p className="text-xs text-ink-soft mb-4">{t("blog.shopBebecoSubtitle")}</p>
        <Link
          href="/products"
          className="u-btn inline-flex items-center gap-2 font-bold px-6 py-2.5 rounded-control text-white text-sm transition-colors bg-ink hover:bg-ink/85"
        >
          {t("blog.browseCollection")} →
        </Link>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12 pt-8 border-t border-line">
          <h2 className="text-lg font-extrabold text-ink mb-5">{t("blog.moreFromJournal")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {related.map((a) => (
              <Link key={a.slug} href={`/blog/${a.slug}`} className="group flex gap-3 bg-canvas rounded-card border border-line p-4 hover:shadow-sm transition-shadow">
                <div
                  className="w-14 h-14 rounded-control flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ backgroundColor: a.cardColor + "80" }}
                >
                  {a.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-accent mb-1">{blogCategoryLabel(a.categoryId, t)}</p>
                  <p className="text-sm font-bold text-ink group-hover:text-accent transition-colors leading-snug line-clamp-2">
                    {a.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
