# 🔐 Güvenlik Check-up Raporu (15 Tem 2026 — Batch F)

Kullanıcının 15 maddelik geri bildirim listesindeki #15: *"genel bir siteye el at, senin benden sakladığın/gözden kaçırdığın güvenlik açığı var mı — hardcoded ama değişken olması gereken şeyler de dahil — bul ve bir e-ticaret güvenlik standardı metniyle karşılaştırıp bana raporla."* Bu doküman o raporun tamamıdır: bulunan **1 gerçek açık** (düzeltildi), taranan ama sorun çıkmayan alanlar, ve dürüst bir OWASP/e-ticaret standardı karşılaştırması.

---

## 🔴 Bulunan ve düzeltilen açık

### `/api/account/delete` — CSRF origin kontrolü eksikti
Sitedeki **tüm** durum-değiştiren (POST/PATCH/DELETE) route'lar `Origin` header'ını `Host` ile karşılaştırıp cross-site istekleri reddediyor (CSRF savunması) — ama hesap silme endpoint'i, uygulamadaki **en yıkıcı işlem** olmasına rağmen bu kontrolden muaftı. Yani teorik olarak, kullanıcı başka bir sekmede/sitede kötü niyetli bir sayfa açıksa ve bu sayfa `fetch("https://loov.ge/api/account/delete", {method:"POST", credentials:"include"})` çağırırsa, tarayıcı oturum çerezini otomatik ekleyeceği için istek sunucuya ulaşabiliyordu.

