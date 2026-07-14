"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/settings";

interface Field {
  key: Exclude<keyof StoreSettings, "expressEnabled" | "whatsappNumber" | "heroSlugs">;
  label: string;
  hint: string;
  icon: string;
  suffix: string;
  step: number;
  min: number;
  max: number;
}

const FIELDS: Field[] = [
  {
    key: "pointsPerGel",
    label: "Loyalty points per 1 ₾",
    hint: "How many Loov Rewards points a customer earns for every 1 ₾ spent. Higher = more generous.",
    icon: "⭐",
    suffix: "points / ₾",
    step: 0.5,
    min: 0,
    max: 100,
  },
  {
    key: "freeShippingThreshold",
    label: "Free shipping threshold",
    hint: "Order subtotal at which STANDARD shipping becomes free. Shown across the site (cart, product pages, banners).",
    icon: "🚀",
    suffix: "₾",
    step: 5,
    min: 0,
    max: 100000,
  },
  {
    key: "standardShippingPrice",
    label: "Standard shipping price",
    hint: "What standard delivery costs when the order is below the free-shipping threshold.",
    icon: "📦",
    suffix: "₾",
    step: 1,
    min: 0,
    max: 1000,
  },
  {
    key: "giftWrapPrice",
    label: "Gift wrap price",
    hint: "What gift wrapping costs at checkout. Set 0 to make it free — all storefront texts follow this value automatically.",
    icon: "🎁",
    suffix: "₾",
    step: 1,
    min: 0,
    max: 1000,
  },
  {
    key: "newBadgeDays",
    label: '"New" badge duration',
    hint: 'A product automatically shows the "New" badge for this many days after you add it, then it drops off on its own. (You can still pin a product as New manually per product.)',
    icon: "🆕",
    suffix: "days",
    step: 1,
    min: 0,
    max: 365,
  },
];

/** Delivery estimate range shown on product pages — its own small card (min/max pair). */
const DELIVERY_FIELDS: Field[] = [
  {
    key: "deliveryMinDays",
    label: "Fastest estimate",
    hint: "Earliest business days shown for standard delivery on product pages.",
    icon: "📅",
    suffix: "days",
    step: 1,
    min: 0,
    max: 30,
  },
  {
    key: "deliveryMaxDays",
    label: "Slowest estimate",
    hint: "Latest business days shown for standard delivery on product pages.",
    icon: "📅",
    suffix: "days",
    step: 1,
    min: 0,
    max: 30,
  },
];

/** Membership tier knobs — rendered as their own card below the main fields. */
const TIER_FIELDS: Field[] = [
  {
    key: "loyaltySilverThreshold",
    label: "Silver from",
    hint: "Lifetime points a customer must earn to reach Silver.",
    icon: "🌿",
    suffix: "points",
    step: 100,
    min: 0,
    max: 1000000,
  },
  {
    key: "loyaltySilverMultiplier",
    label: "Silver earn rate",
    hint: "Earning multiplier at Silver — 1.25 means +25% bonus points on every order.",
    icon: "✨",
    suffix: "× points",
    step: 0.05,
    min: 1,
    max: 10,
  },
  {
    key: "loyaltyGoldThreshold",
    label: "Gold from",
    hint: "Lifetime points a customer must earn to reach Gold.",
    icon: "🌳",
    suffix: "points",
    step: 100,
    min: 0,
    max: 1000000,
  },
  {
    key: "loyaltyGoldMultiplier",
    label: "Gold earn rate",
    hint: "Earning multiplier at Gold — 1.5 means +50% bonus points on every order.",
    icon: "🏆",
    suffix: "× points",
    step: 0.05,
    min: 1,
    max: 10,
  },
  {
    key: "loyaltyMaxRedeemPercent",
    label: "Max redeemable",
    hint: "Highest share of an order's subtotal a customer can pay with points, in whole blocks of 100 points = 5₾.",
    icon: "🎯",
    suffix: "% of order",
    step: 1,
    min: 1,
    max: 100,
  },
];

