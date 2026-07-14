"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { useLocale } from "@/context/LocaleContext";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();
  useEffect(() => {
    console.error(error);
    // React error-boundary errors are not auto-captured — report explicitly.
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-6">
        <p
          className="text-[100px] sm:text-[140px] font-extrabold leading-none select-none"
          style={{ color: "var(--color-panel)" }}
        >
          Oops
        </p>
        <div className="absolute inset-0 flex items-center justify-center text-5xl">
          🌿
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3">
        {t("err.somethingWrong")}
      </h1>
      <p className="text-ink-soft mb-8 max-w-sm leading-relaxed text-sm">
        {t("err.unexpectedIssue")}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3 rounded-control text-white hover:opacity-90 shadow-sm transition-opacity"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {t("err.tryAgain")}
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3 rounded-control border border-line text-ink-soft hover:border-accent hover:text-accent transition-all"
        >
          {t("err.backToHome")}
        </Link>
      </div>

      {error.digest && (
        <p className="text-[10px] text-ink-muted font-mono">
          {t("err.errorId").replace("{id}", error.digest)}
        </p>
      )}
    </div>
  );
}
