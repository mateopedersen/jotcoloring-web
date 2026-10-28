# JotColoring işletim kılavuzu

Güncelleme: 28 Ekim 2026. **Son kullanıcı açıklaması: mevcut ücretli Workers ve R2 kullanılacak; yalnız domain zone Free kalacak, Pro alınmayacak.** Paylaşılan abonelikler değiştirilmez. Ücretli AI bütçesi0 kalır; ayrı ücretsiz AI hesabındaki gateway ve yerel neuron rezervasyonu, gerçek sağlayıcı/limit testleri tamamlanmadan başarılı akış sayılmaz. Bu belge kurulu kaynakların kanıtı değildir. Gerçek URL, kaynak ve kabul durumu `PROJECT_STATE.md`, `RESOURCE_INVENTORY.md` ve `acceptance.json` içindedir. Ürün arayüzü İngilizce; işletim açıklamaları Türkçedir.

## İçerik hazırlama

Özgün çizim dosyasını kullanın; tasarım ekranından küçük görsel kırpmayın. Başlık, açıklama ve alternatif metni gerçekten görünen konuya göre yazın. `content_id` sabittir; dosya değiştiğinde yeni revision ve yeni checksum gerekir. Çizim alanı siyah-beyazdır. Son kullanıcı yönlendirmesiyle PDF/WEBP sağ alt ayrı beyaz footer alanında turuncu JotColoring™ taşır; bu kontrollü marka alanı çizimin renk doğrulamasından ayrı incelenir. Renkli ana sayfa önizlemeleri ayrı `home_half_color` rolündedir. Kullanıcının AI işi veya stüdyo projesi otomatik katalog yayını değildir.

Yerel hazırlama aracı `scripts/data/prepare-media.ts`, ayrı küçük WEBP, detay WEBP, kayıpsız baskı WEBP ve A4/Letter PDF üretir. Bütün PDF dosyaları **1.000.000 byte veya daha küçük** olmalıdır. İki sayfalı kişisel PDF de aynı toplam sınıra tabidir. Dosya boyutu kalite kontrolünden bağımsız değildir: önizlemeleri gerçek ekranda, baskı PDF'sini çizgiler ve kırpılma bakımından kontrol edin. WEBP için tam çözünürlükte kayıpsız dosya; kartlarda ölçüsüne uygun küçük türev kullanılır. Büyük dosyaya yalnız uzantı değiştirerek WEBP/PDF adı verilmez.

```sh
pnpm exec tsx scripts/data/prepare-media.ts \
  --input /absolute/path/line-art.png \
  --id jc-woodland-friends --slug woodland-friends \
  --title 'Woodland friends' \
  --description 'A fox and a rabbit among woodland flowers.' \
  --alt 'A fox and rabbit surrounded by flowers and leaves.' \
  --categories animals,woodland --tags fox,rabbit \
  --ages teens,adults --difficulty detailed \
  --output /absolute/path/private-prepared/woodland-friends
```

Komut çıktı klasöründe `manifest.json`, `reviews.json`, `files.json` ve türevler oluşturur. Bu klasör private kalır. İncelenen kaynak dosyanın hash'i değişirse önceki görsel inceleme geçersizdir. Kaynak, hak durumu ve açıklamaları doldurmadan üretim yayını yapmayın. `example_only` veya `test_only` kayıt üretimde yayınlanamaz.

## Yönetimden aktarım ve yayın

1. Yapılandırılmış `/admin/` adresine Cloudflare Access ile girin. Kabul edilen kimlik hesapta tanımlı olmalıdır; sadece e-posta header'ı yetki değildir.
2. Dosyaları private incoming alanına yükleyin. Yayınlanmamış dosyaların public bucket'a gitmediğini doğrulayın.
3. `/api/admin/imports/validate` ile manifest ön kontrolünü çalıştırın. Bu kontrol yayın yapmaz. Hash, gerçek MIME, dosya boyutu, boyutlar, required roles, kategori ve hak bilgisi hatalarını düzeltin.
4. `POST /api/admin/imports` ile aynı idempotency anahtarıyla işi gönderin. `update` için okuduğunuz `expected_version` zorunludur. 409 alınırsa başka değişikliği okuyup birleştirin; sürümü körlemesine artırmayın.
5. İşin gerçek durumunu ve hata kodunu izleyin. Başarılı yayın sonrası kategori, arama, detay, PDF ve WEBP'yi açın; doğru içerik kimliği ve revision olduklarını kontrol edin.
6. Bir hata yüzünden işlemi tekrar gönderirken aynı payload aynı idempotency anahtarını kullanır. Değişen dosya/yeni revision yeni manifest ve yeni anahtar gerektirir.

