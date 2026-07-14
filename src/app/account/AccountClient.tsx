"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useLoyalty } from "@/context/LoyaltyContext";
import { useLocale } from "@/context/LocaleContext";
import { formatPrice } from "@/lib/format";
import { fetchMyProfile, updateMyProfile, fetchAvatarPresets, type MyProfile, type BabyGender } from "@/lib/db/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LOCALES, LOCALE_META, isLocale, type Locale } from "@/lib/i18n/config";
import { tierName } from "@/lib/i18n/labels";
import { useTheme } from "@/components/ThemeToggle";

export default function AccountClient() {
  const router = useRouter();
  const { user, loading, signOut, updateProfile } = useAuth();
  const { totalItems, totalPrice } = useCart();
  const { count: wishCount } = useWishlist();
  const { balance: pointsBalance, tier } = useLoyalty();
  const { locale, setLocale, t } = useLocale();
  const [theme, setTheme] = useTheme();

  /* Hooks must run unconditionally on every render — declare them before any
     early return. */
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveInfo, setSaveInfo] = useState("");

  /* Extended profile (supabase/profile.sql) */
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileReady, setProfileReady] = useState(true);
  const [avatarPresets, setAvatarPresets] = useState<string[]>([]);
  const [profileSeeded, setProfileSeeded] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editBabyName, setEditBabyName] = useState("");
  const [editBabyDate, setEditBabyDate] = useState("");
  const [editBabyGender, setEditBabyGender] = useState<"" | BabyGender>("");
  const [editLanguage, setEditLanguage] = useState<Locale>("en");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  /* Seed the edit form once the (async) session arrives. */
  useEffect(() => {
    if (user && !editing) { setEditName(user.name); setEditEmail(user.email); }
  }, [user, editing]);

  /* Load the extended profile + preset avatars once the session arrives. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([fetchMyProfile(), fetchAvatarPresets()]).then(([{ profile: p, ready }, presets]) => {
      if (cancelled) return;
      setProfile(p);
      setProfileReady(ready);
      setAvatarPresets(presets);
    });
    return () => { cancelled = true; };
  }, [user]);

  /* Seed profile fields once (never mid-typing — gated on !editing + one-shot flag). */
  useEffect(() => {
    if (!profile || profileSeeded || editing) return;
    setEditPhone(profile.phone ?? "");
    setEditBabyName(profile.babyName ?? "");
    setEditBabyDate(profile.babyBirthdate ?? "");
    setEditBabyGender(profile.babyGender ?? "");
    setEditLanguage(profile.language && isLocale(profile.language) ? profile.language : locale);
    setEditAvatar(profile.avatarUrl);
    setProfileSeeded(true);
  }, [profile, profileSeeded, editing, locale]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const providerLabel: Record<string, string> = {
    email: t("acct.providerEmail"),
    google: t("acct.providerGoogle"),
    facebook: t("acct.providerFacebook"),
    phone: t("acct.providerPhone"),
  };

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(""); setSaveInfo(""); setSaving(true);

    /* 1) Auth metadata first (name/email — may trigger email confirmation). */
    const res = await updateProfile(editName, editEmail);
    if (res.error) { setSaving(false); setSaveError(res.error); return; }

    /* 2) Extended profile row (own-row RLS). */
    const profRes = await updateMyProfile({
      name: editName,
      phone: editPhone,
      babyName: editBabyName,
      babyBirthdate: editBabyDate || null,
      babyGender: editBabyGender || null,
      language: editLanguage,
      avatarUrl: editAvatar,
    });
    if (profRes.error) { setSaving(false); setSaveError(profRes.error); return; }

    /* 3) Avatar also goes into auth metadata so the Navbar updates instantly. */
    const avatarChanged = (profile?.avatarUrl ?? null) !== editAvatar;
    if (avatarChanged) {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.updateUser({ data: { avatar_url: editAvatar ?? "" } });
      } catch { /* non-fatal — profile row already saved */ }
    }

    setProfile((p) => ({
      ...(p ?? {
        name: null, phone: null, babyName: null, babyBirthdate: null,
        babyGender: null, language: null, avatarUrl: null, notificationPrefs: {},
      }),
      name: editName,
      phone: editPhone || null,
      babyName: editBabyName || null,
      babyBirthdate: editBabyDate || null,
      babyGender: editBabyGender || null,
      language: editLanguage,
      avatarUrl: editAvatar,
    }));

    /* 4) Language preference applies to the whole site immediately. */
    if (editLanguage !== locale) setLocale(editLanguage);

    setSaving(false);
    if (res.info) setSaveInfo(res.info);
    setSaveSuccess(true);
    setEditing(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  const avatarShown = profile?.avatarUrl || user.avatar;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

      {/* ── Identity header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-line mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-panel border border-line flex items-center justify-center text-xl sm:text-2xl font-bold text-ink flex-shrink-0 overflow-hidden">
            {avatarShown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarShown} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight truncate">{user.name}</h1>
            <div className="flex items-center gap-2.5 flex-wrap mt-1">
              {user.email && <span className="text-[13px] text-ink-muted truncate">{user.email}</span>}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft bg-panel px-2 py-0.5 rounded-control">
                <span className="text-accent">✓</span>{providerLabel[user.provider] || t("acct.providerFallback")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => { setEditing(true); setEditName(user.name); setEditEmail(user.email || ""); }}
              className="u-btn u-btn-ghost px-4 py-2.5 rounded-control border border-ink text-[11px] font-semibold uppercase tracking-[0.08em] text-ink hover:bg-ink hover:text-white"
            >
              {t("acct.editProfile")}
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="px-4 py-2.5 rounded-control border border-line text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted hover:border-danger hover:text-danger transition-colors"
          >
            {t("acct.signOut")}
          </button>
        </div>
      </div>

      {/* Save feedback */}
      {saveSuccess && (
        <div className="mb-5 text-[13px] font-semibold text-accent-deep bg-accent-soft border border-accent/20 rounded-control py-2.5 px-4">
          ✓ {t("acct.profileUpdated")}
        </div>
      )}
      {saveInfo && !editing && (
        <div className="mb-5 text-[13px] font-semibold text-ink bg-[#FFF8E8] border border-[#F0C85A] rounded-control py-2.5 px-4">
          📬 {saveInfo}
        </div>
      )}

      {editing ? (
        /* ── Edit profile ── */
        <form onSubmit={handleSaveProfile} className="max-w-2xl border border-line rounded-card p-6 sm:p-8 space-y-6 animate-fade-up">
          {!profileReady && (
            <div className="rounded-control bg-[#FFF4E5] border border-[#F0C85A] px-3 py-2 text-[11px] text-[#8B6914] font-semibold leading-relaxed">
              ⚠️ {t("acct.profileSqlNote").split("{code}")[0]}
              <code className="font-mono">supabase/profile.sql</code>
              {t("acct.profileSqlNote").split("{code}")[1]}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-1.5">{t("acct.name")}</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required
                className="w-full h-11 px-3.5 rounded-control border border-line bg-canvas text-sm text-ink font-medium focus:border-ink outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-1.5">{t("acct.email")}</label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-control border border-line bg-canvas text-sm text-ink font-medium focus:border-ink outline-none transition-colors" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-1.5">{t("acct.phone")}</label>
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+995 5XX XX XX XX"
                className="w-full h-11 px-3.5 rounded-control border border-line bg-canvas text-sm text-ink font-medium focus:border-ink outline-none transition-colors" />
              <p className="text-[11px] text-ink-muted mt-1">{t("acct.phoneHint")}</p>
            </div>
          </div>

          {/* ── Your little one ── */}
          <div className="pt-5 border-t border-line">
            <p className="text-[10px] font-semibold text-accent uppercase tracking-[0.14em] mb-3">👶 {t("acct.yourLittleOne")}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-1.5">{t("acct.babyName")}</label>
                <input type="text" value={editBabyName} onChange={(e) => setEditBabyName(e.target.value)} placeholder={t("acct.optional")}
                  className="w-full h-11 px-3.5 rounded-control border border-line bg-canvas text-sm text-ink font-medium focus:border-ink outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-1.5">{t("acct.gender")}</label>
                <select value={editBabyGender} onChange={(e) => setEditBabyGender(e.target.value as "" | BabyGender)}
                  className="w-full h-11 px-3 rounded-control border border-line bg-canvas text-sm text-ink font-medium focus:border-ink outline-none transition-colors">
                  <option value="">—</option>
                  <option value="boy">{t("acct.boy")}</option>
                  <option value="girl">{t("acct.girl")}</option>
                  <option value="na">{t("acct.preferNotToSay")}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-1.5">{t("acct.birthDate")}</label>
                <input type="date" value={editBabyDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setEditBabyDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-control border border-line bg-canvas text-sm text-ink font-medium focus:border-ink outline-none transition-colors" />
                <p className="text-[11px] text-ink-muted mt-1">{t("acct.birthDateHint")}</p>
              </div>
            </div>
          </div>

          {/* ── Preferences ── */}
          <div className="pt-5 border-t border-line">
            <p className="text-[10px] font-semibold text-accent uppercase tracking-[0.14em] mb-3">⚙️ {t("acct.preferences")}</p>
            <div>
              <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-1.5">{t("acct.siteLanguage")}</label>
              <select value={editLanguage} onChange={(e) => { if (isLocale(e.target.value)) setEditLanguage(e.target.value); }}
                className="w-full h-11 px-3 rounded-control border border-line bg-canvas text-sm text-ink font-medium focus:border-ink outline-none transition-colors">
                {LOCALES.map((l) => (
                  <option key={l} value={l}>{LOCALE_META[l].flag} {LOCALE_META[l].label}</option>
                ))}
              </select>
            </div>
            {avatarPresets.length > 0 && (
              <div className="mt-4">
                <label className="block text-[10px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-2">{t("acct.avatar")}</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAvatar(null)}
                    title={t("acct.useInitial")}
                    className={`w-11 h-11 rounded-full bg-panel border flex items-center justify-center text-ink font-bold text-base transition-all ${
                      editAvatar === null ? "ring-2 ring-offset-2 ring-ink border-ink" : "border-line opacity-70 hover:opacity-100"
                    }`}
                  >
                    {editName[0]?.toUpperCase() || "?"}
                  </button>
                  {avatarPresets.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setEditAvatar(url)}
                      className={`w-11 h-11 rounded-full overflow-hidden transition-all ${
                        editAvatar === url ? "ring-2 ring-offset-2 ring-ink" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {saveError && <p className="text-danger text-xs font-semibold">{saveError}</p>}
          {saveInfo && <p className="text-accent-deep text-xs font-semibold bg-accent-soft px-3 py-2 rounded-control">📬 {saveInfo}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="u-btn flex-1 py-3 rounded-control text-[11px] font-semibold uppercase tracking-[0.1em] text-white bg-ink hover:bg-accent disabled:opacity-60"
            >
              {saving ? t("auth.saving") : t("acct.saveChanges")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 py-3 rounded-control border border-line text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft hover:border-ink hover:text-ink transition-colors"
            >
              {t("acct.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* ── Stat strip — hairline cells ── */}
          <div className="grid grid-cols-3 gap-px bg-line border border-line rounded-card overflow-hidden mb-6">
            {[
              { href: "/cart", value: String(totalItems), label: t("acct.itemsInCart").replace("{amount}", formatPrice(totalPrice)) },
              { href: "/wishlist", value: String(wishCount), label: t("acct.savedToWishlist") },
              { href: "/account/rewards", value: pointsBalance.toLocaleString(), label: t("acct.bebecoPoints").replace("{tier}", `${tier.emoji} ${tierName(tier.id, t)}`) },
            ].map((s) => (
              <Link key={s.href + s.label} href={s.href} className="bg-canvas px-4 py-5 hover:bg-panel transition-colors group">
                <p className="text-2xl font-bold text-ink tabular-nums tracking-tight">{s.value}</p>
                <p className="text-[11px] text-ink-muted font-medium mt-1 leading-snug">{s.label}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Account ledger ── */}
            <div className="lg:col-span-2 border border-line rounded-card overflow-hidden divide-y divide-line self-start">
              {[
                { icon: "📦", label: t("acct.myOrders"),      sub: t("acct.myOrdersSub"),       href: "/account/orders" },
                { icon: "↩️", label: t("acct.myReturns"),     sub: t("acct.myReturnsSub"),      href: "/account/returns" },
                { icon: "📝", label: t("acct.myReviews"),     sub: t("acct.myReviewsSub"),      href: "/account/reviews" },
                { icon: "⭐", label: t("acct.rewards"),       sub: t("acct.rewardsSub"),        href: "/account/rewards" },
                { icon: "📍", label: t("acct.addresses"),     sub: t("acct.addressesSub"),      href: "/account/addresses" },
                { icon: "🔔", label: t("acct.notifications"), sub: t("acct.notificationsSub"),  href: "/account/notifications" },
                { icon: "🔒", label: t("acct.security"),      sub: t("acct.securitySub"),       href: "/account/security" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 sm:px-5 py-4 bg-canvas hover:bg-panel transition-colors group">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-9 h-9 rounded-control bg-panel group-hover:bg-canvas flex items-center justify-center text-base flex-shrink-0 transition-colors">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink text-[13.5px] group-hover:underline underline-offset-4">{item.label}</p>
                      <p className="text-[11px] text-ink-muted mt-0.5 truncate">{item.sub}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>

            {/* ── Right rail ── */}
            <div className="space-y-6 self-start">
              {/* Appearance */}
              <div className="border border-line rounded-card p-5">
                <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.14em] mb-1">{t("acct.appearance")}</p>
                <p className="text-[12px] text-ink-muted mb-4 leading-snug">{t("acct.appearanceSub")}</p>
                <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-control overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                      theme === "light" ? "bg-ink text-white" : "bg-canvas text-ink-soft hover:bg-panel"
                    }`}
                  >
                    ☀ {t("theme.light")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                      theme === "dark" ? "bg-ink text-white" : "bg-canvas text-ink-soft hover:bg-panel"
                    }`}
                  >
                    ☾ {t("theme.dark")}
                  </button>
                </div>
              </div>

              {/* Browse CTA — quiet, on-system */}
              <Link
                href="/products"
                className="u-btn u-btn-ghost group flex items-center justify-between p-5 rounded-card border border-line hover:border-ink"
              >
                <div>
                  <p className="font-semibold text-ink text-[13.5px]">{t("acct.browseCollection")}</p>
                  <p className="text-[11.5px] text-ink-muted mt-0.5">{t("acct.findSomething")}</p>
                </div>
                <svg className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
