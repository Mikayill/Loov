"use client";

import { useState } from "react";
import Link from "next/link";
import SearchModal from "@/components/SearchModal";
import { useLocale } from "@/context/LocaleContext";

export default function NotFound() {
  const { t } = useLocale();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
        {/* Big number */}
        <div className="relative mb-6">
          <p
            className="text-[120px] sm:text-[160px] font-extrabold leading-none select-none"
            style={{ color: "#EDE5D8" }}
          >
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🌿
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A2320] mb-3">
          {t("err.notFoundTitle")}
        </h1>
        <p className="text-[#5E5450] mb-8 max-w-sm leading-relaxed text-sm">
          {t("err.notFoundBody")}
        </p>

        {/* Search bar */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-3 w-full max-w-sm mb-6 px-5 py-3 bg-white border-2 border-[#DDD5CC] rounded-2xl text-left hover:border-[#5E9E8C] transition-colors shadow-sm group"
        >
          <svg className="w-4 h-4 text-[#9A8E88] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[#9A8E88] text-sm group-hover:text-[#5E5450] transition-colors">{t("err.searchPlaceholder")}</span>
        </button>

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3 rounded-full text-white hover:opacity-90 shadow-sm transition-opacity"
            style={{ backgroundColor: "#5E9E8C" }}
          >
            ← {t("err.backToHome")}
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3 rounded-full border-2 border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-all"
          >
            {t("err.browseProducts")}
          </Link>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { label: t("nav.products"), href: "/products" },
            { label: t("nav.blog"),     href: "/blog" },
            { label: t("pdp.sizeGuide"),href: "/size-guide" },
            { label: t("nav.about"),    href: "/about" },
            { label: t("nav.contact"),  href: "/contact" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-[#9A8E88] hover:text-[#5E9E8C] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
