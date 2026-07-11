"use client";

import { useState, useRef, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Product } from "@/types";
import { categoryLabel, colorLabel, sizeLabel } from "@/lib/i18n/labels";
import { formatPrice, formatAmount } from "@/lib/format";
import Link from "next/link";
import { pointsForAmountAt } from "@/lib/loyalty";
import { useLoyalty } from "@/context/LoyaltyContext";
import { useLocale } from "@/context/LocaleContext";
import { fmtDateNoYear } from "@/lib/i18n/format";
import { useSettings } from "@/lib/db/useSettings";
import { effectivePrice, discountPercent, basePriceForSize } from "@/lib/pricing";
import { trackProductView } from "@/components/RecentlyViewedSection";
import { variantStock } from "@/lib/stock";

/* ── colour map ── */
const colorHexMap: Record<string, string> = {
  White: "#F5F2ED",
  Sage: "#9BBFB8",
  Sand: "#D4B896",
  "Sky Blue": "#87BEDC",
  Beige: "#D4C5A9",
  Cream: "#F0E8D4",
  Lavender: "#C4B4D4",
  Blue: "#8AAEC8",
  Mint: "#8FD4C0",
  "White & Blue": "#8AAEC8",
  "White & Sage": "#9BBFB8",
  "White & Sand": "#D4B896",
  "White & Mint": "#8FD4C0",
};

function hex(name: string) {
  return colorHexMap[name] ?? "#C8C8C8";
}

/* ── star rating helper ── */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className="w-4 h-4"
          viewBox="0 0 20 20"
          fill={i <= Math.floor(rating) ? "#F0B840" : i - 0.5 <= rating ? "url(#half)" : "#DDD5CC"}
        >
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="#F0B840" />
              <stop offset="50%" stopColor="#DDD5CC" />
            </linearGradient>
          </defs>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/* ── size guide table ── */
const sizeGuideRows = [
  { size: "0-1 Month",   age: "Newborn", height: "50–56 cm", weight: "up to 4 kg" },
  { size: "0-3 Months",  age: "0–3 mo",  height: "56–62 cm", weight: "4–6 kg" },
  { size: "3-6 Months",  age: "3–6 mo",  height: "62–68 cm", weight: "6–8 kg" },
  { size: "6-9 Months",  age: "6–9 mo",  height: "68–74 cm", weight: "8–10 kg" },
  { size: "9-12 Months", age: "9–12 mo", height: "74–80 cm", weight: "10–11 kg" },
  { size: "12-18 Months",age: "12–18 mo",height: "80–86 cm", weight: "11–13 kg" },
];

const DEFAULT_FEATURES = [
  "Tested, baby-safe fabrics — free of harmful substances",
  "Gentle on sensitive and newborn skin",
  "Machine washable at 30°C",
  "Keeps shape and softness after multiple washes",
  "Snag-free flat seams — no irritation inside",
  "Thoughtfully designed for easy diaper changes",
];

