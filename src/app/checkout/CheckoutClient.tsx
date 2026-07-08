"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { CartItem } from "@/types";
import { formatPrice } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
import { useSettings } from "@/lib/db/useSettings";
import CsrfField from "@/components/CsrfField";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { useLoyalty } from "@/context/LoyaltyContext";
import { maxRedeemablePoints, discountForPoints, pointsForAmount, REDEEM_BLOCK } from "@/lib/loyalty";
import { fetchMyProfile } from "@/lib/db/profile";
import { listAddresses, addAddress, type SavedAddress } from "@/lib/db/addresses";
import { colorLabel, sizeLabel } from "@/lib/i18n/labels";
import { buildOrderMessage } from "@/lib/i18n/orderMessages";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { resolvePromo, promoDiscountAmount, type PromoDef } from "@/lib/promo";
import { priceCartWithBundles, type BundleGroupLine } from "@/lib/bundlePricing";
import type { Bundle } from "@/lib/bundles";
import {
  GEORGIA_REGIONS,
  TBILISI_DISTRICTS,
  PHONE_PLACEHOLDER,
  PHONE_PATTERN,
  POSTAL_CODE_PATTERN,
  POSTAL_CODE_PLACEHOLDER,
} from "@/lib/georgia";

function checkoutItemKey(i: CartItem) {
  return `${i.product.id}::${i.selectedColor}::${i.selectedSize}::${i.bundleSlug ?? ""}`;
}

type Step = "address" | "review" | "success";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  region: string;
  district: string;
  city: string;
  zip: string;
  notes: string;
  shipping: "standard" | "express";
}

const EMPTY: FormData = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", region: "", district: "", city: "", zip: "", notes: "",
  shipping: "standard",
};

const phoneRe = new RegExp(`^${PHONE_PATTERN}$`);
const postalRe = new RegExp(`^${POSTAL_CODE_PATTERN}$`);

