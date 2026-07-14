"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { BundleRow, BundleItem } from "../BundlesListClient";

/* ── catalog product info the picker needs ── */
interface CatalogProduct {
  slug: string;
  name: string;
  price: number;
  discountPercent: number;
  imageUrl: string | null;
  emoji: string;
  cardColor: string;
}

function unitPrice(p: CatalogProduct): number {
  if (!p.discountPercent) return p.price;
  return Math.round(p.price * (1 - p.discountPercent / 100) * 100) / 100;
}

function Thumb({ p, size = "w-12 h-12", text = "text-2xl" }: { p?: CatalogProduct; size?: string; text?: string }) {
  return (
    <div className={`${size} rounded-lg flex items-center justify-center ${text} flex-shrink-0 overflow-hidden border border-panel`} style={{ backgroundColor: p?.cardColor ?? "#F5F0EB" }}>
      {p?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
      ) : (p?.emoji ?? "🍼")}
    </div>
  );
}

/** Editable copy of the row — normalized so dirty-checking is reliable. */
function normalize(r: BundleRow) {
  return {
    name: r.name ?? "",
    subtitle: r.subtitle ?? "",
    tagline: r.tagline ?? "",
    description: r.description ?? "",
    features: (r.features ?? []).filter(Boolean),
    items: (r.items ?? []).map((it) => ({ slug: it.slug, label: it.label, quantity: it.quantity ?? 1 })),
    original_price: Number(r.original_price) || 0,
    bundle_price: Number(r.bundle_price) || 0,
    is_new: !!r.is_new,
    active: r.active ?? true,
    card_color: r.card_color ?? "#EDE5D8",
    image_url: r.image_url ?? null,
  };
}

const SECTION = "bg-canvas rounded-card border border-line p-5";
const LABEL = "block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5";
const INPUT = "w-full h-10 px-3 rounded-control border border-line text-sm outline-none focus:border-accent";

