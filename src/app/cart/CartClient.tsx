"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { CartItem } from "@/types";
import { useProducts } from "@/lib/db/useProducts";
import { useSettings } from "@/lib/db/useSettings";
import ProductCard from "@/components/ProductCard";
import { formatPrice } from "@/lib/format";
import { effectivePrice, discountPercent } from "@/lib/pricing";
import { useLocale } from "@/context/LocaleContext";
import { colorLabel, sizeLabel } from "@/lib/i18n/labels";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { PromoDef, PromoError } from "@/lib/promo";
import { validatePromo } from "@/lib/db/promo";
import { priceCartWithBundles, type BundleGroupLine } from "@/lib/bundlePricing";
import type { Bundle } from "@/lib/bundles";

function itemKey(item: CartItem) {
  return `${item.product.id}::${item.selectedColor}::${item.selectedSize}::${item.bundleSlug ?? ""}`;
}

/* ─────────────────────────────────────────
   Round checkbox
───────────────────────────────────────── */
function RoundCheck({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? "Deselect item" : "Select item"}
      className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
      style={{
        borderColor: checked ? "#5E9E8C" : "#DDD5CC",
        backgroundColor: checked ? "#5E9E8C" : "white",
      }}
    >
      {checked && (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────
   Single item row
───────────────────────────────────────── */
function CartItemCard({
  item,
  selected,
  onToggle,
  onRemove,
  onQty,
  t,
  bundleName,
  bundleMatched,
  allocatedPrice,
}: {
  item: CartItem;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onQty: (next: number) => void;
  t: (key: TranslationKey) => string;
  /** Set when this item was added via "Add Bundle to Cart". */
  bundleName?: string;
  /** True when the cart still holds the bundle's exact item set (bundle price applies). */
  bundleMatched?: boolean;
  /** This item's share of the flat bundle price (only meaningful when bundleMatched). */
  allocatedPrice?: number;
}) {
  return (
    <div
      className="bg-white rounded-2xl border-2 p-4 sm:p-5 flex gap-3 sm:gap-4 hover:shadow-sm transition-all"
      style={{ borderColor: selected ? "#5E9E8C" : "#DDD5CC" }}
    >
      {/* Checkbox */}
      <div className="flex items-center pt-1">
        <RoundCheck checked={selected} onChange={onToggle} />
      </div>

      {/* Thumbnail */}
      <Link href={`/products/${item.product.slug}`} className="flex-shrink-0">
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center text-4xl sm:text-5xl transition-opacity overflow-hidden"
          style={{ backgroundColor: item.product.cardColor, opacity: selected ? 1 : 0.5 }}
        >
          {item.product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
          ) : (
            item.product.emoji
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
        {/* Name + remove */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/products/${item.product.slug}`}>
              <h3
                className="font-bold text-sm sm:text-base leading-tight hover:text-[#5E9E8C] transition-colors line-clamp-2"
                style={{ color: selected ? "#2A2320" : "#9A8E88" }}
              >
                {item.product.name}
              </h3>
            </Link>
            <p className="text-xs sm:text-sm text-[#9A8E88] mt-0.5">
              {colorLabel(item.selectedColor, t)}
              {item.selectedSize !== "One Size" && ` · ${sizeLabel(item.selectedSize, t)}`}
            </p>
            {bundleName && (
              bundleMatched ? (
                <span className="inline-block mt-1 text-[10px] font-bold text-[#5E9E8C] bg-[#EAF2F0] px-2 py-0.5 rounded-full">
                  🎀 {t("cart.partOfSet").replace("{name}", bundleName)}
                </span>
              ) : (
                <span className="inline-block mt-1 text-[10px] font-bold text-[#A06820] bg-[#FFF4E5] px-2 py-0.5 rounded-full">
                  ⚠ {t("cart.setPriceLost")}
                </span>
              )
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.product.name}`}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-[#F5F0EB] text-[#9A8E88] hover:bg-red-50 hover:text-red-400 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Qty + price */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center border-2 border-[#DDD5CC] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => onQty(item.quantity - 1)}
              aria-label="Decrease quantity"
              className="w-9 h-9 flex items-center justify-center font-bold text-[#2A2320] hover:bg-[#EDE5D8] transition-colors disabled:opacity-30"
              disabled={item.quantity <= 1}
            >
              −
            </button>
            <span className="w-9 text-center font-extrabold text-[#2A2320] text-sm select-none" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQty(item.quantity + 1)}
              aria-label="Increase quantity"
              disabled={item.product.stock !== undefined && item.quantity >= item.product.stock}
              className="w-9 h-9 flex items-center justify-center font-bold text-[#2A2320] hover:bg-[#EDE5D8] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>

          <div className="text-right">
            {bundleMatched ? (
              <p className="text-[11px] text-[#5E9E8C] font-semibold">{t("cart.setShare")}</p>
            ) : (
              <p className="text-[11px] text-[#9A8E88] flex items-center justify-end gap-1">
                {discountPercent(item.product) > 0 && (
                  <span className="line-through">{formatPrice(item.product.price)}</span>
                )}
                {formatPrice(effectivePrice(item.product, item.selectedSize))} × {item.quantity}
              </p>
            )}
            <p
              className="font-extrabold text-base leading-tight transition-colors"
              style={{ color: selected ? "#2A2320" : "#C8B8B0" }}
            >
              {formatPrice(bundleMatched ? (allocatedPrice ?? 0) : effectivePrice(item.product, item.selectedSize) * item.quantity)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Empty state
───────────────────────────────────────── */
function EmptyCart({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-28 h-28 rounded-full bg-[#EDE5D8] flex items-center justify-center text-5xl mb-6">
        🛒
      </div>
      <h2 className="text-2xl font-extrabold text-[#2A2320] mb-3">
        {t("cart.empty.title")}
      </h2>
      <p className="text-[#5E5450] mb-8 max-w-sm leading-relaxed text-sm">
        {t("cart.empty.subtitle")}
      </p>
      <Link
        href="/products"
        className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-full text-white hover:opacity-90 shadow-sm transition-opacity"
        style={{ backgroundColor: "#5E9E8C" }}
      >
        {t("cart.emptyCta")} →
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────
   "You might also like" section
───────────────────────────────────────── */
function CartSuggestions({ cartIds, t }: { cartIds: string[]; t: (key: TranslationKey) => string }) {
  const products = useProducts();
  const suggestions = products
    .filter((p) => !cartIds.includes(p.id))
    .slice(0, 3);
  if (suggestions.length === 0) return null;

  return (
    <section className="mt-20 pt-12 border-t border-[#DDD5CC]">
      <h2 className="text-2xl font-extrabold text-[#2A2320] mb-8">
        {t("product.youMightLike")}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {suggestions.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   Main cart page
───────────────────────────────────────── */
export default function CartClient({ bundles }: { bundles: Bundle[] }) {
  const { t } = useLocale();
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const { freeShippingThreshold: FREE_THRESHOLD, standardShippingPrice: SHIPPING_COST } = useSettings();
  const bundleBySlug = useMemo(() => new Map(bundles.map((b) => [b.slug, b])), [bundles]);

  /* Selected item keys — all selected by default */
  const allKeys = useMemo(() => items.map(itemKey), [items]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allKeys));

  /* Keep selected in sync when items are removed */
  const validSelected = useMemo(() => {
    const keySet = new Set(allKeys);
    return new Set([...selected].filter((k) => keySet.has(k)));
  }, [allKeys, selected]);

  const [promoCode,    setPromoCode]    = useState("");
  const [promoMsg,     setPromoMsg]     = useState("");
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [promoBusy,    setPromoBusy]    = useState(false);
  const [promoSignin,  setPromoSignin]  = useState(false); // show a sign-in link with the error
  const [appliedPromo, setAppliedPromo] = useState<PromoDef | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState("");

  /* Derived totals — only from selected items, bundle-aware (same rule the
     server uses to compute the real charge — see src/lib/bundlePricing.ts). */
  const selectedItems = items.filter((i) => validSelected.has(itemKey(i)));
  const selectedCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);

  const toBundleLine = (i: CartItem): BundleGroupLine => ({
    key: itemKey(i),
    productSlug: i.product.slug,
    unitPrice: effectivePrice(i.product, i.selectedSize),
    quantity: i.quantity,
    bundleSlug: i.bundleSlug,
  });
  const bundleDefs = useMemo(
    () => bundles.map((b) => ({ slug: b.slug, items: b.items, bundlePrice: b.bundlePrice })),
    [bundles]
  );
  /* Used for the real subtotal/shipping/total math — selected items only. */
  const selectedBundleResult = useMemo(
    () => priceCartWithBundles(selectedItems.map(toBundleLine), bundleDefs),
    [selectedItems, bundleDefs]
  );
  const selectedSubtotal = selectedBundleResult.subtotal;
  /* Used purely for per-card badge/price display — ALL cart items, selected or not. */
  const allBundleResult = useMemo(
    () => priceCartWithBundles(items.map(toBundleLine), bundleDefs),
    [items, bundleDefs]
  );

  /* Apply promo discount */
  const discountedSubtotal = appliedPromo?.type === "percent"
    ? Math.round(selectedSubtotal * (1 - appliedPromo.value / 100))
    : selectedSubtotal;
  const promoShippingFree = appliedPromo?.type === "shipping";

  const shipping    = promoShippingFree || discountedSubtotal >= FREE_THRESHOLD ? 0 : (selectedSubtotal > 0 ? SHIPPING_COST : 0);
  const total       = discountedSubtotal + shipping;
  const toFree      = Math.max(0, FREE_THRESHOLD - selectedSubtotal);
  const progressPct = Math.min(100, (selectedSubtotal / FREE_THRESHOLD) * 100);

  const allChecked  = allKeys.length > 0 && allKeys.every((k) => validSelected.has(k));
  const someChecked = allKeys.some((k) => validSelected.has(k)) && !allChecked;

  function toggleItem(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allKeys));
    }
  }

  function handleRemove(productId: string, color: string, size: string, bundleSlug?: string) {
    removeItem(productId, color, size, bundleSlug);
  }

  function handleQty(productId: string, color: string, size: string, next: number, bundleSlug?: string) {
    if (next < 1) {
      removeItem(productId, color, size, bundleSlug);
    } else {
      updateQuantity(productId, color, size, next, bundleSlug);
    }
  }

  /* Which message a refused code shows (server decides the reason). */
  const promoErrorKey: Record<Exclude<PromoError, "signin">, TranslationKey> = {
    invalid: "cart.promoInvalid",
    expired: "cart.promoExpired",
    limit: "cart.promoLimitReached",
    used: "cart.promoAlreadyUsed",
    network: "cart.promoInvalid",
  };

  async function handlePromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code || promoBusy) return;
    setPromoBusy(true);
    setPromoSignin(false);
    const res = await validatePromo(code);
    setPromoBusy(false);
    if (res.promo) {
      setAppliedPromo(res.promo);
      setAppliedPromoCode(res.promo.code);
      setPromoSuccess(true);
      setPromoMsg(
        res.promo.type === "shipping"
          ? t("cart.promoFreeShip")
          : t("cart.promoPercentOff").replace("{n}", String(res.promo.value))
      );
      setPromoCode("");
    } else if (res.error === "signin") {
      setPromoSuccess(false);
      setPromoSignin(true);
      setPromoMsg(t("cart.promoMembersOnly"));
    } else {
      setPromoSuccess(false);
      setPromoMsg(t(promoErrorKey[res.error ?? "invalid"]));
      setTimeout(() => { setPromoMsg(""); }, 4000);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setAppliedPromoCode("");
    setPromoSuccess(false);
    setPromoMsg("");
    setPromoCode("");
    setPromoSignin(false);
  }

  if (items.length === 0) return <EmptyCart t={t} />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[#2A2320]">{t("cart.title")}</h1>
          <p className="text-[#9A8E88] text-sm mt-1">
            {items.length === 1 ? t("cart.item1") : t("cart.items").replace("{n}", String(items.length))}
          </p>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#5E9E8C] hover:underline"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("common.continueShopping")}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Item list (2/3) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Select-all bar */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-[#DDD5CC] px-5 py-3">
            <button
              type="button"
              onClick={toggleAll}
              aria-pressed={allChecked}
              className="flex items-center gap-3 group rounded-lg"
            >
              {/* Indeterminate / all / none */}
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  borderColor: allChecked || someChecked ? "#5E9E8C" : "#DDD5CC",
                  backgroundColor: allChecked ? "#5E9E8C" : someChecked ? "#EAF2F0" : "white",
                }}
              >
                {allChecked && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {someChecked && (
                  <div className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: "#5E9E8C" }} />
                )}
              </div>
              <span className="text-sm font-bold text-[#2A2320] group-hover:text-[#5E9E8C] transition-colors">
                {allChecked ? t("cart.deselectAll") : t("cart.selectAll")}
              </span>
            </button>

            <span className="text-xs text-[#9A8E88] font-semibold">
              {t("cart.selectedOf").replace("{n}", String(validSelected.size)).replace("{total}", String(items.length))}
            </span>
          </div>

          {items.map((item) => {
            const key = itemKey(item);
            const bundleMatched = !!item.bundleSlug && allBundleResult.matchedBundles.has(item.bundleSlug);
            return (
              <CartItemCard
                key={key}
                item={item}
                selected={validSelected.has(key)}
                onToggle={() => toggleItem(key)}
                onRemove={() =>
                  handleRemove(item.product.id, item.selectedColor, item.selectedSize, item.bundleSlug)
                }
                onQty={(next) =>
                  handleQty(item.product.id, item.selectedColor, item.selectedSize, next, item.bundleSlug)
                }
                t={t}
                bundleName={item.bundleSlug ? bundleBySlug.get(item.bundleSlug)?.name : undefined}
                bundleMatched={bundleMatched}
                allocatedPrice={bundleMatched ? allBundleResult.lineTotals.get(key) : undefined}
              />
            );
          })}

          {items.length > 1 && (
            <div className="flex justify-end pt-1">
              <button
                onClick={clearCart}
                className="text-xs text-[#9A8E88] hover:text-red-400 transition-colors font-semibold underline underline-offset-2"
              >
                {t("cart.removeAll")}
              </button>
            </div>
          )}
        </div>

        {/* ── Order summary (1/3) ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-3xl border border-[#DDD5CC] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#2A2320]">{t("cart.orderSummary")}</h2>
              {validSelected.size > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#EAF2F0", color: "#5E9E8C" }}>
                  {selectedCount === 1 ? t("cart.item1") : t("cart.items").replace("{n}", String(selectedCount))}
                </span>
              )}
            </div>

            {/* Shipping progress */}
            {selectedSubtotal > 0 ? (
              <div className="p-4 rounded-2xl" style={{ backgroundColor: "#EAF2F0" }}>
                {toFree > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-[#5E5450] mb-2">
                      {t("cart.addMoreForFree").split("{amount}")[0]}
                      <span className="font-extrabold text-[#5E9E8C]">{formatPrice(toFree)}</span>
                      {t("cart.addMoreForFree").split("{amount}")[1]}
                    </p>
                    <div className="h-2.5 bg-[#C8DDD8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%`, backgroundColor: "#5E9E8C" }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 font-bold text-[#5E9E8C]">
                    <span className="text-xl">🎉</span>
                    <span>{t("drawer.freeUnlocked")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F5F0EB] text-center">
                <p className="text-sm text-[#9A8E88] font-medium">{t("cart.selectToSeeTotal")}</p>
              </div>
            )}

            {/* Prices */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#5E5450] font-medium">
                  {t("cart.subtotal")}
                  {validSelected.size > 0 && (
                    <span className="text-[#9A8E88] ml-1">
                      ({validSelected.size === 1 ? t("cart.item1") : t("cart.items").replace("{n}", String(validSelected.size))})
                    </span>
                  )}
                </span>
                <span className="font-bold text-[#2A2320]">{formatPrice(selectedSubtotal)}</span>
              </div>
              {appliedPromo?.type === "percent" && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#5E9E8C] font-medium">{t("cart.discount").replace("{n}", String(appliedPromo.value))}</span>
                  <span className="font-bold text-[#5E9E8C]">−{formatPrice(selectedSubtotal - discountedSubtotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[#5E5450] font-medium">{t("cart.shipping")}</span>
                {selectedSubtotal === 0 ? (
                  <span className="font-bold text-[#9A8E88]">—</span>
                ) : shipping === 0 ? (
                  <span className="font-bold text-[#5E9E8C]">{t("cart.free")} 🎉</span>
                ) : (
                  <span className="font-bold text-[#2A2320]">{formatPrice(shipping)}</span>
                )}
              </div>
              <div className="h-px bg-[#DDD5CC]" />
              <div className="flex justify-between">
                <span className="font-extrabold text-[#2A2320]">{t("cart.total")}</span>
                <span className="font-extrabold text-[#2A2320] text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Promo */}
            <div>
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-[#EAF2F0] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-[#5E9E8C]">{promoMsg}</p>
                  </div>
                  <button onClick={removePromo} className="text-xs text-[#9A8E88] hover:text-red-400 font-bold transition-colors ml-3">
                    {t("common.remove")}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value); setPromoMsg(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handlePromo()}
                      placeholder={t("cart.promoPlaceholder")}
                      className="flex-1 border-2 border-[#DDD5CC] rounded-xl px-3 py-2.5 text-sm font-medium text-[#2A2320] placeholder-[#C8B8B0] focus:outline-none focus:border-[#5E9E8C] transition-colors bg-white"
                    />
                    <button
                      onClick={handlePromo}
                      disabled={promoBusy}
                      className="px-4 py-2.5 rounded-xl border-2 border-[#DDD5CC] text-sm font-bold text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-colors disabled:opacity-50"
                    >
                      {promoBusy ? "…" : t("common.apply")}
                    </button>
                  </div>
                  {promoMsg && !promoSuccess && (
                    <p className="text-xs text-red-400 font-semibold mt-1.5">
                      {promoMsg}
                      {promoSignin && (
                        <>
                          {" "}
                          <Link href="/login" className="text-[#5E9E8C] underline font-bold">
                            {t("cart.promoSignIn")}
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Checkout */}
            <Link
              href={validSelected.size > 0 ? "/checkout" : "#"}
              onClick={(e) => {
                if (validSelected.size === 0) { e.preventDefault(); return; }
                /* Save selected keys so checkout only shows these items */
                localStorage.setItem(
                  "loov_checkout_keys",
                  JSON.stringify([...validSelected])
                );
                /* Hand off the promo code too — checkout re-resolves it itself,
                   never trusts the stored discount amount. */
                localStorage.setItem("loov_checkout_promo", appliedPromoCode);
              }}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white text-base transition-all flex items-center justify-center gap-2 shadow-sm"
              style={{
                backgroundColor: validSelected.size > 0 ? "#5E9E8C" : "#C8B8B0",
                cursor: validSelected.size > 0 ? "pointer" : "not-allowed",
              }}
            >
              {validSelected.size > 0
                ? `${t("cart.checkoutBtn").replace("{n}", String(selectedCount))} →`
                : t("cart.selectToCheckout")}
            </Link>

            {/* Trust icons */}
            <div className="flex items-center justify-around pt-1">
              {[
                { icon: "🔒", label: t("cart.trustSecure") },
                { icon: "🔄", label: t("cart.trustReturns") },
                { icon: "🌿", label: t("cart.trustOrganic") },
              ].map((trust) => (
                <div key={trust.label} className="flex flex-col items-center gap-1 text-center">
                  <span className="text-lg">{trust.icon}</span>
                  <span className="text-[10px] text-[#9A8E88] font-semibold">{trust.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <CartSuggestions cartIds={items.map((i) => i.product.id)} t={t} />
    </div>
  );
}
