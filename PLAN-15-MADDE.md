# 15 Maddelik v2 Canlı Geri Bildirim Planı (15 Tem 2026)

Kullanıcının loov.ge v2 canlı testinde bulduğu 15 sorun. Batch batch, her batch commit + doğrulama.

## BATCH A — Navbar/chrome (madde 1-kısmi, 2, 3, 4, 8, 9)
- **#1a Kategori chip routing bug:** CategoryFilter `initialCategory`'yi sadece mount'ta okuyor → sticky strip'te chip'ler arası gezinince (`/products?cat=blanket`) filtre değişmiyor. Fix: `useEffect` ile `active`'i `initialCategory` prop değişince senkronla (VEYA useSearchParams). "Setler" 2 kez: strip'te hem `set` kategorisi hem `bundles` linki → bundles etiketini ayır (nav.bundles zaten "Setler/Paketler" — kategori "set" = "Setler"; bundles chip'ini "Paketler"e çevir ya da kaldır).
- **#2 Hesap dropdown:** sağ üst profil ikonu tıklayınca önce açılır menü (Siparişlerim/Yorumlarım/İadelerim/Loov Rewards/Bildirimler), en üstte "Profili düzenle" → /account.
- **#3 Mobil karanlık hamburger:** `bg-white` → `bg-canvas`, metinler token'a; karanlıkta okunur.
- **#4 Üst bar dönüşü + hamburger anim:** mobilde tek bilgi donuk kalıyor → fade in/out ile dönen mesajlar (eski announce mantığı, token'lı). Hamburger açılışı `pat` → yumuşak (maxHeight/opacity transition).
- **#8 Puan çipi:** `bg-accent-soft/text-accent-deep/hover:bg-accent` karanlıkta garip → nötr `bg-panel/text-ink border-line hover:border-ink`. MD'lerdeki eski hex kalıntıları taransın.
- **#9 Hamburger frosted + anim + içerik:** yarı saydam blur; açılış/kapanış animasyon; içerikten kategorileri çıkar (strip'te var), yerine #2 hesap linkleri + ana nav.

## BATCH B — Arama + QuickView (madde 6, 7)
- **#6 Arama boş durum bug:** `!hasQuery` iken "sonuç bulunamadı" çıkıyor (results boş + hasQuery false → no-results bloğuna düşüyor). Fix: no-results SADECE `hasQuery` iken. Boşken: son görüntülenenler + hero showcase ürünleri göster.
- **#7 QuickView kapanış anim + sayfa kayması:** kapanışta pop-out+fade-out düzgün; açılış/kapanış birbirinin tersi. Arka sayfa sağa kayması = `body overflow:hidden` scrollbar payı → `scrollbar-gutter` veya padding telafisi.

## BATCH C — Ana sayfa bundle bölümü (madde 5)
- **#5 "Birlikte Daha Çok Kazan":** ledger satırları cansız → görselli çekici kartlar: bundle içeriği (hangi ürünler), foto/emoji, tasarruf rozeti, fiyat, "içindekiler" önizleme.

## BATCH D — /products zenginleştirme + kategori (madde 1-kalan)
- **#1b:** /products çok boş → indirimdeki ürünler şeridi, son görüntülenenler (özel panel), popüler kategoriler. Kategori landing his kazandır.

## BATCH E — Hesap alanı (madde 10, 11, 12, 13, 14)
- **#13/#14 Skeleton + renkler:** account `loading.tsx`'ler dönen daire → `.u-skeleton` ghost; tüm alt sayfalar (rewards/returns/security/orders/notifications/addresses/reviews) yeni token + karanlık mod uyumu; spinner'lar (`border-accent border-t-transparent animate-spin`) shimmer'a.
- **#11 Geri linki + çeviri:** rewards & returns sayfalarında "< Hesaba dön" linki yok → ekle; rewards metinleri 4 dil tam.
- **#12 İadelerim Temu-vari:** ürün foto + adı + PDP linki + durum.
- **#10 Minik bebeğiniz:** edit-profile formu yerine doğrudan /account'ta görünür kart.

