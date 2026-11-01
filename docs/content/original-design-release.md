# Özgün 100 çizim yayını

`jotcoloring-originals-100-20261101`, sahibin bu sohbette ayrıca istediği 100 yeni
çizim içindir. Önceki 24/2400 paket yayını ve ayrı üç konu/300 çizim için kurulmuş
kapıları değiştirmez. Kaynak türü `ai_generated` olarak kaydedilir; sahibin üretim
ve yayın izni, münhasır telif hakkı tespiti anlamına gelmez.

Özel mühürlü envanter tam 100 benzersiz kimlik ve URL, yerel özgün dosyalar,
üretim kaydı, hazırlanan manifest, 12 türevin gerçek hash'leri, iki editoryal
inceleme ve son görsel onayı içerir. Envanter, imzalar, özgün PNG'ler ve sırlar
public Git deposuna girmez. Yeni kaynak veya metadata, önceki onayı geçersiz kılar.

`scripts/ops/publish-original-designs.ts`, bulut oturumundan önce tamamını yerelde
doğrular. Ortam zorunludur; tek çalışma 1–5 tasarım ve en fazla üç eşzamanlı
işlemle sınırlıdır. `--apply` olmadan yalnız plan çıkarır. Uygulamada normal
medya inceleme, import, özel yedek, yayın ve arama projeksiyonunu kullanır.
Özgün çizim, renkli kaynak, varsa çift görsel ve üretim kaydı özel R2 alanında
korunur; yayımlanan türevler tekrar okunarak byte ve SHA-256 doğrulanır.

Örnek kullanım, özel envanter yolu ayrıca verilerek:

```sh
node --import tsx scripts/ops/publish-original-designs.ts \
  --environment staging --release /absolute/private/original-release-sealed.json \
  --start 0 --limit 5 --parallel 2 --apply
```

Kimlik/slug çakışması veya mühürlenmiş revision'dan farklı mevcut kayıt yayını
durdurur. Yalnız aynı manifest'in idempotent tekrarı kabul edilir. Var olan işlerin
ve arama projeksiyonunun kuyruğu korunur; yeni kuyruk, bucket, plan veya ücretli
AI çağrısı oluşturulmaz.

PDF üst sınırı 1.000.000 byte olarak kalır. Renkli kart kodlayıcısı gerçek renkli
kayıpsız, 256 renkli kayıpsız ve gerekirse yalnız çizim alanında küçük renk
nicelemesi seçeneklerini dener. Boyut, piksel hatası ve marka bandı kontrollerini
geçen en küçük gerçek dosyayı seçer; limitleri geçemiyorsa hata verir.

R2 kontrolü public doğrulama değildir. Yayından sonra her sayfanın başlığı,
açıklaması, alt metni, kategori/arama keşfi ve bütün gerçek PDF/Image türevleri
ayrıca HTTP üzerinden kontrol edilmelidir. Mobil ve masaüstünde Chrome/WebKit ile
Color Ideas, karşılaştırma sürgüsü, aynı sayfada indirme penceresi ve gerçek
indirme işlemi doğrulanmadan tarayıcı testi tamamlandı denmez.
