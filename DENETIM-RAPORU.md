# 🔍 LOOV — KAPSAMLI SİTE DENETİMİ (11 Tem 2026)

> Yöntem: Uçtan uca müşteri senaryosu yürüyüşü (kayıt → alışveriş → sipariş → admin → teslimat → iade)
> + kod düzeyinde mantık/çelişki taraması + büyük e-ticaret siteleriyle (Amazon, Zara, Temu, Trendyol) kıyas.
> Her bulgu **[K]ritik / [O]rta / [D]üşük** olarak işaretli. "✓kod" = kodda doğrulandı, tahmin değil.

---

## BÖLÜM A — SENARYO: "Nino'nun yolculuğu"

Nino (Tiflis'ten, hamile, Gürcüce konuşuyor) siteye ilk kez giriyor, hesap açıyor,
alışveriş yapıyor, ürünü teslim alıyor, birini iade ediyor. Adım adım ne yaşıyor:

### A1. İlk ziyaret
- ✅ Site Gürcüce açılıyor (varsayılan ka), navbar/footer/içerik tam çevrili.
- ⚠️ **[O]** Footer'da "ჩვენ ვიღებთ: Visa · MC · Cash · Bank of Georgia" yazıyor ama sitede
  TEK ödeme yöntemi kapıda nakit. Nino kartla ödeyeceğini sanıyor, checkout'un son adımında
  öğreniyor → güven kırıcı + yanıltıcı beyan. Visa/MC rozetleri online ödeme gelene kadar kaldırılmalı. ✓kod (footer)
- ⚠️ **[O]** 45. saniyede popup: "İlk siparişinde %10 indirim". Ama `news.title` içinde "%10"
  **hardcoded** — admin LOOV10'un oranını %15'e çekerse popup hâlâ %10 der. Popup kodun
  yaşadığını kontrol ediyor ama YÜZDESİNİ kontrol etmiyor. ✓kod (en.ts:1318 + NewsletterPopup)
- ⚠️ **[D]** SocialProofToast 9. saniyede "ნინო თბილისიდან იყიდა..." gösteriyor — **tamamen uydurma
  veri**. PDP'deki "🔥 N kişinin sepetinde" de sahte (id+saat'ten deterministik üretiliyor).
  Projede dürüstlük temizliği yapıldı (sahte ekip, sahte GOTS iddiaları kaldırıldı) ama bu ikisi
  kaldı — tutarsız. Tüketici hukuku açısından risk: gerçek satın alma verisi varmış izlenimi.
  Öneri: ya gerçek son-siparişlerden besle (anonim) ya tamamen kaldır.

### A2. Ürünlere bakıyor
- ✅ Filtreler, arama, quick-view, varyant stoğu — sağlam çalışıyor.
- ⚠️ **[O]** İndirimli üründe Google'a giden JSON-LD `offers.price = product.price` (BAZ fiyat) —
  %20 indirimli 23₾'lik ürün Google'da 23₾ görünür, sitede 18.40₾. Google Merchant/rich
  results fiyat uyuşmazlığında listing'i düşürebilir. `effectivePrice()` kullanılmalı; beden
  bazlı fiyat (size_prices) da yok sayılıyor. ✓kod (products/[slug]/page.tsx:64)
- ⚠️ **[D]** Ürün fotoğrafları çoğunlukta hâlâ emoji (biliniyor, görseller bekleniyor — GORSEL-PLANI.md).

### A3. Kayıt oluyor
- ✅ Şifre kuralı (8+rakam) net, "email zaten kayıtlı → Giriş yap" linki çalışıyor, kod ekranı var.
- ⚠️ **[K]** "Kodu tekrar gönder" butonu 30 sn sonra aktifleşiyor AMA Supabase SMTP ayarında
  "Minimum interval per user: 60" — yani 30. saniyede tekrar gönderen HERKES rate-limit'e
  takılır, kod gitmez, kafa karışır. İkisi hizalanmalı: client cooldown'u 60 sn yap (kolay)
  veya Supabase'te interval'i 30'a indir. ✓kod (LoginClient resendCooldown=30) + panel ayarı 60
