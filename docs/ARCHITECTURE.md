# Kararlar ve kanıt sınırları

28 Ekim 2026; uygulama kurulumu sürüyor. Son kullanıcı açıklaması: **mevcut ücretli Workers ve R2 kullanılacak; yalnız jotcoloring.com zone Free kalacak, Pro alınmayacak.** Paylaşılan abonelikler değiştirilmez ve ikinci abonelik açılmaz. AI ücretli bütçesi0; ayrı ücretsiz hesap gateway yolu uygulanıyor ve gerçek inference kabulü ayrıca kaydediliyor. Onaylı turuncu on ekran, Astro/TypeScript, public GitHub ve 5 milyon uzun vadeli hedef korunur; kapasite gerçek testlerden ayrı raporlanır.

| Karar | Uygulama ve tekrar değerlendirme koşulu |
| --- | --- |
| SSR katalog | Ortak route şablonları; her kayıt için build dosyası yok. Studio/PDF kodu yalnız kişisel düzenleyici/export akışında. |
| Canonical metadata ve derived search | `CATALOG_DB` normal tablolar; `SEARCH_DB` FTS. `content_revision` ve immutable asset keys sürümleri korur. Search kaybı canonical kayıp değildir. |
| Tutarlılık | D1 conditional write/batch ve outbox; R2+D1 atomik işlem iddiası yok. Sürüm/idempotency ve uzlaştırma gerekli. |
| Kapsamlı medya ayrımı | Private ORIGINALS, private JOB_ASSETS, approved PUBLISHED, ayrı izinli BACKUPS. Public prefix güvenlik sınırı değildir. |
| Medya limitleri | Her PDF toplam <=1.000.000 byte. WEBP baskı kayıpsız; küçük responsive önizlemeler ayrı. Gerçek MIME ve bytes manifestten. Kullanıcı onayıyla turuncu marka yalnız ayrı sağ alt beyaz footer alanındadır; çizim alanı siyah-beyaz kalır. |
| Yayın otoritesi | Hedef Workers Builds; gerçek Git bağlantısı doğrulanmadan kuruldu sayılmaz; Actions sadece kontrol. Kurulumda manuel bootstrap varsa ayrıca kaydedilir ve çift otomatik deploy bırakılmaz. |
| AI | Gerçek provider ve private job akışı; eksik bütçe/model/binding kapalı hata. Örnek resim gerçek kullanıcı sonucu sayılmaz. |
| Büyüme | Mevcut Workers Paid hesapta D1 DB başına 10 GB teknik sınır. Gerçek table+index ölçümü; %60/%70/%80 proje eşikleri. PostgreSQL+Hyperdrive hedefi ayrı sağlayıcı maliyeti/erişimi gerektirir ve şu anda yetkilendirilmemiştir. |
| Kaynak tasarım | On ekran referans; bağımsız font/logo/baskı originals arşivde yok. Yeniden hazırlanan varlıklar envanterli; tam ekran PNG uygulama yerine kullanılmaz. |

Resmî kaynaklar bu kararların proje performansını garanti etmez. 5 milyon kayıt üretim benzeri test **NOT RUN**. Yerel SQLite kapasite tahmini bunun yerine geçmez. Browser görsel kabulü ekran bazında `acceptance.json` ile tutulur.

Güncel resmî teknik doğrulama:

- [Astro Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/): Cloudflare bindings `cloudflare:workers` üzerinden, workerd geliştirme, yeni entrypoint.
- [Worker Previews](https://developers.cloudflare.com/workers/previews/): Wrangler >=4.135.0; farklı ayar/binding'ler.
- [Preview izolasyonu](https://developers.cloudflare.com/workers/previews/resources/): D1/R2 ayrı kaynaklarla; Queue consumer ve cron için staging Worker.
- [Workers Builds branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/): main üretim, diğer dallar preview.
- [D1 limitleri](https://developers.cloudflare.com/d1/platform/limits/): Paid DB başına 10 GB, Paid Time Travel 30 gün; kapasite ölçümü zorunlu.
- [R2 fiyatı](https://developers.cloudflare.com/r2/pricing/): Standard $0,015/GB-ay, A $4,50/milyon, B $0,36/milyon, yukarı yuvarlanan fatura birimleri.
- [Workers fiyatı](https://developers.cloudflare.com/workers/platform/pricing/): $5 başlangıç, dahil kullanım ve ayrı CPU/istek aşımı.
- [Pro fiyatı](https://www.cloudflare.com/plans/): aylık $25, yıllık faturalamada aylık $20 eşdeğeri; kullanıcı adına yıllık taahhüt varsayılmaz.

Kesin kurulmuş sürümler lockfile ile korunur. İlk seçilen sürümler Astro 7.4.2, adapter 14.4.2, Wrangler 4.153.0; build sonucu uyumluluk kanıtıdır, sürüm adı tek başına değildir.

Yerel PostgreSQL18.6/PGlite0.5.12 prova sonucu:21 canonical tablo tam checksum/sayı parity, kesilip devam eden idempotent import,50 arama sorgusu, sürümlü publish/archive/redirect ve stale/duplicate olay kontrolü PASS. Üretim PostgreSQL/Hyperdrive adaptör ve cutover doğrulaması ayrı açık kapıdır. `data-migration-runbook.md` kapsamı ve geri dönüş sınırını açıklar.
