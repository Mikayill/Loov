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

export default function AccountClient() {
  const router = useRouter();
  const { user, loading, signOut, updateProfile } = useAuth();
  const { totalItems, totalPrice } = useCart();
  const { count: wishCount } = useWishlist();
  const { balance: pointsBalance, tier } = useLoyalty();
  const { locale, setLocale, t } = useLocale();

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{t("acct.title")}</h1>
          <p className="text-ink-muted text-sm mt-0.5">{t("acct.welcomeBack").replace("{name}", user.name)}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm font-bold text-ink-muted hover:text-red-400 border border-line hover:border-red-200 px-4 py-2 rounded-control transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t("acct.signOut")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-1">
          <div className="bg-canvas rounded-card border border-line p-6 text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-extrabold text-white shadow-sm overflow-hidden"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {avatarShown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarShown} alt="" className="w-full h-full object-cover" />
              ) : (
                user.name[0]?.toUpperCase()
              )}
            </div>
            {!editing ? (
              <>
                <h2 className="font-extrabold text-ink text-lg">{user.name}</h2>
                {user.email && <p className="text-ink-muted text-sm mt-0.5">{user.email}</p>}
                <div className="mt-3 inline-flex items-center gap-1.5 bg-accent-soft text-accent text-[11px] font-bold px-3 py-1 rounded-full">
                  <span>✓</span>
                  <span>{providerLabel[user.provider] || t("acct.providerFallback")}</span>
                </div>
                {saveSuccess && (
                  <div className="mt-3 text-xs font-bold text-accent bg-accent-soft rounded-lg py-1.5 px-3">
                    ✓ {t("acct.profileUpdated")}
                  </div>
                )}
                {saveInfo && (
                  <div className="mt-3 text-xs font-semibold text-ink bg-[#FFF8E8] border border-[#F0C85A] rounded-lg py-2 px-3 text-left">
                    📬 {saveInfo}
                  </div>
                )}
                <button
                  onClick={() => { setEditing(true); setEditName(user.name); setEditEmail(user.email || ""); }}
                  className="mt-4 w-full py-2.5 rounded-control border border-line text-xs font-bold text-ink-soft hover:border-accent hover:text-accent transition-colors"
                >
                  {t("acct.editProfile")}
                </button>
              </>
            ) : (
              <form onSubmit={handleSaveProfile} className="text-left mt-2 space-y-3">
                {!profileReady && (
                  <div className="rounded-lg bg-[#FFF4E5] border border-[#F0C85A] px-3 py-2 text-[11px] text-[#8B6914] font-semibold leading-relaxed">
                    ⚠️ {t("acct.profileSqlNote").split("{code}")[0]}
                    <code className="font-mono">supabase/profile.sql</code>
                    {t("acct.profileSqlNote").split("{code}")[1]}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">{t("acct.name")}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-3 rounded-control border border-line text-sm text-ink font-medium focus:border-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">{t("acct.email")}</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-control border border-line text-sm text-ink font-medium focus:border-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">{t("acct.phone")}</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+995 5XX XX XX XX"
                    className="w-full h-10 px-3 rounded-control border border-line text-sm text-ink font-medium focus:border-accent outline-none"
                  />
                  <p className="text-[10px] text-ink-muted mt-1">{t("acct.phoneHint")}</p>
                </div>

                {/* ── Your little one ── */}
                <div className="pt-2 border-t border-canvas">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">👶 {t("acct.yourLittleOne")}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">{t("acct.babyName")}</label>
                      <input
                        type="text"
                        value={editBabyName}
                        onChange={(e) => setEditBabyName(e.target.value)}
                        placeholder={t("acct.optional")}
                        className="w-full h-10 px-3 rounded-control border border-line text-sm text-ink font-medium focus:border-accent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">{t("acct.birthDate")}</label>
                      <input
                        type="date"
                        value={editBabyDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setEditBabyDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-control border border-line text-sm text-ink font-medium focus:border-accent outline-none"
                      />
                      <p className="text-[10px] text-ink-muted mt-1">{t("acct.birthDateHint")}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">{t("acct.gender")}</label>
                      <select
                        value={editBabyGender}
                        onChange={(e) => setEditBabyGender(e.target.value as "" | BabyGender)}
                        className="w-full h-10 px-3 rounded-control border border-line text-sm text-ink font-medium focus:border-accent outline-none bg-canvas"
                      >
                        <option value="">—</option>
                        <option value="boy">{t("acct.boy")}</option>
                        <option value="girl">{t("acct.girl")}</option>
                        <option value="na">{t("acct.preferNotToSay")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Preferences ── */}
                <div className="pt-2 border-t border-canvas">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">⚙️ {t("acct.preferences")}</p>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">{t("acct.siteLanguage")}</label>
                    <select
                      value={editLanguage}
                      onChange={(e) => { if (isLocale(e.target.value)) setEditLanguage(e.target.value); }}
                      className="w-full h-10 px-3 rounded-control border border-line text-sm text-ink font-medium focus:border-accent outline-none bg-canvas"
                    >
                      {LOCALES.map((l) => (
                        <option key={l} value={l}>{LOCALE_META[l].flag} {LOCALE_META[l].label}</option>
                      ))}
                    </select>
                  </div>
                  {avatarPresets.length > 0 && (
                    <div className="mt-3">
                      <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">{t("acct.avatar")}</label>
                      <div className="flex flex-wrap gap-2">
                        {/* Initial (no avatar) option */}
                        <button
                          type="button"
                          onClick={() => setEditAvatar(null)}
                          title={t("acct.useInitial")}
                          className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-extrabold text-base transition-all ${
                            editAvatar === null ? "ring-2 ring-offset-2 ring-accent" : "opacity-70 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: "var(--color-accent)" }}
                        >
                          {editName[0]?.toUpperCase() || "?"}
                        </button>
                        {avatarPresets.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setEditAvatar(url)}
                            className={`w-11 h-11 rounded-full overflow-hidden transition-all ${
                              editAvatar === url ? "ring-2 ring-offset-2 ring-accent" : "opacity-70 hover:opacity-100"
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

                {saveError && <p className="text-red-400 text-xs font-semibold">{saveError}</p>}
                {saveInfo && <p className="text-accent text-xs font-semibold bg-accent-soft px-3 py-2 rounded-lg">📬 {saveInfo}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-control text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  >
                    {saving ? t("auth.saving") : t("acct.saveChanges")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex-1 py-2.5 rounded-control border border-line text-xs font-bold text-ink-soft hover:border-ink-muted transition-colors"
                  >
                    {t("acct.cancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Stats + quick links */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link href="/cart" className="bg-canvas rounded-card border border-line p-5 hover:shadow-sm transition-shadow group">
              <div className="text-2xl mb-1">🛒</div>
              <p className="text-2xl font-extrabold text-ink group-hover:text-accent transition-colors">{totalItems}</p>
              <p className="text-xs text-ink-muted font-semibold">{t("acct.itemsInCart").replace("{amount}", formatPrice(totalPrice))}</p>
            </Link>
            <Link href="/wishlist" className="bg-canvas rounded-card border border-line p-5 hover:shadow-sm transition-shadow group">
              <div className="text-2xl mb-1">❤️</div>
              <p className="text-2xl font-extrabold text-ink group-hover:text-accent transition-colors">{wishCount}</p>
              <p className="text-xs text-ink-muted font-semibold">{t("acct.savedToWishlist")}</p>
            </Link>
            <Link href="/account/rewards" className="col-span-2 sm:col-span-1 bg-canvas rounded-card border border-line p-5 hover:shadow-sm transition-shadow group">
              <div className="text-2xl mb-1">⭐</div>
              <p className="text-2xl font-extrabold text-ink group-hover:text-accent transition-colors">{pointsBalance.toLocaleString()}</p>
              <p className="text-xs text-ink-muted font-semibold">{t("acct.bebecoPoints").replace("{tier}", `${tier.emoji} ${tierName(tier.id, t)}`)}</p>
            </Link>
          </div>

          {/* Quick actions */}
          <div className="bg-canvas rounded-card border border-line divide-y divide-canvas">
            {[
              { icon: "📦", label: t("acct.myOrders"),   sub: t("acct.myOrdersSub"),       href: "/account/orders" },
              { icon: "↩️", label: t("acct.myReturns"),  sub: t("acct.myReturnsSub"),      href: "/account/returns" },
              { icon: "📝", label: t("acct.myReviews"),  sub: t("acct.myReviewsSub"),      href: "/account/reviews" },
              { icon: "⭐", label: t("acct.rewards"),    sub: t("acct.rewardsSub"),        href: "/account/rewards" },
              { icon: "📍", label: t("acct.addresses"),  sub: t("acct.addressesSub"),      href: "/account/addresses" },
              { icon: "🔔", label: t("acct.notifications"), sub: t("acct.notificationsSub"), href: "/account/notifications" },
              { icon: "🔒", label: t("acct.security"),   sub: t("acct.securitySub"),       href: "/account/security" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center justify-between p-4 hover:bg-accent-soft transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{item.icon}</span>
                  <div>
                    <p className="font-bold text-ink text-sm group-hover:text-accent transition-colors">{item.label}</p>
                    <p className="text-[11px] text-ink-muted">{item.sub}</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-ink-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Shop CTA */}
          <Link
            href="/products"
            className="flex items-center justify-between p-5 rounded-card text-white font-bold hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #5E9E8C 0%, #4A8A78 100%)" }}
          >
            <div>
              <p className="font-extrabold">{t("acct.browseCollection")}</p>
              <p className="text-sm opacity-80 font-normal mt-0.5">{t("acct.findSomething")}</p>
            </div>
            <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