- ⚠️ **[O]** Misafirin sepet ürünleri kayıtla hesaba taşınıyor (✅ yeni yapıldı) ama **misafirken
  biriken loyalty puanları girişte DB'ye taşınmıyor** — localStorage'da ölü kalıyor. Nino
  misafirken 50 puan "kazandıysa" üye olunca sıfırdan başlıyor. (Bilinen, hâlâ açık.)
- ⚠️ **[D]** Telefonla kayıt olan kullanıcının adı yok → her yerde "Loov Parent" görünüyor;
  ilk girişte "adını gir" adımı yok.

### A4. Giriş yapıyor (yeni cihazdan)
- ⚠️ **[K] EN ÖNEMLİ MİMARİ BULGU:** Email-OTP giriş kapısı **sadece istemci tarafında**.
  `signInWithPassword` başarılı olduğu anda Supabase oturumu ZATEN kurulmuş oluyor; kod ekranı
  yalnızca bir React state. Nino (veya bir saldırgan) kod ekranındayken adres çubuğuna
  `/account` yazarsa **kodu hiç girmeden içeride**. Sunucu hiçbir yerde "OTP doğrulanmadı"
  kontrolü yapmıyor. Yani bu özellik şu an *güvenlik katmanı değil, güvenlik görünümü*.
  Çözüm seçenekleri (sıradaki oturum için):
  a) `proxy.ts`'te oturum aal/flag kontrolü + OTP doğrulanana dek korumalı sayfalara erişimi
     server-side blokla (cookie'ye "pending-otp" işareti, verify sonrası temizle), veya
  b) şifre girişini `signInWithPassword` yerine iki aşamalı server route'a taşı (şifreyi doğrula
     ama session'ı OTP doğrulanana kadar kurma), veya
  c) bunun bir "friction katmanı" olduğunu kabul et ve belgeleyip bırak (dürüst ama zayıf).
  ✓kod (LoginClient.handleEmailLogin akışı)
- ⚠️ **[K]** Aynı kapının operasyonel riski: **SMTP çökerse** (Resend arızası, API key süresi,
  DNS) yeni/tanınmayan cihazdan HİÇBİR müşteri şifreyle giremez (kod maili gitmez). Google
  girişi tek kaçış. İzleme yok, fallback yok. En azından: SMTP hatasında kullanıcıya net mesaj +
  admin'e uyarı + belki "kod gönderilemedi → linkle giriş" alternatifi düşünülmeli.
- ⚠️ **[O]** Login'in telefon sekmesi + Security'deki "telefon ekle" alanı hâlâ serbest metin —
  checkout'ta yaptığımız sabit **+995 öneki burada yok**. Aynı UX üç yerde iki farklı davranış.
  ✓kod (LoginClient phone input, SecurityClient phoneAddInput)

### A5. Sepet & Checkout
- ✅ Varyant stok kelepçesi, promo, puan, kayıtlı adres, +995 önek — sağlam.
- ⚠️ **[O]** **Client 111 adet eklemeye izin veriyor, sunucu 99'da reddediyor.** Stok takipsiz
  (null) üründe sepette miktar sınırsız artabiliyor; sipariş anında `/api/orders` `quantity > 99`
  için hata dönüyor → müşteri sepette sorun görmüyor, checkout'ta anlaşılmaz biçimde patlıyor.
  CartContext'e de 99 üst sınırı konmalı. ✓kod (route.ts:129 `it.quantity > 99` vs CartContext sınırsız)
- ⚠️ **[O]** "Bu siparişle **N puan** kazanacaksın" yazısı `pointsForAmount(total, tier)` kullanıyor —
  bu fonksiyon SABİT 2 puan/₾ oranını kullanır, admin'in `pointsPerGel` ayarını YOK SAYAR.
  Sunucu ise `pointsForAmountAt(settings.pointsPerGel)` ile hesaplıyor. Admin oranı 3 yaparsa
  müşteriye söz verilen ≠ verilen. `useSettings()` zaten import'lu, `pointsForAmountAt`'e
  geçmek 2 satır. ✓kod (CheckoutClient.tsx:1031)
