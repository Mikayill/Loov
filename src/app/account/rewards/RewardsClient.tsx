"use client";

import Link from "next/link";
import { useLoyalty } from "@/context/LoyaltyContext";
import {
  tiersFromSettings,
  REDEEM_BLOCK,
  GEL_PER_BLOCK,
  discountForPoints,
} from "@/lib/loyalty";
import { useSettings } from "@/lib/db/useSettings";
import { formatPrice } from "@/lib/format";
import { useLocale } from "@/context/LocaleContext";
import { fmtDate } from "@/lib/i18n/format";
import { tierName, perkLabel } from "@/lib/i18n/labels";

export default function RewardsClient() {
  const { locale, t } = useLocale();
  const settings = useSettings();
  const {
    balance,
    lifetimeEarned,
    tier,
    nextTier,
    pointsToNextTier,
    transactions,
    hydrated,
  } = useLoyalty();

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-4 border-[#5E9E8C] border-t-transparent animate-spin" />
      </div>
    );
  }

  const redeemableNow = discountForPoints(balance);
  const tierProgress = nextTier
    ? Math.min(
        100,
        Math.round(
          ((lifetimeEarned - tier.threshold) / (nextTier.threshold - tier.threshold)) * 100
        )
      )
    : 100;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#9A8E88] mb-6">
        <Link href="/" className="hover:text-[#5E9E8C] transition-colors">{t("nav.home")}</Link>
        <span>›</span>
        <Link href="/account" className="hover:text-[#5E9E8C] transition-colors">{t("acct.title")}</Link>
        <span>›</span>
        <span className="text-[#2A2320] font-semibold">{t("acct.rewards.breadcrumb")}</span>
      </nav>

      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">⭐</span>
        <div>
          <h1 className="text-2xl font-extrabold text-[#2A2320]">{t("acct.rewards.title")}</h1>
          <p className="text-sm text-[#5E5450]">{t("acct.rewards.subtitle")}</p>
        </div>
      </div>

      {/* ── Balance card ── */}
      <div
        className="rounded-3xl p-6 sm:p-8 mb-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #5E9E8C 0%, #4A8474 100%)" }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 right-24 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
              {t("acct.rewards.availablePoints")}
            </p>
            <p className="text-5xl font-extrabold leading-none">{balance.toLocaleString()}</p>
            <p className="text-sm text-white/80 mt-2">
              {redeemableNow > 0 ? (
                <>{t("acct.rewards.worthOff").split("{amount}")[0]}<strong>{formatPrice(redeemableNow)}</strong>{t("acct.rewards.worthOff").split("{amount}")[1]}</>
              ) : (
                <>{t("acct.rewards.collectMore").replace("{n}", String(REDEEM_BLOCK - (balance % REDEEM_BLOCK))).replace("{amount}", formatPrice(GEL_PER_BLOCK))}</>
              )}
            </p>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 mb-2">
              <span>{tier.emoji}</span>
              <span className="text-sm font-bold">{t("acct.rewards.member").replace("{tier}", tierName(tier.id, t))}</span>
            </div>
            <p className="text-[11px] text-white/70">
              {t("acct.rewards.lifetimeEarned").replace("{n}", lifetimeEarned.toLocaleString())}
            </p>
          </div>
        </div>

        {/* Tier progress */}
        <div className="relative mt-6">
          <div className="flex justify-between text-[11px] font-bold text-white/80 mb-1.5">
            <span>{tier.emoji} {tierName(tier.id, t)}</span>
            {nextTier ? (
              <span>{t("acct.rewards.ptsTo").replace("{n}", pointsToNextTier.toLocaleString()).replace("{tier}", `${tierName(nextTier.id, t)} ${nextTier.emoji}`)}</span>
            ) : (
              <span>{t("acct.rewards.topTier")}</span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${tierProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            icon: "🛍️",
            title: t("acct.rewards.shopEarnTitle"),
            text: t("acct.rewards.shopEarnBody").replace("{n}", String(settings.pointsPerGel)),
          },
          {
            icon: "💸",
            title: t("acct.rewards.redeemTitle"),
            text: t("acct.rewards.redeemBody").replace("{n}", String(REDEEM_BLOCK)).replace("{amount}", formatPrice(GEL_PER_BLOCK)),
          },
          {
            icon: "🚀",
            title: t("acct.rewards.levelUpTitle"),
            text: t("acct.rewards.levelUpBody").replace("{n}", String(Math.round((settings.loyaltyGoldMultiplier - 1) * 100))),
          },
        ].map((c) => (
          <div key={c.title} className="bg-white rounded-2xl border border-[#DDD5CC] p-5">
            <span className="text-2xl block mb-2">{c.icon}</span>
            <p className="font-extrabold text-[#2A2320] text-sm mb-1">{c.title}</p>
            <p className="text-xs text-[#5E5450] leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>

      {/* ── Tiers ── */}
      <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6 mb-6">
        <h2 className="font-extrabold text-[#2A2320] mb-5">{t("acct.rewards.membershipTiers")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tiersFromSettings(settings).map((tr) => {
            const active = tr.id === tier.id;
            return (
              <div
                key={tr.id}
                className={`rounded-2xl border-2 p-5 transition-colors ${
                  active ? "border-[#5E9E8C] bg-[#EAF2F0]" : "border-[#DDD5CC]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{tr.emoji}</span>
                  {active && (
                    <span className="text-[10px] font-bold text-white bg-[#5E9E8C] px-2 py-0.5 rounded-full uppercase">
                      {t("acct.rewards.yourTier")}
                    </span>
                  )}
                </div>
                <p className="font-extrabold text-[#2A2320]">{tierName(tr.id, t)}</p>
                <p className="text-[11px] text-[#9A8E88] font-semibold mb-3">
                  {tr.threshold === 0
                    ? t("acct.rewards.everyoneStarts")
                    : t("acct.rewards.lifetimePointsPlus").replace("{n}", tr.threshold.toLocaleString())}
                </p>
                <ul className="space-y-1.5">
                  {tr.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-1.5 text-xs text-[#5E5450]">
                      <span className="text-[#5E9E8C] font-bold flex-shrink-0">✓</span>
                      {perkLabel(perk, t)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── History ── */}
      <div className="bg-white rounded-2xl border border-[#DDD5CC] p-6">
        <h2 className="font-extrabold text-[#2A2320] mb-5">{t("acct.rewards.pointsHistory")}</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl block mb-3">🐣</span>
            <p className="font-bold text-[#2A2320] mb-1">{t("acct.rewards.noPointsYet")}</p>
            <p className="text-sm text-[#5E5450] mb-5">
              {t("acct.rewards.placeFirstOrder")}
            </p>
            <Link
              href="/products"
              className="inline-block font-bold px-6 py-2.5 rounded-full text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#5E9E8C" }}
            >
              {t("acct.rewards.startShopping")} →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F0EB]">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${
                    tx.reason === "return" ? "bg-[#FDEDE8]" : tx.delta > 0 ? "bg-[#EAF2F0]" : "bg-[#FFF4E8]"
                  }`}
                >
                  {tx.reason === "return" ? "↩️" : tx.delta > 0 ? "⭐" : "💸"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#2A2320]">
                    {tx.reason === "return"
                      ? t("acct.rewards.returnAdjustment")
                      : tx.delta > 0 ? t("acct.rewards.pointsEarned") : t("acct.rewards.pointsRedeemed")}
                    {tx.orderNumber && (
                      <span className="text-[#9A8E88] font-semibold"> · {tx.orderNumber}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-[#9A8E88]">
                    {fmtDate(tx.date, locale, "short")}
                  </p>
                </div>
                <span
                  className={`font-extrabold text-sm flex-shrink-0 ${
                    tx.delta > 0 ? "text-[#5E9E8C]" : "text-[#D97706]"
                  }`}
                >
                  {tx.delta > 0 ? "+" : ""}{tx.delta.toLocaleString()} {t("acct.rewards.pts")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
