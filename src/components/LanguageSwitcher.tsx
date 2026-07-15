"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/context/LocaleContext";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on scroll instead of tracking a moving anchor — simplest way to
  // never show a dropdown pinned to the wrong spot.
  useEffect(() => {
    if (!open) return;
    function onScroll() { setOpen(false); }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink transition-colors px-2.5 py-1.5 rounded-lg hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label="Select language"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{locale.toUpperCase()}</span>
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

      {/* Portaled straight to <body> — the navbar's frosted rows each set
          their own backdrop-blur (a new CSS stacking context), and a
          dropdown positioned inside one of those rows can never paint above
          a LATER sibling row that also blurs (e.g. the category strip right
          below it), no matter how high its own z-index goes: it's trapped
          one stacking level down. A portal escapes every ancestor's stacking
          context entirely, so this can't happen regardless of where the
          switcher is used on the page. */}
      {open && mounted && createPortal(
        <ul
          ref={listRef}
          style={{ position: "fixed", top: pos.top, right: pos.right }}
          className="bg-canvas rounded-card shadow-lg border border-line py-1.5 min-w-[170px] z-[999] animate-pop-in"
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
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left focus-visible:outline-none focus-visible:bg-accent-soft ${
                    selected
                      ? "font-bold text-accent bg-accent-soft"
                      : "text-ink-soft hover:bg-panel"
                  }`}
                >
                  {/* A code badge instead of a flag — flags don't map cleanly
                      to languages anyway, and always renders regardless of
                      the OS's emoji font. */}
                  <span className="w-7 flex-shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-ink-muted">{code}</span>
                  <span>{meta.label}</span>
                  {selected && <span className="ml-auto text-accent">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
}
