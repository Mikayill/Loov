# YARININ PLANI — 17 Tem 2026

Dünün özeti: 17 maddelik hata raporu işlendi (16/17 kod tarafı bitti, push edildi), hamburger+ayarlar fiyaskosu aynı gece baştan yapılıp push edildi (`6a945c8`). Bugün sıra **D taraması** (derin site check-up) + açık kalan 2 küçük konuda.

---

## 1. SABAH İLK İŞ — Senin 2 dakikalık kontrolün (kullanıcı)
- [ ] Telefonundan loov.ge'ye **girişli** halde gir, hamburger'ı aç: profil satırı + 👶 bebek satırı + Hesabım 7 satır + Tercihler (Karanlık Mod / Dil) + Çıkış düzgün mü? (Ben misafir halini doğruladım; girişli hali gerçek hesap gerektirdiği için sadece sen görebilirsin.)
- [ ] `/account/settings` sayfasına bak — yeni tek-liste hali beğendin mi?
- Beğenmediğin bir şey varsa maddeyle yaz, D taramasından ÖNCE düzeltirim.

## 2. GOOGLE OAUTH — yarım kalan konu (kullanıcı + ben)
Dün "App name: Loov yaptım, olmadı" demiştin; araştırma sonucu asıl şüpheli **Publishing status = Testing**. Yarın:
- [ ] Google Cloud Console → Google Auth Platform → **Audience** sekmesi → "Publishing status" ne yazıyor söyle.
- [ ] "Testing" ise **PUBLISH APP**'e bas (sadece email/profile/openid kullandığımız için doğrulama süreci gerekmeden anında yayınlanır).
- [ ] Sonra myaccount.google.com/permissions'tan eski izni kaldır + gizli sekmede dene.
- Hâlâ olmuyorsa ekran görüntüsüyle bana dön, birlikte bakarız.

## 3. D TARAMASI — derin site check-up (ben, onayınla başlarım)
**Yöntem:** Production build + Playwright, 390×844 (mobil öncelik) + 1440 masaüstü kontrol. Her sayfada şuna bakılır:
- Yatay taşma / kırık düzen
- Boş-durum görünümleri (sepet boş, favori boş, sipariş yok, yorum yok, arama sonuçsuz…)
- Karanlık modda renk kalıntısı/okunmazlık (geçmişte CartToast/CookieConsent'te çıkmıştı — sistematik tarama hiç yapılmadı)
- Eğreti/çift desen: aynı iş için iki farklı UI (dünkü dil-dropdown vakası gibi)
- i18n sızıntısı: 4 dilde gezip ham anahtar / hardcoded İngilizce avı (Footer'daki hardcoded "Bodysuits/FAQ…" etiketleri ZATEN bilinen bulgu — bu turda düzeltilebilir)
- Dokunma hedefi < 44px kalan butonlar (ProductCard içi butonlar bilinçli ertelenmişti — yeniden değerlendirilir)

**Gezilecek sayfalar (hepsi):** ana sayfa · /products (+deal=1, +recent=1, filtreler açık) · /products/[slug] (fotolu+fotosuz ürün) · /category/[x] · /bundles + detay · /cart (boş+dolu) · /checkout (3 adım) · /wishlist (boş+dolu) · /login /register /forgot-password · /account + TÜM alt sayfalar (orders/detay/iade sihirbazı/returns/reviews/rewards/addresses/notifications/security/settings) · /blog + makale · /faq /size-guide /track-order /about /contact /privacy /terms /accessibility · 404 · hamburger + arama + QuickView + CartDrawer + VariantPicker modalları.

**Çıktı:** Bulgular önem sırasına göre bu dosyanın altına rapor edilir → onayınla aynı gün düzeltilir → tsc+test+build+görsel doğrulama (bu sefer her bulgu için önce/sonra ekran görüntüsü standardı).

## 4. SIRADA BEKLEYENLER (bugün değil, hatırlatma)
- Supabase Frankfurt göçü (en büyük hız kazancı — panelden sen yapacaksın, ben rehberlik ederim)
- Gerçek ürün fotoğrafları (GORSEL-PLANI.md hazır) → sonrasında next/image göçü
- `product-video.sql` + bazı SQL'lerin çalıştırıldı onayı yok (BUG raporundaki liste)
- Best-sellers vitrini / terk edilmiş sepet maili (cron) — orta ölçekli, istenirse

---
İyi uykular. Yarın "başla" demen yeter — 3. maddeden (D taraması) başlarım, 1-2'deki kontrollerini de beklerim.
