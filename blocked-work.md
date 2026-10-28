# Kalan kabul ve ölçek kapıları

28 Ekim 2026: Bunlar mevcut çalışan işlevleri başarısız saymaz; ölçülmemiş veya tamamlanmamış işleri ayırır.

| İş | Gerçek durum |
| --- | --- |
| Güncel production otomatik yayın | Güncel kaynak staging'de gerçek scoped-token yayını ve yönetim akışıyla geçti. Production run ve commit/deployment eşleşmesi ayrıca doğrulanmalı. |
| Beş milyon içerik kapasitesi | 18 aktif içerik ve gerçek küçük katalog test edildi. 100 bin, 1 milyon ve 5 milyon yük testi; queue gecikmesi ve çok bölge performansı yapılmadı. |
| PostgreSQL/Hyperdrive | Yerel export/import, sürüm replay ve parity provası PASS. Production repository/yazma/AI kota adapteri, sağlayıcı ve gerçek Hyperdrive cutover tamamlanmadı. |
| Yedek/geri dönüş | Gerçek staging metadata ve üç medya nesnesi izole hedefe restore edildi. Tüm production restore, FTS rebuild, RTO/RPO ve düzenli otomatik DB snapshot planı doğrulanmadı. |
| Mobil dokunmatik ve fiziksel baskı | Tarayıcı pointer/klavye, responsive yerleşim ve PDF render kontrol edildi. In-app browser gerçek touch event ve blob PDF önizleme navigasyonunu desteklemedi; gerçek cihaz dokunması ve fiziksel baskı NOT RUN. |
| AI ücretsiz kota | İki production işi ve sahip izolasyonu PASS; ayrı Free hesabın sağlayıcı kotası sonuna kadar tüketilmedi. Provider belirsizliğinde otomatik ikinci inference yapılmaz. |
| Preview ve güvenlik | Staging/production kaynakları ve yayın anahtarları ayrıdır; iki tokenın birbirinin Worker'ına erişimi 403. Ayrı preview branch'inin canlı production'a yazmayı denediği tam entegrasyon testi yapılmadı. |
| Editoryal/lisans | Mevcut koleksiyon JotColoring için hazırlanmış AI destekli çizimlerdir; marka kredisi tescil veya her ülkede münhasır telif garantisi değildir. Her yeni kaynağın hakları ve görselleri yayın öncesi gözden geçirilmelidir. |
