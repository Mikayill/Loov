"use client";

import { useEffect, useRef, useState } from "react";

interface Row {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
  stock: number | null;
  emoji: string | null;
  card_color: string | null;
  is_new: boolean | null;
  image_url: string | null;
  image_urls: string[] | null;
  discount_percent: number | null;
  season: string | null;
  colors: string[] | null;
  sizes: string[] | null;
  size_colors: Record<string, string[]> | null;
  size_prices: Record<string, number> | null;
  fabric: string | null;
  description: string | null;
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

/** Category → sensible starter sizes/colors/fabric for the add form. */
const CATEGORY_TEMPLATES: Record<string, { sizes: string; colors: string; fabric: string }> = {
  body:    { sizes: "0-3 Months, 3-6 Months, 6-9 Months, 9-12 Months",                colors: "White, Beige, Sage",       fabric: "cotton" },
  romper:  { sizes: "0-3 Months, 3-6 Months, 6-9 Months, 9-12 Months, 12-18 Months",  colors: "Beige, Sage, Blue",        fabric: "cotton" },
  towel:   { sizes: "70×70 cm, 90×90 cm",                                             colors: "White, Cream, Sand",       fabric: "terry" },
  blanket: { sizes: "120×120 cm",                                                     colors: "White & Sage, White & Sand", fabric: "muslin" },
  set:     { sizes: "0-1 Month, 1-3 Months",                                          colors: "White, Sage, Sand",        fabric: "cotton" },
  bag:     { sizes: "One Size",                                                       colors: "Sand, Cream",              fabric: "other" },
  bathrobe:{ sizes: "0-1 Year, 1-2 Years, 2-3 Years",                                 colors: "White, Cream, Sage",       fabric: "terry" },
  pajama:  { sizes: "6-12 Months, 12-18 Months, 18-24 Months",                        colors: "Sage, Cream, Lavender",    fabric: "cotton" },
  dress:   { sizes: "3-6 Months, 6-12 Months, 12-18 Months",                          colors: "White, Lavender, Sand",    fabric: "cotton" },
  pants:   { sizes: "0-3 Months, 3-6 Months, 6-12 Months, 12-18 Months",              colors: "Beige, Sage, Blue",        fabric: "cotton" },
  outerwear:{ sizes: "6-12 Months, 12-18 Months, 18-24 Months",                       colors: "Sand, Sage, Blue",         fabric: "fleece" },
  shoes:   { sizes: "16, 17, 18, 19, 20",                                             colors: "White, Sand, Blue",        fabric: "other" },
  socks:   { sizes: "0-6 Months, 6-12 Months, 1-2 Years",                             colors: "White, Sage, Beige",       fabric: "cotton" },
  hat:     { sizes: "0-6 Months, 6-12 Months, 1-2 Years",                             colors: "White, Sage, Sand",        fabric: "cotton" },
  bib:     { sizes: "One Size",                                                       colors: "White, Cream, Mint",       fabric: "muslin" },
  toy:     { sizes: "One Size",                                                       colors: "Cream, Sage, Sand",        fabric: "other" },
  accessory:{ sizes: "One Size",                                                      colors: "White, Sand",              fabric: "other" },
};

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
function TagInput({ label, tags, onChange, placeholder }: { label: string; tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  }
  return (
    <div>
      <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 bg-[#EAF2F0] text-[#3A6B5E] text-xs font-semibold px-2 py-1 rounded-full">
            {t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="text-[#5E9E8C] hover:text-red-500 font-bold">×</button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-[#9A8E88]">None yet</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 h-9 px-3 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C]"
        />
        <button onClick={add} className="h-9 px-3 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: "#5E9E8C" }}>Add</button>
      </div>
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
  function toggleSizeColor(size: string, color: string) {
    const cur = draft.size_colors?.[size] ?? draft.colors ?? [];
    const has = cur.includes(color);
    const nextList = has ? cur.filter((c) => c !== color) : [...cur, color];
    const ordered = (draft.colors ?? []).filter((c) => nextList.includes(c));
    const nextSC = { ...(draft.size_colors ?? {}), [size]: ordered };
    setDraft({ ...draft, size_colors: nextSC });
    save({ size_colors: nextSC });
  }

  return (
    <>
    <div className="grid md:grid-cols-2 gap-6">
      {/* LEFT: photos + season + discount */}
          <div className="space-y-5">
            {/* Gallery */}
            <div>
              <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-2">Photos ({gallery.length})</label>
              <div className="flex flex-wrap gap-2">
                {gallery.map((url, i) => (
                  <div key={url} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-[#DDD5CC]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {i === 0 && <span className="absolute top-0.5 left-0.5 bg-[#5E9E8C] text-white text-[8px] font-bold px-1 rounded">MAIN</span>}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      {i !== 0 && <button onClick={() => makePrimary(url)} className="text-white text-[9px] font-bold hover:underline">Make main</button>}
                      <button onClick={() => removePhoto(url)} className="text-red-300 text-[9px] font-bold hover:underline">Remove</button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-[#DDD5CC] flex flex-col items-center justify-center text-[#9A8E88] hover:border-[#5E9E8C] hover:text-[#5E9E8C] transition-colors"
                >
                  <span className="text-xl">+</span>
                  <span className="text-[9px] font-bold">Add photo</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              </div>
              <p className="text-[10px] text-[#9A8E88] mt-1.5">JPG/PNG/WEBP, max 5MB. First photo is the thumbnail.</p>
            </div>

            {/* Discount + Season */}
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1.5">Discount %</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={0} max={90} step={1}
                    value={draft.discount_percent ?? 0}
                    onChange={(e) => setDraft({ ...draft, discount_percent: Number(e.target.value) })}
                    onBlur={() => save({ discount_percent: draft.discount_percent ?? 0 })}
                    className="w-20 h-9 px-3 rounded-lg border border-[#DDD5CC] text-sm font-bold outline-none focus:border-[#5E9E8C]"
                  />
                  <span className="text-xs text-[#9A8E88]">% off</span>
                </div>
                {(draft.discount_percent ?? 0) > 0 && (
                  <p className="text-[10px] text-[#B85C38] font-bold mt-1">
                    {Math.round(draft.price * (1 - (draft.discount_percent ?? 0) / 100))} ₾ <span className="line-through text-[#9A8E88] font-normal">{draft.price} ₾</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1.5">Season</label>
                <select
                  value={draft.season ?? "all"}
                  onChange={(e) => { setDraft({ ...draft, season: e.target.value }); save({ season: e.target.value }); }}
                  className="h-9 px-2 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C] bg-white"
                >
                  {SEASONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1.5">Fabric</label>
                <select
                  value={draft.fabric ?? ""}
                  onChange={(e) => { setDraft({ ...draft, fabric: e.target.value || null }); save({ fabric: e.target.value }); }}
                  className="h-9 px-2 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C] bg-white"
                >
                  {FABRICS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
                </select>
              </div>
            </div>

            {/* Per-size prices */}
            {(draft.sizes ?? []).length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1.5">Price per size</label>
                <p className="text-[10px] text-[#9A8E88] mb-2">Leave blank to use the base price ({draft.price} ₾). The discount still applies on top.</p>
                <div className="space-y-1.5">
                  {(draft.sizes ?? []).map((size) => (
                    <div key={size} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#2A2320] w-32 truncate">{size}</span>
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
                        className="w-24 h-8 px-2 rounded-lg border border-[#DDD5CC] text-sm font-bold outline-none focus:border-[#5E9E8C]"
                      />
                      <span className="text-xs text-[#9A8E88]">₾</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Colors + Sizes */}
            <TagInput label="Colors" tags={draft.colors ?? []} placeholder="e.g. White, Sage…" onChange={(t) => { setDraft({ ...draft, colors: t }); save({ colors: t }); }} />
            <TagInput label="Sizes" tags={draft.sizes ?? []} placeholder="e.g. 0-3 Months…" onChange={(t) => { setDraft({ ...draft, sizes: t }); save({ sizes: t }); }} />
          </div>

          {/* RIGHT: size×color matrix + description + features */}
          <div className="space-y-5">
            {/* Per-size color availability */}
            {(draft.sizes ?? []).length > 0 && (draft.colors ?? []).length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1.5">Which colors exist per size</label>
                <p className="text-[10px] text-[#9A8E88] mb-2">Untick a color if that size doesn&apos;t come in it (e.g. 0-3 Months has no Red).</p>
                <div className="overflow-x-auto rounded-lg border border-[#DDD5CC]">
                  <table className="text-xs">
                    <thead>
                      <tr className="bg-[#EDE5D8]">
                        <th className="p-2 text-left font-bold text-[#2A2320]">Size</th>
                        {(draft.colors ?? []).map((c) => <th key={c} className="p-2 font-bold text-[#2A2320] whitespace-nowrap">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {(draft.sizes ?? []).map((size) => {
                        const avail = draft.size_colors?.[size] ?? draft.colors ?? [];
                        return (
                          <tr key={size} className="border-t border-[#DDD5CC]">
                            <td className="p-2 font-semibold text-[#2A2320] whitespace-nowrap">{size}</td>
                            {(draft.colors ?? []).map((c) => (
                              <td key={c} className="p-2 text-center">
                                <input type="checkbox" checked={avail.includes(c)} onChange={() => toggleSizeColor(size, c)} className="w-4 h-4 accent-[#5E9E8C] cursor-pointer" />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1.5">Description</label>
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                onBlur={() => save({ description: draft.description ?? "" })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C] resize-y"
                placeholder="Product description shown on the detail page…"
              />
            </div>

            {/* Features / highlights */}
            <div>
              <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1.5">Highlights (one per line)</label>
              <textarea
                value={(draft.features ?? []).join("\n")}
                onChange={(e) => setDraft({ ...draft, features: e.target.value.split("\n") })}
                onBlur={() => save({ features: (draft.features ?? []).map((f) => f.trim()).filter(Boolean) })}
                rows={5}
                className="w-full px-3 py-2 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C] resize-y"
                placeholder={"OEKO-TEX certified\nGentle on newborn skin\nMachine washable at 30°C"}
              />
              <p className="text-[10px] text-[#9A8E88] mt-1">Leave empty to show the default highlight list.</p>
            </div>

            {/* Materials & Care tab */}
            <div>
              <label className="block text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1.5">Materials &amp; Care tab</label>
              <p className="text-[10px] text-[#9A8E88] mb-2">Not every product is cotton — set the real fabric here. Empty fields show the default copy.</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
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
                    className="h-9 px-3 rounded-lg border border-[#DDD5CC] text-xs outline-none focus:border-[#5E9E8C]"
                  />
                ))}
              </div>
              <textarea
                value={(draft.care_instructions ?? []).join("\n")}
                onChange={(e) => setDraft({ ...draft, care_instructions: e.target.value.split("\n") })}
                onBlur={() => save({ care_instructions: (draft.care_instructions ?? []).map((c) => c.trim()).filter(Boolean) })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C] resize-y"
                placeholder={"Care instructions (one per line)\nMachine wash at 30°C\nDo not bleach"}
              />
            </div>
          </div>
        </div>
      {busy && <p className="text-xs text-[#9A8E88] mt-3">Saving…</p>}
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
    if ("price" in patch) payload.price = next.price;
    if ("category" in patch) payload.category = next.category;
    if ("stock" in patch) payload.stock = next.stock;
    if ("is_new" in patch) payload.isNew = next.is_new;
    if ("discount_percent" in patch) payload.discountPercent = next.discount_percent ?? 0;
    if ("season" in patch) payload.season = next.season;
    if ("colors" in patch) payload.colors = next.colors;
    if ("sizes" in patch) payload.sizes = next.sizes;
    if ("size_colors" in patch) payload.sizeColors = next.size_colors;
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
      className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl overflow-hidden border border-[#DDD5CC] hover:ring-2 hover:ring-[#5E9E8C] transition-all flex-shrink-0"
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
      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${draft.is_new ? "bg-[#5E9E8C]" : "bg-[#DDD5CC]"}`}
      title="Pin as new arrival"
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${draft.is_new ? "translate-x-4" : ""}`} />
    </button>
  );

  if (variant === "card") {
    return (
      <div className={`bg-white rounded-2xl border border-[#DDD5CC] overflow-hidden ${busy ? "opacity-60" : ""}`}>
        <div className="p-3 flex items-start gap-3">
          {photoButton}
          {fileInput}
          <div className="flex-1 min-w-0">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onBlur={() => draft.name !== row.name && save({ name: draft.name })}
              className="w-full px-2 py-1 -mx-2 rounded-lg border border-transparent hover:border-[#DDD5CC] focus:border-[#5E9E8C] outline-none text-sm font-bold text-[#2A2320] bg-transparent"
            />
            <p className="text-[10px] text-[#9A8E88] font-mono px-2">#{row.id} · {draft.slug}</p>
            <div className="flex items-center gap-2 flex-wrap px-2 mt-1">
              <select
                value={draft.category}
                onChange={(e) => save({ category: e.target.value })}
                className="px-2 py-1 rounded-lg border border-[#DDD5CC] text-xs font-semibold text-[#2A2320] bg-white outline-none focus:border-[#5E9E8C]"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                {newToggle}
                <span className="text-[10px] font-semibold text-[#9A8E88]">New</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1">Price</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min={0} step={1}
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                onBlur={() => draft.price !== row.price && save({ price: draft.price })}
                className="w-full px-2 py-1.5 rounded-lg border border-[#DDD5CC] text-sm font-bold text-[#2A2320] outline-none focus:border-[#5E9E8C]"
              />
              <span className="text-xs text-[#9A8E88]">₾</span>
            </div>
            {discounted && (
              <span className="text-[10px] font-bold text-[#B85C38]">−{draft.discount_percent}% → {Math.round(draft.price * (1 - (draft.discount_percent ?? 0) / 100))} ₾</span>
            )}
          </div>
          <div>
            <label className="block text-[9px] font-bold text-[#9A8E88] uppercase tracking-widest mb-1">Stock</label>
            <input
              type="number" min={0} step={1}
              value={draft.stock ?? 0}
              onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
              onBlur={() => draft.stock !== row.stock && save({ stock: draft.stock })}
              className={`w-full px-2 py-1.5 rounded-lg border text-sm font-bold outline-none focus:border-[#5E9E8C] ${
                (draft.stock ?? 0) <= 5 ? "border-orange-300 text-orange-600 bg-orange-50" : "border-[#DDD5CC] text-[#2A2320]"
              }`}
            />
          </div>
        </div>

        <div className="px-3 pb-3 flex items-center gap-4 border-t border-[#F5F0EB] pt-2.5">
          <button onClick={() => setOpen((v) => !v)} className="text-xs font-bold text-[#5E9E8C] hover:underline">
            {open ? "Close ▴" : "Edit ▾"}
          </button>
          <span className={`text-xs font-bold text-[#5E9E8C] transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>✓ Saved</span>
          <button onClick={remove} className="text-xs font-bold text-[#B03A3A] hover:underline ml-auto">Delete</button>
        </div>

        {open && (
          <div className="border-t border-[#F5F0EB] bg-[#FAF7F4] p-4">
            <DetailsPanelContent draft={draft} setDraft={setDraft} save={save} uploadPhoto={uploadPhoto} busy={busy} />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <tr className={`border-b border-[#F5F0EB] ${busy ? "opacity-60" : ""}`}>
        {/* Photo */}
        <td className="p-2">
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload photo"
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl overflow-hidden border border-[#DDD5CC] hover:ring-2 hover:ring-[#5E9E8C] transition-all"
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
            className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-[#DDD5CC] focus:border-[#5E9E8C] outline-none text-sm font-semibold text-[#2A2320] bg-transparent"
          />
          <span className="text-[10px] text-[#9A8E88] font-mono px-2">#{row.id} · {draft.slug}</span>
        </td>

        {/* Category */}
        <td className="p-2">
          <select
            value={draft.category}
            onChange={(e) => save({ category: e.target.value })}
            className="px-2 py-1.5 rounded-lg border border-[#DDD5CC] text-xs font-semibold text-[#2A2320] bg-white outline-none focus:border-[#5E9E8C]"
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
              className="w-20 px-2 py-1.5 rounded-lg border border-[#DDD5CC] text-sm font-bold text-[#2A2320] outline-none focus:border-[#5E9E8C]"
            />
            <span className="text-xs text-[#9A8E88]">₾</span>
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
            className={`w-16 px-2 py-1.5 rounded-lg border text-sm font-bold outline-none focus:border-[#5E9E8C] ${
              (draft.stock ?? 0) <= 5 ? "border-orange-300 text-orange-600 bg-orange-50" : "border-[#DDD5CC] text-[#2A2320]"
            }`}
          />
        </td>

        {/* New toggle */}
        <td className="p-2 text-center">
          <button
            onClick={() => save({ is_new: !draft.is_new })}
            className={`w-10 h-6 rounded-full transition-colors relative ${draft.is_new ? "bg-[#5E9E8C]" : "bg-[#DDD5CC]"}`}
            title="Pin as new arrival"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${draft.is_new ? "translate-x-4" : ""}`} />
          </button>
        </td>

        {/* Actions */}
        <td className="p-2 whitespace-nowrap">
          <button onClick={() => setOpen((v) => !v)} className="text-xs font-bold text-[#5E9E8C] hover:underline mr-3">
            {open ? "Close ▴" : "Edit ▾"}
          </button>
          <span className={`text-xs font-bold text-[#5E9E8C] mr-2 transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>✓</span>
          <button onClick={remove} className="text-xs font-bold text-[#B03A3A] hover:underline">Delete</button>
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
      <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: "#5E9E8C" }}>
        + Add product
      </button>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-[#DDD5CC] p-4 flex flex-wrap items-end gap-3">
      {/* Photo */}
      <div>
        <label className="block text-[10px] font-bold text-[#9A8E88] uppercase mb-1">Photo</label>
        <button onClick={() => fileRef.current?.click()} className="w-14 h-14 rounded-lg border-2 border-dashed border-[#DDD5CC] flex items-center justify-center overflow-hidden hover:border-[#5E9E8C]">
          {file ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
          ) : <span className="text-xl text-[#9A8E88]">📷</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div><label className="block text-[10px] font-bold text-[#9A8E88] uppercase mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="px-3 h-10 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C]" placeholder="Product name" /></div>
      <div><label className="block text-[10px] font-bold text-[#9A8E88] uppercase mb-1">Category</label>
        <select value={category} onChange={(e) => pickCategory(e.target.value)} className="h-10 px-2 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C] bg-white">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
      <div><label className="block text-[10px] font-bold text-[#9A8E88] uppercase mb-1">Fabric</label>
        <select value={fabric} onChange={(e) => setFabric(e.target.value)} className="h-10 px-2 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C] bg-white">
          {FABRICS.filter((f) => f.v).map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}</select></div>
      <div><label className="block text-[10px] font-bold text-[#9A8E88] uppercase mb-1">Price ₾</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 h-10 px-3 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C]" placeholder="0" /></div>
      <div><label className="block text-[10px] font-bold text-[#9A8E88] uppercase mb-1">Stock</label>
        <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-20 h-10 px-3 rounded-lg border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C]" /></div>
      <div className="w-full grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-[#9A8E88] uppercase mb-1">Sizes (comma separated)</label>
          <input value={sizes} onChange={(e) => setSizes(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[#DDD5CC] text-xs outline-none focus:border-[#5E9E8C]" placeholder="e.g. 70×70 cm, 90×90 cm" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#9A8E88] uppercase mb-1">Colors (comma separated)</label>
          <input value={colors} onChange={(e) => setColors(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[#DDD5CC] text-xs outline-none focus:border-[#5E9E8C]" placeholder="e.g. White, Cream" />
        </div>
      </div>
      <button onClick={create} disabled={busy} className="h-10 px-4 rounded-lg font-bold text-white text-sm disabled:opacity-60" style={{ backgroundColor: "#5E9E8C" }}>{busy ? "…" : "Create"}</button>
      <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-lg font-bold text-[#5E5450] text-sm border border-[#DDD5CC]">Cancel</button>
      <p className="w-full text-[11px] text-[#9A8E88]">Sizes, colors &amp; fabric are pre-filled from the category — edit freely. Per-size prices, discount &amp; more photos: row&apos;s <strong>Edit</strong> button after creating.</p>
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
  if (!rows) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-[#5E9E8C] border-t-transparent animate-spin" /></div>;

  const filtered = q.trim() ? rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.id.includes(q)) : rows;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h1 className="text-2xl font-extrabold text-[#2A2320]">Products</h1>
        <AddProduct onCreated={load} />
      </div>
      <p className="text-[#9A8E88] text-sm mb-5">{rows.length} products · edit inline or open <strong>Edit ▾</strong> for photos, discount, colors, sizes &amp; more — everything saves automatically</p>

      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
        className="w-full sm:w-72 h-10 px-4 mb-4 rounded-xl border border-[#DDD5CC] text-sm outline-none focus:border-[#5E9E8C]"
      />

      {/* Desktop: dense inline-editable table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-[#DDD5CC] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#DDD5CC] text-[10px] font-bold text-[#9A8E88] uppercase tracking-widest">
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
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-[#9A8E88]">No products match &ldquo;{q}&rdquo;.</p>}
      </div>

      {/* Mobile: stacked cards — no horizontal table scrolling */}
      <div className="sm:hidden space-y-3">
        {filtered.map((r) => (
          <ProductRow key={r.id} row={r} variant="card"
            onChanged={(nr) => setRows((prev) => prev!.map((x) => x.id === nr.id ? nr : x))}
            onDeleted={(id) => setRows((prev) => prev!.filter((x) => x.id !== id))} />
        ))}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-[#9A8E88] bg-white rounded-2xl border border-[#DDD5CC]">No products match &ldquo;{q}&rdquo;.</p>}
      </div>
    </div>
  );
}
