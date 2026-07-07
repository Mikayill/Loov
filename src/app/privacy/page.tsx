import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.privacy.title") };
}

export default async function PrivacyPage() {
  const { t } = await getT();

  const sections = [
    { title: t("legal.privacy.s1Title"), body: t("legal.privacy.s1Body") },
    { title: t("legal.privacy.s2Title"), body: t("legal.privacy.s2Body") },
    { title: t("legal.privacy.s3Title"), body: t("legal.privacy.s3Body") },
    { title: t("legal.privacy.s4Title"), body: t("legal.privacy.s4Body") },
    { title: t("legal.privacy.s5Title"), body: t("legal.privacy.s5Body") },
    { title: t("legal.privacy.s6Title"), body: t("legal.privacy.s6Body") },
    { title: t("legal.privacy.s7Title"), body: t("legal.privacy.s7Body") },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="flex items-center gap-2 text-xs text-[#9A8E88] mb-8">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors font-medium">{t("nav.home")}</Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold">{t("legal.privacy.breadcrumb")}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#2A2320] mb-2">{t("legal.privacy.title")}</h1>
        <p className="text-xs text-[#9A8E88]">{t("legal.privacy.lastUpdated")}</p>
      </div>

      <p className="text-[#5E5450] leading-relaxed mb-8 text-sm">
        {t("legal.privacy.intro")}
      </p>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <div key={s.title}>
            <h2 className="font-extrabold text-[#2A2320] mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: "#5E9E8C" }}>{i + 1}</span>
              {s.title}
            </h2>
            <p className="text-[#5E5450] text-sm leading-relaxed pl-8">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 p-5 bg-[#EAF2F0] rounded-2xl border border-[#C8DDD8] text-center">
        <p className="text-sm font-bold text-[#2A2320] mb-1">{t("legal.privacy.questionsTitle")}</p>
        <p className="text-xs text-[#5E5450] mb-3">{t("legal.privacy.questionsBody")}</p>
        <Link href="/contact" className="inline-flex items-center gap-1.5 font-bold text-sm text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity" style={{ backgroundColor: "#5E9E8C" }}>
          {t("legal.privacy.contactBtn")} →
        </Link>
      </div>
    </div>
  );
}
