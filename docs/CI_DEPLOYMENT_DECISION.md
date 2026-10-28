# Tek otomatik yayın yolu: GitHub Actions

28 Ekim 2026 — `34d0da9` kaynak tabanında ilk gerçek Actions yayın denemesi yapıldı. Kullanıcı iki dar kapsamlı account-owned tokenı onayladı; operatör bunları ayrı ve branch kısıtlı GitHub environment secret'larına şifreli kaydetti ve repo aktivasyonunu açtı. **Staging run40696610833/attempt2: Verify PASS, jobs Worker upload PASS, ardından queue consumer uzlaştırmasındaki `GET /accounts/.../queues` isteği10000 ile reddedildi; web adımı çalışmadı.** Tam otomatik yayın başarısı ilan edilmez. [İlk gerçek run](https://github.com/mateopedersen/jotcoloring-web/actions/runs/40696610833/attempts/2)

Bu hataya yönelik version-only düzeltme yerel olarak hazırlanıp test edildi; henüz bu düzeltmeyle remote yayın yapılmadı. Token kapsamı genişletilmez. İlk inceleme kaydı `evidence/ci-deploy-review.json` tarihsel taslaktır; güncel düzeltme kanıtı `evidence/ci-version-release-review.json` içindedir.

## Neden Workers Builds seçilmedi

Güncel Workers Builds yapılandırma belgesi yalnız kullanıcı tokenlarını desteklediğini, account-owned token desteğinin henüz gelmediğini söylüyor. Varsayılan token Worker, depolama ve tüm zone route yetkileri içeriyor. Dashboard'daki mevcut otomatik token ekranı da proje dışı kaynaklara geniş yetki istiyordu; bu token oluşturulmadı. [Workers Builds token yapılandırması](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#api-token)

Cloudflare, Wrangler'da tek Worker düzeyinde granular yetki için **account-owned API token** kullanılmasını istiyor. Mevcut Worker'ı yayınlamak için o Worker üzerinde `Editor` yeterli; R2/D1 binding'lerini kullanarak deploy yapmak doğrudan veri erişim yetkisi gerektirmiyor. Route/Custom Domain güncelleniyorsa ayrıca yalnız ilgili zone için `Workers Routes Write` gerekiyor. [Workers yetkilendirme](https://developers.cloudflare.com/workers/authorization/) · [Worker kapsamları ve route yetkileri](https://developers.cloudflare.com/workers/authorization/workers/)

Kaynak paketin `05_GITHUB_CLOUDFLARE_VE_OPERASYON.txt`, bölüm 4'ü zorunluluk durumunda Actions'ın tek yayın yetkilisi seçilmesine izin veriyor ve eşzamanlı Workers Builds deploy'unun kapatılmasını istiyor. Bu sağlayıcı token uyumsuzluğu karara gerekçedir. Seçim: GitHub Actions tek otomatik yayın yolu; Workers Builds'te production/staging yayın tetikleyicisi bırakılmayacak. Dashboard doğrulaması henüz bu taslak tarafından yapılmadı.

## Onaylanan iki token

Her token ana hesap `48c779c8eaa80234e0bb9d57f96e588b` altında account-owned oluşturulur. Free AI hesabı için token bu akışa eklenmez.

| GitHub environment | Secret adı | Yalnız seçilecek mevcut Workers | Zone yetkisi |
| --- | --- | --- | --- |
| `staging` | `JOT_CF_STAGING_DEPLOY_TOKEN` | `jotcoloring-staging`, `jotcoloring-staging-jobs`: `Editor` | Yalnız jotcoloring.com / `f719bb4d17d29abc414ab167ba2797e4`: `Workers Routes Write` |
| `production` | `JOT_CF_PRODUCTION_DEPLOY_TOKEN` | `jotcoloring-production`, `jotcoloring-production-jobs`: `Editor` | Yalnız aynı jotcoloring.com zone: `Workers Routes Write` |

