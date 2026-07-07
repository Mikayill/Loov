"use client";

import { useWishlist } from "@/context/WishlistContext";

export default function WishlistButton({ productId }: { productId: string }) {
  const { has, toggle } = useWishlist();
  const liked = has(productId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 ${
        liked
          ? "bg-red-400 text-white scale-110"
          : "bg-white/80 backdrop-blur-sm text-[#9A8E88] hover:bg-white hover:text-red-400 hover:scale-110"
      }`}
    >
      <svg
        className="w-4 h-4"
        fill={liked ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}