- ⚠️ **[O]** **Teslimat süresi 3 yerde 3 farklı kaynaktan:**
  1) PDP: admin ayarı `deliveryMin/MaxDays` (doğru olan bu)
  2) Checkout kargo seçeneği: locale'de hardcoded "2–4 business days" (`checkout.standardSub`)
  3) "Kargoya verildi" e-postası: hardcoded "1–3 business days" (orderMessages.ts:106)
  Admin 5-7 gün yapsa PDP değişir, checkout ve e-posta eski kalır. Hepsi settings'ten okumalı.
  ✓kod (en.ts:449, orderMessages.ts)
- ⚠️ **[D]** "Express: 14:00'a kadar sipariş → ertesi gün" vaadi saate bakmıyor — 14:01'de de
  aynı yazı. Gerçek saat kontrolü + saat geçtiyse "yarın verirsen ertesi gün" gösterimi.
- ⚠️ **[D]** Gift wrap 5₾ hem client hem server'da hardcoded — tutarlı ama admin-ayarlanamaz
  (teslimat günü ayarlanabilirken bunun ayarlanamaması tutarsız).
- ⚠️ **[O]** Checkout'ta **şartları kabul checkbox'ı yok.** Mesafeli satış sözleşmesi/iade
  koşullarının sipariş anında kabulü (Gürcistan tüketici hukuku + genel e-ticaret pratiği)
  eksik — kayıtta var ama misafir checkout'ta hiç yok.
- ⚠️ **[O]** Misafir e-postası doğrulanmadan sipariş alınıyor → yazım hatasında onay maili ve
  track-order erişimi kayıp. Büyük siteler ya doğrular ya da en azından "e-postanı kontrol et"
  görünür uyarısı ekler. (Telefon zaten aranıyor, ölümcül değil ama sipariş numarasına tek
  erişim yolu e-posta + ekran.)
- ⚠️ **[D]** Sipariş başarı ekranı sadece React state — sayfa yenilenince sipariş numarası ekrandan
  kaybolur; `?order=BBK-...` URL'i yok. Müşteri numarayı not almadıysa maile mahkûm.

