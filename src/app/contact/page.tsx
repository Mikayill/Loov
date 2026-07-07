import type { Metadata } from "next";
import ContactForm from "./ContactForm";
import { getSettings } from "@/lib/db/settings";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("meta.contact.title"), description: t("meta.contact.description") };
}

export default async function ContactPage() {
  const { t } = await getT();
  const { expressEnabled } = await getSettings();

  const infoItems = [
    { icon: "📍", label: t("contact.address"), value: "Tbilisi, Georgia" },
    { icon: "📧", label: t("contact.email"),    value: "hello@loov.ge" },
    { icon: "📞", label: t("contact.phone"),    value: "+995 000 000 000" },
    { icon: "🕐", label: t("contact.hours"),    value: t("contact.hoursValue") },
  ];

  const faqs = [
    { q: t("contact.q1"), a: `${t("contact.a1Base")}${expressEnabled ? t("contact.a1Express") : ""}` },
    { q: t("contact.q2"), a: t("contact.a2") },
    { q: t("contact.q3"), a: t("contact.a3") },
    { q: t("contact.q4"), a: t("contact.a4") },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-12">

      {/* ── Header ── */}
      <div className="text-center mb-6 sm:mb-12">
        <span className="text-xs font-bold text-[#5E9E8C] uppercase tracking-widest">{t("contact.eyebrow")}</span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#2A2320] mt-2 mb-2 sm:mb-3">{t("contact.title")}</h1>
        <p className="text-[#5E5450] max-w-md mx-auto text-[13px] sm:text-sm leading-snug sm:leading-relaxed">
          {t("contact.subtitle")}
        </p>
      </div>

      {/* ── Main grid: Form + Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-8 mb-10 sm:mb-16">

        {/* Contact form (3/5) */}
        <div className="lg:col-span-3 bg-white rounded-2xl sm:rounded-3xl border border-[#DDD5CC] p-4 sm:p-7 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#2A2320] mb-4 sm:mb-6">{t("contact.sendMessage")}</h2>
          <ContactForm />
        </div>

        {/* Info sidebar (2/5) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">

          {/* Info card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#DDD5CC] p-4 sm:p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-[#2A2320] mb-4 sm:mb-5">{t("contact.getInTouch")}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-4">
              {infoItems.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest">{item.label}</p>
                    <p className="text-sm font-semibold text-[#2A2320] mt-0.5">{item.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp CTA */}
          <a
            href="https://wa.me/995000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#25D366] text-white rounded-2xl p-4 sm:p-5 font-bold hover:opacity-90 transition-opacity shadow-sm"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <div>
              <p className="text-sm font-extrabold">{t("contact.chatWhatsApp")}</p>
              <p className="text-xs opacity-80 font-medium mt-0.5">{t("contact.fastestResponse")}</p>
            </div>
          </a>

          {/* Response time badge */}
          <div
            className="rounded-2xl p-4 sm:p-5 border border-[#DDD5CC] flex items-center gap-3"
            style={{ backgroundColor: "#EAF2F0" }}
          >
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-sm font-bold text-[#2A2320]">{t("contact.avgResponseTime")}</p>
              <p className="text-xs text-[#5E5450] mt-0.5">
                {t("contact.emailWithin").split("{n}")[0]}<strong>{t("contact.hours24")}</strong>{t("contact.emailWithin").split("{n}")[1]}<br />
                {t("contact.whatsappWithin").split("{n}")[0]}<strong>{t("contact.hour1")}</strong>{t("contact.whatsappWithin").split("{n}")[1]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <section>
        <div className="text-center mb-5 sm:mb-8">
          <span className="text-xs font-bold text-[#5E9E8C] uppercase tracking-widest">{t("contact.quickAnswers")}</span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2A2320] mt-2">{t("contact.faqTitle")}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="bg-white rounded-2xl border border-[#DDD5CC] p-4 sm:p-6 shadow-sm"
            >
              <h3 className="font-bold text-[#2A2320] mb-2 flex items-start gap-2">
                <span className="text-[#5E9E8C] flex-shrink-0">{t("contact.qPrefix")}</span>
                {faq.q}
              </h3>
              <p className="text-sm text-[#5E5450] leading-relaxed pl-5">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
