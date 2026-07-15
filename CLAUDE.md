@AGENTS.md

# Loov — Proje Durumu

## Proje Özeti
Gürcistan pazarına yönelik bebek/çocuk giyim e-ticaret sitesi.
**Tech:** Next.js (App Router, TypeScript) + Tailwind CSS v4
**Para Birimi:** Gürcistan Larisi (₾)
**Tasarım (v2.0 — NORDIC UTILITY):** beyaz `--color-canvas` + çam yeşili `--color-accent #2E5E4E` + mürekkep `#141412`; TÜM renkler/radius'lar `globals.css` @theme'deki **semantik token'lardan** gelir (`canvas/surface/panel/line/ink/ink-soft/ink-muted/accent/accent-deep/accent-soft/danger/danger-soft/star` + `--radius-card/control`) — tema değişikliği = tek dosya. Karanlık mod: `html[data-theme=dark]` token override + `loov-theme` çerezi (SSR, hesaptan bağımsız; admin `.route-admin` ile hep aydınlık). Font: gövde **Archivo** (`--font-sans`), LOOV wordmark'ı **Cinzel Decorative** METİN olarak (`--font-cinzel` + `.font-display`; @theme'de var() referanslı font token'ı ÇALIŞMAZ). Eski sage/krem tasarım tamamen kalktı.
**Auth:** Supabase CANLI (Google + email + telefon OTP)

### 🚀 v2.0.0 — NORDIC REDESIGN CANLIYA ÇIKTI (15 Tem 2026)
`redesign-nordic` branch'i (Faz 0 tokenizasyon → Faz 1 kimlik → Faz 2 chrome → Faz 3 B1-B7 sayfa batch'leri → kullanıcı geri bildirim turları → PLAN-11-MADDE turu) **main'e merge edilip loov.ge'de yayınlandı; `v2.0.0` tag'lendi.** Bu sürümde ayrıca: karanlık/aydınlık mod, dokunsal `.u-btn` butonlar, eğik `.u-skeleton` shimmer, buzlu-cam çift-bar header, kart yıldızları (`withRatings` + boşken 5★, altın `--color-star`), süreli indirim (`discount_ends_at` + `deal.*` sayacı — pricing.discountPercent tek kapı, sunucu dahil), hero showcase (admin `heroSlugs` ayarı + 5sn sonsuz sola kayan slider + oklar), tamamen siyah footer (literal renkler — token flip'inden bağımsız), Temu-vari büyük QuickView (portal olayları REACT ağacından balonlanır — overlay stopPropagation şart!), PDP zoom (masaüstü tık-kademeli + origin fare takibi; mobil pinch NATIVE non-passive listener'larla), ürün videosu (signed direct-to-Storage upload `POST /api/admin/video-upload-url` — Vercel ~4.5MB gövde sınırı; admin kapak seçici; PDP'de ▶'lu poster slaytı), puan ekonomisi revizyonu (redeem'li sipariş kazanmaz; `loyaltyRedeemValue` 100p=3₾; `pointsPerGel` default 1; navbar ⭐ çipi), arama "Aranıyor…" durumları, admin Hero showcase kartı. **SQL'ler:** `discount-timer.sql` ✅ çalıştırıldı; `product-video.sql` ⚠️ kullanıcı çalıştıracak (çalışana dek zarif düşer). Dev notları: Turbopack dev ara sıra "Jest worker" çökmesi yaşıyor (restart çözer); tam-sayfa Playwright ekran görüntüsü tema geçişinde bayat kare gösterebilir (computed style ile doğrula); JSX'i bash string-replace ile DEĞİŞTİRME (template literal bozulur) — dosyaya yaz+splice ya da Edit kullan.

### 🛰️ SENTRY KURULDU + KOD DENETİMİ #2 (12 Tem 2026)
- **Sentry CANLI (kod tarafı):** `@sentry/nextjs@10` — `src/instrumentation.ts` (`onRequestError` = captureRequestError), `src/instrumentation-client.ts` (+router transition tracing), kök `sentry.server/edge.config.ts`, ortak sabitler `src/lib/sentry.ts` (DSN env-öncelikli + gömülü fallback — DSN gizli değil; **sadece production'da aktif**, traces %10, `sendDefaultPii:false`, Replay YOK — müşteri adres/telefon yazıyor). Yeni `src/app/global-error.tsx` (kök layout çökmesi, provider'sız statik EN) + mevcut `error.tsx`'e `captureException`. `next.config.ts` → `withSentryConfig` (org `loov-0v`, proje `javascript-nextjs`; source-map upload SADECE `SENTRY_AUTH_TOKEN` varsa — şu an yok, build yine geçer) + CSP `connect-src`'e `ingest.de.sentry.io` eklendi. Doğrulama: tsc+build+23 test temiz, prod sunucuda sayfa HTML'inde sentry trace meta'ları + CSP header doğrulandı. ⏳ İsteğe bağlı: Vercel'e `SENTRY_AUTH_TOKEN` eklenirse minified stack'ler okunur olur (Sentry → Settings → Auth Tokens)
- **Twilio Account SID alındı** (Claude memory'de kayıtlı — repo'ya YAZMA, GitHub push protection engelliyor) — SMS için hâlâ eksik: **Auth Token + gönderici numara**; kullanıcı verince SMS entegrasyonu yapılacak
- **KOD KALİTESİ DENETİMİ #2 raporlandı ve AYNI GÜN 19/20 madde DÜZELTİLDİ** → `DENETIM-RAPORU.md` "🔬 KOD KALİTESİ DENETİMİ #2" bölümü (işaretli). Kullanıcı kararları: **iki vaat de kaldırıldı + her şey admin'e bağlandı.** Öne çıkanlar: (1) hediye paketi → yeni `giftWrapPrice` ayarı (settings.ts+admin kartı+checkout client/server+FAQ/PDP/announce metinleri ayarı izler, 0=ücretsiz gösterir); (2) Gold "free express"+"birthday surprise"+"early access" perk'leri SİLİNDİ — perk'ler artık SADECE ayardan üretilen oran/bonus satırları (`tiersFor` pointsPerGel de alır, `label.perk.pointsRateN`/`bonusN` desen çevirisi); (3) FAQ "sale items final sale" cümlesi silindi (Terms+kodla çelişiyordu); (4) admin iptali artık puan reversal + promo `times_used` iadesi yapıyor (yeni `src/lib/loyaltyReversal.ts` + `adjustPromoUse`, müşteri iptali de aynı yardımcıya bağlandı, un-cancel simetrik); (5) sunucu hata KODLARI (`code: sold_out/express_unavailable/promo_*/not_enough_points/too_short...`) → CheckoutClient+ReviewsSection i18n eşliyor, İngilizce raw mesaj bitti; (6) announce/hero "100₾" + 5 anahtar "2–4 gün" + FAQ/Terms/Contact → hepsi {n}/{min}/{max}/{price} interpolasyonlu, ayarları izliyor; (7) PDP Specifications/Delivery/Care/beden-modal TAM i18n (`pdp.spec*/care*/deliv*` ×4 dil) + uydurma varsayılanlar silindi (boş material/weight/origin artık hiç görünmez — "100% Organic Cotton"/"Made in Georgia" otomatik iddiası bitti); (8) sipariş no BBK-→**LOOV-** (eskiler BBK kalır, sorun değil); (9) puan kazanımı artık kargo+paket HARİÇ ürün tutarından (client+server+misafir aynı formül); (10) ana sayfa uydurma testimonial'lar SİLİNDİ → gerçek DB yorumları (`getHomeReviews`, yorum yoksa bölüm gizli, istatistikler gerçek sayı/ortalama). Ölü kod: `checkout.standardSub`+`home.reviews.r1-3`+`statFamilies`+perk anahtarları ×4 dil, `tierFor/nextTierAfter/pointsForAmount` silindi; 24 test (yeni perk testi dahil). **KALAN: #20** hello@loov.ge posta kutusu (dış bağımlılık — kutu açılınca ya da metin değişince kapanır). Doğrulama: tsc+build+24 test temiz, prod smoke-test (7 sayfa 200, EN/KA leak taraması sıfır, terms/contact gün aralığı ayardan geliyor)

