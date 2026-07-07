export type Season = "all" | "spring" | "summer" | "autumn" | "winter";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category:
    | "body" | "blanket" | "set" | "towel" | "romper" | "bag"
    | "bathrobe" | "pajama" | "dress" | "pants" | "outerwear"
    | "shoes" | "socks" | "hat" | "bib" | "toy" | "accessory";
  colors: string[];
  sizes: string[];
  emoji: string;
  cardColor: string;
  isNew?: boolean;
  stock?: number;
  imageUrl?: string;
  /** Full photo gallery (first one is the primary/thumbnail). */
  imageUrls?: string[];
  /** Percentage discount, 0/undefined = no discount. */
  discountPercent?: number;
  /** Season the item belongs to — drives filtering + seasonal ordering. */
  season?: Season;
  /** Colors available per size, e.g. { "0-3 Months": ["White", "Sage"] }.
   *  A size absent from the map means all product colors are available. */
  sizeColors?: Record<string, string[]>;
  /** Per-size base prices, e.g. { "90×90 cm": 48 }. A size absent from the
   *  map uses `price`. Discounts apply on top of the size price. */
  sizePrices?: Record<string, number>;
  /** Normalized fabric slug (cotton/muslin/bamboo/terry/…) — drives filtering. */
  fabric?: string;
  /** Editable highlight bullets on the Description tab. */
  features?: string[];
  /** Materials & Care tab — all optional; page falls back to default copy. */
  material?: string;
  weight?: string;
  certification?: string;
  origin?: string;
  careInstructions?: string[];
  /** ISO timestamp the product was created (for the auto "New" badge). */
  createdAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  /** Set when added via "Add Bundle to Cart" — which bundle it came from.
   *  Part of the item's identity (a bundle's bodysuit and a standalone one
   *  of the same color/size must NOT merge, or the bundle-match check in
   *  `src/lib/bundlePricing.ts` breaks). */
  bundleSlug?: string;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, color: string, size: string, qty?: number, bundleSlug?: string) => void;
  removeItem: (productId: string, color: string, size: string, bundleSlug?: string) => void;
  updateQuantity: (productId: string, color: string, size: string, quantity: number, bundleSlug?: string) => void;
  clearCart: () => void;
  totalItems: number;
  /** Plain per-product sum — NOT bundle-aware. Used only where a rough total
   *  is fine (e.g. the navbar badge). Cart/checkout/server totals use
   *  `priceCartWithBundles` instead — don't "fix" this into a bundle-aware
   *  total, it would double-apply the bundle discount wherever both are shown. */
  totalPrice: number;
}