## BATCH F — Güvenlik checkup (madde 15)
- Uçtan uca denetim: hardcoded ama değişken olması gereken değerler, eksik yetki kapıları, RLS, rate-limit, CSRF, secret sızıntısı. Satıcı e-ticaret güvenlik standartları (OWASP + PCI-DSS-lite) ile kıyas, dürüst rapor.

## Doğrulama: her batch tsc + 60 test + tarayıcı (aydınlık+karanlık, masaüstü+mobil); sonda build + push.

---

## 🔁 RE-AUDIT SONUCU (15 Tem 2026, aynı gün) — batch'ler push edildi ama kullanıcı canlıda test edince 4 madde HÂLÂ YANLIŞTI

Kullanıcı "sadece söylediklerimle kalma, tüm batch'i sen kontrol et" dedi → 15 maddenin tamamı gerçek koddan tekrar okunup doğrulandı. Sonuç:

**🔴 Gerçekten bozuk, düzeltme bekliyor** (plan dosyası: `C:\Users\Miko\.claude\plans\selam-claude-bizim-wep-sparkling-bee.md` — kullanıcı henüz onaylamadı, kod değişikliği YAPILMADI):
1. **#1 Navbar üst şerit:** "İndirimde"/"Son Görüntülenenler" istekleri yanlış yere kondu — `/products` sayfasına ayrı bölüm olarak eklendi, oysa kullanıcı bunları **Navbar'ın sabit kategori şeridine** (Ürünler/Bodyler/Battaniyeler/Setler/Havlular/Tulumlar/Çantalar şeridi) buton olarak istemişti. "Son Görüntülenenler" için istenen "ayrı pencere" (popover) hiç yapılmadı.
2. **#8 Puan çipi:** hâlâ yabani duruyor — düzeltirken yanlış "normal buton" referans alındı (filtre-pili tarzı çerçeveli kutu), oysa navbar'ın sağ üst köşesindeki gerçek komşuları (arama/kalp/tema/hesap ikonları) çerçevesiz/şeffaf.
3. **YENİ bulgu (kullanıcı henüz söylemedi, kendim buldum):** mobil hamburger + arama satırı açılışta yumuşak ama **kapanışta animasyonsuz aniden kayboluyor** (`useDelayedUnmount` kullanılmamış).
4. **#13/#14 Ghost/skeleton:** tek jenerik `GhostRows` (başlık + N dikdörtgen) TÜM hesap sayfalarına aynen yapıştırıldı — Rewards'ın bakiye kartı, Security'nin form alanları, Notifications'ın toggle satırları gibi gerçek şekillere hiç uymuyor.

**✅ Kod okunarak doğrulandı, gerçekten doğru:** #2 (hesap dropdown), #3/#9 (mobil karanlık mod + içerik), #4'ün fade-metin kısmı, #5 (bundle kartları), #6 (arama boş durum), #7 (QuickView animasyon+kayma), #10 (baby kart /account'ta), #11 (geri linkleri var), #12 (İadelerim gerçek foto+link), #15 (güvenlik, `GUVENLIK-RAPORU.md`).

**Sıradaki oturum:** yukarıdaki plan dosyasını oku, kullanıcıdan onay al, sonra 4 maddeyi uygula.

---

## ✅ 4 KALAN MADDE UYGULANDI (15 Tem 2026, aynı gün) — plan dosyasındaki tasarıma göre

Yukarıdaki `selam-claude-bizim-wep-sparkling-bee.md` planı kullanıcının "devam edelim kalan maddeleri de hallet" onayıyla uygulandı:

