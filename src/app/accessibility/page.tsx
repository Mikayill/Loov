import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.a11y.title") };
}

/**
 * Accessibility statement. Honest wording on purpose: we say we're WORKING
 * TOWARD WCAG 2.1 AA — no conformance claim we haven't audited for.
 */
export default async function AccessibilityPage() {
  const { t } = await getT();

  const sections = [
    { title: t("a11y.s1Title"), body: t("a11y.s1Body") },
    { title: t("a11y.s2Title"), body: t("a11y.s2Body") },
    { title: t("a11y.s3Title"), body: t("a11y.s3Body") },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-8">
        <Link href="/" className="hover:text-accent transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("a11y.title")}</span>
      </nav>

      <h1 className="text-3xl font-extrabold text-ink mb-3">♿ {t("a11y.title")}</h1>
      <p className="text-ink-soft leading-relaxed mb-10">{t("a11y.intro")}</p>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={s.title}>
            <h2 className="text-lg font-extrabold text-ink mb-2">{i + 1}. {s.title}</h2>
            <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="bg-canvas rounded-card p-6 text-center mt-10">
        <Link href="/contact" className="font-bold text-accent hover:underline text-sm">
          {t("a11y.contactCta")} →
        </Link>
      </div>
    </div>
  );
}
