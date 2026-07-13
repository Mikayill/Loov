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
  /** Per-(size, color) stock counts, e.g. { "0-3 Months": { "White": 4 } }.
   *  A (size, color) pair absent from the map means the admin hasn't set a
   *  per-variant count yet — falls back to `stock` (see src/lib/stock.ts). */
  stockByVariant?: Record<string, Record<string, number>>;
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
  /** epoch ms of the last add/quantity-change to this line — drives the
   *  tombstone-aware cross-device merge in src/lib/cartMerge.ts. Missing on
   *  carts saved before that feature shipped; treated as 0 (always loses to
   *  a freshly-stamped edit) so old data can never clobber new. */
  updatedAt?: number;
}

/** Result of a stock-clamped cart write — every caller can tell whether the
 *  full requested quantity actually made it in, and show its own feedback. */
export interface CartAddResult {
  /** Quantity actually in the cart for this line after the call. */
  added: number;
  /** True if stock capped the request below what was asked for. */
  maxReached: boolean;
  /** Real remaining stock for this (size, color) at call time; null = unlimited. */
  available: number | null;
}

/** Fires whenever a clamp happens, so CartToast can show a warning — a new
 *  `ts` on every occurrence (even if name/available repeat) re-triggers it. */
export interface MaxReachedNotice {
  name: string;
  available: number;
  ts: number;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, color: string, size: string, qty?: number, bundleSlug?: string) => CartAddResult;
  removeItem: (productId: string, color: string, size: string, bundleSlug?: string) => void;
  updateQuantity: (productId: string, color: string, size: string, quantity: number, bundleSlug?: string) => CartAddResult;
  clearCart: () => void;
  totalItems: number;
  /** Plain per-product sum — NOT bundle-aware. Used only where a rough total
   *  is fine (e.g. the navbar badge). Cart/checkout/server totals use
   *  `priceCartWithBundles` instead — don't "fix" this into a bundle-aware
   *  total, it would double-apply the bundle discount wherever both are shown. */
  totalPrice: number;
  /** Most recent stock-clamp event, for CartToast's warning variant. */
  maxReachedNotice: MaxReachedNotice | null;
}
