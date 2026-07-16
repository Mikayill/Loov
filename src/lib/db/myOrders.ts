/**
 * Customer order history — reads the signed-in user's REAL orders from
 * Supabase (browser client; RLS "orders_select_own" limits rows to their own).
 *
 * Rows are mapped into the `MockOrder` shape the order pages already render,
 * so the UI needed no redesign when mock data was replaced.
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MockOrder, OrderItem, OrderStatus } from "@/lib/orderTypes";
import { products } from "@/lib/products";

interface OrderItemRow {
  product_id: string | null;
  product_name: string | null;
  price: number;
  quantity: number;
  color: string | null;
  size: string | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  delivered_at?: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  shipping_method: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  order_items: OrderItemRow[];
}

/** DB status (lowercase) → UI status badge. */
function mapStatus(s: string): OrderStatus {
  switch (s) {
    case "delivered":  return "Delivered";
    case "shipped":    return "Shipped";
    case "cancelled":  return "Cancelled";
    case "pending":    return "Pending";
    case "processing": return "Processing";
    default:            return "Pending"; // unknown raw status → safest is "not started yet"
  }
}

function mapItem(row: OrderItemRow): OrderItem {
  /* Emoji, card colour and slug come from the catalog (not stored per order). */
  const product = products.find((p) => p.id === row.product_id);
  return {
    productId: row.product_id,
    name: row.product_name ?? product?.name ?? "Product",
    emoji: product?.emoji ?? "🍼",
    cardColor: product?.cardColor ?? "#EAE4DC",
    color: row.color ?? "—",
    size: row.size ?? "—",
    qty: row.quantity,
    price: Number(row.price),
    slug: product?.slug ?? "",
  };
}

function mapOrder(row: OrderRow): MockOrder {
  return {
    id: row.order_number,
    date: row.created_at,
    deliveredAt: row.delivered_at ?? undefined,
    status: mapStatus(row.status),
    cancellable: row.status === "pending",
    items: (row.order_items ?? []).map(mapItem),
    total: Number(row.total),
    address: [row.street, row.district].filter(Boolean).join(", "),
    city: row.city ?? "",
    phone: row.phone ?? "",
    shipping: row.shipping_method === "express" ? "express" : "standard",
    shippingCost: row.shipping != null ? Number(row.shipping) : undefined,
    payment: "Cash on Delivery",
  };
}

const SELECT = "id, order_number, status, created_at, street, city, district, phone, shipping_method, subtotal, shipping, total, order_items(product_id, product_name, price, quantity, color, size)";
/* delivered_at only exists after supabase/returns.sql — queried with a
 * fallback so order history keeps working on an un-migrated database. */
const SELECT_WITH_DELIVERED = `${SELECT.replace("created_at,", "created_at, delivered_at,")}`;

/** All orders of the signed-in user, newest first. [] for guests/errors. */
export async function fetchMyOrders(): Promise<MockOrder[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    let res = await supabase
      .from("orders")
      .select(SELECT_WITH_DELIVERED)
      .order("created_at", { ascending: false });
    if (res.error && /delivered_at/i.test(res.error.message)) {
      res = (await supabase
        .from("orders")
        .select(SELECT)
        .order("created_at", { ascending: false })) as typeof res;
    }
    if (res.error) throw res.error;
    return ((res.data ?? []) as unknown as OrderRow[]).map(mapOrder);
  } catch (e) {
    console.warn("[myOrders] fetch failed:", (e as Error).message);
    return [];
  }
}

/**
 * Guest order tracking — calls the `track_order` SECURITY DEFINER function
 * (supabase/track-order.sql). Requires BOTH the order number and the email
 * used at checkout; returns only non-sensitive fields.
 */
export async function trackOrder(
  orderNumber: string,
  email: string
): Promise<MockOrder | "unavailable" | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("track_order", {
      p_order_number: orderNumber,
      p_email: email,
    });
    if (error) {
      /* Function not created yet (supabase/track-order.sql not run). */
      if (/track_order/.test(error.message)) {
        console.warn("[trackOrder] run supabase/track-order.sql in the SQL editor");
        return "unavailable";
      }
      throw error;
    }
    if (!data) return null;
    const row = data as {
      order_number: string;
      status: string;
      created_at: string;
      shipping_method: string | null;
      city: string | null;
      total: number;
      items: OrderItemRow[];
    };
    return {
      id: row.order_number,
      date: row.created_at,
      status: mapStatus(row.status),
      items: (row.items ?? []).map(mapItem),
      total: Number(row.total),
      address: "",           // intentionally not returned to guests
      city: row.city ?? "",
      phone: "",             // intentionally not returned to guests
      shipping: row.shipping_method === "express" ? "express" : "standard",
      payment: "Cash on Delivery",
    };
  } catch (e) {
    console.warn("[trackOrder] failed:", (e as Error).message);
    return "unavailable";
  }
}

/** One order by its human-readable number (must belong to the user via RLS). */
export async function fetchMyOrder(orderNumber: string): Promise<MockOrder | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    let res = await supabase
      .from("orders")
      .select(SELECT_WITH_DELIVERED)
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (res.error && /delivered_at/i.test(res.error.message)) {
      res = (await supabase
        .from("orders")
        .select(SELECT)
        .eq("order_number", orderNumber)
        .maybeSingle()) as typeof res;
    }
    if (res.error) throw res.error;
    return res.data ? mapOrder(res.data as unknown as OrderRow) : null;
  } catch (e) {
    console.warn("[myOrders] fetch failed:", (e as Error).message);
    return null;
  }
}