1. **Navbar üst şerit yeniden kuruldu:** `tabCategories` (Bodyler/Battaniyeler/Setler/Havlular/Tulumlar/Çantalar) şeritten kaldırıldı — `/products` sayfasındaki `CategoryFilter`'da zaten ikonlu tam haliyle var. Şerit artık: Ürünler → Paketler → **İndirimde** (yeni, `/products?deal=1`) → **Son Görüntülenenler** (yeni, popover) → Blog. `CategoryFilter`'a `initialDealOnly` prop'u + `dealOnly` state eklendi (`discountPercent(p) > 0` filtresi, diğer filtrelerle aynı desende — clear-all'a dahil, sonuç sayacına `· İndirimde` ekleniyor). `/products` sayfasındaki eski bağımsız "−% Şu An İndirimde" rafı silindi (artık navbar butonu + filtre bunu karşılıyor); `shop.onSale`/`shop.seeAll` ölü anahtarları 4 dilden silindi. Son Görüntülenenler popover'ı hesap-dropdown deseninde (`recentRef` + `absolute`/`animate-pop-in`) — zaten Navbar'da hazır olan `recentProducts` (`useProductsByIds`) yeniden kullanıldı, foto/emoji+ad+fiyat kartı ızgarası + "Tümünü Gör" linki + boş-durum metni. **Not:** `useSearchParams()` kullanılmadı (root layout'taki Navbar'ı Suspense'siz static sayfalarda `next build` hatasına düşürür) — "İndirimde" pilinin aktif/pasif ayrımı bu yüzden yok, sabit vurgu rengiyle (`text-danger`) gösteriliyor; "Ürünler" pili öncekiyle aynı şekilde sadece path'e göre aktifleşiyor.
2. **Puan çipi düzeltildi:** çerçeveli `bg-panel border border-line` kutu kaldırıldı, sağdaki gerçek komşularıyla (arama/kalp/tema/hesap) aynı çerçevesiz `hover:bg-panel active:scale-90` ailesine sokuldu.
3. **Mobil hamburger + arama satırı kapanış animasyonu:** `globals.css`'e `loov-fade-down`/`.animate-fade-down` (fade-up'ın tersi, 0.2s) eklendi; her iki blok `useDelayedUnmount` ile sarıldı (200ms) — açık/kapalı duruma göre `animate-fade-up`/`animate-fade-down` arasında geçiş yapıyor, artık kapanış da animasyonlu.
4. **Hesap alanı ghost ekranları sayfa-şekline uyduruldu:** `GhostRows` artık `variant` prop'u alıyor (`rewards`/`security`/`notifications`/`list`/`generic`) — Rewards gradyan bakiye kartı + tier kartları + history satırları şeklinde, Security form-alan çiftleri + 2FA kart şeklinde, Notifications toggle-satır şeklinde, Orders/Returns/MyReviews küçük foto-placeholder + 2 satır metin şeklinde (`listHeader` prop'uyla Reviews'ın header'sız kartına uyarlandı). Diğer generic kullanımlar (AccountClient, AddressesClient, OrderDetailClient, ReturnRequestClient) dokunulmadan bırakıldı.

Doğrulama: `tsc --noEmit` + `npm test` (60/60) + `next build` temiz; Playwright ile canlı test edildi (İndirimde filtresi `/products?deal=1`'de doğru 1 ürünü gösteriyor, Son Görüntülenenler popover'ı açılıp gerçek ürün kartını gösteriyor, mobil hamburger aç/kapa çalışıyor, rewards/security/notifications sayfaları hatasız render).

---

## ✅ İKİNCİ CANLI-TEST TURU (15 Tem 2026, aynı gün) — 11 madde, TAMAMLANDI

Yukarıdaki batch commit edilir edilmez (henüz push edilmeden) kullanıcı ikinci bir geri bildirim turu verdi — bir kısmı yeni bulgu, bir kısmı "hala" tekrarı (muhtemelen bir önceki batch henüz push/deploy edilmediği için canlıda görünmüyordu). 11 madde işlendi:

