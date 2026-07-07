"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "@/context/LocaleContext";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const active = LOCALE_META[locale];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-semibold text-[#5E5450] hover:text-[#2A2320] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#EDE5D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E9E8C] focus-visible:ring-offset-2"
        aria-label="Select language"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{active.flag}</span>
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-lg border border-[#DDD5CC] py-1.5 min-w-[170px] z-50"
          role="listbox"
          aria-label="Language"
        >
          {LOCALES.map((code: Locale) => {
            const meta = LOCALE_META[code];
            const selected = locale === code;
            return (
              <li key={code} role="option" aria-selected={selected}>
                <button
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left focus-visible:outline-none focus-visible:bg-[#F0F7F5] ${
                    selected
                      ? "font-bold text-[#5E9E8C] bg-[#F0F7F5]"
                      : "text-[#5E5450] hover:bg-[#F5F0EB]"
                  }`}
                >
                  <span className="text-base leading-none">{meta.flag}</span>
                  <span>{meta.label}</span>
                  {selected && <span className="ml-auto text-[#5E9E8C]">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
