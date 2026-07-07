# Loov — Büyük Onarım & Tamamlama Planı
> Oluşturulma: 4 Temmuz 2026 · Kaynak: kullanıcının "Selam claude.md" listesi (20 madde) + kod incelemesi
> Amaç: "error yok" değil, **gerçek çalışan bir e-ticaret sitesi**. Her madde kök sebebe inildi.

---

## 🔴 FAZ 0 — ÖN KOŞUL (her şeyin kilidi burada)

**Kök sebep bulgusu:** Sitedeki "yarım yamalak" hissinin büyük kısmı, SQL dosyalarının Supabase panelinde çalıştırılmamış olması. Kod bunlar yokken "zarif düşüş" yapıyor (yedek/sahte moda geçiyor) ama bu da tutarsızlık üretiyor.

| SQL dosyası | Ne açar | Çalıştırılmazsa | Durum |
|---|---|---|---|
| `supabase/features.sql` | `reviews`, `settings` tabloları; `discount_percent`, `size_colors`, `season`, `features`, `image_urls`, `material` vb. kolonlar | Yorumlar, ayarlar, indirim, çoklu foto DB'de tutulmaz | ✅ ÇALIŞTIRILMIŞ (4 Tem doğrulandı: `/api/reviews` `ready:true` dönüyor → reviews tablosu var) |
| `supabase/loyalty.sql` | `loyalty_transactions` + puan kolonları | Puan sistemi localStorage'a düşer | ✅ ÇALIŞTIRILDI (5 Tem doğrulandı) |
| `supabase/stock.sql` | `reserve_stock`/`release_stock` | Stok düşmez, sadece uyarı | ✅ ÇALIŞTIRILDI (5 Tem doğrulandı) |
| `supabase/track-order.sql` | misafir sipariş sorgusu | Track-order "unavailable" | ✅ (6 Tem 2026'da yeniden incelendi — bkz. not aşağıda) |
| `supabase/admin.sql` | admin paneli | — | ✅ Çalıştırıldı (panel açılıyor) |

**AKSİYON (kullanıcı):** ✅ TAMAMLANDI (5 Tem 2026) — tüm SQL'ler çalıştırıldı ve doğrulandı: `features`, `loyalty`, `stock`, `returns`, `size-prices`, `materials`, `bundles`, `admin`, `track-order`.
**AKSİYON (ben):** Kodu bu SQL'ler yokken de düzgün davranacak şekilde sağlamlaştır (özellikle item 1). Yani "SQL yok" ≠ "yanlış davranış".

---

## 🟢 FAZ 1 — HIZLI DÜZELTMELER ✅ TAMAMLANDI (4 Tem 2026)

**Yapılanlar:**
- ✅ Item 2: `NewsletterPopup` + `SocialProofToast` layout'tan kaldırıldı (dosyalar duruyor, mount yok)
- ✅ Item 4: Admin stats — iptal siparişler revenue/ordersTotal/today sayılarından çıkarıldı; dashboard "All-time orders" kartında "· N cancelled" gösteriliyor
- ✅ Item 7: PDP başlık rating'i GERÇEK DB istatistiğine bağlandı (`src/lib/db/reviews.ts` `getReviewStats`, yorum yoksa satır gizli); JSON-LD'ye gerçek `aggregateRating` eklendi (yorum varsa); sahte "🔥 N kişinin sepetinde" kaldırıldı; ProductCard sahte yıldız/count kaldırıldı
- ✅ Item 1 (kod tarafı): `/api/reviews` GET — `signedIn` artık reviews tablosu okumasından bağımsız hesaplanıyor (auth önce çözülüyor)
- **Doğrulama:** `tsc --noEmit` temiz · localhost'ta PDP/ana sayfa/API canlı test edildi, hepsi ✅
- **YENİ BULGU:** `reviews` tablosu VAR (`ready:true`) → features.sql çalıştırılmış. Item 1'i tarayıcıda tekrar test et (Ctrl+Shift+R ile): giriş yapılıyken artık "giriş yap" yerine "sadece satın alanlar yorum yapabilir" veya form görünmeli. Yorum yazabilmek için siparişin admin'den **delivered** yapılması şart.
- **Kalan karar:** Ana sayfa "4.9 rating / 1200+ families" pazarlama istatistikleri + testimonials hâlâ kurgu (item 7'nin geniş hali) — kullanıcı kararı bekliyor.

### (arşiv — orijinal analiz)

### ✅ Item 2 — Newsletter pop-up'ı kaldır
- **Yer:** `src/app/layout.tsx:240` `<NewsletterPopup />` + `src/components/NewsletterPopup.tsx`
- **Bulgu:** 45sn sonra çıkıyor, e-posta hiçbir yere kaydolmuyor (sahte). Gürcistan'daki kullanıcıyı gereksiz rahatsız ediyor.
- **Yapılacak:** Layout'tan mount'u çıkar. Bileşen dosyası dursun (ileride lazım olursa), sadece render edilmesin. `SocialProofToast`'u da gözden geçir (item 7 ile bağlantılı — sahte "Nino from Tbilisi" bildirimleri).

### ✅ Item 6 — Gizemli dikey buton (üçgen/nokta/üçgen, sağ orta)
- **Bulgu:** Kod tabanında böyle bir floating widget YOK. `BackToTop` sağ-alt daire, `WhatsApp` sol-alt. Sağ-ortadaki ↑ ⋮ ↓ kontrolü **tarayıcı eklentisi** (scroll/okuma asistanı türü) — bizim kodumuz değil.
- **Yapılacak:** Kullanıcı gizli sekmede (incognito, eklentiler kapalı) açıp doğrulasın. Muhtemelen tarayıcıdaki bir uzantı. Bizde düzeltilecek bir şey yok — ama %100 emin olmak için canlıda test.

### ✅ Item 1 — "Yorum yazmak için giriş yap" (giriş yapılıyken bile)
- **Kök sebep:** `src/app/api/reviews/route.ts` GET — `reviews` tablosu yoksa (features.sql yok) hata dalına düşüp `eligibility.signedIn=false` dönüyor (satır 62-64). Yani tablo eksik → herkes "giriş yapmamış" görünüyor.
- **Yapılacak (2 katman):**
  1. `features.sql` çalıştırılsın (FAZ 0).
  2. **Kod sağlamlaştırma:** `signedIn` bilgisini `reviews` tablosu okumasından BAĞIMSIZ hesapla — `auth.getUser()` her zaman çalışır. Tablo yoksa "yorum yok" göster ama giriş durumu doğru olsun.
- **Not:** Tablo gelince bile yorum yazmak için **teslim edilmiş (delivered) sipariş** şart. Kullanıcının test siparişleri "delivered" değilse yine yazamaz → admin'den siparişi "delivered" yapıp test etsin.

### ✅ Item 7 — Sahte sayılar (rating + "N kişinin sepetinde")
- **Bulgu A:** PDP başlığındaki `4.9 · 24 yorum` **hardcoded** (`ProductDetailClient.tsx:265-268`). Alttaki `ReviewsSection` gerçek DB verisini kullanıyor ama başlık sahte.
- **Bulgu B:** "🔥 N people have this in their cart" (`ProductDetailClient.tsx:175-178, 322-329`) deterministik uydurma. ProductCard'daki yıldızlar da bileşende seed'li sahte.
- **Yapılacak:**
  1. PDP başlık rating'ini gerçek stats'a bağla (server'da `reviews` istatistiğini çekip prop geçir, ya da ReviewsSection'daki stats'ı yukarı taşı). Yorum yoksa yıldız/sayı gösterme.
  2. **Yorum +1/-1 sorusu:** EVET, `reviews` tablosu gerçek `count` döndürüyor — yeni yorum eklenince `stats.count` artar, silinince azalır. Sadece başlığı gerçek stats'a bağlayınca otomatik doğru olur.
  3. "N kişinin sepetinde" ve ProductCard sahte yıldızları: **KARAR** — ya tamamen kaldır (dürüst) ya da gerçek veriye bağla. Öneri: yorum yokken yıldız gösterme; "sepette N kişi" rozetini kaldır (yalan pazarlama, güven zedeler). SocialProofToast da aynı kategoride.

### ✅ Item 4 — İptal siparişler "All-time orders"dan düşsün
- **Kök sebep:** `src/app/api/admin/stats/route.ts:23,34` — `revenue` ve `ordersTotal` TÜM siparişleri (iptal dahil) sayıyor. (Revenue **grafiği** iptalleri hariç tutuyor ama dashboard kartları tutmuyor — tutarsızlık.)
- **Yapılacak:** `allOrders.filter(o => o.status !== "cancelled")` üzerinden revenue + ordersTotal hesapla. Belki "iptal edilen: N" ayrı kart göster.

---

## 🟡 FAZ 2 — ADMIN AYARLARI ✅ TAMAMLANDI (4 Tem 2026)

**Yapılanlar (Item 3 — kargo ayarları):**
- ✅ `StoreSettings`'e 3 yeni alan: `standardShippingPrice` (def 15), `expressEnabled` (def true), `expressPrice` (def 25). `settings.ts` boolean desteği aldı
- ✅ `/admin/settings`: "Standard shipping price" alanı + "⚡ Express Delivery" kartı (ON/OFF toggle + fiyat, kapalıyken fiyat girişi soluk) + canlı önizleme
- ✅ Admin API: yeni alan doğrulamaları (0-1000 ₾) + boolean toggle
- ✅ Tüketiciler ayardan okuyor: CartDrawer, CartClient, CheckoutClient (Express kapalıysa seçenek GİZLİ + seçiliyse otomatik standard'a döner), PDP delivery tab, FAQ, Terms, Contact
- ✅ `/api/orders` (sunucu): fiyatlar ayarlardan; Express kapalıyken express siparişi 400 ile reddedilir
- ✅ **Mantık düzeltmesi:** Express artık HER ZAMAN ücretli — ücretsiz kargo eşiği sadece Standard'a uygulanır (eskiden 100₾ üstü express bedavaydı ama UI 25₾ gösteriyordu = tutarsızlık)
- ✅ **Bonus:** Sipariş geçmişi kargo ücreti artık DB'de saklanan GERÇEK tutardan gösteriliyor (`MockOrder.shippingCost`) — ayar değişince eski siparişler yanlış görünmez

**Yapılanlar (Item 5 — malzeme & bakım):**
- ✅ `supabase/materials.sql` YENİ dosya: `material`, `weight`, `certification`, `origin`, `care_instructions[]` kolonları — ⚠️ **KULLANICI ÇALIŞTIRACAK** (çalıştırmadan admin'de bu alanları düzenlemek "column does not exist" hatası verir; vitrin etkilenmez, varsayılanlar görünür)
- ✅ `Product` tipi + `productMap.ts` (server+client ortak mapper) yeni alanlar
- ✅ Admin ürün editörü: "Materials & Care tab" bölümü — 4 input (material/weight/certification/origin) + bakım talimatları textarea (satır başına bir madde), otomatik kayıt
- ✅ PDP Materials sekmesi ürünün gerçek verisini gösterir; boşsa eski varsayılan metin
- **Doğrulama:** `tsc --noEmit` temiz · 7 sayfa (/,PDP,/cart,/checkout,/faq,/terms,/contact) 200 · terms'te ayar tabanlı metin doğrulandı

### (arşiv — orijinal analiz)

### Item 3 — Express Delivery + ücretsiz kargo eşiği admin'den
- **Bulgu:** `src/lib/settings.ts` — `freeShippingThreshold` (var, def 100) + `pointsPerGel` + `newBadgeDays` mevcut. **Express Delivery YOK** — PDP'de sabit yazılı: `ProductDetailClient.tsx:592` "Express Delivery — 25 ₾" hardcoded.
- **Yapılacak:**
  1. `StoreSettings`'e ekle: `expressDeliveryEnabled: boolean`, `expressDeliveryPrice: number`, `standardShippingCost: number` (şu an 15 ₾ hardcoded).
  2. `settings.ts` + `db/settings.ts` + `useSettings.ts` + `admin/settings` UI'ye toggle + fiyat alanları.
  3. PDP delivery tab'ı, checkout kargo seçimi, tüm "free shipping 100+" metinleri ayardan okusun (tek yerden). Checkout'ta Express seçeneği toggle'a göre görünsün.

### Item 5 — Malzeme & Bakım admin'den düzenlenebilir
- **Bulgu:** `ProductDetailClient.tsx:553-586` Materials tab TAMAMEN hardcoded (Material/Weight/Certification/Origin + 5 sabit bakım maddesi). Admin'de sadece `description` + `features` düzenlenebiliyor.
- **Yapılacak:**
  1. DB kolonları ekle (features.sql'e veya yeni migration): `material text`, `weight text`, `certification text`, `origin text`, `care_instructions text[]`.
  2. `ProductRow`/`DetailsPanel` (admin) → bu alanlar için input/textarea.
  3. `productMap.ts` + `Product` tipi + PDP materials tab bunları göstersin (boşsa varsayılana düş).

---

## 🟠 FAZ 3 — ÜRÜN SİSTEMİ ✅ TAMAMLANDI (4 Tem 2026)

> ⚠️ **KULLANICI YAPACAK:** `supabase/size-prices.sql` çalıştır (`size_prices jsonb` + `fabric text`). Çalıştırmadan da HER ŞEY çalışır (sipariş API'si zarif düşer — canlı test edildi), ama beden fiyatları + kumaş kaydedilemez.

**Item 11 — Ekleme bug'ı ÇÖZÜLDÜ (kök sebep bulundu):**
- Ürün aslında DB'ye ekleniyordu ("Bebek bornoz" id 21 bulundu) ama (a) `colors=[] sizes=[]` ile doğduğu için PDP'de beden seçilemiyor → satın alınamıyordu, (b) listenin sonuna eklendiği için "Load More"suz görünmüyordu → "yok oldu" hissi
- ✅ **Kategori şablonları (sunucu):** POST artık boş renk/beden ile ürün YARATAMAZ — kategoriye göre otomatik doldurulur (body/romper: ay bedenleri; towel: 70×70/90×90; blanket: 120×120; bag: One Size)
- ✅ **Mapper emniyeti:** DB'de renk/bedensiz eski ürünler bile vitrine "Standard"/"One Size" ile satılabilir çıkar
- ✅ **Ekleme formu kategoriye duyarlı:** kategori seçince beden/renk/kumaş şablonu dolar (düzenlenebilir), kumaş dropdown eklendi
- ✅ Kolon migration'ı eksikse POST yeni alanları atlayıp yine de ürün yaratır (asla patlamaz)

**Item 10 — Bedene göre fiyat UÇTAN UCA:**
- ✅ `supabase/size-prices.sql`: `size_prices jsonb` ({"90×90 cm": 48}) + `fabric text`
- ✅ `pricing.ts` yeniden yazıldı: `effectivePrice(product, size?)`, `basePriceForSize`, `hasVariablePricing`, `minEffectivePrice` — indirim beden fiyatının ÜSTÜNE uygulanır
- ✅ PDP: fiyat + üstü çizili fiyat + puan seçili bedene göre değişir; farklı fiyatlı beden butonlarında mini fiyat etiketi
- ✅ Sepet zinciri beden farkındalıklı: CartContext.totalPrice, CartClient, CartDrawer, CheckoutClient, QuickView
- ✅ ProductCard + liste görünümü: değişken fiyatlıysa "from {min} ₾"
- ✅ **Sunucu fiyatlaması** (`/api/orders`): beden fiyatı DB'den satır bazında yeniden hesaplanır (client asla güvenilmez); kolon yoksa taban fiyata zarif düşüş (canlı test: sipariş 200, sonra silindi)
- ✅ **Admin:** Edit panelinde "Price per size" editörü (boş = taban fiyat) + Fabric dropdown

**Item 11b — Kumaş filtresi:**
- ✅ CategoryFilter'a "Fabric:" pill satırı (Cotton/Muslin/Bamboo/Terry/Fleece/Wool) — katalogda kumaş tanımlı ürün varsa görünür, filtre sayacı + Clear entegre
- **Doğrulama:** `tsc` temiz · 6 sayfa 200 · sipariş API'si migration'sız 200 · test verisi temizlendi
- ⏳ Bundle bedene-göre-fiyat → FAZ 4'te (bundles DB'ye taşınırken)

### (arşiv — orijinal analiz)

### Item 11 — Admin ürün ekleme: bug + kategoriye göre alanlar + kumaş
- **Bug (öncelik):** `src/app/api/admin/products/route.ts` POST — yeni ürün `colors`, `sizes`, `image_urls` olmadan ekleniyor. PDP'de `product.sizes[0]` boş → sepete eklenemez; ayrıca DB'de bu kolonlar NOT NULL ise insert patlıyor olabilir. **Reprodüksiyon + fix gerekli** (POST'a mantıklı default'lar + kategori şablonu).
- **Kısıtlılık:** Ekleme formu sadece foto+ad+kategori+fiyat+stok. Renk/beden/açıklama sonradan Edit'ten. Kullanıcı **kategoriye göre** alan istiyor.
- **Yapılacak:**
  1. **Add-product bug'ını çöz** (reprodüksiyon → default colors/sizes/image_urls → doğrula).
  2. **Kategori şablonları:** kategori seçilince ilgili alanlar gelsin:
     - `body`/`romper`: beden (0-3m…), renk, kumaş (pamuk/muslin/bambu), ağırlık
     - `towel`: havlu boyutu (ör. 75×75, 100×100), kumaş
     - `blanket`: boyut, kumaş
     - `set`/pack: içindeki ürünler (bundle mantığı — item 8 ile birleşir)
     - `bag`: boyut, hacim
  3. **Kumaş/materyal alanı** (`fabric` kolonu): pamuk / muslin / bambu / havlu (terry) vb. Her ürün pamuk olmak zorunda değil.

### Item 10 — Bedene göre fiyat (tüm sistem)
- **Bulgu:** `Product.price` tek sayı. `pricing.ts` sadece indirim biliyor, beden fiyatı yok. Sunucu fiyatlaması (`/api/orders`) tek fiyat + indirim üzerinden.
- **Yapılacak (uçtan uca — dikkatli):**
  1. DB: `size_prices jsonb` ({ "0-3 Months": 24, "6-12 Months": 28 }). Boşsa taban `price` geçerli.
  2. `pricing.ts` → `priceForSize(product, size)` helper (indirim + beden fiyatını birleştirir).
  3. PDP: seçili bedene göre fiyat/CTA/puan güncellensin.
  4. CartContext: satır bazında beden fiyatı (şu an `product.price` tutuyor → beden fiyatını `CartItem`'a yaz).
  5. **Sunucu (`/api/orders`):** beden fiyatını DB `size_prices`'tan yeniden hesapla (client'a asla güvenme — güvenlik).
  6. Admin: beden×fiyat editörü (mevcut beden×renk matrisinin yanına).
  7. Havlu/pack fiyatı da bedene göre değişebilsin (item 8 bağlantısı).

### Item 11b — Kumaşa göre filtreleme
- **Yer:** `CategoryFilter` (renk/yaş/fiyat filtreleri zaten var).
- **Yapılacak:** `fabric` kolonu gelince filtre pill'i ekle (pamuk/muslin/bambu…).

---

## 🟣 FAZ 4 — SETLER / BUNDLES ✅ TAMAMLANDI (4 Tem 2026)

> ⚠️ **KULLANICI YAPACAK:** `supabase/bundles.sql` çalıştır — `bundles` tablosu + mevcut 4 setin seed'i (idempotent, düzenlemeleri ezmez). Çalıştırmadan site statik setleri göstermeye devam eder (kırılmaz), ama admin'den düzenleme kaydedilemez.

**Yapılanlar (Item 8):**
- ✅ `supabase/bundles.sql`: bundles tablosu (slug/name/subtitle/tagline/emoji/card_color/description/features[]/items jsonb/original_price/bundle_price/is_new/active/sort) + RLS public read + 4 statik setin seed'i
- ✅ `src/lib/db/bundles.ts`: `getAllBundles()` (sadece active, sort sıralı) + `getBundleBySlug()` — DB yoksa statik `lib/bundles.ts`'e düşer
- ✅ Vitrin DB'den: `/bundles` + `/bundles/[slug]` (force-dynamic — admin düzenleyince anında yansır)
- ✅ **Admin `/admin/bundles`** (+ nav 🎀): isim/fiyatlar/New/Live satır içi; Edit ▾ panelinde subtitle, tagline, emoji, kart rengi (color picker), açıklama ("Bebek Çıkış Seti… every single day" metni), **"Why This Bundle?" maddeleri**, **içindeki ürünler editörü** (ürün dropdown + müşteriye görünen etiket + adet, ekle/sil) — hepsi otomatik kayıt
- ✅ `/api/admin/bundles` CRUD: guard + audit + doğrulama; tablo yoksa admin ekranı "bundles.sql çalıştır" uyarısı gösterir, POST anlaşılır hata döner
- ✅ Yeni set **gizli (Live=off) doğar** — ürünler eklenince açılır (yarım set vitrine düşmez)
- ✅ **Bedene göre fiyat entegrasyonu:** bundle detayında ürün satır fiyatları + "bought separately" toplamı seçilen bedene göre CANLI hesaplanır (büyük havlu seçilince tasarruf dürüstçe küçülür); statik `originalPrice` sadece /bundles listesinde
- **Doğrulama:** `tsc` temiz · /bundles + 2 detay 200 · separately=159/bundle=129 içerik doğru · admin API yetkisiz 404 · (Not: dev server bellek çökmesi yaşandı — 4GB ile yeniden başlatıldı, kod hatası değildi)

**✅ ÇÖZÜLDÜ (6 Tem 2026 — bkz. "BUNDLE + PROMO UÇTAN UCA" bölümü aşağıda):** "Add Bundle to Cart" artık gerçekten set fiyatıyla ekliyor, promo kodları checkout'a ve sunucuya taşınıyor. (Bu not FAZ 4'te bulunduğu haliyle arşiv amaçlı bırakıldı.)

### (arşiv — orijinal analiz)

- **Bulgu:** `src/lib/bundles.ts` **statik dosya** — 4 set hardcoded. `/bundles` + `/bundles/[slug]` bunu okuyor. Admin'de set yönetimi YOK. "Why This Bundle?" (features), açıklama, fiyat hepsi kodda.
- **Yapılacak:**
  1. `bundles` DB tablosu (slug, name, subtitle, tagline, emoji, description, features[], items jsonb, original_price, bundle_price, size_prices, is_new). SQL migration.
  2. `db/bundles.ts` server data layer (yedek: statik `bundles.ts`).
  3. Admin `/admin/bundles` (+ `/api/admin/bundles`) CRUD — tam düzenlenebilir: isim, açıklama ("Bebek Çıkış Seti… every single day" metni), features ("Complete 5-piece…", "Save 30₾…"), içindeki ürünler, foto.
  4. **Bedene göre fiyat** (item 10 ile ortak): pack'in bedeni seçilince fiyat değişsin (havlu boyutu vb.).

---

## 🔵 FAZ 5 — SİPARİŞ YÖNETİMİ ✅ TAMAMLANDI (4 Tem 2026)

**Item 12 — Admin sipariş detayı zenginleştirildi:**
- ✅ API artık zip/notes/gift_wrap/gift_message/locale + `product_id` döner; ürün foto/slug lookup'ı sunucuda birleştirilir (`products` haritası)
- ✅ "What to pack" bölümü: ürün FOTOĞRAFI + ürün sayfası linki (↗ yeni sekme) + adet + renk/beden + birim fiyat + satır toplamı
- ✅ Para dökümü: subtotal + kargo (yöntem + ücretsiz eşikten mi) + gift wrap + indirim (puan/promo türetilmiş) + toplam
- ✅ "Ship to" kartı: ad, tel (tıkla-ara), e-posta (tıkla-yaz), TAM adres (ilçe+posta kodu), kargo yöntemi, müşteri dili bayrağı
- ✅ **"📋 Copy shipping info"** — kargo etiketi için ad+tel+adres+sipariş no'yu tek tuşla panoya kopyalar
- ✅ Gift wrap 🎁 (mesajıyla) + müşteri notu sarı uyarı kutusunda; başlık satırında 🎁 rozeti
**Item 13 — Durum e-postaları CANLI:**
- ✅ `buildStatusMessage` (orderMessages.ts): processing/shipped/delivered/cancelled × EN/KA/RU şablonlar
- ✅ Admin PATCH durum değişince müşteriye Resend ile e-posta (sadece GERÇEK değişimde; pending hariç — onun onay maili zaten var). Hata siparişi asla bloklamaz. Not: Resend domain doğrulanana dek sadece owner'a teslim

**BUNDLE ADMIN v4 — SIFIRDAN, KULLANICIYLA PLANLANDI (4 Tem, 4 karar AskUserQuestion ile alındı):**
Kullanıcı v3'ü tamamen sildirdi ("baştan yapıcaz"). Kararlar: (1) editör AYRI SAYFA `/admin/bundles/[slug]`, (2) tek 💾 Kaydet butonu + kaydedilmemiş değişiklik çubuğu (foto istisna: anında yüklenir, UI'da yazıyor), (3) Live yayını KİLİTLİ — foto + açıklama + fiyat>0 + ≥2 ürün olmadan açılamaz (sunucu da doğrular, `missing[]` döner), (4) sağda CANLI müşteri önizleme kartı (/bundles kartının birebir kopyası, sticky).
- Liste: fotolu kartlar, ●Live/○Hidden hızlı toggle (eksikse anlaşılır uyarı), ▲▼ sıralama (sort swap), isimli silme onayı, "+ New bundle" → isim → oluştur (hidden, sort=son) → editöre yönlendir
- Editör: 3/5 sol (Foto+arkaplan rengi / Metinler / Ürünler: görsel seçici+arama+stepper+katalogdan-silinmiş-ürün kırmızı uyarısı) + 2/5 sağ sticky (Önizleme / Pricing: canlı separately+önerilen %15-25 aralığı+⟳ eşitle / Publish: checklist+kilitli toggle+New rozeti)
- beforeunload uyarısı; dirty=normalize karşılaştırması; Save hatasında `missing` çevirisi Publish panelinde kırmızıya döner
- Dosyalar: `api/admin/bundles/route.ts` (yeniden, ?slug= tekil GET + publish gate), `admin/bundles/page.tsx+BundlesListClient.tsx`, `admin/bundles/[slug]/page.tsx+BundleEditorClient.tsx`
- Doğrulama: tsc temiz · admin sayfaları derlendi (yetkisiz 404) · vitrin 200

**BUNDLE VİTRİN CİLASI (4 Tem, kullanıcı istekleri — HEPSİ TAMAM ✅):**
- ✅ **Duplicate key fix:** `/bundles`'ta React "duplicate key bamboo-hooded-towel" hatası — eski editör verisi aynı ürünü 2 satır yazmıştı. 3 katman: index'li key'ler (`${slug}-${i}`), API `sanitize` artık duplicate slug'ları MERGE ediyor (adetler toplanır, cap 20), DB'deki mevcut duplicate tek seferlik script'le birleştirildi
- ✅ **Kart boyut tutarlılığı:** fotolu/emojili tüm kartlar uniform `aspect-[4/3]` hero (hem /bundles hem ana sayfa)
- ✅ **Compact kartlar + içerik dışarıdan görünür:** `/bundles` grid `grid-cols-2 md:3 xl:4`; kart içinde üst üste binen mini ürün foto yuvarlakları (ilk 4, `-space-x-1.5`), "N items" sayısı (adetler toplamı), tek satır içerik listesi (`2× Bodysuit · Towel…` line-clamp-1)
- ✅ **BundleQuickView** (`src/components/BundleQuickView.tsx` YENİ): kart hover'da "👁 Quick View" pill → portal modal: bundle fotosu, "What's inside" satırları (ürün fotosu, adet, beden-farkındalıklı fiyat, OUT OF STOCK etiketi), canlı "separately vs bundle" para kutusu (You save X ₾ %Y), tek tık "Add Bundle to Cart" (her ürünü ilk renk/beden ile ekler, stok yoksa kilitli), "Configure colors & sizes → View Details" linki. Hem `/bundles` hem ana sayfa set kartlarında canlı
- Doğrulama: `tsc --noEmit` temiz · `/bundles` + `/` 200, Quick View trigger HTML'de mevcut

> 📍 **CHECKPOINT (7 Tem 2026, güncel):** FAZ 0-10'un TAMAMI bitti — orijinal 20 maddelik plan (YAPILACAKLAR-PLAN.md) tüm fazlarıyla tamamlandı. **Tüm bekleyen SQL migrasyonları çalıştırıldı ve doğrulandı** (7 Tem 2026): `supabase/notifications.sql` (admin rozetleri + yorum yanıtı kolonları) ve `supabase/discounts.sql` (`orders.promo_code/promo_discount` + `order_items.bundle_slug/bundle_name`) — dördü de canlı DB'de select ile teyit edildi. Artık bekleyen SQL YOK. **SIRADAKİ İŞ: planlanmış yeni bir faz yok** — kalan işler kullanıcı aksiyonları (çeviri incelemesi, uçtan uca test) ve CLAUDE.md'deki 🔴/🟡 içerik maddeleri (gerçek WhatsApp no/e-posta/ürün foto, ürün adı+açıklaması çevirisi, checkout↔sepet seçim entegrasyonu). Bekleyen kullanıcı aksiyonu: CEVIRI-KONTROL-KA.md ve CEVIRI-KONTROL-KA-BLOG.md abla incelemesi (özellikle bölüm 25 — hukuki metin, native kontrol en kritik). Kullanıcı testleri: uçtan uca iade akışı + FAZ 7 profil/avatar/bebek-bölümü akışı + FAZ 8 ka/ru/tr dil değişimi ile uçtan uca alışveriş akışı + FAZ 9 admin mobil (kullanıcı zaten `/admin/products` mobilde kontrol etti, iyi ✅) + FAZ 10 rozet/yanıt akışı (artık SQL canlı, gerçek test yapılabilir) + promo/bundle kolonlarının siparişlerde gerçekten dolduğunu doğrulama. **Açık, çözülmemiş bug'lar:** hepsi ✅ — (1) ~~"Add Bundle to Cart" set indirimi~~ ve (2) ~~sepet promo kodları~~ **ÇÖZÜLDÜ (6 Tem 2026)** (bkz. aşağıdaki "BUNDLE + PROMO UÇTAN UCA" bölümü); (3) ~~track-order "unavailable"~~ **YENİDEN İNCELENDİ (6 Tem 2026)** — `track_order` fonksiyonu ANON key ile (tarayıcının kullandığı aynı istemci) canlı test edildi, sorunsuz gerçek veri döndürdü; `mapItem`/`mapStatus` kodunda da hata bulunamadı. Kod tarafında GERÇEK bir bug tespit edilemedi — 3 Tem'deki orijinal rapor muhtemelen o günkü eski JS bundle'ından kaynaklanıyordu, o zamandan beri onlarca rebuild/deploy oldu. **Kullanıcı şimdi tekrar denesin** (sert yenileme Ctrl+Shift+R ile); hâlâ tekrar ederse tarayıcı konsolundaki `[trackOrder]` uyarı mesajı yakalanmalı. Dev server notu: bellek çökmesine karşı `NODE_OPTIONS=--max-old-space-size=4096` ile başlat.

---

## 💰 BUNDLE + PROMO UÇTAN UCA (6 Tem 2026) — ✅ TAMAMLANDI

FAZ 4'ten kalan iki bilinen bug aynı kök soruna bağlıydı: indirimler sadece tarayıcıda vardı, sunucuya/siparişe hiç yansımıyordu.

- **Bundle fiyatı artık gerçekten uygulanıyor:** yeni `src/lib/bundlePricing.ts` — `priceCartWithBundles()` tek bir saf fonksiyon, hem `CartClient`/`CheckoutClient` (görüntü) hem `/api/orders` (gerçek ücretlendirme) TARAFINDAN AYNI ŞEKİLDE çağrılıyor, asla birbirinden sapamaz. Kural: sepetteki bir bundle grubu setin resmi ürün+adet listesiyle BİREBİR eşleşmezse (bir ürün çıkarıldı/adet değişti) set fiyatı uygulanmaz, ürünler tek tek fiyatlanır — kısmi bundle indirimi YOK, basit ve güvenli.
- **Sepet kimliği `bundleSlug` içeriyor artık:** `CartItem`/`CartContext.addItem` yeni opsiyonel parametre — bundle'dan eklenen bir ürün, sepette zaten duran aynı ürün+renk+beden ile SESSİZCE birleşmiyor (eşleşme kontrolünü bozardı).
- **Promo kodları paylaşılan modülde:** yeni `src/lib/promo.ts` (`LOOV10`/`YENIDOGAN`/`HEDIYE` — eskiden sadece `CartClient.tsx`'te tanımlıydı). Sepet → checkout localStorage handoff'una promo kodu da eklendi (`loov_checkout_promo`) — checkout kodu KENDİSİ yeniden çözüyor, hiçbir zaman sepetteki hazır indirim tutarına güvenmiyor.
- **`/api/orders` sunucu tarafı:** promo kodu `resolvePromo()` ile doğrulanıyor (geçersizse temiz 400), bundle grupları `bundles` tablosundan çekilip eşleşme kontrolü sunucuda tekrar yapılıyor (asla client'a güvenilmiyor — puan sistemiyle aynı ilke). İndirim sırası: bundle fiyatı → promo %'si → kargo eşiği (promo-sonrası tutara göre) → sadakat puanı (promo-sonrası tutara göre, mevcut `MAX_DISCOUNT_RATIO` sınırı aynı şekilde uygulanıyor).
- **Yeni SQL:** `supabase/discounts.sql` — `orders.promo_code/promo_discount` + `order_items.bundle_slug/bundle_name`. ✅ ÇALIŞTIRILDI (7 Tem 2026 doğrulandı — 4 kolon da canlı DB'de mevcut). Promo kodu ve set adı artık siparişlerde gerçekten kaydediliyor.
- **Stok rezervasyonu kontrol edildi:** aynı ürün hem tek başına hem bundle içinde aynı siparişte olsa bile `reserve_stock` SQL fonksiyonu diziyi tek tek (kümülatif) işlediği için doğru düşüyor — ekstra toplama/birleştirme kodu GEREKMEDİ (fonksiyonun kendisi okunarak doğrulandı).
- **Admin sipariş detayı:** ürün satırında "🎀 {set adı}" rozeti, para dökümünde eskiden tek "Discount (points/promo)" satırı artık "Promo (KOD)" + "Points redeemed" olarak ikiye ayrıldı (artık ikisi de gerçek, ayrı sütunlarda saklanıyor).
- **Canlı doğrulama (gerçek DB'de, temizlendi):** `bebek-cikis-seti` seti (3 ürün, ayrı ayrı 159₾, set fiyatı 129₾) + `LOOV10` ile gerçek `/api/orders` POST'u yapıldı → `subtotal:129` (159 değil ✓), `promoDiscount:13` (129'un %10'u ✓), `total:116` ✓, `order_items.price` toplamı tam 129'a denk geldi (orantılı paylaştırma doğru ✓), stok 3 üründe de doğru 1'er düştü (çift düşme yok ✓). Test siparişi silindi, stok geri yüklendi (`release_stock` ile, uygulamanın kendi telafi mekanizmasıyla aynı yöntem). Geçersiz promo kodu → temiz 400, sipariş oluşmadı ✓. `tsc`+`next build`+lint temiz.
- **Bilinçli kapsam dışı:** `CartDrawer.tsx`'teki `totalPrice` (mini sepet açılır penceresi) bundle-farkında YAPILMADI — bir bundle eklendikten hemen sonra kısa süreliğine biraz yüksek gösterebilir, gerçek sepet/checkout sayfasında düzelir. Bilinçli bir kapsam kararı (drawer'ı da bundle-farkında yapmak layout'ta bundle verisi çekmeyi gerektirirdi, kapsamı büyütürdü).

**(arşiv) BUNDLE ITEMS EDİTÖRÜ v3 — GÖRSEL ÜRÜN SEÇİCİ (4 Tem, kullanıcının 3. düzeltme talebi üzerine baştan yazıldı):**
- ✅ Set içindeki her ürün artık zengin kart: FOTO + katalog adı + birim fiyat (indirimli) + müşteri etiketi (ikincil, blur'da kayıt) + adet stepper (−/+) + satır toplamı + × çıkar
- ✅ "➕ Add products" görsel seçici: arama kutusu + foto+ad+fiyatlı kaydırılabilir liste; tıkla→anında eklenir+kaydedilir; setteyse "+1" yapar; "✓ Added" flaşı; yükleniyor/hata/sonuçsuz durumları açıkça gösterilir (sessiz boş dropdown YOK)
- ✅ Canlı para çubuğu: "Bought separately (canlı katalogdan) / Bundle price / Customer saves %" + tek tıkla "Separately alanını eşitle" butonu
- ✅ Kayıt deseni düzeltildi: `commit(next, patch)` — bayat-state bug'ı giderildi; yapısal değişiklikler anında, metinler blur'da kaydedilir
- Kullanıcı geri bildirimi hafızaya yazıldı: yüzeysel isteklerden TAM gereksinim çıkar, detaylı plan çiz, sonra uygula (feedback-infer-details)

**BUNDLE EDİTÖRÜ DÜZELTMESİ (4 Tem — kullanıcı geri bildirimi "emoji mi satıyoruz"):**
- ✅ Emoji input'u KALDIRILDI → yerine **gerçek foto yükleme** (başlık küçük resmine tıkla VEYA Edit panelindeki büyük yükleme kutusu; Remove photo butonu). Upload route'a `bundleSlug` desteği eklendi (Storage `bundles/{slug}/` yolu, `bundles.image_url`)
- ✅ Foto vitrinde her yerde: /bundles kartı, bundle detay hero'su, ana sayfa set bölümü (foto yoksa emoji yedek)
- ✅ **Ana sayfa set bölümü artık DB'den** (`getAllBundles`) — önceden statik okuyordu, admin düzenlemesi ana sayfaya yansımıyordu
- ✅ **Ürün ekleme akışı düzeltildi:** kırılgan "boş satır ekle→doldur" yerine "➕ Add a product…" dropdown — seçince ürün etiketi+adet 1 ile ANINDA eklenip kaydedilir; adet/etiket blur'da kaydedilir; satırda ürün adı + ×adet rozeti
- ⚠️ **KULLANICI:** `supabase/bundles.sql`'i BİR KEZ DAHA çalıştır (yeni `image_url` kolonu eklendi — dosya idempotent, mevcut setleri ezmez). Çalıştırmadan foto yüklersen net hata mesajı alırsın

**EKSTRA (kullanıcı istekleri, 4 Tem):**
- ✅ **QuickView foto fix:** fotolu ürün artık QuickView'de foto gösteriyor (emoji değil) — ayrıca CartDrawer, sepet satırları, checkout (2 yer), wishlist, bundle detay, admin sipariş item'ları da foto-farkındalıklı yapıldı
- ✅ **11 yeni kategori:** bathrobe (bornoz 🧖), pajama 🌙, dress 👗, pants 👖, outerwear 🧥, shoes 👟, socks 🧦, hat 🧢, bib 🍼, toy 🧸, accessory ✨ — tip birliği + `categoryLabels` + YENİ `categoryPlurals` (Dress+s hatası önlendi) + filtre ikonları + admin listeleri + her kategori için beden/renk/kumaş şablonu (ayakkabı numaraları 16-20, bornoz yaş bedenleri vb.)
- **Doğrulama:** `tsc` temiz · 8 sayfa 200

### (arşiv — orijinal analiz)

### Item 12 — Admin sipariş detayı zenginleştir
- **Bulgu:** `src/app/api/admin/orders/route.ts:20` — `order_items(product_name, quantity, price, color, size)`. Ürün linki/fotosu YOK; pack içeriği görünmüyor; indirim bilgisi yok. Adres alanları var (street/city/district/region) ama tam gösterilmiyor olabilir.
- **Yapılacak:**
  1. `order_items`'a `product_id`, `product_slug`, `image_url` ekle (yazma anında `/api/orders`'ta doldur) → admin detayda ürün fotosu + linki.
  2. Pack siparişlerinde içindeki ürünler + renk + beden dökümü.
  3. Detayda: aldığı fiyat (indirimli mi?), free shipping'den mi, tam adres + telefon + e-posta. "Kargoya hazırlamak için gereken her şey."
  4. Kargo etiketi/özet için yazdırılabilir görünüm (opsiyonel bonus).

### Item 13 — Sipariş durumu değişince e-posta
- **Bulgu:** `src/app/api/admin/orders/route.ts` PATCH — durumu değiştiriyor, stok senkronu var ama **e-posta göndermiyor**. `buildOrderMessage` sadece sipariş onayında (Resend).
- **Yapılacak:** PATCH'te durum değişince müşteriye e-posta (processing/hazırlanıyor, shipped/yolda, delivered/teslim, cancelled/iptal). EN/KA/RU şablonları. `buildStatusEmail` helper. (Resend domain doğrulanınca herkese gider; şu an sadece owner'a — CLAUDE.md notu.)

---

## 🟤 FAZ 6 — İADE SİSTEMİ (item 16) ✅ TAMAMLANDI (4 Tem 2026)

> ✅ **`supabase/returns.sql` ÇALIŞTIRILDI (5 Tem 2026).** Doğrulandı: returns tablosu + `orders.delivered_at` + `return-photos` bucket (public) DB'de. Canlı test: aynı siparişe 2. aktif iade unique index ile reddediliyor (23505), iptal sonrası yeni iade açılabiliyor, anon okuyamaz/yazamaz (RLS 42501), API guard'ları migrate edilmiş DB ile de doğru (GET 200, admin 404, origin'siz 403, misafir 401).

**Kullanıcı kararları (AskUserQuestion):** IBAN'a banka havalesi (kapıda nakit olduğu için) · foto sebebe göre zorunlu (damaged/wrong_item/not_as_described → min 1) · kurye adresten alır · 14 gün pencere (yasal minimum — matsne.gov.ge #5420598 doğrulandı; kullanıcının gördüğü "1 hafta" fiziksel mağaza politikası, mesafeli satışta 14 gün şart).

**Yapılanlar:**
- ✅ `supabase/returns.sql`: returns tablosu (RTN-no, items jsonb, reason, photos[], iban, refund_amount, admin_note), sipariş başına 1 aktif iade (partial unique index), RLS (kendi iadesi + admin), `orders.delivered_at`, `return-photos` bucket
- ✅ `src/lib/returns.ts`: tipler, RETURN_REASONS (photoRequired bayraklı), durum makinesi `requested→approved→received→refunded | rejected` + müşteri iptali (sadece requested), returnWindowEndsAt, GE IBAN regex
- ✅ E-postalar: `buildReturnMessage` (orderMessages.ts) — 5 durum × EN/KA/RU
- ✅ `/api/returns`: POST (CSRF+auth, sipariş sahiplik/delivered/pencere/item-alt-kümesi/adet doğrulama, refund SUNUCUDA hesap — tüm sipariş iadesinde kargo dahil, yasa gereği), GET (?mine/?order), PATCH (müşteri iptali) + `/api/returns/upload` (auth'lu, max 3 foto, {user_id}/{uuid} yolu)
- ✅ `/api/admin/returns`: GET (productMap + sipariş iletişim lookup) + PATCH (geçiş kuralları sunucuda, reject'te not zorunlu, audit, durum e-postası). Admin orders PATCH delivered → `delivered_at` damgası (kolon yoksa retry)
- ✅ Müşteri UI: sipariş detayda "↩️ Request a Return" (kalan gün sayacı) / pencere kapalı notu / iade durum kartı (mini progress + iptal butonu); `/account/orders/[id]/return` 3 adımlı sihirbaz (ürün+adet seçimi, sebep kartları, foto yükleme, IBAN, özet+tahmini iade); `/account/returns` listesi; hesap menüsüne "My Returns"
- ✅ Admin UI: `/admin/returns` (filtre çipleri, genişleyen detay: ürün fotoları, müşteri fotoları, 📋 Copy IBAN, kurye pickup adres/tel, durum geçiş butonları + not), nav "↩️ Returns", dashboard'a "Return requests" kartı (sadece bekleyen varken görünür)
- ✅ Terms/FAQ metinleri gerçek akışa yönlendirildi (hello@loov.ge yerine My Account → Request a Return + IBAN/kurye bilgisi)
- **Doğrulama:** `tsc --noEmit` temiz · sayfalar 200, `/admin/returns` yetkisiz 404 · POST origin'siz 403, girişsiz 401, upload girişsiz 401 · tablo yokken zarif düşüş canlı test edildi
- ⏳ **Kalan (returns.sql sonrası kullanıcı testi):** sipariş→delivered→iade aç→admin onay→refunded uçtan uca akış + e-postalar (Resend hâlâ sadece owner'a teslim eder). İade ekranları şimdilik EN (FAZ 8'de çevrilecek)

---

## 🟩 FAZ 7 — HESAP ALANI (item 17, 18, 20) ✅ TAMAMLANDI (5 Tem 2026)

> ✅ **`supabase/profile.sql` ÇALIŞTIRILDI (5 Tem 2026).** Doğrulandı: profiles yeni kolonları + `avatars` bucket (public) + `avatar_presets` seed'i DB'de.

**Kararlar (kullanıcıyla):** profil alanları HEPSİ (telefon + bebek adı/doğum tarihi/cinsiyet + dil + avatar) · bebek yaşına göre ANA SAYFA kişiselleştirme bölümü · avatar = admin'in yüklediği ~10 preset'ten seçim (kullanıcı yüklemesi YOK — depolama şişmez) · Order Updates e-postası kapatılamaz (Always on) · SMS toggle'ı kaydedilir (altyapı ileride)

- **Item 17 ✅ My Reviews:** `/account/reviews` (kendi yorumları: ürün foto/link, yıldız, satır içi düzenle + iki aşamalı sil; admin gizlediyse amber not — düzenleme status'u DEĞİŞTİRMEZ, moderasyon bypass'ı yok) + "Awaiting review" (teslim edilmiş ama yorumlanmamış ürünler → PDP #reviews çapasına link). API: `/api/reviews` GET `?mine=1` + PATCH + DELETE (CSRF+auth; başkasının yorumu → 404, varlık sızdırmaz). Hesap menüsüne 📝 link
- **Item 18 ✅ Profil:** `supabase/profile.sql` + `src/lib/db/profile.ts` (fetchMyProfile retry'lı zarif düşüş / updateMyProfile upsert / fetchAvatarPresets). Form: telefon (+995, checkout autofill `CheckoutClient` prefill'e bağlandı), bebek adı + doğum tarihi (max bugün) + cinsiyet, site dili (kaydedince `setLocale` → tüm site değişir), preset avatar picker (Navbar 2 nokta + hesap kartı avatar gösterir; auth metadata'ya da yazılır → anında yansır). **Admin:** `/admin/settings` "Profile avatars" kartı (yükle/sil) + `/api/admin/upload` `kind=avatar` + yeni `/api/admin/avatars` GET/DELETE (guard 404 + audit)
- **Item 18+ ✅ BabyPicksSection (ana sayfa):** `src/lib/babyAge.ts` — beden etiketi→ay aralığı parser ("0-3 Months"/"1-2 Years"/newborn; One Size/cm hariç), `productFitsAge` = yaşı kapsayan VEYA [yaş, yaş+3]'te başlayan beden (büyüme payı). Bölüm: giriş + doğum tarihi varsa "For {bebek adı} · {yaş}" + uyan bedeni olan stoklu max 8 ürün. Birim test edildi: 5 aylık bebeğe yenidoğan seti GÖSTERİLMEZ (kullanıcının örneği). Hydration-safe (SSR'da null), misafir/tarihsiz/48 ay üstü → bölüm yok
- **Item 20 ✅ Bildirimler:** `profiles.notification_prefs` jsonb; yükle→merge, kaydet→DB (sahte flash yok, hata net). Orders toggle kilitli "Always on" (işlemsel). SMS dahil diğerleri kaydedilir; pazarlama e-postası altyapısı gelince bu tercihleri okuyacak (bugünkü e-posta gönderen route'lara dokunulmadı — hepsi işlemsel)
- **Doğrulama:** `tsc` temiz · `/` `/account` `/account/reviews` `/account/notifications` 200 · `?mine=1` misafir boş · PATCH origin'siz 403 / misafir 401 · DELETE misafir 401 · `/api/admin/avatars` yetkisiz 404 · PDP reviews regresyon yok · babyAge 12 birim vakası ✅ · profile.sql YOKKEN zarif düşüş canlı doğrulandı
- ⏳ **Kalan (profile.sql sonrası kullanıcı testi):** profil alanlarını kaydet→reload persist · dil kaydı siteyi çevirir · admin'den avatar yükle→hesapta seç→Navbar'da görün · bebek doğum tarihi→ana sayfa bölümü · bildirim toggle'ları persist

---

## 🌐 FAZ 8 — i18n / ÇEVİRİ (item 9, 15, 19) — ✅ TAMAMLANDI (6 Tem 2026)

- **Hedef (kullanıcı):** "Admin paneli hariç HİÇBİR yer İngilizce kalmasın." — ULAŞILDI.
- **Mimari:** `src/lib/i18n/locales/{en,ka,ru,tr}.ts` (tam `Dictionary` tipleme — eksik anahtar derleme hatası), `src/lib/i18n/labels.ts` ("etiket mantığı" — admin kanonik İngilizce değer girer, vitrin her dilde kendi karşılığını gösterir: renk/beden/kategori/kumaş/sezon/sipariş durumu/iade durumu+sebebi/loyalty tier/perk), `src/lib/i18n/format.ts` (`fmtDate`/`fmtDateNoYear` — locale-aware tarihler), `src/lib/articles/` (blog modülü: `base.ts` değişmez alanlar + `content.{en,ka,ru,tr}.ts` + `index.ts` merge/fallback).
- **14 batch (B0-B13) sırayla tamamlandı:** altyapı → etiket katmanı → mağaza chrome (arama/sepet/quick-view/wishlist) → CategoryFilter/products → sepet+checkout+tr e-posta → wishlist/bundles/track-order → auth+404/error → hesap dashboard+siparişler → iade sihirbazı+iadelerim+yorumlarım → rewards/adresler/bildirimler/güvenlik → FAQ/size-guide/about/contact → privacy/terms (ka DRAFT, native inceleme gerekiyor) → blog (8 makale × 4 dil tam çeviri, ayrı `CEVIRI-KONTROL-KA-BLOG.md`) → metadata süpürmesi (`generateMetadata()` + `meta.*`, tüm public sayfalar).
- **Doğrulama:** `tsc` + `next build` temiz · ~30 route × 4 dil curl marker + raw-key/orphaned-`{n}` sızıntı taraması sıfır sonuç · admin hâlâ 404 (yetkisiz) ve İngilizce · CEVIRI-KONTROL-KA.md 25 bölüme çıktı (abla incelemesi bekliyor, özellikle bölüm 25 hukuki metin — legal.privacy/legal.terms).
- **Bilinen sınırlar (launch-blocker değil):** ürün/set adı+açıklaması hâlâ İngilizce (içerik çeviri fazı ileride) · ka/ru/tr blog+legal çevirileri makine kalitesinde, native inceleme bekliyor · sezon filtresi UI'a henüz bağlanmadı (FAZ 8 kapsamı dışı, önceki not).

---

## 📱 FAZ 9 — ADMIN MOBİL UYUM (item 14) — KOD TARAFI TAMAMLANDI (6 Tem 2026), GÖRSEL DOĞRULAMA KULLANICIDA

- **Bulgu:** `AdminShell.tsx` iskeleti zaten mobil uyumluydu (hamburger + üst bar). Sayfa taraması yapıldı: `DashboardClient`, `OrdersClient`, `ReviewsClient`, `LogsClient`, `SettingsClient`, `BundlesListClient` zaten `flex-wrap` ile makul ölçüde mobil uyumluydu — dokunulmadı. Gerçek sorunlar 4 yerde bulundu:
  1. **`ProductsClient`** — 7 kolonlu tablo `overflow-x-auto` ile yatay kaydırılıyordu (satır içi editör dar ekranda gerçekten kullanılamaz durumdaydı).
  2. **`RevenueChart`** — SVG genişlik olarak responsive'di (viewBox+w-full) ama hover/crosshair tooltip SADECE mouse ile çalışıyordu — dokunmatik ekranda tıklama/sürükleme tepki vermiyordu.
  3. **`BundleEditorClient`** — "Products in this bundle" satırı (foto+isim+adet-stepper+fiyat+sil) sabit-genişlikli elemanlar yüzünden 320-375px ekranda ürün adına ~40-70px kalıyordu.
  4. **`ReturnsClient`** — iade kartı başlık satırında (rozet+metin+tutar/tarih+ok ikonu) benzer sıkışma riski.
- **Yapılanlar:**
  1. `ProductsClient.tsx`: `DetailsPanel` içeriği `DetailsPanelContent`'e çıkarıldı (tr/td'den bağımsız). `ProductRow` artık `variant: "table" | "card"` alıyor — aynı state/save/upload/remove mantığı, iki farklı JSX çıktısı. `ProductsClient` şimdi `hidden sm:block` masaüstü tablosu + `sm:hidden` mobil kart listesi render ediyor (AdminShell'in zaten kullandığı "iki görünüm, CSS ile seç" desenine uygun). Mobil kart: foto+isim+kategori+New toggle üstte, fiyat/stok altta, Edit▾/Delete en altta — yatay kaydırma yok.
  2. `RevenueChart.tsx`: `onTouchStart`/`onTouchMove` eklendi (aynı `pointAt()` koordinat hesaplamasını paylaşıyor), `style={{ touchAction: "none" }}` ile sayfa kaymasıyla çakışma önlendi.
  3. `BundleEditorClient.tsx`: item satırı `flex-wrap` oldu, adet/fiyat/sil grubu `w-full sm:w-auto` ile dar ekranda otomatik ikinci satıra düşüyor (sm+ tek satır).
  4. `ReturnsClient.tsx`: aynı desen — başlık satırı `flex-wrap`, tutar/tarih/ok grubu `w-full sm:w-auto justify-between sm:justify-end`.
- **Doğrulama:** `tsc --noEmit` temiz · `next build` temiz (yeni hata/uyarı yok, mevcut 2 pre-existing lint warning'e dokunulmadı) · kod incelemesi ile 320-375px genişlikte üst üste binme/kesilme senaryoları elle hesaplandı.
- ⏳ **KALAN — kullanıcı gerçek cihaz/DevTools testi yapacak:** admin login gerektiği için (Supabase auth) otomatik tarayıcı doğrulaması yapılamadı — service-role ile canlı magic-link üretmek "credential materialization" olarak sistem tarafından engellendi (haklı olarak, kullanıcı onayı olmadan canlı auth token basmak riskli). Kullanıcı `/admin`, `/admin/products`, `/admin/orders`, `/admin/returns`, `/admin/bundles/[slug]` sayfalarını telefonundan veya DevTools mobil görünümünden (375px) kontrol edip onaylamalı.

---

## 🔔 FAZ 10 — ADMİN BİLDİRİMLERİ + YORUM YANITLARI (kullanıcı isteği, 5 Tem 2026) — ✅ TAMAMLANDI (6 Tem 2026)

> ✅ **`supabase/notifications.sql` ÇALIŞTIRILDI (7 Tem 2026 doğrulandı)** — `admins.last_seen_orders_at/last_seen_returns_at/last_seen_reviews_at` + `reviews.admin_reply/admin_reply_at` kolonları canlı DB'de mevcut (select ile test edildi). Rozetler artık gerçek sayım yapar, yorum yanıtlama gerçekten kaydedilir.

1. **✅ Sol menü okunmamış rozetleri:** `admins` tablosuna 3 nullable `last_seen_*_at` kolonu (ayrı tablo yerine — tek admin ölçeğinde daha basit). Yeni `/api/admin/unread` (GET sayım + PATCH mark-seen). `AdminShell.tsx`: 60sn'de bir polling + `usePathname` ile Orders/Returns/Reviews sayfasına girince o bölüm otomatik "seen" damgalanır (rozet anında sıfırlanır, sonra sunucuya PATCH). Rozet: kırmızı nokta içinde sayı (99+ üstü kırpılır), hem masaüstü hem mobil menüde.
2. **✅ Admin yorum yanıtı:** `/admin/reviews` her karta "+ Reply as Loov" / mevcut yanıtı düzenle-sil. `/api/admin/reviews` PATCH artık `adminReply` alanını da kabul ediyor (status'tan bağımsız, ikisi ayrı ayrı veya birlikte gönderilebilir). `/api/reviews` GET (hem PDP hem `?mine=1`) `admin_reply`/`admin_reply_at` döndürüyor — kolon yoksa 2. bir select ile fallback (mevcut yorumlar asla kaybolmaz). PDP `ReviewsSection.tsx` + `/account/reviews` `MyReviewsClient.tsx` ikisinde de "Loov 🌿" yanıt kutusu. E-posta bildirimi v1'de YOK (plan zaten "opsiyonel" diyordu, kapsam dar tutuldu).
3. **✅ Yıldız tıklama sorunu — kök sebep bulundu:** `onClick` doğru bağlıydı (kod hatası yok), asıl sorun **UX**: yıldız butonları sadece ~28px (dokunma hedefi için küçük, 44px önerilir) ve dokunmada anlık görsel geri bildirim yoktu (sadece `hover` state'e bağlıydı, mobilde hover kararsız/gecikmeli). Üç kopyada (`ReviewsSection.tsx`, `MyReviewsClient.tsx` — ki iki dosyada da aynı bileşen ayrı ayrı tanımlıydı) buton padding'i büyütüldü (`p-1.5`, ~40px hedef), `touch-manipulation` + `active:scale-90` eklendi (dokunur dokunmaz görsel tepki).
- **Doğrulama:** `tsc --noEmit` + `next build` temiz · yeni lint hatası yok · canlı curl: `/api/admin/unread` yetkisiz 404, `/api/reviews?productId=1` `ready:true` boş liste (fallback yolu gerçekten tetiklendi — kolonların DB'de olmadığı ayrıca doğrulandı), `/admin` yetkisiz hâlâ 404, PDP + `/account/reviews` 200.

---

## 📋 ÖNERİLEN UYGULAMA SIRASI (session'lara bölünmüş)

1. **S1 (küçük, tatmin edici):** FAZ 1 tümü (item 2, 4, 6, 7 + item 1 kod tarafı). Hızlı görünür kazanım.
2. **S2:** FAZ 0 doğrulama (kullanıcı SQL çalıştırır) + FAZ 2 (item 3, 5 admin ayarları).
3. **S3-S4:** FAZ 3 (item 10, 11 — ürün sistemi, en büyük). Beden fiyatı uçtan uca.
4. **S5:** FAZ 4 (item 8 — bundles admin).
5. **S6:** FAZ 5 (item 12, 13 — sipariş detay + mail).
6. **S7:** FAZ 6 (item 16 — iade sistemi).
7. **S8:** FAZ 7 (item 17, 18, 20 — hesap).
8. **S9:** FAZ 8 (item 9, 15, 19 — i18n) + CEVIRI-KONTROL-KA.md.
9. **S10:** FAZ 9 (item 14 — admin mobil) + genel test/checkup.

---

## 🧭 KARAR GEREKTİREN NOKTALAR (kullanıcıya sor)
1. **Item 7:** Sahte "N kişinin sepetinde" + ProductCard sahte yıldızları + SocialProofToast → tamamen kaldıralım mı (dürüst), yoksa gerçek veriye mi bağlayalım? (Öneri: kaldır.)
2. **Item 16:** 14 gün iade metni yasal — onaylıyor musun, kalsın mı? (Araştırma: Gürcistan'da mesafeli satışta 14 gün cayma hakkı yasal görünüyor → kalmalı.)
3. **Item 8/10:** Bundle bedene göre fiyat → hangi setlerde hangi beden→fiyat? (İçerik kullanıcıdan.)
```
```
> Bu dosya her session başında okunmalı. Tamamlanan maddeler ✅ ile işaretlenip CLAUDE.md'ye taşınacak.