Platform geneli veya tüm Workers kapsamı, `Admin`, tüm zones, R2/D1 içerik erişimi, yeni kaynak oluşturma, billing ve başka ürün yetkileri plana eklenmez. İki ortamın tokenı birbirinin yerine kullanılmaz. Worker Editor kodu ve ayarları değiştirebildiği için güvenilir branch incelemesi ve kaynak kimliği kontrolleri korunur.

Wrangler4.153.0 `deploy` mevcut queue consumer ayarlarını da uzlaştırır. İlk gerçek deneme bu hesap-geneli liste yetkisinde reddedildi. Sadece komutu `versions upload` yapmak da yeterli değildir: kurulu sürümün `preUploadApiChecks` fonksiyonu normal queue config'ini görünce kuyruk listesini okur. Ayrıca otomatik kaynak hazırlama bayrakları bu sürümde varsayılan olarak açıktır; yardımcı kod ikisini açıkça `false` yapar.

`worker-version-release.ts` önce asıl config'in account/ortam/DB/bucket/queue/route/cron kimliklerini kontrol eden mevcut release kapısından geçer. Sonra sadece upload için geçici config üretir. İki producer aynı API metadata biçimiyle taşınır: `name`, `type: queue`, `queue_name`. Bu Cloudflare'ın tanımlı queue binding biçimidir. Consumer, cron, route ve observability ayarları geçici config'e eklenmez; platformda mevcut hâlleri korunur. D1/R2 binding değerleri, runtime değişkenleri ve gizli değerleri koruma talimatı değişmez. Kaynaklar: [Version upload API ve queue binding](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/create/), [ayrı trigger komutu](https://developers.cloudflare.com/workers/wrangler/commands/workers/#triggers-deploy).

Kurulu Wrangler ile gerçek multipart dry-run karşılaştırması bütün metadata'nın eşit olduğunu kanıtlar; bu kontrol CI `--prepare` kapısında da çalışır. Upload öncesi Worker-kapsamlı service GET, mevcut grouping etiketlerinin bilinen gruplama veya gruplamasız durum olduğunu doğrular; geçici config aynı durumu korur. Beklenmeyen grouping upload'dan önce durur. Sabit Wrangler sürümünün gerçek komutları hem gruplu hem gruplamasız Worker için yerel sahte API'ye karşı sınanır: izin verilen tek yazmalar Worker `/versions` ve `/deployments` POST'larıdır. Queue/R2/D1 metadata, route, schedule veya settings-write isteği gelirse test başarısız olur. Bu yerel test gerçek tokenla remote API kabulü değildir.

## Kodun uyguladığı sıra

`.github/workflows/verify.yml` tek workflow olarak kalır; `verify` job adı korunur. `main` ve `staging` push'ları ile PR doğrulaması aynı mevcut kontrol kapısını kullanır. Ayrı, yarışan ikinci deploy workflow'u yoktur.

