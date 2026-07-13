import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.sizeGuide.title"), description: t("meta.sizeGuide.description") };
}

const sizeRows = [
  { size: "0-1 Month",    age: "Newborn",  height: "50–56 cm", weight: "Up to 4 kg",  chest: "36–38 cm" },
  { size: "0-3 Months",   age: "0–3 mo",   height: "56–62 cm", weight: "4–6 kg",      chest: "38–40 cm" },
  { size: "3-6 Months",   age: "3–6 mo",   height: "62–68 cm", weight: "6–8 kg",      chest: "40–42 cm" },
  { size: "6-9 Months",   age: "6–9 mo",   height: "68–74 cm", weight: "8–10 kg",     chest: "42–44 cm" },
  { size: "9-12 Months",  age: "9–12 mo",  height: "74–80 cm", weight: "10–11 kg",    chest: "44–46 cm" },
  { size: "12-18 Months", age: "12–18 mo", height: "80–86 cm", weight: "11–13 kg",    chest: "46–48 cm" },
  { size: "18-24 Months", age: "18–24 mo", height: "86–92 cm", weight: "13–15 kg",    chest: "48–50 cm" },
  { size: "2-3 Years",    age: "2–3 yr",   height: "92–98 cm", weight: "13–15 kg",    chest: "50–52 cm" },
  { size: "3-4 Years",    age: "3–4 yr",   height: "98–104 cm", weight: "15–17 kg",   chest: "52–54 cm" },
];

function localizeAge(age: string, t: (key: TranslationKey) => string): string {
  if (age === "Newborn") return t("sg.newborn");
  const mo = age.match(/^(\d+)–(\d+) mo$/);
  if (mo) return `${mo[1]}–${mo[2]} ${t("sg.moSuffix")}`;
  const yr = age.match(/^(\d+)–(\d+) yr$/);
  if (yr) return `${yr[1]}–${yr[2]} ${t("sg.yrSuffix")}`;
  return age;
}

