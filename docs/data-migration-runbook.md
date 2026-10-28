# D1 → PostgreSQL geçiş provası

28 Ekim 2026. **Yerel PostgreSQL provası PASS; üretim geçişi NOT RUN.** PGlite 0.5.12 içindeki gerçek PostgreSQL 18.6 motorunda 18 içerik, 21 canonical tablo ve 50 arama sorgusu karşılaştırıldı. Kanıt: `evidence/postgres-rehearsal.json`. Bu motor yereldir; Hyperdrive bağlantısı, uzaktaki TLS, bağlantı havuzu, bölge gecikmesi ve yönetilen sağlayıcı yedeği test edilmedi.

## Taşınan veri

`postgres-schema.sql` SQLite dump'ı değildir; PostgreSQL tabloları, yabancı anahtarlar, normal indeksler ve `tsvector`/GIN arama projeksiyonu içerir. Canonical JSON ve zaman damgaları metin olarak korunur. Bütün integer hücreler NDJSON içinde ondalık string taşınır, hedefte BIGINT olur. Test 9.007.199.254.740.995 değerini yuvarlamadan taşır. R2 dosya byte'ları DB'ye gömülmez; object key, SHA256, byte, aktif sürüm ve ilişkiler korunur.

Kapsam: category, content, content_revision, content_category, content_tag, content_age, asset, asset_review, slug_redirect, import_job, import_item, outbox_event, processed_event, audit_event, category_count, creator_job, creator_upload, capacity_snapshot, request_limit, sitemap_entry, ai_free_reservation. Arama FTS türetilir; authoritative kayıt değildir. Hesap/otorum özel verileri içerebilen ham snapshot public Git'e girmez.

## Yerel tekrar çalıştırma

Kaynak, canonical D1'in yerel veya güvenli biçimde indirilmiş SQLite kopyası olmalıdır. Kaynak dosyaya SQL veri yazılmaz; WAL yan dosyaları için dosya açma yetkisi gerekebilir. Tek `query_only` okuma transaction'ı tüm tablo kesitini korur. Çıktı üzerine yazılmaz.

```sh
python3 scripts/ops/catalog-transfer.py PRIVATE/catalog.sqlite PRIVATE/catalog.ndjson
pnpm exec tsx scripts/ops/postgres-import.ts --snapshot PRIVATE/catalog.ndjson
pnpm exec tsx scripts/ops/postgres-import.ts --snapshot PRIVATE/catalog.ndjson --target .local/postgres-target --apply
pnpm exec tsx scripts/ops/postgres-rehearsal.ts PRIVATE/catalog.sqlite
```

İlk komut bütün canonical tablo adlarını kontrol eder; şema değişmişse sessiz alan kaybı yerine durur. Satırlar ve tablolar SHA256 ile doğrulanır. Import öncesinde dosyanın tamamı doğrulanır, sonra varsayılan 64 satırlık transaction'larla checkpoint tutulur. Aynı dosyanın tekrar gönderilmesi duplicate oluşturmaz. Farklı mevcut satırın üzerine sessiz yazılmaz. CLI yalnız yerel PGlite hedefini açar; uzak bağlantı URL'si veya secret almaz.

Prova gerçek kaynakta değişiklik yapmaz. Yeni sürüm, slug değişikliği, archive ve geç gelen eski publish olayları yalnız izole hedefte oluşturulan test olaylarıdır. Bütün tablolarda sayı ve tam satır checksum karşılaştırması; kimlik/slug/kategori/aktif asset sorguları; 50 arama sonucu; tekrar import; kesilip devam etme; duplicate/stale olaylar ve bağımsız snapshot restore çalıştırılmıştır.

## Üretim geçiş kapısı

1. Mevcut DB'nin %60 doluluğunda projeksiyonu yenile; %70'te sağlayıcı/erişim/harcama kararı ve üretime uygun prova hazır olsun. %80 büyük yeni import'u durdurur; katalog okumaları sürer. Bunlar proje eşikleridir.
2. Yönetilen PostgreSQL sağlayıcısı, bölge, TLS doğrulama, havuz, yedek/restore ve bütçe açıkça onaylanmalıdır. Bu çalışma üçüncü tarafa hesap veya abonelik açmamıştır.
3. Canonical D1 snapshot ve outbox watermark'ını al. Canlı export sırasında yazma dondurması veya eksiksiz değişiklik yakalama şarttır. Yerel SQLite tutarlı kesiti, uzaktaki farklı kaynakları kendiliğinden aynı ana sabitlemez.
4. PostgreSQL'e snapshot'ı taşı; R2 byte'larını aynı key/hash ile koru. Snapshot sonrası olayların authoritative content sürümü ve ilişkilerini getirerek `applyContentEvent` benzeri sürüm korumalı replay uygula. Yalnız event adını ve ID'sini göndermek veri taşıma değildir.
5. Yeni snapshot ile sayı, hash, ilişkiler, active asset ve query parity'yi tekrar doğrula. 50 sorgu geçmesi tüm olası sorguların kalitesini kanıtlamaz.
6. **Henüz uygulanmamış kapı:** production `CatalogRepository`/yazma/AI kota transaction'larının PostgreSQL implementasyonu ve Hyperdrive üzerinden gerçek get/list/search/write testi. Prova hedefi canlı yazma trigger'larını etkinleştirmez; bu kapı bitmeden runtime bağlantısını değiştirmeyin.
7. Son fark için kısa kontrollü yazma dondurması, canary doğrulaması ve tek yazma otoritesi kullan. Süresiz iki DB'ye yazmayı varsayılan yapmayın.

## Geri dönüş sınırı

Prova bağımsız bir PostgreSQL örneğini snapshot öncesi veri kesitine eksiksiz geri yükledi. Snapshot sonrasındaki test replay kayıtları bu geri dönüşe dahil değildir. PostgreSQL üretimde yeni yazı kabul etmişse yalnız eski D1 bağlantısını açmak veri kaybıdır. Önce yeni yazıları D1'e geri taşıyan doğrulanmış ters aktarım veya son güvenilir yedek+olay kaydı gerekir. **Ters canlı aktarım ve production cutover NOT RUN.**

Teknik kaynaklar: [PGlite başlangıç](https://pglite.dev/docs/), [transaction ve API](https://pglite.dev/docs/api), [PostgreSQL GIN arama indeksleri](https://www.postgresql.org/docs/current/textsearch-indexes.html), [Hyperdrive](https://developers.cloudflare.com/hyperdrive/get-started/).
