import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.about.title"), description: t("meta.about.description") };
}

export default async function AboutPage() {
  const { t } = await getT();

  const values = [
    { emoji: "🌿", title: t("about.value1Title"), desc: t("about.value1Desc"), bg: "var(--color-accent-soft)" },
    { emoji: "🔬", title: t("about.value2Title"), desc: t("about.value2Desc"), bg: "#EDF2E8" },
    { emoji: "💝", title: t("about.value3Title"), desc: t("about.value3Desc"), bg: "#EDE8F2" },
    { emoji: "🌍", title: t("about.value4Title"), desc: t("about.value4Desc"), bg: "#F2EDE8" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-12">

      {/* ── Hero ── */}
      <section
        className="text-center rounded-card sm:rounded-card px-5 sm:px-6 py-8 sm:py-14 mb-8 sm:mb-16 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #F5F0EB 0%, #E8F0EE 60%, #EAE8F0 100%)" }}
      >
        <div className="absolute top-6 left-8 w-20 h-20 rounded-full opacity-30" style={{ backgroundColor: "#C8DDD8" }} />
        <div className="absolute bottom-6 right-8 w-28 h-28 rounded-full opacity-20" style={{ backgroundColor: "#D4CAE4" }} />
        <div className="relative">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🌿</div>
          <h1 className="text-2xl sm:text-5xl font-extrabold text-ink mb-3 sm:mb-5 leading-tight">
            {t("about.heroTitleA")}<br />
            <span style={{ color: "var(--color-accent)" }}>{t("about.heroTitleB")}</span>
          </h1>
          <p className="text-sm sm:text-lg text-ink-soft max-w-2xl mx-auto leading-snug sm:leading-relaxed">
            {t("about.heroSubtitle")}
          </p>
        </div>
      </section>

      {/* ── Story ── */}
      <section className="mb-8 sm:mb-16 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-center">
        <div>
          <span className="text-xs font-bold text-accent uppercase tracking-widest">{t("about.storyEyebrow")}</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mt-2 mb-5 leading-tight">
            {t("about.storyTitleA")}<br />{t("about.storyTitleB")}
          </h2>
          <div className="space-y-4 text-ink-soft leading-relaxed text-sm sm:text-base">
            <p>{t("about.storyP1")}</p>
            <p>{t("about.storyP2")}</p>
            <p>{t("about.storyP3")}</p>
          </div>
        </div>

        {/* Visual block */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { emoji: "👶", bg: "#C8DDD8", caption: t("about.visualNewbornReady") },
            { emoji: "🌿", bg: "#D0E0CC", caption: t("about.visualOrganicCertified") },
            { emoji: "☁️", bg: "#C4D4E4", caption: t("about.visualCloudSoft") },
            { emoji: "🎀", bg: "#D4CAE4", caption: t("about.visualGiftPerfect") },
          ].map((card) => (
            <div
              key={card.caption}
              className="rounded-card flex flex-col items-center justify-center gap-2 py-6 sm:py-8 border border-line"
              style={{ backgroundColor: card.bg }}
            >
              <span className="text-4xl">{card.emoji}</span>
              <span className="text-xs font-bold text-ink-soft">{card.caption}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section className="mb-8 sm:mb-16">
        <div className="text-center mb-5 sm:mb-10">
          <span className="text-xs font-bold text-accent uppercase tracking-widest">{t("about.valuesEyebrow")}</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mt-2">{t("about.valuesTitle")}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          {values.map((v) => (
            <div
              key={v.title}
              className="rounded-card p-4 sm:p-6 border border-line flex gap-3 sm:gap-5 items-start"
              style={{ backgroundColor: v.bg }}
            >
              <span className="text-3xl flex-shrink-0">{v.emoji}</span>
              <div>
                <h3 className="font-bold text-ink mb-1.5">{v.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="rounded-card sm:rounded-card p-6 sm:p-10 text-center"
        style={{ background: "linear-gradient(135deg, #EAF2F0 0%, #E8EDF5 100%)" }}
      >
        <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🌸</div>
        <h2 className="text-2xl font-extrabold text-ink mb-3">
          {t("about.ctaTitle")}
        </h2>
        <p className="text-ink-soft mb-6 max-w-md mx-auto text-sm leading-relaxed">
          {t("about.ctaBody")}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-control text-white hover:opacity-90 transition-opacity shadow-sm"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {t("about.ctaButton")} →
        </Link>
      </section>
    </div>
  );
}
