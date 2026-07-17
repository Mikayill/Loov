# DURUM RAPORU — Hamburger + Ayarlar Fiyaskosu (16 Tem 2026, gece)

Kullanıcı haklı olarak sinirli. Bu rapor: (1) neyi nasıl batırdığımın dürüst itirafı, (2) şu anki durumun canlı tespiti, (3) internet araştırması bulguları, (4) onay bekleyen yeni plan. **Bu turda tek satır kod değiştirilmedi.**

---

## 1. NEYİ NASIL BATIRDIM — dürüst itiraf

### Hata 1: "alt atla bir sisteme geç"i yanlış okudum (en büyük hata)
Siz **"alt alta bir sistem"** (satırlar üst üste, dikey, uygulama menüsü gibi) demek istediniz. Ben bunu **"bottom sheet"** (alttan açılan panel) olarak yorumladım ve asıl isteğinizi — menünün İÇERİĞİNİN alt alta düzgün satırlar olmasını — hiç yapmadım. Girişli kullanıcıda linkleri yine 2 SÜTUNLU grid'e dizdim (eski hamburger'daki aynı hata), misafirde ise panel neredeyse BOMBOŞ: koca beyaz alan + tek "Giriş Yap" butonu + köşede sıkışmış minicik "EN ▾". Canlı ekran görüntüsüyle doğruladım — gerçekten kötü görünüyor.

### Hata 2: Karanlık mod düğmesini hamburger'a TAŞIMADIM
İsteğiniz: aydınlık/karanlık düğmesi hamburger'a girsin. Yaptığım: navbar'daki ay/güneş ikonuna HİÇ dokunmadım (hâlâ üst barda duruyor), sadece Ayarlar sayfasına bir kopyasını koydum. Yani isteğiniz fiilen yerine getirilmedi.

### Hata 3: Dil değiştiriciyi düzgün entegre etmedim
Eski dropdown bileşenini (`LanguageSwitcher`) olduğu gibi yeni panele kopyala-yapıştır yaptım. Sonuç: panelin altında havada duran, tıklayınca AYRI bir dropdown açan garip bir "EN ▾". Alt alta bir menünün doğal satırı gibi değil, yama gibi duruyor.

### Hata 4: Ayarlar sayfası özensiz ve içinde gerçek bir bug var
- "Dil" kartının alt açıklaması YANLIŞ çeviri anahtarı kullanıyor: `acct.settingsSub` = "Karanlık mod ve dil" — yani dil kartının altında "Karanlık mod ve dil" yazıyor. Bariz özensizlik.
- Sayfanın yarısı (Bildirimler/Güvenlik kısayolları) zaten hesap ana menüsünde olan linklerin kopyası — gereksiz tekrar, "ayar" değil.
- 3 kopuk kart; bir "ayarlar ekranı" hissi yok.

### Hata 5: Doğrulamayı yarım yaptım
Playwright testinde paneli sadece MİSAFİR olarak açıp "açılıyor, çalışıyor" deyip geçtim. "Açılıyor" ≠ "iyi görünüyor". Boşluğunu, orantısızlığını, dil dropdown'ının eğretiliğini gördüm ama sorgulamadım. Girişli hâlini hiç görmedim (canlı hesap açmıyorum — bu doğru bir kural ama o zaman en azından ekran görüntüsünü size sorup göstermeliydim).

---

## 2. ŞU ANKİ DURUM (canlı tespit, 390×844)

| Alan | Durum |
|------|-------|
| Hamburger paneli (misafir) | ❌ Neredeyse boş: Giriş Yap butonu + köşede "EN ▾", koca boşluk |
| Hamburger paneli (girişli) | ❌ 2 sütunlu link grid'i (istenen alt alta değil), bebek profili kutusu var ama genel düzen karışık |
| Tema düğmesi | ❌ Hâlâ navbar üst barında, hamburger'da YOK |
| Dil değiştirme | ❌ Hamburger içinde eğreti dropdown; Ayarlar'da ayrıca çip'li versiyon — iki farklı desen |
| /account/settings | ❌ Dil kartında yanlış açıklama metni + gereksiz kısayol tekrarı |
| Diğer 14 madde (dün geceki) | ✅ Onlar sağlam: iptal/yorum oturum bug'ı, scroll-lock, sepet sabit bar, beden kılavuzu, breadcrumb'lar, ghost ekranlar, alt nav göstergesi — bunlara dokunulmayacak |

