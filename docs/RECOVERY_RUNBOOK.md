# Kurtarma ve rollback

Tarih: 28 Ekim 2026. Yerel checksum/izole dosya restore testi ve gerçek staging D1→private R2→izole D1 zinciri doğrulandı. Üç temsilî R2 dosyası da private hedefe geri alındı. Production restore, tam uygulama cutover ve RTO/RPO **NOT RUN**. Kod rollback'i D1/R2/KV veya kuyruk durumunu geri almaz.

| Olay | İlk durdurma | Kurtarma kaynağı ve yetki | Doğrulama |
| --- | --- | --- | --- |
| Bozuk frontend release | Yeni release yayınını durdur | Aynı şemayla uyumlu önceki Worker version; deploy yetkisi | Ana sayfa, kategori, detay, indirme, stüdyo, 404 ve aktif commit |
| Hatalı migration | Yazma ve import işlerini durdur | Private metadata export veya olay planına bağlı D1 Time Travel; DB admin | content/revision/asset ilişkileri, aktif sürüm, yabancı anahtarlar ve sayımlar |
| Yanlış toplu yayın/kaldırma | İlgili job ve yeni outbox yayılımını durdur | Audit + önceki revision; içerik admin | Aynı content_id, expected_version ve slug; public durum ve arama |
| Eksik R2 nesnesi | İlgili indirmeyi hata durumuna al | Ayrı izinli BACKUPS veya immutable source+recipe; storage admin | SHA-256, byte, gerçek MIME ve ilgili dosya indirme |
| Arama indeksi kaybı | Aramayı açık hata durumuna al | Canonical katalogdan yeniden FTS projection; job yetkisi | IDs/versions/status kümeleri ve seçilmiş gerçek sorgular |
| Zehirli kuyruk mesajı | Sınırlı retry sonrası DLQ, tüm kuyruğu silme | Hata kaydı ve düzeltilmiş source; admin replay | Idempotency, eski revision reddi, duplicate yok ve oldest-age düşüşü |
| Sır sızıntısı | İlgili anahtarı iptal et; pahalı işleri kapat | Yeni dar kapsamlı secret; hesap yöneticisi | Eski secret reddi, yeni scope, log/git geçmişi incelemesi |

Kurtarma öncesi güncel durumu ayrı private snapshot'a alın. Olayın başlangıç zamanı, etkilenen IDs, code/schema/index revisions, kurtarma kaynağı ve yapılan işlemleri kaydedin. Yanlış toplu güncelleme için tüm D1'i eski tarihe döndürmek o tarihten sonraki doğru değişiklikleri de kaybedebilir; kayıt bazlı onarım tercih edilir.

Snapshot araçları `scripts/ops/backup.py` ile yeni dizine restore yapar; production'a otomatik yazmaz. Ardından izole D1/staging'e metadata import, R2 checksum doğrulama, FTS rebuild ve dikey zincir smoke testi gerekir. Tüm adımların başlangıç/bitişini kaydedin. `RTO = hizmet yeniden doğrulanana kadar geçen süre`, `RPO = son doğrulanmış kaynakla olay arasındaki veri aralığı`; burada hedefleri ölçülmüş sonuç gibi doldurmayın.

Expand/contract migration kullanın: yeni şema alanını ekle → eski/yeni uyumlu kodu yayınla → backfill → doğrula → sonraki kontrollü release'de eski alanı kaldır. Uyumsuz migration sonrası eski Worker'a tek tık rollback güvenli kabul edilmez. Başarılı eski Worker version bir veri yedeği değildir.

## Gerçek bootstrap dosyalarıyla yerel kurtarma kanıtı

28 Ekim2026: son markalı bootstrap'ın184 dosyası (108 türev,18 private raw kaynak, SQL/manifest/review/file envanteri) yeni snapshot'a alınıp ayrı klasöre geri yüklendi. İki boş SQLite veritabanına güncel migrations ve geri yüklenen SQL uygulandı.18 yayımlanmış content,108 aktif asset,18 search document; bütün key/hash/byte eşleşmeleri ve FTS fox sorgusu doğrulandı. Yerel işlem **1,785 saniye** sürdü. Kanıt `evidence/bootstrap-restore.json`.

```sh
python3 scripts/ops/restore-bootstrap.py PRIVATE/deployment-data .local/new-restore-rehearsal
```

Komut var olan hedefi kullanmaz, Cloudflare'a bağlanmaz ve gerçek kaynağı değiştirmez. Bu süre production RTO değildir. R2 API metadata/CORS/custom-domain kuralları, retention ve bulutta ayrı ortam restore henüz bu testin kapsamında değildir. Production RPO için ayrıca çalışan backup sıklığı ve son başarılı snapshot zamanı gerekir.

## Tek başına D1 katalog yedeği

