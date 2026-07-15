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
