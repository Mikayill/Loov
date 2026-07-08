"use client";

import { useSettings } from "@/lib/db/useSettings";

/**
 * Footer phone line — reads the business number from store settings
 * (admin → Settings → WhatsApp number). Renders nothing until a real
 * number is configured, so no placeholder ever ships to customers.
 * Client component on purpose: keeps the (server) root layout free of a
 * per-request settings query.
 */
export default function FooterPhone() {
  const { whatsappNumber } = useSettings();
  if (!whatsappNumber) return null;
  return (
    <div className="min-w-0">
      <a href={`tel:+${whatsappNumber}`} className="flex items-start gap-1.5 hover:text-[#5E9E8C] transition-colors">
        <span className="flex-shrink-0">📞</span> +{whatsappNumber}
      </a>
    </div>
  );
}