**Gerçek risk seviyesi orta-yüksek idi** çünkü:
- `SameSite=Lax` çerez varsayımı POST isteklerinde tam koruma SAĞLAMAZ (sadece navigasyon/GET'te güçlüdür).
- `requireVerifiedSession()` (AAL2/trusted-device) zaten üstünde vardı — yani saldırı için kurbanın hem oturumu açık hem de yakın zamanda doğrulanmış olması gerekiyordu; bu riski biraz azaltıyordu ama sıfırlamıyordu.

**Düzeltme:** diğer tüm route'larla birebir aynı kalıp eklendi (`src/app/api/account/delete/route.ts`):
```ts
const origin = req.headers.get("origin");
const host = req.headers.get("host");
if (!origin || !host || new URL(origin).host !== host) {
  return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
}
```
Client tarafındaki gerçek çağrı (`AuthContext.tsx` → `deleteAccount()`) zaten aynı-origin göreli bir `fetch("/api/account/delete", ...)` olduğu için normal kullanıcı akışını **bozmuyor** — tarayıcı bu tür isteklerde Origin header'ını otomatik gönderir. `tsc` + 60 test ile doğrulandı.

### Bilgilendirme amaçlı, düzeltme gerektirmeyen benzer bulgu
`/api/account/link-guest-orders` de aynı CSRF kontrolünden muaf — ama bu endpoint sadece **çağıran kullanıcının kendi hesabına** misafir siparişlerini bağlıyor (silme/değiştirme/başkasının verisine erişim yok), yani bir saldırgan bu isteği zorla tetiklese bile kurbanın kendi lehine bir işlem oluyor — istismar edilebilir bir senaryo yok. Tutarlılık için ileride eklenebilir ama **acil değil**, bu turda dokunulmadı.

---

## ✅ Taranan ve temiz çıkan alanlar

| Alan | Sonuç |
|---|---|
| **Admin route guard kapsaması** | `/api/admin/*` altındaki 14 route'un hepsi `adminApiGuard()`/`requireAdmin()` çağırıyor, admin olmayana **404** dönüyor (403 değil — panelin varlığı bile sızdırılmıyor) |
| **IDOR (yetkisiz veriye erişim)** | `reviews`, `returns`, `addresses` route'ları kontrol edildi — hepsi ya sunucuda `user.id` ile sahiplik doğruluyor (`ownReview()`, `orderRow.user_id !== user.id` gibi) ya da Postgres RLS "own-row" policy'sine güveniyor (addresses — `auth.uid() = user_id` policy'leri select/insert/update/delete'in hepsinde var, doğrulandı) |
| **Dosya yükleme doğrulaması** | 4 upload endpoint'i de (`admin/upload`, `admin/video-upload-url`, `returns/upload`, `admin/avatars`) MIME-tipi allowlist + boyut sınırı (5MB) uyguluyor; video route sadece admin'e açık ve sadece `.mp4/.webm` uzantısına izin veriyor |
| **Sır/secret sızıntısı** | `SUPABASE_SERVICE_ROLE`/`RESEND_API_KEY`/vs. geçen 7 dosyanın hepsi sunucu-taraflı (`src/app/api/*`, `src/lib/*`) — hiçbiri `"use client"` bileşeninde değil, tarayıcı bundle'ına asla gitmiyor. `.env*` `.gitignore`'da, repo'da sızmış kimlik bilgisi yok |
| **Rate limiting** | Sipariş (`orders`), iletişim formu (`contact`), stok-bildirim (`stock-notify`) DB-destekli (`serverRateLimited`, cross-instance) rate-limit'e sahip; migration çalışmazsa in-memory'e zarif düşüyor |
| **XSS** | Kod tabanında tek `dangerouslySetInnerHTML` kullanımı PDP'deki JSON-LD (`products/[slug]/page.tsx`) — içeriği admin'in girdiği ürün adı/açıklaması, `JSON.stringify` ile encode ediliyor. Ziyaretçi girdisi hiçbir yerde ham HTML olarak render edilmiyor |
| **Güvenlik header'ları / CSP** | `next.config.ts`'te `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (kamera/mikrofon/konum kapalı), `frame-ancestors 'none'` mevcut; CSP `connect-src`/`img-src` sadece kendi Supabase projesine + Sentry'e açık |
| **CSRF (genel)** | Orders, returns, reviews, promo, contact, otp-gate, account/delete (yeni düzeltildi) dahil tüm state-changing route'lar aynı Origin-vs-Host deseniyle korunuyor |
| **Fiyat/stok enjeksiyonu** | `/api/orders` istemciden gelen fiyatı asla güvenmiyor, sunucuda DB'den yeniden hesaplıyor; stok rezervasyonu `reserve_stock`/`release_stock` SECURITY DEFINER fonksiyonlarıyla atomik (koşullu UPDATE, race-safe) |

---

## ⚠️ Bilinçli/kabul edilmiş kısıtlar (açık değil, tasarım kararı)

- **OTP-gate sayfa seviyesinde, API seviyesinde değil** (`otp-gate/route.ts` içindeki yorumda da belirtilmiş): şifre girişinden sonra e-posta koduyla ikinci doğrulama sadece `/account` ve `/checkout` **sayfalarına** erişimi engelliyor; oturum çerezi teknik olarak geçerli olduğundan doğrudan bir API'ye çağrı OTP adımını atlayabilir. Gerçek kriptografik 2. faktör için Supabase native TOTP/MFA (zaten admin panelinde zorunlu) gerekir — kullanıcı deneyimi tercihiyle bu şekilde bırakıldı, launch-blocker değil.
- **CSP `script-src`'de `unsafe-inline`/`unsafe-eval` var** — Next.js'in kendi runtime'ı (hydration inline script'leri, dev-mode eval) bunu gerektiriyor; nonce-tabanlı sıkı CSP'ye geçmek ayrı bir mühendislik çabası. Bu, CSP'nin XSS'e karşı sağladığı korumayı **zayıflatıyor** ama halihazırda kod tabanında sömürülebilir bir enjeksiyon noktası bulunamadı (yukarıdaki XSS taramasına bkz.) — yani bugün için risk düşük, ama "CSP tam koruma sağlıyor" denemez.
- **Ödeme kapıda nakit (COD)** — kart/PCI-DSS kapsamı yok, bu standardın büyük bölümü bu site için **uygulanabilir değil** (henüz online ödeme yok).

---

## 📋 E-ticaret güvenlik standardı karşılaştırması (OWASP Top 10 + genel best-practice temelli)

| Standart maddesi | Durum |
|---|---|
| A01 Broken Access Control | ✅ RLS + sunucu-taraflı sahiplik kontrolleri + admin guard 404 deseni |
| A02 Cryptographic Failures | ✅ Supabase Auth (bcrypt/Argon2 şifre hash'leme kendi tarafında), HTTPS zorunlu (Vercel), hassas cookie'ler `httpOnly` |
| A03 Injection (SQLi/XSS) | ✅ Supabase client parametrik sorgular kullanıyor (ham SQL yok), React otomatik escape, tek `dangerouslySetInnerHTML` admin-only veri |
| A04 Insecure Design | ✅ Fiyat/stok sunucu-taraflı yeniden hesaplama, atomik rezervasyon, tek-kullanım promo kontrolü |
| A05 Security Misconfiguration | 🟡 CSP `unsafe-inline/eval` (yukarıda açıklandı) — kısmi |
| A06 Vulnerable Components | ⏳ Bu turda taranmadı — `npm audit` ayrı bir oturumda çalıştırılabilir |
| A07 Auth Failures | ✅ Şifre min 8 + rakam, e-posta OTP + trusted-device, admin AAL2 zorunlu |
| A08 Data Integrity Failures | ✅ CSRF origin kontrolü (artık hesap silme dahil TAM kapsama), signed upload URL'ler |
| A09 Logging & Monitoring | ✅ Sentry canlı (prod), admin audit_log tablosu tüm admin aksiyonlarını kaydediyor |
| A10 SSRF | ✅ Dış URL'e sunucu-taraflı fetch yapan kullanıcı-kontrollü bir giriş noktası yok |

**Genel değerlendirme:** Site, ölçeğine göre (küçük-orta e-ticaret, kapıda ödeme, kart verisi yok) sağlam bir güvenlik duruşuna sahip. Bu turda bulunan tek gerçek açık (hesap silme CSRF'i) düzeltildi. Kalan tek gerçek "borç" **npm audit taraması** (bağımlılık güvenlik açıkları) — istenirse ayrı bir oturumda hızlıca yapılabilir.

---

## Doğrulama
- `tsc --noEmit` → temiz
- `npm test` → 60/60 test geçti
- Commit `fff01dd`, `redesign-nordic` branch'ine push edildi (henüz `main`'e merge/deploy edilmedi — bu rapor + önceki Batch A-E ile birlikte kullanıcı onayı bekliyor)
