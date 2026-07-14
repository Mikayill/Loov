"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { CartItem } from "@/types";
import { useSuggestedProducts } from "@/lib/db/useProductsByIds";
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
import { variantStock } from "@/lib/stock";

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
        borderColor: checked ? "var(--color-accent)" : "var(--color-line)",
        backgroundColor: checked ? "var(--color-accent)" : "white",
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
  const stock = variantStock(item.product, item.selectedSize, item.selectedColor);
  const atMax = stock !== null && item.quantity >= stock;
  return (
    <div
      className="bg-canvas rounded-card border-2 p-4 sm:p-5 flex gap-3 sm:gap-4 hover:shadow-sm transition-all"
      style={{ borderColor: selected ? "var(--color-accent)" : "var(--color-line)" }}
    >
      {/* Checkbox */}
      <div className="flex items-center pt-1">
        <RoundCheck checked={selected} onChange={onToggle} />
      </div>

      {/* Thumbnail */}
      <Link href={`/products/${item.product.slug}`} className="flex-shrink-0">
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-control flex items-center justify-center text-4xl sm:text-5xl transition-opacity overflow-hidden"
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
                className="font-bold text-sm sm:text-base leading-tight hover:text-accent transition-colors line-clamp-2"
                style={{ color: selected ? "#2A2320" : "#9A8E88" }}
              >
                {item.product.name}
              </h3>
            </Link>
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
              {colorLabel(item.selectedColor, t)}
              {item.selectedSize !== "One Size" && ` · ${sizeLabel(item.selectedSize, t)}`}
            </p>
            {bundleName && (
              bundleMatched ? (
                <span className="inline-block mt-1 text-[10px] font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-full">
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
            className="flex-shrink-0 w-7 h-7 rounded-full bg-canvas text-ink-muted hover:bg-red-50 hover:text-red-400 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Qty + price */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center border border-line rounded-control overflow-hidden">
            <button
              type="button"
              onClick={() => onQty(item.quantity - 1)}
              aria-label="Decrease quantity"
              className="w-9 h-9 flex items-center justify-center font-bold text-ink hover:bg-panel transition-colors disabled:opacity-30"
              disabled={item.quantity <= 1}
            >
              −
            </button>
            <span className="w-9 text-center font-extrabold text-ink text-sm select-none" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQty(item.quantity + 1)}
              aria-label="Increase quantity"
              disabled={atMax}
              className="w-9 h-9 flex items-center justify-center font-bold text-ink hover:bg-panel transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>

          <div className="text-right">
            {bundleMatched ? (
              <p className="text-[11px] text-accent font-semibold">{t("cart.setShare")}</p>
            ) : (
              <p className="text-[11px] text-ink-muted flex items-center justify-end gap-1">
                {discountPercent(item.product) > 0 && (
                  <span className="line-through">{formatPrice(item.product.price)}</span>
                )}
                {formatPrice(effectivePrice(item.product, item.selectedSize))} × {item.quantity}
              </p>
            )}
            <p
              className="font-extrabold text-base leading-tight transition-colors"
              style={{ color: selected ? "#2A2320" : "var(--color-ink-muted)" }}
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
      <div className="w-28 h-28 rounded-full bg-panel flex items-center justify-center text-5xl mb-6">
        🛒
      </div>
      <h2 className="text-2xl font-extrabold text-ink mb-3">
        {t("cart.empty.title")}
      </h2>
      <p className="text-ink-soft mb-8 max-w-sm leading-relaxed text-sm">
        {t("cart.empty.subtitle")}
      </p>
      <Link
        href="/products"
        className="u-btn inline-flex items-center gap-2 font-semibold uppercase tracking-[0.08em] text-[12px] px-8 py-3.5 rounded-control text-white bg-ink hover:bg-ink/85"
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
  const suggestions = useSuggestedProducts(cartIds, 3);
  if (suggestions.length === 0) return null;

  return (
    <section className="mt-20 pt-12 border-t border-line">
      <h2 className="text-2xl font-extrabold text-ink mb-8">
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
          <h1 className="text-3xl font-extrabold text-ink">{t("cart.title")}</h1>
          <p className="text-ink-muted text-sm mt-1">
            {items.length === 1 ? t("cart.item1") : t("cart.items").replace("{n}", String(items.length))}
          </p>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
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
          <div className="flex items-center justify-between bg-canvas rounded-card border border-line px-5 py-3">
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
                  borderColor: allChecked || someChecked ? "var(--color-accent)" : "var(--color-line)",
                  backgroundColor: allChecked ? "var(--color-accent)" : someChecked ? "var(--color-accent-soft)" : "white",
                }}
              >
                {allChecked && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {someChecked && (
                  <div className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
                )}
              </div>
              <span className="text-sm font-bold text-ink group-hover:text-accent transition-colors">
                {allChecked ? t("cart.deselectAll") : t("cart.selectAll")}
              </span>
            </button>

            <span className="text-xs text-ink-muted font-semibold">
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
                className="text-xs text-ink-muted hover:text-red-400 transition-colors font-semibold underline underline-offset-2"
              >
                {t("cart.removeAll")}
              </button>
            </div>
          )}
        </div>

        {/* ── Order summary (1/3) ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-canvas rounded-card border border-line p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">{t("cart.orderSummary")}</h2>
              {validSelected.size > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
                  {selectedCount === 1 ? t("cart.item1") : t("cart.items").replace("{n}", String(selectedCount))}
                </span>
              )}
            </div>

            {/* Shipping progress */}
            {selectedSubtotal > 0 ? (
              <div className="p-4 rounded-card" style={{ backgroundColor: "var(--color-accent-soft)" }}>
                {toFree > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-ink-soft mb-2">
                      {t("cart.addMoreForFree").split("{amount}")[0]}
                      <span className="font-extrabold text-accent">{formatPrice(toFree)}</span>
                      {t("cart.addMoreForFree").split("{amount}")[1]}
                    </p>
                    <div className="h-2.5 bg-sage rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%`, backgroundColor: "var(--color-accent)" }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 font-bold text-accent">
                    <span className="text-xl">🎉</span>
                    <span>{t("drawer.freeUnlocked")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-card bg-canvas text-center">
                <p className="text-sm text-ink-muted font-medium">{t("cart.selectToSeeTotal")}</p>
              </div>
            )}

            {/* Prices */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft font-medium">
                  {t("cart.subtotal")}
                  {validSelected.size > 0 && (
                    <span className="text-ink-muted ml-1">
                      ({validSelected.size === 1 ? t("cart.item1") : t("cart.items").replace("{n}", String(validSelected.size))})
                    </span>
                  )}
                </span>
                <span className="font-bold text-ink">{formatPrice(selectedSubtotal)}</span>
              </div>
              {appliedPromo?.type === "percent" && (
                <div className="flex justify-between text-sm">
                  <span className="text-accent font-medium">{t("cart.discount").replace("{n}", String(appliedPromo.value))}</span>
                  <span className="font-bold text-accent">−{formatPrice(selectedSubtotal - discountedSubtotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft font-medium">{t("cart.shipping")}</span>
                {selectedSubtotal === 0 ? (
                  <span className="font-bold text-ink-muted">—</span>
                ) : shipping === 0 ? (
                  <span className="font-bold text-accent">{t("cart.free")} 🎉</span>
                ) : (
                  <span className="font-bold text-ink">{formatPrice(shipping)}</span>
                )}
              </div>
              <div className="h-px bg-line" />
              <div className="flex justify-between">
                <span className="font-extrabold text-ink">{t("cart.total")}</span>
                <span className="font-extrabold text-ink text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Promo */}
            <div>
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-accent-soft rounded-control px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-accent">{promoMsg}</p>
                  </div>
                  <button onClick={removePromo} className="text-xs text-ink-muted hover:text-red-400 font-bold transition-colors ml-3">
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
                      className="flex-1 border border-line rounded-control px-3 py-2.5 text-sm font-medium text-ink placeholder-ink-muted focus:outline-none focus:border-accent transition-colors bg-canvas"
                    />
                    <button
                      onClick={handlePromo}
                      disabled={promoBusy}
                      className="px-4 py-2.5 rounded-control border border-line text-sm font-bold text-ink-soft hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
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
                          <Link href="/login" className="text-accent underline font-bold">
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
              className={`u-btn w-full py-3.5 rounded-control font-semibold uppercase tracking-[0.06em] text-white text-[13px] flex items-center justify-center gap-2 ${
                validSelected.size > 0 ? "bg-ink hover:bg-ink/85 cursor-pointer" : "bg-ink-muted cursor-not-allowed"
              }`}
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
                  <span className="text-[10px] text-ink-muted font-semibold">{trust.label}</span>
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
