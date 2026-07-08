# buglar.md — canlı test listesi (8 Tem 2026 oturumunda işlendi)

> Tüm maddeler bu oturumda ele alındı. ✅ = yapıldı · 💬 = cevap/karar · ⏳ = bilinçli ertelendi.
> ⚠️ SENİN YAPMAN GEREKEN TEK ŞEY: Supabase → SQL Editor → `supabase/addresses.sql`'i çalıştır (adres defteri için).

## HOME

1. ✅💬 **Sezon algoritması + etiketler**: Ana sayfa "New & Featured" artık sezona göre sıralanıyor (`sortBySeason` — yaz ürünleri yazın öne çıkar) + son gezdiğin kategoriler öne alınıyor (kişiselleştirme). **Etiket/çeviri konusu:** istediğin sistem ZATEN var — admin'de ürüne kanonik İngilizce değer girersin ("White", "0-3 Months", "cotton"...), vitrin kullanıcının diline göre otomatik çevirir (`src/lib/i18n/labels.ts`). Yeni bir renk girersen (örn. "Coral") çevirisi eklenene dek İngilizce görünür ama hiçbir şey kırılmaz. Ayrı bir "tags" kolonu gerekmedi.
2. ✅ Featured artık 8'le sabit değil — tüm katalog geliyor, 8'er 8'er "Load More". Pill'lerdeki ürün sayıları kaldırıldı, pill'ler kompaktlaştı, tüm kategoriler görünüyor.
3. ✅ "View All 22 Products" → "Explore All Products" (4 dilde).
4. ✅ "🌿 %100 Organic..." şeridi ana sayfadan tamamen kaldırıldı.

## PRODUCTS

1. ✅ Kategori pill'lerinde sayı yok artık (hem ana sayfa hem /products).
2. ✅ "Terry" tek başınaydı çünkü seed ürünlerin fabric kolonu boştu — sadece admin'den eklenen bornoz "terry" almıştı. Tüm ürünlere kumaş atandı (cotton/muslin/bamboo/terry/other), filtre artık dolu.
3. ✅ /products'ta Load More artık 16 üründe (4 satır) geliyor, 16'şar artıyor. Ana sayfada 8 (bilinçli — vitrin).

## PDP (ürün detay)

