"use client";

/**
 * "Picked for your little one" — homepage personalization (FAZ 7).
 *
 * Signed-in parents who saved their baby's birth date see products that have
 * a size FITTING the baby's current age (or the next size up, room to grow).
 * A mom of a 3-month-old never gets newborn sets pushed at her.
 *
 * Hydration-safe: renders null on the server, on the first client render,
 * for guests and when there's no birthdate — SSR and first paint match.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useProductPool } from "@/lib/db/useProductSearch";
import { fetchMyProfile } from "@/lib/db/profile";
import { monthsOld, productFitsAge, ageLabel } from "@/lib/babyAge";
import { hasAnyStock } from "@/lib/stock";
import ProductCard from "@/components/ProductCard";

export default function BabyPicksSection() {
  const { user } = useAuth();
  const { products } = useProductPool(200);
  const [babyName, setBabyName] = useState<string | null>(null);
  const [months, setMonths] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setMonths(null); return; }
    let cancelled = false;
    fetchMyProfile().then(({ profile }) => {
      if (cancelled || !profile?.babyBirthdate) return;
      const m = monthsOld(profile.babyBirthdate);
      if (m === null || m > 48) return; // beyond the catalog's size range
      setBabyName(profile.babyName);
      setMonths(m);
    });
    return () => { cancelled = true; };
  }, [user]);

  if (months === null) return null;

  const picks = products
    .filter((p) => productFitsAge(p, months) && hasAnyStock(p))
    .slice(0, 8);
  if (picks.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="text-[11px] font-bold text-[#5E9E8C] uppercase tracking-widest mb-1">
            ✨ Picked for your little one
          </p>
          <h2 className="text-2xl font-extrabold text-[#2A2320]">
            For {babyName || "your little one"} · {ageLabel(months)}
          </h2>
          <p className="text-sm text-[#9A8E88] mt-1">
            Only styles available in the right size today.
          </p>
        </div>
        <Link href="/products" className="text-sm font-bold text-[#5E9E8C] hover:underline">
          Browse all →
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {picks.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
