/**
 * Returns — shared types + business rules (FAZ 6).
 *
 * The 14-day window implements the withdrawal right for distance contracts
 * under the Georgian Law on the Protection of Consumer Rights (2022).
 * Refunds are paid by bank transfer to the IBAN the customer provides;
 * an approved return is collected by courier from the delivery address.
 */

export type ReturnStatus =
  | "requested"
  | "approved"
  | "received"
  | "refunded"
  | "rejected"
  | "cancelled";

export type ReturnReason =
  | "wrong_size"
  | "damaged"
  | "not_as_described"
  | "wrong_item"
  | "changed_mind"
  | "other";

export interface ReturnItem {
  product_id: string | null;
  product_name: string;
  quantity: number;
  /** Unit price actually charged (copied from order_items — already discounted). */
  price: number;
  color: string | null;
  size: string | null;
}

export interface ReturnRecord {
  id: string;
  return_number: string;
  order_id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  locale: string;
  status: ReturnStatus;
  items: ReturnItem[];
  reason: ReturnReason;
  description: string | null;
  photos: string[];
  iban: string;
  refund_amount: number;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export const RETURN_WINDOW_DAYS = 14;

/** A photo is proof for claims about the item; optional for change-of-mind. */
export const RETURN_REASONS: { code: ReturnReason; label: string; photoRequired: boolean }[] = [
  { code: "wrong_size",        label: "Wrong size / doesn't fit",       photoRequired: false },
  { code: "damaged",           label: "Arrived damaged or defective",   photoRequired: true },
  { code: "not_as_described",  label: "Not as described / pictured",    photoRequired: true },
  { code: "wrong_item",        label: "Received the wrong item",        photoRequired: true },
  { code: "changed_mind",      label: "Changed my mind",                photoRequired: false },
  { code: "other",             label: "Other",                          photoRequired: false },
];

export function reasonMeta(code: string) {
  return RETURN_REASONS.find((r) => r.code === code);
}

/** Valid admin/customer transitions. Terminal states have no outgoing edges. */
export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected", "cancelled"], // cancelled = customer only
  approved:  ["received", "rejected"],
  received:  ["refunded", "rejected"],
  refunded:  [],
  rejected:  [],
  cancelled: [],
};

/** Statuses that block opening another return on the same order. */
export const ACTIVE_RETURN_STATUSES: ReturnStatus[] = ["requested", "approved", "received"];

export const returnStatusConfig: Record<ReturnStatus, { bg: string; text: string; dot: string; label: string }> = {
  requested: { bg: "#FFF8E8", text: "#A06820", dot: "#D89830", label: "Requested" },
  approved:  { bg: "#EAF0F8", text: "#2A5A8E", dot: "#4A7AC0", label: "Approved" },
  received:  { bg: "#F3EDFB", text: "#6B4A9E", dot: "#8E6AC8", label: "Received" },
  refunded:  { bg: "var(--color-accent-soft)", text: "var(--color-accent-deep)", dot: "var(--color-accent)", label: "Refunded" },
  rejected:  { bg: "#FEF2F2", text: "#B03A3A", dot: "#DC4A4A", label: "Rejected" },
  cancelled: { bg: "#F2EFEB", text: "#7A7068", dot: "#9A8E88", label: "Cancelled" },
};

/** End of the return window: delivery date (fallback: order date) + 14 days. */
export function returnWindowEndsAt(deliveredAt: string | null | undefined, createdAt: string): Date {
  const base = new Date(deliveredAt || createdAt);
  const end = new Date(base);
  end.setDate(end.getDate() + RETURN_WINDOW_DAYS);
  return end;
}

/** Rough Georgian IBAN check: "GE" + 2 digits + 2 letters + 16 digits (22 chars). */
export function isValidGeorgianIban(raw: string): boolean {
  const s = raw.replace(/\s/g, "").toUpperCase();
  return /^GE\d{2}[A-Z]{2}\d{16}$/.test(s);
}
