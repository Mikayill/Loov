"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/context/LocaleContext";

export type ThemeName = "light" | "dark";

export function applyTheme(next: ThemeName) {
  const el = document.documentElement;
  el.classList.add("theme-anim");
  if (next === "dark") el.dataset.theme = "dark";
  else delete el.dataset.theme;
  document.cookie = `loov-theme=${next};path=/;max-age=31536000;samesite=lax`;
  window.setTimeout(() => el.classList.remove("theme-anim"), 400);
  window.dispatchEvent(new CustomEvent("loov-theme", { detail: next }));
}

export function useTheme(): [ThemeName, (t: ThemeName) => void] {
  const [theme, setTheme] = useState<ThemeName>("light");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    const onChange = (e: Event) => setTheme((e as CustomEvent).detail as ThemeName);
    window.addEventListener("loov-theme", onChange);
    return () => window.removeEventListener("loov-theme", onChange);
  }, []);
  return [theme, (t) => { applyTheme(t); setTheme(t); }];
}

/* Compact sun/moon toggle for the navbar */
export default function ThemeToggle() {
  const { t } = useLocale();
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={t("theme.toggle")}
      title={t("theme.toggle")}
      className="w-9 h-9 rounded-control flex items-center justify-center text-ink-soft hover:bg-panel hover:text-ink transition-colors active:scale-90"
    >
      {dark ? (
        /* Sun — shown while dark, tapping returns to light */
        <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M4.22 4.22l1.06 1.06M18.72 18.72l1.06 1.06M3 12h1.5M19.5 12H21M4.22 19.78l1.06-1.06M18.72 5.28l1.06-1.06M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        /* Moon — shown while light */
        <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