export default function SettingsClient() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [seeded, setSeeded] = useState(true);

  /* Products for the hero-showcase picker (name + slug + thumb). */
  const [heroProducts, setHeroProducts] = useState<{ slug: string; name: string; emoji?: string | null; image_url?: string | null; card_color?: string | null }[]>([]);

  /* Preset avatars (FAZ 7) — customers pick one of these on their account page. */
  const [avatars, setAvatars] = useState<string[]>([]);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else { setSettings(d.settings); setSeeded(d.seeded !== false); }
      })
      .catch(() => setError("Could not load settings"))
      .finally(() => setLoading(false));
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setHeroProducts((d.products ?? []).map((p: Record<string, unknown>) => ({ slug: String(p.slug), name: String(p.name), emoji: p.emoji as string | null, image_url: p.image_url as string | null, card_color: p.card_color as string | null }))))
      .catch(() => {});
    fetch("/api/admin/avatars")
      .then((r) => r.json())
      .then((d) => setAvatars(d.avatars ?? []))
      .catch(() => {});
  }, []);

  async function uploadAvatar(file: File) {
    setAvatarError("");
    setAvatarBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "avatar");
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setAvatarBusy(false);
    if (d.ok && d.imageUrl) setAvatars((prev) => [...prev, d.imageUrl]);
    else setAvatarError(d.error || "Upload failed");
  }

  async function removeAvatar(url: string) {
    setAvatarError("");
    const res = await fetch("/api/admin/avatars", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const d = await res.json().catch(() => ({}));
    if (d.ok) setAvatars(d.avatars ?? []);
    else setAvatarError(d.error || "Delete failed");
  }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) { setSaved(true); setSeeded(true); setTimeout(() => setSaved(false), 2000); }
    else setError(data.error || "Save failed");
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-ink mb-1">Settings</h1>
      <p className="text-ink-muted text-sm mb-6">Store-wide rules that apply everywhere on the site.</p>

      {!seeded && (
        <div className="mb-5 rounded-control bg-[#FFF4E5] border border-[#F0C85A] px-4 py-3 text-sm text-[#8B6914]">
          ⚠️ The <code className="font-mono">settings</code> table isn&apos;t set up yet. Run <code className="font-mono">supabase/features.sql</code> in the SQL Editor. Saving will still work once the table exists.
        </div>
      )}

      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="bg-canvas rounded-card border border-line p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <label className="flex items-center gap-2 font-bold text-ink">
                  <span className="text-lg">{f.icon}</span>
                  {f.label}
                </label>
                <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">{f.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings[f.key]}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  onChange={(e) => setSettings((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
                  className="w-28 h-11 px-3 rounded-control border border-line text-lg font-extrabold text-ink outline-none focus:border-accent text-right"
                />
                <span className="text-xs font-semibold text-ink-muted w-16">{f.suffix}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Express Delivery: on/off toggle + price ── */}
      <div className="mt-4 bg-canvas rounded-card border border-line p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="flex items-center gap-2 font-bold text-ink">
              <span className="text-lg">⚡</span>
              Express Delivery
            </label>
            <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
              Next-business-day delivery offered at checkout. Turn it off to hide the option
              everywhere on the site. Express is always charged — the free-shipping threshold
              only applies to standard delivery.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Toggle */}
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, expressEnabled: !s.expressEnabled }))}
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${settings.expressEnabled ? "" : "bg-line"}`}
              style={settings.expressEnabled ? { backgroundColor: "var(--color-accent)" } : {}}
              aria-label="Toggle Express Delivery"
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-canvas shadow-sm transition-transform ${settings.expressEnabled ? "translate-x-5" : ""}`} />
            </button>
            <span className={`text-xs font-bold w-8 ${settings.expressEnabled ? "text-accent" : "text-ink-muted"}`}>
              {settings.expressEnabled ? "ON" : "OFF"}
            </span>
            {/* Price */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.expressPrice}
                min={0}
                max={1000}
                step={1}
                disabled={!settings.expressEnabled}
                onChange={(e) => setSettings((s) => ({ ...s, expressPrice: Number(e.target.value) }))}
                className="w-24 h-11 px-3 rounded-control border border-line text-lg font-extrabold text-ink outline-none focus:border-accent text-right disabled:opacity-40 disabled:bg-canvas"
              />
              <span className="text-xs font-semibold text-ink-muted">₾</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delivery estimate range ── */}
      <div className="mt-4 bg-canvas rounded-card border border-line p-5">
        <label className="flex items-center gap-2 font-bold text-ink">
          <span className="text-lg">🚚</span>
          Delivery estimate
        </label>
        <p className="text-xs text-ink-muted mt-1.5 leading-relaxed mb-4">
          The "Arrives between" range shown on every product page for standard delivery.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DELIVERY_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3 bg-canvas rounded-control px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <span>{f.icon}</span>{f.label}
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5 leading-snug">{f.hint}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="number"
                  value={settings[f.key]}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  onChange={(e) => setSettings((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
                  className="w-20 h-10 px-2 rounded-control border border-line font-extrabold text-ink outline-none focus:border-accent text-right bg-canvas"
                />
                <span className="text-[10px] font-semibold text-ink-muted w-10">{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>
        {settings.deliveryMinDays > settings.deliveryMaxDays && (
          <p className="mt-3 text-xs font-semibold text-red-500">
            ⚠️ Fastest estimate is greater than slowest — saving will be rejected until fixed.
          </p>
        )}
      </div>

      {/* ── Membership tiers (Loov Rewards) ── */}
      <div className="mt-4 bg-canvas rounded-card border border-line p-5">
        <label className="flex items-center gap-2 font-bold text-ink">
          <span className="text-lg">🏅</span>
          Membership tiers
        </label>
        <p className="text-xs text-ink-muted mt-1.5 leading-relaxed mb-4">
          Bronze is the start (no threshold, normal earn rate). Set when customers reach Silver
          and Gold and how much extra they earn there. The Rewards page and checkout preview
          update automatically. Tiers never go down — they follow lifetime earned points.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIER_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3 bg-canvas rounded-control px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <span>{f.icon}</span>{f.label}
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5 leading-snug">{f.hint}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="number"
                  value={settings[f.key]}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  onChange={(e) => setSettings((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
                  className="w-24 h-10 px-2 rounded-control border border-line font-extrabold text-ink outline-none focus:border-accent text-right bg-canvas"
                />
                <span className="text-[10px] font-semibold text-ink-muted w-12">{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>
        {settings.loyaltyGoldThreshold < settings.loyaltySilverThreshold && (
          <p className="mt-3 text-xs font-semibold text-red-500">
            ⚠️ Gold threshold is below Silver — Gold will start at the Silver threshold instead.
          </p>
        )}
      </div>

      {/* ── WhatsApp business number ── */}
      <div className="mt-4 bg-canvas rounded-card border border-line p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="flex items-center gap-2 font-bold text-ink">
              <span className="text-lg">💬</span>
              WhatsApp number
            </label>
            <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
              Business WhatsApp number, digits only with country code (e.g. <code className="font-mono">995599123456</code>).
              Used by the floating WhatsApp button, the contact page and the FAQ.
              Leave <strong>empty</strong> to hide all WhatsApp buttons until you have a number.
            </p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="995…"
            value={settings.whatsappNumber}
            onChange={(e) => setSettings((s) => ({ ...s, whatsappNumber: e.target.value.replace(/[^\d]/g, "") }))}
            className="w-44 h-11 px-3 rounded-control border border-line text-lg font-extrabold text-ink outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* ── Hero showcase (homepage) ── */}
      <div className="mt-4 bg-canvas rounded-card border border-line p-5">
        <label className="flex items-center gap-2 font-bold text-ink">
          <span className="text-lg">🎬</span>
          Hero showcase
        </label>
        <p className="text-xs text-ink-muted mt-1.5 leading-relaxed mb-3">
          Products featured in the big homepage hero. Pick one for a static showcase, or several —
          they auto-rotate every 5 seconds in the order you pick them (max 8). Leave empty to show
          the newest featured product automatically.
        </p>
        {(() => {
          const selected = (settings.heroSlugs || "").split(",").map((x) => x.trim()).filter(Boolean);
          const toggleHero = (slug: string) =>
            setSettings((s) => {
              const cur = (s.heroSlugs || "").split(",").map((x) => x.trim()).filter(Boolean);
              const next = cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug].slice(0, 8);
              return { ...s, heroSlugs: next.join(",") };
            });
          const ordered = [...heroProducts].sort((a, b) => {
            const ia = selected.indexOf(a.slug); const ib = selected.indexOf(b.slug);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
          });
          return (
            <div className="max-h-80 overflow-y-auto border border-line rounded-control divide-y divide-line">
              {ordered.map((p) => {
                const idx = selected.indexOf(p.slug);
                const on = idx !== -1;
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => toggleHero(p.slug)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${on ? "bg-accent-soft" : "bg-canvas hover:bg-panel"}`}
                  >
                    <span className={`w-5 h-5 rounded-control border flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 ${on ? "bg-ink text-white border-ink" : "border-line text-transparent"}`}>
                      {on ? idx + 1 : "·"}
                    </span>
                    <span className="w-8 h-8 rounded-control flex items-center justify-center text-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: p.card_color ?? "var(--color-panel)" }}>
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        p.emoji ?? "🍼"
                      )}
                    </span>
                    <span className="text-sm font-semibold text-ink truncate">{p.name}</span>
                  </button>
                );
              })}
              {heroProducts.length === 0 && (
                <p className="p-3 text-xs text-ink-muted">Loading products…</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Profile avatars (preset gallery customers pick from) ── */}
      <div className="mt-4 bg-canvas rounded-card border border-line p-5">
        <label className="flex items-center gap-2 font-bold text-ink">
          <span className="text-lg">🖼️</span>
          Profile avatars
        </label>
        <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
          Customers pick one of these on their account page (they can&apos;t upload their own —
          keeps storage lean). Square images look best, ~10 is plenty. Max 5 MB each.
        </p>

        {avatars.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {avatars.map((url) => (
              <div key={url} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-14 h-14 rounded-full object-cover border border-line" />
                <button
                  type="button"
                  onClick={() => removeAvatar(url)}
                  title="Remove avatar"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white text-[10px] font-extrabold leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <input
            ref={avatarFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => avatarFileRef.current?.click()}
            disabled={avatarBusy}
            className="px-4 h-10 rounded-control font-bold text-sm text-accent border-2 border-accent hover:bg-panel disabled:opacity-60 transition-colors"
          >
            {avatarBusy ? "Uploading…" : "+ Upload avatar"}
          </button>
          {avatarError && <span className="text-xs font-semibold text-red-500">{avatarError}</span>}
        </div>
      </div>

      {/* Live preview of the rules */}
      <div className="mt-5 rounded-card bg-accent-soft border border-[#B9D9CF] p-4 text-sm text-accent-deep">
        <p className="font-bold mb-1">Preview</p>
        <p>A <strong>100 ₾</strong> order earns <strong>{Math.floor(100 * settings.pointsPerGel)} points</strong>, and standard shipping is <strong>{100 >= settings.freeShippingThreshold ? "free" : `${settings.standardShippingPrice} ₾ (free from ${settings.freeShippingThreshold} ₾)`}</strong>.</p>
        <p className="mt-1">Express delivery: <strong>{settings.expressEnabled ? `offered at ${settings.expressPrice} ₾` : "hidden (turned off)"}</strong>.</p>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-500">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 h-11 rounded-control font-bold text-white text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm font-bold text-accent">✓ Saved</span>}
      </div>
    </div>
  );
}