Yedek almak için her seferinde geri yükleme veritabanı oluşturmak gerekmez. Aşağıdaki komut önce mevcut private BACKUPS alanının herkese kapalı olduğunu doğrular, canonical D1 export alır, özel AI iş/fotoğraf/kota satırlarını kalıcı snapshot'tan çıkarır ve SQL ile manifesti R2'ye yazıp hash ile tekrar okur. Yeni DB oluşturmaz, aktif Worker binding'ini değiştirmez. Kısa süreli okuma kesintisi olabileceği için uygun zaman seçin; gerçek düzenli zamanlama henüz kurulmuş değildir.

```sh
pnpm exec tsx scripts/ops/cloud-backup-restore.ts \
  --environment staging --backup-only \
  --snapshot-name jotcoloring-backup-staging-20261028-unique \
  --wrangler-auth-file "$JOTCOLORING_WRANGLER_AUTH_FILE" --apply
```

Canlı yedekte `--environment production` ve `jotcoloring-backup-production-...` adı kullanılmalıdır. Her çalışmada benzersiz ad seçin; mevcut yedek anahtarının üstüne yazılmaz. `--apply` çıkarılırsa yalnız plan gösterilir. Gerçek staging ve production tek başına backup denemeleri: `evidence/cloud-backup-only-staging.json` ve `evidence/cloud-backup-only-production.json` (her biri 11 istek, yeni DB yok). Araç 50 MB SQL / 100 bin satır güvenli prova sınırına sahiptir; 5 milyon içerik yedekleyicisi olarak sunulmaz. Tam kurtarma için aşağıdaki ayrı izole restore provası ve medya dosyalarının geri yükleme kontrolü gerekir.

## Gerçek D1 → private R2 → yeni izole D1 provası

`scripts/ops/cloud-backup-restore.ts` bu zinciri uygular. Gerçek staging provası 28 Ekim 2026'da tamamlandı; sonuç ve bulunan/düzeltilen sorunlar `evidence/cloud-restore-staging.json` içindedir. Varsayılan komut yalnız plan gösterir; kimlik bilgisi okumaz ve ağ isteği yapmaz:

```sh
pnpm exec tsx scripts/ops/cloud-backup-restore.ts --environment staging
```

Gerçek çalışma için önce kaynak ortam ve benzersiz deneme adı belirlenir. Kimlik bilgisi `CLOUDFLARE_API_TOKEN` üzerinden güvenli ortamda veya mevcut Wrangler oturum dosyası yolu üzerinden verilir; token komut argümanına yazılmaz. Aşağıdaki `--apply` komutu yeni backup nesneleri ve yeni izole veritabanı oluşturur. Mevcut staging/production verisine import yapmaz:

```sh
pnpm exec tsx scripts/ops/cloud-backup-restore.ts \
  --environment staging \
  --new-restore-name jotcoloring-restore-staging-20261028-first \
  --wrangler-auth-file "$JOTCOLORING_WRANGLER_AUTH_FILE" \
  --apply
```

Adı her yeni denemede değiştirin. Araç var olan R2 anahtarını kullanmaz; var olan D1 kimliğini serbest hedef olarak kabul eden seçenek içermez. Yeni oluşturduğu kimliği dört aktif D1 kimliğiyle karşılaştırır ve import öncesi hedefin boş olduğunu doğrular. Bir hata olursa hedef ve kanıt korunur; otomatik silme veya aktif binding değişikliği yapılmaz. `--resume-empty-target` yalnız aynı görevde oluşturulmuş ve özel başarısızlık kaydında bulunan hedefi yeniden deneyebilir; ad/kimlik/boşluk hem iş başında hem import öncesinde yeniden doğrulanır. Dolu hedefe tekrar import yapılmaz. Aktarım tamamlanmışsa yalnız `cloud-restore-verify.ts --run PRIVATE_RUN_DIRECTORY --wrangler-auth-file AUTH_FILE` ile salt okunur doğrulama yapılır.

D1 export kısa süre kaynak okumalarını durdurabilir; önce staging'de yürütün ve üretimde uygun işlem aralığı belirleyin. Export tamamlanana kadar API düzenli sorgulanır. Geçici imzalı URL bir saat geçerlidir; URL ve auth değerleri loga yazılmaz. SQL geçici bellekten yerel doğrulamaya verilir. Bu davranış [D1 export API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/) ve [D1 import API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/import/) sözleşmelerine dayanır. SQL dosyası D1 uyumu için transaction sarmalayıcıları olmadan, bütün tablo tanımları veriden önce, üst kayıtlar bağlı kayıtlardan önce ve tetikleyiciler bütün veriden sonra hazırlanır; [Cloudflare import/export rehberi](https://developers.cloudflare.com/d1/best-practices/import-export-data/) bu sınırlamaları açıklar. Gerçek prova yalnız FK ertelemesinin yeterli olmadığını gösterdi; veri sırası düzeltildi.

Kalıcı katalog yedeği özel AI istemlerini, yüklenen fotoğrafların sahiplik bilgilerini veya süreli iş sonuçlarını saklamaz. `creator_job`, `creator_upload`, `ai_free_reservation` tablo şemaları korunur, bu üç tablonun satırları kalıcı snapshot'tan çıkarılır; çıkarılan satır sayıları manifestte kaydedilir. Kaynak SQL'in orijinal hash'i ile filtrelenmiş SQL'in hash'i ayrıdır. Kaynak SQL diske yazılmaz. Geri yüklenmiş bir ortamda AI, sağlayıcı kotası ve güncel rezervasyon durumu uzlaştırılmadan açılmaz. Bu kasıtlı dışlama kullanıcı AI işlerini geri getirme garantisi vermez.

