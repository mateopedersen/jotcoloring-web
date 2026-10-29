# JotColoring işletim kılavuzu

Güncelleme: 30 Ekim 2026. **Son kullanıcı açıklaması: mevcut ücretli Workers ve R2 kullanılacak; yalnız domain zone Free kalacak, Pro alınmayacak.** Paylaşılan abonelikler değiştirilmez. Ücretli AI bütçesi0 kalır; ayrı ücretsiz AI hesabındaki gateway ve yerel neuron rezervasyonu kullanılır; iki gerçek production işi ve kota sınırları ayrı raporlanır. Bu belge kurulu kaynakların kanıtı değildir. Gerçek URL, kaynak ve kabul durumu `PROJECT_STATE.md`, `RESOURCE_INVENTORY.md` ve `acceptance.json` içindedir. Ürün arayüzü İngilizce; işletim açıklamaları Türkçedir.

## İçerik hazırlama

Özgün çizim dosyasını kullanın; tasarım ekranından küçük görsel kırpmayın. Başlık, açıklama ve alternatif metni gerçekten görünen konuya göre yazın. `content_id` sabittir; dosya değiştiğinde yeni revision ve yeni checksum gerekir. Çizim alanı siyah-beyazdır. Son kullanıcı yönlendirmesiyle PDF/WEBP sağ alt ayrı beyaz footer alanında turuncu JotColoring™ taşır; bu kontrollü marka alanı çizimin renk doğrulamasından ayrı incelenir. Renkli ana sayfa önizlemeleri ayrı `home_half_color` rolündedir. Kullanıcının AI işi veya stüdyo projesi otomatik katalog yayını değildir.

Yerel hazırlama aracı `scripts/data/prepare-media.ts`, ayrı küçük WEBP, detay WEBP, tam çözünürlüklü kalite kontrollü baskı WEBP ve A4 PDF üretir (yeni dosyalarda Letter seçeneği yoktur). Bütün PDF dosyaları **1.000.000 byte veya daha küçük** olmalıdır. İki sayfalı kişisel PDF de aynı toplam sınıra tabidir. Dosya boyutu kalite kontrolünden bağımsız değildir: önizlemeleri gerçek ekranda, baskı PDF'sini çizgiler ve kırpılma bakımından kontrol edin. Baskı WEBP tam çözünürlüğünü korur; kabul edilebilir piksel farkıyla daha küçük sürüm seçilir veya kayıpsız sürüme dönülür. Kartlarda ölçüsüne uygun küçük türev kullanılır. Büyük dosyaya yalnız uzantı değiştirerek WEBP/PDF adı verilmez.

```sh
pnpm exec tsx scripts/data/prepare-media.ts \
  --input /absolute/path/line-art.png \
  --id jc-woodland-friends --slug woodland-friends \
  --title 'Woodland Friends' \
  --description 'A fox and a rabbit among woodland flowers.' \
  --alt 'A fox and rabbit surrounded by flowers and leaves.' \
  --categories auto --tags fox,rabbit \
  --source-type user_owned --rights-status documented \
  --rights-reference 'Owner reviewed source and commercial usage rights.' \
  --secret-file /absolute/path/private/secrets.json --environment staging \
  --output /absolute/path/private-prepared/woodland-friends
```

Komut çıktı klasöründe `manifest.json`, `reviews.json`, `files.json` ve türevler oluşturur. Bu klasör private kalır. İncelenen kaynak dosyanın hash'i değişirse önceki görsel inceleme geçersizdir. Kaynak, hak durumu ve açıklamaları doldurmadan üretim yayını yapmayın. `example_only` veya `test_only` kayıt üretimde yayınlanamaz.

### Görselden yaş ve kategori önerisi

