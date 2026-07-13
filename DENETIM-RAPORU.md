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
- ✅ **16. Sepet/favori DB senkronu (11 Tem):** `supabase/cart-wishlist.sql` (user_carts/user_wishlists jsonb + own-row RLS); Cart/WishlistContext girişte DB ile uzlaşır (union-merge guest adopt), 700ms debounce yazar; tablo yoksa localStorage'a zarif düşer (`src/lib/db/cartSync.ts`)
- ✅ **17. Back-in-stock (11 Tem):** `supabase/stock-notifications.sql` + `POST /api/stock-notify` (origin+rate-limit+email) + PDP "gelince haber ver" kutusu (tükendi durumunda); admin ürün stoğunu 0→>0 yapınca `notifyBackInStock` bekleyenlere 4 dilde mail atar (`src/lib/email/backInStock.ts`)
- ✅ **18. Testler + CI (11 Tem):** Vitest — pricing/loyalty/stock birim testleri (23 test), `npm test`/`typecheck` script'leri, `.github/workflows/ci.yml` (typecheck+test+build). Checkout E2E Playwright MCP ile elle sürülüyor (CI'da flaky olmasın diye)
- ⏳ 19. Sentry — bkz. aşağı (kalanlar)

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

---

# 🔬 KOD KALİTESİ DENETİMİ #2 (12 Tem 2026) — hardcoded değerler + mantık çelişkileri

> Kapsam: ürün vaatleri ↔ kod davranışı, admin ayarları ↔ gömülü değerler, client ↔ server kuralları, i18n kaçakları.
> Durum işaretleri: ⬜ bekliyor · ✅ yapıldı — **12 Tem 2026: 1-19 TAMAMI düzeltildi** (20 dış bağımlılık: posta kutusu). Kararlar: hediye paketi → `giftWrapPrice` ayarı (varsayılan 5₾, tüm metinler ayarı izler, 0=ücretsiz); Gold "free express" + "birthday" + "early access" perk'leri SİLİNDİ (uygulanmayan vaat).

## 🔴 Gerçek çelişkiler (müşteriye verilen söz ≠ kodun yaptığı)
1. ✅ **Hediye paketi "tamamen ücretsiz" yazıyor ama 5 ₾ alınıyor** — `announce.giftWrap` + `faq.ord.a3` + PDP delivery tabı (`ProductDetailClient.tsx:744`) 4 dilde "free" diyor; checkout client (`CheckoutClient.tsx:321`) + server (`api/orders/route.ts:266`) 5 ₾ tahsil ediyor. **KULLANICI KARARI GEREK: ücretsiz mi 5 ₾ mi?**
2. ✅ **Gold perk "Free express shipping" uygulanmıyor** — `loyalty.ts:55` vaat ediyor; `CheckoutClient.tsx:317` + `api/orders/route.ts:262` tier'a bakmadan expressPrice alıyor. **KULLANICI KARARI GEREK: gerçekten bedava yap vs perk metnini sil.**
3. ✅ **"Birthday surprise" + "Early access to new arrivals" perk'leri hayalet** — `loyalty.ts:37,45,56-57`; kodda hiçbir karşılığı yok. Metinden çıkarılmalı (ya da gerçekten uygulanmalı).
4. ✅ **İade politikası 3 kaynakta 3 farklı** — `faq.ret.a1` "Sale items are final sale" ↔ `legal.terms.s5Body` "any item" ↔ `api/returns` indirim kontrolü yok. FAQ cümlesi silinmeli (yasa da indirimli iadeyi engellemeye izin vermez).
5. ✅ **Admin iptalinde puan reversal yok** — müşteri iptali (`api/orders/route.ts:544-565`) stok+puan geri alıyor; admin iptali (`api/admin/orders/route.ts:158-161`) sadece stok. Redeemed puan kaybolur, earned puan kalır.

