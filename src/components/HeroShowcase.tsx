"use client";

/**
 * Homepage hero showcase — the visual half of the hero.
 *
 * Products come from the admin setting `heroSlugs` (Settings → Hero showcase);
 * with one product it's a static rich card, with several it auto-advances
 * every 5s with a smooth leftward slide. The endless-left illusion uses the
 * classic clone trick: the first slide is repeated at the end, and when the
 * track lands on the clone it snaps back to the real first slide without a
 * transition.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { discountPercent, effectivePrice } from "@/lib/pricing";
import { useLocale } from "@/context/LocaleContext";
import { categoryLabel } from "@/lib/i18n/labels";
import { Stars, DealCountdown } from "./ProductCard";

const SLIDE_MS = 5000;
const ANIM_MS = 700;

function Slide({ product }: { product: Product }) {
  const { t } = useLocale();
  const off = discountPercent(product);
  const price = effectivePrice(product);
  return (
    <Link
      href={`/products/${product.slug}`}
      className="relative w-full flex-shrink-0 h-full flex items-center justify-center group"
      style={{
        background: `linear-gradient(155deg, ${product.cardColor}55, var(--color-panel))`,
      }}
    >
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <span className="text-[110px] select-none group-hover:scale-105 transition-transform duration-500">
          {product.emoji}
        </span>
      )}

      {product.isNew && (
        <span className="absolute top-5 left-5 bg-canvas/90 text-accent text-[10px] font-bold px-2.5 py-1 rounded-control uppercase tracking-[0.14em]">
          {t("product.new")}
        </span>
      )}
      {off > 0 && (
        <span className="absolute top-5 right-5 bg-canvas/90 text-danger text-[11px] font-extrabold px-2.5 py-1 rounded-control tracking-[0.06em]">
          −{off}%
        </span>
      )}

      {/* Rich info card */}
      <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:min-w-[290px] sm:max-w-[360px] bg-canvas/95 backdrop-blur-sm border border-line rounded-card px-4 py-3.5 transition-colors group-hover:border-ink">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted font-semibold">
            {categoryLabel(product.category, t)}
          </span>
          <Stars rating={product.rating} />
        </div>
        <p className="text-[15px] font-bold text-ink mt-1 leading-snug line-clamp-1">
          {product.name}
        </p>
        <div className="flex items-center justify-between gap-3 mt-1.5">
          <span className="flex items-baseline gap-2">
            <span className={`text-[17px] font-bold tabular-nums ${off > 0 ? "text-danger" : "text-ink"}`}>
              {formatPrice(price)}
            </span>
            {off > 0 && (
              <span className="text-[12px] text-ink-muted line-through tabular-nums">
                {formatPrice(product.price)}
              </span>
            )}
            {off > 0 && <DealCountdown product={product} />}
          </span>
          <span className="w-7 h-7 rounded-control bg-ink text-white flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HeroShowcase({ products }: { products: Product[] }) {
  const many = products.length > 1;
  /* Track position: 0..products.length (last index = the clone of slide 0). */
  const [pos, setPos] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const posRef = useRef(0);
  posRef.current = pos;

  /* Auto-advance — always leftward. Paused on hover; disabled entirely for
     reduced-motion users. */
  useEffect(() => {
    if (!many) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (paused) return;
    const id = setInterval(() => {
      setAnimate(true);
      setPos((p) => p + 1);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [many, paused, products.length]);

  /* When the track reaches the clone (index = length), wait for the slide
     animation to finish, then snap back to the real first slide silently. */
  useEffect(() => {
    if (!many || pos !== products.length) return;
    const id = setTimeout(() => {
      setAnimate(false);
      setPos(0);
      /* Re-enable transitions on the next frame so the snap stays invisible. */
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    }, ANIM_MS);
    return () => clearTimeout(id);
  }, [pos, many, products.length]);

  if (products.length === 0) return null;

  const activeDot = pos % products.length;

  return (
    <div
      className="relative hidden md:block border-l border-line min-h-[380px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${pos * 100}%)`,
          transition: animate ? `transform ${ANIM_MS}ms var(--ease-smooth)` : "none",
        }}
      >
        {products.map((p) => (
          <Slide key={p.slug} product={p} />
        ))}
        {/* Clone of the first slide — landing pad for the endless-left loop */}
        {many && <Slide key="__clone" product={products[0]} />}
      </div>

      {/* Progress dots */}
      {many && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {products.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              aria-label={p.name}
              onClick={() => { setAnimate(true); setPos(i); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeDot ? "w-5 bg-ink" : "w-1.5 bg-ink/25 hover:bg-ink/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
