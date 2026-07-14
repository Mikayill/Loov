"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types";
import { hasAnyStock } from "@/lib/stock";
import VariantPickerPopover from "./VariantPickerPopover";

export default function QuickAddButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [status, setStatus] = useState<"idle" | "added" | "blocked">("idle");
  const [pickerOpen, setPickerOpen] = useState(false);
  const soldOut = !hasAnyStock(product);
  /* Multiple colors/sizes → must ask which one before adding (was silently
     picking colors[0]/sizes[0] before — the "didn't even ask" bug). */
  const needsPicker = product.colors.length > 1 || (product.sizes.length > 1 && product.sizes[0] !== "One Size");

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    if (needsPicker) {
      setPickerOpen(true);
      return;
    }
    const result = addItem(product, product.colors[0], product.sizes[0], 1);
    if (result.added <= 0) {
      setStatus("blocked");
      setTimeout(() => setStatus("idle"), 1800);
      return;
    }
    setStatus("added");
    setTimeout(() => setStatus("idle"), 1800);
  }

  if (soldOut) {
    return (
      <span
        aria-label="Out of stock"
        title="Out of stock"
        className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 bg-panel text-ink-muted cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-label={status === "blocked" ? "Can't add more" : "Quick add to cart"}
        title={status === "blocked" ? "Can't add more" : undefined}
        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 flex-shrink-0 ${
          status === "added"
            ? "bg-accent text-white scale-110"
            : status === "blocked"
            ? "bg-red-500 text-white"
            : "bg-panel text-ink-soft hover:bg-accent hover:text-white hover:scale-110"
        }`}
      >
        {status === "added" ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : status === "blocked" ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )}
      </button>
      {needsPicker && (
        <VariantPickerPopover product={product} open={pickerOpen} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}