export default function BundleEditorClient({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState<BundleRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState<BundleRow | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productsError, setProductsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── load bundle + catalog ── */
  useEffect(() => {
    fetch(`/api/admin/bundles?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.bundle) { setLoaded(d.bundle); setDraft(d.bundle); }
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));

    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.products)) {
          setProducts(d.products.map((p: Record<string, unknown>) => ({
            slug: String(p.slug),
            name: String(p.name),
            price: Number(p.price) || 0,
            discountPercent: Number(p.discount_percent) || 0,
            imageUrl: (p.image_url as string) ?? ((p.image_urls as string[])?.[0] ?? null),
            emoji: (p.emoji as string) || "🍼",
            cardColor: (p.card_color as string) || "#EAE4DC",
          })));
        } else setProductsError(d.error || "Products could not be loaded");
      })
      .catch(() => setProductsError("Products could not be loaded"));
  }, [slug]);

  const dirty = useMemo(
    () => !!draft && !!loaded && JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(loaded)),
    [draft, loaded]
  );

  /* Warn before leaving with unsaved changes. */
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);

  if (notFound) {
    return (
      <div className="max-w-xl py-20 text-center">
        <p className="text-4xl mb-3">🤔</p>
        <p className="font-extrabold text-ink mb-2">Bundle not found</p>
        <p className="text-sm text-ink-muted mb-5">It may have been deleted, or the bundles table isn&apos;t set up (supabase/bundles.sql).</p>
        <Link href="/admin/bundles" className="font-bold text-accent hover:underline">← Back to bundles</Link>
      </div>
    );
  }
  if (!draft) {
    return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;
  }

  const items = draft.items ?? [];
  const set = (patch: Partial<BundleRow>) => setDraft((d) => d ? { ...d, ...patch } : d);

  /* ── derived money ── */
  const validItems = items.filter((it) => bySlug.has(it.slug));
  const separately = validItems.reduce((s, it) => s + unitPrice(bySlug.get(it.slug)!) * (it.quantity ?? 1), 0);
  const savings = Math.max(0, separately - draft.bundle_price);
  const savingsPct = separately > 0 ? Math.round((savings / separately) * 100) : 0;

  /* ── publish checklist (mirrors the server rule) ── */
  const checklist = [
    { ok: !!draft.image_url, label: "Photo uploaded" },
    { ok: !!String(draft.description ?? "").trim(), label: "Description written" },
    { ok: Number(draft.bundle_price) > 0, label: "Bundle price above 0" },
    { ok: items.length >= 2, label: "At least 2 products" },
  ];
  const complete = checklist.every((c) => c.ok);

  /* ── items ── */
  function addProduct(p: CatalogProduct) {
    const existing = items.find((it) => it.slug === p.slug);
    const next = existing
      ? items.map((it) => it.slug === p.slug ? { ...it, quantity: Math.min(20, (it.quantity ?? 1) + 1) } : it)
      : [...items, { slug: p.slug, label: p.name, quantity: 1 }];
    set({ items: next });
    setFlash(p.slug);
    setTimeout(() => setFlash(null), 1200);
  }
  function setQty(i: number, qty: number) {
    set({ items: items.map((it, j) => j === i ? { ...it, quantity: Math.max(1, Math.min(20, qty)) } : it) });
  }

  /* ── photo (files upload immediately — clearly labelled) ── */
  async function uploadPhoto(file: File) {
    setSaving(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bundleSlug", slug);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      set({ image_url: data.imageUrl });
      setLoaded((l) => l ? { ...l, image_url: data.imageUrl } : l); // photo is saved server-side already
    } else alert(data.error || "Upload failed");
  }

  /* ── save all ── */
  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaveError("");
    setMissing([]);
    const n = normalize(draft);
    const res = await fetch("/api/admin/bundles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name: n.name,
        subtitle: n.subtitle,
        tagline: n.tagline,
        description: n.description,
        features: n.features,
        items: n.items,
        originalPrice: n.original_price,
        bundlePrice: n.bundle_price,
        isNew: n.is_new,
        active: n.active,
        cardColor: n.card_color,
        imageUrl: n.image_url ?? "",
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      setLoaded(draft);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } else {
      if (Array.isArray(data.missing)) setMissing(data.missing);
      setSaveError(data.error || "Save failed");
    }
  }

  function discard() {
    if (loaded) setDraft(loaded);
    setSaveError("");
    setMissing([]);
  }

  const filtered = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : products;

  return (
    <div className="max-w-6xl pb-24">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/bundles" className="text-sm font-bold text-accent hover:underline whitespace-nowrap">← Bundles</Link>
          <h1 className="text-xl font-extrabold text-ink truncate">{draft.name}</h1>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${draft.active ? "bg-accent-soft text-accent-deep" : "bg-canvas text-ink-muted"}`}>
            {draft.active ? "● Live" : "○ Hidden"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {draft.active && (
            <a href={`/bundles/${slug}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-accent border border-sage rounded-full px-3 py-1.5 hover:bg-panel transition-colors">
              View on site ↗
            </a>
          )}
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="h-10 px-5 rounded-control font-bold text-white text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            {saving ? "Saving…" : savedFlash ? "✓ Saved" : "💾 Save changes"}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-5 rounded-control bg-danger-soft border border-[#E5B0B0] px-4 py-3 text-sm font-semibold text-danger">
          {saveError}{missing.length > 0 && " See the Publish panel for what's missing."}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ══ LEFT: content (3/5) ══ */}
        <div className="lg:col-span-3 space-y-5">

          {/* ── Photo ── */}
          <div className={SECTION}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-ink text-sm">📷 Bundle photo</h2>
              <span className="text-[10px] text-ink-muted font-semibold">Photos save instantly (no Save needed)</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-32 h-32 rounded-card border-2 border-dashed border-line flex flex-col items-center justify-center overflow-hidden hover:border-accent transition-colors flex-shrink-0"
                style={{ backgroundColor: draft.card_color ?? "#EDE5D8" }}
              >
                {draft.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.image_url} alt={draft.name} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <span className="text-3xl mb-1">📷</span>
                    <span className="text-[10px] font-bold text-ink-muted">Click to upload</span>
                  </>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              <div className="text-xs text-ink-muted space-y-2">
                <p>JPG / PNG / WEBP · max 5MB.<br />Shown on /bundles, the detail page and the homepage.</p>
                {draft.image_url && (
                  <button
                    onClick={() => { set({ image_url: null }); }}
                    className="text-danger font-bold hover:underline"
                  >
                    Remove photo (takes effect on Save)
                  </button>
                )}
                <div>
                  <span className="block text-[10px] font-bold text-ink-muted uppercase mb-1">Background (shown behind transparent photos / while empty)</span>
                  <input
                    type="color"
                    value={draft.card_color ?? "#EDE5D8"}
                    onChange={(e) => set({ card_color: e.target.value })}
                    className="w-9 h-8 rounded-lg border border-line cursor-pointer align-middle"
                  />
                  <span className="ml-2 text-[11px] font-mono">{draft.card_color}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Texts ── */}
          <div className={SECTION}>
            <h2 className="font-extrabold text-ink text-sm mb-4">✏️ Texts</h2>
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Name</label>
                <input value={draft.name} onChange={(e) => set({ name: e.target.value })} className={INPUT} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Subtitle (small line, e.g. &ldquo;Hospital Exit Bundle&rdquo;)</label>
                  <input value={draft.subtitle ?? ""} onChange={(e) => set({ subtitle: e.target.value })} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Tagline (one-liner on the listing card)</label>
                  <input value={draft.tagline ?? ""} onChange={(e) => set({ tagline: e.target.value })} className={INPUT} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Description (detail page) — required to go live</label>
                <textarea
                  value={draft.description ?? ""}
                  onChange={(e) => set({ description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-control border border-line text-sm outline-none focus:border-accent resize-y"
                />
              </div>
              <div>
                <label className={LABEL}>&ldquo;Why This Bundle?&rdquo; bullets — one per line</label>
                <textarea
                  value={(draft.features ?? []).join("\n")}
                  onChange={(e) => set({ features: e.target.value.split("\n") })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-control border border-line text-sm outline-none focus:border-accent resize-y"
                  placeholder={"Complete 5-piece coming-home outfit\nGift box packaging available"}
                />
              </div>
            </div>
          </div>

          {/* ── Products ── */}
          <div className={SECTION}>
            <h2 className="font-extrabold text-ink text-sm mb-1">🛍️ Products in this bundle ({items.length})</h2>
            <p className="text-xs text-ink-muted mb-4">Click a product below to add it. Changes are applied on <strong>Save</strong>.</p>

            {/* current items */}
            <div className="space-y-2 mb-4">
              {items.map((it, i) => {
                const p = bySlug.get(it.slug);
                return (
                  <div key={`${it.slug}-${i}`} className={`flex items-center gap-3 flex-wrap rounded-control border p-2.5 ${p ? "bg-surface border-panel" : "bg-danger-soft border-[#E5B0B0]"}`}>
                    <Thumb p={p} />
                    <div className="flex-1 min-w-[140px]">
                      {p ? (
                        <p className="font-bold text-ink text-sm leading-snug truncate">
                          {p.name}
                          <span className="ml-2 text-xs font-semibold text-ink-muted">{formatPrice(unitPrice(p))}</span>
                        </p>
                      ) : (
                        <p className="font-bold text-danger text-sm">⚠ &ldquo;{it.slug}&rdquo; is no longer in the catalog — remove it</p>
                      )}
                      <input
                        value={it.label}
                        onChange={(e) => set({ items: items.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}
                        placeholder="Label shown to customer"
                        title="Label shown to the customer on the bundle page"
                        className="w-full text-xs text-ink-muted bg-transparent border-b border-transparent hover:border-line focus:border-accent outline-none py-0.5"
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-shrink-0">
                      <div className="flex items-center border border-line rounded-lg overflow-hidden bg-canvas">
                        <button onClick={() => setQty(i, (it.quantity ?? 1) - 1)} disabled={(it.quantity ?? 1) <= 1} className="w-7 h-8 flex items-center justify-center font-bold hover:bg-canvas disabled:opacity-30 transition-colors">−</button>
                        <span className="w-7 text-center text-sm font-extrabold select-none">{it.quantity ?? 1}</span>
                        <button onClick={() => setQty(i, (it.quantity ?? 1) + 1)} className="w-7 h-8 flex items-center justify-center font-bold hover:bg-canvas transition-colors">+</button>
                      </div>
                      <span className="font-extrabold text-ink text-sm w-16 text-right">
                        {p ? formatPrice(unitPrice(p) * (it.quantity ?? 1)) : "—"}
                      </span>
                      <button
                        onClick={() => set({ items: items.filter((_, j) => j !== i) })}
                        className="w-7 h-7 rounded-full bg-danger-soft text-danger font-bold flex-shrink-0 hover:bg-red-100 transition-colors"
                        title="Remove from bundle"
                      >×</button>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="text-xs text-ink-muted rounded-control border border-dashed border-line p-4 text-center">Empty — pick products below 👇</p>
              )}
            </div>

            {/* picker */}
            <div className="rounded-control border-2 border-accent overflow-hidden">
              <div className="p-2 bg-[#F5FBF9] border-b border-panel">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍 Search the catalog…"
                  className="w-full h-9 px-3 rounded-lg border border-line text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-canvas">
                {productsError && <p className="p-4 text-xs font-semibold text-red-500">⚠️ {productsError} — refresh and try again.</p>}
                {!productsError && products.length === 0 && (
                  <div className="flex items-center justify-center p-6"><div className="w-5 h-5 rounded-full border-3 border-accent border-t-transparent animate-spin" /></div>
                )}
                {!productsError && products.length > 0 && filtered.length === 0 && (
                  <p className="p-4 text-xs text-ink-muted text-center">No products match &ldquo;{search}&rdquo;.</p>
                )}
                {filtered.map((p) => {
                  const inBundle = items.find((it) => it.slug === p.slug);
                  const justAdded = flash === p.slug;
                  return (
                    <button
                      key={p.slug}
                      onClick={() => addProduct(p)}
                      className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${justAdded ? "bg-accent-soft" : "hover:bg-[#FAF7F4]"}`}
                    >
                      <Thumb p={p} size="w-10 h-10" text="text-xl" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink text-sm truncate">{p.name}</p>
                        <p className="text-xs text-ink-muted">
                          {formatPrice(unitPrice(p))}
                          {p.discountPercent > 0 && <span className="ml-1 text-[#B85C38] font-bold">−{p.discountPercent}%</span>}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        justAdded ? "bg-accent text-white" : inBundle ? "bg-accent-soft text-accent-deep" : "bg-canvas text-ink-soft"
                      }`}>
                        {justAdded ? "✓ Added" : inBundle ? `×${inBundle.quantity ?? 1} · +1` : "+ Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT: preview + pricing + publish (2/5) ══ */}
        <div className="lg:col-span-2 space-y-5">
          {/* ── Live customer preview ── */}
          <div className="lg:sticky lg:top-4 space-y-5">
            <div className={SECTION}>
              <h2 className="font-extrabold text-ink text-sm mb-3">👁 Customer preview <span className="font-normal text-[10px] text-ink-muted">(live — exactly like /bundles)</span></h2>
              <div className="max-w-[260px] mx-auto rounded-card border border-line overflow-hidden shadow-sm bg-canvas">
                <div
                  className={`relative flex items-center justify-center overflow-hidden ${draft.image_url ? "aspect-[4/3]" : "py-8"}`}
                  style={{ backgroundColor: draft.card_color ?? "#EDE5D8" }}
                >
                  {draft.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.image_url} alt={draft.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">📷</span>
                  )}
                  {draft.is_new && (
                    <span className="absolute top-2.5 left-2.5 bg-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">New</span>
                  )}
                  {savings > 0 && (
                    <span className="absolute top-2.5 right-2.5 bg-ink text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Save {formatPrice(savings)}</span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="text-[9px] font-bold text-ink-muted uppercase tracking-widest mb-0.5">{draft.subtitle || "—"}</p>
                  <p className="font-extrabold text-ink text-sm leading-snug mb-0.5">{draft.name}</p>
                  <p className="text-[11px] text-ink-soft mb-2 line-clamp-2">{draft.tagline || <span className="text-[#C8B8B0]">tagline…</span>}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      {separately > 0 && <p className="text-[9px] text-ink-muted line-through">{formatPrice(separately)}</p>}
                      <p className="text-lg font-extrabold text-ink">{formatPrice(draft.bundle_price)}</p>
                    </div>
                    {savingsPct > 0 && (
                      <span className="text-[9px] font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-full">{savingsPct}% off</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Pricing ── */}
            <div className={SECTION}>
              <h2 className="font-extrabold text-ink text-sm mb-3">💰 Pricing</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ink-soft">Bought separately <span className="text-[10px] text-ink-muted">(live from catalog)</span></span>
                  <strong className="text-ink">{formatPrice(separately)}</strong>
                </div>
                <div>
                  <label className={LABEL}>Bundle price (what the customer pays)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0}
                      value={draft.bundle_price}
                      onChange={(e) => set({ bundle_price: Number(e.target.value) })}
                      className="w-28 h-11 px-3 rounded-control border border-line text-lg font-extrabold outline-none focus:border-accent text-right"
                    />
                    <span className="text-sm font-bold text-ink-muted">₾</span>
                  </div>
                  {separately > 0 && (
                    <p className="text-[11px] text-ink-muted mt-1.5">
                      💡 Suggested: {formatPrice(Math.round(separately * 0.85))}–{formatPrice(Math.round(separately * 0.75))} (15–25% off)
                    </p>
                  )}
                </div>
                <div className={`rounded-control p-3 text-sm font-bold text-center ${savings > 0 ? "bg-accent-soft text-accent-deep" : "bg-[#FFF8E8] text-[#A06820]"}`}>
                  {savings > 0
                    ? <>Customer saves {formatPrice(savings)} ({savingsPct}%) 🎉</>
                    : "No savings vs buying separately yet"}
                </div>
                <div>
                  <label className={LABEL}>&ldquo;Separately&rdquo; shown on the /bundles listing</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0}
                      value={draft.original_price}
                      onChange={(e) => set({ original_price: Number(e.target.value) })}
                      className="w-28 h-10 px-3 rounded-control border border-line text-sm font-bold outline-none focus:border-accent text-right"
                    />
                    {separately > 0 && Math.abs(separately - draft.original_price) > 0.009 && (
                      <button
                        onClick={() => set({ original_price: Math.round(separately * 100) / 100 })}
                        className="text-[11px] font-bold text-accent border border-sage rounded-full px-2.5 py-1 hover:bg-panel transition-colors"
                      >
                        ⟳ Use {formatPrice(separately)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Publish ── */}
            <div className={SECTION}>
              <h2 className="font-extrabold text-ink text-sm mb-3">🚀 Publish</h2>
              <ul className="space-y-1.5 mb-4">
                {checklist.map((c) => (
                  <li key={c.label} className={`flex items-center gap-2 text-xs font-semibold ${c.ok ? "text-accent-deep" : missing.length > 0 ? "text-danger" : "text-ink-muted"}`}>
                    <span>{c.ok ? "✓" : "✗"}</span>{c.label}
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">Live on the site</p>
                  <p className="text-[10px] text-ink-muted">{complete ? "Ready to publish" : "Locked until the checklist is complete 🔒"}</p>
                </div>
                <button
                  onClick={() => { if (draft.active || complete) set({ active: !draft.active }); }}
                  disabled={!draft.active && !complete}
                  className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:cursor-not-allowed ${draft.active ? "" : "bg-line"} ${!draft.active && !complete ? "opacity-50" : ""}`}
                  style={draft.active ? { backgroundColor: "var(--color-accent)" } : {}}
                  aria-label="Toggle live"
                >
                  <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-canvas shadow-sm transition-transform ${draft.active ? "translate-x-5" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-canvas">
                <div>
                  <p className="text-sm font-bold text-ink">&ldquo;New&rdquo; badge</p>
                  <p className="text-[10px] text-ink-muted">Pin the NEW ribbon on this bundle</p>
                </div>
                <button
                  onClick={() => set({ is_new: !draft.is_new })}
                  className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${draft.is_new ? "" : "bg-line"}`}
                  style={draft.is_new ? { backgroundColor: "var(--color-accent)" } : {}}
                  aria-label="Toggle new badge"
                >
                  <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-canvas shadow-sm transition-transform ${draft.is_new ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky unsaved-changes bar ── */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink text-white px-4 py-3 shadow-2xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm font-semibold">⚠ Unsaved changes</p>
            <div className="flex items-center gap-2">
              <button onClick={discard} className="h-9 px-4 rounded-control text-xs font-bold border border-white/30 hover:bg-canvas/10 transition-colors">Discard</button>
              <button
                onClick={save}
                disabled={saving}
                className="h-9 px-5 rounded-control text-xs font-bold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                {saving ? "Saving…" : "💾 Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
