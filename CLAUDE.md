@AGENTS.md

# Loov — Proje Durumu

## Proje Özeti
Gürcistan pazarına yönelik bebek/çocuk giyim e-ticaret sitesi.
**Tech:** Next.js 15 (App Router, TypeScript) + Tailwind CSS v4
**Para Birimi:** Gürcistan Larisi (₾)
**Tasarım:** Unisex pastel — primary `#5E9E8C` (sage teal), bg `#F5F0EB` (warm cream)
**Auth:** Mock (localStorage) — Supabase'e geçiş Faz 2'de

## 🌍 DEPLOY DURUMU (7-8 Tem 2026) — SİTE CANLIYA ÇIKTI, ŞİMDİLİK DURAKLATILDI
- **GitHub:** `https://github.com/Mikayill/Loov` (main branch, push → Vercel otomatik deploy). Git identity repo-local: Mike / mikayilismayilovgeo@gmail.com
- **Vercel:** proje adı `loov` (Pro trial). Env değişkenleri girildi (5 adet, tüm ortamlar). ⚠️ Dikkat: env değeri yapıştırırken çift yapıştırma kazası yaşandı (anon key ikiye katlanmıştı → tarayıcıda 401'ler; silip tek sefer yapıştırarak çözüldü)
- **Domain:** `loov.ge` (domenebi.ge'den alındı, 08.07.2027'ye kadar). Nameserver'lar Vercel'e taşındı (`ns1/ns2.vercel-dns.com`) → DNS artık VERCEL panelinden yönetiliyor (domenebi.ge'den DEĞİL). `loov.ge` → `www.loov.ge`'ye 308 redirect
- **⏸️ SİTE ŞU AN DURAKLATILDI:** kullanıcı domainleri Vercel projesinden Remove etti (loov.ge + www.loov.ge → 404). GERİ AÇMAK: Vercel → Settings → Domains → Add Domain → `loov.ge` (NS zaten Vercel'de, saniyeler içinde açılır). Standard Protection açık (vercel.app URL'i login istiyor)
- **Supabase Auth:** Site URL `https://loov.ge`, Redirect URLs'e `https://loov.ge/auth/callback` + `https://www.loov.ge/auth/callback` eklendi (www'lı olan Google girişi için ŞARTTI). localhost'lar duruyor
- **Resend:** `loov.ge` domaini eklendi, 4 DNS kaydı (DKIM/SPF-MX/SPF-TXT/DMARC) Vercel DNS'e girildi — doğrulama bekliyor/bekliyordu; doğrulanınca `onboarding@resend.dev` → `orders@loov.ge` geçişi yapılacak (route'larda TODO var)
- **PERFORMANS SORUNU (kısmen çözüldü):** site yavaştı. (1) 5 vitrin sayfası `force-dynamic`'ti → `revalidate = 60` yapıldı (commit 61eb743). (2) Vercel Functions bölgesi Frankfurt (fra1) seçildi — AMA YENİ DEPLOY GEREKİYOR (henüz tetiklenmedi, site duraklatıldığı için). (3) **ASIL DARBOĞAZ: Supabase projesi Sydney'de (`ap-southeast-2`)** — her DB sorgusu Avustralya'ya gidiyor. Kalıcı çözüm = Supabase'i Frankfurt'a taşımak (yeni proje + veri göçü, dikkatli planlanmalı, henüz yapılmadı)
- ~~**Sıradaki oturum:** buglar.md~~ → ✅ **8 Tem 2026'da TAMAMI işlendi** (bkz. aşağıdaki "🐛 BUGLAR.MD ONARIM TURU" bölümü). buglar.md dosyası cevaplarla işaretli duruyor

### 🐛 BUGLAR.MD ONARIM TURU (8 Tem 2026) — TAMAMLANDI (12 batch, batch başına commit)
- **Vitrin:** ana sayfa featured = tüm katalog, sezon sıralı (`sortBySeason` NİHAYET bağlandı) + recently-viewed kategorileri öne alan hafif kişiselleştirme; pill sayaçları kaldırıldı/kompakt; /products Load More 16'şar; "Explore All Products"; why-us şeridi silindi; bundles "Up to {n}% off" dinamik; **fabric backfill yapıldı** (DB'de script ile + statik fallback'te `fabricBySlug`) → fabric filtresi artık cotton/muslin/bamboo/terry/other
- **PDP:** share = belirgin buton + mobilde `navigator.share`; FOMO stok metinleri (pdp.thatsAll/onlyLeft); drawer Total text-2xl
- **Yorumlar:** min 10 karakter canlı sayaç; eligibility yüklenirken skeleton + hata→Retry (sahte "önce satın al" bitti); admin-hidden yorumda form yerine bilgi kutusu (API `eligibility.myReviewStatus` döner — 409 sürprizi bitti)
- **Wishlist:** düşük stok rozetleri + `WishlistContext.hasUrgency/lowStock/lowStockCount` → navbar kalp noktası (fiyat düşüşü VEYA düşük stok, pulse); "Add all to cart"
- **Dürüst içerik:** About ekip+stats kaldırıldı, hikâyedeki uydurma "kurucu Nino 2021" genelleştirildi; **GOTS/OEKO iddiaları yumuşatıldı** (footer rozetleri, announce, pdp.trustOrganic, sg.certNote, about values, contact.a3, faq.prod.a1, bundles, blog ürün iddiası — 4 dilde). PDP Certification kutusu sadece admin'de ürün-başına doluysa görünür. 📋 Gerçek ekip bilgisi + kuruluş yılı + gerçek belgeler gelince geri eklenecek
- **Contact GERÇEK:** `/api/contact` (origin+honeypot+in-memory rate limit 3/dk) → Resend ile owner'a, reply_to=müşteri. `CONTACT_INBOX` env ile değiştirilebilir. Canlı test edildi
- **WhatsApp tek kaynak:** `settings.whatsappNumber` (admin Settings kartı, sadece rakam) — WhatsAppButton/contact/FAQ/footer (`FooterPhone` client bileşeni) hepsi buradan; BOŞKEN HİÇBİRİ GÖRÜNMEZ (placeholder +995 000... tamamen silindi). Kullanıcı business numara alınca admin'den girecek
- **İade↔puan:** refund'da ledger düzeltmesi (kazanılan geri alınır + harcanan iade edilir, refund/total oranında, `reason:"return"`, sipariş başına idempotent). Points History'de "↩️ Return adjustment". "return" satırları lifetime'a SAYILMAZ (client+server) → tier düşmez
- **Tier ayarları:** `loyalty_silver/gold_threshold` + `loyalty_silver/gold_multiplier` settings'te; `tiersFor/tiersFromSettings/tierForAt` (loyalty.ts); RewardsClient + LoyaltyContext + /api/orders ayarı kullanır; perk metni çarpandan üretilir, `label.perk.bonusN` deseniyle çevrilir; admin Settings "Membership tiers" kartı
- **Timeline gerçek:** OrderDetail + track-order — created_at/status/delivered_at'ten; uydurma tarihler + "Payment Confirmed" silindi
- **Bildirim tercihi etkisi:** NewsletterPopup NİHAYET mount edildi (layout, StoreChromeGate içinde) + i18n'lendi (`news.*` ×4) + girişli kullanıcıda `promo=false` ise gösterilmiyor
- **Hesap silme koruması:** aktif sipariş (pending/processing/shipped) veya aktif iade varken 409 + lokalize mesaj
- **Adres defteri:** `supabase/addresses.sql` (RLS own-row, tek default partial unique) + `src/lib/db/addresses.ts` + AddressesClient DB CRUD (mock silindi) + **checkout'ta kayıtlı adres kartları** (default otomatik seçili, "farklı adres" + "defterime kaydet" checkbox). ⚠️ **addresses.sql HENÜZ ÇALIŞTIRILMADI — kullanıcı panelde çalıştıracak** (çalıştırılana dek zarif düşer, sayfada uyarı çıkar)
- **2FA CANLI:** Supabase TOTP — Security'de enroll (QR+secret→6 haneli kod), girişte AAL2 kod adımı (LoginClient), kapatma kod ister. AuthContext: `listTotpFactors/enrollTotp/verifyTotp/unenrollTotp/mfaRequired`. 💡 Supabase panelde Auth→MFA/TOTP açık olmalı (varsayılan açık)
- **Dil URL kararı:** /en /tr path-routing ERTELENDİ (çerez kalıyor) — ~40 sayfalık göç, ayrı oturumda değerlendirilecek (SEO için launch öncesi mantıklı)
- **Doğrulama:** `tsc` + `next build` temiz · 15 sayfa 200 · API guard'lar (contact origin 403, admin 404, delete 401) · 12 sayfa × 4 dil ham-anahtar sızıntısı SIFIR · contact maili canlı gitti
- **KALAN (bu turdan):** kullanıcı `supabase/addresses.sql` çalıştıracak · business WhatsApp numarası admin'den girilecek · gerçek ekip/kuruluş bilgisi eklenecek · yeni ka metinleri abla incelemesine dahil edilmeli (rev/news/sec.mfa/checkout.saved anahtarları)

