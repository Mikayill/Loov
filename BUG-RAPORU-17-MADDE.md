# 17 Maddelik Hata Raporu — Kök Sebep Analizi + Çözüm Planı (16 Tem 2026)

Kullanıcının canlı kullanırken bulduğu 17 madde. Her biri gerçek kodu okuyarak (3 paralel Explore ajanı + doğrudan dosya okuması) kök sebebine kadar izlendi. Yüzeysel/kozmetik yama değil, kök sebep düzeltmesi hedefleniyor. Uygulama sırası aşağıdaki gibi, her madde bitince ✅ işaretlenecek.

---

### 1. Mobil hamburger'da dil değiştirme ekrandan taşıyor
**Kök sebep:** `src/components/LanguageSwitcher.tsx` — dropdown `position:fixed` + `document.body`'e portallanıyor, konumu `pos.right = window.innerWidth - button.right` formülüyle SADECE tetikleyici butonun sağ kenarına göre hesaplanıyor, sol kenar hiç kelepçelenmiyor. Masaüstünde buton sağda olduğu için çalışıyor; mobil hamburger'da buton SOLA hizalı olduğu için `pos.right` çok büyük çıkıyor → dropdown'ın sol kenarı ekranın dışına (negatif x) düşüyor.
**Çözüm:** Konum hesaplamasına viewport-clamp ekle — dropdown genişliğini bilerek (`min-w-[170px]`≈170px) hem `left` hem `right`'ı 8px kenar boşluğuyla sınırla; buton ekranın neresinde olursa olsun dropdown her zaman viewport içinde kalsın.

