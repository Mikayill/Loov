"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CsrfField from "@/components/CsrfField";
import { useLocale } from "@/context/LocaleContext";
import {
  GEORGIA_REGIONS,
  TBILISI_DISTRICTS,
  PHONE_COUNTRY_CODE,
  PHONE_PLACEHOLDER,
  POSTAL_CODE_PLACEHOLDER,
} from "@/lib/georgia";
import {
  listAddresses,
  addAddress,
  removeAddress,
  setDefaultAddress,
  type SavedAddress,
} from "@/lib/db/addresses";

const EMPTY_FORM = {
  label: "Home",
  firstName: "",
  lastName: "",
  street: "",
  region: "",
  district: "",
  city: "",
  zip: "",
  phone: PHONE_COUNTRY_CODE + " ",
};

export default function AddressesClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLocale();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [ready, setReady]         = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const [busy, setBusy]           = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  /* Load the address book from Supabase (RLS: own rows only). */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listAddresses().then(({ addresses, ready }) => {
      if (cancelled) return;
      setAddresses(addresses);
      setReady(ready);
      setFetching(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  if (loading || !user || fetching) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  function set(key: keyof typeof EMPTY_FORM, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await addAddress({ ...form, isDefault: addresses.length === 0 });
    setBusy(false);
    if (res.error || !res.address) { setError(res.error || "Could not save"); return; }
    setAddresses((prev) => [...prev, res.address!]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleRemove(id: string) {
    setError("");
    const res = await removeAddress(id);
    if (res.error) { setError(res.error); return; }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSetDefault(id: string) {
    setError("");
    const res = await setDefaultAddress(id);
    if (res.error) { setError(res.error); return; }
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-muted mb-6">
        <Link href="/" className="hover:text-accent transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-accent transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <span className="text-ink font-semibold">{t("addr.breadcrumb")}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{t("addr.title")}</h1>
          <p className="text-ink-muted text-sm mt-0.5">{t("addr.subtitle")}</p>
        </div>
        <Link href="/account" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("addr.backToAccount")}
        </Link>
      </div>

      {saved && (
        <div className="mb-5 p-3 bg-accent-soft border border-sage rounded-control flex items-center gap-2 text-sm font-semibold text-accent-deep">
          <span>✓</span>
          <span>{t("addr.savedSuccess")}</span>
        </div>
      )}
      {!ready && (
        <div className="mb-5 p-3 bg-[#FFF4E5] border border-[#F0C85A] rounded-control text-sm font-semibold text-[#8B6914]">
          {t("addr.notReady")}
        </div>
      )}
      {error && (
        <div className="mb-5 p-3 bg-[#FBF0F0] border border-[#E8C4C4] rounded-control text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {/* Address list */}
      <div className="space-y-4 mb-6">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`bg-white rounded-card border-2 p-5 transition-all ${
              addr.isDefault ? "border-accent" : "border-line"
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📍</span>
                <span className="font-extrabold text-ink">
                  {addr.label === "Home" ? t("addr.labelHome") : addr.label === "Work" ? t("addr.labelWork") : addr.label === "Other" ? t("addr.labelOther") : addr.label}
                </span>
                {addr.isDefault && (
                  <span className="text-[10px] font-bold bg-accent-soft text-accent px-2 py-0.5 rounded-full">
                    {t("addr.default")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs font-bold text-accent hover:underline"
                  >
                    {t("addr.setAsDefault")}
                  </button>
                )}
                <button
                  onClick={() => handleRemove(addr.id)}
                  className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
                >
                  {t("addr.remove")}
                </button>
              </div>
            </div>
            <div className="text-sm text-ink-soft space-y-1">
              <p className="font-semibold text-ink">{addr.firstName} {addr.lastName}</p>
              <p>{addr.street}{addr.district ? `, ${addr.district}` : ""}</p>
              <p>{addr.city}{addr.zip ? `, ${addr.zip}` : ""}{addr.region && addr.region !== addr.city ? `, ${addr.region}` : ""}</p>
              <p className="text-ink-muted">{addr.phone}</p>
            </div>
          </div>
        ))}

        {addresses.length === 0 && (
          <div className="text-center py-12 bg-white rounded-card border border-line">
            <div className="text-4xl mb-3">📍</div>
            <p className="font-bold text-ink mb-1">{t("addr.empty")}</p>
            <p className="text-sm text-ink-muted">{t("addr.emptyBody")}</p>
          </div>
        )}
      </div>

      {/* Add new */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm font-bold text-accent border-2 border-dashed border-accent w-full py-3 rounded-card hover:bg-accent-soft transition-colors justify-center"
        >
          <span className="text-lg">+</span>
          {t("addr.addNew")}
        </button>
      ) : (
        <form onSubmit={handleAdd} className="bg-white rounded-card border-2 border-accent p-6 space-y-4">
          <h2 className="font-extrabold text-ink mb-4">{t("addr.newAddress")}</h2>

          {/* Label */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">{t("addr.label")}</label>
            <div className="flex gap-2">
              {[
                { v: "Home", label: t("addr.labelHome") },
                { v: "Work", label: t("addr.labelWork") },
                { v: "Other", label: t("addr.labelOther") },
              ].map((l) => (
                <button
                  key={l.v}
                  type="button"
                  onClick={() => set("label", l.v)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                    form.label === l.v
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line text-ink-soft"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "firstName" as const, label: t("addr.firstName"), placeholder: "Ana" },
              { key: "lastName"  as const, label: t("addr.lastName"),  placeholder: "Beridze" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-ink mb-1.5">{label} *</label>
                <input
                  value={form[key]} onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder} required
                  className="w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors"
                />
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="addr-street" className="block text-xs font-bold text-ink mb-1.5">{t("addr.streetAddress")} *</label>
            <input
              id="addr-street"
              value={form.street} onChange={(e) => set("street", e.target.value)}
              placeholder="123 Rustaveli Avenue" required autoComplete="address-line1"
              className="w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="addr-region" className="block text-xs font-bold text-ink mb-1.5">{t("addr.region")} *</label>
              <select
                id="addr-region"
                value={form.region}
                onChange={(e) => { set("region", e.target.value); set("district", ""); }}
                required
                className={`w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors bg-white ${form.region ? "text-ink" : "text-[#C8B8B0]"}`}
              >
                <option value="" disabled>{t("addr.selectRegion")}</option>
                {GEORGIA_REGIONS.map((r) => (
                  <option key={r.code} value={r.en} className="text-ink">{r.en} · {r.ka}</option>
                ))}
              </select>
            </div>
            {form.region === "Tbilisi" ? (
              <div>
                <label htmlFor="addr-district" className="block text-xs font-bold text-ink mb-1.5">{t("addr.district")}</label>
                <select
                  id="addr-district"
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                  className={`w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors bg-white ${form.district ? "text-ink" : "text-[#C8B8B0]"}`}
                >
                  <option value="">{t("addr.selectDistrict")}</option>
                  {TBILISI_DISTRICTS.map((d) => (
                    <option key={d} value={d} className="text-ink">{d}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="addr-city" className="block text-xs font-bold text-ink mb-1.5">{t("addr.cityTown")} *</label>
                <input
                  id="addr-city"
                  value={form.city} onChange={(e) => set("city", e.target.value)}
                  placeholder="Batumi" required autoComplete="address-level2"
                  className="w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {form.region === "Tbilisi" && (
              <div>
                <label htmlFor="addr-city-tb" className="block text-xs font-bold text-ink mb-1.5">{t("addr.city")} *</label>
                <input
                  id="addr-city-tb"
                  value={form.city} onChange={(e) => set("city", e.target.value)}
                  placeholder="Tbilisi" required autoComplete="address-level2"
                  className="w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors"
                />
              </div>
            )}
            <div>
              <label htmlFor="addr-zip" className="block text-xs font-bold text-ink mb-1.5">{t("addr.postalCode")}</label>
              <input
                id="addr-zip"
                value={form.zip} onChange={(e) => set("zip", e.target.value)}
                placeholder={POSTAL_CODE_PLACEHOLDER} inputMode="numeric" maxLength={4}
                className="w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="addr-phone" className="block text-xs font-bold text-ink mb-1.5">{t("addr.phone")} *</label>
            <input
              id="addr-phone"
              type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
              placeholder={PHONE_PLACEHOLDER} required autoComplete="tel"
              className="w-full h-10 px-3 rounded-control border-2 border-line text-sm font-medium focus:border-accent outline-none transition-colors"
            />
          </div>

          {/* CSRF placeholder — server validation in Phase 2 */}
          <CsrfField />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="flex-1 h-10 rounded-control border-2 border-line text-sm font-bold text-ink-soft hover:border-ink-muted transition-colors"
            >
              {t("addr.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 h-10 rounded-control text-sm font-extrabold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#5E9E8C" }}
            >
              {busy ? "…" : `${t("addr.saveAddress")} →`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
