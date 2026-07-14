"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CATEGORY_TEMPLATES as CATEGORY_TEMPLATES_SHARED,
  CANONICAL_COLORS,
  SIZE_GROUPS,
  isValidColorTag,
  isValidSizeTag,
} from "@/lib/catalogTags";

interface Row {
  id: string;
  slug: string;
  name: string;
  name_ka: string | null;
  name_ru: string | null;
  name_tr: string | null;
  price: number;
  category: string;
  stock: number | null;
  emoji: string | null;
  card_color: string | null;
  is_new: boolean | null;
  image_url: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  video_poster_url: string | null;
  discount_percent: number | null;
  discount_ends_at: string | null;
  season: string | null;
  colors: string[] | null;
  sizes: string[] | null;
  size_colors: Record<string, string[]> | null;
  size_prices: Record<string, number> | null;
  stock_by_variant: Record<string, Record<string, number>> | null;
  fabric: string | null;
  description: string | null;
  description_ka: string | null;
  description_ru: string | null;
  description_tr: string | null;
  features: string[] | null;
  material: string | null;
  weight: string | null;
  certification: string | null;
  origin: string | null;
  care_instructions: string[] | null;
}

const CATEGORIES = [
  "body", "blanket", "set", "towel", "romper", "bag",
  "bathrobe", "pajama", "dress", "pants", "outerwear",
  "shoes", "socks", "hat", "bib", "toy", "accessory",
];
const SEASONS = [
  { v: "all", label: "🗓️ All season" },
  { v: "spring", label: "🌸 Spring" },
  { v: "summer", label: "☀️ Summer" },
  { v: "autumn", label: "🍂 Autumn" },
  { v: "winter", label: "❄️ Winter" },
];
const FABRICS = [
  { v: "", label: "— not set —" },
  { v: "cotton", label: "🌿 Cotton" },
  { v: "muslin", label: "🍃 Muslin" },
  { v: "bamboo", label: "🎋 Bamboo" },
  { v: "terry", label: "🛁 Terry (towel)" },
  { v: "fleece", label: "☁️ Fleece" },
  { v: "wool", label: "🐑 Wool" },
  { v: "other", label: "📦 Other" },
];

/** Category → sensible starter sizes/colors/fabric for the add form
 *  (comma-joined for the text inputs; canonical array data lives in
 *  src/lib/catalogTags.ts, the single source of truth). */
const CATEGORY_TEMPLATES: Record<string, { sizes: string; colors: string; fabric: string }> = Object.fromEntries(
  Object.entries(CATEGORY_TEMPLATES_SHARED).map(([cat, tpl]) => [
    cat,
    { sizes: tpl.sizes.join(", "), colors: tpl.colors.join(", "), fabric: tpl.fabric },
  ])
);

const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

