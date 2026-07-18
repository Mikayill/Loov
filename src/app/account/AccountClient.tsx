"use client";

import { useEffect, useState } from "react";
import GhostRows from "@/components/GhostRows";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { useWishlist } from "@/context/WishlistContext";
import { useLoyalty } from "@/context/LoyaltyContext";
import { useLocale } from "@/context/LocaleContext";
import { formatPrice } from "@/lib/format";
import { fetchMyProfile, updateMyProfile, fetchAvatarPresets, type MyProfile, type BabyGender } from "@/lib/db/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LOCALES, LOCALE_META, isLocale, type Locale } from "@/lib/i18n/config";
import { tierName } from "@/lib/i18n/labels";
import { monthsOld, ageLabel } from "@/lib/babyAge";
import { useTheme } from "@/components/ThemeToggle";
import { useSettings } from "@/lib/db/useSettings";
import { fetchMyOrders } from "@/lib/db/myOrders";
import type { MockOrder } from "@/lib/orderTypes";

export default function AccountClient() {
  const router = useRouter();
  const { user, loading, signOut, updateProfile } = useAuth();
  const { count: wishCount } = useWishlist();
  const { balance: pointsBalance, tier, lifetimeEarned, nextTier, pointsToNextTier } = useLoyalty();
  const { locale, setLocale, t } = useLocale();
  const { loyaltyRedeemValue } = useSettings();
  const [theme, setTheme] = useTheme();
  const darkMode = theme === "dark";

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
  /* Orders — powers the bento "active order" card + the orders count. */
  const [orders, setOrders] = useState<MockOrder[] | null>(null);

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

  /* Load orders for the bento cards (active order + count). */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyOrders()
      .then((o) => { if (!cancelled) setOrders(o); })
      .catch(() => { if (!cancelled) setOrders([]); });
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
    return <GhostRows variant="account" />;
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

  /* ── Bento derived values (all from real data) ── */
  const orderCount = orders?.length ?? 0;
  const activeOrder = orders?.find((o) => ["Pending", "Processing", "Shipped"].includes(o.status)) ?? null;
  const orderStep: Record<string, number> = { Pending: 1, Processing: 2, Shipped: 3, Delivered: 4 };
  const orderStatusEmoji: Record<string, string> = { Pending: "🕐", Processing: "📦", Shipped: "🚚", Delivered: "✅" };
  const activeStep = activeOrder ? (orderStep[activeOrder.status] ?? 1) : 0;
  const rewardValue = (pointsBalance / 100) * loyaltyRedeemValue;
  const tierProgress = nextTier
    ? Math.min(100, Math.max(0, ((lifetimeEarned - tier.threshold) / (nextTier.threshold - tier.threshold)) * 100))
    : 100;
  const babyMonths = profile?.babyBirthdate ? monthsOld(profile.babyBirthdate) : null;

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
        <div className="mb-5 text-[13px] font-semibold text-ink bg-warning-soft border border-warning-border rounded-control py-2.5 px-4">
          📬 {saveInfo}
        </div>
      )}

      {editing ? (
        /* ── Edit profile ── */
        <form onSubmit={handleSaveProfile} className="max-w-2xl border border-line rounded-card p-6 sm:p-8 space-y-6 animate-fade-up">
          {!profileReady && (
            <div className="rounded-control bg-warning-soft border border-warning-border px-3 py-2 text-[11px] text-warning font-semibold leading-relaxed">
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
              className="u-btn flex-1 py-3 rounded-control text-[11px] font-semibold uppercase tracking-[0.1em] text-white bg-ink hover:bg-ink/85 disabled:opacity-60"
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
          {/* ══ BENTO PANEL — glanceable dashboard of differently-sized cards ══ */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 auto-rows-[minmax(0,auto)]">

            {/* Rewards — big accent card (spans both columns) */}
            <Link
              href="/account/rewards"
              className="col-span-2 relative overflow-hidden rounded-card p-5 text-white group"
              style={{ background: "radial-gradient(120% 120% at 100% 0, #3A7360 0%, var(--color-accent) 45%, var(--color-accent-deep) 100%)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#E7D9A8" }}>
                  {tier.emoji} {t("acct.rewards")} · {tierName(tier.id, t)}
                </p>
                <span className="text-[11px] font-semibold opacity-80 group-hover:opacity-100 transition-opacity">{t("acct.how")} →</span>
              </div>
              <p className="text-3xl sm:text-4xl font-extrabold tabular-nums mt-3 leading-none">
                {pointsBalance.toLocaleString()} <span className="text-lg font-bold opacity-80">{t("acct.points")}</span>
              </p>
              <p className="text-[11px] opacity-85 mt-1">≈ {formatPrice(rewardValue)}</p>
              {nextTier && (
                <>
                  <div className="h-1.5 rounded-full bg-white/20 mt-3.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${tierProgress}%`, backgroundColor: "var(--color-star)" }} />
                  </div>
                  <p className="text-[10px] opacity-85 mt-1.5">
                    {t("acct.rewards.ptsTo").replace("{n}", pointsToNextTier.toLocaleString()).replace("{tier}", `${tierName(nextTier.id, t)} ${nextTier.emoji}`)}
                  </p>
                </>
              )}
            </Link>

            {/* Active order — live status with a step bar */}
            <Link href="/account/orders" className="border border-line rounded-card p-4 bg-canvas hover:border-ink transition-colors">
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.12em]">{t("acct.activeOrder")}</p>
              {orders === null ? (
                <div className="h-14 mt-2 rounded-control u-skeleton" />
              ) : activeOrder ? (
                <>
                  <p className="text-[12.5px] font-bold text-ink mt-2 truncate">{activeOrder.id}</p>
                  <div className="flex items-center gap-1 mt-2.5">
                    {[1, 2, 3, 4].map((s) => (
                      <span key={s} className={`flex-1 h-1 rounded-full ${s <= activeStep ? "bg-accent" : "bg-line"}`} />
                    ))}
                  </div>
                  <p className="text-[11px] font-bold text-accent mt-2">{orderStatusEmoji[activeOrder.status] ?? "📦"} {t(`label.orderStatus.${activeOrder.status.toLowerCase()}` as TranslationKey)}</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-extrabold text-ink tabular-nums mt-2">{orderCount}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">{orderCount === 0 ? t("acct.noOrdersYet") : t("acct.allDelivered")}</p>
                </>
              )}
            </Link>

            {/* Wishlist */}
            <Link href="/wishlist" className="border border-line rounded-card p-4 bg-canvas hover:border-ink transition-colors">
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.12em]">❤️ {t("acct.savedToWishlist")}</p>
              <p className="text-2xl font-extrabold text-ink tabular-nums mt-2">{wishCount}</p>
            </Link>

            {/* Baby profile */}
            {profile?.babyName || profile?.babyBirthdate ? (
              <button
                onClick={() => { setEditing(true); setEditName(user.name); setEditEmail(user.email || ""); }}
                className="text-left rounded-card p-4 border bg-warning-soft border-warning-border hover:border-warning transition-colors"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-warning">👶 {t("acct.yourLittleOne")}</p>
                <p className="text-[15px] font-extrabold text-ink mt-2 truncate">
                  {profile.babyGender === "girl" ? "👧" : profile.babyGender === "boy" ? "👦" : ""} {profile.babyName || t("acct.yourLittleOne")}
                </p>
                <p className="text-[11px] text-warning mt-0.5">{babyMonths !== null ? ageLabel(babyMonths) : t("acct.addBabyInfo")}</p>
              </button>
            ) : (
              <button
                onClick={() => { setEditing(true); setEditName(user.name); setEditEmail(user.email || ""); }}
                className="text-left rounded-card p-4 border border-dashed border-line hover:border-ink transition-colors"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">👶 {t("acct.yourLittleOne")}</p>
                <p className="text-[12.5px] font-semibold text-ink-muted mt-2 leading-snug">{t("acct.addBabyInfo")}</p>
              </button>
            )}

            {/* Quick preference toggles */}
            <div className="border border-line rounded-card p-4 bg-canvas flex flex-col justify-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={darkMode}
                onClick={() => setTheme(darkMode ? "light" : "dark")}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-[12px] font-semibold text-ink flex items-center gap-1.5">{darkMode ? "🌙" : "☀️"} {t("pref.darkMode")}</span>
                <span aria-hidden className={`relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors ${darkMode ? "bg-accent" : "bg-line"}`}>
                  <span className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-[left] duration-200 ${darkMode ? "left-[20px]" : "left-0.5"}`} />
                </span>
              </button>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-ink flex items-center gap-1.5">🌐 {t("acct.siteLanguage")}</span>
                <div className="flex gap-1">
                  {LOCALES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLocale(code)}
                      aria-pressed={locale === code}
                      title={LOCALE_META[code].label}
                      className={`h-7 min-w-[30px] px-1 rounded-control text-[10px] font-extrabold uppercase border transition-colors ${
                        locale === code ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-muted"
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Account section — full-width list of the remaining destinations */}
            <div className="col-span-2 border border-line rounded-card overflow-hidden divide-y divide-line">
              {[
                { icon: "📦", label: t("acct.myOrders"),      href: "/account/orders" },
                { icon: "↩️", label: t("acct.myReturns"),     href: "/account/returns" },
                { icon: "📝", label: t("acct.myReviews"),     href: "/account/reviews" },
                { icon: "📍", label: t("acct.addresses"),     href: "/account/addresses" },
                { icon: "🔔", label: t("acct.notifications"), href: "/account/notifications" },
                { icon: "🔒", label: t("acct.security"),      href: "/account/security" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-canvas hover:bg-panel transition-colors group">
                  <span className="flex items-center gap-3.5 min-w-0">
                    <span className="w-8 h-8 rounded-control bg-panel flex items-center justify-center text-base flex-shrink-0">{item.icon}</span>
                    <span className="font-semibold text-ink text-[13.5px] group-hover:underline underline-offset-4">{item.label}</span>
                  </span>
                  <svg className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