## 🟠 Admin ayarı varken hardcoded kalanlar
6. ✅ **"100 ₾" kargo eşiği gömülü** — `announce.freeShipping` + `home.hero.statFreeShip` (4 dil); `freeShippingThreshold` ayarlanabilirken. (Terms `{threshold}` ile doğru yapıyor — aynı desen uygulanmalı.)
7. ✅ **"2–4 gün" 5 anahtarda gömülü** — `checkout.standardDays` (review, `CheckoutClient.tsx:847`), `checkout.standardNote` (success, `:1078`), `contact.a1Base`, `faq.ship.a1Base`, `legal.terms.s4BodyBase`; `deliveryMin/MaxDays` ayarlanabilirken. Kargo seçici `{min}/{max}` kullanıyor — tutarsız.
8. ✅ **Bronze perk "2 points per 1 ₾" gömülü** (`loyalty.ts:37`, `tiersFor():82` bile kopyalıyor) + `acct.rewards.levelUpBody` "up to +50% at Gold" gömülü; `pointsPerGel` ve gold multiplier ayarlanabilirken.
9. ✅ **Hediye paketi 5 ₾ magic number** — client 3 yer (`CheckoutClient.tsx:321,732,865`) + server 1 yer → `settings.giftWrapPrice` olmalı (madde 1 kararına bağlı).

## 🟡 i18n kaçakları (müşteri yüzü İngilizce)
10. ✅ **PDP Specifications + Delivery tabları + bakım fallback + beden modal başlıkları İngilizce hardcoded** — `ProductDetailClient.tsx:700-705, 720-724, 739-744, 775`.
11. ✅ **PDP spec varsayılanları uydurma iddia üretiyor** — material boş → "100% Organic Cotton", weight boş → "180 GSM", origin boş → "Made in Georgia" (`:700-705`). Boş alan hiç gösterilmemeli (Certification deseni). Dürüst-içerik temizliğiyle çelişiyor.
12. ✅ **Sunucu hata mesajları İngilizce müşteriye ham basılıyor** — `CheckoutClient.tsx:439` `data.error` raw; `api/reviews/route.ts:204,289` İngilizce. Sunucu hata KODU dönmeli, client i18n'e eşlemeli (rate-limit'te desen zaten var).
13. ✅ **Ana sayfa hero stat değerleri İngilizce** — `page.tsx:77-78` "Free" ve "14d".

## 🔵 Küçük mantık / tutarlılık
14. ✅ **Promo `times_used` iptalde geri sayılmıyor** — kişi-başı sayaç cancelled'ı hariç tutuyor ama global limit düşmüyor → limitli kampanyada slot yanıyor.
15. ✅ **Sipariş no hâlâ "BBK-"** (Bebeco mirası) — `api/orders/route.ts:311` + track-order placeholder. LOV- benzeri yeni önek; eski siparişler BBK kalır (sorun değil).
16. ✅ **Express "before 14:00 → next day" cutoff kontrolü yok** — 23:00 siparişine de aynı söz.
17. ✅ **Puan kazanımı kargo+paket ücretini de sayıyor** (total bazlı; client=server tutarlı) — büyük mağazalar ürün ara toplamından verir. **Politika kararı.**
18. ✅ **Bayat yorum/ölü kod** — `LoginClient.tsx:65` "30s" yorumu (kod 60s); `loyalty.ts:7` "%30" doc (gerçek %20); `checkout.standardSub` ölü anahtar ×4; `tierFor/nextTierAfter/pointsForAmount` sadece testte; `label.perk.bonus25/50` bonusN ile gereksiz.
19. ✅ **Ana sayfa testimonials kurgu** — gerçek yorum sistemi canlıyken. Gerçek DB yorumlarından beslenmeli (veya bilinçli bırakılır).
20. ⬜ **hello@loov.ge hayalet kutu, Privacy YASAL metninde de geçiyor** (`legal.privacy.s5/s6/s7Body` "5 iş günü içinde yanıt" GDPR taahhüdü) — posta kutusu açılmalı ya da metin değişmeli.

## ✅ Temiz çıkanlar
Şifre kuralı (8+rakam) ×5 tutarlı · kargo eşiği/fiyatı her yerde ayardan · puan formülü client=server, tier merdiveni hep `tiersFromSettings` · footer Visa/MC rozetleri temiz · puan tavanı metinlerde hardcode yok · refund puan düzeltmesi idempotent.


---

# 🪞 SELF-AUDIT — kod tarafımın açıkları (13 Tem 2026)

