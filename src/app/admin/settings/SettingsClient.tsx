"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/settings";

interface Field {
  key: Exclude<keyof StoreSettings, "expressEnabled">;
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

export default function SettingsClient() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [seeded, setSeeded] = useState(true);

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
    return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-[#5E9E8C] border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#2A2320] mb-1">Settings</h1>
      <p className="text-[#9A8E88] text-sm mb-6">Store-wide rules that apply everywhere on the site.</p>

      {!seeded && (
        <div className="mb-5 rounded-xl bg-[#FFF4E5] border border-[#F0C85A] px-4 py-3 text-sm text-[#8B6914]">
          ⚠️ The <code className="font-mono">settings</code> table isn&apos;t set up yet. Run <code className="font-mono">supabase/features.sql</code> in the SQL Editor. Saving will still work once the table exists.
        </div>
      )}

      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="bg-white rounded-2xl border border-[#DDD5CC] p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <label className="flex items-center gap-2 font-bold text-[#2A2320]">
                  <span className="text-lg">{f.icon}</span>
                  {f.label}
                </label>
                <p className="text-xs text-[#9A8E88] mt-1.5 leading-relaxed">{f.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings[f.key]}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  onChange={(e) => setSettings((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
                  className="w-28 h-11 px-3 rounded-xl border border-[#DDD5CC] text-lg font-extrabold text-[#2A2320] outline-none focus:border-[#5E9E8C] text-right"
                />
                <span className="text-xs font-semibold text-[#9A8E88] w-16">{f.suffix}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Express Delivery: on/off toggle + price ── */}
      <div className="mt-4 bg-white rounded-2xl border border-[#DDD5CC] p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="flex items-center gap-2 font-bold text-[#2A2320]">
              <span className="text-lg">⚡</span>
              Express Delivery
            </label>
            <p className="text-xs text-[#9A8E88] mt-1.5 leading-relaxed">
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
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${settings.expressEnabled ? "" : "bg-[#DDD5CC]"}`}
              style={settings.expressEnabled ? { backgroundColor: "#5E9E8C" } : {}}
              aria-label="Toggle Express Delivery"
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.expressEnabled ? "translate-x-5" : ""}`} />
            </button>
            <span className={`text-xs font-bold w-8 ${settings.expressEnabled ? "text-[#5E9E8C]" : "text-[#9A8E88]"}`}>
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
                className="w-24 h-11 px-3 rounded-xl border border-[#DDD5CC] text-lg font-extrabold text-[#2A2320] outline-none focus:border-[#5E9E8C] text-right disabled:opacity-40 disabled:bg-[#F5F0EB]"
              />
              <span className="text-xs font-semibold text-[#9A8E88]">₾</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile avatars (preset gallery customers pick from) ── */}
      <div className="mt-4 bg-white rounded-2xl border border-[#DDD5CC] p-5">
        <label className="flex items-center gap-2 font-bold text-[#2A2320]">
          <span className="text-lg">🖼️</span>
          Profile avatars
        </label>
        <p className="text-xs text-[#9A8E88] mt-1.5 leading-relaxed">
          Customers pick one of these on their account page (they can&apos;t upload their own —
          keeps storage lean). Square images look best, ~10 is plenty. Max 5 MB each.
        </p>

        {avatars.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {avatars.map((url) => (
              <div key={url} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-14 h-14 rounded-full object-cover border border-[#DDD5CC]" />
                <button
                  type="button"
                  onClick={() => removeAvatar(url)}
                  title="Remove avatar"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#B03A3A] text-white text-[10px] font-extrabold leading-none opacity-0 group-hover:opacity-100 transition-opacity"
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
            className="px-4 h-10 rounded-xl font-bold text-sm text-[#5E9E8C] border-2 border-[#5E9E8C] hover:bg-[#EAF2F0] disabled:opacity-60 transition-colors"
          >
            {avatarBusy ? "Uploading…" : "+ Upload avatar"}
          </button>
          {avatarError && <span className="text-xs font-semibold text-red-500">{avatarError}</span>}
        </div>
      </div>

      {/* Live preview of the rules */}
      <div className="mt-5 rounded-2xl bg-[#EAF2F0] border border-[#B9D9CF] p-4 text-sm text-[#3A6B5E]">
        <p className="font-bold mb-1">Preview</p>
        <p>A <strong>100 ₾</strong> order earns <strong>{Math.floor(100 * settings.pointsPerGel)} points</strong>, and standard shipping is <strong>{100 >= settings.freeShippingThreshold ? "free" : `${settings.standardShippingPrice} ₾ (free from ${settings.freeShippingThreshold} ₾)`}</strong>.</p>
        <p className="mt-1">Express delivery: <strong>{settings.expressEnabled ? `offered at ${settings.expressPrice} ₾` : "hidden (turned off)"}</strong>.</p>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-500">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 h-11 rounded-xl font-bold text-white text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#5E9E8C" }}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm font-bold text-[#5E9E8C]">✓ Saved</span>}
      </div>
    </div>
  );
}
