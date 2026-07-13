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
      <nav className="flex items-center gap-2 text-xs text-[#9A8E88] mb-8">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold">{t("a11y.title")}</span>
      </nav>

      <h1 className="text-3xl font-extrabold text-[#2A2320] mb-3">♿ {t("a11y.title")}</h1>
      <p className="text-[#5E5450] leading-relaxed mb-10">{t("a11y.intro")}</p>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={s.title}>
            <h2 className="text-lg font-extrabold text-[#2A2320] mb-2">{i + 1}. {s.title}</h2>
            <p className="text-sm text-[#5E5450] leading-relaxed whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="bg-[#F5F0EB] rounded-2xl p-6 text-center mt-10">
        <Link href="/contact" className="font-bold text-[#5E9E8C] hover:underline text-sm">
          {t("a11y.contactCta")} →
        </Link>
      </div>
    </div>
  );
}
