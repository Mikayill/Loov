import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/db/settings";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.terms.title") };
}

export default async function TermsPage() {
  const { t } = await getT();
  const s = await getSettings();

  const s4Body = `${t("legal.terms.s4BodyBase").replace("{min}", String(s.deliveryMinDays)).replace("{max}", String(s.deliveryMaxDays))}${s.expressEnabled ? t("legal.terms.s4BodyExpress") : ""}${t("legal.terms.s4BodyFree").replace("{threshold}", String(s.freeShippingThreshold))}`;

  const sections = [
    { title: t("legal.terms.s1Title"), body: t("legal.terms.s1Body") },
    { title: t("legal.terms.s2Title"), body: t("legal.terms.s2Body") },
    { title: t("legal.terms.s3Title"), body: t("legal.terms.s3Body") },
    { title: t("legal.terms.s4Title"), body: s4Body },
    { title: t("legal.terms.s5Title"), body: t("legal.terms.s5Body") },
    { title: t("legal.terms.s6Title"), body: t("legal.terms.s6Body") },
    { title: t("legal.terms.s7Title"), body: t("legal.terms.s7Body") },
    { title: t("legal.terms.s8Title"), body: t("legal.terms.s8Body") },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-8">
        <Link href="/" className="hover:text-accent transition-colors font-medium">{t("nav.home")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("legal.terms.breadcrumb")}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-ink mb-2">{t("legal.terms.title")}</h1>
        <p className="text-xs text-ink-muted">{t("legal.terms.lastUpdated")}</p>
      </div>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <div key={s.title}>
            <h2 className="font-extrabold text-ink mb-2 flex items-center gap-2">
              <span className="u-btn w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center text-white flex-shrink-0 bg-ink hover:bg-ink/85">{i + 1}</span>
              {s.title}
            </h2>
            <p className="text-ink-soft text-sm leading-relaxed pl-8">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-line pt-6 flex flex-col sm:flex-row gap-3">
        <Link href="/privacy" className="flex-1 text-center font-bold text-sm text-accent border-2 border-accent px-5 py-3 rounded-full hover:bg-panel transition-colors">
          {t("legal.terms.privacyLink")}
        </Link>
        <Link href="/contact" className="u-btn flex-1 text-center font-bold text-sm text-white px-5 py-3 rounded-full transition-colors bg-ink hover:bg-ink/85">
          {t("legal.terms.contactBtn")} →
        </Link>
      </div>
    </div>
  );
}
