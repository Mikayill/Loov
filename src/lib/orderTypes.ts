export type OrderStatus = "Delivered" | "Shipped" | "Processing" | "Cancelled";

export interface OrderItem {
  /** DB product id — needed to match items when opening a return. */
  productId?: string | null;
  name: string;
  emoji: string;
  cardColor: string;
  color: string;
  size: string;
  qty: number;
  price: number;
  slug: string;
}

export interface MockOrder {
  id: string;
  date: string;
  /** When the order was marked delivered — starts the 14-day return window. */
  deliveredAt?: string;
  status: OrderStatus;
  /** True only while the raw DB status is exactly "pending" — the customer
   *  can still cancel before anything is prepared/shipped. */
  cancellable?: boolean;
  items: OrderItem[];
  total: number;
  address: string;
  city: string;
  phone: string;
  shipping: "standard" | "express";
  /** Shipping cost actually charged (from the DB). Undefined for guest tracking. */
  shippingCost?: number;
  payment: string;
  trackingNumber?: string;
}

/* Order history and tracking read real orders from Supabase
 * (src/lib/db/myOrders.ts). The types + status styling below are shared
 * by those pages. */

export const statusConfig: Record<OrderStatus, { bg: string; text: string; dot: string; label: string }> = {
  Delivered:  { bg: "var(--color-accent-soft)", text: "var(--color-accent-deep)", dot: "var(--color-accent)", label: "Delivered" },
  Shipped:    { bg: "#EAF0F8", text: "#2A5A8E", dot: "#4A7AC0", label: "Shipped" },
  Processing: { bg: "#FFF8E8", text: "#A06820", dot: "#D89830", label: "Processing" },
  Cancelled:  { bg: "#FEF2F2", text: "#B03A3A", dot: "#DC4A4A", label: "Cancelled" },
};