Arayüzde uygulanmamış yönetim işlemleri tamamlanmış kabul edilmez. Toplu CLI ve canlı yönetim adımları teslim kanıtıyla eşleştirilmelidir. `scripts/data/import-catalog.ts` mevcut API sözleşmesinin CLI istemcisidir; kullanım seçeneklerini dosyanın yardımından alın. Kimlik doğrulama değerlerini komut argümanına veya sohbete yazmayın.

## Yayından kaldırma

Metadata durumunu değiştirmek yeni kategori/detail erişimini kapatır; uzun süre önbelleğe alınmış immutable medya URL'sini tek başına geri almaz. Normal arşivlemede eski dosyalar retention kapsamında kalır. Acil kaldırmada ilgili yayın kimliklerini durdurun, ilgili medya nesneleri/erişim kuralı ve CDN purge adımını ayrıca uygulayın. Tüm bucket'ı veya başka sitelerin dosyalarını topluca silmeyin.

## Yayın ve değişiklikler

İncelenen yeni yayın kararı GitHub Actions'ın tek otomatik yayın yolu olmasıdır. Workers Builds'in mevcut user-token sınırı, tek Worker kapsamı için gereken account-owned token modeliyle uyuşmuyor. Gerekçe, iki somut token kapsamı ve etkinleştirme adımları `CI_DEPLOYMENT_DECISION.md` içindedir. Bu yerel taslak henüz otomatik yayın kurulduğu anlamına gelmez; Workers Builds yayın tetikleyicilerinin kapatılması, dar tokenların onaylı saklanması ve ilk gerçek staging/production run ayrıca doğrulanır.

Mevcut `Verify / verify` kontrol kapısı korunur. Typecheck, bütün testler, Python operasyon kontrolü, tracked sır taraması, ortam build'i ve jobs dry-run aynı workflow'dadır. Yayın job'ı yalnız main/staging push, başarılı verify, doğru upstream repo ve `JOTCOLORING_DEPLOY_ENABLED=true` ile çalışır. Aynı commit artifact'i hash'lenir; token yalnız son yayın adımında vardır. Önce jobs, sonra web açık hedef isimleriyle yayımlanır. Workflow'a production migration veya içerik aktarımı eklenmez.

Preview için ayrı D1/R2/Queue isimleri kullanılır. Preview Queue tüketemez; staging Worker tüketir. Preview cron ayrı çalışmaz. Staging kuyruğu üzerinden test yapmak üretim kuyruğuna mesaj gönderme yetkisi değildir. Preview/AI varsayılanları üretim bütçesini devralmaz. Güvenilmeyen fork PR koduna production secrets verilmez.

## Yedek ve doğrulanmış geri yükleme

Yedek kapsamı canonical D1 normal tabloları, immutable R2 kaynak/türevleri ve hash/byte manifestidir. Arama FTS yeniden kurulabilir. D1 export içine FTS sanal tablolarını karıştırmayın. Kullanıcı fotoğrafları retention süresinden uzun yedeklenmez; tarayıcıdaki yerel stüdyo projeleri sunucu yedeğinde değildir.

`scripts/ops/backup.py` bir **mevcut yerel export klasörünü** hash'ler, yeni snapshot klasörüne kopyalar ve izole yeni klasöre geri yükler. Bulut erişimi veya R2 replikasyonu yapmaz. Buluttan alınan export ve R2 nesne envanteri önce private staging alanında hazırlanmalı, sonra ayrı izinli BACKUPS bucket'ına taşınmalıdır. Bulut export/restore provasının durumu ayrıca raporlanır. Son gerçek bootstrap'ın184 dosyasını ve iki SQLite DB'yi yeni yerel hedefe geri yükleme provası PASS; `evidence/bootstrap-restore.json`. Bu, Cloudflare uzak restore veya CORS/metadata restore kanıtı değildir.

Canonical yedekte `sitemap_entry`, `request_limit` ve `ai_free_reservation` dahil21 tablo vardır. Kullanıcıya özel AI giriş/sonuçları kalıcı katalog yedeğine eklenmez. Backend yayın öncesi private BACKUPS koruması ve bootstrap bundle hazırlığı uygulanırken, başarılı R2 restore provası ayrıca kanıtlanmalıdır.