### 2. Alt navigasyonda aktif sekme belirsiz
**Kök sebep:** `src/components/MobileBottomNav.tsx` — aktif sekme SADECE metin/ikon rengi değişimi (`text-ink` vs `text-ink-muted`), arka plan/gösterge/animasyon yok.
**Çözüm:** Aktif sekmeye kayan bir "pill" arka plan göstergesi + hafif scale/translate animasyonu ekle (CSS transition, `--ease-snappy` token'ı kullanarak — mevcut UI cila konvansiyonuyla tutarlı).

### 3. Google ile girişte "Loov" yerine supabase URL'i gösteriliyor
**Kök sebep:** Bu bir KOD sorunu DEĞİL — Google OAuth onay ekranındaki "uygulama adı", Google Cloud Console → OAuth consent screen → "App name" alanından geliyor. Supabase'in kendi auth domain'i (`*.supabase.co`) callback URL'i olarak kullanıldığından, eğer Google Cloud Console'da uygulama adı doğru girilmemiş/doğrulanmamışsa Google fallback olarak callback domain'ini gösterir.
**Çözüm:** Kod tarafında yapılabilecek bir şey yok. Kullanıcıya adım adım talimat: Google Cloud Console → APIs & Services → OAuth consent screen → App name = "Loov", App logo = Loov logosu, Authorized domains'e `loov.ge` eklenmiş olmalı. Bu raporun sonunda ayrı bir "kullanıcı yapacak" notu olarak işaretlenecek, koda dokunulmayacak.

### 4 + 5. Karanlık mod ayarı dağınık + hesap bölümünün "Ayarlar" ekranı yok
**Kök sebep:** Tema değiştirici şu an `src/app/account/AccountClient.tsx`'in sağ sütununda (satır ~376-440) gömülü küçük bir kart olarak duruyor, ayrı bir "Ayarlar" ekranı yok.
**Çözüm:** Yeni `/account/settings` sayfası (`SettingsClient.tsx`) — Karanlık mod toggle'ı (mevcut tema mantığı taşınacak) + Dil seçici + bildirim/güvenlik sayfalarına kısayol. Hesap ana menüsüne "⚙️ Ayarlar" satırı eklenecek (bkz. madde 13 — hesap sayfası zaten baştan tasarlanıyor, tema kartı oradan kaldırılıp yeni sayfaya taşınacak).

### 6. "İndirimde" ekranı "Ürünler" ile çakışıyor, ürüne tıklayınca sayfa büzülüyor
**Kök sebep (gerçek bug):** `QuickViewButton.tsx`, `CartDrawer.tsx`, `BundleQuickView.tsx` — üçü de BAĞIMSIZ `document.body.style.overflow = "hidden"` + scrollbar-genişliği kadar `paddingRight` kilidi kuruyor, referans SAYIMI yok. Biri kapanırken diğerinin hâlâ ihtiyacı olan kilidi de silebiliyor → body'nin scroll durumu/padding'i bozuk kalıyor, sayfa "büzülmüş" görünüyor. İndirim filtresiyle gelip bir ürünün Quick View'ini aç-kapat yapınca bu çakışma tetikleniyor.
**Kök sebep (kafa karışıklığı):** "Ürünler"/"İndirimde"/"Son Görüntülenenler" navbar'da 3 ayrı pill ama üçü de aynı `/products` rotasına düşüyor (farklı query/hash), kullanıcıya görünüşte "iki farklı ekran" değil "aynı ekranın gizli modları" gibi geliyor.
**Çözüm:**
- Ortak, referans-sayımlı `useBodyScrollLock()` hook'u (`src/hooks/useBodyScrollLock.ts`) — modül seviyesinde sayaç, sadece sayaç 0'a düşünce gerçekten kilidi açar. `QuickViewButton`/`CartDrawer`/`BundleQuickView` bu hook'a geçirilecek.
- `deal=1` aktifken `/products` sayfasına belirgin bir üst şerit/başlık ("🔥 İndirimdeki Ürünler") eklenerek "Ürünler" ekranından görsel olarak ayrışması sağlanacak (route değiştirmeden, mevcut mimari korunarak).

### 7. "Son Görüntülenenler" de aynı şekilde karışmış, filtreye çevrilsin
**Kök sebep:** `RecentlyViewedSection` artık popover değil — `/products#recently-viewed` anchor'ıyla AYNI sayfanın en altına scroll ediyor, "Ürünler" pill'iyle birebir aynı route.
**Çözüm:** Navbar'daki "Son Görüntülenenler" pill'ini ve `/products` sayfasının altındaki `<RecentlyViewedSection>` bloğunu KALDIR; yerine `CategoryFilter`'a yeni bir "Son Görüntülenenler" filtre çipi ekle (mevcut `loov_recently_viewed` localStorage anahtarını okuyup `list.filter(p => recentIds.includes(p.id))`).

### 8a. Beden kılavuzu mobilde uyumsuz + ghost yükleme eksik
**Kök sebep:** `src/app/size-guide/page.tsx` — 4 tablo da düz `<table>` + `overflow-x-auto` (yatay kaydırma fallback'i var ama mobil için yeniden tasarlanmamış, `whitespace-nowrap` hücreler taşıyor). `loading.tsx` sadece generic spinner, içerik iskeleti yok.
**Çözüm:** Mobilde (`sm:` altı) tabloları kart/akordeon düzenine çevir (her beden kendi kartında, anahtar-değer satırları); masaüstünde tablo kalsın. `loading.tsx`'i `GhostRows` tarzı gerçek içerik iskeletine çevir.

### 8b. Günlük (blog) makale sayfasında breadcrumb "Ana Sayfa > Günlük > başlık" bug'ı
**Kök sebep:** `src/app/blog/[slug]/page.tsx` satır 36-43 — 3 parçalı breadcrumb tam olarak kullanıcının şikayet ettiği deseni üretiyor.
**Çözüm:** Breadcrumb'ı basit bir "← Günlüğe dön" geri linkine çevir (Ana Sayfa segmentini kaldır).

### 9. Beden kılavuzunda "Ana Sayfa > Beden Kılavuzu" yazısı kaldırılsın
**Kök sebep:** `size-guide/page.tsx` satır 65-69, aynı breadcrumb deseni.
**Çözüm:** Breadcrumb'ı tamamen kaldır (madde 8a'daki yeniden tasarımla birlikte yapılacak).

### 10. "Ürünler" ekranının ghost yükleme ekranı yanlış
**Kök sebep:** `src/app/products/loading.tsx` gerçek karttan (`bg-canvas`, dış-kart-border) farklı stil kullanıyor (`bg-white`, `overflow-hidden`, farklı gap), sort/view-toggle/gelişmiş filtre satırını ve `RecentlyViewedSection` alanını hiç temsil etmiyor.
**Çözüm:** `loading.tsx`'i gerçek `CategoryFilter` + ürün grid yapısıyla eşleşecek şekilde yeniden yaz (doğru kart stili, doğru gap, sort/filtre satırı iskeleti).

### 11. Mobilde "Koleksiyonumuz" (Ürünler) ekranındaki kategori butonları compact değil
**Kök sebep:** `CategoryFilter.tsx` satır 251 — kategori pill'leri `px-3.5 py-2 text-[11.5px]` sabit boyut, mobil için küçültülmemiş (ana sayfadaki mobil pillerin `px-1.5/py-1.5 text-[10.5px]`'inden belirgin şekilde daha büyük).
**Çözüm:** Mobilde daha küçük padding/font (`sm:` breakpoint'inde büyüsün), gap küçültülsün.

### 12. Sepette mobilde toplam tutar aşağı inmeden görünmüyor
**Kök sebep:** `src/app/cart/CartClient.tsx` — sipariş özeti `sticky top-24` (sadece ÜSTE yapışır), mobilde grid tek sütuna düşünce özet TÜM ürün listesinin ALTINA gidiyor, sabit/alt-yapışkan bar hiç yok.
**Çözüm:** Mobilde ekranın altına sabit bir compact bar (Total + "Ödemeye Geç" CTA), tıklanınca tam döküm (ara toplam/kargo/promosyon) bir sheet'te açılsın — Temu tarzı. Masaüstü mevcut sticky-sidebar düzeni korunacak.

### 13. Hesabım ekranı amatörce, baştan tasarlanacak
**Kök sebep:** `AccountClient.tsx` — kimlik başlığından hemen sonra generic 3'lü istatistik şeridi (Sepet/Favoriler/Puan) + düz 7 satırlık link listesi + sağ sütunda dağınık kartlar (bebek bilgisi/tema/keşfet).
**Çözüm:** Gerçek "uygulama" hissi veren yeniden tasarım: temiz kimlik başlığı → görsel istatistik kartları (grid, ikonlu) → gruplu menü listesi (Siparişler/İadeler/Yorumlar/Ödüller ayrı grup, Adresler/Bildirimler/Güvenlik/**Ayarlar (YENİ)** ayrı grup) → çıkış. Tema kartı yeni Ayarlar sayfasına taşınacak (madde 4+5).

### 14. Mobil hamburger tamamen yeniden tasarlanacak (bottom-sheet + bebek profili)
**Kök sebep:** `Navbar.tsx` satır 541-583 — hamburger, navbar'ın altına açılan düz bir dropdown panel (bottom-sheet değil), bebek profili (ad/doğum tarihi — zaten `AccountClient.tsx`'te var ama sadece `/account`'a genel bir link var) hamburger'dan erişilemiyor.
**Çözüm:** Hamburger'ı ekranın altından yükselen tam bir bottom-sheet overlay'e çevir (`role="dialog"`, `aria-modal`, Escape ile kapama, yeni paylaşılan `useBodyScrollLock` ile scroll kilidi). İçine mevcut linklerin yanına kompakt bir "Minik Bebeğiniz" hızlı-düzenleme widget'ı eklenecek (ad + doğum tarihi, `src/lib/db/profile.ts`'teki mevcut `updateMyProfile` fonksiyonunu kullanarak).

### 15. KRİTİK — "Hazırlanıyor" aşamasındaki siparişi iptal etmeye çalışınca hesaptan atıyor, sipariş iptal olmuyor
**Kök sebep #1 (etiket yalanı):** `src/lib/db/myOrders.ts` `mapStatus()` — ham DB durumu `"pending"` hiç ele alınmıyor, `default` dalına düşüp **"Processing"/"Hazırlanıyor"** olarak gösteriliyor. Yani sipariş aslında hâlâ `pending` (iptal edilebilir) ama kullanıcıya "Hazırlanıyor" yazıyor — kafa karışıklığının kaynağı bu.
**Kök sebep #2 (asıl "atma" hissi):** `/api/orders` PATCH (cancel) VE `/api/reviews` PATCH/DELETE, `requireVerifiedSession()` ile korunuyor — bu fonksiyon AAL2 MFA YA DA canlı bir `trusted_devices` çerezi (varsayılan sadece **4 saat**, "beni hatırla" işaretlenmediyse) istiyor. Süre dolmuşsa `401 otp_required` dönüyor, client bunu görünce `router.push("/login?verify=1")` yapıyor — oturum/çerez BOZULMUYOR ama kullanıcı aniden login ekranına fırlatılıyor, tam bir "hesaptan atılma" hissi veriyor. Kritik: bu kontrol asıl iptal mantığından ÖNCE çalıştığı için sipariş de gerçekten iptal olmuyor.
**Bildirim:** Kod tabanında hiçbir push/service-worker/`Notification` API'si yok — kullanıcının gördüğü "bildirim" büyük ihtimalle `window.confirm()`/`alert()` native tarayıcı dialog'u (kod zaten `window.confirm(...)` kullanıyor), gerçek bir bug değil, yanlış konumlandırılmış bir gözlem.
**Çözüm:**
1. `mapStatus()`'a gerçek bir `"Pending"` durumu ekle (yeni `OrderStatus` üyesi + `statusConfig` girişi + 4 dilde `label.orderStatus.pending` çevirisi) — artık "Hazırlanıyor" ile "Sipariş Verildi" birbirine karışmayacak.
2. `requireVerifiedSession()` step-up kapısını `/api/orders` (cancel) ve `/api/reviews` (PATCH/DELETE) rotalarından KALDIR — bunlar hesap silme/iade gibi yüksek riskli işlemler değil, kullanıcının KENDİ ürününü iptal etmesi/kendi yorumunu düzenlemesi; normal oturum sahipliği kontrolü (`supabase.auth.getUser()` + `order.user_id === userId` / `review.user_id === userId`) zaten yeterli ve kodda hâlâ duruyor. Adım-doğrulama sadece `account/delete` ve `returns` akışlarında (para/veri kaybı riski yüksek) kalacak.

### 16. "İade talep et" altındaki "X gün kaldı" yazısı kaldırılsın
**Kök sebep:** `OrderDetailClient.tsx` satır 404-406 — `daysLeft` sayacı gösteriliyor, kullanıcıya aceleci/baskıcı geliyor.
**Çözüm:** O `<p>` satırını kaldır (mantık/kural değişmiyor, sadece görünür sayaç metni gidiyor).

### 17. Yorum düzenlemek hesaptan atıyor
**Kök sebep:** Madde 15 ile birebir aynı kök sebep (`requireVerifiedSession()` step-up kapısı `/api/reviews` PATCH/DELETE'te de var).
**Çözüm:** Madde 15'in 2. çözümüyle birlikte hallolacak (tek fix, iki maddeyi kapatıyor).

---

## Uygulama sırası
1. Kritik bug'lar önce: #15/#17 (oturum atma + durum etiketi), #16 (basit metin kaldırma)
2. Gerçek bug'lar: #1 (dil değiştirici taşması), #6/#7 (scroll-lock + indirim/son-görüntülenen ayrıştırma)
3. Yeniden tasarımlar: #13 (hesap sayfası) + #4/#5 (yeni Ayarlar sayfası) birlikte, #14 (hamburger bottom-sheet), #12 (sepet mobil sabit bar), #8a (beden kılavuzu), #2 (alt nav aktif gösterge)
4. Küçük düzeltmeler: #8b/#9 (breadcrumb'lar), #10 (ghost ekran), #11 (kategori pill compact)
5. Kod dışı: #3 (Google Cloud Console'da uygulama adı — kullanıcı yapacak, talimat aşağıda)

## Kullanıcının yapması gereken (kod dışı)
- **Madde 3:** Google Cloud Console → APIs & Services → OAuth consent screen → "App name" alanına **"Loov"** yaz, logo yükle, "Authorized domains"e `loov.ge` ekli olduğundan emin ol. Supabase tarafında ekstra bir şey gerekmiyor.

## Doğrulama
Her batch sonunda `tsc --noEmit` + `npm test` + `next build` temiz olacak. Mümkün olan yerlerde Playwright ile mobil viewport (390×844) canlı test edilecek.

---

## ✅ SONUÇ — 16/17 UYGULANDI (16 Tem 2026)

Madde 3 hariç (kod dışı, kullanıcı Google Cloud Console'da yapacak) tüm maddeler aynı oturumda uygulandı ve doğrulandı.

| # | Özet | Durum |
|---|------|-------|
| 1 | Dil değiştirici mobilde taşıyordu | ✅ `LanguageSwitcher.tsx` — `useLayoutEffect` ile gerçek genişlik ölçülüp viewport'a kelepçeleniyor |
| 2 | Alt nav aktif sekme belirsiz | ✅ Kayan pill gösterge + ikon scale/translate animasyonu |
| 3 | Google girişinde supabase URL'i görünüyor | ⏳ **Kod dışı** — Google Cloud Console → OAuth consent screen → App name = "Loov" (kullanıcı yapacak) |
| 4+5 | Karanlık mod dağınık + Ayarlar ekranı yok | ✅ Yeni `/account/settings` (tema + dil), hesap menüsüne "⚙️ Ayarlar" eklendi |
| 6 | İndirimde ekranı ürünlerle çakışıyor + büzülme bug'ı | ✅ Kök sebep: 3 modal'ın (QuickView/CartDrawer/BundleQuickView) referans-sayımsız scroll-lock'u — yeni `useBodyScrollLock` hook'u; + belirgin "🔥 İndirimde" banner'ı |
| 7 | Son Görüntülenenler ürünlerle karışmış | ✅ Nav pill + ayrı bölüm kaldırıldı → `CategoryFilter`'a gerçek filtre çipi (`/products?recent=1`) |
| 8a | Beden kılavuzu mobil uyumsuz + ghost eksik | ✅ 5 kolonlu tablo → mobilde kart listesi, `loading.tsx` gerçek iskelet |
| 8b | Günlük makale breadcrumb bug'ı | ✅ 3 parçalı breadcrumb → "← Günlüğe dön" tek link |
| 9 | Beden kılavuzu breadcrumb kaldır | ✅ (8a ile birlikte) |
| 10 | Ürünler ghost ekranı yanlış | ✅ `loading.tsx` gerçek kart/filtre/sort yapısıyla eşleşecek şekilde yeniden yazıldı |
| 11 | Mobil kategori butonları compact değil | ✅ `CategoryFilter` pill'leri mobilde küçültüldü |
| 12 | Sepette mobil toplam görünmüyor | ✅ Temu-tarzı sabit alt bar (Total + Checkout + genişleyen döküm) |
| 13 | Hesabım ekranı amatörce | ✅ Baştan tasarlandı: görsel istatistik kartları + gruplu menü (Siparişlerim / Hesap) |
| 14 | Hamburger kötü, bebek profili erişilemez | ✅ Tam bottom-sheet overlay'e çevrildi (`MobileMenuSheet.tsx`) + bebek adı/doğum tarihi hızlı-düzenleme |
| 15 | Sipariş iptali hesaptan atıyor + iptal olmuyor | ✅ Kök sebep: `requireVerifiedSession()` step-up kapısı + `mapStatus()`'ta eksik "Pending" durumu. İkisi de düzeltildi |
| 16 | "X gün kaldı" baskıcı metni | ✅ Kaldırıldı |
| 17 | Yorum düzenleme hesaptan atıyor | ✅ Madde 15 ile aynı kök sebep, aynı fix (`/api/reviews` de artık step-up istemiyor) |

**Yan iyileştirmeler:** ortak `src/lib/accountNav.ts` (masaüstü dropdown + mobil sheet aynı listeyi paylaşıyor), `orderTypes.ts`'e gerçek `"Pending"` durumu (4 dilde `label.orderStatus.pending`), 6 ölü i18n anahtarı temizlendi (`acct.bebecoPoints/browseCollection/findSomething`, `acct.return.windowLeft1/N`, `sg.breadcrumb`, `blog.breadcrumb`→`blog.backToJournal`).

**Doğrulama:** `tsc --noEmit` temiz · `npm test` 60/60 · `next build` temiz (45 route, `/account/settings` dahil) · Playwright ile 390×844 mobil viewport'ta canlı test (dil değiştirici artık ekran içinde, hamburger bottom-sheet açılıyor, indirim banner'ı + geri dönüşte büzülme yok, sepet sabit bar açılıp kapanıyor, beden kılavuzu kart görünümü, günlük geri linki) — konsol hatası sıfır.
