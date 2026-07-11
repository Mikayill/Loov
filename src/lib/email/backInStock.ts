/**
 * Back-in-stock notifier. Called from the admin products API after a restock:
 * emails everyone on a product's waitlist and marks them notified. Best-effort
 * — a mail failure never blocks the admin's save, and the row stays un-notified
 * so it can retry on the next restock.
 */
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderEmailHtml, EMAIL_FROM } from "@/lib/email/render";
import type { Locale } from "@/lib/i18n/config";

type Admin = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

function copy(locale: string, name: string, url: string): { subject: string; body: string } {
  const L = (["en", "ka", "ru", "tr"] as Locale[]).includes(locale as Locale) ? locale : "en";
  switch (L) {
    case "ka":
      return {
        subject: `📦 ${name} ისევ მარაგშია!`,
        body: `გამარჯობა,\n\nკარგი ამბავი — „${name}" ისევ ხელმისაწვდომია Loov-ზე. სანამ ისევ გათავდება, დაუბრუნდით:\n${url}\n\nსიყვარულით,\nLoov-ს გუნდი`,
      };
    case "ru":
      return {
        subject: `📦 «${name}» снова в наличии!`,
        body: `Здравствуйте,\n\nХорошие новости — «${name}» снова доступен в Loov. Успейте, пока он в наличии:\n${url}\n\nС любовью,\nКоманда Loov`,
      };
    case "tr":
      return {
        subject: `📦 ${name} yeniden stokta!`,
        body: `Merhaba,\n\nGüzel haber — "${name}" Loov'da yeniden stokta. Tükenmeden yetişin:\n${url}\n\nSevgiyle,\nLoov Ekibi`,
      };
    default:
      return {
        subject: `📦 ${name} is back in stock!`,
        body: `Hi,\n\nGood news — "${name}" is available again at Loov. Grab it before it sells out:\n${url}\n\nWith love,\nThe Loov Team`,
      };
  }
}

async function sendMail(to: string, subject: string, body: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text: body, html: renderEmailHtml(body) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Email the waitlist for a product that just came back in stock. */
export async function notifyBackInStock(admin: Admin, productId: string): Promise<void> {
  try {
    const { data: waiting, error } = await admin
      .from("stock_notifications")
      .select("id, email, locale")
      .eq("product_id", productId)
      .is("notified_at", null);
    if (error || !waiting || waiting.length === 0) return; // table missing or nobody waiting

    const { data: product } = await admin
      .from("products")
      .select("name, slug")
      .eq("id", productId)
      .maybeSingle();
    const name = (product?.name as string) || "Your item";
    const url = `https://loov.ge/products/${product?.slug ?? productId}`;

    const sentIds: string[] = [];
    for (const row of waiting) {
      const { subject, body } = copy(String(row.locale ?? "en"), name, url);
      if (await sendMail(String(row.email), subject, body)) sentIds.push(row.id as string);
    }
    if (sentIds.length > 0) {
      await admin.from("stock_notifications").update({ notified_at: new Date().toISOString() }).in("id", sentIds);
    }
  } catch (e) {
    console.warn("[backInStock] notify failed:", (e as Error).message);
  }
}

/** Whether a raw product row has any purchasable stock (server twin of
 *  src/lib/stock.ts hasAnyStock, working on snake_case DB fields). */
export function rowHasAnyStock(row: {
  stock?: number | null;
  stock_by_variant?: Record<string, Record<string, number>> | null;
  colors?: string[] | null;
  sizes?: string[] | null;
}): boolean {
  const colors = row.colors ?? [];
  const sizes = row.sizes ?? [];
  if (colors.length === 0 || sizes.length === 0) {
    return row.stock == null || row.stock > 0;
  }
  for (const size of sizes) {
    for (const color of colors) {
      const v = row.stock_by_variant?.[size]?.[color];
      if (typeof v === "number") { if (v > 0) return true; }
      else if (row.stock == null || row.stock > 0) return true; // untracked combo → flat
    }
  }
  return false;
}
