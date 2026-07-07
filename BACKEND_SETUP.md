# Loov — Backend Setup (Phase 2)

The **UI is complete and runs today** (`npm run dev`). To make the site *fully*
operational (real accounts, orders, email/SMS), connect the seams below.

## What's already installed / prepared (code side)
- `@supabase/supabase-js`, `@supabase/ssr` — installed.
- `src/lib/supabase/client.ts` / `server.ts` — ready-to-use Supabase clients (safe: they throw a clear message until env is set).
- `.env.local.example` — copy to `.env.local` and fill in.
- Order confirmation message templates (EN/KA/RU) — `src/lib/i18n/orderMessages.ts` (already previewed on the checkout success screen).
- Clean integration points (mock → real):
  | Feature | File / function to wire |
  |---|---|
  | Auth | `src/context/AuthContext.tsx` (each method has a `// TODO: Supabase` marker) |
  | Products / stock | `src/lib/products.ts` → Supabase DB |
  | Create order | `src/app/checkout/CheckoutClient.tsx` → `handlePlaceOrder()` |
  | Order history / tracking | `src/lib/mockOrders.ts` → DB |
  | Email / SMS | send `buildOrderMessage(locale, …)` from a Route Handler |
  | CSRF | `src/lib/csrf.ts` — backend must validate the token |

## What YOU need to do (outside the terminal — I can't do these)
1. **Create a Supabase project** → https://supabase.com (free tier is fine).
2. Copy **Project URL** + **anon key** (Settings → API) into `.env.local`
   (`cp .env.local.example .env.local`).
3. Create DB tables: `products`, `orders`, `order_items`, `addresses`, `profiles`.
   (Ask me and I'll generate the SQL schema + migrations.)
4. Enable Auth providers you want (Email, Google, Facebook, Phone/OTP) in
   Supabase → Authentication → Providers (each needs its own OAuth credentials).
5. **Email**: create a Resend account (https://resend.com), verify your domain,
   put `RESEND_API_KEY` in `.env.local`.
6. **SMS**: create a Twilio (or local GE provider) account, add the credentials.
7. **Real content** (not code): WhatsApp number, `hello@loov.ge` email, phone
   `+995…`, and real product photos.
8. **Phase 3 – Payments**: Bank of Georgia / TBC merchant accounts.

## Editor extensions (recommended, optional)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **Prettier** (`esbenp.prettier-vscode`)
There is no required extension — the project builds and runs without any.

## Honest status
- ✅ Frontend/UI: complete, secure, builds clean, ready to connect.
- ⏳ Backend: needs the accounts + keys above. Once `.env.local` is filled and
  the DB schema is created, we wire the mock functions to Supabase and it's live.