Hazırlama komutu yaş ve konu analizini gerçek çizim pikselleri üzerinde yerel olarak çalıştırır; dosya adı ve başlık bu karara girmez. `--ages` ve `--difficulty` ile yaş dayatılmamalıdır; hazırlama aracı bunları artık kullanmaz. EXIF yönü düzeltilir, beyaz kâğıt payları normalize edilir ve resmin tamamı modele verilir. `jot-age-vision-3.0.1`, kapalı alanların genişliği, çizgi yoğunluğu ve görsel model skorlarını birlikte değerlendirir. Açık ama basit bir çizim sırf kapalı alan bulunamadığı için yetişkin kategorisine itilmez. Yaş önerileri başlangıç noktasıdır; gelişimsel değerlendirme veya minimum kullanım yaşı değildir.

`--categories auto` mevcut katalog konuları ve hayvan alt konuları için öneriyi uygular. Benzer iki konu, güçlü arka plan veya katalog dışında bir konu saptanırsa otomatik atama durur; özel çıktı klasöründeki `category-analysis.json` incelenir. Özgün resmi açarak doğru konuyu kontrol edin, ardından `--categories animals,woodland --category-review 'A fox and rabbit are the main subjects, surrounded by woodland plants.'` gibi somut bir inceleme notuyla hazırlamayı tekrarlayın. Örnek notu görülmeyen resimlere kopyalamayın. Skorlar olasılık ya da doğruluk yüzdesi değildir. Model bir nesneyi gözden kaçırabilir; belirgin skor tek başına kusursuz tanıma kanıtı değildir.

`category-review.json` seçilen konuları, kaynak checksum'ını ve varsa inceleme notunu özel olarak saklar. Tamamlanmış `manifest.json` içeren bir klasörün üstüne yazılmaz; yeni sürüm için yeni çıktı klasörü seçin. Başarısız kategori kontrolü mevcut bir paketi sessizce kullanmaz. Yönetimde hazırlanan dosyalar seçildiğinde yaş ve kategori özeti gösterilir. Eski model sürümü veya değişen kaynak pikselleri yeniden hazırlama gerektirir; fotoğraflı ve markalı kaynak analizleri ayrı önbellek anahtarları kullanır. Görsel veya model sürümü değişince eski karar kullanılmaz.

## Yönetimden aktarım ve yayın

1. `/admin/` adresine yalnız izin verilen Cloudflare Access kimliğiyle girin ve **Import & upload** sekmesini açın. Test için `https://staging.jotcoloring.com/admin/`, gerçek yayın için `https://jotcoloring.com/admin/` kullanın.
2. Önce kaynağın ve lisansın gerçekten size ait veya kullanıma uygun olduğunu kontrol edin. Hazırlama komutu varsayılan olarak hakları `unverified` bırakır; yalnız doğrulanmış bilgi için `--rights-status documented` ve doğru `--rights-reference` kullanın. Kaynağın türünü `--source-type` ile doğru belirtin; AI veya sahiplik iddiası varsayılmaz.
3. Hazırlama komutunda aynı ortama ait `--secret-file` ve `--environment` kullanılır. Yerel dosyadaki doğrulama sırrı sunucuya veya Git'e gönderilmez. `reviews.json` belirli dosya hash'lerine bağlı imzalı inceleme içerir; yedi gün geçerlidir ve özel tutulur. Komut, kaynak, PDF ve WEBP çıktılarının görsel/hak incelemesinin yerine geçmez.
4. **Original artwork** alanına özgün resmi; **Prepared manifest, reviews and files** alanına aynı klasördeki `manifest.json`, `reviews.json` ve bütün rol adlı WEBP/PDF türevlerini birlikte seçin. `files.json` seçilmez. İsteğe bağlı renkli `home_half_color.webp` varsa onu da seçin. Kaynak hash'i, gerçek byte'lar ve imzalar uyuşmazsa işlem durur.
5. **Validate and queue prepared page** ile dosyalar private alana, özgün kaynak ve kopyası backup alanına yüklenir; kontrol edilen içerik inceleme kuyruğuna alınır. **Content → Refresh** ile durumunu görün. `ready_for_review` olduktan ve görünüm/hak kontrolü yapıldıktan sonra **Publish** düğmesini kullanın. İndirme, arama, kategori ve detay sayfasını kontrol edin.
6. Aynı sekmede kesilen işlemi aynı dosyalarla tekrar başlatmak özel yükleme anahtarlarını korur; iş gönderimi aynı payload/anahtarla idempotenttir. Sekme oturumu silinirse yarım yüklemeler private kalabilir; yeni gönderim öncesi işleri ve audit kaydını kontrol edin. Düzenlemede önce güncel revision/expected version okunur; 409 durumunda çakışmayı inceleyin.