### 🧹 3 KÜÇÜK MADDE: SEZON FİLTRESİ + STORAGE ORPHAN + A11Y (13 Tem 2026) — TAMAMLANDI
Kullanıcının derlediği "MD dosyalarında yazılı kalan işler" listesindeki 3 küçük maddesi.
- **Sezon filtre pill'i:** `CategoryFilter.tsx`'e kumaş filtresiyle aynı desende yeni bir satır (`seasonFilter` state, `matchesSeason()` — zaten var olan `src/lib/season.ts` fonksiyonu yeniden kullanıldı, yeni mantık icat edilmedi). Katalogda hiç sezonlu ürün yoksa (hepsi "all") pill hiç görünmez (`seasonsPresent` gate, fabric filtresiyle aynı desen) — bu yüzden şu an canlıda GÖRÜNMÜYOR, admin bir ürüne sezon atayınca otomatik çıkar. Yeni `filter.season` anahtarı ×4 dil.
- **Storage orphan temizliği:** Yeni `src/lib/storageCleanup.ts` (`deleteStorageUrls`/`removedUrls`) — `/api/admin/avatars`'ın zaten yaptığı "sil + Storage'dan temizle" desenini genelleştirdi. Bağlandığı yerler: ürün PATCH (galeriden çıkan/değişen foto), ürün DELETE (tüm galeri), bundle PATCH (foto değişince eskisi), bundle DELETE (foto). Hepsi best-effort — DB yazımını asla bloklamaz, silme başarısız olursa öncekiyle aynı davranış (yetim dosya kalır), asla yeni bir regresyon değil.
- **Gerçek a11y denetimi — bulgular:**
  - 6 modal'ın (QuickView, BundleQuickView, VariantPickerPopover, CartDrawer, NewsletterPopup, PDP beden kılavuzu) **hiçbirinde `role="dialog"`/`aria-modal` yoktu** — ekran okuyucu bunları modal olarak anons etmiyordu. Hepsine eklendi + `aria-labelledby` (başlığa bağlı).
  - 2 modalda (NewsletterPopup, beden kılavuzu) **Escape ile kapatma yoktu** (diğer 4'ünde zaten vardı) — eklendi.
  - Birkaç icon-only kapatma butonunda `aria-label` eksikti (QuickView/BundleQuickView/VariantPickerPopover ✕ butonları) — eklendi.
  - Baseline kontrol temiz çıktı: eksik `alt` yok, checkout formunda etiketsiz input yok.
  - **🔴 GERÇEK BULGU, DÜZELTİLMEDİ — kullanıcı kararı gerekiyor:** site genelinde ikincil metin rengi `#9A8E88` (`--color-text-muted` — ama token hiç kullanılmıyor, 62 dosyada `text-[#9A8E88]` olarak gömülü) **WCAG AA'yı geçmiyor**: krem zeminde (`#F5F0EB`) ölçülen kontrast **2.81:1**, beyaz zeminde **3.18:1** — ikisi de normal metin için gereken 4.5:1'in altında (büyük metin/UI bileşeni için gereken 3:1'i de krem zeminde geçmiyor). Bu site genelinde etiketler, tarihler, ikincil açıklamalar için kullanılan bir tasarım rengi — 62 dosyada değiştirmek görsel bir tasarım kararı, bu oturumda sormadan yapmadım. **Öneri:** rengi biraz koyulaştırmak (ör. `#7D716A` civarı) hem tasarım kimliğini korur hem AA'yı geçer — istersen yaparım.
- Doğrulama: tsc+build+60 test temiz, prod smoke-test (season pill katalogda sezon verisi olmadığı için doğru şekilde gizli).

### 🏗️ 3 MİMARİ BOŞLUK KAPATILDI + FAVICON (13 Tem 2026) — TAMAMLANDI
Kullanıcı önceki self-audit'te bilinçli ertelenen 3 maddeyi "sırayla hallet, sorma, büyük şirketlerin en iyi kararlarını sen bul uygula, bana haber ver" dedi. 3 paralel Explore ajanıyla kod tabanı incelendi, sonra sırayla uygulandı (tam detay `DENETIM-RAPORU.md` "🏗️ 3 MİMARİ BOŞLUK KAPATILDI" bölümünde):
- **Favicon:** `public/logo-square.png` → `src/app/icon.png`+`apple-icon.png` (sharp ile üretildi), eski Next varsayılan `favicon.ico` silindi.
- **Sepet/Favori artık tombstone'lı satır-seviyeli merge** (`src/lib/cartMerge.ts`, 13 test) — eski "son yazan kazanır" blind-overwrite yerine, silme kayıtları tutuluyor (asla sessiz veri kaybı YOK, ama gerçek silme de geri gelmiyor). Reconcile artık tab-focus'ta da tetikleniyor, DB yazımı CAS-lite çakışma-tespitli.
- **OTP doğrulama kapısı API seviyesine taşındı** (`src/lib/auth/requireVerifiedSession.ts`) — en kritik açık olan `/api/account/delete`'in SIFIR step-up koruması vardı, artık kapalı. `trusted_devices` her email-OTP doğrulamasından sonra koşulsuz (4 saat/30 gün) açılıyor. 6 route korundu, sipariş verme (POST) BİLİNÇLİ kapsam dışı (büyük sitelerde de normal alışveriş adımı re-verify istemez).
- **Katalog: küçük sorgular + gerçek sunucu-taraflı arama** — `products` tablosuna trigram+kategori index (`supabase/product-search.sql`), yeni `GET /api/products/search` (Navbar/404 arama artık tüm kataloğu tarayıcıya çekmiyor, aynı eşleşme mantığı sunucuda). 6 küçük tüketici (sepet önerisi/favoriler/son görüntülenen/yorumlarım/bundle) artık sadece ihtiyaç duydukları ID'leri çekiyor. **`useProducts()` hook'u tüketicisi kalmadığı için silindi.**
- Doğrulama: tsc+build+60 test (24'ten) temiz, canlı curl doğrulaması (OTP guard 401'leri, search endpoint gerçek veri, sipariş verme hâlâ misafirlere açık).

### 🪞 KOD ÖZ-ELEŞTİRİSİ + RAKİP ANALİZİ (13 Tem 2026) — TAMAMLANDI
Kullanıcı "duşa gidiyorum, kusursuz olduğumuzdan emin ol, benzer siteyle kıyasla" dedi → **Kyte Baby** (kytebaza.com — bambu bebek giyim, en yakın rakip) araştırıldı, `RAKIP-ANALIZI.md` yazıldı (dürüst: kod ~%92, içerik/foto ~%40, "kusursuz DEĞİLİZ" tespiti). Kullanıcı "bütün suçu bana attın kod tarafı mükemmel mi ki" diye haklı çıkınca **kendi tasarım kararlarımı** aynı sertlikle denetleyip API/foto gerektirmeyen HER ŞEYİ aynı oturumda düzelttim (bkz. `DENETIM-RAPORU.md` sonundaki "🪞 SELF-AUDIT" bölümü):
- **Rate limit artık DB-destekli** (`supabase/rate-limits.sql` ⚠️ ÇALIŞTIRILMALI + `rate_limit_hit()`) — eski in-memory limiter Vercel'in çoklu instance'ları arasında paylaşılmıyordu, artık cross-instance. Migration yoksa eski davranışa zarif düşer.
- **Puan harcama artık ATOMİK** (`supabase/loyalty-atomic.sql` ⚠️ ÇALIŞTIRILMALI + `claim_redeem_points()`, advisory lock) — iki eşzamanlı checkout aynı puanı iki kez harcayamaz.
- Sold-out hatasında lokalize ürün adı · returns API hata kodları (iban/photo/window/active/cancel) 4 dilde · **test kapsamı 24→47** (loyaltyReversal/promoValidation/rateLimit, gerçekçi in-memory Supabase fake'i `src/lib/testUtils/fakeSupabase.ts`) · TOG (uyku sıcaklık) rehberi `/size-guide`'a · yeni `/accessibility` sayfası (dürüst dil, tam WCAG iddiası yok).
- **Yan bulgu — SİTE GENELİNDE ÇİFT BAŞLIK BUG'I**: kök `layout.tsx`'teki `title.template` her sayfanın zaten "— Loov" içeren başlığını ikiye katlıyordu ("Terms — Loov — Loov"), TÜM sayfalarda, 4 dilde. Tek satır düzeltmeyle kök sebep giderildi, 10 sayfa canlı doğrulandı.
- Doğrulama: tsc+build+47 test temiz, prod smoke-test temiz. **KALAN (bilinçli ertelenen):** sepet cihaz-cihaz senkronu last-write-wins, OTP API-seviyesi zorlama, useProducts ölçek sorunu — mimari kararlar, ayrı oturum.

## 🌍 DEPLOY DURUMU — 🟢 SİTE CANLIDA (11-12 Tem 2026: domain Vercel'e geri eklendi, push→otomatik deploy çalışıyor, kullanıcı canlıda test etti "her şey düzgün")
- **GitHub:** `https://github.com/Mikayill/Loov` (main branch, push → Vercel otomatik deploy). Git identity repo-local: Mike / mikayilismayilovgeo@gmail.com
- **Vercel:** proje adı `loov` (Pro trial). Env değişkenleri girildi (5 adet, tüm ortamlar). ⚠️ Dikkat: env değeri yapıştırırken çift yapıştırma kazası yaşandı (anon key ikiye katlanmıştı → tarayıcıda 401'ler; silip tek sefer yapıştırarak çözüldü)
- **Domain:** `loov.ge` (domenebi.ge'den alındı, 08.07.2027'ye kadar). Nameserver'lar Vercel'e taşındı (`ns1/ns2.vercel-dns.com`) → DNS artık VERCEL panelinden yönetiliyor (domenebi.ge'den DEĞİL). `loov.ge` → `www.loov.ge`'ye 308 redirect
- **🟢 SİTE CANLIDA:** domain (loov.ge + www) Vercel projesine geri eklendi, push → otomatik deploy çalışıyor. (Önceki not: bir ara domainler Remove edilip duraklatılmıştı, 11 Tem'de geri açıldı.) Standard Protection açık (vercel.app URL'i login istiyor)
- **Supabase Auth:** Site URL `https://loov.ge`, Redirect URLs'e `https://loov.ge/auth/callback` + `https://www.loov.ge/auth/callback` eklendi (www'lı olan Google girişi için ŞARTTI). localhost'lar duruyor. **Custom SMTP (Resend) kuruldu** (Authentication → Emails → smtp.resend.com, user `resend`, pass=RESEND_API_KEY) — email-OTP girişi + kayıt kodu + şifre sıfırlama artık gerçekten mail gönderiyor (kullanıcı 11 Tem'de "hızlı ve sorunsuz geliyor" diye canlı test etti). "Confirm signup" ve "Magic Link" şablonlarına `{{ .Token }}` eklendi
- **Resend:** ✅ `loov.ge` domaini **Verified** — giden e-postalar artık `orders@loov.ge`'den, markalı HTML ile (5 gönderim noktası + contact, `EMAIL_FROM` sabiti; `RESEND_FROM` env ile ezilebilir). onboarding@resend.dev sandbox'ından çıkıldı
- **PERFORMANS SORUNU (kısmen çözüldü):** site yavaştı. (1) 5 vitrin sayfası `force-dynamic`'ti → `revalidate = 60` (commit 61eb743). (2) Vercel Functions bölgesi Frankfurt (fra1) — çok sayıda deploy yapıldığı için artık aktif. (3) **ASIL DARBOĞAZ HÂLÂ AÇIK: Supabase projesi Sydney'de (`ap-southeast-2`)** — her DB sorgusu Avustralya'ya gidiyor. Kalıcı çözüm = Supabase'i Frankfurt'a taşımak (yeni proje + veri göçü, kullanıcı panelden yapacak, henüz yapılmadı)
- ~~**Sıradaki oturum:** buglar.md~~ → ✅ **8 Tem 2026'da TAMAMI işlendi** (bkz. aşağıdaki "🐛 BUGLAR.MD ONARIM TURU" bölümü). buglar.md dosyası cevaplarla işaretli duruyor
- ~~**Sıradaki oturum:** buglar.md #2 (yeni 8 madde)~~ → ✅ **9-10 Tem 2026'da TAMAMI işlendi** (bkz. aşağıdaki "🐛 BUGLAR.MD ONARIM TURU #2" bölümü). ✅ **10 Tem 2026: kullanıcı 3 SQL dosyasını Supabase'de çalıştırdı** (`variant-stock.sql`, `product-i18n.sql`, güncellenen `stock.sql`) — stok-per-varyant ve çok dilli ürün adı/açıklaması artık gerçek DB desteğiyle çalışıyor

### 🔐 AUTHENTICATOR APP GERİ + 🟡 BLOK (11 Tem 2026, gece) — TAMAMLANDI
- **Authenticator app (TOTP QR) 2FA GERİ GELDİ:** Kullanıcı "otomatik email OTP kalsın ama QR'lı authenticator seçeneğini de geri istiyorum" dedi. Tasarım: **ikisi bir arada** — Security'de opsiyonel "🔐 Doğrulayıcı Uygulama (2FA)" kartı (enroll: QR+secret→6 hane, disable: kod ister). Girişte **TOTP kuruluysa o (güçlü) kullanılır, değilse otomatik email-OTP** devreye girer (`LoginClient.handleEmailLogin` → `mfaRequired()` önce, sonra email fallback). `AuthContext`'e `listTotpFactors/enrollTotp/unenrollTotp` geri eklendi; silinmiş `auth.mfa*`+`sec.mfa*` anahtarları 4 dilde geri kondu. Admin AAL2 gate dokunulmadı.
- **🟡 blok (3 madde):** (16) **Sepet/favori DB senkronu** — `supabase/cart-wishlist.sql` ✅ ÇALIŞTIRILMALI (user_carts/user_wishlists jsonb+RLS), Cart/WishlistContext DB ile uzlaşır (`src/lib/db/cartSync.ts`, 700ms debounce, guest union-merge, tablo yoksa localStorage'a düşer); (17) **Back-in-stock** — `supabase/stock-notifications.sql` ✅ ÇALIŞTIRILMALI + `/api/stock-notify` + PDP kutusu + admin stok 0→>0'da 4 dilde mail (`src/lib/email/backInStock.ts`); (18) **Testler+CI** — Vitest 23 test (pricing/loyalty/stock), `npm test`, `.github/workflows/ci.yml`.
- ✅ **Kullanıcı çalıştırdı (12 Tem 2026):** `supabase/cart-wishlist.sql` + `supabase/stock-notifications.sql` — sepet/favori cihazlar-arası senkron ve back-in-stock artık gerçek DB desteğiyle tam çalışıyor.
- Doğrulama: `tsc` + `next build` + 23 test temiz.

### 🩹 CANLI TEST GERİ BİLDİRİMİ — 3 UX/MOBİL DÜZELTMESİ (11-12 Tem 2026, gece) — TAMAMLANDI · canlıda test edildi ✅
Kullanıcı deploy'u canlı test edince 3 gerçek hata buldu, üçü de düzeltilip push edildi (kullanıcı "her şey düzgün" dedi):
- **Back-in-stock e-posta mantığı:** girişli kullanıcıdan e-posta sormak saçmaydı → artık **girişli tek tıkla "🔔 Haber ver"** (hesap e-postası otomatik, `pdp.notifyAccount`), sadece **misafir** e-posta giriyor (`ProductDetailClient` — `handleNotifyAccount`/`handleNotifyGuest`, `useAuth` eklendi)
- **PDP galeri swipe:** mobilde oklar vardı ama kaydırma yoktu → foto konteynerine `onTouchStart/onTouchEnd` (40px eşik, sağ=önceki/sol=sonraki); oklar masaüstü için duruyor
- **Admin ürün ekranı mobil taşması:** stok matrisi (`overflow-x-auto`) grid kolonunda `min-w-0` olmadığı için TÜM sayfayı genişletiyordu (CSS grid kolonları varsayılan içeriğin altına küçülmez) → iki grid kolonuna `min-w-0`, Materials telefonda tek sütun, ekleme formu isim alanı esnek. Mobil 390px'te yatay taşma yok (doğrulandı)
- **Ders (kaydedildi):** UI'ları masaüstünde "çalışıyor" görüp bırakma — mobil genişlikte + girişli/misafir senaryoları ayrı test et.

### 🔍 KAPSAMLI DENETİM RAPORU (11 Tem 2026) — kök dizinde `DENETIM-RAPORU.md`
✅ **"Hemen" 5 + "Kısa vade" 9 + "Orta vade" saf-kod 4 = 18 madde aynı gün uygulandı** (bkz. raporun işaretli listesi). Öne çıkanlar: OTP kapısı server-side zorlandı (`/api/auth/otp-gate` + `proxy.ts` → `/account`+`/checkout` gate'li; ⚠️ oturum yine geçerli olduğundan doğrudan API çağrıları gate'siz — sayfa erişimini keser, tam 2. faktör değil, bilinçli kabul); müşteri sipariş iptali (`PATCH /api/orders {action:"cancel"}`, pending-only, stok+puan reversal); misafir puan göçü GÜVENLİ yolla (`/api/account/link-guest-orders` — localStorage değil, doğrulanmış e-postayla misafir siparişlerini bağlayıp puanı gerçek tutardan hesaplar); admin durum geçiş matrisi; teslimat süresi tek kaynak; sepet 99 kelepçesi; JSON-LD indirimli fiyat; telefon +995 önek 3 yerde tek kaynak (`georgia.ts`); kayıt "tekrar gönder"; checkout şartlar checkbox'ı; 27 ölü i18n anahtarı + ölü SocialProofToast silindi; trusted-device "bu cihazı unut" UI; e-postalar `orders@loov.ge` + HTML. **KALANLAR** (sepet-favori DB senkronu · back-in-stock · testler+CI ✅ **11 Tem'de yapıldı**, bkz. yukarıdaki 🟡 blok). Gerçek kalanlar (dış bağımlılık/karar/büyük çaba): **🟠 hesap/DSN gerektiren** — Sentry (DSN) · GA4+Pixel (Measurement ID) · SMS (Twilio, kullanıcı hallediyor) · Supabase Frankfurt göçü (kullanıcı panelden). **🔵 büyük kod (senden bir şey gerektirmez, ayrı oturum)** — locale-URL/hreflang (~40 sayfa) · kategori landing sayfaları · next/image (gerçek fotolarla). **⚫ Faz 3 (iş/hukuk)** — online ödeme (BOG/TBC sözleşme+kimlik) · fatura/KDV. `tsc`+`next build` temiz, yeni guard'lar canlı test edildi (OTP gate 307/200, CSRF 403, cancel 401).
Uçtan uca senaryo denetimi yapıldı: mantık hataları, çelişkiler, ölü kod, büyük sitelerle kıyas, öncelikli yol haritası. **En kritik bulgular:** (1) email-OTP giriş kapısı sadece client-side — `/account` yazan kodu atlayabiliyor, sunucu zorlaması yok; (2) Resend hâlâ sandbox gönderende (`onboarding@resend.dev`) — domain Verified olduğu hâlde geçilmedi, canlıda müşteriye mail GİTMEZ (launch-blocker); (3) OTP resend 30sn ama Supabase SMTP interval 60sn — ilk resend hep patlar; (4) checkout puan vaadi admin `pointsPerGel` ayarını yok sayıyor (CheckoutClient:1031); (5) teslimat süresi 3 yerde 3 farklı hardcoded değer; (6) footer'da Visa/MC rozetleri var ama tek ödeme COD. Tam liste + "Hemen/Kısa/Orta vade" planı raporda.

### 🔐 OTOMATİK OTP GİRİŞİ + SEPET/FAVORİ BUG'I + E-POSTA (10 Tem 2026) — TAMAMLANDI
Kullanıcının canlı testte bulduğu bug'lar + "OTP'yi otomatik/zorunlu yap" isteği, tek oturumda işlendi.

- **KRİTİK BUG DÜZELTİLDİ — sepet/favori hesaba bağlı değildi:** `CartContext.tsx`/`WishlistContext.tsx` sabit localStorage anahtarı kullanıyordu (`"loov-cart"`/`"loov-wishlist"`), `useAuth()` hiç yoktu → aynı tarayıcıda hesap değiştirince önceki hesabın sepeti/favorileri sızıyordu. Fix: anahtar artık `loov-cart:${user.id}` (misafir eski anahtarı kullanmaya devam eder, veri kaybı yok); misafirken eklenenler ilk girişte hesaba otomatik taşınır (adopt), hesap A→B geçişinde asla karışmaz. `LoyaltyContext.tsx` zaten doğruydu (DB/local split), dokunulmadı.
- **2FA sistemi BAŞTAN YAZILDI (iki kez):** Önce TOTP+SMS-factor opt-in sistem kuruldu (Supabase native `mfa.*`), sonra kullanıcı "otomatik olsun, ayrı kurulum istemiyorum" deyince **tamamen kaldırılıp yerine şu geldi**: email+şifre girişinde, tanınmayan tarayıcıda otomatik email'e kod gider (`signInWithOtp`/`verifyOtp type:"email"` — Supabase mfa API'sinde "email" faktör tipi YOK, o yüzden bu ayrı bir mekanizma), **"bu tarayıcıyı 30 gün hatırla"** seçeneği var (yeni `trusted_devices` tablosu + httpOnly cookie, `supabase/trusted-devices.sql` ✅ ÇALIŞTIRILDI). Google girişi ve telefon-OTP girişi bu adımdan muaf. Kod tekrar gönderme 30sn/60sn kilitli (client-side). **Admin panelin AAL2/TOTP zorunluluğu (`AdminMfaGate.tsx`) DOKUNULMADI** — hâlâ eski güçlü sistemde, `verifyTotp/sendPhoneFactorCode/verifyPhoneFactor/mfaRequired` `AuthContext.tsx`'te sadece admin için kaldı. `SecurityClient.tsx`'teki eski "Enable 2FA" enroll UI'ı tamamen silindi, yerine "eksik email/telefon ekle" + "telefon-only hesaba şifre ekle" alanları geldi.
- **Kayıt-kodu doğrulama:** `RegisterClient.tsx`'e kod girme ekranı eklendi (`verifySignupCode`, `type:"signup"`). ⚠️ **Sadece Supabase'de custom SMTP kurulup "Confirm signup" şablonuna `{{ .Token }}` eklenirse gerçekten çalışır** — kullanıcı bu oturumda SMTP'yi Resend üzerinden kurdu (Authentication → Emails → Set up SMTP → smtp.resend.com, user `resend`, pass=`RESEND_API_KEY`). Şablona `{{ .Token }}` eklendi mi TEYİT EDİLMEDİ — sıradaki oturumda kontrol edilmeli.
- **Şifre kuralı:** min 6 → **min 8 karakter + en az 1 rakam**, 5 yerin hepsinde (`AuthContext.signUpWithEmail/updatePassword`, `RegisterClient`, `ResetPasswordClient`, `SecurityClient.handleChangePw`), 4 dilde yeni mesajlar.
- **NewsletterPopup:** `/login` ve `/register`'da artık hiç çıkmıyor (`usePathname` exclusion); tasarım küçültüldü (social-proof şeridi kaldırıldı, `max-w-md`→`max-w-sm`, daha hafif gölge/blur).
- **forgot-password'da bulunan bug:** eski mock-auth döneminden kalma "Demo mode: No real email is sent" notu hâlâ duruyordu (artık gerçek mail gidiyor) — kaldırıldı.
- **Giden e-postalar HTML'lendi:** 5 gönderim noktası (sipariş onayı, sipariş durum, iade talebi, iade durumu, iletişim formu) düz metin gönderiyordu → yeni paylaşılan `src/lib/email/render.ts` (sage-teal header + beyaz kart + krem footer) ile artık hem text hem markalı HTML gidiyor.
- **Checkout telefon alanı:** `+995` artık sabit/silinemez önek (kullanıcı sadece kendi numarasını yazıyor), `PHONE_COUNTRY_CODE` + `phoneLocalPart()` ile.
- **Diğer küçük düzeltmeler bu oturumda:** stok bug'ı (`hasAnyStock()` — bir varyant tükenince TÜM ürün yanlışlıkla "sold out" görünüyordu, `QuickAddButton`/`BabyPicksSection`/JSON-LD/`WishlistContext` düzeltildi), checkout'ta eksik-alan üst-bildirimi (toast, tek alan varsa ismen söylüyor), puan kullanım tavanı admin'den ayarlanabilir oldu (`loyaltyMaxRedeemPercent`, varsayılan %20, `SettingsClient.tsx`).
- **Doğrulama:** `tsc` + `next build` her adımda temiz, Playwright ile login/register/checkout canlı test edildi (şifre kuralı reddi, checkout toast, telefon prefix hepsi doğrulandı).
- **KALAN:** Supabase "Confirm signup" şablonuna `{{ .Token }}` eklendiği teyit edilmedi · gerçek email-OTP login akışı (kod gerçekten geliyor mu) kullanıcı kendi hesabıyla test etmeli · loov.ge domaininin Resend'de "Verified" olup olmadığı teyit edilmedi.

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

### 🎟️ PROMO KODLARI ADMIN'E TAŞINDI (8 Tem 2026) — TAMAMLANDI
- **Koda gömülü kodlar SİLİNDİ** (`src/lib/promo.ts`'te sadece `PromoDef` tipi + saf `promoDiscountAmount` kaldı). YENIDOGAN + HEDIYE tamamen gitti; **LOOV10 `supabase/promos.sql` seed'iyle DB'ye taşındı**
- **`promo_codes` tablosu** (`supabase/promos.sql` — ⚠️ KULLANICI PANELDE ÇALIŞTIRACAK): code (UPPERCASE, unique), type percent/shipping, value (0-90), expires_at (null=süresiz), usage_limit (null=sınırsız toplam), times_used, active. RLS: public read YOK (kod listesi sızdırılamaz), admin `is_admin()` okur, yazma service-role
- **KURALLAR (kullanıcı kararı):** kodlar **ÜYELERE ÖZEL** (misafir uygulayamaz → "üyelere özel, giriş yap" + login linki) · **kişi başı 1 kullanım** (orders.promo_code+user_id sayımı, cancelled hariç) · toplam limit + son kullanma tarihi admin'den
- **Ortak doğrulayıcı** `src/lib/promoValidation.ts` (`validatePromoServer`/`promoAvailable`/`recordPromoUse`) — hem `/api/promo` hem `/api/orders` kullanır, kurallar ayrışamaz. Sipariş başarılı olunca `times_used` koşullu artar (son-kullanım yarışı bilinçli kabul, puan-race kararıyla tutarlı)
- **`/api/promo`**: POST = üye doğrulaması (hata kodları: invalid/expired/limit/used/signin → sepette ayrı ayrı i18n mesajlar ×4); GET `?code=` = sadece `{available}` (popup için, auth'suz, değer sızdırmaz)
- **Client:** `src/lib/db/promo.ts validatePromo()` fetch sarmalayıcı; CartClient Apply async + hata mesajları + login linki; CheckoutClient mount'ta taşınan kodu yeniden doğrular. `cart.promo10/promo15` anahtarları silindi → `cart.promoPercentOff` ("{n}% discount applied") + promoExpired/LimitReached/AlreadyUsed/MembersOnly/SignIn ×4
- **Admin:** `/admin/promos` (nav 🎟️ Promos) + `/api/admin/promos` GET/POST/PATCH/DELETE (bundles deseni, audit'li). Oluştur: kod A-Z0-9 3-20, %1-90 veya free shipping, bitiş tarihi (gün sonu kaydedilir), toplam limit. Satırda: kullanım sayacı, satır içi tarih/limit düzenleme, Active toggle, Delete. Tablo yoksa "run promos.sql" uyarısı
- **Popup dönüşümü:** NewsletterPopup artık **üye-ol popup'ı** — e-posta formu SİLİNDİ (boş mail suistimali gerekçesiyle, kullanıcı kararı). Sadece misafirlere; göstermeden `GET /api/promo?code=LOOV10` ile kodun canlı olduğunu doğrular (admin LOOV10'u silerse/pasifleştirirse popup hiç çıkmaz). CTA → /register + "Sign in" linki. `news.*` anahtarları revize (invalidEmail/noSpam/welcome/yourCode/startShopping silindi; body/cta/signin/copyHint yenilendi ×4)
- **Temizlik:** `cart.promoPlaceholder`'dan "e.g. LOOV10" çıktı; `faq.ord.a4` kod adlarından arındırıldı ("üyelere özel, üye ol" genellemesi) ×4
- **Doğrulama:** tsc + build temiz · guard'lar canlı test (no-origin 403, misafir 401 signin, admin API yetkisiz 404) · tablo yokken zarif düşüş (kod invalid, popup gizli, admin uyarı banner'ı) · sızıntı taraması temiz
- ⚠️ NOT: Bu oturumda dev sunucuda Turbopack `.next` cache bozulması yaşandı (0xc0000142 panic, tüm sayfalar 500) — `rm -rf .next` + yeniden başlatma çözdü. Kod hatası değildi

### 🖼️ SIRADAKİ BÜYÜK İŞ: EMOJİLERDEN KURTULMA (plan hazır, görseller bekleniyor)
- **Plan dosyası: kök dizinde `GORSEL-PLANI.md`** — tema kuralları (sıcak krem + pastel, palet kodları), kullanıcının hazırlayacağı ~24-26 dosyanın TAM listesi (birebir dosya adları + boyutlar), klasör konvansiyonu: kök `gorseller/{kategori,hero,bos-durum,blog,about,sosyal}/`
- Kullanıcı görselleri o klasöre koyup **"gorseller klasörünü işle"** diyecek → yapılacaklar GORSEL-PLANI.md'nin "CLAUDE'UN YAPACAKLARI" bölümünde (optimize→public/img, kategori/hero/boş-durum/blog/about/OG bağlama, kalan ~150 müşteri-yüzü emojiyi **Lucide** (ISC) inline SVG ikonlarla değiştirme, favicon üretimi). Kısmi teslim OK — klasörde ne varsa işlenir
- Ürün + bundle fotoğrafları BU KAPSAMDA DEĞİL (admin'den yüklenince emoji kendiliğinden gidiyor)
- Varsayılan dil artık **ka (Gürcüce)** — ilk ziyaret Gürcüce, çerez seçimi baskın (DEFAULT_LOCALE, config.ts)
- Font telif: Nunito OFL ✅, logo raster olduğu için sorunsuz ✅; logodaki serif fontu metin fontu yapmak istenirse lisansına bakılmalı (veya Playfair/Lora gibi OFL alternatif)

### 🛡️🖼️ ADMIN 2FA + LOGO (8 Tem 2026, gece) — TAMAMLANDI
- ✅ `promos.sql` + `addresses.sql` KULLANICI TARAFINDAN ÇALIŞTIRILDI (doğrulandı: promo_codes'ta LOOV10 seed'li + `/api/promo?code=LOOV10` → available:true; addresses tablosu canlı). Popup ve adres defteri artık tam çalışır durumda
- **Admin 2FA zorunluluğu:** `requireAdmin()` artık AAL kontrol eder — admin hesabında doğrulanmış TOTP varsa ve oturum aal1 ise (örn. Google OAuth girişi kod sormaz) `"mfa-required"` döner → panel yerine `AdminMfaGate` (6 haneli kod ekranı, doğrulayınca panele girer), TÜM admin API'leri kod girilene dek 404. AAL kontrolü başarısızsa varsayılan RET
- **Logo:** kullanıcının `logolardan birini sec` klasöründen **sıcak-beyaz** varyantı seçildi (site kremiyle uyum). Zemin "ink extraction" ile şeffaflaştırıldı → `public/logo.png` (antrasit #26221E wordmark, 640×134); kare orijinal `public/logo-square.png` + OG image. Kullanım: Navbar, footer, 4 auth sayfası, admin sidebar/mobil bar (🌿+yazı lockup'larının yerine). Seçim klasörü gitignore'landı

### 🎨 UI CİLA TURU (9 Tem 2026) — TAMAMLANDI
Kullanıcı "daha güzel animasyonlar, buton basma hissi" istedi → **CSS/Tailwind-only, kapsamlı tek geçiş** (yeni bağımlılık yok).
- `globals.css`: `--ease-snappy`/`--ease-smooth` token'ları + `loov-pop-in/out`, `loov-bump`, `loov-fade-up` keyframe'leri (hepsi `prefers-reduced-motion` guard'ında)
- Ortak `src/components/ui/` kütüphanesi: `Button`/`LinkButton`/`Spinner` (variant/size/loading), `Reveal` (IntersectionObserver scroll-fade). `src/hooks/useDelayedUnmount.ts` — kütüphanesiz exit-animasyon için (modal kapanırken aniden kaybolmak yerine küçülüp soluyor)
- Basma hissi: ProductCard, Navbar (ikonlar + sepet rozeti "zıplama"), CartDrawer geneline `active:scale-*` + `ease-snappy`
- Modal giriş/çıkış: NewsletterPopup, QuickViewButton, BundleQuickView → pop-in/fade-out
- 16 form sayfasında (Login/Register/Checkout/Security/Contact/…) ortak `Button`/`Spinner`'a geçiş
- Ana sayfada `Reveal` ile scroll-fade (kategori/öne çıkanlar/bundle/yorumlar)
- Doğrulama: tsc + build temiz, Playwright ile canlı test edildi

### 🐛 BUGLAR.MD ONARIM TURU #2 (9-10 Tem 2026) — TAMAMLANDI
Kullanıcının ikinci `buglar.md`'sindeki 8 madde, tek kapsamlı planla işlendi (madde 1/2/3/6 aynı kök soruna bağlı olduğu için birlikte).

**Stok-per-varyant + kanonik etiket sistemi (madde 1, 2, 3, 6 — en büyük parça):**
- **Şema:** `supabase/variant-stock.sql` (YENİ, ✅ ÇALIŞTIRILDI — 10 Tem 2026) → `products.stock_by_variant jsonb` ({size: {color: stock}}). Yeni tablo/trigger/RLS YOK — mevcut `size_prices`/`size_colors` ile aynı "jsonb-on-products" mimarisi (daha az yüzey, mevcut "migration çalışmamışsa zarif düş" konvansiyonuyla uyumlu). Bir (size,color) çifti haritada yoksa düz `stock` sütununa düşer — geriye dönük veri taşıma YOK, boş `{}` ile başlar
- **`src/lib/catalogTags.ts`** (YENİ): `CANONICAL_COLORS` (labels.ts'teki `COLOR_KEYS`'ten), `SIZE_GROUPS` (yaş aralıkları + "One Size"/ayakkabı, + havlu gibi ürünler için serbest "özel ölçü" deseni), `CATEGORY_TEMPLATES` (önceden `ProductsClient.tsx` VE `api/admin/products/route.ts`'te kopya duruyordu, tek yere toplandı)
- **`src/lib/stock.ts`** (YENİ): `variantStock(product, size, color)` — seçili varyantın gerçek stoğu (yoksa düz stock'a düşer, `null` = sınırsız)
- **Sunucu:** `supabase/stock.sql` (GÜNCELLENDİ, ⚠️ TEKRAR ÇALIŞTIRILMALI) — `reserve_stock`/`release_stock` artık `color`/`size` alıp `stock_by_variant` yolunda atomik düşüyor/artıyor, o kombinasyon takipsizse düz stoğa düşüyor (aynı fonksiyon içinde fallback). `/api/orders` artık `color`/`size` gönderiyor + migration eksikse otomatik flat-only retry
- **`CartContext`:** `addItem`/`updateQuantity` artık `{added, maxReached, available}` dönüyor — seçili varyantın gerçek stoğuna (sepette zaten olan miktar düşülerek) kelepçeleniyor. `maxReachedNotice` state'i → **`CartToast` bu turda NİHAYET layout'a bağlandı** (kod duruyordu ama hiç mount edilmemişti!) → "Stokta sadece N tane kaldı" uyarısı artık gerçekten görünüyor
- **Ana sayfa hızlı-ekle düzeltmesi:** `QuickAddButton` artık ürünün >1 renk/beden'i varsa direkt eklemek yerine yeni `VariantPickerPopover`'ı açıyor (renk/beden/adet sorar) — tek varyantlı ürünlerde eskisi gibi anında ekliyor
- **Admin:** `ProductsClient.tsx` — renk/beden artık serbest metin `TagInput` değil, `ColorPicker`/`SizePicker` (kanonik çipler + kombo/özel-ölçü escape hatch); eski beden×renk "hangi renk var" checkbox matrisi → **stok-sayısı matrisi** (boş=flat stoğa düş, 0=o kombinasyon yok/tükendi — availability kavramı artık stoktan türüyor, ayrı `size_colors` tutulmuyor)
- Çağrı noktaları taraması: `ProductDetailClient` (sahte `productStock()` üretici SİLİNDİ), `QuickViewButton`, `BundleQuickView`, `CartDrawer`/`CartClient` (+ butonu artık gerçekten disabled oluyor), `WishlistClient`, `BundleDetailClient` — hepsi gerçek varyant stoğu kullanıyor

**Diğer 4 madde:**
- **Teslimat tahmini ayarı:** `deliveryMinDays`/`deliveryMaxDays` → `settings.ts` + admin Settings kartı (PDP'deki sabit "2-4 gün" kaldırıldı)
- **PDP hayalet-scroll bug'ı ÇÖZÜLDÜ:** kök neden tab çubuğundaki `overflow-x-auto`'nun tarayıcı tarafından `overflow-y-auto`'ya da zorlanması (CSS spec quirk) — 2px'lik gerçek ama görünmez bir scroll alanı yaratıyordu. Fix: `overflow-y-hidden` eklendi
- **Arama SIFIRDAN yeniden yazıldı:** eski `SearchModal.tsx` (popup) SİLİNDİ. Artık navbar'daki kutuya direkt yazılıyor, altında canlı dropdown açılıyor (popup yok). `src/lib/search.ts` — çok-kelimeli AND eşleştirme (isim+kategori+renk+beden, ham+çevrilmiş), `SearchResultsPanel.tsx` (paylaşılan sonuç paneli, hem masaüstü hem mobil hem 404 sayfası kullanıyor)
- **Çok dilli ürün adı/açıklama:** `supabase/product-i18n.sql` (YENİ, ✅ ÇALIŞTIRILDI — 10 Tem 2026) → `products.name_ka/ru/tr` + `description_ka/ru/tr`. Boş dil → İngilizceye düşer (alan-bazlı fallback, blog modülüyle aynı desen). Admin'de isim/açıklamanın üstünde 4 dil sekmesi. `mapProductRow` artık locale parametresi alıyor (server: `getServerLocale()`, client: `useProducts` artık **locale'e göre cache'leniyor** — dil değişince yeniden çekiyor)

**Doğrulama:** tsc + `next build` her adımda temiz · Playwright ile canlı test (stok kelepçesi + toast, CartDrawer disabled +, arama çok-kelimeli sorgu, admin gate 404, VariantPickerPopover akışı)

### 🩹 KULLANICI GERİ BİLDİRİMİ İNCE AYARI (10 Tem 2026) — TAMAMLANDI
Yukarıdaki turdan sonra kullanıcının canlı test ederken bulduğu küçük ama can sıkıcı sorunlar:
- **Sold-out/engellenmiş butonlar artık kırmızı** (`bg-red-500`, siteyle tutarlı) — önceden soluk gri "Out of Stock" gösteriyordu. Stok kelepçesi bir eklemeyi tamamen bloke ettiğinde (sepette zaten max varsa) buton artık sessizce hiçbir şey yapmak yerine **kırmızıya dönüp "Daha fazla eklenemez" yazıyor** (yeni `cart.cantAddMore` anahtarı, 4 dilde) — QuickView, ana sayfa hızlı-ekle popup'ı, PDP, sepet setleri (bundle), favoriler dahil her yerde
- **CartToast artık modalların ÜSTÜNDE** (`z-[700]`, önceden `z-[300]` — QuickView/popup'ların `z-[500]` blur'lu arka planının ALTINDA kalıp okunamıyordu)
- **Arama kutusundaki çirkin yeşil çerçeve kaldırıldı** — kök sebep `globals.css`'teki site-geneli `:focus-visible` kuralının **katmansız (unlayered)** tanımlanmış olmasıydı, bu yüzden herhangi bir Tailwind `focus-visible:outline-none` utility'si onu asla ezemiyordu (CSS Cascade Layers kuralı: katmansız her zaman katmanlıyı yener, specificity'den bağımsız). Fix: kural `@layer base` içine alındı — artık spesifik elemanlarda override edilebiliyor
- **"⌘K" yazısı kaldırıldı** (kısayol çalışmaya devam ediyor, sadece görünmüyor)
- **Arama kutusuna yazarken sayfa yukarı kayması ÇÖZÜLDÜ** — kök sebep `html`'deki `scroll-padding-top: 88px` (çapa linkleri için, sticky navbar'ın altında kalmasın diye) + arama kutusunun sticky header içinde olması: her tuş vuruşunda React input değerini güncelleyince Chromium "input'u görünür tut" refleksiyle sayfayı o padding'e göre geri kaydırıyordu. Fix: arama aktifken `scroll-padding-top` geçici olarak 0'a çekiliyor, kapanınca geri geliyor (sayfanın başka yerindeki çapa linkleri bozulmadı)
- **PDP foto galerisine minimal sol/sağ ok butonları eklendi** — crossfade ile sonsuz döngü (son fotodan ileri → başa, sıçramasız, çünkü zaten slide değil crossfade)
- ~~**E-posta çözümü araştırıldı**~~ (Yandex 360 ücretsiz planı Aralık 2025'te kalktı, Zoho Mail bölgeye göre değişebiliyor) — kullanıcı bu konuyu ertelemeye karar verdi, `hello@loov.ge` hâlâ placeholder

---

## ✅ TAMAMLANAN ÖZELLİKLER

### Altyapı
- Next.js 15 App Router + TypeScript kurulumu
- Tailwind CSS v4 (`@theme` in globals.css, config yok)
- HTTP güvenlik header'ları (next.config.ts)
- Sitemap (`/sitemap.ts`) + Robots (`/robots.ts`)
- Metadata: OpenGraph, Twitter Card, keywords

### Bileşenler (Components)
- **Navbar** — sticky, dönüşümlü announcement bar (4 mesaj, 3.5s), **arama artık gerçek bir input (popup değil)**, wishlist, dil seçici, user dropdown, mobil hamburger menü
- **SearchResultsPanel** — arama sonuç paneli (paylaşılan: masaüstü dropdown + mobil satır + 404 sayfası), çok-kelimeli AND eşleştirme, kategori pill'leri, son aramalar (localStorage, 5 adet), NEW badge (bkz. `src/lib/search.ts`)
- **LanguageSwitcher** — EN / KA / RU / TR (çerez tabanlı, i18n Faz 1 CANLI — bkz. 🌐 i18n bölümü)
- **CategoryFilter** — kategori pill'leri + sort + fiyat filtresi + yaş filtresi (0-3m/3-6m/6-12m/1-2y/2y+) + renk filtresi + grid/liste görünümü toggle + Load More (8'er)
- **ProductCard** — foto/emoji+renk, New badge, wishlist toggle, yıldız rating, QuickViewButton (hover), QuickAddButton (sepete hızlı ekle)
- **QuickAddButton** — tek renk/beden varsa anında ekler; birden fazlaysa `VariantPickerPopover` açıp sorar (renk/beden/adet)
- **QuickViewButton** — ürün kartında hover'da görünür, tam modal (renk/beden/qty/wishlist)
- **VariantPickerPopover** — hafif renk/beden/adet seçici popup (QuickAddButton'ın çok-varyantlı ürünlerde açtığı)
- **CartDrawer** — "Add to Cart" sonrası sağdan açılan mini sepet (custom DOM event ile tetiklenir), + butonu gerçek stoğa göre disabled olur
- **CartToast** — sepete eklendi bildirimi + stok-kelepçe uyarısı ("Stokta sadece N tane kaldı"), `z-[700]` (tüm modalların üstünde)
- **WishlistButton** — server component içinde kullanılabilir client bileşen
- **MobileBottomNav** — sm:hidden, 4 tab (Home/Shop/Wishlist/Cart), badge'lar
- **SocialProofToast** — "Nino from Tbilisi just bought..." rotating toast, 9s gecikme, 28s interval, sol-alt köşe
- **NewsletterPopup** — 45s gecikme, sessionStorage (1x/session), üye-ol popup'ı (bkz. 🎟️ Promo bölümü)
- **BackToTop** — scroll sonrası görünür, mobil nav ile çakışmaz
- **CookieConsent** — 1.5s gecikme, Accept/Decline, Privacy Policy linki
- **ReviewsSection** — gerçek yorum sistemi (bkz. 🆕 Büyük özellik paketi)
- **RecentlyViewedSection** — localStorage tabanlı, son 4 ürünü gösterir, "Clear history" butonu
- **WhatsAppButton** — fixed sol-alt, WhatsApp green (#25D366), tooltip (numara boşsa gizli)

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
| `404` Not Found | ✅ 404 grafik + çalışan arama kutusu (gerçek input + dropdown, popup yok) + butonlar |
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
- ✅ Ürün detay stok göstergesi gerçek DB stoğu kullanıyor — **9-10 Tem 2026'dan beri seçili beden×renk'e özel** (`stock_by_variant`, bkz. 🐛 BUGLAR.MD ONARIM TURU #2), takipsiz kombinasyon düz `product.stock`'a düşer
- ✅ Sipariş oluşturma gerçek: `POST /api/orders` → `orders` + `order_items` tablolarına yazar. Fiyatlar sunucuda DB'den yeniden hesaplanır, origin (CSRF) kontrolü, alan doğrulama
- ✅ **Loov Rewards** (sadakat programı): 1₾ = 2 puan, 100 puan = 5₾ indirim (sepet ara toplamının max %30'u), Bronze/Silver/Gold seviyeleri (1000/3000 lifetime puan, x1.25/x1.5 kazanım). Sayfa: `/account/rewards`. Checkout review adımında "Use points" toggle. `supabase/loyalty.sql` çalıştırılınca `orders.points_redeemed/points_discount` kolonları da dolar (çalıştırılmadıysa API zarif düşer)
- ✅ **Supabase Auth CANLI**: AuthContext gerçek (signInWithPassword/signUp/signInWithOAuth/OTP/updateUser). `src/proxy.ts` (Next 16'da middleware'in yeni adı — named export `proxy`) session token'larını tazeler. `/auth/callback` route'u OAuth + e-posta onay dönüşünü karşılar (`exchangeCodeForSession`). Register'da "check your inbox" info akışı var. Profil düzenleme gerçek (user_metadata + profiles upsert). Girişli kullanıcının siparişine `user_id` otomatik bağlanır (`/api/orders` zaten cookie'den okuyor)
- ⚠️ KULLANICI YAPACAK (panel): (1) Supabase → Authentication → URL Configuration → Site URL `http://localhost:3000` + Redirect URL `http://localhost:3000/auth/callback`; (2) Google OAuth: Google Cloud Console'dan Client ID+Secret alıp Supabase → Providers → Google'a yapıştırmak (authorized redirect URI: `https://tbdjgigctdtmkohlqvvn.supabase.co/auth/v1/callback`)
- ✅ **Google OAuth ÇALIŞIYOR** (kullanıcı test etti — Google ile giriş yapıp /account'a düştü). Google Cloud Console + Supabase Providers ayarları yapıldı
- ✅ **Sipariş geçmişi gerçek**: `/account/orders` + `/account/orders/[id]` artık DB'den okuyor (`src/lib/db/myOrders.ts`, browser client + RLS). URL'de uuid değil order_number (BBK-...) kullanılıyor. Boş durum ekranı var. Mock 3 sipariş kaldırıldı
- ✅ **Track-order gerçek**: `supabase/track-order.sql`'deki SECURITY DEFINER `track_order(order_no, email)` fonksiyonu ile misafir sorgusu (service key GEREKMEDEN). Güvenlik: sipariş no + e-posta ikisi de eşleşmeli; adres/telefon dönmez. Fonksiyon DB'de yoksa site "temporarily unavailable" gösterir. Mock sipariş verisi tamamen silindi (`mockOrders.ts`'te sadece tipler + statusConfig kaldı)
- 🐛 **AÇIK SORUN (track-order UI)**: Fonksiyon DB'de çalışıyor (Node'dan rpc testi ✅ BBK-3V570MU + p@t.com sonuç döndürüyor) ama kullanıcının TARAYICISINDA hâlâ "temporarily unavailable" görünüyor (3 Tem 2026). Muhtemel sebep: eski JS bundle önbelliği (Ctrl+Shift+R denenmedi) veya browser client rpc çağrısında farklı bir hata. DEBUG İPUCU: `trackOrder()` içindeki catch tüm hataları "unavailable" yapıyor — tarayıcı konsolundaki `[trackOrder]` warn mesajına bakılmalı
- ⏳ SIRADAKİ: loyalty ledger'ı DB'ye taşıma, e-posta bildirimleri (Resend), checkout'ta girişli kullanıcının bilgilerini otomatik doldurma
- ✅ **Katalog TAMAMEN DB'de**: client bileşenler de bağlandı — `src/lib/db/useProducts.ts` hook'u (statik listeyle anında render + arkada DB'den taze katalog, modül-seviyesi cache ile sayfa başına 1 istek). Bağlananlar: arama (`src/lib/search.ts`), CartClient (öneriler), WishlistClient, WishlistContext (priceDrop), RecentlyViewed, SocialProofToast, bundles/[slug] (server), sitemap (`getAllProductsStatic` — çerezsiz varyant, build'de statik kalabilsin diye). Statik `lib/products.ts` artık SADECE yedek (DB erişilemezse) + `categoryLabels`
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
- **Atomik stok rezervasyonu** (oversell/race fix): `supabase/stock.sql` → `reserve_stock(jsonb)` + `release_stock(jsonb)` (SECURITY DEFINER). Sipariş verilince `/api/orders` atomik düşer; son ürünü 2 kişi aynı anda alırsa koşullu UPDATE (stock>=qty) ile SADECE biri başarılı, diğeri 409 "sold out". Sipariş kaydı sonradan patlarsa `release_stock` ile geri verilir (telafi). Fonksiyon yoksa zarif atlar (uyarı loglar). NULL stock = takipsiz/sınırsız. ✅ `supabase/stock.sql` ÇALIŞTIRILDI (5 Tem 2026 doğrulandı: reserve_stock/release_stock DB'de — stok artık gerçekten düşüyor). ✅ **9-10 Tem 2026'da fonksiyonlar beden×renk-farkında hale getirildi (bkz. BUGLAR.MD ONARIM TURU #2) — dosya 10 Tem 2026'da TEKRAR çalıştırıldı**, artık stok_by_variant varsa onu kullanıyor
- **Client stok sınırı**: ürün detay miktar seçici + sepet "+" butonu artık seçili beden×renk'in gerçek stoğunu aşamaz (`src/lib/stock.ts variantStock()`), tükendiyse "Out of Stock" (buton kapalı, kırmızı). Kelepçe aşılırsa `CartToast` uyarısı. Sunucu yine de gerçek guard
- **Aciliyet rozeti**: ürün detayda "🔥 N people have this in their cart right now" — deterministik (product.id + saat), hydration-safe (SSR id-only, mount'ta saat eklenir). Sitedeki mevcut sahte-sosyal-kanıt desenine uygun (reviews/SocialProofToast gibi)

### 🆕 BÜYÜK ÖZELLİK PAKETİ (3 Tem 2026) — mağaza ayarları, indirim, çoklu foto, sezon, gerçek yorumlar
> ✅ `supabase/features.sql` ÇALIŞTIRILDI (doğrulandı — settings/reviews tabloları ve tüm kolonlar DB'de aktif).

- **`settings` tablosu** (key/value, public read): 3 ayar → `/admin/settings` sayfasından düzenlenir. `src/lib/settings.ts` (tipler+defaults), `src/lib/db/settings.ts` (server `getSettings`, fallback defaults), `src/lib/db/useSettings.ts` (client hook, modül cache). Ayarlar: (1) **1 ₾ başına puan** (`pointsPerGel`, def 2), (2) **ücretsiz kargo eşiği** (`freeShippingThreshold`, def 100), (3) **"yeni" rozeti gün sayısı** (`newBadgeDays`, def 30)
- **İndirim sistemi**: `products.discount_percent` (0-90). `src/lib/pricing.ts` → `effectivePrice/discountPercent/savingsAmount/isNewArrival`. Uçtan uca tutarlı: ProductCard (üstü çizili + −%rozet), ürün detay, sepet satırları+subtotal, CartDrawer, checkout satırları+subtotal, wishlist, quick-view, recently-viewed, **CartContext.totalPrice** hepsi indirimli. **Sunucu fiyatlaması** (`/api/orders`) DB'den discount_percent okuyup indirimli birim fiyatı yeniden hesaplar (client asla güvenilmez) + order_items'a indirimli fiyat yazılır
- **"Yeni" rozeti tarihe göre**: `is_new` artık manuel PIN; rozet ayrıca `created_at + newBadgeDays` ile otomatik. Veri katmanında türetilir (`getAllProducts/getProductBySlug` + `useProducts` settings okuyup `isNewArrival` uygular). Ürün eskidikçe rozet kendiliğinden düşer
- **Kargo eşiği + puan oranı ayardan**: `/api/orders` (server) + cart/checkout/drawer (client `useSettings`) hepsi ayarı kullanıyor; `pointsForAmountAt(amount, pointsPerGel, tier)` yeni helper
- **Çoklu foto**: `products.image_urls text[]` (galeri; `image_url` = birincil/thumbnail, senkron tutulur). Admin: birden çok foto yükle/sil/birincil-yap. Upload route galeriye ekler. Ürün detay: **crossfade galeri** (opacity katmanları, pürüzsüz), thumbnail'ler. **Renk seçimi FOTOĞRAFI DEĞİŞTİRMEZ** (eski renk→bg-tint sistemi kaldırıldı) — renk seçilir, foto sabit kalır
- **Bedene göre renk**: ~~`products.size_colors jsonb` + admin onay-kutusu matrisi~~ → **9-10 Tem 2026'da `stock_by_variant`'a taşındı** (bkz. BUGLAR.MD ONARIM TURU #2) — artık ayrı bir "hangi renk var" listesi tutulmuyor, stok matrisinde 0 = o kombinasyon yok. `size_colors` kolonu DB'de duruyor ama artık okunmuyor/yazılmıyor (vestigial)
- **Sezon**: `products.season` ('all'|'summer'|'winter'). Admin dropdown. `src/lib/season.ts` (`currentSeason`/`matchesSeason`/`sortBySeason` — Nis-Eyl yaz). ✅ Sezona-göre-vitrin sıralaması (`sortBySeason`) 8 Tem'de bağlandı; **sezon FİLTRE pill'i 13 Tem 2026'da CategoryFilter'a eklendi** (bkz. aşağıdaki "🧹 3 KÜÇÜK MADDE" bölümü) — artık ikisi de canlı
- **Düzenlenebilir açıklama + özellikler**: `products.features text[]` (Description tab'ındaki madde listesi) + `description`. Admin'de textarea'lardan düzenlenir. Boş features → varsayılan liste. Ürün detay bunları gösterir
- **Admin ürün editörü** (`ProductsClient.tsx` baştan yazıldı): satır içi hızlı alanlar + genişletilebilen **Edit ▾** panel (galeri, indirim, sezon, renkler/bedenler tag-editörü, beden×renk matrisi, açıklama, özellikler). Hepsi otomatik kaydeder. **Ekleme formunda emoji yerine foto yükleme** (oluştur→foto yükle)
- **GERÇEK YORUM SİSTEMİ** (`reviews` tablosu): **sadece ürünü DELIVERED siparişte alan giriş yapmış kullanıcı** yorum yapabilir (server `has_delivered_product` RPC + fallback query ile doğrulama, service-role insert — public insert yolu YOK). Kullanıcı/ürün başına 1 yorum. **İsim göster/gizle toggle** (gizliyse "Anonim"). **SADECE METİN — foto yok**. `/api/reviews` (GET liste+istatistik+uygunluk, POST oluştur, CSRF). `ReviewsSection.tsx` sahte veriden gerçeğe çevrildi (yıldız input, form, uygunluk durumları). **Admin yorum yönetimi**: `/admin/reviews` + `/api/admin/reviews` (listele/gizle/sil, filtre)
- **Detaylı loglar** (`/admin/logs`): audit_log + **siparişler** + **yorumlar** birleşik aktivite akışı. `/api/admin/logs` üç akışı normalize edip birleştirir. Tür filtresi (Orders/Reviews/Admin) + özet çipleri
- **Ana sayfa**: "Kategoriye Göre Alışveriş" bölümü compact yapıldı. i18n Faz 1 ana sayfa TAMAM (hero/kategori/öne çıkanlar/setler/neden-biz/yorumlar). Ürün detay + yorum sistemi de i18n'li (`pdp.*` + `rev.*` anahtarları 4 dilde; ka DRAFT). Çeviri kontrol dosyası `CEVIRI-KONTROL-KA.md` güncellendi (abla incelemesi için)
- **DOĞRULAMA**: `tsc --noEmit` temiz · tüm ana sayfalar (/ /products /cart /checkout /wishlist /products/[slug]) + API'ler 200/beklenen kod · admin API'ler yetkisiz 404 · features.sql yokken zarif fallback (sadece "[settings] using defaults" uyarısı)
- ⏳ **SIRADAKİ**: ~~sezon filtresi+vitrin sıralaması bağlama~~ ✅ TAMAMEN bağlandı (sıralama 8 Tem, filtre pill'i 13 Tem) · ~~QuickAdd bedene-göre-renk farkındalığı~~ (9-10 Tem'de `VariantPickerPopover` ile çözüldü) · ~~storage'da silinen foto orphan temizliği~~ ✅ 13 Tem 2026'da yapıldı (bkz. aşağıda) · materials/care/delivery tab içerikleri henüz i18n değil (ikincil)

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
- **AÇIK KALAN** (öncelikli): `/api/orders` rate-limit yok (flood/mail bombing — deploy'da) · Resend domain doğrulanmadı (mail sadece owner'a) · track-order tarayıcı cache bug · misafir→üye geçişinde local puan DB'ye taşınmıyor · ~~storage'da eski foto orphan kalıyor~~ ✅ 13 Tem 2026'da düzeltildi · admin ürün-id race (2 admin, düşük) · sepette stok düşerse proaktif uyarı yok (checkout'ta reddedilir)

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
- **Bilinen sınırlar (launch-blocker değil, sonraki fazlar):** ürün/set adı+açıklaması hâlâ İngilizce (ayrı "içerik çeviri" fazı gerekir — DB `name_ka`/`description_ka` kolonları + admin çeviri alanları), ka/ru/tr blog+legal metinleri makine kalitesinde çeviri — **abla incelemesi bekliyor** (`CEVIRI-KONTROL-KA.md` 25 bölüm + ayrı `CEVIRI-KONTROL-KA-BLOG.md`), ~~sezon filtresi/vitrin sıralaması UI'a henüz bağlanmadı~~ ✅ 13 Tem 2026'da tamamlandı (bkz. aşağıdaki not), hreflang/locale-routing (`next-intl` /ka URL'i) hâlâ değerlendirilmedi — çerez tabanlı kalmaya devam ediyor.
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