async function api(method: string, body?: unknown) {
  const res = await fetch("/api/admin/products", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/* ── tag editor (colors / sizes) ── */
/* ── canonical color chip picker — replaces free-text so colorLabel() can
   always translate + stock_by_variant has a stable key space. Legacy
   non-canonical entries (pre-dating this system) stay editable/removable
   as amber tags so nothing an admin already typed silently vanishes. ── */
function ColorPicker({ colors, onChange }: { colors: string[]; onChange: (next: string[]) => void }) {
  const [combo, setCombo] = useState("");
  const [error, setError] = useState("");
  const legacy = colors.filter((c) => !isValidColorTag(c));

  function toggle(c: string) {
    onChange(colors.includes(c) ? colors.filter((x) => x !== c) : [...colors, c]);
  }
  function addCombo() {
    const v = combo.trim();
    if (!v) return;
    if (!isValidColorTag(v)) { setError("Each part must be a canonical color, e.g. White & Sage"); return; }
    if (!colors.includes(v)) onChange([...colors, v]);
    setCombo(""); setError("");
  }
  return (
    <div>
      <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Colors</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {CANONICAL_COLORS.map((c) => (
          <button
            key={c} type="button" onClick={() => toggle(c)}
            className={`text-xs font-semibold px-2 py-1 rounded-full border-2 transition-colors ${
              colors.includes(c) ? "border-accent bg-accent-soft text-accent-deep" : "border-line text-ink-muted hover:border-accent"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {legacy.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {legacy.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 bg-[#FFF4E5] text-[#8B6914] text-xs font-semibold px-2 py-1 rounded-full">
              {c}
              <button onClick={() => onChange(colors.filter((x) => x !== c))} className="hover:text-red-500 font-bold">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={combo}
          onChange={(e) => { setCombo(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCombo(); } }}
          placeholder="Combo, e.g. White & Sage"
          className="flex-1 h-9 px-3 rounded-lg border border-line text-sm outline-none focus:border-accent"
        />
        <button type="button" onClick={addCombo} className="h-9 px-3 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: "var(--color-accent)" }}>Add</button>
      </div>
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const SIZE_GROUP_LABELS: Record<string, string> = {
  babyMonths: "Age (months)",
  babyYears: "Age (years)",
  ageless: "Standard",
  shoes: "Shoe size",
};

/* ── canonical size chip picker, grouped, + a free "custom dimension" entry
   for towels/blankets (70×140cm etc. can't be enumerated). ── */
function SizePicker({ sizes, onChange }: { sizes: string[]; onChange: (next: string[]) => void }) {
  const [dim, setDim] = useState("");
  const [error, setError] = useState("");
  const legacy = sizes.filter((s) => !isValidSizeTag(s));

  function toggle(s: string) {
    onChange(sizes.includes(s) ? sizes.filter((x) => x !== s) : [...sizes, s]);
  }
  function addDimension() {
    const v = dim.trim();
    if (!v) return;
    if (!isValidSizeTag(v)) { setError("Use a dimension like 70x140cm"); return; }
    if (!sizes.includes(v)) onChange([...sizes, v]);
    setDim(""); setError("");
  }
  return (
    <div>
      <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Sizes</label>
      {Object.entries(SIZE_GROUPS).map(([group, opts]) => (
        <div key={group} className="mb-1.5">
          <p className="text-[9px] font-bold text-[#B0A89E] uppercase mb-1">{SIZE_GROUP_LABELS[group] ?? group}</p>
          <div className="flex flex-wrap gap-1.5">
            {opts.map((s) => (
              <button
                key={s} type="button" onClick={() => toggle(s)}
                className={`text-xs font-semibold px-2 py-1 rounded-full border-2 transition-colors ${
                  sizes.includes(s) ? "border-accent bg-accent-soft text-accent-deep" : "border-line text-ink-muted hover:border-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
      {legacy.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
          {legacy.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 bg-[#FFF4E5] text-[#8B6914] text-xs font-semibold px-2 py-1 rounded-full">
              {s}
              <button onClick={() => onChange(sizes.filter((x) => x !== s))} className="hover:text-red-500 font-bold">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-1.5">
        <input
          value={dim}
          onChange={(e) => { setDim(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDimension(); } }}
          placeholder="Custom dimension, e.g. 70x140cm"
          className="flex-1 h-9 px-3 rounded-lg border border-line text-sm outline-none focus:border-accent"
        />
        <button type="button" onClick={addDimension} className="h-9 px-3 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: "var(--color-accent)" }}>Add</button>
      </div>
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/* ── name/description, per language (blank = falls back to English) ── */
const LANGS = [
  { code: "en" as const, label: "EN", flag: "🇬🇧" },
  { code: "ka" as const, label: "KA", flag: "🇬🇪" },
  { code: "ru" as const, label: "RU", flag: "🇷🇺" },
  { code: "tr" as const, label: "TR", flag: "🇹🇷" },
];
type LangCode = (typeof LANGS)[number]["code"];

function NameDescriptionEditor({ draft, setDraft, save }: {
  draft: Row;
  setDraft: (r: Row) => void;
  save: (patch: Partial<Row>) => void;
}) {
  const [lang, setLang] = useState<LangCode>("en");

  const nameVal =
    lang === "en" ? draft.name : lang === "ka" ? draft.name_ka ?? "" : lang === "ru" ? draft.name_ru ?? "" : draft.name_tr ?? "";
  const descVal =
    lang === "en" ? draft.description ?? "" : lang === "ka" ? draft.description_ka ?? "" : lang === "ru" ? draft.description_ru ?? "" : draft.description_tr ?? "";

  function setName(v: string) {
    if (lang === "en") setDraft({ ...draft, name: v });
    else if (lang === "ka") setDraft({ ...draft, name_ka: v });
    else if (lang === "ru") setDraft({ ...draft, name_ru: v });
    else setDraft({ ...draft, name_tr: v });
  }
  function saveName() {
    if (lang === "en") { if (draft.name.trim()) save({ name: draft.name }); }
    else if (lang === "ka") save({ name_ka: draft.name_ka ?? "" });
    else if (lang === "ru") save({ name_ru: draft.name_ru ?? "" });
    else save({ name_tr: draft.name_tr ?? "" });
  }
  function setDescription(v: string) {
    if (lang === "en") setDraft({ ...draft, description: v });
    else if (lang === "ka") setDraft({ ...draft, description_ka: v });
    else if (lang === "ru") setDraft({ ...draft, description_ru: v });
    else setDraft({ ...draft, description_tr: v });
  }
  function saveDescription() {
    if (lang === "en") save({ description: draft.description ?? "" });
    else if (lang === "ka") save({ description_ka: draft.description_ka ?? "" });
    else if (lang === "ru") save({ description_ru: draft.description_ru ?? "" });
    else save({ description_tr: draft.description_tr ?? "" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
        <label className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Name &amp; Description</label>
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                lang === l.code ? "text-white" : "bg-canvas text-ink-muted hover:text-accent"
              }`}
              style={lang === l.code ? { backgroundColor: "var(--color-accent)" } : undefined}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </div>
      {lang !== "en" && (
        <p className="text-[10px] text-ink-muted mb-1.5">Leave blank to show the English text instead.</p>
      )}
      <input
        value={nameVal}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        placeholder={lang === "en" ? "Product name" : draft.name}
        className="w-full mb-2 px-3 h-9 rounded-lg border border-line text-sm font-semibold outline-none focus:border-accent"
      />
      <textarea
        value={descVal}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={saveDescription}
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-line text-sm outline-none focus:border-accent resize-y"
        placeholder={lang === "en" ? "Product description shown on the detail page…" : (draft.description ?? "")}
      />
    </div>
  );
}

/* ── expandable details panel content (shared by table + card layouts) ── */
function DetailsPanelContent({ draft, setDraft, save, uploadPhoto, busy }: {
  draft: Row;
  setDraft: (r: Row) => void;
  save: (patch: Partial<Row>) => void;
  uploadPhoto: (f: File) => void;
  busy: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const gallery = draft.image_urls ?? (draft.image_url ? [draft.image_url] : []);

  /* ── Product video: signed DIRECT-to-Storage upload (Vercel caps route
     bodies at ~4.5MB, so the file never passes through our API). ── */
  const videoRef = useRef<HTMLInputElement>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState("");

  async function uploadVideo(file: File) {
    setVideoError("");
    if (file.size > 100 * 1024 * 1024) { setVideoError("Video must be under 100MB."); return; }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "mp4" && ext !== "webm") { setVideoError("Only .mp4 / .webm files."); return; }
    setVideoBusy(true);
    try {
      const res = await fetch("/api/admin/video-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: draft.id, ext }),
      });
      const slot = await res.json();
      if (!slot.ok) throw new Error(slot.error || "Could not start the upload");
      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type || `video/${ext}` });
      if (upErr) throw new Error(upErr.message);
      const poster = draft.video_poster_url ?? gallery[0] ?? null;
      setDraft({ ...draft, video_url: slot.publicUrl, video_poster_url: poster });
      await save({ video_url: slot.publicUrl, video_poster_url: poster });
    } catch (e) {
      setVideoError((e as Error).message);
    } finally {
      setVideoBusy(false);
      if (videoRef.current) videoRef.current.value = "";
    }
  }


  function removePhoto(url: string) {
    const next = gallery.filter((u) => u !== url);
    setDraft({ ...draft, image_urls: next, image_url: next[0] ?? null });
    save({ image_urls: next });
  }
  function makePrimary(url: string) {
    const next = [url, ...gallery.filter((u) => u !== url)];
    setDraft({ ...draft, image_urls: next, image_url: next[0] });
    save({ image_urls: next });
  }
  /** Per-(size,color) stock — blank cell = not tracked yet, falls back to the
   *  flat Stock field above. 0 means sold out / not offered for that combo
   *  (this also replaces the old size-availability checkbox: a combo with no
   *  entry is simply available at the fallback count). */
  function setVariantStock(size: string, color: string, raw: string) {
    const n = raw === "" ? null : Math.max(0, Math.round(Number(raw)));
    const nextForSize = { ...(draft.stock_by_variant?.[size] ?? {}) };
    if (n === null || Number.isNaN(n)) delete nextForSize[color];
    else nextForSize[color] = n;
    const nextSBV = { ...(draft.stock_by_variant ?? {}) };
    if (Object.keys(nextForSize).length === 0) delete nextSBV[size];
    else nextSBV[size] = nextForSize;
    setDraft({ ...draft, stock_by_variant: nextSBV });
  }

  return (
    <>
    <div className="grid md:grid-cols-2 gap-6 min-w-0">
      {/* LEFT: photos + season + discount */}
          <div className="space-y-5 min-w-0">
            {/* Gallery */}
            <div>
              <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2">Photos ({gallery.length})</label>
              <div className="flex flex-wrap gap-2">
                {gallery.map((url, i) => (
                  <div key={url} className="relative group w-20 h-20 rounded-control overflow-hidden border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {i === 0 && <span className="absolute top-0.5 left-0.5 bg-accent text-white text-[8px] font-bold px-1 rounded">MAIN</span>}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      {i !== 0 && <button onClick={() => makePrimary(url)} className="text-white text-[9px] font-bold hover:underline">Make main</button>}
                      <button onClick={() => removePhoto(url)} className="text-red-300 text-[9px] font-bold hover:underline">Remove</button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-control border-2 border-dashed border-line flex flex-col items-center justify-center text-ink-muted hover:border-accent hover:text-accent transition-colors"
                >
                  <span className="text-xl">+</span>
                  <span className="text-[9px] font-bold">Add photo</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              </div>
              <p className="text-[10px] text-ink-muted mt-1.5">JPG/PNG/WEBP, max 5MB. First photo is the thumbnail.</p>
            </div>

            {/* Video — Temu-style: poster frame from the gallery + native player */}
            <div>
              <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">🎬 Product video</label>
              {draft.video_url ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={draft.video_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent hover:underline">
                      ▶ Preview video
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({ ...draft, video_url: null, video_poster_url: null });
                        save({ video_url: null, video_poster_url: null });
                      }}
                      className="text-xs font-semibold text-danger hover:underline"
                    >
                      Remove video
                    </button>
                  </div>
                  <p className="text-[10px] text-ink-muted">Cover photo (shown with a ▶ button — pick one of the gallery photos):</p>
                  <div className="flex gap-2 flex-wrap">
                    {gallery.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => { setDraft({ ...draft, video_poster_url: url }); save({ video_poster_url: url }); }}
                        className={`w-12 h-12 rounded-control overflow-hidden border-2 transition-all ${
                          (draft.video_poster_url ?? gallery[0]) === url ? "border-accent" : "border-line opacity-70 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {gallery.length === 0 && <p className="text-[10px] text-ink-muted">Upload photos first — the cover comes from the gallery.</p>}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={videoBusy}
                    onClick={() => videoRef.current?.click()}
                    className="h-9 px-3 rounded-control border border-line text-xs font-bold text-ink-soft hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
                  >
                    {videoBusy ? "Uploading…" : "⬆ Upload video (mp4/webm, max 100MB)"}
                  </button>
                  <input ref={videoRef} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
                  {videoError && <p className="text-[10px] text-danger font-semibold mt-1">{videoError}</p>}
                  <p className="text-[10px] text-ink-muted mt-1">Uploads go straight to Storage (bypasses the server size limit). Run <code className="font-mono">supabase/product-video.sql</code> once before first use.</p>
                </>
              )}
            </div>

            {/* Discount + Season */}
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Discount %</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={0} max={90} step={1}
                    value={draft.discount_percent ?? 0}
                    onChange={(e) => setDraft({ ...draft, discount_percent: Number(e.target.value) })}
                    onBlur={() => save({ discount_percent: draft.discount_percent ?? 0 })}
                    className="w-20 h-9 px-3 rounded-lg border border-line text-sm font-bold outline-none focus:border-accent"
                  />
                  <span className="text-xs text-ink-muted">% off</span>
                </div>
                {(draft.discount_percent ?? 0) > 0 && (
                  <p className="text-[10px] text-[#B85C38] font-bold mt-1">
                    {Math.round(draft.price * (1 - (draft.discount_percent ?? 0) / 100))} ₾ <span className="line-through text-ink-muted font-normal">{draft.price} ₾</span>
                  </p>
                )}
                {(draft.discount_percent ?? 0) > 0 && (
                  <div className="mt-2">
                    <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">Ends on (optional)</label>
                    <input
                      type="date"
                      value={draft.discount_ends_at ? draft.discount_ends_at.slice(0, 10) : ""}
                      onChange={(e) => {
                        const v = e.target.value ? new Date(e.target.value + "T23:59:59").toISOString() : null;
                        setDraft({ ...draft, discount_ends_at: v });
                      }}
                      onBlur={() => save({ discount_ends_at: draft.discount_ends_at ?? null })}
                      className="h-9 px-3 rounded-lg border border-line text-sm font-medium outline-none focus:border-accent"
                    />
                    <p className="text-[10px] text-ink-muted mt-1">Shoppers see “{'{n}'} days left”; discount stops after this day. Blank = no limit.</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Season</label>
                <select
                  value={draft.season ?? "all"}
                  onChange={(e) => { setDraft({ ...draft, season: e.target.value }); save({ season: e.target.value }); }}
                  className="h-9 px-2 rounded-lg border border-line text-sm outline-none focus:border-accent bg-canvas"
                >
                  {SEASONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Fabric</label>
                <select
                  value={draft.fabric ?? ""}
                  onChange={(e) => { setDraft({ ...draft, fabric: e.target.value || null }); save({ fabric: e.target.value }); }}
                  className="h-9 px-2 rounded-lg border border-line text-sm outline-none focus:border-accent bg-canvas"
                >
                  {FABRICS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
                </select>
              </div>
            </div>

            {/* Per-size prices */}
            {(draft.sizes ?? []).length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Price per size</label>
                <p className="text-[10px] text-ink-muted mb-2">Leave blank to use the base price ({draft.price} ₾). The discount still applies on top.</p>
                <div className="space-y-1.5">
                  {(draft.sizes ?? []).map((size) => (
                    <div key={size} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink w-32 truncate">{size}</span>
                      <input
                        type="number" min={0} step={1}
                        value={draft.size_prices?.[size] ?? ""}
                        placeholder={String(draft.price)}
                        onChange={(e) => {
                          const v = e.target.value;
                          const next = { ...(draft.size_prices ?? {}) };
                          if (v === "" || Number(v) <= 0) delete next[size];
                          else next[size] = Number(v);
                          setDraft({ ...draft, size_prices: next });
                        }}
                        onBlur={() => save({ size_prices: draft.size_prices ?? {} })}
                        className="w-24 h-8 px-2 rounded-lg border border-line text-sm font-bold outline-none focus:border-accent"
                      />
                      <span className="text-xs text-ink-muted">₾</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Colors + Sizes — canonical pickers so colorLabel/sizeLabel can
                always translate them and stock_by_variant has stable keys */}
            <ColorPicker colors={draft.colors ?? []} onChange={(next) => { setDraft({ ...draft, colors: next }); save({ colors: next }); }} />
            <SizePicker sizes={draft.sizes ?? []} onChange={(next) => { setDraft({ ...draft, sizes: next }); save({ sizes: next }); }} />
          </div>

          {/* RIGHT: size×color stock matrix + description + features */}
          <div className="space-y-5 min-w-0">
            {/* Per-(size,color) stock */}
            {(draft.sizes ?? []).length > 0 && (draft.colors ?? []).length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Stock per size × color</label>
                <p className="text-[10px] text-ink-muted mb-2">
                  Blank = use the flat Stock number above for that combo. 0 = sold out / not offered in that size.
                </p>
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="text-xs">
                    <thead>
                      <tr className="bg-panel">
                        <th className="p-2 text-left font-bold text-ink">Size</th>
                        {(draft.colors ?? []).map((c) => <th key={c} className="p-2 font-bold text-ink whitespace-nowrap">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(draft.sizes ?? []).map((size) => (
                        <tr key={size} className="border-t border-line">
                          <td className="p-2 font-semibold text-ink whitespace-nowrap">{size}</td>
                          {(draft.colors ?? []).map((c) => (
                            <td key={c} className="p-1 text-center">
                              <input
                                type="number" min={0} step={1}
                                value={draft.stock_by_variant?.[size]?.[c] ?? ""}
                                placeholder="—"
                                onChange={(e) => setVariantStock(size, c, e.target.value)}
                                onBlur={() => save({ stock_by_variant: draft.stock_by_variant ?? {} })}
                                className="w-16 h-8 px-1 rounded-lg border border-line text-xs font-bold text-center outline-none focus:border-accent"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Name & Description — per language (blank = falls back to English) */}
            <NameDescriptionEditor draft={draft} setDraft={setDraft} save={save} />

            {/* Features / highlights */}
            <div>
              <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Highlights (one per line)</label>
              <textarea
                value={(draft.features ?? []).join("\n")}
                onChange={(e) => setDraft({ ...draft, features: e.target.value.split("\n") })}
                onBlur={() => save({ features: (draft.features ?? []).map((f) => f.trim()).filter(Boolean) })}
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm outline-none focus:border-accent resize-y"
                placeholder={"OEKO-TEX certified\nGentle on newborn skin\nMachine washable at 30°C"}
              />
              <p className="text-[10px] text-ink-muted mt-1">Leave empty to show the default highlight list.</p>
            </div>

            {/* Materials & Care tab */}
            <div>
              <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">Materials &amp; Care tab</label>
              <p className="text-[10px] text-ink-muted mb-2">Not every product is cotton — set the real fabric here. Empty fields show the default copy.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                {([
                  { key: "material" as const, ph: "Material — e.g. 100% Muslin" },
                  { key: "weight" as const, ph: "Weight — e.g. 180 GSM" },
                  { key: "certification" as const, ph: "Certification — e.g. OEKO-TEX" },
                  { key: "origin" as const, ph: "Origin — e.g. Made in Georgia" },
                ]).map((f) => (
                  <input
                    key={f.key}
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    onBlur={() => save({ [f.key]: draft[f.key] ?? "" })}
                    placeholder={f.ph}
                    className="h-9 px-3 rounded-lg border border-line text-xs outline-none focus:border-accent"
                  />
                ))}
              </div>
              <textarea
                value={(draft.care_instructions ?? []).join("\n")}
                onChange={(e) => setDraft({ ...draft, care_instructions: e.target.value.split("\n") })}
                onBlur={() => save({ care_instructions: (draft.care_instructions ?? []).map((c) => c.trim()).filter(Boolean) })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-line text-sm outline-none focus:border-accent resize-y"
                placeholder={"Care instructions (one per line)\nMachine wash at 30°C\nDo not bleach"}
              />
            </div>
          </div>
        </div>
      {busy && <p className="text-xs text-ink-muted mt-3">Saving…</p>}
    </>
  );
}

/* ── table-row wrapper for the details panel (desktop) ── */
function DetailsPanel(props: Parameters<typeof DetailsPanelContent>[0]) {
  return (
    <tr className="bg-[#FAF7F4]">
      <td colSpan={8} className="p-5">
        <DetailsPanelContent {...props} />
      </td>
    </tr>
  );
}

/* ── one editable row (variant: desktop table row, or mobile card) ── */
function ProductRow({ row, onChanged, onDeleted, variant }: { row: Row; onChanged: (r: Row) => void; onDeleted: (id: string) => void; variant: "table" | "card" }) {
  const [draft, setDraft] = useState(row);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Map draft (snake_case) fields to the API's expected keys.
  async function save(patch: Partial<Row>) {
    setBusy(true);
    const next = { ...draft, ...patch };
    setDraft(next);
    const payload: Record<string, unknown> = { id: row.id };
    if ("name" in patch) payload.name = next.name;
    if ("name_ka" in patch) payload.nameKa = next.name_ka ?? "";
    if ("name_ru" in patch) payload.nameRu = next.name_ru ?? "";
    if ("name_tr" in patch) payload.nameTr = next.name_tr ?? "";
    if ("description_ka" in patch) payload.descriptionKa = next.description_ka ?? "";
    if ("description_ru" in patch) payload.descriptionRu = next.description_ru ?? "";
    if ("description_tr" in patch) payload.descriptionTr = next.description_tr ?? "";
    if ("price" in patch) payload.price = next.price;
    if ("category" in patch) payload.category = next.category;
    if ("stock" in patch) payload.stock = next.stock;
    if ("is_new" in patch) payload.isNew = next.is_new;
    if ("discount_percent" in patch) payload.discountPercent = next.discount_percent ?? 0;
    if ("discount_ends_at" in patch) payload.discountEndsAt = next.discount_ends_at ?? null;
    if ("season" in patch) payload.season = next.season;
    if ("colors" in patch) payload.colors = next.colors;
    if ("sizes" in patch) payload.sizes = next.sizes;
    if ("size_colors" in patch) payload.sizeColors = next.size_colors;
    if ("stock_by_variant" in patch) payload.stockByVariant = next.stock_by_variant ?? {};
    if ("size_prices" in patch) payload.sizePrices = next.size_prices ?? {};
    if ("fabric" in patch) payload.fabric = next.fabric ?? "";
    if ("description" in patch) payload.description = next.description;
    if ("features" in patch) payload.features = next.features;
    if ("material" in patch) payload.material = next.material ?? "";
    if ("weight" in patch) payload.weight = next.weight ?? "";
    if ("certification" in patch) payload.certification = next.certification ?? "";
    if ("origin" in patch) payload.origin = next.origin ?? "";
    if ("care_instructions" in patch) payload.careInstructions = next.care_instructions ?? [];
    if ("image_urls" in patch) payload.imageUrls = next.image_urls;
    if ("video_url" in patch) payload.videoUrl = next.video_url ?? null;
    if ("video_poster_url" in patch) payload.videoPosterUrl = next.video_poster_url ?? null;
    const res = await api("PATCH", payload);
    setBusy(false);
    if (res.ok) { setSaved(true); onChanged(next); setTimeout(() => setSaved(false), 1500); }
    else alert(res.error || "Save failed");
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("productId", row.id);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (data.ok) { const next = { ...draft, image_urls: data.imageUrls, image_url: data.imageUrls?.[0] ?? data.imageUrl }; setDraft(next); onChanged(next); }
    else alert(data.error || "Upload failed");
  }

  async function remove() {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/products?id=${row.id}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (data.ok) onDeleted(row.id);
    else alert(data.error || "Delete failed");
  }

  const primary = draft.image_url ?? draft.image_urls?.[0];
  const discounted = (draft.discount_percent ?? 0) > 0;

  const photoButton = (
    <button
      onClick={() => fileRef.current?.click()}
      title="Upload photo"
      className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl overflow-hidden border border-line hover:ring-2 hover:ring-accent transition-all flex-shrink-0"
      style={{ backgroundColor: draft.card_color ?? "#EAE4DC" }}
    >
      {primary ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={primary} alt={draft.name} className="w-full h-full object-cover" />
      ) : (draft.emoji ?? "🍼")}
    </button>
  );
  const fileInput = <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />;
  const newToggle = (
    <button
      onClick={() => save({ is_new: !draft.is_new })}
      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${draft.is_new ? "bg-accent" : "bg-line"}`}
      title="Pin as new arrival"
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-canvas transition-transform ${draft.is_new ? "translate-x-4" : ""}`} />
    </button>
  );

  if (variant === "card") {
    return (
      <div className={`bg-canvas rounded-card border border-line overflow-hidden ${busy ? "opacity-60" : ""}`}>
        <div className="p-3 flex items-start gap-3">
          {photoButton}
          {fileInput}
          <div className="flex-1 min-w-0">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onBlur={() => draft.name !== row.name && save({ name: draft.name })}
              className="w-full px-2 py-1 -mx-2 rounded-lg border border-transparent hover:border-line focus:border-accent outline-none text-sm font-bold text-ink bg-transparent"
            />
            <p className="text-[10px] text-ink-muted font-mono px-2">#{row.id} · {draft.slug}</p>
            <div className="flex items-center gap-2 flex-wrap px-2 mt-1">
              <select
                value={draft.category}
                onChange={(e) => save({ category: e.target.value })}
                className="px-2 py-1 rounded-lg border border-line text-xs font-semibold text-ink bg-canvas outline-none focus:border-accent"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                {newToggle}
                <span className="text-[10px] font-semibold text-ink-muted">New</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-1">Price</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min={0} step={1}
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                onBlur={() => draft.price !== row.price && save({ price: draft.price })}
                className="w-full px-2 py-1.5 rounded-lg border border-line text-sm font-bold text-ink outline-none focus:border-accent"
              />
              <span className="text-xs text-ink-muted">₾</span>
            </div>
            {discounted && (
              <span className="text-[10px] font-bold text-[#B85C38]">−{draft.discount_percent}% → {Math.round(draft.price * (1 - (draft.discount_percent ?? 0) / 100))} ₾</span>
            )}
          </div>
          <div>
            <label className="block text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-1">Stock</label>
            <input
              type="number" min={0} step={1}
              value={draft.stock ?? 0}
              onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
              onBlur={() => draft.stock !== row.stock && save({ stock: draft.stock })}
              className={`w-full px-2 py-1.5 rounded-lg border text-sm font-bold outline-none focus:border-accent ${
                (draft.stock ?? 0) <= 5 ? "border-orange-300 text-orange-600 bg-orange-50" : "border-line text-ink"
              }`}
            />
          </div>
        </div>

        <div className="px-3 pb-3 flex items-center gap-4 border-t border-canvas pt-2.5">
          <button onClick={() => setOpen((v) => !v)} className="text-xs font-bold text-accent hover:underline">
            {open ? "Close ▴" : "Edit ▾"}
          </button>
          <span className={`text-xs font-bold text-accent transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>✓ Saved</span>
          <button onClick={remove} className="text-xs font-bold text-danger hover:underline ml-auto">Delete</button>
        </div>

        {open && (
          <div className="border-t border-canvas bg-[#FAF7F4] p-4">
            <DetailsPanelContent draft={draft} setDraft={setDraft} save={save} uploadPhoto={uploadPhoto} busy={busy} />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <tr className={`border-b border-canvas ${busy ? "opacity-60" : ""}`}>
        {/* Photo */}
        <td className="p-2">
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload photo"
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl overflow-hidden border border-line hover:ring-2 hover:ring-accent transition-all"
            style={{ backgroundColor: draft.card_color ?? "#EAE4DC" }}
          >
            {primary ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={primary} alt={draft.name} className="w-full h-full object-cover" />
            ) : (draft.emoji ?? "🍼")}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
        </td>

        {/* Name */}
        <td className="p-2 min-w-[180px]">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onBlur={() => draft.name !== row.name && save({ name: draft.name })}
            className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-line focus:border-accent outline-none text-sm font-semibold text-ink bg-transparent"
          />
          <span className="text-[10px] text-ink-muted font-mono px-2">#{row.id} · {draft.slug}</span>
        </td>

        {/* Category */}
        <td className="p-2">
          <select
            value={draft.category}
            onChange={(e) => save({ category: e.target.value })}
            className="px-2 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink bg-canvas outline-none focus:border-accent"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </td>

        {/* Price */}
        <td className="p-2">
          <div className="flex items-center gap-1">
            <input
              type="number" min={0} step={1}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              onBlur={() => draft.price !== row.price && save({ price: draft.price })}
              className="w-20 px-2 py-1.5 rounded-lg border border-line text-sm font-bold text-ink outline-none focus:border-accent"
            />
            <span className="text-xs text-ink-muted">₾</span>
          </div>
          {discounted && (
            <span className="text-[10px] font-bold text-[#B85C38]">−{draft.discount_percent}% → {Math.round(draft.price * (1 - (draft.discount_percent ?? 0) / 100))} ₾</span>
          )}
        </td>

        {/* Stock */}
        <td className="p-2">
          <input
            type="number" min={0} step={1}
            value={draft.stock ?? 0}
            onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
            onBlur={() => draft.stock !== row.stock && save({ stock: draft.stock })}
            className={`w-16 px-2 py-1.5 rounded-lg border text-sm font-bold outline-none focus:border-accent ${
              (draft.stock ?? 0) <= 5 ? "border-orange-300 text-orange-600 bg-orange-50" : "border-line text-ink"
            }`}
          />
        </td>

        {/* New toggle */}
        <td className="p-2 text-center">
          <button
            onClick={() => save({ is_new: !draft.is_new })}
            className={`w-10 h-6 rounded-full transition-colors relative ${draft.is_new ? "bg-accent" : "bg-line"}`}
            title="Pin as new arrival"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-canvas transition-transform ${draft.is_new ? "translate-x-4" : ""}`} />
          </button>
        </td>

        {/* Actions */}
        <td className="p-2 whitespace-nowrap">
          <button onClick={() => setOpen((v) => !v)} className="text-xs font-bold text-accent hover:underline mr-3">
            {open ? "Close ▴" : "Edit ▾"}
          </button>
          <span className={`text-xs font-bold text-accent mr-2 transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>✓</span>
          <button onClick={remove} className="text-xs font-bold text-danger hover:underline">Delete</button>
        </td>
      </tr>
      {open && <DetailsPanel draft={draft} setDraft={setDraft} save={save} uploadPhoto={uploadPhoto} busy={busy} />}
    </>
  );
}

/* ── add-product form (with photo, category-aware template) ── */
function AddProduct({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("body");
  const [stock, setStock] = useState("10");
  const [sizes, setSizes] = useState(CATEGORY_TEMPLATES.body.sizes);
  const [colors, setColors] = useState(CATEGORY_TEMPLATES.body.colors);
  const [fabric, setFabric] = useState(CATEGORY_TEMPLATES.body.fabric);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Picking a category pre-fills sizes/colors/fabric with a sensible template
     (fully editable — e.g. towel sizes instead of month sizes). */
  function pickCategory(cat: string) {
    setCategory(cat);
    const tpl = CATEGORY_TEMPLATES[cat];
    if (tpl) { setSizes(tpl.sizes); setColors(tpl.colors); setFabric(tpl.fabric); }
  }

  async function create() {
    if (!name.trim() || !price) { alert("Name and price are required"); return; }
    setBusy(true);
    const res = await api("POST", {
      name,
      price: Number(price),
      category,
      stock: Number(stock),
      sizes: splitList(sizes),
      colors: splitList(colors),
      fabric,
    });
    if (res.ok && file) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("productId", res.id);
      await fetch("/api/admin/upload", { method: "POST", body: fd }).catch(() => {});
    }
    setBusy(false);
    if (res.ok) {
      setName(""); setPrice(""); setStock("10"); setFile(null);
      const tpl = CATEGORY_TEMPLATES[category];
      if (tpl) { setSizes(tpl.sizes); setColors(tpl.colors); setFabric(tpl.fabric); }
      setOpen(false); onCreated();
    }
    else alert(res.error || "Create failed");
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-control font-bold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--color-accent)" }}>
        + Add product
      </button>
    );
  }
  return (
    <div className="bg-canvas rounded-card border border-line p-4 flex flex-wrap items-end gap-3">
      {/* Photo */}
      <div>
        <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Photo</label>
        <button onClick={() => fileRef.current?.click()} className="w-14 h-14 rounded-lg border-2 border-dashed border-line flex items-center justify-center overflow-hidden hover:border-accent">
          {file ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
          ) : <span className="text-xl text-ink-muted">📷</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="flex-1 min-w-[140px]"><label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 h-10 rounded-lg border border-line text-sm outline-none focus:border-accent" placeholder="Product name" /></div>
      <div><label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Category</label>
        <select value={category} onChange={(e) => pickCategory(e.target.value)} className="h-10 px-2 rounded-lg border border-line text-sm outline-none focus:border-accent bg-canvas">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
      <div><label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Fabric</label>
        <select value={fabric} onChange={(e) => setFabric(e.target.value)} className="h-10 px-2 rounded-lg border border-line text-sm outline-none focus:border-accent bg-canvas">
          {FABRICS.filter((f) => f.v).map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}</select></div>
      <div><label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Price ₾</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 h-10 px-3 rounded-lg border border-line text-sm outline-none focus:border-accent" placeholder="0" /></div>
      <div><label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Stock</label>
        <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-20 h-10 px-3 rounded-lg border border-line text-sm outline-none focus:border-accent" /></div>
      <div className="w-full grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Sizes (comma separated)</label>
          <input value={sizes} onChange={(e) => setSizes(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-line text-xs outline-none focus:border-accent" placeholder="e.g. 70×70 cm, 90×90 cm" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Colors (comma separated)</label>
          <input value={colors} onChange={(e) => setColors(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-line text-xs outline-none focus:border-accent" placeholder="e.g. White, Cream" />
        </div>
      </div>
      <button onClick={create} disabled={busy} className="h-10 px-4 rounded-lg font-bold text-white text-sm disabled:opacity-60" style={{ backgroundColor: "var(--color-accent)" }}>{busy ? "…" : "Create"}</button>
      <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg font-bold text-ink-soft text-sm border border-line">Cancel</button>
      <p className="w-full text-[11px] text-ink-muted">Sizes, colors &amp; fabric are pre-filled from the category — edit freely. Per-size prices, discount &amp; more photos: row&apos;s <strong>Edit</strong> button after creating.</p>
    </div>
  );
}

export default function ProductsClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  function load() {
    fetch("/api/admin/products").then((r) => r.json()).then((d) => d.error ? setError(d.error) : setRows(d.products)).catch(() => setError("Could not load"));
  }
  useEffect(load, []);

  if (error) return <p className="text-red-500 font-semibold">{error}</p>;
  if (!rows) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;

  const filtered = q.trim() ? rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.id.includes(q)) : rows;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="text-2xl font-extrabold text-ink">Products</h1>
        <AddProduct onCreated={load} />
      </div>
      <p className="text-ink-muted text-sm mb-5">{rows.length} products · edit inline or open <strong>Edit ▾</strong> for photos, discount, colors, sizes &amp; more — everything saves automatically</p>

      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
        className="w-full sm:w-72 h-10 px-4 mb-4 rounded-control border border-line text-sm outline-none focus:border-accent"
      />

      {/* Desktop: dense inline-editable table */}
      <div className="hidden sm:block bg-canvas rounded-card border border-line overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-bold text-ink-muted uppercase tracking-widest">
              <th className="p-2">Photo</th><th className="p-2">Name</th><th className="p-2">Category</th>
              <th className="p-2">Price</th><th className="p-2">Stock</th><th className="p-2 text-center">New</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <ProductRow key={r.id} row={r} variant="table"
                onChanged={(nr) => setRows((prev) => prev!.map((x) => x.id === nr.id ? nr : x))}
                onDeleted={(id) => setRows((prev) => prev!.filter((x) => x.id !== id))} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-ink-muted">No products match &ldquo;{q}&rdquo;.</p>}
      </div>

      {/* Mobile: stacked cards — no horizontal table scrolling */}
      <div className="sm:hidden space-y-3">
        {filtered.map((r) => (
          <ProductRow key={r.id} row={r} variant="card"
            onChanged={(nr) => setRows((prev) => prev!.map((x) => x.id === nr.id ? nr : x))}
            onDeleted={(id) => setRows((prev) => prev!.filter((x) => x.id !== id))} />
        ))}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-ink-muted bg-canvas rounded-card border border-line">No products match &ldquo;{q}&rdquo;.</p>}
      </div>
    </div>
  );
}