`scripts/data/import-catalog.ts` API istemcisi ayrıca bir Cloudflare Access servis kimliği gerektirir; bu kurulumda böyle bir kimlik otomatik oluşturulmamıştır. Yönetimdeki hazırlanan dosya akışı mevcut sahip oturumunu kullanır. Doğrulama sırlarını ve imzalı özel dosyaları sohbet, repo veya herkese açık depolamaya koymayın.

## Yayından kaldırma

Metadata durumunu değiştirmek yeni kategori/detail erişimini kapatır; uzun süre önbelleğe alınmış immutable medya URL'sini tek başına geri almaz. Normal arşivlemede eski dosyalar retention kapsamında kalır. Acil kaldırmada ilgili yayın kimliklerini durdurun, ilgili medya nesneleri/erişim kuralı ve CDN purge adımını ayrıca uygulayın. Tüm bucket'ı veya başka sitelerin dosyalarını topluca silmeyin.

## Yayın ve değişiklikler

GitHub Actions tek otomatik yayın yoludur. Workers Builds'in user-token sınırı, tek Worker kapsamı için gereken account-owned token modeliyle uyuşmuyor. Onaylanan iki token ayrı, branch kısıtlı environment secret'larında saklandı (operatör bildirimi). İlk staging run40696610833/attempt2 Verify ve jobs upload'u geçti, hesap-geneli queue liste isteğinde10000 ile durdu; web çalışmadı. Düzeltme `CI_DEPLOYMENT_DECISION.md` ve `evidence/ci-version-release-review.json` içinde; version-only düzeltme staging üzerinde gerçek run 40703500734 ile doğrulandı; production kabulü ayrıca kaydedilir.

Mevcut `Verify / verify` kontrol kapısı korunur. Typecheck, bütün testler, Python operasyon kontrolü, tracked sır taraması, ortam build'i ve gerçek config metadata parity aynı workflow'dadır. Yayın job'ı yalnız main/staging push, başarılı verify, doğru upstream repo ve `JOTCOLORING_DEPLOY_ENABLED=true` ile çalışır. Aynı commit artifact'i hash'lenir; token yalnız son yayın adımında vardır. Önce jobs, sonra web `versions upload` ve elde edilen kesin UUID'nin%100 etkinleştirilmesiyle yayımlanır; readback eşitliği zorunludur. Otomatik provision/auto-create kapalıdır. Queue consumers, cron ve routes korunur; bunların değişimi ayrı operatör işidir. Workflow'a production migration veya içerik aktarımı eklenmez. Ham CLI çıktısı önceki sürüm yazarlarını içerebildiğinden public loga basılmaz; sürüm/deployment/commit receipt ve sayısal hata kodları gösterilir.

Preview için ayrı D1/R2/Queue isimleri kullanılır. Preview Queue tüketemez; staging Worker tüketir. Preview cron ayrı çalışmaz. Staging kuyruğu üzerinden test yapmak üretim kuyruğuna mesaj gönderme yetkisi değildir. Preview/AI varsayılanları üretim bütçesini devralmaz. Güvenilmeyen fork PR koduna production secrets verilmez.

## Yedek ve doğrulanmış geri yükleme