export default async function SizeGuidePage() {
  const { t } = await getT();

  /* TOG = warmth rating for sleepwear/sleep sacks — pick by room temperature.
     TOG values are an industry standard, not per-product claims. */
  const togRows = [
    { room: t("sg.togR1Room"), tog: "0.5",  dress: t("sg.togR1Dress") },
    { room: t("sg.togR2Room"), tog: "1.0",  dress: t("sg.togR2Dress") },
    { room: t("sg.togR3Room"), tog: "2.5",  dress: t("sg.togR3Dress") },
    { room: t("sg.togR4Room"), tog: "2.5+", dress: t("sg.togR4Dress") },
  ];

  const blanketSizes = [
    { size: "80×100 cm",  use: t("sg.blanket1") },
    { size: "100×120 cm", use: t("sg.blanket2") },
    { size: "120×120 cm", use: t("sg.blanket3") },
  ];

  const towelSizes = [
    { size: "70×70 cm",   use: t("sg.towel1") },
    { size: "90×90 cm",   use: t("sg.towel2") },
    { size: "100×100 cm", use: t("sg.towel3") },
  ];

  const howToMeasure = [
    { label: t("sg.measureHeight"), desc: t("sg.measureHeightDesc") },
    { label: t("sg.measureChest"),  desc: t("sg.measureChestDesc") },
    { label: t("sg.measureWeight"), desc: t("sg.measureWeightDesc") },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#9A8E88] mb-6">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold">{t("sg.breadcrumb")}</span>
      </nav>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-4xl mb-3">📏</div>
        <h1 className="text-3xl font-extrabold text-[#2A2320] mb-2">{t("sg.title")}</h1>
        <p className="text-[#5E5450] text-sm max-w-md mx-auto leading-relaxed">
          {t("sg.subtitle")}
        </p>
      </div>

      {/* Tip banner */}
      <div className="flex items-start gap-3 bg-[#EAF2F0] border border-[#C8DDD8] rounded-2xl p-4 mb-8">
        <span className="text-xl flex-shrink-0">💡</span>
        <p className="text-sm text-[#3A7A68] font-medium leading-relaxed">
          <strong>{t("sg.proTip")}</strong> {t("sg.proTipBody")}
        </p>
      </div>

      {/* Clothing size chart */}
      <section className="mb-10">
        <h2 className="text-xl font-extrabold text-[#2A2320] mb-4">👶 {t("sg.clothingTitle")}</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#DDD5CC]">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#EDE5D8" }}>
                {[t("sg.colSizeLabel"), t("sg.colAge"), t("sg.colHeight"), t("sg.colWeight"), t("sg.colChest")].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-bold text-[#2A2320] whitespace-nowrap first:rounded-tl-2xl last:rounded-tr-2xl">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizeRows.map((row, i) => (
                <tr key={row.size} className={`border-t border-[#DDD5CC] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}>
                  <td className="px-4 py-3 font-bold text-[#2A2320] whitespace-nowrap">{row.size}</td>
                  <td className="px-4 py-3 text-[#5E5450]">{localizeAge(row.age, t)}</td>
                  <td className="px-4 py-3 text-[#5E5450] whitespace-nowrap">{row.height}</td>
                  <td className="px-4 py-3 text-[#5E5450] whitespace-nowrap">{row.weight}</td>
                  <td className="px-4 py-3 text-[#5E5450] whitespace-nowrap">{row.chest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Blankets + Towels side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <section>
          <h2 className="text-xl font-extrabold text-[#2A2320] mb-4">☁️ {t("sg.blanketsTitle")}</h2>
          <div className="overflow-x-auto rounded-2xl border border-[#DDD5CC]">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#EDE5D8" }}>
                  <th className="text-left px-4 py-3 font-bold text-[#2A2320]">{t("sg.colSize")}</th>
                  <th className="text-left px-4 py-3 font-bold text-[#2A2320]">{t("sg.colBestFor")}</th>
                </tr>
              </thead>
              <tbody>
                {blanketSizes.map((row, i) => (
                  <tr key={row.size} className={`border-t border-[#DDD5CC] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}>
                    <td className="px-4 py-3 font-semibold text-[#2A2320] whitespace-nowrap">{row.size}</td>
                    <td className="px-4 py-3 text-[#5E5450] text-xs">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-extrabold text-[#2A2320] mb-4">🛁 {t("sg.towelsTitle")}</h2>
          <div className="overflow-x-auto rounded-2xl border border-[#DDD5CC]">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#EDE5D8" }}>
                  <th className="text-left px-4 py-3 font-bold text-[#2A2320]">{t("sg.colSize")}</th>
                  <th className="text-left px-4 py-3 font-bold text-[#2A2320]">{t("sg.colBestFor")}</th>
                </tr>
              </thead>
              <tbody>
                {towelSizes.map((row, i) => (
                  <tr key={row.size} className={`border-t border-[#DDD5CC] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}>
                    <td className="px-4 py-3 font-semibold text-[#2A2320] whitespace-nowrap">{row.size}</td>
                    <td className="px-4 py-3 text-[#5E5450] text-xs">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* How to measure */}
      <section className="mb-10">
        <h2 className="text-xl font-extrabold text-[#2A2320] mb-4">📐 {t("sg.howToMeasure")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {howToMeasure.map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-[#DDD5CC] p-5">
              <p className="font-bold text-[#2A2320] mb-2">{item.label}</p>
              <p className="text-sm text-[#5E5450] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sleep & TOG guide — we sell sleep sacks/pajamas, so parents need this */}
      <section className="mb-10">
        <h2 className="text-xl font-extrabold text-[#2A2320] mb-2">🌙 {t("sg.togTitle")}</h2>
        <p className="text-sm text-[#5E5450] leading-relaxed mb-4 max-w-2xl">{t("sg.togIntro")}</p>
        <div className="overflow-x-auto rounded-2xl border border-[#DDD5CC]">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#EDE5D8" }}>
                <th className="text-left px-4 py-3 font-bold text-[#2A2320] whitespace-nowrap">{t("sg.togColRoom")}</th>
                <th className="text-left px-4 py-3 font-bold text-[#2A2320] whitespace-nowrap">{t("sg.togColTog")}</th>
                <th className="text-left px-4 py-3 font-bold text-[#2A2320]">{t("sg.togColDress")}</th>
              </tr>
            </thead>
            <tbody>
              {togRows.map((row, i) => (
                <tr key={row.tog} className={`border-t border-[#DDD5CC] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}>
                  <td className="px-4 py-3 font-semibold text-[#2A2320] whitespace-nowrap">{row.room}</td>
                  <td className="px-4 py-3 text-[#5E5450] whitespace-nowrap">{row.tog} TOG</td>
                  <td className="px-4 py-3 text-[#5E5450] text-xs">{row.dress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-start gap-3 bg-[#FFF8E8] border border-[#F0C85A] rounded-2xl p-4 mt-4">
          <span className="text-xl flex-shrink-0">🛡️</span>
          <p className="text-sm text-[#8B6914] font-medium leading-relaxed">{t("sg.togNote")}</p>
        </div>
      </section>

      {/* Certifications note */}
      <div className="bg-[#F5F0EB] rounded-2xl p-6 text-center">
        <p className="text-sm text-[#5E5450] leading-relaxed mb-4">
          {t("sg.certNote")}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/contact" className="font-bold text-[#5E9E8C] hover:underline text-sm">
            {t("sg.askWhatsApp")} →
          </Link>
          <span className="text-[#DDD5CC]">|</span>
          <Link href="/products" className="font-bold text-[#5E9E8C] hover:underline text-sm">
            {t("sg.browseCollection")} →
          </Link>
        </div>
      </div>
    </div>
  );
}