/* ════════════════════════════════════════════ */
export default function ProductDetailClient({
  product,
  reviewStats = { avg: 0, count: 0 },
}: {
  product: Product;
  /** Real review stats from the DB — the rating row is hidden when there are none. */
  reviewStats?: { avg: number; count: number };
}) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const { tier } = useLoyalty();
  const { t, locale } = useLocale();
  const { freeShippingThreshold, pointsPerGel, standardShippingPrice, expressEnabled, expressPrice, deliveryMinDays, deliveryMaxDays } = useSettings();

  /** Colors available for a given size — a color is excluded only if the
   *  admin explicitly set its stock to 0 for that size in the stock matrix
   *  (no entry at all = available at the flat fallback stock). */
  const colorsForSize = (size: string) => {
    const perSize = product.stockByVariant?.[size];
    if (!perSize) return product.colors;
    return product.colors.filter((c) => (perSize[c] ?? 1) > 0);
  };

  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(
    () => colorsForSize(product.sizes[0] ?? "")[0] ?? product.colors[0]
  );
  const [quantity,      setQuantity]      = useState(1);
  const [activeTab,     setActiveTab]     = useState<"description" | "materials" | "delivery">("description");
  const [cartStatus,    setCartStatus]    = useState<"idle" | "added" | "blocked">("idle");
  const [sizeGuide,     setSizeGuide]     = useState(false);
  const [noSize,        setNoSize]        = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [deliveryRange, setDeliveryRange] = useState<string>("");
  /* Back-in-stock waitlist (shown when the selected variant is sold out). */
  const [notifyEmail,   setNotifyEmail]   = useState("");
  const [notifyStatus,  setNotifyStatus]  = useState<"idle" | "sending" | "done">("idle");
  const [notifyError,   setNotifyError]   = useState("");

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    setNotifyError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail.trim())) { setNotifyError(t("auth.validEmail")); return; }
    setNotifyStatus("sending");
    try {
      const res = await fetch("/api/stock-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, email: notifyEmail.trim(), locale }),
      });
      if (!res.ok) throw new Error();
      setNotifyStatus("done");
    } catch {
      setNotifyStatus("idle");
      setNotifyError(t("checkout.errGeneric"));
    }
  }

  /* Photo gallery */
  const images = product.imageUrls && product.imageUrls.length
    ? product.imageUrls
    : product.imageUrl ? [product.imageUrl] : [];
  const [activeImg, setActiveImg] = useState(0);
  /* Crossfade (not a sliding carousel) means wrapping last→first or
     first→last never "jumps" — it's the same fade transition either way. */
  function prevImg() { setActiveImg((i) => (i - 1 + images.length) % images.length); }
  function nextImg() { setActiveImg((i) => (i + 1) % images.length); }

  const off = discountPercent(product);
  /* Price follows the selected size (per-size pricing). */
  const unitPrice = effectivePrice(product, selectedSize);
  const baseForSize = basePriceForSize(product, selectedSize);

  /* Track recently viewed */
  useEffect(() => { trackProductView(product.id); }, [product.id]);

  /* When the size changes, make sure the selected colour exists for it. */
  function pickSize(size: string) {
    setSelectedSize(size);
    setNoSize(false);
    const avail = colorsForSize(size);
    if (!avail.includes(selectedColor)) setSelectedColor(avail[0] ?? "");
  }

  /* Delivery estimate — admin-configurable business-day range (Settings → Delivery estimate) */
  useEffect(() => {
    function addBizDays(d: Date, n: number) {
      const r = new Date(d);
      let added = 0;
      while (added < n) {
        r.setDate(r.getDate() + 1);
        if (r.getDay() !== 0 && r.getDay() !== 6) added++;
      }
      return r;
    }
    const fmt = (d: Date) => fmtDateNoYear(d, locale);
    const now = new Date();
    setDeliveryRange(`${fmt(addBizDays(now, deliveryMinDays))} – ${fmt(addBizDays(now, deliveryMaxDays))}`);
  }, [locale, deliveryMinDays, deliveryMaxDays]);

  /* Share — native share sheet where available (mobile), else copy link */
  function handleShare() {
    if (typeof navigator.share === "function") {
      navigator.share({ title: product.name, url: window.location.href }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  /* sticky mobile bar */
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (ctaRef.current) obs.observe(ctaRef.current);
    return () => obs.disconnect();
  }, []);

  /* Real stock for the exact selected color+size (falls back to the flat
     product.stock if the admin hasn't set a per-variant count yet). */
  const stock = variantStock(product, selectedSize, selectedColor);
  const outOfStock = stock !== null && stock <= 0;
  const atMax = stock !== null && quantity >= stock;
  const availableColors = colorsForSize(selectedSize);

  /* Switching color/size can lower the available stock below the current
     quantity — clamp instead of letting the stepper silently disagree with
     what addItem will actually accept. */
  useEffect(() => {
    if (stock !== null) setQuantity((q) => Math.max(1, Math.min(q, stock)));
  }, [stock]);

  function handleAddToCart() {
    if (outOfStock) return;
    if (!selectedSize) { setNoSize(true); return; }
    setNoSize(false);
    const result = addItem(product, selectedColor, selectedSize, quantity);
    // Already-maxed cart → nothing was actually added — flash the button
    // red instead of silently doing nothing (or claiming false success).
    if (result.added <= 0) {
      setCartStatus("blocked");
      setTimeout(() => setCartStatus("idle"), 1800);
      return;
    }
    setCartStatus("added");
    setTimeout(() => setCartStatus("idle"), 2200);
  }

  const features = product.features && product.features.length ? product.features : DEFAULT_FEATURES;

  return (
    <>
      {/* ══ MAIN GRID ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

        {/* ── LEFT: Gallery ── */}
        <div className="space-y-4">
          {/* Main image — colour selection does NOT change the photo */}
          <div
            className="relative w-full aspect-square rounded-3xl flex items-center justify-center overflow-hidden border border-[#DDD5CC]"
            style={{ backgroundColor: product.cardColor }}
          >
            {images.length > 0 ? (
              images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt={product.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    i === activeImg ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))
            ) : (
              <span className="text-[130px] sm:text-[160px] select-none drop-shadow-sm">
                {product.emoji}
              </span>
            )}
            {product.isNew && (
              <span className="absolute top-5 left-5 bg-[#5E9E8C] text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide shadow">
                New
              </span>
            )}
            {off > 0 && (
              <span className="absolute top-5 right-5 bg-[#D9534F] text-white text-sm font-extrabold px-3 py-1.5 rounded-full shadow">
                {t("pdp.save").replace("{n}", String(off))}
              </span>
            )}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImg}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-[#DDD5CC] flex items-center justify-center text-[#2A2320] shadow-md hover:bg-[#5E9E8C] hover:text-white hover:border-[#5E9E8C] active:scale-90 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImg}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-[#DDD5CC] flex items-center justify-center text-[#2A2320] shadow-md hover:bg-[#5E9E8C] hover:text-white hover:border-[#5E9E8C] active:scale-90 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Photo thumbnails — smooth crossfade on click */}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {images.slice(0, 5).map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                    i === activeImg ? "border-[#5E9E8C] scale-95 shadow-md" : "border-[#DDD5CC] hover:border-[#9A8E88]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="flex flex-col">
          {/* Category tag */}
          <span className="inline-block self-start bg-[#EDE5D8] text-[#5E5450] text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            {categoryLabel(product.category, t)}
          </span>

          {/* Name */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2A2320] leading-tight mb-3">
            {product.name}
          </h1>

          {/* Stars — real review data only; hidden until the product has reviews */}
          {reviewStats.count > 0 && (
            <div className="flex items-center gap-2 mb-5">
              <Stars rating={reviewStats.avg} />
              <span className="text-sm text-[#9A8E88] font-medium">
                {reviewStats.avg} · {t("pdp.reviewsCount").replace("{n}", String(reviewStats.count))}
              </span>
            </div>
          )}

          {/* Price + stock + share */}
          <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className={`text-4xl font-extrabold ${off > 0 ? "text-[#D9534F]" : "text-[#2A2320]"}`}>
                {formatAmount(unitPrice)} <span className="text-2xl">₾</span>
              </p>
              {off > 0 && (
                <p className="text-xl text-[#9A8E88] line-through">{formatAmount(baseForSize)} ₾</p>
              )}
            </div>
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-bold transition-all ${
                copied
                  ? "border-[#5E9E8C] bg-[#EAF2F0] text-[#5E9E8C]"
                  : "border-[#DDD5CC] bg-white text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] hover:shadow-sm"
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t("pdp.copied")}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {t("pdp.share")}
                </>
              )}
            </button>
          </div>

          {/* Stock indicator */}
          {outOfStock ? (
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-sm font-bold text-red-500">{t("product.outOfStock")}</span>
              </div>
              {/* Back-in-stock waitlist */}
              {notifyStatus === "done" ? (
                <p className="mt-2 text-xs font-semibold text-[#5E9E8C]">✓ {t("pdp.notifyDone")}</p>
              ) : (
                <form onSubmit={handleNotify} className="mt-2.5">
                  <p className="text-xs text-[#5E5450] mb-1.5">{t("pdp.notifyPrompt")}</p>
                  <div className="flex items-stretch gap-2 max-w-sm">
                    <input
                      type="email" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 min-w-0 h-10 px-3 rounded-xl border-2 border-[#DDD5CC] text-sm font-medium outline-none focus:border-[#5E9E8C]"
                    />
                    <button
                      type="submit" disabled={notifyStatus === "sending"}
                      className="h-10 px-4 rounded-xl font-bold text-white text-sm whitespace-nowrap disabled:opacity-60 hover:opacity-90 active:scale-95 transition-all"
                      style={{ backgroundColor: "#5E9E8C" }}
                    >
                      {notifyStatus === "sending" ? "…" : t("pdp.notifyBtn")}
                    </button>
                  </div>
                  {notifyError && <p className="text-xs text-red-400 font-semibold mt-1">{notifyError}</p>}
                </form>
              )}
            </div>
          ) : stock !== null && stock <= 5 ? (
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
              <span className="text-sm font-bold text-orange-500">{t("pdp.onlyLeft").replace("{n}", String(stock))}</span>
            </div>
          ) : stock !== null ? (
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5E9E8C] flex-shrink-0" />
              <span className="text-sm font-semibold text-[#5E9E8C]">{t("pdp.inStock").replace("{n}", String(stock))}</span>
            </div>
          ) : null}

          {/* Delivery estimate */}
          {deliveryRange && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🚀</span>
              <span className="text-sm text-[#5E5450]">
                {t("pdp.deliveryEst")} <strong className="text-[#2A2320]">{deliveryRange}</strong>
              </span>
            </div>
          )}

          {/* Loyalty points */}
          <Link
            href="/account/rewards"
            className="inline-flex items-center gap-1.5 bg-[#FFF8E8] border border-[#F0C85A] rounded-full px-3 py-1.5 mb-5 hover:bg-[#FFF2D6] transition-colors group self-start"
            title="Loov Rewards"
          >
            <span className="text-sm">⭐</span>
            <span className="text-xs font-bold text-[#8B6914]">
              {t("pdp.earnPoints").replace("{n}", String(pointsForAmountAt(unitPrice, pointsPerGel, tier)))}
            </span>
            <span className="text-[10px] font-bold text-[#B8912E] opacity-0 group-hover:opacity-100 transition-opacity">
              {t("pdp.how")} →
            </span>
          </Link>

          <div className="h-px bg-[#DDD5CC] mb-6" />

          {/* ── Colour selector (photo stays fixed) ── */}
          <div className="mb-6">
            <p className="text-sm font-bold text-[#2A2320] mb-3">
              {t("product.color")}:{" "}
              <span className="text-[#5E9E8C] font-extrabold">{colorLabel(selectedColor, t)}</span>
            </p>
            <div className="flex flex-wrap gap-2.5">
              {product.colors.map((color) => {
                const disabled = !availableColors.includes(color);
                return (
                  <button
                    key={color}
                    onClick={() => !disabled && setSelectedColor(color)}
                    title={disabled ? `${colorLabel(color, t)} — ${t("pdp.colorNotInSize")}` : colorLabel(color, t)}
                    disabled={disabled}
                    className={`w-9 h-9 rounded-full border-2 transition-all duration-200 relative ${
                      selectedColor === color
                        ? "border-[#5E9E8C] ring-2 ring-[#5E9E8C] ring-offset-2 scale-110 shadow"
                        : disabled
                        ? "border-[#E8E0D8] opacity-40 cursor-not-allowed"
                        : "border-[#DDD5CC] hover:scale-110 hover:border-[#9A8E88]"
                    }`}
                    style={{ backgroundColor: hex(color) }}
                  >
                    {disabled && (
                      <span className="absolute inset-0 flex items-center justify-center text-[#9A8E88] text-xs font-bold">/</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Size selector ── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-[#2A2320]">
                {t("product.size")}:{" "}
                <span className="text-[#5E9E8C] font-extrabold">{sizeLabel(selectedSize, t)}</span>
              </p>
              <button
                onClick={() => setSizeGuide(true)}
                className="text-xs font-bold text-[#5E9E8C] hover:underline flex items-center gap-1"
              >
                {t("pdp.sizeGuide")}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => {
                /* Show the size's own price when it differs from the base price. */
                const sizePrice = effectivePrice(product, size);
                const differs = basePriceForSize(product, size) !== product.price;
                return (
                  <button
                    key={size}
                    onClick={() => pickSize(size)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                      selectedSize === size
                        ? "border-[#5E9E8C] bg-[#EAF2F0] text-[#5E9E8C] shadow-sm"
                        : "border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:bg-[#F5F8F7]"
                    }`}
                  >
                    {sizeLabel(size, t)}
                    {differs && (
                      <span className="block text-[10px] font-bold opacity-70 leading-tight">
                        {formatAmount(sizePrice)} ₾
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {noSize && (
              <p className="text-red-500 text-xs font-semibold mt-2">{t("pdp.selectSizeFirst")}</p>
            )}
          </div>

          <div className="h-px bg-[#DDD5CC] mb-6" />

          {/* ── Quantity + Add to cart ── */}
          <div ref={ctaRef} className="flex items-center gap-3 mb-4">
            <div className="flex items-center border-2 border-[#DDD5CC] rounded-xl overflow-hidden flex-shrink-0">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-11 h-12 flex items-center justify-center text-[#2A2320] font-bold text-xl hover:bg-[#EDE5D8] transition-all active:scale-90"
              >
                −
              </button>
              <span className="w-10 text-center font-extrabold text-[#2A2320] text-base">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(stock ?? Infinity, q + 1))}
                disabled={atMax || outOfStock}
                className="w-11 h-12 flex items-center justify-center text-[#2A2320] font-bold text-xl hover:bg-[#EDE5D8] transition-all active:scale-90 disabled:opacity-30 disabled:active:scale-100 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`flex-1 h-12 rounded-xl font-extrabold text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-sm text-sm ${
                cartStatus === "added"
                  ? "scale-95 bg-green-500"
                  : cartStatus === "blocked" || outOfStock
                  ? "bg-red-500"
                  : "hover:opacity-90 active:scale-95"
              } ${outOfStock ? "cursor-not-allowed" : ""}`}
              style={cartStatus === "idle" && !outOfStock ? { backgroundColor: "#5E9E8C" } : {}}
            >
              {outOfStock ? (
                t("pdp.outOfStockBtn")
              ) : cartStatus === "added" ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t("pdp.added")}
                </>
              ) : cartStatus === "blocked" ? (
                t("cart.cantAddMore")
              ) : (
                <>🛒 {t("common.addToCart")} &nbsp;·&nbsp; {formatPrice(unitPrice * quantity)}</>
              )}
            </button>
          </div>

          {atMax && !outOfStock && (
            <p className="text-sm font-bold text-orange-600 mb-3 -mt-1 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 inline-block">
              {t("pdp.thatsAll").replace("{n}", String(stock))}
            </p>
          )}

          {/* Wishlist */}
          <button
            onClick={() => toggle(product.id)}
            className={`w-full h-12 rounded-xl border-2 font-semibold transition-all duration-200 mb-7 flex items-center justify-center gap-2 text-sm ${
              has(product.id)
                ? "border-red-400 bg-red-50 text-red-500 hover:bg-red-100"
                : "border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] hover:bg-[#F5F8F7]"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={has(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {has(product.id) ? t("pdp.savedWishlist") : t("pdp.saveWishlist")}
          </button>

          {/* Trust bar */}
          <div className="bg-[#F5F0EB] rounded-2xl p-5 space-y-3">
            {[
              { icon: "🌿", text: t("pdp.trustOrganic") },
              { icon: "🚀", text: t("pdp.trustShipping").replace("{n}", String(freeShippingThreshold)) },
              { icon: "🔄", text: t("pdp.trustReturns") },
              { icon: "🔒", text: t("pdp.trustSecure") },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-base">{item.icon}</span>
                <span className="text-sm text-[#5E5450] font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ TABS ══ */}
      <div className="mt-16">
        <div className="flex border-b-2 border-[#DDD5CC] mb-8 overflow-x-auto overflow-y-hidden">
          {(
            [
              { id: "description", label: t("pdp.tabDescription") },
              { id: "materials",   label: t("pdp.tabMaterials") },
              { id: "delivery",    label: t("pdp.tabDelivery") },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 font-bold text-sm whitespace-nowrap transition-all duration-200 border-b-2 -mb-0.5 ${
                activeTab === tab.id
                  ? "border-[#5E9E8C] text-[#5E9E8C]"
                  : "border-transparent text-[#9A8E88] hover:text-[#5E5450]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl">
          {activeTab === "description" && (
            <div className="space-y-6 transition-opacity">
              <p className="text-[#5E5450] leading-relaxed whitespace-pre-line">{product.description}</p>
              <ul className="space-y-2.5">
                {features.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#EAF2F0] text-[#5E9E8C] flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                    <span className="text-sm text-[#5E5450]">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-6 transition-opacity">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Material",       value: product.material || "100% Organic Cotton" },
                  { label: "Weight",         value: product.weight || "180 GSM" },
                  // Certification only shows when set per-product in admin —
                  // no blanket claim we can't back with supplier documents.
                  { label: "Certification",  value: product.certification || "" },
                  { label: "Origin",         value: product.origin || "Made in Georgia" },
                ].filter((item) => item.value).map((item) => (
                  <div key={item.label} className="bg-[#F5F0EB] rounded-2xl p-4 border border-[#DDD5CC]">
                    <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="font-bold text-[#2A2320] text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-[#2A2320] mb-3">Care Instructions</h4>
                <ul className="space-y-2">
                  {(product.careInstructions && product.careInstructions.length
                    ? product.careInstructions
                    : [
                        "Machine wash at 30°C on a gentle cycle",
                        "Do not bleach or use harsh chemicals",
                        "Tumble dry on low heat or air dry",
                        "Iron on low if needed — do not iron prints",
                        "Do not dry clean",
                      ]
                  ).map((care) => (
                    <li key={care} className="flex items-start gap-2 text-sm text-[#5E5450]">
                      <span className="text-[#9A8E88] font-bold mt-0.5">·</span>
                      {care}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "delivery" && (
            <div className="space-y-4 transition-opacity">
              {[
                { icon: "🚀", title: "Standard Delivery", desc: `${deliveryMinDays}–${deliveryMaxDays} business days · Free on orders over ${freeShippingThreshold} ₾ (${standardShippingPrice} ₾ otherwise)`, bg: "#EAF2F0" },
                ...(expressEnabled
                  ? [{ icon: "⚡", title: "Express Delivery", desc: `Next business day — order before 14:00 · ${expressPrice} ₾`, bg: "#F0EDE8" }]
                  : []),
                { icon: "🔄", title: "Free Returns", desc: "Return any item within 14 days — no questions asked", bg: "#EAF2F0" },
                { icon: "🎁", title: "Gift Packaging", desc: "Add a gift message and ribbon wrap at checkout — completely free", bg: "#F0EDE8" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-5 rounded-2xl border border-[#DDD5CC]" style={{ backgroundColor: item.bg }}>
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-bold text-[#2A2320] mb-1">{item.title}</p>
                    <p className="text-sm text-[#5E5450] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ SIZE GUIDE MODAL ══ */}
      {sizeGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(42,35,32,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setSizeGuide(false)}
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-[#2A2320]">{t("pdp.sizeGuide")}</h3>
              <button onClick={() => setSizeGuide(false)} className="w-9 h-9 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#5E5450] hover:bg-[#EDE5D8] transition-colors font-bold">✕</button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#DDD5CC]">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#EDE5D8" }}>
                    {["Size", "Age", "Height", "Weight"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-bold text-[#2A2320] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizeGuideRows.map((row, i) => (
                    <tr key={row.size} className={`border-t border-[#DDD5CC] transition-colors ${selectedSize === row.size ? "bg-[#EAF2F0]" : i % 2 === 0 ? "bg-white" : "bg-[#FAF7F4]"}`}>
                      <td className="px-4 py-3 font-bold text-[#2A2320] whitespace-nowrap">{row.size}</td>
                      <td className="px-4 py-3 text-[#5E5450]">{row.age}</td>
                      <td className="px-4 py-3 text-[#5E5450] whitespace-nowrap">{row.height}</td>
                      <td className="px-4 py-3 text-[#5E5450] whitespace-nowrap">{row.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ MOBILE STICKY CTA ══ */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[#DDD5CC] px-4 py-3 sm:hidden shadow-2xl transition-transform duration-300 ${showSticky ? "translate-y-0" : "translate-y-full"}`}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex items-center border-2 border-[#DDD5CC] rounded-xl overflow-hidden">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-11 flex items-center justify-center font-bold text-lg hover:bg-[#EDE5D8] transition-all active:scale-90">−</button>
            <span className="w-8 text-center font-extrabold text-[#2A2320]">{quantity}</span>
            <button onClick={() => setQuantity((q) => Math.min(stock ?? Infinity, q + 1))} disabled={atMax || outOfStock} className="w-10 h-11 flex items-center justify-center font-bold text-lg hover:bg-[#EDE5D8] transition-all active:scale-90 disabled:opacity-30 disabled:active:scale-100 disabled:cursor-not-allowed">+</button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={`flex-1 h-11 rounded-xl font-extrabold text-white text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${
              cartStatus === "added" ? "bg-green-500 scale-95" :
              cartStatus === "blocked" || outOfStock ? "bg-red-500" :
              "hover:opacity-90 active:scale-95"
            } ${outOfStock ? "cursor-not-allowed" : ""}`}
            style={cartStatus === "idle" && !outOfStock ? { backgroundColor: "#5E9E8C" } : {}}
          >
            {outOfStock ? t("pdp.outOfStockBtn") : cartStatus === "added" ? `✓ ${t("pdp.added")}` : cartStatus === "blocked" ? t("cart.cantAddMore") : `🛒 ${t("common.addToCart")} · ${formatPrice(unitPrice * quantity)}`}
          </button>
        </div>
      </div>
    </>
  );
}