Yedek kapsamı canonical D1 normal tabloları, immutable R2 kaynak/türevleri ve hash/byte manifestidir. Arama FTS yeniden kurulabilir. D1 export içine FTS sanal tablolarını karıştırmayın. Kullanıcı fotoğrafları retention süresinden uzun yedeklenmez; tarayıcıdaki yerel stüdyo projeleri sunucu yedeğinde değildir.

`scripts/ops/backup.py` bir **mevcut yerel export klasörünü** hash'ler, yeni snapshot klasörüne kopyalar ve izole yeni klasöre geri yükler. Bulut erişimi veya R2 replikasyonu yapmaz. Buluttan alınan export ve R2 nesne envanteri önce private staging alanında hazırlanmalı, sonra ayrı izinli BACKUPS bucket'ına taşınmalıdır. Bulut export/restore provasının durumu ayrıca raporlanır. Son gerçek bootstrap'ın184 dosyasını ve iki SQLite DB'yi yeni yerel hedefe geri yükleme provası PASS; `evidence/bootstrap-restore.json`. Bu, Cloudflare uzak restore veya CORS/metadata restore kanıtı değildir.

Canonical yedekte `sitemap_entry`, `request_limit` ve `ai_free_reservation` dahil21 tablo vardır. Kullanıcıya özel AI giriş/sonuçları kalıcı katalog yedeğine eklenmez. Backend yayın öncesi private BACKUPS koruması ve bootstrap bundle hazırlığı uygulanırken, başarılı R2 restore provası ayrıca kanıtlanmalıdır.

Gerçek uzak D1 export, private BACKUPS'a checksum doğrulanmış aktarım ve isteğe bağlı yeni izole D1'e restore aracı `scripts/ops/cloud-backup-restore.ts` içinde hazırdır. Varsayılan yalnız plan üretir. `--backup-only --snapshot-name ... --apply` yalnız yeni özel yedek nesneleri üretir; normal restore provası `--apply` ile ayrıca yeni izole DB oluşturur. Gerçek staging zinciri PASS; `evidence/cloud-restore-staging.json` ilk bulunan/düzeltilen sorunları da korur. Production cutover/RTO/RPO bu sonuçtan çıkarılmaz. Ayrıntılı komut ve güvenli uygulama sırası `RECOVERY_RUNBOOK.md` içindedir. Kalıcı uzak snapshot özel `creator_job`, `creator_upload`, `ai_free_reservation` satırlarını dışlar, tablo şemalarını korur; bu nedenle AI açılmadan güncel kota durumu ayrıca uzlaştırılmalıdır. Yerel aktarım provası bütün canonical tabloları test edebilir; bu kalıcı private-data retention yetkisi değildir.

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

AI ücretli çağrı bütçesi **0**. Ayrı ücretsiz hesap için9.000 günlük neuron ve iş başına300 üst sınırı bir yerel rezervasyon politikasıdır; bu hesapta başka işlerin kullanımını ölçmez. Provider ücretsiz kotası üstünde ücretli çağrıya düşme kabul edilmez. Production metin ve fotoğraf üretimi gerçek provider ile doğrulandı; sağlayıcının kotasını bilerek tüketme testi yapılmadı. Uyarı e-postası veya dashboard alarmı bütçe durdurma mekanizması değildir. Atomik rezervasyon yeni pahalı işi durdurur; katalog okumalarını kapatmaz. Belirsiz provider timeout'unda yeniden ücret doğurabilecek çağrıyı otomatik çoğaltmayın.

## Public dosya kontrolü

Ham PNG, veritabanı, özel fotoğraf, auth profili ve secret dosyaları public repo'ya konmaz. `python3 scripts/ops/secret_scan.py --working-tree` Git oluşmadan aday kaynakları kontrol eder; `python3 scripts/ops/secret_scan.py` Git indexindeki gerçek tracked dosyaları kontrol eder. Son push öncesi ikincisi çalıştırılmalı. Çıktı yalnız dosya/rule adı verir, bulunan secret değerini basmaz. Pattern taraması kapsamlı güvenlik denetimi değildir. Public iletişim **jotcoloring@gmail.com**.