1. Credentials olmadan lockfile kurulumu, Astro check, bütün TypeScript testleri, Python operasyon testleri ve tracked dosya sır taraması çalışır.
2. Push için doğru ortam build'i; PR için yerel build alınır. Jobs Worker aynı kaynak üzerinden `--dry-run` ile derlenir, yayımlanmaz.
3. `deploy-release.ts --prepare` iki Worker'ın account/ortam/D1/R2/Queue/DLQ/route/cron kimliklerini ve ücretsiz AI sınırını doğrular. Gateway yalnız `https://jotcoloring-ai-free-gateway.jotcoloring-web.workers.dev`, model yalnız `@cf/black-forest-labs/flux-2-klein-4b`, günlük sınır1–9000 tam sayı nöron, iş başına sınır300 ve ücretli bütçeler sıfır olabilir; doğrudan AI binding'i kabul edilmez. Her iki Worker için asıl ve version-only config gerçek `versions upload --dry-run` ile derlenir; bütün multipart metadata eşitliği zorunludur. Bütün `dist/` dosyaları, hidden `.assetsignore` dahil, commit ve lockfile hash'ine bağlanır.
4. `deploy` yalnız upstream repo'da `push` + `main`/`staging`, başarılı `verify` ve `JOTCOLORING_DEPLOY_ENABLED=true` koşullarıyla açılır. PR, fork ve `pull_request_target` yayın yolu yoktur.
5. Aynı workflow run'ının aynı commit artifact'i indirilir; byte/hash/commit/lockfile/ortam yeniden doğrulanır. Kurulum ve build adımlarına Cloudflare token verilmez.
6. Son yayın adımı yalnız ilgili environment secret'ını alır. Branch ilerlemişse eski commit yayımlanmaz. Önce jobs, sonra web için `versions upload` çalışır. Her komut ayrı ve yeni `WRANGLER_OUTPUT_FILE_PATH` NDJSON dosyasına yazar. Tek eşleşen Worker/şema/sürüm UUID'si yoksa işlem durur; log metninden veya “latest” listesinden sürüm seçilmez. [Wrangler yapılandırılmış çıktı](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/#supported-environment-variables)
7. Yalnız elde edilen UUID `versions deploy UUID@100% --yes` ile, sadece account ve Worker adını içeren minimal config üzerinden etkinleştirilir. `triggers deploy` çağrılmaz. Dönüşteki deployment UUID'si Workers kapsamındaki GET ile okunur; tam olarak yüklenen sürüme%100 atandığı doğrulanır. [Deployment oluşturma](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/create/) · [tek deployment okuma](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/get/)
8. Jobs başarısızsa web çalışmaz. Web başarısızsa workflow başarısız olur; jobs yeni sürümde kalabilir. Upload tamamlanıp activation/readback başarısız olursa yerel receipt sürüm kimliğini saklar ve başarı ilan edilmez. Belirsiz transport sonucu otomatik başka sürüm seçerek geçiştirilmez; operatör kayıtlı Worker/version/deployment kimliğiyle durum okur. Otomatik veri veya kod geri alma yapılmaz.

Ortam başına concurrency yürüyen deploy'u iptal etmez; staging/production birbirini kilitlemez. PR doğrulamaları eski PR run'ını iptal edebilir. Queue consumer, cron ve route değişiklikleri ayrı operatör işidir. D1 migration, içerik aktarımı, bucket oluşturma, AI gateway deploy veya silme bu yayın akışında yoktur. Eski `deploy.mjs` bootstrap aracı Actions tarafından çağrılmaz.

## Etkinleştirme ve doğrulama

Bu dosyanın hazırlanması hesapta token oluşturma veya saklama işlemi değildir. Sorumlu operatör somut token kapsamını kullanıcıya gösterip istenen onayı aldıktan sonra:

1. Mevcut Workers Builds production/staging deploy tetikleyicilerinin kapalı olduğunu doğrular; iki otomatik yayın yolu bırakmaz.
2. GitHub `staging` environment'ını yalnız `staging` branch'ine, `production` environment'ını yalnız `main` branch'ine sınırlar. İki secret kendi environment'ına kaydedilir; değerleri loga veya repo'ya yazılmaz.
3. İncelenmiş değişikliği commit/push eder. `JOTCOLORING_DEPLOY_ENABLED` repo değişkeni tanımsız/false iken yayın job'ı atlanır; Verify çalışabilir.
4. Onaylı kurulum tamamlanınca değişkeni `true` yapar ve gerçek staging push'ıyla akışı sınar. Eksik secret açık hatadır; production secret eksikken staging tokenına fallback yapılmaz.
5. Başarılı run URL/commit, jobs deployment, web deployment ve canlı smoke sonuçlarını kaydeder. Ardından production push ile aynı zinciri doğrular. Kontrol kapısının başarısız örnekte deploy'u gerçekten engellediği ayrı kanıtlanır.

Operatör bildirimine göre iki onaylı token ayrı, branch kısıtlı environment'larda kayıtlı ve aktivasyon açık. İlk remote run yukarıdaki queue hatasıyla başarısız oldu. **Yeni version-only jobs→web yayını remote NOT RUN**; önce staging üzerinde gerçek run ve deployment/commit/smoke eşleşmesi doğrulanacak. Mevcut Workers Builds yayın tetikleyicilerinin kapalı kalması tek-yayın-yolu koşuludur. İlk başarısızlık başarılıymış gibi silinmez.
