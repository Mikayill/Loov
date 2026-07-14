"use client";

import { useState } from "react";
import Link from "next/link";
import { Bundle, BundleProductConfig } from "@/lib/bundles";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
import { useLocale } from "@/context/LocaleContext";
import { colorLabel, sizeLabel } from "@/lib/i18n/labels";

const colorHexMap: Record<string, string> = {
  White: "#F5F2ED", Sage: "#9BBFB8", Sand: "#D4B896", "Sky Blue": "#87BEDC",
  Beige: "#D4C5A9", Cream: "#F0E8D4", Lavender: "#C4B4D4", Blue: "#8AAEC8",
  Golden: "#E8C870", Grey: "#C8C8D8", Blush: "#E8C0C0",
  "White & Blue": "#8AAEC8", "White & Sage": "#9BBFB8", "White & Sand": "#D4B896",
  "White & Mint": "#8FD4C0", "Pastel Rainbow": "#E8D0E8", "Neutral Rainbow": "#D8D0C8",
};
function hex(name: string) { return colorHexMap[name] ?? "#C8C8C8"; }

interface BundledProduct {
  config: BundleProductConfig;
  product: Product;
}

interface Props {
  bundle: Bundle;
  bundleProducts: BundledProduct[];
}

export default function BundleDetailClient({ bundle, bundleProducts }: Props) {
  const { t } = useLocale();
  const { addItem } = useCart();

  /* Per-item selected color and size */
  const [selections, setSelections] = useState<Record<string, { color: string; size: string }>>(() =>
    Object.fromEntries(
      bundleProducts.map(({ product }) => [
        product.slug,
        { color: product.colors[0], size: product.sizes[0] },
      ])
    )
  );

  const [status, setStatus] = useState<"idle" | "added" | "blocked">("idle");

  function setColor(slug: string, color: string) {
    setSelections((prev) => ({ ...prev, [slug]: { ...prev[slug], color } }));
  }
  function setSize(slug: string, size: string) {
    setSelections((prev) => ({ ...prev, [slug]: { ...prev[slug], size } }));
  }

  function handleAddAll() {
    let anyAdded = false;
    bundleProducts.forEach(({ product, config }) => {
      const sel = selections[product.slug];
      const qty = config.quantity ?? 1;
      const result = addItem(product, sel.color, sel.size, qty, bundle.slug);
      if (result.added > 0) anyAdded = true;
    });
    if (!anyAdded) {
      setStatus("blocked");
      setTimeout(() => setStatus("idle"), 1800);
      return;
    }
    setStatus("added");
    setTimeout(() => setStatus("idle"), 3000);
  }

  /* "Bought separately" total — LIVE from the catalog + selected sizes, so
     per-size prices (e.g. a bigger towel) are reflected honestly. Falls back
     to the admin-set original price if the items can't be resolved. */
  const separately = bundleProducts.length
    ? bundleProducts.reduce(
        (sum, { product, config }) =>
          sum + effectivePrice(product, selections[product.slug]?.size) * (config.quantity ?? 1),
        0
      )
    : bundle.originalPrice;
  const savings = Math.max(0, separately - bundle.bundlePrice);
  const savingsPct = separately > 0 ? Math.round((savings / separately) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-4 sm:mb-7">
        <Link href="/" className="hover:text-accent transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/bundles" className="hover:text-accent transition-colors">{t("bundle.breadcrumb")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{bundle.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-10">

        {/* Left — visual + info */}
        <div className="lg:col-span-2">
          {/* Hero card — photo when set, emoji fallback */}
          <div
            className={`relative rounded-card sm:rounded-3xl flex flex-col items-center justify-center mb-4 sm:mb-5 overflow-hidden ${bundle.imageUrl ? "aspect-square" : "py-8 sm:py-14 px-6 sm:px-8"}`}
            style={{ backgroundColor: bundle.cardColor }}
          >
            {bundle.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bundle.imageUrl} alt={bundle.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <span className="text-6xl sm:text-8xl mb-2 sm:mb-3">{bundle.emoji}</span>
                <span className="text-xs sm:text-sm font-bold text-ink/70">{bundle.subtitle}</span>
              </>
            )}
            {bundle.isNew && (
              <span className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                {t("product.new")}
              </span>
            )}
            <span className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-ink text-white text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 rounded-full">
              {t("bundle.save").replace("{amount}", formatPrice(savings))}
            </span>
          </div>

          {/* Price box */}
          <div className="bg-white rounded-card border border-line p-4 sm:p-5 mb-4 sm:mb-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] text-ink-muted line-through mb-0.5">{formatPrice(separately)} {t("bundle.separately")}</p>
                <p className="text-3xl font-extrabold text-ink">{formatPrice(bundle.bundlePrice)}</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full flex flex-col items-center justify-center text-white font-extrabold" style={{ backgroundColor: "#5E9E8C" }}>
                  <span className="text-lg leading-none">-{savingsPct}%</span>
                  <span className="text-[9px] font-bold opacity-80">OFF</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-accent font-semibold bg-accent-soft rounded-lg px-3 py-2">
              🎁 {t("bundle.saveVs").split("{amount}")[0]}<strong>{formatPrice(savings)}</strong>{t("bundle.saveVs").split("{amount}")[1]}
            </p>
          </div>

          {/* Features */}
          <div className="bg-white rounded-card border border-line p-4 sm:p-5">
            <h3 className="font-bold text-ink text-sm mb-3">{t("bundle.whyThis")}</h3>
            <ul className="space-y-2">
              {bundle.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-soft">
                  <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right — configurator */}
        <div className="lg:col-span-3">
          <div className="mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink mb-1">{bundle.name}</h1>
            <p className="text-ink-soft text-sm leading-relaxed">{bundle.description}</p>
          </div>

          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mt-5 sm:mt-6 mb-3">
            {bundleProducts.length === 1 ? t("bundle.itemsIncluded1") : t("bundle.itemsIncluded").replace("{n}", String(bundleProducts.length))}
          </p>

          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            {bundleProducts.map(({ product, config }, idx) => {
              const sel = selections[product.slug];
              return (
                <div
                  key={`${product.slug}-${idx}`}
                  className="bg-white rounded-card border-2 border-line p-3.5 sm:p-5"
                >
                  <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4">
                    {/* Emoji thumbnail */}
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-control flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: hex(sel.color) === "#C8C8C8" ? product.cardColor : hex(sel.color) + "55" }}
                    >
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        product.emoji
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-ink text-sm leading-snug">{product.name}</p>
                          {config.quantity && config.quantity > 1 && (
                            <span className="text-[10px] font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-full">
                              ×{config.quantity}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-extrabold text-ink-muted flex-shrink-0">
                          {formatPrice(effectivePrice(product, sel.size) * (config.quantity ?? 1))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Color picker */}
                    <div>
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">
                        {t("product.color")}: <span className="text-accent normal-case">{colorLabel(sel.color, t)}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {product.colors.map((c) => (
                          <button
                            key={c}
                            title={colorLabel(c, t)}
                            onClick={() => setColor(product.slug, c)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              sel.color === c
                                ? "border-accent ring-2 ring-accent ring-offset-1 scale-110"
                                : "border-line hover:border-ink-muted"
                            }`}
                            style={{ backgroundColor: hex(c) }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Size picker */}
                    {product.sizes[0] !== "One Size" && (
                      <div>
                        <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">
                          {t("product.size")}: <span className="text-accent normal-case">{sizeLabel(sel.size, t)}</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {product.sizes.map((s) => (
                            <button
                              key={s}
                              onClick={() => setSize(product.slug, s)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border-2 transition-all ${
                                sel.size === s
                                  ? "border-accent bg-accent-soft text-accent"
                                  : "border-line text-ink-soft hover:border-accent"
                              }`}
                            >
                              {sizeLabel(s, t)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky CTA */}
          <div className="sticky bottom-4 bg-white rounded-card border border-line shadow-lg p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] text-ink-muted line-through">{formatPrice(separately)}</p>
                <p className="text-xl font-extrabold text-ink">{formatPrice(bundle.bundlePrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-accent">{t("bundle.youSave").replace("{amount}", formatPrice(savings))}</p>
                <p className="text-[10px] text-ink-muted">{t("bundle.configuredAbove").replace("{n}", String(bundleProducts.length))}</p>
              </div>
            </div>

            <button
              onClick={handleAddAll}
              className={`w-full py-3.5 rounded-card font-extrabold text-white text-base transition-all duration-300 flex items-center justify-center gap-2 shadow-sm ${
                status === "added" ? "bg-green-500 scale-[0.98]" :
                status === "blocked" ? "bg-red-500" :
                "hover:opacity-90 active:scale-[0.98]"
              }`}
              style={status === "idle" ? { backgroundColor: "#5E9E8C" } : {}}
            >
              {status === "added" ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t("bundle.allAdded")}
                </>
              ) : status === "blocked" ? (
                t("cart.cantAddMore")
              ) : (
                `🛒 ${t("bundle.addToCart")} · ${formatPrice(bundle.bundlePrice)}`
              )}
            </button>

            {status === "added" && (
              <div className="flex gap-2 mt-2">
                <Link
                  href="/cart"
                  className="flex-1 py-2.5 rounded-control border-2 border-line text-xs font-bold text-ink-soft hover:border-accent hover:text-accent transition-colors text-center"
                >
                  {t("bundle.viewCart")} →
                </Link>
                <Link
                  href="/checkout"
                  className="flex-1 py-2.5 rounded-control text-xs font-bold text-white text-center hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#5E9E8C" }}
                >
                  {t("bundle.checkout")} →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Browse more bundles */}
      <div className="mt-10 sm:mt-16 pt-8 sm:pt-10 border-t border-line text-center">
        <p className="text-ink-muted text-sm mb-4">{t("bundle.exploreMore")}</p>
        <Link
          href="/bundles"
          className="inline-flex items-center gap-2 font-bold px-7 py-3 rounded-full border-2 border-line text-ink-soft hover:border-accent hover:text-accent transition-all text-sm"
        >
          ← {t("bundle.allBundles")}
        </Link>
      </div>
    </div>
  );
}
