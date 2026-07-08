# 🖼️ GÖRSEL PLANI — Emojilerden Kurtulma Operasyonu

> **Nasıl çalışıyor:** Aşağıdaki listedeki görselleri hazırlayıp kök dizindeki `gorseller/` klasörüne
> **birebir bu dosya adlarıyla** koy → Claude'a "gorseller klasörünü işle" de → gerisi onda
> (optimize eder, webp'ye çevirir, koda bağlar, kalan tüm UI emojilerini de SVG ikonlarla değiştirir).
> Hepsini tek seferde koymak zorunda değilsin — klasörde ne varsa o işlenir, kalanlar bekler.

---

## 🎨 TEMA (bu kurallara göre hazırla/ürettir)

**"Sıcak krem üzerinde yumuşak pastel"** — sitenin mevcut kimliğiyle birebir:

| Kural | Değer |
|---|---|
| Zemin | Sıcak krem `#F5F0EB` veya beyaz — görseller bu zeminde "yüzmeli" |
| Vurgu rengi | Adaçayı yeşili `#5E9E8C` (butonlarla aynı) |
| Yardımcı pastel paleti | `#C8DDD8` (adaçayı), `#C4D4E4` (bebek mavisi), `#D0E0CC` (fıstık), `#E4D8C4` (kum), `#D4CAE4` (lila), `#EED4BC` (şeftali) |
| Metin/koyu ton | Antrasit `#2A2320` (logodaki renk) |
| **Fotoğraflarda** | Gün ışığı, yumuşak gölge, bol negatif alan, krem/bej fon; sert kontrast ve doygun renk YOK |
| **İllüstrasyonlarda** | Düz (flat) pastel çizim, ince antrasit kontur olabilir, degrade/3D/gölge YOK — TEK stilden şaşma (hepsini aynı araçta/aynı istemle ürettir) |
| İnsan yüzü | Fotoğraflarda bebek yüzü net görünmesin (KVKK/etik + stok görsel sorunları) — el, ayak, ense, kumaş detayı tercih et |

**Format kuralları:** PNG veya JPG ver, yüksek çözünürlük olsun (Claude sıkıştırıp webp yapar).
İllüstrasyonlar **şeffaf zeminli PNG**. Belirtilen pikseller minimum; oran önemli.

---

## 📁 KLASÖR YAPISI ve TAM LİSTE

### `gorseller/kategori/` — Kategori görselleri (6 adet) — **EN ÖNEMLİ**
Ana sayfa kategori kartları + kategori pill'lerinde kullanılacak. **Kare (1:1), min 800×800.**
Tercihen ürün flat-lay fotoğrafı (krem fonda tek parça giysi), olmazsa pastel illüstrasyon — ama 6'sı AYNI türden olsun.

| Dosya adı | İçerik | Yerine geçtiği emoji |
|---|---|---|
| `kategori-body.png` | Bodysuit/zıbın flat-lay | 👶 |
| `kategori-blanket.png` | Katlanmış battaniye | ☁️ |
| `kategori-set.png` | Hediye kutusu/set açılımı | 🎀 |
| `kategori-towel.png` | Kapüşonlu havlu | 🛁 |
| `kategori-romper.png` | Tulum flat-lay | 🐻 |
| `kategori-bag.png` | Mini sırt çantası | 🐰 |

> İleride yeni kategori eklersen (pijama/elbise/patik...) aynı isim düzeniyle ekle: `kategori-pajama.png` vb.

### `gorseller/hero/` — Ana sayfa kahraman görseli (1-2 adet)
| Dosya adı | İçerik | Boyut |
|---|---|---|
| `hero-ana.png` | Marka ruhunu taşıyan ANA görsel: krem fonda bebek kıyafetleri kompozisyonu / anne-bebek eli / sepet içinde ürünler | Yatay 4:3, min 1200×900 |
| `hero-mobil.png` *(opsiyonel)* | Aynı sahnenin kare kırpımı | 1:1, min 900×900 |

### `gorseller/bos-durum/` — Boş durum illüstrasyonları (7 adet)
Şeffaf PNG, kare, min 600×600. **Tek illüstrasyon stili** (aynı seri). Bunlar illüstrasyon olmak ZORUNDA (foto olmaz).

| Dosya adı | İçerik | Nerede |
|---|---|---|
| `bos-sepet.png` | Boş/şirin alışveriş sepeti | Sepet boşken |
| `bos-favori.png` | Kalp + askıda giysi | Wishlist boşken |
| `bos-siparis.png` | Açık koli/paket | Siparişlerim boşken |
| `bos-arama.png` | Büyüteç + kumaş | Arama sonuçsuz |
| `bos-adres.png` | Ev/konum işareti | Adres defteri boşken |
| `sayfa-404.png` | Kaybolmuş çorap/oyuncak teması | 404 sayfası |
| `sayfa-hata.png` | Devrilmiş süt şişesi / "ops" teması | Hata sayfası |

### `gorseller/blog/` — Blog kapakları (8 adet)
Yatay 16:9, min 1200×675. Foto veya illüstrasyon (yine tek tür).

| Dosya adı | Makale |
|---|---|
| `blog-newborn-skin-care-guide.png` | Yenidoğan cilt bakımı |
| `blog-organic-cotton-vs-bamboo.png` | Organik pamuk vs bambu |
| `blog-building-baby-wardrobe.png` | Bebek gardırobu kurma |
| `blog-hospital-bag-checklist.png` | Hastane çantası listesi |
| `blog-washing-baby-clothes.png` | Bebek kıyafeti yıkama |
| `blog-safe-sleep-guide.png` | Güvenli uyku |
| `blog-best-baby-shower-gifts.png` | Baby shower hediyeleri |
| `blog-dressing-baby-for-georgian-weather.png` | Gürcistan havasına göre giydirme |

### `gorseller/about/` — Hakkımızda görselleri (2 adet + ileride ekip)
| Dosya adı | İçerik | Boyut |
|---|---|---|
| `about-hikaye.png` | Atölye/kumaş/dikiş detayı — "hikayemiz" fotosu | 4:3, min 1000×750 |
| `about-degerler.png` *(opsiyonel)* | Kumaş dokusuna makro detay | 1:1, min 800×800 |
| ~~ekip fotoları~~ | Gerçek ekip bilgisi gelince: `about-ekip-1.png` düzeniyle | 1:1, min 600×600 |

### `gorseller/sosyal/` — Paylaşım görseli (1 adet)
| Dosya adı | İçerik | Boyut |
|---|---|---|
| `og-varsayilan.png` | Logo + ürün kompozisyonu — WhatsApp/Facebook'ta link paylaşınca çıkan kart | TAM 1200×630 |

> Şu an geçici olarak kare logo kullanılıyor; bu gelince değişir.

### Klasör GEREKTİRMEYENLER (otomatik/Claude halleder)
- ✅ **Ürün fotoğrafları** → admin panelden yüklüyorsun, kartlardaki emoji kendiliğinden gidiyor (senin de dediğin gibi)
- ✅ **Set (bundle) fotoğrafları** → aynı şekilde admin'den
- ✅ **UI ikonları** (~150 adet: güven rozetleri 🔒🔄, kargo 🚚⚡, puan ⭐, hesap menüsü 📦📍🔔, bildirimler, iletişim 📍📧📞, kumaş filtreleri, sezon, tier 🌱🌿🌳, güvenlik 🛡️, aciliyet 🔥, kutlama 🎉...) → **Claude bunları Lucide ikon setiyle (ISC lisans, ücretsiz ticari) marka renginde inline SVG yapacak** — senden dosya İSTENMEZ
- ✅ **Favicon / tarayıcı ikonu** → logodan Claude üretecek
- ✅ **Yıldız puanları, ok işaretleri** → zaten SVG

---

## 📋 ÖZET: SENİN HAZIRLAYACAKLARIN
| Grup | Adet | Öncelik |
|---|---|---|
| Kategori görselleri | 6 | 🔴 1 — vitrinin yüzü |
| Hero | 1 (+1 ops.) | 🔴 2 |
| Boş durum illüstrasyonları | 7 | 🟡 3 |
| Blog kapakları | 8 | 🟡 4 |
| About | 1-2 | 🟢 5 |
| OG/sosyal | 1 | 🟢 6 |
| **TOPLAM** | **~24-26 dosya** | |

**Üretim tavsiyesi:** Midjourney/DALL-E/Ideogram ile hepsi üretilebilir. Tek oturumda, aynı stil istemiyle ürettir
(örn. *"soft pastel flat illustration, sage green and cream palette #5E9E8C #F5F0EB, baby clothing store, minimal, no gradients"*).
Foto çekeceksen: gün ışığı + krem/keten fon yeter.

---

## ⚖️ FONT TELİF CEVABI
- **Sitedeki font (Nunito):** Google Fonts / **SIL Open Font License** — ticari kullanım, gömme, her şey SERBEST. Sıfır risk. ✅
- **Logodaki serif font:** Logo PNG/raster görsel olduğu için font dosyası "gömülmüyor" → sitede logo olarak kullanmak sorun DEĞİL. ✅
  Ancak o serif fontu site BAŞLIKLARINDA yazı fontu olarak kullanmak istersek fontun adını/lisansını öğrenmemiz gerekir
  (logoyu yaptırdığın araçtan bakılır). İstersen Google Fonts'tan benzer görünümlü OFL bir serif (örn. Playfair Display, Lora) seçeriz — o da sıfır risk.
- **Lucide ikon seti (Claude'un kullanacağı):** ISC lisansı — ücretsiz, ticari serbest. ✅

---

## 🤖 CLAUDE'UN YAPACAKLARI (görseller klasöre gelince — "gorseller klasörünü işle" de yeter)
1. Gelen dosyaları optimize et (webp, boyutlandırma, `public/img/` altına taşı)
2. Kategori kartları + pill'leri görsele bağla (ana sayfa + CategoryFilter)
3. Hero'ya görsel yerleştir (mevcut renk blob'ları yerine)
4. Boş durumları illüstrasyona bağla (sepet/wishlist/sipariş/arama/adres/404/hata)
5. Blog kartları + makale başlıklarına kapak görselleri
6. About hikaye görseli
7. OG image değişimi
8. **Kalan TÜM müşteri-yüzü emojileri Lucide SVG ikonlarıyla değiştir** (görsel gerektirmeyen ~150 emoji)
9. Favicon üret
10. Doğrulama: build + 4 dil + görsel regresyon (ekran görüntüleri)

**Durum:** ⏳ görseller bekleniyor (8 Tem 2026)