function StepIndicator({ step, t }: { step: Step; t: (key: TranslationKey) => string }) {
  const steps: { id: Step; label: string }[] = [
    { id: "address", label: t("checkout.stepShipping") },
    { id: "review",  label: t("checkout.stepReview") },
    { id: "success", label: t("checkout.stepConfirmed") },
  ];
  const idx = steps.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold transition-colors ${
                i < idx
                  ? "bg-[#5E9E8C] text-white"
                  : i === idx
                  ? "bg-[#2A2320] text-white"
                  : "bg-[#EDE5D8] text-[#9A8E88]"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] font-bold mt-1 whitespace-nowrap ${i === idx ? "text-[#2A2320]" : "text-[#9A8E88]"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-12 sm:w-20 mx-1 mb-4 transition-colors ${i < idx ? "bg-[#5E9E8C]" : "bg-[#DDD5CC]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({
  label, id, type = "text", value, onChange, required, placeholder, error, inputMode, pattern, autoComplete,
}: {
  label: string; id: string; type?: string;
  value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string; error?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  pattern?: string; autoComplete?: string;
}) {
  const invalid = !!error;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-[#2A2320] mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        pattern={pattern}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`w-full h-11 px-4 rounded-xl border-2 bg-white text-[#2A2320] text-sm font-medium outline-none transition-colors placeholder:text-[#C8B8B0] focus:border-[#5E9E8C] ${
          invalid ? "border-red-400 focus:border-red-400" : "border-[#DDD5CC]"
        }`}
      />
      {invalid && (
        <p id={`${id}-error`} className="text-red-500 text-[11px] font-semibold mt-1">{error}</p>
      )}
    </div>
  );
}

export default function CheckoutClient({ bundles }: { bundles: Bundle[] }) {
  const { items: allItems, clearCart } = useCart();
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const loyalty = useLoyalty();
  const [step, setStep]   = useState<Step>("address");
  const [form, setForm]   = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [orderNum, setOrderNum] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  /* Promo carried over from the cart page — re-resolved here, never trusted
     as a serialized discount amount (see src/lib/promo.ts). */
  const [appliedPromo, setAppliedPromo] = useState<PromoDef | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState("");

  /* Filter to only the items the user selected in cart */
  const [items, setItems] = useState<CartItem[]>(allItems);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("loov_checkout_keys");
      if (raw) {
        const keys: string[] = JSON.parse(raw);
        const keySet = new Set(keys);
        const filtered = allItems.filter((i) => keySet.has(checkoutItemKey(i)));
        if (filtered.length > 0) setItems(filtered);
        localStorage.removeItem("loov_checkout_keys");
      }
    } catch {/* ignore parse errors */}
    try {
      const code = localStorage.getItem("loov_checkout_promo");
      if (code) {
        const promo = resolvePromo(code);
        if (promo) { setAppliedPromo(promo); setAppliedPromoCode(code.trim().toUpperCase()); }
      }
      localStorage.removeItem("loov_checkout_promo");
    } catch {/* ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Pre-fill contact details for signed-in shoppers (never overwrite typing). */
  useEffect(() => {
    if (!user) return;
    setForm((f) => {
      if (f.firstName || f.lastName || f.email) return f;
      const [first, ...rest] = (user.name ?? "").trim().split(/\s+/);
      return { ...f, firstName: first ?? "", lastName: rest.join(" "), email: user.email ?? "" };
    });
    /* Phone comes from the saved profile (profiles.phone). */
    let cancelled = false;
    fetchMyProfile().then(({ profile }) => {
      if (cancelled || !profile?.phone) return;
      setForm((f) => (f.phone ? f : { ...f, phone: profile.phone ?? "" }));
    });
    return () => { cancelled = true; };
  }, [user]);

  /* ── Saved addresses (address book) — signed-in shoppers pick instead of retyping ── */
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string>("new");
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [addrBookReady, setAddrBookReady] = useState(false);

  function applyAddress(a: SavedAddress) {
    setForm((f) => ({
      ...f,
      firstName: a.firstName || f.firstName,
      lastName: a.lastName || f.lastName,
      phone: a.phone || f.phone,
      address: a.street,
      region: a.region,
      district: a.district,
      city: a.city,
      zip: a.zip,
    }));
    setErrors({});
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listAddresses().then(({ addresses, ready }) => {
      if (cancelled) return;
      setSavedAddresses(addresses);
      setAddrBookReady(ready);
      /* Auto-pick the default address if the shopper hasn't typed one yet. */
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      if (def) {
        setSelectedAddrId(def.id);
        setForm((f) => {
          if (f.address) return f; // don't clobber what they typed
          return {
            ...f,
            firstName: f.firstName || def.firstName,
            lastName: f.lastName || def.lastName,
            phone: f.phone || def.phone,
            address: def.street,
            region: def.region,
            district: def.district,
            city: def.city,
            zip: def.zip,
          };
        });
      }
    });
    return () => { cancelled = true; };
  }, [user]);

  const { freeShippingThreshold, standardShippingPrice, expressEnabled, expressPrice } = useSettings();

  /* Bundle-aware subtotal — same rule the server uses for the real charge
     (src/lib/bundlePricing.ts): a bundle-tagged group only gets the flat
     bundle price when it exactly matches the bundle's item list. */
  const bundleDefs = useMemo(
    () => bundles.map((b) => ({ slug: b.slug, items: b.items, bundlePrice: b.bundlePrice })),
    [bundles]
  );
  const bundleResult = useMemo(() => {
    const lines: BundleGroupLine[] = items.map((i) => ({
      key: checkoutItemKey(i),
      productSlug: i.product.slug,
      unitPrice: effectivePrice(i.product, i.selectedSize),
      quantity: i.quantity,
      bundleSlug: i.bundleSlug,
    }));
    return priceCartWithBundles(lines, bundleDefs);
  }, [items, bundleDefs]);
  const checkoutTotal = bundleResult.subtotal;

  /* Promo — applied on top of the bundle-aware subtotal. */
  const promoDiscount = promoDiscountAmount(appliedPromo, checkoutTotal);
  const promoShippingFree = appliedPromo?.type === "shipping";
  const postPromoSubtotal = checkoutTotal - promoDiscount;

  function removePromo() {
    setAppliedPromo(null);
    setAppliedPromoCode("");
  }

  /* If the admin turned Express off while it was selected, fall back to standard. */
  useEffect(() => {
    if (!expressEnabled && form.shipping === "express") {
      setForm((f) => ({ ...f, shipping: "standard" }));
    }
  }, [expressEnabled, form.shipping]);

  // Express is always charged; the free threshold only applies to standard (post-promo).
  const shippingCost =
    form.shipping === "express" && expressEnabled
      ? expressPrice
      : promoShippingFree || postPromoSubtotal >= freeShippingThreshold ? 0 : standardShippingPrice;
  const giftWrapCost = giftWrap ? 5 : 0;

  /* ── Loov Rewards ── */
  const redeemablePoints = maxRedeemablePoints(loyalty.balance, postPromoSubtotal);
  const redeemPts = usePoints ? redeemablePoints : 0;
  const pointsDiscount = discountForPoints(redeemPts);

  const total = Math.max(0, postPromoSubtotal + shippingCost + giftWrapCost - pointsDiscount);

  function set(key: keyof FormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  /* Manual address fields show when there's nothing saved or "different address" is picked. */
  const showManualFields = !user || savedAddresses.length === 0 || selectedAddrId === "new";

  async function handleContinueToReview() {
    if (!validateAddress()) return;
    // Optionally file the freshly typed address into the address book.
    if (user && addrBookReady && showManualFields && saveNewAddress) {
      const res = await addAddress({
        label: "Home",
        firstName: form.firstName,
        lastName: form.lastName,
        street: form.address,
        region: form.region,
        district: form.district,
        city: form.city,
        zip: form.zip,
        phone: form.phone,
        isDefault: savedAddresses.length === 0,
      });
      if (res.address) setSavedAddresses((prev) => [...prev, res.address!]);
      setSaveNewAddress(false);
    }
    setStep("review");
  }

  function validateAddress(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) e.firstName = t("checkout.errRequired");
    if (!form.lastName.trim())  e.lastName  = t("checkout.errRequired");
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = t("checkout.errEmail");
    if (!form.phone.trim()) e.phone = t("checkout.errRequired");
    else if (!phoneRe.test(form.phone.replace(/\s/g, "")))
      e.phone = t("checkout.errPhone");
    if (!form.address.trim()) e.address = t("checkout.errRequired");
    if (!form.region) e.region = t("checkout.errRegion");
    if (!form.city.trim()) e.city = t("checkout.errRequired");
    if (form.zip.trim() && !postalRe.test(form.zip.trim()))
      e.zip = t("checkout.errZip");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePlaceOrder() {
    setPlacing(true);
    setPlaceError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          street: form.address,
          region: form.region,
          district: form.district,
          city: form.city,
          zip: form.zip,
          notes: form.notes,
          shipping: form.shipping,
          giftWrap,
          giftMessage,
          locale,
          redeemPoints: redeemPts,
          promoCode: appliedPromoCode || undefined,
          items: items.map((i) => ({
            productId: i.product.id,
            color: i.selectedColor,
            size: i.selectedSize,
            quantity: i.quantity,
            bundleSlug: i.bundleSlug,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("checkout.errGeneric"));
      }
      setOrderNum(data.orderNumber);
      /* Loov Rewards: for signed-in users the server wrote the DB ledger —
         just refresh. Guests keep the local ledger. */
      if (data.ledger === "db") {
        setEarnedPoints(data.pointsEarned ?? 0);
        loyalty.refresh();
      } else {
        if (data.pointsRedeemed > 0) loyalty.redeemPoints(data.pointsRedeemed, data.orderNumber);
        setEarnedPoints(loyalty.earnFromOrder(data.total, data.orderNumber));
      }
      clearCart();
      setStep("success");
    } catch (e) {
      setPlaceError(
        e instanceof Error && e.message !== "Failed to fetch"
          ? e.message
          : t("checkout.errNetwork")
      );
    } finally {
      setPlacing(false);
    }
  }

  /* ── Empty checkout ── */
  if (items.length === 0 && step !== "success") {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="text-6xl mb-5">🛒</div>
        <h2 className="text-2xl font-extrabold text-[#2A2320] mb-3">{t("cart.empty.title")}</h2>
        <p className="text-[#5E5450] mb-7 text-sm">{t("checkout.emptySubtitle")}</p>
        <Link href="/products" className="font-bold px-7 py-3 rounded-full text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: "#5E9E8C" }}>
          {t("checkout.browseProducts")} →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#9A8E88] mb-6">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/cart" className="hover:text-[#5E9E8C] transition-colors">{t("nav.cart")}</Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold">{t("checkout.title")}</span>
      </nav>

      <h1 className="text-2xl font-extrabold text-[#2A2320] mb-6">{t("checkout.title")}</h1>
      <StepIndicator step={step} t={t} />

      {/* ══ STEP 1: Address ══ */}
      {step === "address" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Contact */}
            <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
              <h2 className="font-extrabold text-[#2A2320] mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#5E9E8C] text-white text-xs flex items-center justify-center font-bold">1</span>
                {t("checkout.contact")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("checkout.firstName")} id="firstName" value={form.firstName} onChange={(v) => set("firstName", v)} required placeholder="Ana" autoComplete="given-name" error={errors.firstName} />
                <Field label={t("checkout.lastName")}  id="lastName"  value={form.lastName}  onChange={(v) => set("lastName", v)}  required placeholder="Beridze" autoComplete="family-name" error={errors.lastName} />
                <Field label={t("checkout.email")}     id="email"     type="email" inputMode="email" value={form.email}  onChange={(v) => set("email", v)}  required placeholder="ana@email.com" autoComplete="email" error={errors.email} />
                <Field label={t("checkout.phone")}     id="phone"     type="tel"   inputMode="tel" value={form.phone}  onChange={(v) => set("phone", v)}  required placeholder={PHONE_PLACEHOLDER} autoComplete="tel" error={errors.phone} />
              </div>
            </div>

            {/* Shipping address */}
            <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
              <h2 className="font-extrabold text-[#2A2320] mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#5E9E8C] text-white text-xs flex items-center justify-center font-bold">2</span>
                {t("checkout.shippingAddress")}
              </h2>

              {/* Saved addresses — pick one instead of retyping */}
              {user && savedAddresses.length > 0 && (
                <div className="mb-5 space-y-2">
                  <p className="text-[11px] font-bold text-[#9A8E88] uppercase tracking-widest">{t("checkout.savedAddresses")}</p>
                  {savedAddresses.map((a) => (
                    <label
                      key={a.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedAddrId === a.id ? "border-[#5E9E8C] bg-[#EAF2F0]" : "border-[#DDD5CC] hover:border-[#9A8E88]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddrId === a.id}
                        onChange={() => { setSelectedAddrId(a.id); applyAddress(a); }}
                        className="accent-[#5E9E8C] mt-1"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#2A2320] flex items-center gap-2">
                          {a.label === "Home" ? t("addr.labelHome") : a.label === "Work" ? t("addr.labelWork") : t("addr.labelOther")}
                          {a.isDefault && (
                            <span className="text-[9px] font-bold bg-white text-[#5E9E8C] border border-[#5E9E8C] px-1.5 py-0.5 rounded-full uppercase">
                              {t("addr.default")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#5E5450] mt-0.5">
                          {a.firstName} {a.lastName} · {a.street}{a.district ? `, ${a.district}` : ""}{a.city ? `, ${a.city}` : ""}{a.zip ? `, ${a.zip}` : ""}
                        </p>
                        {a.phone && <p className="text-xs text-[#9A8E88]">{a.phone}</p>}
                      </div>
                    </label>
                  ))}
                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedAddrId === "new" ? "border-[#5E9E8C] bg-[#EAF2F0]" : "border-dashed border-[#DDD5CC] hover:border-[#9A8E88]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      checked={selectedAddrId === "new"}
                      onChange={() => {
                        setSelectedAddrId("new");
                        setForm((f) => ({ ...f, address: "", region: "", district: "", city: "", zip: "" }));
                      }}
                      className="accent-[#5E9E8C]"
                    />
                    <span className="text-sm font-bold text-[#5E9E8C]">＋ {t("checkout.useDifferent")}</span>
                  </label>
                </div>
              )}

              <div className="space-y-4">
                {showManualFields && (
                <Field label={t("checkout.streetAddress")} id="address" value={form.address} onChange={(v) => set("address", v)} required placeholder="123 Rustaveli Avenue" autoComplete="address-line1" error={errors.address} />
                )}
                {showManualFields && (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Region (mkhare) */}
                  <div>
                    <label htmlFor="region" className="block text-xs font-bold text-[#2A2320] mb-1.5">
                      {t("checkout.region")}<span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <select
                      id="region"
                      value={form.region}
                      onChange={(e) => { set("region", e.target.value); set("district", ""); }}
                      required
                      aria-invalid={!!errors.region}
                      aria-describedby={errors.region ? "region-error" : undefined}
                      className={`w-full h-11 px-4 rounded-xl border-2 bg-white text-sm font-medium outline-none transition-colors focus:border-[#5E9E8C] ${
                        errors.region ? "border-red-400" : "border-[#DDD5CC]"
                      } ${form.region ? "text-[#2A2320]" : "text-[#C8B8B0]"}`}
                    >
                      <option value="" disabled>{t("checkout.selectRegion")}</option>
                      {GEORGIA_REGIONS.map((r) => (
                        <option key={r.code} value={r.en} className="text-[#2A2320]">
                          {r.en} · {r.ka}
                        </option>
                      ))}
                    </select>
                    {errors.region && (
                      <p id="region-error" className="text-red-500 text-[11px] font-semibold mt-1">{errors.region}</p>
                    )}
                  </div>

                  {/* District — Tbilisi only */}
                  {form.region === "Tbilisi" ? (
                    <div>
                      <label htmlFor="district" className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("checkout.district")}</label>
                      <select
                        id="district"
                        value={form.district}
                        onChange={(e) => set("district", e.target.value)}
                        className={`w-full h-11 px-4 rounded-xl border-2 border-[#DDD5CC] bg-white text-sm font-medium outline-none transition-colors focus:border-[#5E9E8C] ${
                          form.district ? "text-[#2A2320]" : "text-[#C8B8B0]"
                        }`}
                      >
                        <option value="">{t("checkout.selectDistrict")}</option>
                        {TBILISI_DISTRICTS.map((d) => (
                          <option key={d} value={d} className="text-[#2A2320]">{d}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <Field label={t("checkout.cityTown")} id="city" value={form.city} onChange={(v) => set("city", v)} required placeholder="Batumi" autoComplete="address-level2" error={errors.city} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {form.region === "Tbilisi" && (
                    <Field label={t("checkout.city")} id="city" value={form.city} onChange={(v) => set("city", v)} required placeholder="Tbilisi" autoComplete="address-level2" error={errors.city} />
                  )}
                  <Field label={t("checkout.postalCode")} id="zip" value={form.zip} onChange={(v) => set("zip", v)} placeholder={POSTAL_CODE_PLACEHOLDER} inputMode="numeric" error={errors.zip} />
                </div>
                </>
                )}
                {showManualFields && user && addrBookReady && (
                  <label className="flex items-center gap-2 text-sm text-[#5E5450] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={(e) => setSaveNewAddress(e.target.checked)}
                      className="w-4 h-4 accent-[#5E9E8C]"
                    />
                    {t("checkout.saveAddress")}
                  </label>
                )}
                <div>
                  <label className="block text-xs font-bold text-[#2A2320] mb-1.5">{t("checkout.orderNotes")} <span className="font-normal text-[#9A8E88]">{t("checkout.optional")}</span></label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder={t("checkout.notesPlaceholder")}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#DDD5CC] bg-white text-[#2A2320] text-sm font-medium outline-none focus:border-[#5E9E8C] transition-colors placeholder:text-[#C8B8B0] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Shipping method */}
            <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
              <h2 className="font-extrabold text-[#2A2320] mb-5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#5E9E8C] text-white text-xs flex items-center justify-center font-bold">3</span>
                {t("checkout.shippingMethod")}
              </h2>
              <div className="space-y-3">
                {[
                  { id: "standard", label: t("checkout.standardDelivery"), sub: t("checkout.standardSub"), price: promoShippingFree || postPromoSubtotal >= freeShippingThreshold ? `${t("cart.free")} 🎉` : formatPrice(standardShippingPrice) },
                  ...(expressEnabled
                    ? [{ id: "express", label: t("checkout.expressDelivery"), sub: t("checkout.expressSub"), price: formatPrice(expressPrice) }]
                    : []),
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.shipping === opt.id
                        ? "border-[#5E9E8C] bg-[#EAF2F0]"
                        : "border-[#DDD5CC] hover:border-[#9A8E88]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        value={opt.id}
                        checked={form.shipping === opt.id as "standard" | "express"}
                        onChange={() => set("shipping", opt.id)}
                        className="accent-[#5E9E8C]"
                      />
                      <div>
                        <p className="text-sm font-bold text-[#2A2320]">{opt.label}</p>
                        <p className="text-xs text-[#9A8E88]">{opt.sub}</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-[#2A2320] text-sm whitespace-nowrap">{opt.price}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Gift wrap */}
            <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <p className="font-extrabold text-[#2A2320] text-sm">{t("checkout.addGiftWrap")}</p>
                    <p className="text-xs text-[#9A8E88]">{t("checkout.giftWrapSub").replace("{price}", formatPrice(5))}</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={giftWrap}
                  onClick={() => setGiftWrap((v) => !v)}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${
                    giftWrap ? "bg-[#5E9E8C]" : "bg-[#DDD5CC]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      giftWrap ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {giftWrap && (
                <div className="mt-4 border-t border-[#F5F0EB] pt-4">
                  <label className="block text-xs font-bold text-[#2A2320] mb-1.5">
                    {t("checkout.giftMessage")} <span className="font-normal text-[#9A8E88]">{t("checkout.optional")}</span>
                  </label>
                  <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder={t("checkout.giftMessagePlaceholder")}
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#DDD5CC] bg-white text-[#2A2320] text-sm font-medium outline-none focus:border-[#5E9E8C] transition-colors placeholder:text-[#C8B8B0] resize-none"
                  />
                  <p className="text-[10px] text-[#9A8E88] text-right mt-1">{giftMessage.length}/200</p>
                </div>
              )}
            </div>

            {/* CSRF placeholder — real validation lands with the backend (Phase 2) */}
            <CsrfField />

            <button
              onClick={handleContinueToReview}
              className="w-full py-4 rounded-2xl font-extrabold text-white text-base hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E9E8C] focus-visible:ring-offset-2"
              style={{ backgroundColor: "#5E9E8C" }}
            >
              {t("checkout.continueReview")} →
            </button>
          </div>

          {/* Order mini-summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl border border-[#DDD5CC] p-5">
              <h3 className="font-extrabold text-[#2A2320] text-sm mb-4">
                {items.length === 1 ? t("checkout.yourOrder1") : t("checkout.yourOrder").replace("{n}", String(items.length))}
                {items.length < allItems.length && ` (${t("checkout.ofInCart").replace("{total}", String(allItems.length))})`}
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {items.map((item) => {
                  const key = checkoutItemKey(item);
                  const matched = !!item.bundleSlug && bundleResult.matchedBundles.has(item.bundleSlug);
                  const linePrice = matched ? (bundleResult.lineTotals.get(key) ?? 0) : effectivePrice(item.product, item.selectedSize) * item.quantity;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: item.product.cardColor }}>
                        {item.product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          item.product.emoji
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#2A2320] leading-tight line-clamp-1">{item.product.name}</p>
                        <p className="text-[10px] text-[#9A8E88]">{colorLabel(item.selectedColor, t)} · {sizeLabel(item.selectedSize, t)} × {item.quantity}</p>
                      </div>
                      <span className="text-xs font-extrabold text-[#2A2320] flex-shrink-0">{formatPrice(linePrice)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-[#DDD5CC] pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-[#5E5450]"><span>{t("cart.subtotal")}</span><span className="font-bold">{formatPrice(checkoutTotal)}</span></div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-[#5E9E8C]"><span>{appliedPromoCode}</span><span className="font-bold">−{formatPrice(promoDiscount)}</span></div>
                )}
                <div className="flex justify-between text-[#5E5450]"><span>{t("cart.shipping")}</span><span className="font-bold">{shippingCost === 0 ? t("cart.free") : formatPrice(shippingCost)}</span></div>
                {giftWrap && (
                  <div className="flex justify-between text-[#5E5450]"><span>🎁 {t("checkout.addGiftWrap")}</span><span className="font-bold">{formatPrice(5)}</span></div>
                )}
                <div className="flex justify-between font-extrabold text-[#2A2320] text-sm pt-1 border-t border-[#DDD5CC]">
                  <span>{t("cart.total")}</span><span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 2: Review ══ */}
      {step === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            {/* Shipping summary */}
            <div className="bg-white rounded-2xl border border-[#DDD5CC] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-extrabold text-[#2A2320]">{t("checkout.shippingDetails")}</h2>
                <button onClick={() => setStep("address")} className="text-xs font-bold text-[#5E9E8C] hover:underline">{t("common.edit")}</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: t("checkout.name"),    value: `${form.firstName} ${form.lastName}` },
                  { label: t("checkout.email"),   value: form.email },
                  { label: t("checkout.phone"),   value: form.phone },
                  { label: t("checkout.address"), value: `${form.address}, ${form.district ? `${form.district}, ` : ""}${form.city}${form.zip ? ` ${form.zip}` : ""}${form.region ? `, ${form.region}` : ""}` },
                  { label: t("checkout.delivery"),value: form.shipping === "express" ? t("checkout.expressNextDay") : t("checkout.standardDays") },
                ].map((row) => (
                  <div key={row.label}>
                    <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-0.5">{row.label}</p>
                    <p className="font-semibold text-[#2A2320] text-xs">{row.value}</p>
                  </div>
                ))}
              </div>
              {form.notes && (
                <div className="mt-3 p-3 bg-[#F5F0EB] rounded-xl">
                  <p className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-0.5">{t("checkout.notes")}</p>
                  <p className="text-xs text-[#5E5450]">{form.notes}</p>
                </div>
              )}
              {giftWrap && (
                <div className="mt-3 p-3 bg-[#EAF2F0] rounded-xl flex items-start gap-2">
                  <span className="text-base flex-shrink-0">🎁</span>
                  <div>
                    <p className="text-xs font-bold text-[#2A2320]">{t("checkout.giftWrapAdded").replace("{price}", formatPrice(5))}</p>
                    {giftMessage && <p className="text-xs text-[#5E5450] mt-0.5 italic">&ldquo;{giftMessage}&rdquo;</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl border border-[#DDD5CC] p-5">
              <h2 className="font-extrabold text-[#2A2320] mb-4">{t("checkout.orderItems")}</h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const key = checkoutItemKey(item);
                  const matched = !!item.bundleSlug && bundleResult.matchedBundles.has(item.bundleSlug);
                  const linePrice = matched ? (bundleResult.lineTotals.get(key) ?? 0) : effectivePrice(item.product, item.selectedSize) * item.quantity;
                  return (
                    <div key={key} className="flex items-center gap-3 py-2 border-b border-[#F5F0EB] last:border-0">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: item.product.cardColor }}>
                        {item.product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          item.product.emoji
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#2A2320] text-sm">{item.product.name}</p>
                        <p className="text-xs text-[#9A8E88]">{colorLabel(item.selectedColor, t)} · {sizeLabel(item.selectedSize, t)}</p>
                        <p className="text-xs text-[#9A8E88]">{t("checkout.qty").replace("{n}", String(item.quantity))}</p>
                      </div>
                      <span className="font-extrabold text-[#2A2320]">{formatPrice(linePrice)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Loov Rewards — redeem points */}
            {loyalty.hydrated && loyalty.balance >= REDEEM_BLOCK && (
              <div className="bg-[#FFF8E8] border border-[#F0C85A] rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="font-extrabold text-[#2A2320] text-sm">{t("checkout.usePoints")}</p>
                      <p className="text-xs text-[#8B6914]">
                        <strong>{t("checkout.youHavePoints").replace("{n}", loyalty.balance.toLocaleString())}</strong>
                        {redeemablePoints > 0 ? (
                          <> {t("checkout.redeemFor").replace("{n}", redeemablePoints.toLocaleString()).split("{amount}")[0]}
                          <strong>{formatPrice(discountForPoints(redeemablePoints))}</strong>
                          {t("checkout.redeemFor").split("{amount}")[1]}</>
                        ) : (
                          <> {t("checkout.notEnoughPoints")}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={usePoints}
                    disabled={redeemablePoints === 0}
                    onClick={() => setUsePoints((v) => !v)}
                    className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 disabled:opacity-40 ${
                      usePoints ? "bg-[#5E9E8C]" : "bg-[#DDD5CC]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        usePoints ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {usePoints && pointsDiscount > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#F0C85A]/40 flex items-center justify-between text-sm">
                    <span className="font-bold text-[#8B6914]">−{redeemPts.toLocaleString()} points</span>
                    <span className="font-extrabold text-[#5E9E8C]">−{formatPrice(pointsDiscount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment note */}
            <div className="bg-[#EAF2F0] border border-[#C8DDD8] rounded-2xl p-5 flex gap-3 items-start">
              <span className="text-xl flex-shrink-0">🔒</span>
              <div>
                <p className="font-bold text-[#2A2320] text-sm mb-1">{t("checkout.paymentOnDelivery")}</p>
                <p className="text-xs text-[#5E5450] leading-relaxed">
                  {t("checkout.paymentNote")}
                </p>
              </div>
            </div>

            {placeError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <p className="text-sm font-semibold text-red-600">{placeError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("address")}
                disabled={placing}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[#5E5450] border-2 border-[#DDD5CC] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-all text-sm disabled:opacity-50"
              >
                ← {t("common.back")}
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="flex-1 py-3.5 rounded-2xl font-extrabold text-white text-base hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:active:scale-100"
                style={{ backgroundColor: "#5E9E8C" }}
              >
                {placing ? t("checkout.placingOrder") : `${t("checkout.placeOrderBtn")} →`}
              </button>
            </div>
          </div>

          {/* Price summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl border border-[#DDD5CC] p-5 space-y-3">
              <h3 className="font-extrabold text-[#2A2320] text-sm">{t("checkout.priceSummary")}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#5E5450]"><span>{t("cart.subtotal")}</span><span className="font-bold">{formatPrice(checkoutTotal)}</span></div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-[#5E9E8C]">
                    <span className="flex items-center gap-1.5">
                      {appliedPromoCode}
                      <button type="button" onClick={removePromo} className="text-[10px] font-bold text-[#9A8E88] hover:text-red-400 underline underline-offset-2">
                        {t("common.remove")}
                      </button>
                    </span>
                    <span className="font-bold">−{formatPrice(promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#5E5450]">
                  <span>{t("checkout.shippingParen").replace("{method}", form.shipping === "express" ? t("checkout.expressDelivery") : t("checkout.standardDelivery"))}</span>
                  <span className="font-bold">{shippingCost === 0 ? `${t("cart.free")} 🎉` : formatPrice(shippingCost)}</span>
                </div>
                {giftWrap && (
                  <div className="flex justify-between text-[#5E5450]">
                    <span>🎁 {t("checkout.addGiftWrap")}</span>
                    <span className="font-bold">{formatPrice(5)}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-[#5E9E8C]">
                    <span>⭐ {t("checkout.pointsParen").replace("{n}", redeemPts.toLocaleString())}</span>
                    <span className="font-bold">−{formatPrice(pointsDiscount)}</span>
                  </div>
                )}
                <div className="h-px bg-[#DDD5CC]" />
                <div className="flex justify-between font-extrabold text-[#2A2320] text-base">
                  <span>{t("cart.total")}</span><span>{formatPrice(total)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 justify-center bg-[#FFF8E8] border border-[#F0C85A] rounded-xl px-3 py-2">
                <span className="text-sm">⭐</span>
                <span className="text-[11px] font-bold text-[#8B6914]">
                  {t("checkout.willEarn").replace("{n}", String(pointsForAmount(total, loyalty.tier)))}
                </span>
              </div>
              <div className="flex items-center justify-around pt-2">
                {[`🔒 ${t("cart.trustSecure")}`, `🔄 ${t("cart.trustReturns")}`, `🌿 ${t("cart.trustOrganic")}`].map((label) => (
                  <span key={label} className="text-[10px] text-[#9A8E88] font-semibold">{label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 3: Success ══ */}
      {step === "success" && (
        <div className="max-w-lg mx-auto text-center py-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg" style={{ backgroundColor: "#EAF2F0" }}>
            🎉
          </div>
          <h2 className="text-3xl font-extrabold text-[#2A2320] mb-2">{t("checkout.orderPlaced")}</h2>
          <p className="text-[#5E5450] mb-1">{t("checkout.thankYou").split("{name}")[0]}<strong>{form.firstName}</strong>{t("checkout.thankYou").split("{name}")[1]}</p>
          <p className="text-[#5E5450] text-sm mb-6">
            {t("checkout.orderReceived").split("{num}")[0]}
            <span className="font-bold text-[#5E9E8C]">{orderNum}</span>
            {t("checkout.orderReceived").split("{num}")[1].split("{email}")[0]}
            <strong>{form.email}</strong>
            {t("checkout.orderReceived").split("{num}")[1].split("{email}")[1]}
          </p>

          <div className="bg-[#F5F0EB] rounded-2xl p-5 mb-8 text-left space-y-3">
            {[
              { icon: "📦", text: t("checkout.deliveringTo").replace("{address}", `${form.address}, ${form.city}${form.region ? `, ${form.region}` : ""}`) },
              { icon: "🚀", text: form.shipping === "express" ? t("checkout.expressNote") : t("checkout.standardNote") },
              ...(giftWrap ? [{ icon: "🎁", text: `${t("checkout.giftWrappedNote")}${giftMessage ? ` · "${giftMessage}"` : ""}` }] : []),
              ...(earnedPoints > 0
                ? [{ icon: "⭐", text: t("checkout.earnedPointsNote").replace("{n}", String(earnedPoints)).replace("{balance}", String(loyalty.balance)) }]
                : []),
              { icon: "💵", text: t("checkout.paymentOnDeliveryNote") },
              { icon: "📞", text: t("checkout.willCallNote").replace("{phone}", form.phone) },
            ].map((row) => (
              <div key={row.text} className="flex items-start gap-3">
                <span className="text-base flex-shrink-0">{row.icon}</span>
                <span className="text-sm text-[#5E5450]">{row.text}</span>
              </div>
            ))}
          </div>

          {/* Localized confirmation message — the exact text the backend will
              email/SMS to the customer, in the language they used on the site. */}
          {(() => {
            const msg = buildOrderMessage(locale, { name: form.firstName || "there", orderNum });
            return (
              <div className="bg-white border border-[#DDD5CC] rounded-2xl p-5 mb-8 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📧</span>
                  <p className="text-sm font-bold text-[#2A2320]">
                    {t("checkout.confirmationSent")}
                    <span className="ml-1.5 text-[10px] font-bold text-[#5E9E8C] bg-[#EAF2F0] px-1.5 py-0.5 rounded-full uppercase align-middle">{locale}</span>
                  </p>
                </div>
                <p className="text-xs font-bold text-[#2A2320] mb-1.5">{msg.subject}</p>
                <p className="text-xs text-[#5E5450] whitespace-pre-line leading-relaxed">{msg.email}</p>
                <div className="mt-3 flex items-center gap-2 bg-[#EAF2F0] rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest">{t("checkout.trackingCode")}</span>
                  <span className="text-sm font-extrabold text-[#5E9E8C]">{orderNum}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/products"
              className="font-bold px-7 py-3 rounded-full text-white hover:opacity-90 transition-opacity shadow-sm"
              style={{ backgroundColor: "#5E9E8C" }}
            >
              {t("common.continueShopping")} →
            </Link>
            <Link
              href="/"
              className="font-bold px-7 py-3 rounded-full border-2 border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-all"
            >
              {t("checkout.backToHome")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
