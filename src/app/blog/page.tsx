import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, blogCategoryLabel } from "@/lib/articles";
import { getT } from "@/lib/i18n/server";
import { fmtDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.blog.title"), description: t("meta.blog.description") };
}

export default async function BlogPage() {
  const { t, locale } = await getT();
  const articles = getArticles(locale);
  const [featured, ...rest] = articles;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-10">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-12">
        <span className="text-xs font-bold text-accent uppercase tracking-widest">{t("blog.eyebrow")}</span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-ink mt-2 mb-2 sm:mb-3">{t("blog.title")}</h1>
        <p className="text-ink-soft text-[13px] sm:text-sm max-w-md mx-auto">
          {t("blog.subtitle")}
        </p>
      </div>

      {/* Featured article */}
      <Link href={`/blog/${featured.slug}`} className="group block mb-6 sm:mb-10">
        <div
          className="relative rounded-card sm:rounded-card overflow-hidden border border-line p-5 sm:p-12 flex flex-col sm:flex-row items-center gap-4 sm:gap-8 hover:shadow-lg transition-shadow"
          style={{ backgroundColor: featured.cardColor + "60" }}
        >
          <div className="text-6xl sm:text-[120px] flex-shrink-0 select-none group-hover:scale-110 transition-transform duration-300">
            {featured.emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
              <span className="text-[11px] font-bold text-accent bg-canvas px-3 py-1 rounded-control border border-line">
                {blogCategoryLabel(featured.categoryId, t)}
              </span>
              <span className="text-[11px] text-ink-muted font-medium">{featured.readMinutes} {t("blog.minRead")}</span>
              <span className="text-[11px] text-ink-muted">·</span>
              <span className="text-[11px] text-ink-muted font-medium">{fmtDate(featured.dateISO, locale, "long")}</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-ink mb-2 sm:mb-3 leading-tight group-hover:text-accent transition-colors">
              {featured.title}
            </h2>
            <p className="text-ink-soft leading-snug sm:leading-relaxed text-[13px] sm:text-base mb-3 sm:mb-4 line-clamp-3 sm:line-clamp-none">
              {featured.excerpt}
            </p>
            <span className="text-sm font-bold text-accent flex items-center gap-1">
              {t("blog.readArticle")}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </Link>

      {/* Article grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
        {rest.map((article) => (
          <Link key={article.slug} href={`/blog/${article.slug}`} className="group block">
            <div className="bg-canvas rounded-card border border-line overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 h-full flex flex-col">
              <div
                className="h-28 sm:h-36 flex items-center justify-center text-4xl sm:text-6xl select-none group-hover:scale-105 transition-transform duration-300"
                style={{ backgroundColor: article.cardColor + "80" }}
              >
                {article.emoji}
              </div>
              <div className="p-3 sm:p-4 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-full">
                    {blogCategoryLabel(article.categoryId, t)}
                  </span>
                  <span className="text-[10px] text-ink-muted">{article.readMinutes} {t("blog.minRead")}</span>
                </div>
                <h3 className="font-bold text-ink text-sm mb-2 leading-snug group-hover:text-accent transition-colors flex-1">
                  {article.title}
                </h3>
                <p className="text-xs text-ink-muted mt-auto">{fmtDate(article.dateISO, locale, "long")}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