Gerçek uzak D1 export, private BACKUPS'a checksum doğrulanmış aktarım ve yeni izole D1'e restore aracı `scripts/ops/cloud-backup-restore.ts` içinde hazırdır. Varsayılan yalnız plan üretir; `--apply` yeni nesneler ve yeni restore DB oluşturur. Gerçek staging zinciri PASS; `evidence/cloud-restore-staging.json` ilk bulunan/düzeltilen sorunları da korur. Production cutover/RTO/RPO bu sonuçtan çıkarılmaz. Ayrıntılı komut ve güvenli uygulama sırası `RECOVERY_RUNBOOK.md` içindedir. Kalıcı uzak snapshot özel `creator_job`, `creator_upload`, `ai_free_reservation` satırlarını dışlar, tablo şemalarını korur; bu nedenle AI açılmadan güncel kota durumu ayrıca uzlaştırılmalıdır. Yerel aktarım provası bütün canonical tabloları test edebilir; bu kalıcı private-data retention yetkisi değildir.

```sh
python3 scripts/ops/backup.py create /private/export /private/snapshot \
  --environment staging --commit ACTUAL_COMMIT --schema-version 0001
python3 scripts/ops/backup.py verify /private/snapshot
python3 scripts/ops/backup.py restore /private/snapshot /private/new-isolated-restore
```

Araç var olan hedefin üstüne yazmaz, symlink/traversal, eksik/fazla dosya ve checksum uyuşmazlığını reddeder. Bu doğrulama byte kurtarmasını kanıtlar; uygulama ilişkileri ve arama yeniden kurulumu ayrıca test edilmelidir. Production D1 Time Travel yerinde veri değiştirir. İzole prova yerine production restore çalıştırmayın.

## Maliyet ve kapasite

`python3 scripts/ops/cost_model.py` 10 bin, 100 bin, 1 milyon ve 5 milyon kayıt için açık varsayım senaryoları üretir. Varsayılan 2 MB tüm aktif dosyalar toplamıdır; ölçülmüş veri değildir. Dahil kotanın hesapta kalan kısmı bilinmediği için varsayılan kalan kota sıfırdır. Ücret sütunları **büyüme maliyeti projeksiyonudur**; ölçülmüş fatura veya yeni satın alma değildir. 10 GB R2 Standard ücretsiz depolama hesabın diğer kullanımlarıyla paylaşılır. 5 milyon dosya mevcut hesapta ölçülmeden kapasite garantisi verilemez. Aylık tablo vergi, D1, Queues, AI, dönüşüm, log, build ve dış DB giderlerini kapsayan kesin toplam değildir.

`python3 scripts/ops/capacity.py /private/catalog.sqlite --table content` gerçek yerel SQLite page/index alanını ölçer. Aynı işlem search DB için kendi kayıt tablosuyla yapılmalıdır. %30 büyüme payıyla %60 plan, %70 geçiş hazır, %80 büyük import durdur eşiği kullanılır. Bu ölçüm D1 ağ gecikmesi/RPS veya 5 milyon yük testi değildir. 5 milyon kayıt için geçiş PostgreSQL+Hyperdrive ve ayrı bütçe/yetki gerektirirse sessiz satın alma yapılmaz. Gerçek yerel PostgreSQL schema/import/parity/replay provası PASS; production adaptörü/Hyperdrive cutover NOT RUN. Ayrıntı `data-migration-runbook.md`.

AI ücretli çağrı bütçesi **0**. Ayrı ücretsiz hesap için9.000 günlük neuron ve iş başına1.000 üst sınırı bir yerel rezervasyon politikasıdır; bu hesapta başka işlerin kullanımını ölçmez. Provider ücretsiz kotası üstünde ücretli çağrıya düşme kabul edilmez. Gerçek inference ve kota tükenmesi testi ayrıca gereklidir. Gerçek provider kapasitesi ve onaylı sayısal bütçe belirlenmeden açılmaz. Uyarı e-postası veya dashboard alarmı bütçe durdurma mekanizması değildir. Atomik rezervasyon yeni pahalı işi durdurur; katalog okumalarını kapatmaz. Belirsiz provider timeout'unda yeniden ücret doğurabilecek çağrıyı otomatik çoğaltmayın.

## Public dosya kontrolü

Ham PNG, veritabanı, özel fotoğraf, auth profili ve secret dosyaları public repo'ya konmaz. `python3 scripts/ops/secret_scan.py --working-tree` Git oluşmadan aday kaynakları kontrol eder; `python3 scripts/ops/secret_scan.py` Git indexindeki gerçek tracked dosyaları kontrol eder. Son push öncesi ikincisi çalıştırılmalı. Çıktı yalnız dosya/rule adı verir, bulunan secret değerini basmaz. Pattern taraması kapsamlı güvenlik denetimi değildir. Public iletişim **jotcoloring@gmail.com**.