### A6. Sipariş admin'e düşüyor
- ✅ Dashboard, durum değiştirme, e-posta gönderimi, stok düşümü/iadesi, audit — çalışıyor.
- ⚠️ **[O]** E-postalar hâlâ `onboarding@resend.dev`'den gidiyor; **domain artık Verified** —
  `orders@loov.ge`'ye geçiş için hiçbir engel kalmadı. 5 gönderim noktası + `CONTACT_INBOX`
  env'e taşınmalı (route'larda TODO'lar hazır bekliyor). Sandbox'tan çıkmadan gerçek
  müşterilere mail GİTMEZ (Resend sandbox sadece hesap sahibine teslim eder) —
  **yani şu an canlıda müşteri sipariş onayı alamaz. Launch-blocker.** ✓kod (5 route'ta TODO)
- ⚠️ **[O]** `/api/orders`'da rate limit yok (bilinen) — bot 1 dakikada yüzlerce sahte COD
  siparişi + e-posta tetikleyebilir; stok rezervasyonunu da şişirir (gerçek stok kilitlenir).
  Deploy öncesi en azından IP-bazlı in-memory limit (contact'taki desen hazır) konmalı.
- ⚠️ **[D]** Sipariş durum geçişlerinde kural yok — admin "delivered"ı geri "pending" yapabilir;
  `delivered_at` damgası ve iade penceresi tutarlılığı bozulabilir. (İade tarafında geçiş
  kuralları VAR, sipariş tarafında yok — asimetrik.)
- ⚠️ **[D]** İki admin aynı anda ürün düzenlerse race (bilinen, düşük öncelik).

### A7. Teslimat sonrası & iade
- ✅ Yorum uygunluğu (delivered şartı), iade sihirbazı, puan düzeltmesi, IBAN kopyalama — sağlam.
- ⚠️ **[D]** Müşteri **pending siparişini iptal edemiyor** — tek yol admin'i aramak. Büyük
  sitelerde "kargoya verilmeden iptal" standart. (COD olduğu için para iadesi derdi de yok,
  eklemesi görece kolay: PATCH /api/orders + release_stock + puan geri alımı.)
- ⚠️ **[D]** track-order tarayıcı cache bug'ı hâlâ açık (bilinen — `[trackOrder]` console
  uyarısına bakılacak).

### A8. Hesabından çıkıyor, başka cihazdan giriyor
- ✅ Sepet/favori artık hesaba bağlı (bu oturumda düzeltildi) — cihaz İÇİNDE hesap değişimi temiz.
- ⚠️ **[O]** Ama sepet/favori hâlâ **cihaza hapis** (localStorage): Nino telefonda sepete 3 ürün
  atıp bilgisayardan girince sepeti BOŞ. Büyük sitelerin tamamında sepet/favori sunucuda.
  DB tablosu yok (`carts`/`wishlists`) — orta vadeli iş: signed-in kullanıcı için DB'ye senkron
  (LoyaltyContext'teki dual-source deseni birebir uygulanabilir).
- ⚠️ **[D]** İki sekme açıkken sepet senkron değil (storage event dinlenmiyor) — sekme A'da
  eklenen, sekme B'de görünmüyor; B kaydedince A'nınkini ezebilir.

---

## BÖLÜM B — KOD KALİTESİ / ÖLÜ KOD / ÇELİŞKİLER

| # | Önem | Bulgu |
|---|------|-------|
| B1 | D | **Ölü i18n anahtarları** (4 dilde ×): `auth.mfaTitle/mfaBody/mfaBodyPhone`, `sec.mfaOn/Off/Enable/ScanQr/ManualKey/EnterCode/Activate/Disable/DisableConfirm(Phone)/EnabledNote(Phone)/MethodApp(Hint)/MethodSms(Hint)/EnterPhone/SendCode/CodeSentTo`, `sec.twoFactor/twoFactorBody/comingSoon`, `auth.demoModeNote` — eski 2FA UI silindi, anahtarları kaldı. ✓kod |
| B2 | D | `size_colors` DB kolonu vestigial (artık okunmuyor/yazılmıyor) — bilinçli bırakıldı ama şemada kafa karıştırıyor; bir sonraki migration'da drop notu düşülmeli. |
| B3 | D | `mockOrders.ts` adı yanıltıcı — içinde mock kalmadı (sadece tipler+statusConfig); `orderStatus.ts` gibi bir ada taşınmalı. |
| B4 | D | `pointsForAmount` (settings'siz) hâlâ export'ta ve checkout onu kullanıyor (yuk. A5) — settings'li `pointsForAmountAt` varken çift API; biri deprecated işaretlenmeli. |
| B5 | D | E-posta gövdeleri `orderMessages.ts`'te string birleştirme — 4 dil × 3 mesaj tipi × 5 durum elle yönetiliyor; içerik büyüdükçe hataya açık. (Şimdilik çalışıyor, not olarak.) |
| B6 | D | `RegisterClient`'ta kayıt-onay ekranında "tekrar gönder" YOK (login'de var) — kod gelmezse müşteri çıkmaza giriyor; tek yolu sayfayı yenileyip formu yeniden doldurmak. |
| B7 | D | CookieConsent binary (Accept/Decline) ve hiçbir şeyi gate etmiyor — şu an tracker olmadığı için zararsız; GA/Pixel eklenince (Faz 2 planında) GERÇEK consent-gating şart olacak, şimdiden not. |

---

## BÖLÜM C — BÜYÜK SİTELERLE KIYAS: EKSİK ÖZELLİKLER

Trendyol/Zara/Amazon standardına göre eksikler, iş etkisine göre sıralı:

### Dönüşümü doğrudan etkileyenler
1. **[K] Online ödeme yok** (Faz 3'te planlı — BOG/TBC). Kapıda nakit tek başına: sepet
   terk oranını ciddi artırır, ön ödemesiz sahte sipariş riskini büyütür. En kritik eksik.
2. **[O] Fatura/fiş yok** (KDV %18, Faz 3) — B2C'de yasal zorunluluk yönü de var.
3. **[O] Sipariş iptali (müşteri) yok** — yuk. A7.
4. **[O] Back-in-stock "gelince haber ver" yok** — stok tükenen üründe talep kaybı.
   (Varyant-stok altyapısı hazır olduğu için eklemesi artık kolay.)
5. **[O] Sepet/favori cihazlar arası senkron değil** — yuk. A8.
6. **[D] Sepet hatırlatma / terk e-postası yok.**

### Güven & iletişim
7. **[O] SMS bildirimleri yok** — Gürcistan'da kapıda ödeme + kurye dünyasında SMS ("kuryeniz
   yola çıktı") e-postadan daha kritik; `buildOrderMessage` SMS metinleri HAZIR yazılmış,
   sadece gönderen entegrasyon (Twilio vb.) yok.
8. **[D] Canlı destek yok** — WhatsApp butonu var (numara girilince aktifleşecek), bu ölçek için yeterli sayılabilir.
9. **[D] Sipariş ürün-bazlı değerlendirme hatırlatma e-postası yok** (teslimattan N gün sonra "yorum yap").

### Keşif & SEO
10. **[O] Locale URL yok** (çerez tabanlı dil) — hreflang verilemiyor; Google 4 dilin sadece
    birini indeksliyor. Bilinen/ertelenmiş karar ama launch öncesi en yüksek SEO kaldıracı.
11. **[O] Kategori sayfaları query-param** (`/products?cat=body`) — crawl edilebilir kategori
    landing'leri (`/products/bodysuits` gibi) yok; kategori bazlı sıralama alınamıyor.
12. **[D] Arama typo-toleranssız** ve tüm katalog client'a iniyor — 20 üründe sorunsuz,
    200 üründe sorun. Şimdilik not.
13. **[D] PWA manifest yok** — "ana ekrana ekle" deneyimi yok.

### Operasyon & admin
14. **[O] Otomatik test YOK (0 test), CI yok** — profesyonel işletmeyle en büyük altyapı farkı.
    En azından: sipariş fiyatlama (`priceCartWithBundles`, puan/promo hesapları) için birim
    testler + 1 checkout smoke E2E. Regresyonlar şu an sadece elle yakalanıyor.
15. **[O] Hata izleme yok** (Sentry vb.) — canlıda müşteri hata görünce kimsenin haberi olmuyor;
    console.warn'lar Vercel loglarında kayboluyor.
16. **[O] Analytics yok** (GA4/Pixel — Faz 2'de planlı) — dönüşüm hunisi ölçülemiyor.
17. **[D] Admin eksikleri:** müşteri listesi/CRM görünümü yok, CSV export yok, toplu ürün
    düzenleme yok, düşük-stok e-posta uyarısı yok (dashboard'da rozet var), sipariş arama/tarih
    filtresi sınırlı.
18. **[D] Storage orphan foto temizliği yok** (bilinen).

---

## BÖLÜM D — GÜVENLİK ÖZETİ (önceki denetimlerin üstüne)

Geçenler (yeniden teyit): fiyat sunucuda yeniden hesaplanıyor, CSRF origin kontrolü, RLS,
admin 404 gizlemesi, stok fonksiyonları service-role-only, promo kuralları ortak doğrulayıcıda.

Açık kalanlar (öncelik sıralı):
1. **[K]** Email-OTP kapısı client-side (A4) — "güvenlik özelliği" olarak pazarlanamaz durumda.
2. **[O]** `/api/orders` + `/api/promo` + `track_order` rate-limitsiz (A6).
3. **[O]** SMTP tek hata noktası (A4).
4. **[D]** Trusted-device yönetim UI'ı yok — müşteri "cihazlarımı unut" yapamıyor
   (DELETE endpoint hazır, UI bağlanmadı).
5. **[D]** Şifre değişince mevcut oturumlar/trusted-device'lar düşürülmüyor
   (şifre çalındıysa hırsızın trusted cihazı trusted kalır).

---

## BÖLÜM E — PERFORMANS

1. **[K]** Supabase **Sydney'de** (bilinen) — her DB sorgusu ~300ms+ RTT. Frankfurt'a göç
   hâlâ en büyük tekil kazanım.
2. **[O]** `proxy.ts` HER sayfa isteğinde `supabase.auth.getUser()` çağırıyor → her gezinmede
   Sydney turu. Matcher'ı daraltmak (sadece auth gereken rotalar) veya `getSession`
   (yerel JWT kontrolü) + seyrek `getUser` düşünülmeli.
3. **[O]** Tüm görseller ham `<img>` (her yerde eslint-disable) — `next/image` yok:
   boyutlandırma/format/lazy-load optimizasyonsuz. Gerçek ürün fotoğrafları gelince
   (emoji→foto geçişi) bu LCP'yi vuracak; görsel işleme turunda birlikte ele alınmalı.
4. **[D]** `useProducts` tüm katalogu her client'a indiriyor (arama/öneriler için) —
  20 üründe önemsiz, katalog büyürse sayfalama/server arama gerekir.

---

## BÖLÜM F — ÖNCELİKLİ YOL HARİTASI (önerim)

**Hemen (launch-blocker):** → ✅ **5'i de 11 Tem 2026'da yapıldı**
1. ✅ Resend gönderenleri `orders@loov.ge`'ye geçti (paylaşılan `EMAIL_FROM` sabiti, `RESEND_FROM` env ile ezilebilir; 5 route). ⚠️ Gerçek teslimat kullanıcı testi bekliyor (ilk siparişte maili kontrol et)
2. ✅ OTP resend cooldown 60 sn (LoginClient)
3. ✅ Footer Visa/MC/BOG rozetleri → tek "💵 Kapıda Ödeme" rozeti; `faq.ord.a1` de 4 dilde dürüstleştirildi ("yakında geliyor")
4. ✅ Checkout puan vaadi `pointsForAmountAt(total, pointsPerGel, tier)` — admin ayarına bağlı (PDP zaten doğruydu)
5. ✅ `/api/orders` rate limit: IP başına 10 dakikada 5 sipariş (`src/lib/rateLimit.ts`, canlı test: 6. istek → 429); client 429'da lokalize mesaj gösteriyor

**Kısa vade (1. hafta):** → ✅ **9'u da 11 Tem 2026'da yapıldı**
6. ✅ Email-OTP kapısı server-side zorlandı: `POST /api/auth/otp-gate` httpOnly `loov-otp-pending` cookie set eder, `proxy.ts` `/account` + `/checkout`'u kod doğrulanana dek `/login?verify=1`'e yönlendirir (canlı test: cookie'yle 307, cookie'siz 200). ⚠️ **Kalıcı sınır:** oturum yine de geçerli olduğu için doğrudan API çağrıları gate'lenmez — bu sayfa erişimini engeller, tam kriptografik 2. faktör değil (o Supabase native MFA gerektirir). Bu bilinçli kabul, koda ve buraya not düşüldü.
7. ✅ Teslimat süresi tek kaynak: checkout `standardSubDays` + "kargoya verildi" e-postası artık `settings.deliveryMin/MaxDays`'ten
8. ✅ Sepet miktarı 99 kelepçesi (`CartContext MAX_PER_LINE`, addItem + updateQuantity)
9. ✅ JSON-LD fiyatı `minEffectivePrice(product)` (indirim + beden fiyatı yansır)
10. ✅ Login telefon sekmesi + Security "telefon ekle" → sabit +995 önek; `phoneLocalPart`/`withCountryCode` `georgia.ts`'e taşındı (checkout dahil 3 yer tek kaynak)
11. ✅ Kayıt-onay ekranına "tekrar gönder" (60sn cooldown, `resend({type:"signup"})`)
12. ✅ Checkout şartlar onayı checkbox'ı (misafir dahil, kabul edilmeden sipariş verilemez)
13. ✅ 27 ölü i18n anahtarı 4 dilden silindi (eski 2FA UI + `pdp.cartBuzz`)
14. ✅ SocialProofToast (hiç mount edilmemiş ölü kod) silindi; `pdp.cartBuzz` (hiç render edilmiyordu) kaldırıldı — sahte "N kişi aldı"/"N kişinin sepetinde" zaten kullanıcıya gösterilmiyormuş, artık kodda da yok

**Orta vade:** → ✅ **saf-kod olan 4'ü 11 Tem 2026'da yapıldı** (15, 20, 21, 22)
15. ✅ Müşteri sipariş iptali: `PATCH /api/orders {action:"cancel"}` — sadece pending, sahiplik doğrulaması, `release_stock` + puan ledger reversal; UI OrderDetailClient'ta (`cancellable` bayrağı raw "pending"den türetiliyor)
20. ✅ Misafir puan göçü GÜVENLİ yolla: localStorage kopyalama YOK (fabrike edilebilir → istismar); yerine `POST /api/account/link-guest-orders` — doğrulanmış e-postayla verilmiş misafir siparişlerini hesaba bağlar, puanı **gerçek sipariş tutarından** yeniden hesaplar (idempotent). LoyaltyContext girişte 1 kez tetikler
21. ✅ Sipariş durum geçiş kuralları: admin PATCH'te `TRANSITIONS` matrisi (delivered→pending gibi geçişler 400)
22. ✅ Trusted-device yönetim UI: Security "Giriş doğrulaması" kartında "bu cihazı unut" (mevcut DELETE endpoint'e bağlandı)
- ⏳ 16. Sepet/favori DB senkronu · 17. Back-in-stock · 18. Testler · 19. Sentry — bkz. aşağı (kalanlar)

**⛔ KALANLAR — dış bağımlılık / karar / büyük çaba (kod olarak tamamlanamaz):**
- 16. Sepet/favori cihazlar-arası DB senkronu — yeni `carts`/`wishlists` tabloları + RLS + senkron mantığı (orta çaba, kullanıcı SQL çalıştırır); LoyaltyContext deseni birebir uygulanabilir
- 17. Back-in-stock bildirimi — yeni tablo + e-posta tetikleyici
- 18. Otomatik test + CI — fiyatlama/puan birim testleri + 1 checkout E2E (saf kod, yapılabilir; ayrı oturum önerilir)
- 19. Sentry — hesap + DSN gerekli (dış)
- 23. Online ödeme (BOG/TBC) — banka sözleşmesi + API kimlik bilgileri (dış, Faz 3)
- 24. Fatura/KDV — muhasebe/hukuk kararı (dış)
- 25. SMS bildirimleri — Twilio vb. hesap (dış); metinler zaten `buildOrderMessage`'da hazır
- 26. Locale URL + hreflang — ~40 sayfalık göç (büyük çaba, ayrı oturum)
- 27. Kategori landing sayfaları — orta çaba
- 28. GA4 + consent-gating — ölçüm ID gerekli (dış)
- 29. Supabase Frankfurt göçü — kullanıcı panelden yapar (veri göçü)
- 30. next/image geçişi — gerçek fotoğraflarla birlikte (görsel turu)

**Launch sonrası / Faz 3 ile:**
23. Online ödeme (BOG/TBC) · 24. Fatura/KDV · 25. SMS bildirimleri · 26. Locale URL + hreflang ·
27. Kategori landing sayfaları · 28. GA4 + consent-gating · 29. Supabase Frankfurt göçü ·
30. next/image geçişi (görsel turuyla birlikte)