1. ✅ Share artık belirgin yuvarlak bir buton; mobilde native paylaşım menüsü (WhatsApp/Instagram'a direkt), masaüstünde link kopyalama.
2. ✅ "That's all we have..." → "🔥 Last 1 in stock — once it's gone, it's gone!" tarzı FOMO metni, turuncu vurgulu kutu (4 dilde). "Only N left" da "Selling fast — only N left!" oldu.
3. ✅ Sepet çekmecesindeki Total büyütüldü (text-xl → text-2xl).
4. ✅ Wishlist: stoku azalan (≤5) ürünlerde "🔥 Selling fast" rozeti + üstte "N ürün tükenmek üzere" uyarısı + navbar kalp ikonunda yanıp sönen bildirim noktası (fiyat düşüşünde de yanıyor). "Add all to cart" butonu eklendi.
5. ✅ Yorum kutusunun altında canlı sayaç: "Minimum 10 characters — N more to go" + karakter sayacı. Artık bug sanılmaz.
6. ✅ Sebep bulundu: uygunluk sorgusu ağda takılınca sessizce "önce satın almalısın"a düşüyordu. Artık yüklenirken skeleton, hata olursa "Try again" butonu gösteriliyor — yanlış mesaj asla çıkmıyor.
7. ✅ Aynen tahmin ettiğin gibi: admin'den yorumu "hidden" yapınca oluyordu. Artık o durumda form yerine net bir bilgi kutusu çıkıyor: "Yorumun ekibimiz tarafından gizlendi" + Yorumlarım'a link. 409 sürprizi bitti.

## BUNDLES

1. ✅ "Up to 37₾ saving" → dinamik "Up to N% off" (aktif setlerin en yüksek indirim yüzdesi otomatik hesaplanıyor).

## ABOUT

1. ✅ Sahte ekip (Nino Beridze/Giorgi Kobaia/Tamar Lomia) kaldırıldı. Hikâyedeki uydurma "kurucumuz Nino 2021'de..." cümlesi de genelleştirildi. 📋 Gerçek ekip bilgisi gelince geri ekleriz (CLAUDE.md'ye not düşüldü).
2. ✅ Stats bölümü (Year Founded 2021, 500+ families, 4.9★) kaldırıldı — CLAUDE.md'de "gerçek veriler gelince" notu var.

## CONTACT

1. ✅ "Send a Message" GERÇEK artık: `/api/contact` → Resend ile mailine düşüyor (reply_to müşterinin adresi — direkt cevaplayabilirsin). Bot koruması (honeypot) + dakikada 3 mesaj limiti var. Canlı test edildi, mail gitti.
2. ✅ WhatsApp altyapısı hazır: Admin → Settings → "WhatsApp number" alanına business numaranı girince (örn. 995599123456) yüzen buton + contact + FAQ + footer telefonu hepsi otomatik açılır. Numara girilene dek HİÇBİRİ görünmüyor (placeholder tamamen silindi).

## GENEL

1. ✅💬 **GOTS/OEKO-TEX**: Haklıydın — bu sertifikalar üreticiye verilir ve iddiayı belgeleyemezsek riskli (haksız ticari uygulama sayılabilir). Tüm kesin iddialar dürüst ifadelere çevrildi: "güvenilir/sertifikalı tedarikçilerden organik pamuk", "test edilmiş, bebek dostu kumaşlar". Admin'deki ürün-başına "certification" alanı duruyor — ileride tedarikçiden gerçek belge alırsan ürün bazında yazarsın, o zaman vitrine döner. Blog'daki eğitici GOTS anlatımları kaldı (iddia değil, bilgi).
2. 💬⏳ **Dil URL'leri (/en /tr)**: Zahmetli — ~40 sayfanın [locale] klasörüne taşınması + tüm iç linkler + middleware demek. Faydası esas SEO (Google her dili ayrı indeksler). Kararımız: şimdilik çerez tabanlı kalıyor, path-routing'i ayrı bir oturumda tek başına, dikkatlice yaparız (launch öncesi yapılması mantıklı).

## ACCOUNT

1. ✅ Kontrol edildi: HAYIR, silinmiyordu — iade tamamlanınca puanlara hiç dokunulmuyordu. Düzeltildi: admin iadeyi "refunded" yapınca kazanılan puanlar iade oranında geri alınıyor VE harcanan puanlar geri veriliyor (kısmi iadede orantılı).
2. ✅ Delivery Timeline gerçek artık: sipariş tarihi (created_at) + gerçek durum sırası + teslim tarihi (delivered_at). Uydurma "+1/+2/+5 gün" tarihleri ve sahte "Payment Confirmed" adımı silindi. Track-order'daki aynı sahte timeline da düzeltildi.
4. ✅ Points History'de iade satırları artık görünüyor: "↩️ Return adjustment" etiketiyle (eksi = geri alınan, artı = iade edilen puan).
5. ✅ Tier'lar artık admin'den: Settings → "Membership tiers" kartı — Silver/Gold eşikleri VE kazanım çarpanları (×1.25/×1.5) ayarlanabilir. Rewards sayfası + checkout önizlemesi + sipariş puan yazımı hepsi ayarı kullanıyor. Perk metinleri ("+25% bonus points") çarpandan otomatik üretiliyor, 4 dilde çevriliyor. Rütbe atlama lifetime puanla çalışıyor (doğrulandı) ve iade düzeltmeleri rütbeyi ETKİLEMEZ (bilinçli — kimse rütbe kaybetmez).
6. ✅ Adres defteri GERÇEK oldu: adresler artık DB'de (`addresses` tablosu), checkout'ta kayıtlı adresler kart olarak listeleniyor (varsayılan otomatik seçili), "farklı adres kullan" + "bu adresi defterime kaydet" seçenekleri var. ⚠️ `supabase/addresses.sql`'i panelde çalıştırman gerekiyor — çalıştırana dek site kırılmaz, sadece kayıt yapılmaz (uyarı gösterir).
7. ✅💬 Kontrol edildi: tercihler DB'ye gerçekten kaydediliyordu ama hiçbir şeyi etkilemiyordu. Artık ilk gerçek etkisi var: "Promotions" kapalıysa %10 indirim popup'ı sana hiç gösterilmiyor. Order Updates zaten her zaman açık (işlemsel e-postalar). Diğer tercihler pazarlama e-postaları geldiğinde devreye girecek.
8. ✅ 2FA GERÇEK artık (Coming Soon bitti): Security → Enable 2FA → QR kodu authenticator uygulamasıyla (Google Authenticator vs.) tara → 6 haneli kodla aktive et. Girişte şifreden sonra kod soruluyor. Kapatmak da kod istiyor. 💡 Supabase panelde Auth → MFA/TOTP'un açık olduğunu bir kontrol et (varsayılan açıktır).
9. ✅💬 Kontrol edildi: gerçekten siliyor (Supabase auth user + profil; siparişler muhasebe için anonim kalıyor). AMA yolda sipariş varken de siliyordu — düzeltildi: pending/processing/shipped sipariş veya aktif iade varken silme reddediliyor, "N aktif siparişin var, teslim edilince silebilirsin" mesajı çıkıyor.