Araç BACKUPS için r2.dev ve custom domain erişiminin kapalı olduğunu doğrular. SQL ve manifest, ortam/DB/deneme/hash anahtarına yüklenip R2'den tekrar okunur; byte ve SHA-256 eşleşmeden hedef D1 oluşturulmaz. Import, R2'den okunan SQL'i kullanır. Ardından bütün kalıcı tablo satırlarının sıralı hash'i, sayımlar, kolonlar, indeks/tetikleyici envanteri, yabancı anahtarlar ve yayımlanmış aktif revision/asset ilişkileri karşılaştırılır. Tam sayılar metne çevrilerek JavaScript hassasiyet kaybı önlenir.

Özel kanıt `.local/cloud-backup/<deneme>/verification.json` içindedir. SQL ve tablo ayrıntıları public repo'ya konmaz. Paylaşılacak sonuç yalnız durum, ortam, yeni hedef kimliği, sayımlar/hash'ler, başlangıç/bitiş ve kapsamdan oluşmalıdır. Script 50 MB SQL ve toplam 100 bin satır üstünde durur; bu mevcut küçük katalog için güvenli prova aracıdır, 5 milyon içerik geçiş aracı değildir.

Yerel hazırlık doğrulandı: gerçek 18 içerik/108 asset SQL'i süzülüp ikinci boş SQLite'a `foreign_keys=ON` ile geri yüklendi; 21 tablo şeması korundu. Private AI satır dışlama ve yanlış hedef/erişim durumu guard testleri de geçti. Kanıt `evidence/cloud-backup-preflight.json`.

Gerçek staging sonucu: 21 canonical tablo + migration defteri, toplam 498 saklanan satır ve 46 şema nesnesi yeni izole D1'de doğrulandı. Bütün satır/tablo hash'leri, yabancı anahtarlar, aktif revision/asset ilişkileri ve AUTOINCREMENT sayaçları eşleşti. Outbox watermark 18. Üç private AI işinin, bir upload'ın ve üç rezervasyonun satırları kalıcı yedekten kasıtlı dışlandı. İlk FK hatasında hedef boş kaldığı doğrulandıktan sonra aynı izole hedef kullanıldı. Sonraki verifier farkı veride değildi: metne dönüştürülen sıra numarasının alias'ı alfabetik sıralanıyordu; özgün sayısal kolonla sıralama düzeltildi ve dolu hedefe tekrar yazmadan bütün tablo eşitliği geçti. Gzip JSON manifest için kontrol açılmış gerçek byte'lar üzerinden yapıldı. İlk başarısızlıklar silinmedi.

İzole hedef `jotcoloring-restore-staging-20261028-first` / `d4b6745a-86eb-4fce-bcc0-79609c7faae0`; Worker'a bağlanmadı. Son salt okunur doğrulama 51 istekte 9,34 saniye sürdü; bu süre olaydan hizmet dönüşüne kadar geçen RTO değildir.

## Temsilî R2 medya geri yükleme

`scripts/ops/cloud-media-restore.ts --run YYYYMMDD-unique` varsayılan plan üretir. Mevcut manifestteki woodland PDF, baskı WEBP ve özgün PNG için private BACKUPS kaynağını kullanır. `--apply --wrangler-auth-file AUTH_FILE` ancak incelenmiş planı çalıştırır; private staging ORIGINALS altında `restore-drill/<run>/...` dışında yazamaz. Her iki bucket'ın public domain erişimini kontrol eder, var olan hedef anahtarını reddeder, MIME/magic/byte/SHA-256 kaynak ve readback eşitliğini zorunlu tutar. DB, public medya ve bucket politikası değişmez.

28 Ekim 2026 gerçek denemesi PASS: PDF 743.353 byte, WEBP 519.480 byte, raw PNG 3.155.582 byte; toplam 4.418.415 byte üç private nesneye geri alındı. 16 istek ve 14,169 saniye ölçüldü. Hedef `jotcoloring-staging-originals/restore-drill/20261028-first/`; silinmedi. Bu üç örneğin kurtarılması tüm medya arşivinin, public CORS/TLS ayarlarının veya production RTO/RPO'nun doğrulandığı anlamına gelmez.

Bu zincir canonical metadata'yı geri yükler. R2 medya nesnelerinin ayrı immutable yedeğini temiz bir private hedefe geri alma, key/hash/byte eşleştirmesi, yeni FTS projection oluşturma ve uygulama üzerinden indirme/stüdyo kabulü ayrıca gerekir. Uygulama doğrulanmadan izole hedef production'a bağlanmaz. İşlem süresi yalnız deneme süresidir; production RTO/RPO olarak sunulmaz.