---

## ✅ TAMAMLANAN ÖZELLİKLER

### Altyapı
- Next.js 15 App Router + TypeScript kurulumu
- Tailwind CSS v4 (`@theme` in globals.css, config yok)
- HTTP güvenlik header'ları (next.config.ts)
- Sitemap (`/sitemap.ts`) + Robots (`/robots.ts`)
- Metadata: OpenGraph, Twitter Card, keywords

### Bileşenler (Components)
- **Navbar** — sticky, dönüşümlü announcement bar (4 mesaj, 3.5s), arama ikonu, wishlist, dil seçici, user dropdown, mobil hamburger menü
- **SearchModal** — ürün arama, anlık filtre, kategori quick-filter pill'leri, son aramalar (localStorage, 5 adet), NEW badge, Escape ile kapanır
- **LanguageSwitcher** — EN / KA / RU / TR (çerez tabanlı, i18n Faz 1 CANLI — bkz. 🌐 i18n bölümü)
- **CategoryFilter** — kategori pill'leri + sort + fiyat filtresi + yaş filtresi (0-3m/3-6m/6-12m/1-2y/2y+) + renk filtresi + grid/liste görünümü toggle + Load More (8'er)
- **ProductCard** — emoji+renk, New badge, wishlist toggle, yıldız rating, QuickViewButton (hover), QuickAddButton (sepete hızlı ekle)
- **QuickAddButton** — ürün kartında, ilk renk/beden ile anında sepete ekler
- **QuickViewButton** — ürün kartında hover'da görünür, tam modal (renk/beden/qty/wishlist)
- **CartDrawer** — "Add to Cart" sonrası sağdan açılan mini sepet (custom DOM event ile tetiklenir)
- **WishlistButton** — server component içinde kullanılabilir client bileşen
- **MobileBottomNav** — sm:hidden, 4 tab (Home/Shop/Wishlist/Cart), badge'lar
- **SocialProofToast** — "Nino from Tbilisi just bought..." rotating toast, 9s gecikme, 28s interval, sol-alt köşe
- **NewsletterPopup** — 45s gecikme, sessionStorage (1x/session), "10% off first order", LOOV10 kodu
- **BackToTop** — scroll sonrası görünür, mobil nav ile çakışmaz
- **CookieConsent** — 1.5s gecikme, Accept/Decline, Privacy Policy linki
- **ReviewsSection** — ürüne göre deterministik yorumlar, rating breakdown barlar
- **RecentlyViewedSection** — localStorage tabanlı, son 4 ürünü gösterir, "Clear history" butonu
- **WhatsAppButton** — fixed sol-alt, WhatsApp green (#25D366), tooltip

### Sayfalar
| Sayfa | Durum |
|-------|-------|
| `/` Ana Sayfa | ✅ Hero + trust strip + kategori grid + 8 ürün + recently viewed + testimonials |
| `/products` Ürün Listesi | ✅ Filtre + sort + yaş + renk + fiyat + grid/liste toggle + Load More + sayaç |
| `/products/[slug]` Ürün Detay | ✅ Galeri + renk/beden/qty + stok + delivery estimate + loyalty points + paylaş + tabs + size guide modal + sticky CTA + reviews + recently viewed + "You Might Also Like" |
| `/cart` Sepet | ✅ Checkbox seçimi (Temu-style) + "Select All" + dinamik toplam + promo codes (LOOV10/YENIDOGAN/HEDIYE) + kargo progress + önerilen ürünler |
| `/checkout` Ödeme | ✅ 3 adım: Adres → İnceleme → Başarı + gift wrap toggle + mesaj alanı |
| `/wishlist` Favoriler | ✅ Kaydedilen ürünler + sepete ekle + Share butonu |
| `/account` Hesabım | ✅ Profil edit formu + stats + hızlı linkler |
| `/account/orders` Siparişlerim | ✅ 3 mock sipariş, durum badge'leri, "View Details" + "Buy Again" |
| `/account/orders/[id]` Sipariş Detay | ✅ Ürünler + timeline + özet + adres |
| `/account/addresses` Adreslerim | ✅ CRUD + Home/Work/Other etiketleri |
| `/account/notifications` Bildirimler | ✅ 6 toggle switch |
| `/account/security` Güvenlik | ✅ Şifre değiştirme + 2FA (Coming Soon) + hesap silme |
| `/login` Giriş | ✅ Google + Facebook + Email + Phone+OTP |
| `/register` Kayıt | ✅ Google + Facebook + Email + şifre güç |
| `/forgot-password` Şifremi Unuttum | ✅ Email → success state |
| `/blog` Journal | ✅ Featured makale + 7'li grid (8 makale toplam) |
| `/blog/[slug]` Makale | ✅ 8 makale, ilgili makaleler |
| `/faq` SSS | ✅ 4 bölüm × 4 soru accordion |
| `/size-guide` Beden Kılavuzu | ✅ Giysi + battaniye + havlu tabloları |
| `/track-order` Sipariş Takibi | ✅ Order number input + 5-adım timeline |
| `/about` Hakkımızda | ✅ Hero + hikaye + stats + values + ekip + CTA |
| `/contact` İletişim | ✅ Form + WhatsApp CTA + SSS |
| `/privacy` Gizlilik | ✅ 7 bölüm, GDPR |
| `/terms` Kullanım Şartları | ✅ 8 bölüm, Gürcistan hukuku |
| `404` Not Found | ✅ 404 grafik + çalışan arama kutusu (SearchModal açar) + butonlar |
| `error.tsx` Global Hata | ✅ Hata sınırı, Try Again + Back to Home |

### Sayfalar
| Sayfa | Durum |
|-------|-------|
| `/` Ana Sayfa | ✅ Hero + trust strip + kategori grid + 8 ürün + recently viewed + testimonials |
| `/products` Ürün Listesi | ✅ Filtre + sort + sayaç + loading skeleton |
| `/products/[slug]` Ürün Detay | ✅ Galeri + renk/beden/qty seçici + stok göstergesi + paylaş butonu + tabs + size guide modal + sticky CTA + reviews + recently viewed tracking |
| `/cart` Sepet | ✅ Yuvarlak checkbox seçimi + "Select All" + dinamik toplam + qty güncelleme + promo kutu + kargo progress + önerilen ürünler |
| `/checkout` Ödeme | ✅ 3 adım: Adres → İnceleme → Başarı, order numarası |
| `/wishlist` Favoriler | ✅ Kaydedilen ürünler, sepete ekle, loading |
| `/account` Hesabım | ✅ Profil, sepet/wishlist stat, hızlı linkler (Orders/Addresses/Notifications/Security) |
| `/account/orders` Siparişlerim | ✅ 3 mock sipariş, durum badge'leri, "Buy Again" butonu |
| `/account/addresses` Adreslerim | ✅ Tam CRUD: ekle, sil, varsayılan seç, Home/Work/Other etiketleri |
| `/account/notifications` Bildirimler | ✅ 6 toggle switch, kaydet butonu, başarı flash |
| `/account/security` Güvenlik | ✅ Şifre değiştirme + güç bar, 2FA (Coming Soon), hesap silme (DELETE onayı) |
| `/login` Giriş | ✅ Google + Facebook + Email tab + Phone+OTP tab |
| `/register` Kayıt | ✅ Google + Facebook + Email form, şifre güç göstergesi |
| `/forgot-password` Şifremi Unuttum | ✅ Email giriş → loading → "Email sent!" başarı state |
| `/blog` Journal | ✅ Featured makale + 3'lü grid |
| `/blog/[slug]` Makale | ✅ 4 makale, ilgili makaleler |
| `/about` Hakkımızda | ✅ Hero + hikaye + stats + values + ekip + CTA |
| `/contact` İletişim | ✅ Form (validasyon + success state) + WhatsApp CTA + SSS |
| `/privacy` Gizlilik | ✅ 7 bölüm, GDPR bahsi |
| `/terms` Kullanım Şartları | ✅ 8 bölüm, Gürcistan hukuku |
| `404` Not Found | ✅ Büyük 404 grafik + 2 buton + hızlı linkler |
| `error.tsx` Global Hata | ✅ Hata sınırı, Try Again + Back to Home |

### Context / State
- **CartContext** — localStorage, addItem, updateQuantity, removeItem, clearCart
- **WishlistContext** — localStorage, toggle/has/ids/count
- **AuthContext** — mock auth, email/google/facebook/phone OTP, TODO Supabase yorumları hazır
- **LoyaltyContext** — Loov Rewards puan cüzdanı (localStorage ledger; kurallar `lib/loyalty.ts`)

### Faz 2 Backend Durumu (Temmuz 2026 — DEVAM EDİYOR)
- ✅ Supabase projesi bağlı (`.env.local`), schema + seed yüklü (20 ürün DB'de)
- ✅ Katalog DB'den okunuyor: `/`, `/products`, `/products/[slug]` → `src/lib/db/products.ts` (hata olursa statik `lib/products.ts`'e düşer, site kırılmaz)
- ✅ Ürün detay stok göstergesi gerçek DB stoğu kullanıyor (`product.stock`, 0 = Out of stock)
- ✅ Sipariş oluşturma gerçek: `POST /api/orders` → `orders` + `order_items` tablolarına yazar. Fiyatlar sunucuda DB'den yeniden hesaplanır, origin (CSRF) kontrolü, alan doğrulama
- ✅ **Loov Rewards** (sadakat programı): 1₾ = 2 puan, 100 puan = 5₾ indirim (sepet ara toplamının max %30'u), Bronze/Silver/Gold seviyeleri (1000/3000 lifetime puan, x1.25/x1.5 kazanım). Sayfa: `/account/rewards`. Checkout review adımında "Use points" toggle. `supabase/loyalty.sql` çalıştırılınca `orders.points_redeemed/points_discount` kolonları da dolar (çalıştırılmadıysa API zarif düşer)
- ✅ **Supabase Auth CANLI**: AuthContext gerçek (signInWithPassword/signUp/signInWithOAuth/OTP/updateUser). `src/proxy.ts` (Next 16'da middleware'in yeni adı — named export `proxy`) session token'larını tazeler. `/auth/callback` route'u OAuth + e-posta onay dönüşünü karşılar (`exchangeCodeForSession`). Register'da "check your inbox" info akışı var. Profil düzenleme gerçek (user_metadata + profiles upsert). Girişli kullanıcının siparişine `user_id` otomatik bağlanır (`/api/orders` zaten cookie'den okuyor)
- ⚠️ KULLANICI YAPACAK (panel): (1) Supabase → Authentication → URL Configuration → Site URL `http://localhost:3000` + Redirect URL `http://localhost:3000/auth/callback`; (2) Google OAuth: Google Cloud Console'dan Client ID+Secret alıp Supabase → Providers → Google'a yapıştırmak (authorized redirect URI: `https://tbdjgigctdtmkohlqvvn.supabase.co/auth/v1/callback`)
- ✅ **Google OAuth ÇALIŞIYOR** (kullanıcı test etti — Google ile giriş yapıp /account'a düştü). Google Cloud Console + Supabase Providers ayarları yapıldı
- ✅ **Sipariş geçmişi gerçek**: `/account/orders` + `/account/orders/[id]` artık DB'den okuyor (`src/lib/db/myOrders.ts`, browser client + RLS). URL'de uuid değil order_number (BBK-...) kullanılıyor. Boş durum ekranı var. Mock 3 sipariş kaldırıldı
- ✅ **Track-order gerçek**: `supabase/track-order.sql`'deki SECURITY DEFINER `track_order(order_no, email)` fonksiyonu ile misafir sorgusu (service key GEREKMEDEN). Güvenlik: sipariş no + e-posta ikisi de eşleşmeli; adres/telefon dönmez. Fonksiyon DB'de yoksa site "temporarily unavailable" gösterir. Mock sipariş verisi tamamen silindi (`mockOrders.ts`'te sadece tipler + statusConfig kaldı)
- 🐛 **AÇIK SORUN (track-order UI)**: Fonksiyon DB'de çalışıyor (Node'dan rpc testi ✅ BBK-3V570MU + p@t.com sonuç döndürüyor) ama kullanıcının TARAYICISINDA hâlâ "temporarily unavailable" görünüyor (3 Tem 2026). Muhtemel sebep: eski JS bundle önbelliği (Ctrl+Shift+R denenmedi) veya browser client rpc çağrısında farklı bir hata. DEBUG İPUCU: `trackOrder()` içindeki catch tüm hataları "unavailable" yapıyor — tarayıcı konsolundaki `[trackOrder]` warn mesajına bakılmalı
- ⏳ SIRADAKİ: loyalty ledger'ı DB'ye taşıma, e-posta bildirimleri (Resend), checkout'ta girişli kullanıcının bilgilerini otomatik doldurma
- ✅ **Katalog TAMAMEN DB'de**: client bileşenler de bağlandı — `src/lib/db/useProducts.ts` hook'u (statik listeyle anında render + arkada DB'den taze katalog, modül-seviyesi cache ile sayfa başına 1 istek). Bağlananlar: SearchModal, CartClient (öneriler), WishlistClient, WishlistContext (priceDrop), RecentlyViewed, SocialProofToast, bundles/[slug] (server), sitemap (`getAllProductsStatic` — çerezsiz varyant, build'de statik kalabilsin diye). Statik `lib/products.ts` artık SADECE yedek (DB erişilemezse) + `categoryLabels`
- ✅ Checkout otomatik doldurma (girişli kullanıcının ad/e-postası), JSON-LD ürün şeması, sitemap DB'den
- ✅ **Service key + Resend key eklendi** (3 Tem, `.env.local`). `src/lib/supabase/admin.ts` (service role client, RLS bypass — SERVER ONLY)
- ✅ **Sipariş onay e-postası CANLI**: `/api/orders` → Resend API (fetch, SDK'sız) → `buildOrderMessage` (EN/KA/RU). Gönderen şimdilik `onboarding@resend.dev` (domain doğrulanınca `orders@...`e geçilecek — TODO route'ta). Domain doğrulanana dek Resend SADECE hesap sahibinin e-postasına teslim eder. E-posta hatası siparişi ASLA engellemez
- ✅ **Loyalty çift kaynak**: girişli → DB ledger (`loyalty_transactions`, server yazar, RLS ile kendi satırını okur, cihazlar arası taşınır; bakiye/tier sunucuda doğrulanır — yetersiz puan reddi); misafir → localStorage. API yanıtı `ledger: "db"|"local"` + `pointsEarned` döner; checkout buna göre dallanır
- ✅ `supabase/loyalty.sql` ÇALIŞTIRILDI (5 Tem 2026 doğrulandı: loyalty_transactions + orders.points_redeemed var — loyalty artık DB modunda)
- 📋 KALAN: içerik (foto/tel/e-posta) · marka ismi → domain + Vercel → deploy · Resend domain doğrulama

### 🛠️ ADMIN PANELİ (3 Tem 2026)
- **Yol**: `/admin` — güvenlik gizlilikte değil, sunucu yetki kapısında. `src/lib/admin/auth.ts requireAdmin()` (cookie'den user + `admins` tablosu service-role ile). Admin değilse `notFound()` → düz 404 (panelin varlığı bile belli olmaz). Test edildi: yetkisiz `/admin` + tüm `/api/admin/*` → 404
- **Sayfalar**: `/admin` (dashboard: gelir/bekleyen/düşük stok/son siparişler), `/admin/products` (inline düzenleme — fiyat/stok/isim/kategori/new toggle otomatik kaydeder, ekle/sil, foto yükleme), `/admin/orders` (durum değiştirme dropdown + detay aç), `/admin/logs` (audit trail). Storefront chrome `/admin`'de gizli (`StoreChromeGate` + `FooterGate`)
- **API**: `/api/admin/{stats,products,orders,upload,logs}` — hepsi `adminApiGuard()` + service role + `writeAudit()`. Ürün CRUD sunucuda doğrulanır (fiyat/stok/kategori). Foto → Supabase Storage `product-images` bucket (public read), max 5MB, jpg/png/webp/avif
- **DB**: `supabase/admin.sql` çalıştırılmalı → `admins`, `audit_log`, `products.image_url`, storage bucket + policy, RLS (admin tüm siparişleri okur/günceller), owner'ı admin olarak seed eder. ⚠️ ÇALIŞTIRILMADAN owner dahil herkes /admin'de 404 alır
- **Fotoğraf vitrinde**: `Product.imageUrl` eklendi, mapper'lar + ProductCard + detay galerisi foto varsa gösterir (yoksa emoji). Admin'den yüklenince otomatik yansır
- **Gelir grafiği** (dashboard hero): `RevenueChart.tsx` + `/api/admin/revenue?range=today|week|month|year|all`. Saf SVG alan grafiği (marka teal, gradient dolgu, hover crosshair+tooltip), dönem filtreleri, önceki döneme göre ▲/▼ yüzde, avg/peak. İptal siparişler gelire sayılmaz. Sunucuda zaman kovalarına böler (bugün=saatlik, hafta/ay=günlük, yıl=aylık, tüm zamanlar=aylık). "Total revenue" statik kartı grafikle değiştirildi (dataviz skill rehberiyle: tek seri→legend yok, recessive grid, 2.5px çizgi)
- **CSP düzeltildi** (next.config.ts): `connect-src`/`img-src`'e Supabase host eklendi — ÖNCEDEN `connect-src 'self'` tarayıcı Supabase client'ını sessizce blokluyordu (client bileşenler statik yedeğe düşüyordu), foto da yüklenemezdi. Artık düzgün

### 📦 STOK & ACİLİYET (3 Tem 2026)
- **Atomik stok rezervasyonu** (oversell/race fix): `supabase/stock.sql` → `reserve_stock(jsonb)` + `release_stock(jsonb)` (SECURITY DEFINER). Sipariş verilince `/api/orders` atomik düşer; son ürünü 2 kişi aynı anda alırsa koşullu UPDATE (stock>=qty) ile SADECE biri başarılı, diğeri 409 "sold out". Sipariş kaydı sonradan patlarsa `release_stock` ile geri verilir (telafi). Fonksiyon yoksa zarif atlar (uyarı loglar). NULL stock = takipsiz/sınırsız. ✅ `supabase/stock.sql` ÇALIŞTIRILDI (5 Tem 2026 doğrulandı: reserve_stock/release_stock DB'de — stok artık gerçekten düşüyor)
- **Client stok sınırı**: ürün detay miktar seçici + sepet "+" butonu `product.stock`'u aşamaz, tükendiyse "Out of Stock" (buton kapalı). "That's all we have" ipucu. Sunucu yine de gerçek guard
- **Aciliyet rozeti**: ürün detayda "🔥 N people have this in their cart right now" — deterministik (product.id + saat), hydration-safe (SSR id-only, mount'ta saat eklenir). Sitedeki mevcut sahte-sosyal-kanıt desenine uygun (reviews/SocialProofToast gibi)

### 🆕 BÜYÜK ÖZELLİK PAKETİ (3 Tem 2026) — mağaza ayarları, indirim, çoklu foto, sezon, gerçek yorumlar
> ✅ `supabase/features.sql` ÇALIŞTIRILDI (doğrulandı — settings/reviews tabloları ve tüm kolonlar DB'de aktif).

- **`settings` tablosu** (key/value, public read): 3 ayar → `/admin/settings` sayfasından düzenlenir. `src/lib/settings.ts` (tipler+defaults), `src/lib/db/settings.ts` (server `getSettings`, fallback defaults), `src/lib/db/useSettings.ts` (client hook, modül cache). Ayarlar: (1) **1 ₾ başına puan** (`pointsPerGel`, def 2), (2) **ücretsiz kargo eşiği** (`freeShippingThreshold`, def 100), (3) **"yeni" rozeti gün sayısı** (`newBadgeDays`, def 30)
- **İndirim sistemi**: `products.discount_percent` (0-90). `src/lib/pricing.ts` → `effectivePrice/discountPercent/savingsAmount/isNewArrival`. Uçtan uca tutarlı: ProductCard (üstü çizili + −%rozet), ürün detay, sepet satırları+subtotal, CartDrawer, checkout satırları+subtotal, wishlist, quick-view, recently-viewed, **CartContext.totalPrice** hepsi indirimli. **Sunucu fiyatlaması** (`/api/orders`) DB'den discount_percent okuyup indirimli birim fiyatı yeniden hesaplar (client asla güvenilmez) + order_items'a indirimli fiyat yazılır
- **"Yeni" rozeti tarihe göre**: `is_new` artık manuel PIN; rozet ayrıca `created_at + newBadgeDays` ile otomatik. Veri katmanında türetilir (`getAllProducts/getProductBySlug` + `useProducts` settings okuyup `isNewArrival` uygular). Ürün eskidikçe rozet kendiliğinden düşer
- **Kargo eşiği + puan oranı ayardan**: `/api/orders` (server) + cart/checkout/drawer (client `useSettings`) hepsi ayarı kullanıyor; `pointsForAmountAt(amount, pointsPerGel, tier)` yeni helper
- **Çoklu foto**: `products.image_urls text[]` (galeri; `image_url` = birincil/thumbnail, senkron tutulur). Admin: birden çok foto yükle/sil/birincil-yap. Upload route galeriye ekler. Ürün detay: **crossfade galeri** (opacity katmanları, pürüzsüz), thumbnail'ler. **Renk seçimi FOTOĞRAFI DEĞİŞTİRMEZ** (eski renk→bg-tint sistemi kaldırıldı) — renk seçilir, foto sabit kalır
- **Bedene göre renk**: `products.size_colors jsonb` ({size: colors[]}). Admin'de beden×renk onay-kutusu matrisi. Ürün detayda seçili bedende olmayan renkler devre dışı/soluk; beden değişince uygun renge otomatik geçer. Boş = tüm renkler mevcut
- **Sezon**: `products.season` ('all'|'summer'|'winter'). Admin dropdown. `src/lib/season.ts` (`currentSeason`/`matchesSeason`/`sortBySeason` — Nis-Eyl yaz). ⏳ NOT: sezon FİLTRESİ ve sezona-göre-vitrin sıralaması henüz CategoryFilter'a/ana sayfaya bağlanmadı (kolon+admin+helper hazır, sıradaki adım)
- **Düzenlenebilir açıklama + özellikler**: `products.features text[]` (Description tab'ındaki madde listesi) + `description`. Admin'de textarea'lardan düzenlenir. Boş features → varsayılan liste. Ürün detay bunları gösterir
- **Admin ürün editörü** (`ProductsClient.tsx` baştan yazıldı): satır içi hızlı alanlar + genişletilebilen **Edit ▾** panel (galeri, indirim, sezon, renkler/bedenler tag-editörü, beden×renk matrisi, açıklama, özellikler). Hepsi otomatik kaydeder. **Ekleme formunda emoji yerine foto yükleme** (oluştur→foto yükle)
- **GERÇEK YORUM SİSTEMİ** (`reviews` tablosu): **sadece ürünü DELIVERED siparişte alan giriş yapmış kullanıcı** yorum yapabilir (server `has_delivered_product` RPC + fallback query ile doğrulama, service-role insert — public insert yolu YOK). Kullanıcı/ürün başına 1 yorum. **İsim göster/gizle toggle** (gizliyse "Anonim"). **SADECE METİN — foto yok**. `/api/reviews` (GET liste+istatistik+uygunluk, POST oluştur, CSRF). `ReviewsSection.tsx` sahte veriden gerçeğe çevrildi (yıldız input, form, uygunluk durumları). **Admin yorum yönetimi**: `/admin/reviews` + `/api/admin/reviews` (listele/gizle/sil, filtre)
- **Detaylı loglar** (`/admin/logs`): audit_log + **siparişler** + **yorumlar** birleşik aktivite akışı. `/api/admin/logs` üç akışı normalize edip birleştirir. Tür filtresi (Orders/Reviews/Admin) + özet çipleri
- **Ana sayfa**: "Kategoriye Göre Alışveriş" bölümü compact yapıldı. i18n Faz 1 ana sayfa TAMAM (hero/kategori/öne çıkanlar/setler/neden-biz/yorumlar). Ürün detay + yorum sistemi de i18n'li (`pdp.*` + `rev.*` anahtarları 4 dilde; ka DRAFT). Çeviri kontrol dosyası `CEVIRI-KONTROL-KA.md` güncellendi (abla incelemesi için)
- **DOĞRULAMA**: `tsc --noEmit` temiz · tüm ana sayfalar (/ /products /cart /checkout /wishlist /products/[slug]) + API'ler 200/beklenen kod · admin API'ler yetkisiz 404 · features.sql yokken zarif fallback (sadece "[settings] using defaults" uyarısı)
- ⏳ **SIRADAKİ**: sezon filtresi+vitrin sıralaması bağlama · QuickAdd bedene-göre-renk farkındalığı (şu an ilk renk/beden ekler) · storage'da silinen foto orphan temizliği · materials/care/delivery tab içerikleri henüz i18n değil (ikincil)

### ↩️ İADE SİSTEMİ (FAZ 6, 4 Tem 2026) — TAMAMLANDI
> ✅ `supabase/returns.sql` ÇALIŞTIRILDI (5 Tem 2026 doğrulandı: returns tablosu + orders.delivered_at + return-photos bucket var; tek-aktif-iade kısıtı ve RLS canlı test edildi — anon okuyamaz/yazamaz, aynı siparişe 2. aktif iade 23505 ile reddediliyor).

- **Kararlar (kullanıcıyla):** iade parası IBAN'a banka havalesi · foto sebebe göre zorunlu (damaged/wrong_item/not_as_described) · onaylanınca kurye adresten alır · 14 gün pencere (Gürcistan yasası mesafeli satışta minimum — matsne.gov.ge #5420598; "1 hafta" fiziksel mağaza politikasıdır)
- **Durum makinesi:** requested → approved → received → refunded | rejected (not zorunlu); müşteri sadece requested'dayken iptal edebilir. Sipariş başına 1 aktif iade (partial unique index). Kurallar `src/lib/returns.ts`
- **Müşteri:** sipariş detayında "Request a Return" (kalan gün sayacı) + iade durum kartı (mini progress + iptal); `/account/orders/[id]/return` 3 adımlı sihirbaz (ürün+adet, sebep+foto+IBAN, özet); `/account/returns` listesi; hesap menüsünde "My Returns". Refund SUNUCUDA hesaplanır (order_items fiyatları; TÜM sipariş iade edilirse kargo da eklenir — yasa gereği). İade UI şimdilik EN (FAZ 8'de i18n)
- **Admin:** `/admin/returns` (filtre çipleri, genişleyen detay: müşteri fotoları, 📋 Copy IBAN, kurye pickup adres/tel, geçerli geçiş butonları + not) + nav "↩️ Returns" + dashboard "Return requests" kartı (bekleyen varken). Sipariş `delivered` yapılınca `delivered_at` damgalanır (pencere başlangıcı; kolon yoksa retry)
- **API:** `/api/returns` (POST/GET/PATCH — CSRF+auth, reviews deseni, item alt-küme + adet + pencere + sahiplik doğrulaması) + `/api/returns/upload` (auth'lu, max 3 foto, 5MB) + `/api/admin/returns` (guard+audit+durum e-postası). E-postalar `buildReturnMessage` 5 durum × EN/KA/RU (orderMessages.ts)
- Terms/FAQ iade metinleri gerçek akışa yönlendirildi. Doğrulama: tsc temiz · guard'lar canlı test (403/401/404) · tablo yokken zarif düşüş

### 👤 HESAP ALANI (FAZ 7, 5 Tem 2026) — TAMAMLANDI
> ✅ `supabase/profile.sql` ÇALIŞTIRILDI (5 Tem 2026 doğrulandı: profiles yeni kolonları + avatars bucket + avatar_presets seed DB'de).

- **Kararlar:** profil alanları HEPSİ · avatar = admin'in yüklediği preset'lerden seçim (kullanıcı yüklemesi YOK) · Order Updates e-postası kapatılamaz · SMS tercihi kaydedilir (altyapı ileride)
- **My Reviews** (`/account/reviews`): kendi yorumları (hidden dahil, amber notlu) + satır içi düzenle/sil + "Awaiting review" (teslim edilmiş yorumlanmamış ürünler → PDP `#reviews`). API: `/api/reviews` GET `?mine=1` / PATCH / DELETE (CSRF+auth, başkasınınki → 404; PATCH `status`'a dokunmaz — admin gizlemesi bypass edilemez)
- **Profil** (`src/lib/db/profile.ts`, browser client + RLS own-row): telefon (checkout autofill bağlı), bebek adı/doğum tarihi/cinsiyet, site dili (kaydet → `setLocale`), preset avatar (profiles + auth metadata'ya yazılır → Navbar 2 nokta + hesap kartı anında gösterir). Admin: `/admin/settings` "Profile avatars" kartı + `/api/admin/upload kind=avatar` + `/api/admin/avatars` GET/DELETE
- **BabyPicksSection** (ana sayfa, kategori↔featured arası): `src/lib/babyAge.ts` (beden→ay parser; One Size/cm hariç; kural: yaşı kapsar VEYA yaş+3 içinde başlar). Giriş+doğum tarihi varsa "For {bebek} · {yaş}" + uyan stoklu max 8 ürün; 5 aylık bebeğe yenidoğan seti gösterilmez (birim test edildi). Hydration-safe, misafirde görünmez
- **Bildirimler:** `profiles.notification_prefs` jsonb — gerçek yükle/kaydet; Orders "Always on" kilitli; e-posta gönderen route'lara dokunulmadı (hepsi işlemsel)
- Doğrulama: tsc temiz · sayfalar 200 · guard'lar 403/401/404 canlı test · PDP reviews regresyonsuz

### 🩺 KAPSAMLI CHECKUP (3 Tem 2026) — bulunan + düzeltilen
- **(KRİTİK) Stok fonksiyonları anon'a açıktı** → `release_stock` ile stok şişirme / `reserve_stock` ile rakip ürün stoğunu sıfırlama mümkündü. Fix: `/api/orders` artık service-role ile çağırıyor, `stock.sql` anon/authenticated grant'larını REVOKE ediyor
- **(KRİTİK) Sipariş iptali stoğu iade etmiyordu** → envanter sızıntısı. Fix: admin orders PATCH iptal→`release_stock`, iptal-geri-alma→`reserve_stock` (yetersizse 409)
- **(YÜKSEK) QuickAdd/QuickView/Wishlist stok yok saydı** → tükenmiş ürün sepete eklenebiliyordu. Fix: hepsinde "Out of Stock" guard
- **(YÜKSEK) forgot-password SAHTEYDİ** (setTimeout) → gerçek `resetPasswordForEmail` + yeni `/reset-password` sayfası (`updatePassword`)
- **(YÜKSEK) Şifre değiştirme SAHTEYDİ** → gerçek `supabase.auth.updateUser({password})`
- **(YÜKSEK/GDPR) Hesap silme SAHTEYDİ** (sadece signOut) → gerçek `/api/account/delete` (service-role `admin.deleteUser`, siparişlerden user_id ayrılır). Gizlilik sayfası "veriler silinir" diyordu, artık gerçekten siliyor
- AuthContext yeni metodlar: `sendPasswordReset`, `updatePassword`, `deleteAccount`
- **AÇIK KALAN** (öncelikli): `/api/orders` rate-limit yok (flood/mail bombing — deploy'da) · Resend domain doğrulanmadı (mail sadece owner'a) · track-order tarayıcı cache bug · misafir→üye geçişinde local puan DB'ye taşınmıyor · storage'da eski foto orphan kalıyor · admin ürün-id race (2 admin, düşük) · sepette stok düşerse proaktif uyarı yok (checkout'ta reddedilir)

### 🔒 GÜVENLİK DENETİMİ (3 Tem 2026) — sonuçlar
Kapsamlı pen-test yapıldı. **Geçenler**: fiyat enjeksiyonu (sunucu DB'den yeniden fiyatlıyor), CSRF (origin yok/farklı → 403), open redirect (auth/callback `next` filtreli), RLS (anon: orders/loyalty/profiles okuyamaz, loyalty'e yazamaz, ürün fiyatı değiştiremez — sessiz 0 satır), track_order (yanlış e-posta sızdırmıyor, adres/telefon dönmüyor, SQL injection'a kapalı), negatif/aşırı miktar reddi.
**Bulunan + DÜZELTİLEN 2 açık**:
1. (YÜKSEK) Misafir puan istismarı — puanı olmayan biri `redeemPoints` göndererek %30 indirim alabiliyordu. Fix: puan kullanımı artık SADECE girişli + DB bakiyesi doğrulanan kullanıcıya; misafirde `redeemPoints=0` zorlanıyor (route.ts)
2. (ORTA) Ondalık miktar → orphan sipariş — `quantity:1.5` doğrulamayı geçip order eklenip item'da patlıyor, boş sipariş kalıyordu. Fix: `Number.isInteger` kontrolü + item insert başarısızsa telafi `delete` (admin client ile)
**Düzeltilmeyen (gelecek/altyapı, launch-blocker değil)**: `/api/orders` rate-limit yok (sipariş/e-posta flood riski — deploy'da Vercel/edge rate-limit önerilir); eşzamanlı puan harcama race (çok düşük risk, bu ölçekte önemsiz); Resend domain doğrulanınca e-posta bombing için rate-limit gerekli

### 🌐 i18n / ÇOK DİLLİLİK (3 Tem 2026 — FAZ 1 DEVAM EDİYOR)
**Diller:** EN (kaynak) · KA Gürcüce (öncelik — kullanıcının ABLASI native inceleyecek) · RU Rusça (DeepL) · TR Türkçe (owner-native). **AZ Azericе KALDIRILDI.** DeepL Gürcüceyi DESTEKLEMEZ — o yüzden ka insan incelemesi şart.

**Mimari — çerez tabanlı ÇİFT çeviri (server + client):**
- `src/lib/i18n/config.ts` — `LOCALES=["en","ka","ru","tr"]`, `DEFAULT_LOCALE="en"`, `LOCALE_META` (label+flag), `isLocale()` type guard
- `src/lib/i18n/locales/{en,ka,ru,tr}.ts` — her dil kendi dosyasında. `en.ts` kaynak (`as const`, `TranslationKey`/`Dictionary` tiplerini üretir). **ka/ru/tr artık tam `Dictionary`** (Partial değil) — eksik anahtar derleme hatası verir, bu tüm batch'ler boyunca en değerli korkuluk oldu. `src/lib/i18n/dictionaries.ts` sadece re-export hub'ı (~15 satır)
- `src/lib/i18n/server.ts` — `getServerLocale()` (cookie'den, `next/headers`), `getT()` → `{ t, locale }`. **Server Component'ler bunu kullanır** (React context okuyamazlar)
- `src/context/LocaleContext.tsx` — Client tarafı. `LocaleProvider` `initialLocale` prop alır (server cookie'sinden → hydration flash YOK). `setLocale` → localStorage + cookie yazar + `router.refresh()`. `useLocale()` → `{ locale, setLocale, t }`
- `src/lib/i18n/labels.ts` — **"etiket mantığı":** admin kanonik İngilizce değer girer (renk "White", beden "0-3 Months", kumaş "cotton"...), vitrin her dilde kendi karşılığını gösterir. `colorLabel`/`sizeLabel`/`categoryLabel`/`categoryPlural`/`fabricLabel`/`seasonLabel`/`orderStatusLabel`/`returnStatusLabel`/`returnReasonLabel`/`tierName`/`perkLabel`. **KURAL:** kanonik string'ler state/Map-key/filtre/payload'da HİÇ değişmeden kalır (`sizeColors[size]`, CategoryFilter eşleşmesi, iade reason kodları, sipariş payload'ı) — labels SADECE görüntü katmanı
- `src/lib/i18n/format.ts` — `fmtDate(iso, locale, "short"|"long")` / `fmtDateNoYear` — locale-aware tarih formatlaması (en→en-GB, ka/ru/tr BCP-47 doğrudan)
- `src/lib/articles/` — blog modülü: `base.ts` (slug/emoji/renk/dateISO/kategori-id/dakika, değişmez), `content.{en,ka,ru,tr}.ts` (başlık/özet/gövde, tam çeviri), `index.ts` (`getArticles(locale)`/`getArticleBySlug` — alan-bazlı en fallback)
- **Çerez adı:** `loov-locale` (hem server hem client aynı çerezi okur → tutarlılık)

**✅ FAZ 8 TAMAMLANDI (6 Tem 2026) — "Admin paneli hariç HİÇBİR yer İngilizce kalmasın" hedefine ulaşıldı:**
Site genelinde ~35 dosya + tüm sayfalar (ana sayfa/navbar/footer/PDP'den başlayıp) mağaza chrome'u (arama/sepet/quick-view/wishlist/kategori filtresi), sepet+checkout+e-posta, wishlist/bundles/track-order, auth+404/error, hesap alanının TAMAMI (dashboard/siparişler/iade sihirbazı/iadelerim/yorumlarım/rewards/adresler/bildirimler/güvenlik), bilgi sayfaları (FAQ/size-guide/about/contact), yasal sayfalar (privacy/terms — ka DRAFT, native inceleme bekliyor), blog (8 makale × 4 dil TAM çeviri, modül `articles.ts` tek dosyadan `articles/` klasörüne refaktör edildi) ve tüm sayfaların `<title>`/`<meta description>` metadata'sı (`generateMetadata()` + `meta.*`) çevrildi. 14 batch (B0-B13) halinde, her batch sonunda tsc + canlı curl doğrulaması + sızıntı taraması + `CEVIRI-KONTROL-KA.md` güncellemesiyle yapıldı.
- **Doğrulama:** `tsc --noEmit` + `next build` tamamen temiz · ~30 route × 4 dil curl marker testi + ham-anahtar/yetim-`{n}` sızıntı taraması sıfır sonuç · `/admin` hâlâ 404 (yetkisiz) ve İngilizce (hedef gereği dokunulmadı)
- **Bilinen sınırlar (launch-blocker değil, sonraki fazlar):** ürün/set adı+açıklaması hâlâ İngilizce (ayrı "içerik çeviri" fazı gerekir — DB `name_ka`/`description_ka` kolonları + admin çeviri alanları), ka/ru/tr blog+legal metinleri makine kalitesinde çeviri — **abla incelemesi bekliyor** (`CEVIRI-KONTROL-KA.md` 25 bölüm + ayrı `CEVIRI-KONTROL-KA-BLOG.md`), sezon filtresi/vitrin sıralaması UI'a henüz bağlanmadı (FAZ 8 kapsamı dışı, önceki not), hreflang/locale-routing (`next-intl` /ka URL'i) hâlâ değerlendirilmedi — çerez tabanlı kalmaya devam ediyor.
- **VS Code için:** sözlük ~800+ anahtara çıktı, "i18n Ally" eklentisi önerilir.

### UX / Mobil Uyum
- Tüm floating elementler koordineli z-index: MobileBottomNav `z-40` → sticky CTA `bottom-14` → CartToast/BackToTop/CookieConsent `bottom-20 sm:bottom-6`
- `pb-16 sm:pb-0` main wrapper (MobileBottomNav için boşluk)
- Hydration-safe context'ler (useState[], useEffect, hydrated flag)

### Ürün Kataloğu (20 ürün)
| ID | Slug | Kategori | Fiyat | isNew |
|----|------|----------|-------|-------|
| 1 | organic-cotton-bodysuit | body | 24 ₾ | |
| 2 | cloud-print-blanket | blanket | 48 ₾ | |
| 3 | hospital-exit-set | set | 89 ₾ | ⭐ |
| 4 | bamboo-hooded-towel | towel | 38 ₾ | |
| 5 | bear-ear-romper | romper | 42 ₾ | ⭐ |
| 6 | mini-bunny-backpack | bag | 58 ₾ | |
| 7 | muslin-swaddle-blanket | blanket | 32 ₾ | |
| 8 | long-sleeve-bodysuit-set | body | 58 ₾ | ⭐ |
| 9 | duck-hooded-towel | towel | 42 ₾ | |
| 10 | panda-zip-romper | romper | 46 ₾ | ⭐ |
| 11 | gift-set-newborn | set | 119 ₾ | |
| 12 | diaper-bag-tote | bag | 94 ₾ | |
| 13 | knotted-gown-set | set | 36 ₾ | |
| 14 | mini-explorer-backpack | bag | 62 ₾ | ⭐ |
| 15 | lion-hooded-romper | romper | 48 ₾ | ⭐ |
| 16 | bamboo-pajama-set | body | 54 ₾ | ⭐ |
| 17 | organic-sleep-sack | body | 44 ₾ | |
| 18 | rainbow-gift-set | set | 98 ₾ | ⭐ |
| 19 | terry-poncho-towel | towel | 46 ₾ | |
| 20 | elephant-mini-bag | bag | 56 ₾ | |

### Blog Makaleleri (8 makale)
- newborn-skin-care-guide
- organic-cotton-vs-bamboo
- building-baby-wardrobe
- hospital-bag-checklist
- washing-baby-clothes
- safe-sleep-guide
- best-baby-shower-gifts
- dressing-baby-for-georgian-weather

---

## 🔧 YAPILMASI GEREKENLER

### 🔴 Kritik (İçerik / Gerçek Bilgi — Faz 2'de Tamamlanacak)
- [ ] **WhatsApp numarası** — altyapı HAZIR (admin → Settings → WhatsApp number); business numara alınınca girilecek, o zamana dek WhatsApp öğeleri gizli
- [ ] **Gerçek ürün görselleri** — şu an emoji; gerçek fotoğraf (CDN/Supabase Storage)
- [ ] **E-posta adresi** — `hello@loov.ge` placeholder
- [ ] **Gerçek ekip bilgisi + kuruluş yılı** — About'tan sahte ekip/stats kaldırıldı; gerçekleri gelince geri eklenecek

### 🟡 Önemli (UI / İşlevsellik)
- [ ] **Checkout ↔ Sepet seçimi entegrasyonu** — seçili ürünler checkout'a geçmeli

### 🚀 FAZ 2 (Backend — şimdi dokunma)

---

## 🚀 FAZ 2 (Backend — şimdi dokunma)

- Supabase Auth (Google/Facebook/Email/Phone gerçek entegrasyon)
- Supabase Database — ürünler, stok, siparişler, adresler
- Admin paneli — sipariş yönetimi, ürün ekleme/düzenleme, stok takibi
- Gerçek ürün fotoğraf sistemi (Supabase Storage veya Cloudinary)
- i18n — Faz 1 BAŞLADI (çerez tabanlı, Navbar/footer canlı). Detay + sonraki adımlar: 🌐 i18n bölümü
- Gerçek e-posta bildirimleri — sipariş onayı, kargo takibi (Resend veya SendGrid)
- Google Analytics / Meta Pixel entegrasyonu
- SEO: ürün sayfaları için JSON-LD structured data

## 💳 FAZ 3 (EN SON)

- Ödeme: Bank of Georgia + TBC Bank entegrasyonu
- Kargo: Georgian Post API — gerçek kargo takibi
- KDV (%18) faturalama ve vergi belgesi
- Sadakat programı — puan sistemi

---

## Dosya Yapısı (özet)

```
src/
  app/
    account/          → orders, addresses, notifications, security
    blog/             → [slug]
    products/         → [slug]
    checkout/
    cart/
    forgot-password/
    ...
  components/         → Navbar, ProductCard, QuickAddButton, RecentlyViewedSection, ...
  context/            → CartContext, WishlistContext, AuthContext
  lib/                → products.ts, articles.ts
  types/              → index.ts (Product, CartItem, CartContextType)
```

## Kodlama Kuralları
- Tailwind CSS v4: `@theme` ile globals.css'te, `tailwind.config.ts` YOK
- Next.js 15: `params` ve `searchParams` Promise olarak await edilmeli
- `"use client"` — sadece state/effect/event kullanan bileşenlere
- Context'ler: hydration-safe (Array.isArray + hydrated flag)
- Mobil z-index sırası: nav(40) → sticky-cta(bottom-14) → toast/consent(bottom-20)
- Stok / rating verileri: deterministik (product.id'ye göre seed'li), `products.ts`'te değil bileşende
