# 🖼️ GÖRSEL PLANI — Emojilerden Kurtulma Operasyonu

> **Nasıl çalışıyor:** Aşağıdaki listedeki görselleri hazırlayıp kök dizindeki `gorseller/` klasörüne
> **birebir bu dosya adlarıyla** koy → Claude'a "gorseller klasörünü işle" de → gerisi onda
> (optimize eder, webp'ye çevirir, koda bağlar, kalan tüm UI emojilerini de SVG ikonlarla değiştirir).
> Hepsini tek seferde koymak zorunda değilsin — klasörde ne varsa o işlenir, kalanlar bekler.

---

## 🎨 TEMA (bu kurallara göre hazırla/ürettir) — ⚠️ v2.0 NORDIC (güncellendi 18 Tem 2026)

**"Temiz beyaz zemin üzerinde çam yeşili vurgu + yumuşak pastel"** — sitenin GÜNCEL Nordic kimliğiyle birebir. (Eski sage/krem tasarım tamamen kalktı — artık zemin BEYAZ.)

| Kural | Değer |
|---|---|
| Zemin | **Beyaz `#FFFFFF`** (kart zemini `#FCFCFB`, panel `#F4F4F1`) — görseller temiz beyazda "yüzmeli" |
| Vurgu rengi | **Çam yeşili `#2E5E4E`** (butonlarla aynı; koyu ton `#24493D`) |
| Yardımcı pastel paleti (görsel tint'leri) | `#C8DDD8` (adaçayı), `#C4D4E4` (bebek mavisi), `#D0E0CC` (fıstık), `#E4D8C4` (kum), `#D4CAE4` (lila), `#EED4BC` (şeftali) |
| Metin/koyu ton | Mürekkep siyahı `#141412` |
| Yıldız/altın (rozet) | `#F0B840` |
| **Fotoğraflarda** | Gün ışığı, yumuşak gölge, bol negatif alan, **beyaz/açık krem fon**; sert kontrast ve aşırı doygun renk YOK |
| **İllüstrasyonlarda** | Düz (flat) pastel çizim, ince mürekkep kontur olabilir, degrade/3D/gölge YOK — TEK stilden şaşma (hepsini aynı araçta/aynı istemle ürettir) |
| İnsan yüzü | Fotoğraflarda bebek yüzü net görünmesin (KVKK/etik + stok görsel sorunları) — el, ayak, ense, kumaş detayı tercih et |
| Karanlık mod | Site karanlık modu da destekliyor; görseller **şeffaf zeminli** ya da beyaz zeminli olursa iki modda da temiz durur (illüstrasyonları şeffaf PNG ver). |

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

> **Not:** Sistemde artık 17 kategori tanımlı (body, blanket, set, towel, romper, bag, bathrobe, pajama, dress, pants, outerwear, shoes, socks, hat, bib, toy, accessory) ve her birinin kendi SEO iniş sayfası var (`/category/...`). Şu an ürünü olan 6 kategori yukarıda. Yeni kategoriye ürün eklersen aynı isim düzeniyle görselini de koy: `kategori-pajama.png`, `kategori-dress.png` vb. Görsel yoksa emoji fallback devam eder (site kırılmaz).

### `gorseller/hero/` — Ana sayfa kahraman görseli (1-2 adet) — düşük öncelik oldu
> ℹ️ **Not:** Ana sayfa hero'sunda artık **ürün showcase slider'ı** var (admin'den seçtiğin ürünlerin gerçek fotolarını sola kayarak gösteriyor). Yani gerçek ürün fotolarını admin'den yükleyince hero zaten dolar — ayrı bir hero görseli **şart değil**. Yine de marka atmosferi için istersen:

| Dosya adı | İçerik | Boyut |
|---|---|---|
| `hero-ana.png` *(opsiyonel)* | Marka ruhunu taşıyan atmosfer görseli: beyaz fonda bebek kıyafetleri kompozisyonu / anne-bebek eli / sepet içinde ürünler | Yatay 4:3, min 1200×900 |
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

**Üretim tavsiyesi:** Midjourney / DALL·E (ChatGPT) / Ideogram ile hepsi üretilebilir. Tek oturumda, aynı stil istemiyle ürettir. Güncel Nordic paletiyle örnek istem:
> *"soft pastel flat illustration, pine green `#2E5E4E` accent on clean white background, baby clothing store, minimal, thin ink outline, no gradients, no 3D, generous negative space"*

Foto çekeceksen: gün ışığı + **beyaz/açık keten fon** yeter (koyu/renkli fon KULLANMA — sitenin beyaz zeminiyle uyumsuz olur).

---

## ⚖️ FONT TELİF CEVABI (güncellendi — v2.0 fontları)
- **Gövde fontu (Archivo):** Google Fonts / **SIL Open Font License** — ticari kullanım, gömme, her şey SERBEST. Sıfır risk. ✅
- **LOOV wordmark fontu (Cinzel Decorative):** yine Google Fonts / **OFL** — logo METİN olarak Cinzel Decorative ile yazılıyor, tamamen serbest. ✅
- **Lucide ikon seti (Claude'un kullanacağı):** ISC lisansı — ücretsiz, ticari serbest. ✅
- Yani şu an sitede kullanılan **hiçbir fontta telif riski yok.**

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

**Durum:** ⏳ görseller bekleniyor (plan 18 Tem 2026'da v2.0 Nordic temasına göre güncellendi)

---

## 📸 REFERANS / STOK GÖRSEL NEREDEN ALINIR

### A) Ücretsiz stok fotoğraf (ticari kullanım serbest, atıf gerekmez)
Aramada İngilizce yaz: **"baby clothes flat lay"**, **"folded baby clothes"**, **"newborn clothing white background"**, **"baby romper flat lay"**, **"hooded towel baby"**.
- **Unsplash** — unsplash.com — en kaliteli, bebek giyim flat-lay bol. (Unsplash Lisansı: ticari serbest.)
- **Pexels** — pexels.com — bol ve indirmesi kolay.
- **Pixabay** — pixabay.com — foto + illüstrasyon karışık.
- **Burst (Shopify)** — burst.shopify.com — e-ticaret ürün fotolarına özel, "baby" kategorisi var.
- ⚠️ Kural: indirdiğin fotoyu **beyaz/açık fona** sahip olanlardan seç (site zemini beyaz). Yüz görünen bebek fotolarından kaçın.

### B) Ücretsiz illüstrasyon / boş-durum çizimleri (tek stil serisi ŞART)
Boş sepet/404 gibi illüstrasyonlar için — hepsini AYNI setten al ki stil tutarlı olsun:
- **unDraw** — undraw.co — rengini tek tıkla `#2E5E4E` yapabiliyorsun, ticari serbest, atıfsız. ⭐ (boş-durumlar için birebir)
- **Storyset (Freepik)** — storyset.com — animasyonlu/renkli, rengi ayarlanır, atıf ile ücretsiz.
- **Open Doodles / Humaaans** — açık kaynak, serbest.

### C) AI ile ürettirme (en kolayı — tek stil garantisi)
Tek oturumda hepsini aynı istemle ürettirirsen stil %100 tutar:
- **ChatGPT (DALL·E)** — chat.openai.com — "şu paletle 6 kategori illüstrasyonu üret" diyip seri üretebilirsin.
- **Ideogram** — ideogram.ai — metin/ürün görsellerinde iyi, ücretsiz kotası var.
- **Midjourney** — (Discord, ücretli) — en yüksek kalite.
- **Bing/Copilot Image Creator** — ücretsiz DALL·E erişimi.
- İstem kalıbı: yukarıdaki "Üretim tavsiyesi" bölümündeki Nordic istemini kopyala.

### D) Gerçek ÜRÜN fotoğrafları (en değerlisi)
Kategori/hero için stok yerine **kendi ürünlerinin** fotosu en iyisi: telefonla, gün ışığında, **beyaz bir kartona/çarşafa** koyup tepeden çek → arkaplanı remove.bg (ücretsiz) ile temizle → admin panelden yükle. Kartlardaki emoji otomatik gider.

> **Özet tavsiye:** Boş-durum 7 illüstrasyonu → **unDraw** (rengi #2E5E4E yap). Kategori 6 + blog 8 → **Unsplash/Pexels** flat-lay VEYA tek oturumda **DALL·E** serisi. Gerçek ürün fotoların hazır oldukça → **admin panel**.
