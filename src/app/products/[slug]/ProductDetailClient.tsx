"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
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
import { DealCountdown } from "@/components/ProductCard";
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
  const router = useRouter();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const { tier } = useLoyalty();
  const { t, locale } = useLocale();
  const { freeShippingThreshold, pointsPerGel, standardShippingPrice, expressEnabled, expressPrice, deliveryMinDays, deliveryMaxDays, giftWrapPrice } = useSettings();

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

  async function subscribeStock(email: string) {
    setNotifyStatus("sending");
    try {
      const res = await fetch("/api/stock-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, email, locale }),
      });
      if (!res.ok) throw new Error();
      setNotifyStatus("done");
    } catch {
      setNotifyStatus("idle");
      setNotifyError(t("checkout.errGeneric"));
    }
  }

  // Signed-in shoppers: one tap, we already know their email.
  function handleNotifyAccount() {
    setNotifyError("");
    if (user?.email) subscribeStock(user.email);
  }

  // Guests: collect an email.
  async function handleNotifyGuest(e: React.FormEvent) {
    e.preventDefault();
    setNotifyError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail.trim())) { setNotifyError(t("auth.validEmail")); return; }
    subscribeStock(notifyEmail.trim());
  }

  /* Photo gallery */
  const images = product.imageUrls && product.imageUrls.length
    ? product.imageUrls
    : product.imageUrl ? [product.imageUrl] : [];
  /* Gallery media: photos + (optionally) the product video as its own slide,
     shown behind an admin-picked poster with a centered ▶ (Temu-style). */
  type GalleryMedia = { type: "image"; src: string } | { type: "video"; src: string; poster: string | null };
  const media: GalleryMedia[] = [
    ...images.map((src) => ({ type: "image" as const, src })),
    ...(product.videoUrl
      ? [{ type: "video" as const, src: product.videoUrl, poster: product.videoPosterUrl ?? images[0] ?? null }]
      : []),
  ];
  const [activeImg, setActiveImg] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  /* Crossfade (not a sliding carousel) means wrapping last→first or
     first→last never "jumps" — it's the same fade transition either way. */
  function prevImg() { setActiveImg((i) => (i - 1 + media.length) % media.length); }
  function nextImg() { setActiveImg((i) => (i + 1) % media.length); }


  /* ── Image zoom ──────────────────────────────────────────────────────
     Desktop: click steps 1× → 1.75× → 2.5× → 1×; while zoomed the
     transform-origin follows the cursor, so moving toward a corner pans
     the photo to that corner. Mobile: two-finger pinch (1–3×) with
     one-finger pan while zoomed and double-tap 1×↔2×; swipe-to-next
     only works at 1×. Native listeners because React registers touch
     events as passive (preventDefault would be ignored). */
  const ZOOM_STEPS = [1, 1.75, 2.5];
  const [zoomStep, setZoomStep] = useState(0);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [pinch, setPinch] = useState({ scale: 1, tx: 0, ty: 0 });
  const [pinching, setPinching] = useState(false);
  /* Live swipe-to-change-photo — the image now visibly tracks the finger
     while dragging (dragX), instead of staying put and only snapping to the
     next/previous photo once a 40px threshold is crossed on release. */
  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef({
    mode: "none" as "none" | "pinch" | "pan",
    startDist: 0, startScale: 1, startTx: 0, startTy: 0,
    panX: 0, panY: 0, lastTap: 0, swipeX: null as number | null,
    scale: 1, tx: 0, ty: 0,
  });

  function zoomClick(e: React.MouseEvent) {
    if (media[activeImg]?.type === "video") return; // the video has its own controls
    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) return; // touch → pinch instead
    const rect = galleryRef.current?.getBoundingClientRect();
    if (!rect) return;
    setZoomOrigin({
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    });
    setZoomStep((s) => (s + 1) % ZOOM_STEPS.length);
  }
  function zoomMove(e: React.MouseEvent) {
    if (zoomStep === 0) return;
    const rect = galleryRef.current?.getBoundingClientRect();
    if (!rect) return;
    setZoomOrigin({
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    });
  }

  /* Pinch/pan/double-tap + swipe — one set of non-passive native listeners. */
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    const r = pinchRef.current;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const clamp = (s: number, tx: number, ty: number) => {
      const rect = el.getBoundingClientRect();
      const mx = (rect.width * (s - 1)) / 2;
      const my = (rect.height * (s - 1)) / 2;
      return { tx: Math.max(-mx, Math.min(mx, tx)), ty: Math.max(-my, Math.min(my, ty)) };
    };
    const apply = (s: number, tx: number, ty: number) => {
      r.scale = s; r.tx = tx; r.ty = ty;
      setPinch({ scale: s, tx, ty });
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        r.mode = "pinch"; setPinching(true);
        r.swipeX = null; setSwiping(false); setDragX(0);
        r.startDist = dist(e.touches);
        r.startScale = r.scale; r.startTx = r.tx; r.startTy = r.ty;
        return;
      }
      const now = Date.now();
      if (now - r.lastTap < 300) {
        e.preventDefault();
        r.lastTap = 0;
        if (r.scale > 1) apply(1, 0, 0);
        else apply(2, 0, 0);
        return;
      }
      r.lastTap = now;
      if (r.scale > 1) {
        r.mode = "pan";
        r.panX = e.touches[0].clientX - r.tx;
        r.panY = e.touches[0].clientY - r.ty;
      } else {
        r.mode = "none";
        r.swipeX = e.touches[0].clientX;
        if (media.length > 1) setSwiping(true);
      }
    };
    const onMove = (e: TouchEvent) => {
      if (r.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const s = Math.max(1, Math.min(3, (r.startScale * dist(e.touches)) / r.startDist));
        const c = clamp(s, r.startTx, r.startTy);
        apply(s, c.tx, c.ty);
      } else if (r.mode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        const c = clamp(r.scale, e.touches[0].clientX - r.panX, e.touches[0].clientY - r.panY);
        apply(r.scale, c.tx, c.ty);
      } else if (r.mode === "none" && r.swipeX !== null && e.touches.length === 1 && r.scale === 1) {
        setDragX(e.touches[0].clientX - r.swipeX);
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (r.mode === "none" && r.swipeX !== null && e.touches.length === 0) {
        const dx = e.changedTouches[0].clientX - r.swipeX;
        if (Math.abs(dx) > 40 && r.scale === 1 && media.length > 1) (dx < 0 ? nextImg : prevImg)();
        r.swipeX = null;
        setSwiping(false);
        setDragX(0);
      }
      if (e.touches.length === 0) {
        if (r.scale < 1.05) apply(1, 0, 0);
        r.mode = "none"; setPinching(false);
      } else if (e.touches.length === 1 && r.scale > 1) {
        r.mode = "pan";
        r.panX = e.touches[0].clientX - r.tx;
        r.panY = e.touches[0].clientY - r.ty;
      }
    };
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.length]);

  /* Changing slide resets both zooms and stops the video. */
  useEffect(() => {
    setZoomStep(0);
    setVideoPlaying(false);
    setPinch({ scale: 1, tx: 0, ty: 0 });
    pinchRef.current.scale = 1; pinchRef.current.tx = 0; pinchRef.current.ty = 0;
  }, [activeImg]);

  const desktopScale = ZOOM_STEPS[zoomStep];
  const zoomTransform =
    pinch.scale > 1
      ? `translate(${pinch.tx}px, ${pinch.ty}px) scale(${pinch.scale})`
      : `translateX(${dragX}px) scale(${desktopScale})`;

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

  useEffect(() => {
    if (!sizeGuide) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSizeGuide(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sizeGuide]);

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

  /* Buy Now — add the item, then jump straight to checkout scoped to ONLY
     this item (loov_checkout_keys is the same handoff the cart page uses, so
     checkout won't also bill whatever else is sitting in the cart). */
  function handleBuyNow() {
    if (outOfStock) return;
    if (!selectedSize) { setNoSize(true); return; }
    setNoSize(false);
    const result = addItem(product, selectedColor, selectedSize, quantity);
    if (result.added <= 0) {
      setCartStatus("blocked");
      setTimeout(() => setCartStatus("idle"), 1800);
      return;
    }
    try {
      const key = `${product.id}::${selectedColor}::${selectedSize}::`;
      localStorage.setItem("loov_checkout_keys", JSON.stringify([key]));
    } catch { /* checkout falls back to the whole cart — non-fatal */ }
    router.push("/checkout");
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
            ref={galleryRef}
            className={`relative w-full aspect-square flex items-center justify-center overflow-hidden select-none -mx-4 sm:mx-0 sm:rounded-card sm:border border-line ${
              zoomStep >= ZOOM_STEPS.length - 1 ? "md:cursor-zoom-out" : "md:cursor-zoom-in"
            }`}
            style={{ backgroundColor: product.cardColor, touchAction: pinch.scale > 1 || pinching ? "none" : "pan-y" }}
            onClick={zoomClick}
            onMouseMove={zoomMove}
            onMouseLeave={() => setZoomStep(0)}
          >
            {/* Zoom layer — badges & arrows stay outside so they never scale */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: zoomTransform,
                transformOrigin: pinch.scale > 1 ? "center" : `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                transition: pinching || swiping ? "none" : "transform 0.25s var(--ease-smooth)",
              }}
            >
            {media.length > 0 ? (
              media.map((m, i) =>
                m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.src}
                    src={m.src}
                    alt={product.name}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                      i === activeImg ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ) : (
                  /* Video slide — poster + centered ▶, swaps to the native player */
                  <div
                    key="__video"
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      i === activeImg ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    {videoPlaying && i === activeImg ? (
                      <video
                        src={m.src}
                        poster={m.poster ?? undefined}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        {m.poster ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.poster} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-panel" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setVideoPlaying(true); }}
                          aria-label="Play product video"
                          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-ink/75 text-white flex items-center justify-center hover:bg-ink hover:scale-105 transition-all"
                        >
                          <svg className="w-7 h-7 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                )
              )
            ) : (
              <span className="text-[130px] sm:text-[160px] select-none drop-shadow-sm">
                {product.emoji}
              </span>
            )}
            </div>
            {product.isNew && (
              <span className="absolute top-5 left-5 bg-canvas/90 text-accent text-xs font-bold px-3 py-1.5 rounded-control uppercase tracking-[0.12em]">
                New
              </span>
            )}
            {off > 0 && (
              <span className="absolute top-5 right-5 bg-canvas/90 text-danger text-sm font-extrabold px-3 py-1.5 rounded-control">
                {t("pdp.save").replace("{n}", String(off))}
              </span>
            )}
            {media.length > 1 && (
              <>
                {/* Arrows — desktop only; mobile uses swipe + the dots below */}
                <button
                  onClick={(e) => { e.stopPropagation(); prevImg(); }}
                  aria-label="Previous photo"
                  className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-line items-center justify-center text-ink shadow-md hover:bg-ink/85 hover:text-white hover:border-accent active:scale-90 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImg(); }}
                  aria-label="Next photo"
                  className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-line items-center justify-center text-ink shadow-md hover:bg-ink/85 hover:text-white hover:border-accent active:scale-90 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {/* Photo counter (Temu-style) */}
                <span className="absolute bottom-3 left-3 bg-ink/60 text-white text-[11px] font-bold px-2.5 py-1 rounded-full tabular-nums pointer-events-none">
                  {activeImg + 1} / {media.length}
                </span>
                {/* Dot indicators */}
                <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                  {media.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${i === activeImg ? "w-4 bg-white" : "w-1.5 bg-white/55"}`}
                    />
                  ))}
                </div>
              </>
            )}
            {/* Wishlist heart — corner button (replaces the old full-width
                "Save to wishlist" button lower down; Temu keeps it on the image).
                Bottom-right so it never collides with the NEW / discount badges. */}
            <button
              onClick={(e) => { e.stopPropagation(); toggle(product.id, product.price); }}
              aria-label={has(product.id) ? t("pdp.savedWishlist") : t("pdp.saveWishlist")}
              className={`absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-line flex items-center justify-center shadow-md active:scale-90 transition-all ${
                has(product.id) ? "text-danger" : "text-ink-soft hover:text-danger"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={has(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Thumbnails — photos + a ▶-badged poster for the video */}
          {media.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {media.slice(0, 5).map((m, i) => (
                <button
                  key={m.type === "image" ? m.src : "__video"}
                  onClick={() => setActiveImg(i)}
                  className={`relative aspect-square rounded-card border-2 overflow-hidden transition-all duration-200 ${
                    i === activeImg ? "border-accent scale-95 shadow-md" : "border-line hover:border-ink-muted"
                  }`}
                >
                  {m.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.src} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      {m.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.poster} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 bg-panel" />
                      )}
                      <span className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-ink/75 text-white flex items-center justify-center" aria-hidden>
                        <svg className="w-3.5 h-3.5 translate-x-px" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="flex flex-col">
          {/* ── Price block FIRST (Temu-style: the number leads) ── */}
          <div className="flex items-start justify-between gap-3 mb-1.5 mt-4 sm:mt-0">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className={`text-3xl sm:text-4xl font-extrabold tabular-nums ${off > 0 ? "text-danger" : "text-ink"}`}>
                  {formatAmount(unitPrice)} <span className="text-2xl">₾</span>
                </p>
                {off > 0 && (
                  <>
                    <span className="text-lg text-ink-muted line-through">{formatAmount(baseForSize)} ₾</span>
                    <span className="text-[13px] font-extrabold text-danger bg-danger-soft border border-danger/30 px-2 py-0.5 rounded-control">
                      {t("pdp.save").replace("{n}", String(off))}
                    </span>
                  </>
                )}
              </div>
              {off > 0 && (
                <p className="text-[12.5px] font-bold text-accent-deep mt-1">
                  {t("pdp.youSave").replace("{n}", formatAmount(baseForSize - unitPrice))}
                </p>
              )}
            </div>
            {/* Share — compact icon button so the price stays the star */}
            <button
              onClick={handleShare}
              aria-label={t("pdp.share")}
              className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                copied
                  ? "border-accent bg-accent-soft text-accent-deep"
                  : "border-line bg-canvas text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {copied ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>
          </div>

          {off > 0 && <DealCountdown product={product} className="mb-3 text-[11.5px]" />}

          {/* Category + name (name is smaller now — the price leads) */}
          <span className="inline-block self-start bg-panel text-ink-soft text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-control mt-3 mb-2">
            {categoryLabel(product.category, t)}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink leading-snug mb-3">
            {product.name}
          </h1>

          {/* Rating — tappable chip that jumps to the reviews section (hidden
              until the product actually has reviews; never fabricated). */}
          {reviewStats.count > 0 && (
            <a
              href="#reviews"
              className="inline-flex items-center gap-2 self-start mb-5 px-3 py-1.5 rounded-control border border-line hover:border-ink transition-colors"
            >
              <Stars rating={reviewStats.avg} />
              <span className="text-sm text-ink font-bold">{reviewStats.avg}</span>
              <span className="text-sm text-ink-muted">· {t("pdp.reviewsCount").replace("{n}", String(reviewStats.count))}</span>
              <span className="text-ink-muted">›</span>
            </a>
          )}

          {/* Stock indicator */}
          {outOfStock ? (
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-sm font-bold text-red-500">{t("product.outOfStock")}</span>
              </div>
              {/* Back-in-stock waitlist */}
              {notifyStatus === "done" ? (
                <p className="mt-2 text-xs font-semibold text-accent">✓ {t("pdp.notifyDone")}</p>
              ) : user?.email ? (
                /* Signed in → we already have the email, one tap is enough. */
                <div className="mt-2.5">
                  <button
                    onClick={handleNotifyAccount}
                    disabled={notifyStatus === "sending"}
                    className="h-10 px-4 rounded-control font-bold text-white text-sm disabled:opacity-60 bg-ink hover:bg-ink/85 active:scale-95 transition-all"
                  >
                    {notifyStatus === "sending" ? "…" : `🔔 ${t("pdp.notifyBtn")}`}
                  </button>
                  <p className="text-[11px] text-ink-muted mt-1.5">{t("pdp.notifyAccount").replace("{email}", user.email)}</p>
                  {notifyError && <p className="text-xs text-red-400 font-semibold mt-1">{notifyError}</p>}
                </div>
              ) : (
                /* Guest → collect an email. */
                <form onSubmit={handleNotifyGuest} className="mt-2.5">
                  <p className="text-xs text-ink-soft mb-1.5">{t("pdp.notifyPrompt")}</p>
                  <div className="flex items-stretch gap-2 max-w-sm">
                    <input
                      type="email" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 min-w-0 h-10 px-3 rounded-control border border-line text-sm font-medium outline-none focus:border-ink"
                    />
                    <button
                      type="submit" disabled={notifyStatus === "sending"}
                      className="h-10 px-4 rounded-control font-bold text-white text-sm whitespace-nowrap disabled:opacity-60 bg-ink hover:bg-ink/85 active:scale-95 transition-all"
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
              <span className="w-2 h-2 rounded-full bg-orange-400 u-skeleton flex-shrink-0" />
              <span className="text-sm font-bold text-orange-500">{t("pdp.onlyLeft").replace("{n}", String(stock))}</span>
            </div>
          ) : stock !== null ? (
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
              <span className="text-sm font-semibold text-accent">{t("pdp.inStock").replace("{n}", String(stock))}</span>
            </div>
          ) : null}

          {/* Delivery estimate */}
          {deliveryRange && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🚀</span>
              <span className="text-sm text-ink-soft">
                {t("pdp.deliveryEst")} <strong className="text-ink">{deliveryRange}</strong>
              </span>
            </div>
          )}

          {/* Loyalty points */}
          <Link
            href="/account/rewards"
            className="inline-flex items-center gap-1.5 bg-warning-soft border border-warning-border rounded-control px-3 py-1.5 mb-5 hover:bg-[#FFF2D6] transition-colors group self-start"
            title="Loov Rewards"
          >
            <span className="text-sm">⭐</span>
            <span className="text-xs font-bold text-warning">
              {t("pdp.earnPoints").replace("{n}", String(pointsForAmountAt(unitPrice, pointsPerGel, tier)))}
            </span>
            <span className="text-[10px] font-bold text-warning opacity-0 group-hover:opacity-100 transition-opacity">
              {t("pdp.how")} →
            </span>
          </Link>

          <div className="h-px bg-line mb-6" />

          {/* ── Colour selector (photo stays fixed) ── */}
          <div className="mb-6">
            <p className="text-sm font-bold text-ink mb-3">
              {t("product.color")}:{" "}
              <span className="text-accent font-extrabold">{colorLabel(selectedColor, t)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((color) => {
                /* Unavailable-for-this-size colours stay CLICKABLE — selecting
                   one just surfaces the real "Out of Stock" state below
                   (with the back-in-stock waitlist) instead of silently
                   refusing the tap. A colour dot alone doesn't name the
                   colour, so every swatch is now a labelled button. */
                const unavailable = !availableColors.includes(color);
                return (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    title={unavailable ? `${colorLabel(color, t)} — ${t("pdp.colorNotInSize")}` : colorLabel(color, t)}
                    className={`flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-control border text-sm font-semibold transition-colors duration-200 ${
                      selectedColor === color
                        ? "border-ink bg-ink text-white"
                        : unavailable
                        ? "border-line text-ink-muted hover:border-ink-muted"
                        : "border-line text-ink-soft hover:border-ink hover:text-ink"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex-shrink-0 ${selectedColor === color ? "border-white/50" : "border-line"}`}
                      style={{ backgroundColor: hex(color) }}
                      aria-hidden
                    />
                    <span className={unavailable ? "line-through decoration-1" : ""}>{colorLabel(color, t)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Size selector ── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-ink">
                {t("product.size")}:{" "}
                <span className="text-accent font-extrabold">{sizeLabel(selectedSize, t)}</span>
              </p>
              <button
                onClick={() => setSizeGuide(true)}
                className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
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
                    className={`px-4 py-2 rounded-control text-sm font-semibold border transition-colors duration-200 ${
                      selectedSize === size
                        ? "border-ink bg-ink text-white"
                        : "border-line text-ink-soft hover:border-ink hover:text-ink"
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

          <div className="h-px bg-line mb-6" />

          {/* ── Quantity + Add to cart + Buy now ── */}
          <div ref={ctaRef} className="mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-line rounded-control overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-12 flex items-center justify-center text-ink font-bold text-xl hover:bg-panel transition-all active:scale-90"
                >
                  −
                </button>
                <span className="w-10 text-center font-extrabold text-ink text-base">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(stock ?? Infinity, q + 1))}
                  disabled={atMax || outOfStock}
                  className="w-11 h-12 flex items-center justify-center text-ink font-bold text-xl hover:bg-panel transition-all active:scale-90 disabled:opacity-30 disabled:active:scale-100 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              {/* Add to cart — secondary (outline); status flips it to a filled
                  colour on success/blocked so the feedback still reads clearly */}
              <button
                onClick={handleAddToCart}
                disabled={outOfStock}
                className={`u-btn flex-1 h-12 rounded-control font-semibold uppercase tracking-[0.04em] transition-all duration-300 flex items-center justify-center gap-2 text-[12.5px] border ${
                  cartStatus === "added"
                    ? "scale-95 bg-accent border-accent text-white"
                    : cartStatus === "blocked" || outOfStock
                    ? "bg-danger border-danger text-white"
                    : "bg-canvas border-ink text-ink hover:bg-ink hover:text-white active:scale-95"
                } ${outOfStock ? "cursor-not-allowed" : ""}`}
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
                  <>🛒 {t("common.addToCart")}</>
                )}
              </button>
            </div>

            {/* Buy now — primary (accent), goes straight to checkout for this item */}
            <button
              onClick={handleBuyNow}
              disabled={outOfStock}
              className="u-btn w-full h-12 mt-2.5 rounded-control font-semibold uppercase tracking-[0.06em] text-white bg-accent hover:bg-accent-deep active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⚡ {t("pdp.buyNow")} &nbsp;·&nbsp; {formatPrice(unitPrice * quantity)}
            </button>
          </div>

          {atMax && !outOfStock && (
            <p className="text-sm font-bold text-orange-600 mb-3 bg-orange-50 border border-orange-200 rounded-control px-3 py-2 inline-block">
              {t("pdp.thatsAll").replace("{n}", String(stock))}
            </p>
          )}

          <div className="mb-7" />

          {/* Trust bar — compact 2-column band (Temu density) */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-line p-4">
            {[
              { icon: "🌿", text: t("pdp.trustOrganic") },
              { icon: "🚀", text: t("pdp.trustShipping").replace("{n}", String(freeShippingThreshold)) },
              { icon: "🔄", text: t("pdp.trustReturns") },
              { icon: "🔒", text: t("pdp.trustSecure") },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5">
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span className="text-[12px] text-ink-soft font-medium leading-snug">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ TABS ══ */}
      <div className="mt-16">
        <div className="flex border-b border-line mb-8 overflow-x-auto overflow-y-hidden gap-2 no-scrollbar">
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
              className={`px-4 py-3 font-semibold text-[12px] uppercase tracking-[0.08em] whitespace-nowrap transition-colors duration-200 border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl">
          {activeTab === "description" && (
            <div className="space-y-6 transition-opacity">
              <p className="text-ink-soft leading-relaxed whitespace-pre-line">{product.description}</p>
              <ul className="space-y-2.5">
                {features.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                    <span className="text-sm text-ink-soft">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-6 transition-opacity">
              <div className="grid grid-cols-2 gap-4">
                {[
                  // Every spec only shows when set per-product in admin — no
                  // invented defaults ("organic cotton", "made in Georgia")
                  // we can't back for that specific product.
                  { label: t("pdp.specMaterial"),      value: product.material || "" },
                  { label: t("pdp.specWeight"),        value: product.weight || "" },
                  { label: t("pdp.specCertification"), value: product.certification || "" },
                  { label: t("pdp.specOrigin"),        value: product.origin || "" },
                ].filter((item) => item.value).map((item) => (
                  <div key={item.label} className="bg-canvas rounded-card p-4 border border-line">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="font-bold text-ink text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-ink mb-3">{t("pdp.careTitle")}</h4>
                <ul className="space-y-2">
                  {(product.careInstructions && product.careInstructions.length
                    ? product.careInstructions
                    : [t("pdp.care1"), t("pdp.care2"), t("pdp.care3"), t("pdp.care4"), t("pdp.care5")]
                  ).map((care) => (
                    <li key={care} className="flex items-start gap-2 text-sm text-ink-soft">
                      <span className="text-ink-muted font-bold mt-0.5">·</span>
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
                { icon: "🚀", title: t("pdp.delivStandardTitle"), desc: t("pdp.delivStandardDesc").replace("{min}", String(deliveryMinDays)).replace("{max}", String(deliveryMaxDays)).replace("{threshold}", String(freeShippingThreshold)).replace("{price}", String(standardShippingPrice)), bg: "#EAF2F0" },
                ...(expressEnabled
                  ? [{ icon: "⚡", title: t("pdp.delivExpressTitle"), desc: t("pdp.delivExpressDesc").replace("{price}", String(expressPrice)), bg: "#F0EDE8" }]
                  : []),
                { icon: "🔄", title: t("pdp.delivReturnsTitle"), desc: t("pdp.delivReturnsDesc"), bg: "#EAF2F0" },
                // Gift wrap price follows the admin setting (0 ⇒ "free") — never claim "free" while checkout charges.
                { icon: "🎁", title: t("pdp.delivGiftTitle"), desc: t("pdp.delivGiftDesc").replace("{price}", giftWrapPrice > 0 ? `${giftWrapPrice} ₾` : t("cart.free").toLowerCase()), bg: "#F0EDE8" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-5 rounded-card border border-line" style={{ backgroundColor: item.bg }}>
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-bold text-ink mb-1">{item.title}</p>
                    <p className="text-sm text-ink-soft leading-relaxed">{item.desc}</p>
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
          style={{ backgroundColor: "rgba(20,20,18,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setSizeGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            className="bg-canvas rounded-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 id="size-guide-title" className="text-xl font-extrabold text-ink">{t("pdp.sizeGuide")}</h3>
              <button onClick={() => setSizeGuide(false)} aria-label="Close size guide" className="w-9 h-9 rounded-full bg-canvas flex items-center justify-center text-ink-soft hover:bg-panel transition-colors font-bold">✕</button>
            </div>
            <div className="overflow-x-auto rounded-card border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-panel">
                    {[t("sg.colSize"), t("sg.colAge"), t("sg.colHeight"), t("sg.colWeight")].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-bold text-ink whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizeGuideRows.map((row, i) => (
                    <tr key={row.size} className={`border-t border-line transition-colors ${selectedSize === row.size ? "bg-accent-soft" : i % 2 === 0 ? "bg-canvas" : "bg-panel/40"}`}>
                      <td className="px-4 py-3 font-bold text-ink whitespace-nowrap">{row.size}</td>
                      <td className="px-4 py-3 text-ink-soft">{row.age}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{row.height}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{row.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ MOBILE STICKY CTA ══ */}
      <div
        className={`fixed left-0 right-0 z-40 bg-canvas border-t border-line px-4 py-3 sm:hidden shadow-2xl transition-transform duration-300 ${showSticky ? "translate-y-0" : "translate-y-full"}`}
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <div className="flex items-center border border-line rounded-control overflow-hidden flex-shrink-0">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-8 h-11 flex items-center justify-center font-bold text-lg hover:bg-panel transition-all active:scale-90">−</button>
            <span className="w-7 text-center font-extrabold text-ink text-sm tabular-nums">{quantity}</span>
            <button onClick={() => setQuantity((q) => Math.min(stock ?? Infinity, q + 1))} disabled={atMax || outOfStock} className="w-8 h-11 flex items-center justify-center font-bold text-lg hover:bg-panel transition-all active:scale-90 disabled:opacity-30 disabled:active:scale-100 disabled:cursor-not-allowed">+</button>
          </div>
          {/* Add to cart — secondary (outline) */}
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={`u-btn flex-1 h-11 rounded-control font-semibold uppercase tracking-[0.03em] text-[11.5px] transition-all duration-300 flex items-center justify-center gap-1 border ${
              cartStatus === "added" ? "bg-accent border-accent text-white scale-95" :
              cartStatus === "blocked" || outOfStock ? "bg-danger border-danger text-white" :
              "bg-canvas border-ink text-ink active:scale-95"
            } ${outOfStock ? "cursor-not-allowed" : ""}`}
          >
            {outOfStock ? t("pdp.outOfStockBtn") : cartStatus === "added" ? `✓ ${t("pdp.added")}` : cartStatus === "blocked" ? t("cart.cantAddMore") : `🛒 ${t("common.addToCart")}`}
          </button>
          {/* Buy now — primary (accent), straight to checkout */}
          <button
            onClick={handleBuyNow}
            disabled={outOfStock}
            className="u-btn flex-1 h-11 rounded-control font-semibold uppercase tracking-[0.03em] text-white text-[11.5px] bg-accent hover:bg-accent-deep active:scale-95 transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⚡ {t("pdp.buyNow")}
          </button>
        </div>
      </div>
    </>
  );
}
