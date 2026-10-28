# JotColoring tasarım ve logo yenilemesi

- Ana sayfa: asimetrik ve etkileşimli yarı renkli vitrin, solda özel SVG kategori simgeleri, mevcut 18 boyamanın tamamını gösteren galeri.
- Ortak arayüz: büyük J/C harfli üç boyutlu JotColoring logosu, yerel Manrope değişken fontu, yenilenen kategori, detay, AI, My artwork ve stüdyo yüzeyleri. Font üçüncü taraf font sunucusundan çağrılmaz.
- Kategori girişleri mevcut katalogdaki çizimlere dayanır. Public katalog çizimleri siyah-beyazdır. Görünen başlıklarda her kelimenin ilk harfi büyüktür; mixed-case isimler ve kısaltmalar korunur.
- Karşılaştırmalar: fare ve dokunmatik sürükleme, eğik vitrin kartlarında doğru koordinat dönüşümü ve klavye kontrolü. Yayın sırasında eski görsel sürümünü taşıyan açık sayfalar güncel görsele bir kez yeniden başvurur.
- Dosyalar: 18 değişmeyen içerik kimliği için 108 türev hazırlandı; 36 A4/Letter PDF'nin en büyüğü 782.982 bayt. Çizim alanı gri tonlu kalır, yeni RGB logo yalnız ayrılmış beyaz marka alanına yerleşir. Eski etikete yeni etiket yapıştırılmaz; türevler özgün kaynaklardan hazırlanır.
- Aynı marka üreticisi katalog, AI ve stüdyo çıktılarında paylaşılır. PDF doğrulaması yalnız onaylı logonun kesin piksel verisini ve footer yerleşimini kabul eder; renkli çizim veya logonun çizim alanına taşınması reddedilir.

Yerel doğrulama: 81 Node testi, 7 Python operasyon testi, Astro kontrolü ve production build. Özgün PDF/WEBP dosyalarının tamamı yeniden açılıp boyut, checksum, renk alanı ve marka maskesi bakımından doğrulandı. AI sağlayıcısında yeni inference bu tasarım turunda çalıştırılmadı.

İşletim: `scripts/data/rebrand-catalog.ts` önceki hak kaydını ve özgün kaynak checksum'unu koruyarak yeni bir klasörde türev üretir. `scripts/data/verify-media.ts` tüm dosyaları doğrular. `scripts/ops/apply-logo-refresh.ts` varsayılan olarak yalnız plan gösterir; mevcut kaynaklarla yeni sürüm yayınlar, eski sürümleri silmez ve her R2 dosyasını checksum ile geri okur. Plan/uygulama yalnız JotColoring staging veya production kaynaklarına izin verir.

Production katalog yenilemesi öncesinde mevcut katalog, özel BACKUPS R2 alanına yazılıp geri okunarak doğrulandı. Son yayın ve gerçek HTTP kabul sonucu ayrıca release kanıtında kaydedilir.