1. **Beden Kılavuzu** navbar şeridine eklendi (`sg.title` anahtarı yeniden kullanıldı).
2. **Son Görüntülenenler** artık popover DEĞİL — direkt `/products#recently-viewed` anchor'ına link (RecentlyViewedSection'a `id` eklendi). Kullanıcı popover'ın "sacma yerden çıkmasını" eleştirmişti.
3. **CategoryFilter grid'de dev renkli boş kutu bug'ı** — `gap-px bg-line` hairline hilesi az sonuçlu satırlarda container arkaplanını dev dikdörtgen olarak sızdırıyordu (kullanıcının "İndirimde"nin sağındaki "dev açık yeşil dörtgen" dediği şey). Her karta kendi border'ı verildi, gap şeffaf yapıldı.
4. **PDP mobil galeri gerçek swipe** — önceden sadece 40px eşik geçilince (kaldırınca) sıçrıyordu; artık `dragX` state ile fotoğraf parmakla birlikte gerçekten kayıyor.
5. **PDP renk seçici** — yuvarlak renk noktaları isimli butonlara çevrildi (`colorLabel` + renk noktası). Stokta olmayan kombinasyonlar artık tıklanabilir (önceden `disabled` idi, bu yüzden back-in-stock bildirim kutusu asla tetiklenemiyordu — madde 11'i de bu çözdü).
6. **Back-in-stock bildirimi** — kod zaten doğruydu (`/api/stock-notify` + `handleNotifyAccount`/`handleNotifyGuest`), sadece madde 5'teki disabled-renk bug'ı yüzünden hiç ulaşılamıyordu.
7. **Wishlist baştan yazıldı** — artık paylaşılan `ProductCard` kullanıyor (siteyle birebir aynı tasarım + `QuickAddButton`'ın varyant seçici popover'ı → "hiçbir şey sormadan ekliyor" bug'ı düzeldi). Stok kontrolü `variantStock(sizes[0], colors[0])` yerine `hasAnyStock()` (herhangi bir varyant stokta mı) — "bir beden tükenince tüm ürün tükendi görünüyor" bug'ı düzeldi. "Add All" artık `firstAvailableVariant()` ile gerçekten stokta olan bir kombinasyon seçiyor. Share butonu artık `/wishlist` URL'i (işe yaramaz — herkes kendi wishlist'ini görür) yerine ürün listesinin METİN özetini paylaşıyor/kopyalıyor.
8. **CartToast + genel karanlık-mod renk bug'ı** — `bg-danger` blokları (CartToast, PDP butonları, checkout toast, wishlist rozetleri) karanlık modda `bg-ink`/`bg-accent` gibi metin rengini çevirmiyordu (`globals.css`'teki unlayered override'a `bg-danger` eklendi). CartToast'taki eski `text-[#C8B8B0]` hardcoded hex silindi, opacity-tabanlı muted metne çevrildi (tema ile birlikte doğru çeviriyor).
9. **Mobil hamburger baştan düzenlendi** — Ürünler/Paketler/Günlük linkleri (zaten kategori şeridinde + alt tab bar'da var) ve Çıkış Yap butonu (zaten /account'ta var) kaldırıldı; hesap linkleri mantıklı sıraya (Siparişler→İadeler→Rewards→Yorumlar→Bildirimler) alındı; panel `shadow-2xl` ile kendini belli ediyor.
10. **Ghost ekranı çifte-iskelet bug'ı** — `rewards/loading.tsx` ve `security/loading.tsx` hâlâ ESKİ spinner kullanıyordu (hiç GhostRows'a geçmemiş); `orders/loading.tsx`/`notifications/loading.tsx` generic variant kullanıyordu ama client component'ler yeni variant'a geçmişti; `account/loading.tsx`'in güzel özel iskeleti AccountClient'ın kendi generic GhostRows'una hiç bağlanmamıştı. Hepsi eşleştirildi (`account/loading.tsx`'teki bileşen artık named-export, AccountClient onu import ediyor).
11. **Rewards + Security + Reviews + Addresses renk token denetimi** — RewardsClient'taki `bg-[#FDEDE8]`/`bg-[#FFF4E8]`/`text-[#D97706]` hardcoded hex'ler `bg-danger-soft`/`bg-warning-soft`/`text-warning` token'larına çevrildi; SecurityClient'taki ~15 adet raw `red-*` Tailwind sınıfı (`text-red-400/500`, `border-red-200/300/100`, `bg-red-500`, `hover:bg-red-50`) `danger` token ailesine çevrildi; MyReviewsClient + AddressesClient'ta birer kalıntı da düzeltildi.

Doğrulama: `tsc --noEmit` + `npm test` (60/60) + `next build` temiz; her madde Playwright ile canlı doğrulandı (renk seçici artık isimli buton + tıklanabilir, wishlist ProductCard ile render oluyor, CartToast karanlık modda doğru kontrast, hamburger kısa/temiz). **Commit edildi, push henüz yapılmadı — kullanıcı onayı bekleniyor.**