> Kullanıcı: "bütün suçu bana attın kod tarafı mükemmel mi ki?" — haklı soruydu. Kendi tasarım kararlarımı aynı sertlikle denetleyip API/foto gerektirmeyen HER ŞEYİ aynı gün düzelttim.

1. ✅ **Rate limit artık DB-destekli (cross-instance)** — `supabase/rate-limits.sql` (⚠️ ÇALIŞTIRILMALI) + `rate_limit_hit()` atomik fonksiyon. `src/lib/rateLimit.ts` → yeni `serverRateLimited()`, migration yoksa eski in-memory limiter'a zarif düşer. `/api/orders`, `/api/stock-notify`, `/api/contact` bağlandı (contact'ın kendi kopya limiter'ı silindi, ortak koda taşındı).
2. ✅ **Puan harcama artık ATOMİK** — `supabase/loyalty-atomic.sql` (⚠️ ÇALIŞTIRILMALI) + `claim_redeem_points()` (advisory lock ile bakiye kilitleyip tek transaction'da harcıyor). İki eşzamanlı checkout artık aynı puanı iki kez harcayamaz. Migration yoksa eski check-then-write davranışına düşer. Sipariş sonradan patlarsa claim geri alınıyor (`releaseClaim`).
3. ✅ **Sold-out hata mesajı artık lokalize ürün adı kullanıyor** — `/api/orders` artık `name_ka/ru/tr` çekiyor, müşterinin dilindeki hata mesajında İngilizce ürün adı sızmıyor.
4. ✅ **Returns API hata kodları eklendi** (`iban_invalid`, `photo_required`, `not_delivered`, `window_closed`, `active_exists`, `cancel_too_late`) — `ReturnRequestClient`/`OrderDetailClient` artık bunları 4 dilde gösteriyor, ham İngilizce mesaj kalmadı.
5. ✅ **Test kapsamı 24 → 47'ye çıktı** — yeni `loyaltyReversal.test.ts` (6), `promoValidation.test.ts` (14), `rateLimit.test.ts` (3). Supabase admin client'ı gerçekçi simüle eden minik in-memory fake (`src/lib/testUtils/fakeSupabase.ts`) yazıldı — artık idempotency, iptal/geri-alma simetrisi, promo sayaç senkronu gerçekten test ediliyor.
6. ✅ **TOG (uyku sıcaklık) rehberi** — `/size-guide`'a yeni bölüm (oda sıcaklığı → önerilen TOG → altına ne giydirilir tablosu + güvenli uyku notu), 4 dilde.
7. ✅ **Erişilebilirlik sayfası** — `/accessibility` (dürüst dil: "WCAG 2.1 AA'ya doğru çalışıyoruz", tam uyum iddiası YOK), footer'a link eklendi, 4 dilde.
8. ✅ **SİTE GENELİNDE ÇİFT BAŞLIK BUG'I bulundu ve düzeltildi** (bu turun en büyük yan bulgusu) — kök `layout.tsx`'teki `title.template: "%s — Loov"`, HER sayfanın kendi `meta.*.title`'ında zaten gömülü "— Loov" ekini ikiye katlıyordu ("Terms of Service — Loov — Loov" gibi) — ürün/blog/bundle/hesap sayfaları dahil, 4 dilde, SİTENİN HER SAYFASINDA. Template kaldırıldı, tek satırlık kök-sebep düzeltmesi tüm siteyi düzeltti. Canlı doğrulandı (10 sayfa × başlık kontrolü).

**Bilinçli ERTELENEN (API/foto/hesap gerektirdiği için bu turda değil):** sepet senkronunda union-merge sadece misafir→üye geçişinde var (cihaz-cihaz hâlâ last-write-wins) — mimari değişiklik, ayrı oturum · OTP kapısının API-seviyesi zorlaması — mimari karar gerektirir · `useProducts`'ın tüm kataloğu client'a çekmesi — ölçek sorunu, ürün sayısı 20'de sorun değil · next/image, locale-URL, Lucide ikon geçişi — zaten planlı büyük kod turları.

**Doğrulama:** tsc + build + 47 test temiz · prod sunucuda 10 sayfa × başlık kontrolü (çift "— Loov" kalmadı) · TOG/a11y sayfaları 4 dilde sızıntısız render.
