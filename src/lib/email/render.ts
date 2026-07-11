/**
 * Shared branded HTML wrapper for outgoing transactional emails (order/
 * return confirmations, status updates, contact form). Resend accepts both
 * `text` and `html` — every send includes both; `text` stays the source of
 * truth (already built per-locale in orderMessages.ts) and this just wraps
 * it for clients that render HTML. Table layout + inline styles only, since
 * many email clients strip <style> tags and ignore flexbox/grid.
 */

/** Shared sender for every transactional email. The loov.ge domain is
 *  verified in Resend, so mail goes out from the brand address — overridable
 *  via env for testing without touching code. */
export const EMAIL_FROM = process.env.RESEND_FROM || "Loov <orders@loov.ge>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain-text body (\n\n paragraph breaks, as built by orderMessages.ts) → HTML paragraphs. */
function bodyToHtml(body: string): string {
  return body
    .split("\n\n")
    .map((para) => `<p style="margin:0 0 16px;">${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Wrap a plain-text email body in the branded Loov HTML shell. */
export function renderEmailHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#F5F0EB; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0EB; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:20px; overflow:hidden; border:1px solid #DDD5CC;">
            <tr>
              <td style="background-color:#5E9E8C; padding:22px 32px; text-align:center;">
                <span style="font-size:20px; font-weight:800; color:#ffffff; letter-spacing:0.5px;">🌿 Loov</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 28px;">
                <div style="font-size:14px; line-height:1.65; color:#2A2320;">
                  ${bodyToHtml(body)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#F5F0EB; padding:16px 32px; text-align:center; border-top:1px solid #EDE5D8;">
                <p style="margin:0; font-size:11px; color:#9A8E88;">© ${new Date().getFullYear()} Loov · Tbilisi, Georgia</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
