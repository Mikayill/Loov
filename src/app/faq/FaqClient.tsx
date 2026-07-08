"use client";

import { useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/db/useSettings";
import { useLocale } from "@/context/LocaleContext";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

/* Answers with shipping prices are built from the live store settings, so the
   FAQ never contradicts what checkout actually charges. */
function buildFaqs(s: { expressEnabled: boolean; freeShippingThreshold: number; standardShippingPrice: number; expressPrice: number }, t: (key: TranslationKey) => string) {
  return [
    {
      category: t("faq.catShipping"),
      emoji: "🚀",
      items: [
        {
          q: t("faq.ship.q1"),
          a: `${t("faq.ship.a1Base")}${s.expressEnabled ? t("faq.ship.a1Express") : ""}${t("faq.ship.a1Cities")}`,
        },
        {
          q: t("faq.ship.q2"),
          a: `${t("faq.ship.a2Free").replace("{threshold}", String(s.freeShippingThreshold))}${t("faq.ship.a2Paid").replace("{threshold}", String(s.freeShippingThreshold)).replace("{standard}", String(s.standardShippingPrice))}${s.expressEnabled ? t("faq.ship.a2Express").replace("{express}", String(s.expressPrice)) : ""}${t("faq.ship.a2End")}`,
        },
        { q: t("faq.ship.q3"), a: t("faq.ship.a3") },
        { q: t("faq.ship.q4"), a: t("faq.ship.a4") },
      ],
    },
    {
      category: t("faq.catReturns"),
      emoji: "🔄",
      items: [
        { q: t("faq.ret.q1"), a: t("faq.ret.a1") },
        { q: t("faq.ret.q2"), a: t("faq.ret.a2") },
        { q: t("faq.ret.q3"), a: t("faq.ret.a3") },
        { q: t("faq.ret.q4"), a: t("faq.ret.a4") },
      ],
    },
    {
      category: t("faq.catProducts"),
      emoji: "🌿",
      items: [
        { q: t("faq.prod.q1"), a: t("faq.prod.a1") },
        { q: t("faq.prod.q2"), a: t("faq.prod.a2") },
        { q: t("faq.prod.q3"), a: t("faq.prod.a3") },
        { q: t("faq.prod.q4"), a: t("faq.prod.a4") },
      ],
    },
    {
      category: t("faq.catOrders"),
      emoji: "💳",
      items: [
        { q: t("faq.ord.q1"), a: t("faq.ord.a1") },
        { q: t("faq.ord.q2"), a: t("faq.ord.a2") },
        { q: t("faq.ord.q3"), a: t("faq.ord.a3") },
        { q: t("faq.ord.q4"), a: t("faq.ord.a4") },
      ],
    },
  ];
}

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#F0E8E0] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
      >
        <span className="font-semibold text-[#2A2320] text-sm group-hover:text-[#5E9E8C] transition-colors leading-snug">
          {q}
        </span>
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
            open ? "bg-[#5E9E8C] rotate-45" : "bg-[#EDE5D8]"
          }`}
        >
          <svg
            className={`w-3 h-3 transition-colors ${open ? "text-white" : "text-[#9A8E88]"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      {open && (
        <p className="pb-4 text-sm text-[#5E5450] leading-relaxed pr-10">
          {a}
        </p>
      )}
    </div>
  );
}

export default function FaqClient() {
  const settings = useSettings();
  const { t } = useLocale();
  const faqs = buildFaqs(settings, t);
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#9A8E88] mb-6">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold">{t("faq.breadcrumb")}</span>
      </nav>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-4xl mb-3">💬</div>
        <h1 className="text-3xl font-extrabold text-[#2A2320] mb-2">{t("faq.title")}</h1>
        <p className="text-[#5E5450] text-sm max-w-md mx-auto leading-relaxed">
          {t("faq.subtitle")}{" "}
          <Link href="/contact" className="text-[#5E9E8C] font-bold hover:underline">{t("faq.contactUsLink")}</Link>
        </p>
      </div>

      {/* FAQ sections */}
      <div className="space-y-6">
        {faqs.map((section) => (
          <div key={section.category} className="bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[#F5F0EB]" style={{ backgroundColor: "#FAFAF8" }}>
              <span className="text-xl">{section.emoji}</span>
              <h2 className="font-extrabold text-[#2A2320]">{section.category}</h2>
            </div>
            <div className="px-6">
              {section.items.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Still have questions CTA */}
      <div className="mt-10 p-6 rounded-2xl text-center" style={{ background: "linear-gradient(135deg, #EAF2F0 0%, #E8EEF4 100%)" }}>
        <p className="font-extrabold text-[#2A2320] mb-1">{t("faq.stillQuestions")}</p>
        <p className="text-sm text-[#5E5450] mb-5">{t("faq.stillQuestionsBody")}</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 font-bold text-sm text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-sm"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            {t("faq.contactUsBtn")} →
          </Link>
          {settings.whatsappNumber && (
          <a
            href={`https://wa.me/${settings.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full border-2 border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#25D366" }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t("faq.whatsapp")}
          </a>
          )}
        </div>
      </div>
    </div>
  );
}