---

## 3. ARAŞTIRMA — büyük siteler mobil menüyü nasıl yapıyor

- Baymard'ın 2025-26 mobil ticaret kıyaslaması: hamburger artık **ikincil** navigasyonun evi (birincil kategoriler alt tab bar + yatay kategori şeridinde — bizde ikisi de zaten var ✅). Hamburger içeriği ise **tam ekran/tam yükseklik, TEK SÜTUN, alt alta satırlar** olmalı; her satır = ikon + etiket + sağda ok; bölüm başlıklarıyla gruplanmış.
- Trendyol/Amazon/Shein deseni: üstte profil satırı → alt alta hesap satırları → ayrılmış "Tercihler/Ayarlar" bölümü (dil, ülke, tema) yine SATIR olarak → en altta çıkış/yardım.
- Dil seçimi büyük sitelerde menü içinde dropdown DEĞİL: ya satır içi çipler/segment ya da tıklayınca genişleyen satır.

Kaynaklar: [Baymard — 916 Mobile Navigation Menu Examples](https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/navigation-menu) · [Ecommerce Navigation in 2026](https://plumrocket.com/blog/ecommerce-navigation-examples) · [Hamburger Menu in UX 2026](https://euleinstitute.com/en/blog/hamburger-menu-ux-design/) · [Mobile Menu Design](https://www.webstacks.com/blog/mobile-navigation-menu-design)

---

## 4. PLAN (onayınızla uygulanacak — tahmini tek oturum)

### A. Hamburger'ı SİL, baştan yap: tam yükseklik + TEK SÜTUN alt alta menü
Yukarıdan aşağı, her şey satır:
1. **Profil satırı** — girişli: avatar + isim + "Profili Düzenle →" · misafir: belirgin "Giriş Yap / Üye Ol" satırı
2. **👶 Minik Bebeğiniz satırı** (girişli) — isim+yaş görünür, tıklayınca satır genişleyip ad+doğum tarihi düzenleme açılır (mevcut mantık korunur, sadece alt alta düzene oturtulur)
3. **Bölüm: Hesabım** — alt alta: 📦 Siparişlerim · ↩️ İadelerim · ⭐ Puanlarım · 📝 Yorumlarım · 📍 Adreslerim · 🔔 Bildirimler · 🔒 Güvenlik (ikon solda, etiket, sağda ›)
4. **Bölüm: Tercihler** —
   - 🌙 **Karanlık Mod** satırı: satır içi toggle (navbar'daki ay/güneş ikonu MOBİLDE kaldırılır — masaüstünde kalır)
   - 🌐 **Dil** satırı: satır içi EN / KA / RU / TR çipleri (dropdown YOK, tek dokunuş)
5. **Misafirde boşluk olmaması için:** misafir de 4. bölümü (tema+dil) + Yardım satırlarını (SSS · Beden Kılavuzu · İletişim) görür — panel asla boş görünmez
6. En altta: **Çıkış Yap** satırı (girişli)

### B. /account/settings sayfasını baştan yap
Kart kolajı yerine tek, uygulama-ayarları listesi:
- Karanlık Mod (toggle satırı) · Dil (çip satırı) · Bildirimler (›) · Güvenlik (›)
- Yanlış açıklama metni bug'ı düzeltilir; hesap menüsüyle çakışan gereksiz açıklamalar atılır.
- (Hamburger'la aynı satır bileşenleri paylaşılır — iki yer asla ayrışamaz.)

### C. Doğrulama standardı (bu sefer tavizsiz)
- 390×844'te HEM misafir HEM girişli senaryo ekran görüntüsü (girişli görünüm için gerçek giriş gerekiyorsa ekran görüntülerini size gösterip onay alacağım).
- Boş-durum kontrolü: her panel/sayfa "içerik yokken nasıl görünüyor" ayrıca bakılacak.
- tsc + 60 test + build her zamanki gibi.

### D. Derin site check-up (ayrı geçiş, plan onayından sonra)
Tüm sayfalar 390×844'te tek tek gezilecek: taşma, boş-durum, eğreti bileşen, çift desen (aynı iş için iki farklı UI) avı. Bulgular bu dosyaya eklenecek, düzeltmeler onayınızla.

---

**Onay bekliyor.** "Devam et" derseniz A+B+C'yi uygulayıp D taramasını yapacağım.

---

## ✅ A+B+C UYGULANDI (16 Tem 2026, gece — onay sonrası aynı oturumda)

- **A — Hamburger baştan yazıldı** (`MobileMenuSheet.tsx`): tam alt alta, tek sütun satırlar. Misafir: belirgin "Giriş Yap / Üye Ol" satırı → **Tercihler** (🌙 Karanlık Mod satır içi anahtar + 🌐 Dil satır içi EN/KA/RU/TR çipleri, dropdown YOK) → **Yardım** (SSS / Beden Kılavuzu / İletişim). Girişli: profil satırı → 👶 bebek satırı (tıklayınca satır içi düzenleme) → **Hesabım** bölümü 7 satır (Siparişler/İadeler/Puanlar/Yorumlar/Adresler/Bildirimler/Güvenlik) → Tercihler → Çıkış satırı. 2 sütunlu grid ve eğreti dil dropdown'ı tamamen gitti; panel artık misafir için de dolu.
- **Navbar tema ikonu MOBİLDE kaldırıldı** (masaüstünde duruyor) — karanlık mod artık hamburger'ın Tercihler satırında.
- **B — Ayarlar sayfası baştan yazıldı**: tek uygulama-ayarları listesi (Karanlık Mod / Dil / Bildirimler / Güvenlik satır satır). Yanlış açıklama metni bug'ı gitti. Karanlık Mod + Dil satırları hamburger'la AYNI paylaşılan bileşenler (`src/components/PreferenceRows.tsx`) — iki yüzey bir daha ayrışamaz.
- **C — Doğrulama**: tsc + 60 test + build temiz. 390×844'te canlı test: misafir panel ekran görüntüsüyle doğrulandı (dolu, alt alta, düzgün); Karanlık Mod anahtarı tıklandı → tüm site + panel anında karanlığa geçti; KA çipi tıklandı → tüm site anında Gürcüce'ye döndü, panel açık kaldı. Girişli görünüm aynı satır bileşenlerini kullanıyor (kod incelemesiyle doğrulandı) — **canlıda kendi hesabınızla bir bakmanız rica olunur** (ben gerçek hesapla giriş yapmıyorum).
- Yakalanan altyapı hatası: ilk doğrulamada ESKİ sunucu süreci 3000 portunu tuttuğu için eski build'i görüntülemişim — süreç öldürülüp yeni build ile tekrar doğrulandı (bir önceki turdaki "hâlâ eski görünüyor" riskine karşı ders: her görsel doğrulamadan önce sunucunun gerçekten yeni build'i sunduğunu kontrol et).

**D (derin site taraması) yarına bırakıldı — kullanıcı kararı.**

---

## 🔁 4. TUR (17 Tem 2026, sabah) — "POP UP DEĞİL, HAMBURGER"

Kullanıcı bottom-sheet sunumunu da reddetti: içerik doğruydu ama kabuk hâlâ bir POPUP'tı (alttan fırlıyor, arkası karartılmış). Yapılan:
- `MobileMenuSheet.tsx` SİLİNDİ → yeni `MobileMenu.tsx`: **tam ekran, sağdan kayarak açılan gerçek hamburger menü sayfası** (karartılmış arka plan yok, tutma çubuğu yok, yuvarlatılmış üst köşe yok). Üstte LOOV wordmark + ✕, altında kaydırılabilir menü gövdesi.
- Menüye **Mağaza bölümü eklendi** (Ürünler / Paketler / İndirimde / Blog) — gerçek hamburger menülerde ana navigasyon da olur; misafir görünümündeki boş alt yarı da böylece doldu.
- Satır içeriği (profil / 👶 bebek / Hesabım 7 satır / Tercihler / Yardım / Çıkış) aynen korundu; PreferenceRows paylaşımı bozulmadı.
- `globals.css`: `loov-sheet-up/down` → `loov-menu-in/out` (translateX'li yatay kayma).
- Doğrulama: tsc + 60 test + build temiz; 390×844'te taze production sunucusunda (port önceden boşaltıldı, log temiz) misafir menü AÇIK/KAPALI + karanlık mod anahtarı canlı test edildi, konsol 0 hata.
