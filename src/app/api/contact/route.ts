/**
 * /api/contact — the "Send a Message" form on /contact.
 *
 * Validates + rate-limits, then emails the store inbox via Resend using the
 * same fetch pattern as order confirmations. The customer's address goes in
 * reply_to so the owner can answer directly from their mail client.
 *
 * Anti-abuse: same-origin check (CSRF), honeypot field ("website" must stay
 * empty — bots fill it), and a small in-memory rate limit per IP (best-effort;
 * resets on redeploy, which is fine for a contact form).
 */
import { NextRequest, NextResponse } from "next/server";
import { renderEmailHtml, EMAIL_FROM } from "@/lib/email/render";

export const dynamic = "force-dynamic";

const MAX_PER_WINDOW = 3;
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  // Keep the map from growing unbounded.
  if (hits.size > 1000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

export async function POST(req: NextRequest) {
  // Same-origin (CSRF) guard, matching /api/orders.
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many messages — please wait a minute and try again." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 100);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const subject = String(body.subject ?? "").trim().slice(0, 120);
  const message = String(body.message ?? "").trim().slice(0, 2000);
  const honeypot = String(body.website ?? "");

  // Bots fill every field — humans never see this one.
  if (honeypot) return NextResponse.json({ ok: true });

  if (!name || !subject) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (message.length < 10) return NextResponse.json({ error: "Message is too short" }, { status: 400 });

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[contact] RESEND_API_KEY missing — message not delivered:", { name, email, subject });
    return NextResponse.json({ error: "Messaging is temporarily unavailable." }, { status: 503 });
  }

  // Store inbox — override with CONTACT_INBOX once the domain is verified.
  // (Resend sandbox only delivers to the account owner's address anyway.)
  const inbox = process.env.CONTACT_INBOX || "mikayilismayilovgeo@gmail.com";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [inbox],
        reply_to: email,
        subject: `[Contact] ${subject} — ${name}`,
        text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
        html: renderEmailHtml(`From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`),
      }),
    });
    if (!res.ok) {
      console.error("[contact] Resend error:", res.status, await res.text());
      return NextResponse.json({ error: "Could not send your message — please try again later." }, { status: 502 });
    }
  } catch (e) {
    console.error("[contact] send failed:", e);
    return NextResponse.json({ error: "Could not send your message — please try again later." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
