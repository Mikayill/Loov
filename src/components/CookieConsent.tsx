"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/context/LocaleContext";

export default function CookieConsent() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("loov-cookies");
    if (!accepted) setTimeout(() => setVisible(true), 1500);
  }, []);

  function accept() {
    localStorage.setItem("loov-cookies", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("loov-cookies", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-6 left-0 right-0 z-[250] px-4 flex justify-center pointer-events-none">
      <div
        className="bg-ink text-white rounded-card shadow-2xl px-5 py-4 max-w-lg w-full pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        <div className="flex items-start gap-3 flex-1">
          <span className="text-xl flex-shrink-0 mt-0.5">🍪</span>
          {/* No explicit color on the text — inherits the box's own color,
              which flips light↔dark with theme via globals.css' .bg-ink
              override; hardcoded hex here would go stale under a flipped
              surface (same bug CartToast had). */}
          <p className="text-xs leading-relaxed opacity-75">
            {t("cookie.text")}{" "}
            <a href="/privacy" className="underline hover:opacity-100 transition-opacity">
              {t("cookie.privacyLink")}
            </a>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <button
            onClick={decline}
            className="text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity px-3 py-1.5"
          >
            {t("cookie.decline")}
          </button>
          <button
            onClick={accept}
            className="u-btn text-xs font-bold px-4 py-2 rounded-control bg-canvas text-ink hover:opacity-90"
          >
            {t("cookie.acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
