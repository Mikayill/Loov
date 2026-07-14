# 11 Maddelik Cila + Özellik Planı (15 Tem 2026)

> Kullanıcının yüzeysel verdiği 11 istek, teknik detayına indirilmiş hali.
> Uygulama sırası: **A → E batch'leri** (her batch: tsc + test + görsel doğrulama + commit).
> ⚠️ = kullanıcının Supabase panelinde SQL çalıştırması gereken adım.

---

## BATCH A — Hızlı düzeltmeler (QuickView + arama + shimmer)

### 1. QuickView: boş alana tıklayınca ürün sayfasına gitmesin ✅KÖK NEDEN BULUNDU
- **Kök neden:** Modal `createPortal` ile body'ye taşınıyor AMA React'te portal olayları
  DOM ağacına değil **React ağacına** göre balonlanır. Overlay'in `onClick={close}`'u
  çalışıyor, sonra olay React üst ağacındaki ProductCard `<Link>`'ine ulaşıp navigasyonu
  tetikliyor. (İç panelde `stopPropagation` var, overlay'de YOK — `QuickViewButton.tsx:105`.)
- **Fix:** Overlay onClick'e `e.preventDefault() + e.stopPropagation()` (kapat, gitme).
  Aynı desen `VariantPickerPopover` ve `BundleQuickView`'da da denetlenecek (aynı bug
  büyük ihtimalle üçünde de var — üçü de kart Link'lerinin içinden açılıyor).

### 2. QuickView açılış/kapanış yumuşak animasyon
- Altyapı zaten var: `useDelayedUnmount(open, 160)` + `animate-pop-in`. Eksik olan:
  kapanışta **çıkış sınıfının uygulanması** (pop-out/fade-out) ve backdrop'ın ayrı fade'i.
- Yapılacak: açılış `animate-pop-in` (0.28s smooth) + backdrop `animate-fade-in`;
  kapanışta panel `animate-pop-out`, backdrop `animate-fade-out`; unmount gecikmesi
  160→220ms (animasyon süresiyle eşit). `prefers-reduced-motion` zaten global korumalı.

### 3. Arama: yavaşlık analizi + "Aranıyor…" durumu
- **Neden yavaş:** her tuş sonrası 250ms debounce + `/api/products/search` → Supabase
  **Sydney** (bilinen darboğaz; her sorgu Avustralya'ya gidiyor, ~500-800ms RTT).
  Kod tarafında debounce/iptal zaten doğru (`useProductSearch.ts`). **Kalıcı çözüm kodda
  değil:** Supabase'in Frankfurt'a taşınması (panelden, ayrı iş — CLAUDE.md'de kayıtlı).
- **Kodla yapılacaklar:**
  - `SearchResultsPanel`: `loading===true` iken **"Aranıyor…"** satırı (küçük spinner ile);
    "Sonuç bulunamadı" SADECE `!loading && results.length===0 && query.trim()` iken.
  - Boş sonuç metni: mevcut `search.noResults` + `search.noResultsHint` güncellenir →
    "Doğru yazdığınızdan emin olun" anlamı eklenir. Yeni anahtar: `search.searching` ×4 dil.
  - Yazarken önceki sonuçlar silinmesin (yeni sonuç gelene kadar eski liste + üstte
    "Aranıyor…" şeridi) — titremeyi keser, algılanan hızı artırır.

### 7. Skeleton shimmer: çapraz ışık süpürmesi
- Şu an 17 dosyada `animate-pulse` var (yanıp sönme).
- Yeni global utility: `.u-skeleton` — `bg-panel` + `overflow-hidden` + `::after`
  eğik degrade bant (**~20° eğim**, tam 45° değil: `linear-gradient(100deg,
  transparent, beyaz/İnce parlak, transparent)`), `translateX(-%150→%250)` soldan sağa,
  ~1.8s sonsuz döngü. Karanlık modda bant `white/8`. `prefers-reduced-motion`'da statik.
- 17 dosyadaki `animate-pulse` → `u-skeleton` codemod (sınıf yanında `bg-*` uyumu
  gözden geçirilir; yuvarlak avatar iskeletleri aynen çalışır).

---

## BATCH B — /about + yeni logo/font

### 4. /about karanlık temada bozuk → Nordic'e tam uyum
- Sayfada eski temadan kalma literal renk/gradient bölümleri var (süpürmeler sınıf
  bazlıydı; inline style + `text-[#hex]` kalıntıları karanlıkta okunmaz).
- Yapılacak: `src/app/about/page.tsx` baştan sona token'lara geçirilir (canvas/ink/
  panel/accent-soft), hero bandı ve "values" kartları Nordic diline çevrilir;
  karanlık + aydınlık ekran görüntüsüyle doğrulanır. Metin içerikleri DEĞİŞMEZ (i18n aynı).

### 5. Yeni logo + Cinzel Decorative font
Kaynaklar: `logolardan birini sec/` → `L__1_-removebg-preview.png` (sekme ikonu),
`L.png` (ana logo), `CinzelDecorative-Bold.ttf` (OFL lisanslı — Google Fonts ailesi, ticari kullanım ✓).
- **Favicon:** `L__1_...png` sharp ile kare tuvale oturtulup `src/app/icon.png` +
  `apple-icon.png` olarak yeniden üretilir (mevcutları değişir).
- **Wordmark artık METİN:** `next/font/local` ile `--font-display` (CinzelDecorative-Bold,
  `public/fonts/` altına kopyalanır). Navbar/Footer/auth sayfalarındaki `<img logo.png>`
  yerine `LOOV` yazısı bu fontla (`text-ink` → aydınlık/karanlıkta otomatik doğru renk,
  her ölçekte net). Footer'daki çift-tema invert CSS kuralı kaldırılır (gerek kalmaz).
- **L.png (ana logo):** auth sayfaları başlığı + admin sidebar'da monogram olarak
  kullanılır (`next/image` değil mevcut `<img>` düzeni korunur). OG görseli
  `logo-square.png` şimdilik kalır (istenirse sonra L.png'den yeni OG üretilir).

---

## BATCH C — Loov puan ekonomisi + gamification

### 6. Puan sistemi revizyonu
**Mevcut maliyet analizi (neden pahalı):** kazanım varsayılanı 2 puan/₾, harcama
100 puan = 5₾ ⇒ 100₾ harcayan 200 puan = **10₾ değer = %10 iade** (Gold çarpanıyla %15!).
Sektör normali %2-5. Ek olarak puan kullanılan siparişten de puan kazanılıyor (çifte fayda).

**Yapılacaklar:**
1. **Puan kullanılan siparişten puan KAZANILMAZ** — sunucuda `/api/orders`
   (`pointsRedeemed > 0 ⇒ pointsEarned = 0`, DB ve misafir yolu dahil) + CheckoutClient
   vaadi aynı kurala göre gösterir; yeni i18n: `checkout.noEarnWithRedeem` ×4
   ("Puan kullandığın siparişte puan kazanılmaz").
2. **Harcama kuru admin'e bağlanır:** yeni `loyaltyRedeemValue` ayarı
   (₾ / 100 puan; **yeni varsayılan 3₾**, eski sabit 5'ti — `GEL_PER_BLOCK` settings'ten
   okunur hale gelir; sunucu + client + Rewards sayfası + checkout aynı ayarı kullanır).
3. **Kazanım varsayılanı 1 puan/₾** (ayar zaten vardı, default 2→1; admin istediği an değiştirir).
   → Yeni etkin iade oranı: ~%3 (Gold ~%4.5) — işlevsel ama sürdürülebilir.
4. **Navbar puan rozeti (gamification):** girişli kullanıcıda üst barda ⭐ + bakiye çipi
   (LoyaltyContext'ten, hydration-safe; tıklayınca /account/rewards; bakiye artınca
   `animate-bump`). Mobilde menü içinde satır. Tooltip: "100 puan = {n}₾".
5. Rewards sayfası metinleri/oranları ayarlardan zaten türetiliyor — yeni
   `loyaltyRedeemValue` oraya da bağlanır (kural metinleri güncel kalır).
> Not: mevcut müşteri/puan yok denecek kadar az → kur değişikliği için göç gerekmez.

---

## BATCH D — Zoom + QuickView büyütme

### 8. PDP masaüstü zoom (büyüteç)
- Galeri üzerinde imleç `cursor: zoom-in`; tık kademeleri: 1× → **1.75×** → **2.5×** → 1×
  (son kademede imleç `zoom-out`).
- Yakınken `mousemove` ile `transform-origin` imlecin konteyner içi yüzdesine ayarlanır
  → fare hangi köşeye giderse görüntü o köşeye pan olur (sol-üst → fotoğrafın sol-üstü).
- Geçişler 250ms smooth; foto değişince/mouse ayrılınca kademe sıfırlanır; oklar ve
  swipe zoom=1× iken çalışır (çakışma yok). Emoji ürünlerde de aynı davranış (zararı yok).

### 10. PDP mobil pinch-zoom
- Galeriye iki parmak pinch: `touchmove`'da iki nokta mesafesinden ölçek (1×–3× kelepçe),
  merkez = parmakların orta noktası; bırakınca ölçek kalır, 1×'in altına inerse yaylanıp 1×'e döner.
- Zoom > 1× iken tek parmak **pan** yapar (swipe-ile-sonraki-foto devre dışı; 1×'e dönünce geri gelir).
- Çift dokunuş: 1× ↔ 2× kısayolu. Sayfa kaydırmasıyla çakışmaması için pinch sırasında
  `touch-action` yönetimi + `preventDefault`.

### 11. QuickView PC'de büyüt + Temu-vari özellikler
- `max-w-lg` → `max-w-4xl`, iki sütun: **sol** galeri (ana foto + küçük thumbnail şeridi +
  ok butonları — PDP'dekiyle aynı crossfade deseni), **sağ** bilgi:
  isim · altın yıldız + adet (`Stars`) · fiyat + üstü çizili + −% çipi + `DealCountdown` ·
  renk/beden seçici (mevcut) · stok durumu (mevcut `variantStock`) · adet ± · Sepete Ekle ·
  teslimat tahmini satırı (`pdp.deliveryEst`, ayarlardan) · puan kazanımı satırı ·
  "Ürün sayfasına git →" linki. Mobilde tek sütun kompakt (mevcuta yakın).
- Yeni i18n gerekmez (hepsi mevcut `pdp.*`/`cart.*` anahtarlarından).

---

## BATCH E — Ürün videosu (Temu tarzı)

### 9. Admin'den ürün videosu + kapaklı player
- **Şema ⚠️:** `supabase/product-video.sql` → `products.video_url text`,
  `products.video_poster_url text` (+ `notify pgrst, 'reload schema'`). Kolon yoksa her
  şey bugünkü gibi çalışır (zarif düşüş).
- **Yükleme — Vercel 4.5MB gövde sınırı engeli:** mevcut `/api/admin/upload` üzerinden
  video OLMAZ. Çözüm: yeni `POST /api/admin/video-upload-url` → Supabase Storage
  `createSignedUploadUrl` döner (admin-guard'lı); tarayıcı videoyu **doğrudan Storage'a**
  yükler (mp4/webm, max 100MB), sonra ürün PATCH ile `video_url` yazılır.
  Bucket: mevcut `product-images` (public read zaten açık) — `videos/{productId}/` yolu.
- **Kapak (poster):** admin, ürünün MEVCUT galeri fotoğraflarından birini "video kapağı"
  olarak seçer (ekstra yükleme yok, Temu mantığı) — `video_poster_url` o fotoğrafın URL'i.
- **Admin UI (`ProductsClient` Edit paneli):** "🎬 Video" bölümü — video seç/yükle
  (ilerleme yüzdesi), kapak seçici (galeri thumb'ları), videoyu kaldır butonu
  (Storage'dan da temizler — mevcut `storageCleanup.ts` yardımcıları kullanılır).
- **Vitrin (PDP galerisi):** video, galeride İLK sıradan sonra bir slayt olarak görünür:
  kapak fotoğrafı + ortada yuvarlak ▶ butonu; ▶'ye basınca aynı karede yerel
  `<video controls playsInline poster>` oynar (tarayıcının standart player'ı).
  Slayt değişince video durdurulur. Thumbnail şeridinde ▶ rozetli kapak.
- `mapProductRow` + `Product` tipi: `videoUrl` / `videoPosterUrl` (null-güvenli).

---

## Doğrulama (her batch sonunda + final)
- `tsc` + 60 test + `next build`.
- Tarayıcı: QuickView backdrop tıklaması (navigasyon YOK) + animasyon; aramada yapay
  gecikmede "Aranıyor…"; /about karanlık-aydınlık; yeni wordmark iki temada; puan çipi
  girişli akışta; zoom masaüstü tık kademeleri + origin takibi; mobil pinch (Playwright
  touch emülasyonu); QuickView yeni düzeni; video player (test videosu ile uçtan uca,
  sonra test verisi temizlenir).
- Prod build sonrası branch push (`redesign-nordic`).

## Kullanıcıya düşenler
1. ⚠️ `supabase/product-video.sql` (Batch E'ye gelince — hazırlayınca haber vereceğim).
2. Puan ekonomisi varsayılanlarını (1 puan/₾, 100 puan = 3₾) istersen admin → Settings'ten değiştir.
3. Arama hızının KÖKLÜ çözümü: Supabase'i Frankfurt'a taşıma (panelden; ayrı oturumda yol gösteririm).
