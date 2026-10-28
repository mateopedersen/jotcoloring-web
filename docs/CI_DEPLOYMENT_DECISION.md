# Tek otomatik yayın yolu: GitHub Actions

28 Ekim 2026 — **incelenebilir yerel taslak; henüz commit/push edilmedi ve bu yeni yayın akışı GitHub'da çalıştırılmadı.** Token oluşturulmadı veya GitHub'a kaydedilmedi. Bu karar önceki Worker bootstrap yayınlarının veya `1ab244f` commit'indeki başarılı Verify kontrolünün yerine yeni bir başarı beyanı koymaz.

## Neden Workers Builds seçilmedi

Güncel Workers Builds yapılandırma belgesi yalnız kullanıcı tokenlarını desteklediğini, account-owned token desteğinin henüz gelmediğini söylüyor. Varsayılan token Worker, depolama ve tüm zone route yetkileri içeriyor. Dashboard'daki mevcut otomatik token ekranı da proje dışı kaynaklara geniş yetki istiyordu; bu token oluşturulmadı. [Workers Builds token yapılandırması](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#api-token)

Cloudflare, Wrangler'da tek Worker düzeyinde granular yetki için **account-owned API token** kullanılmasını istiyor. Mevcut Worker'ı yayınlamak için o Worker üzerinde `Editor` yeterli; R2/D1 binding'lerini kullanarak deploy yapmak doğrudan veri erişim yetkisi gerektirmiyor. Route/Custom Domain güncelleniyorsa ayrıca yalnız ilgili zone için `Workers Routes Write` gerekiyor. [Workers yetkilendirme](https://developers.cloudflare.com/workers/authorization/) · [Worker kapsamları ve route yetkileri](https://developers.cloudflare.com/workers/authorization/workers/)

Kaynak paketin `05_GITHUB_CLOUDFLARE_VE_OPERASYON.txt`, bölüm 4'ü zorunluluk durumunda Actions'ın tek yayın yetkilisi seçilmesine izin veriyor ve eşzamanlı Workers Builds deploy'unun kapatılmasını istiyor. Bu sağlayıcı token uyumsuzluğu karara gerekçedir. Seçim: GitHub Actions tek otomatik yayın yolu; Workers Builds'te production/staging yayın tetikleyicisi bırakılmayacak. Dashboard doğrulaması henüz bu taslak tarafından yapılmadı.

## İncelenecek iki token

Her token ana hesap `48c779c8eaa80234e0bb9d57f96e588b` altında account-owned oluşturulur. Free AI hesabı için token bu akışa eklenmez.

| GitHub environment | Secret adı | Yalnız seçilecek mevcut Workers | Zone yetkisi |
| --- | --- | --- | --- |
| `staging` | `JOT_CF_STAGING_DEPLOY_TOKEN` | `jotcoloring-staging`, `jotcoloring-staging-jobs`: `Editor` | Yalnız jotcoloring.com / `f719bb4d17d29abc414ab167ba2797e4`: `Workers Routes Write` |
| `production` | `JOT_CF_PRODUCTION_DEPLOY_TOKEN` | `jotcoloring-production`, `jotcoloring-production-jobs`: `Editor` | Yalnız aynı jotcoloring.com zone: `Workers Routes Write` |

Platform geneli veya tüm Workers kapsamı, `Admin`, tüm zones, R2/D1 içerik erişimi, yeni kaynak oluşturma, billing ve başka ürün yetkileri plana eklenmez. İki ortamın tokenı birbirinin yerine kullanılmaz. Worker Editor kodu ve ayarları değiştirebildiği için güvenilir branch incelemesi ve kaynak kimliği kontrolleri korunur.

Wrangler 4.153.0 jobs deployment sırasında mevcut queue consumer ayarlarını da uzlaştırır. Resource-scoped tokenla bu uçların gerçek kabulü henüz test edilmedi. İlk dar yetkili staging denemesi yetki hatası verirse otomatik geniş tokena geçilmez; reddedilen işlemin gerekli kapsamı somut olarak incelenir. Bu taslak doğrudan Queue yönetim veya tüm-account veri yetkisi verilmiş gibi davranmaz.

## Kodun uyguladığı sıra

`.github/workflows/verify.yml` tek workflow olarak kalır; `verify` job adı korunur. `main` ve `staging` push'ları ile PR doğrulaması aynı mevcut kontrol kapısını kullanır. Ayrı, yarışan ikinci deploy workflow'u yoktur.

1. Credentials olmadan lockfile kurulumu, Astro check, bütün TypeScript testleri, Python operasyon testleri ve tracked dosya sır taraması çalışır.
2. Push için doğru ortam build'i; PR için yerel build alınır. Jobs Worker aynı kaynak üzerinden `--dry-run` ile derlenir, yayımlanmaz.
3. `deploy-release.ts --prepare` iki Worker'ın account/ortam/D1/R2/Queue/DLQ/route kimliklerini ve ücretsiz AI sınırını doğrular. Gateway yalnız `https://jotcoloring-ai-free-gateway.jotcoloring-web.workers.dev`, model yalnız `@cf/black-forest-labs/flux-2-klein-4b`, günlük sınır 1–9000 tam sayı nöron, iş başına sınır 300 ve ücretli bütçeler sıfır olabilir; doğrudan AI binding'i kabul edilmez. Bütün `dist/` dosyaları, hidden `.assetsignore` dahil, commit ve lockfile hash'ine bağlanır.
4. `deploy` yalnız upstream repo'da `push` + `main`/`staging`, başarılı `verify` ve `JOTCOLORING_DEPLOY_ENABLED=true` koşullarıyla açılır. PR, fork ve `pull_request_target` yayın yolu yoktur.
5. Aynı workflow run'ının aynı commit artifact'i indirilir; byte/hash/commit/lockfile/ortam yeniden doğrulanır. Kurulum ve build adımlarına Cloudflare token verilmez.
6. Son yayın adımı yalnız ilgili environment secret'ını alır. Branch ilerlemişse eski commit yayımlanmaz. Önce açık isimle jobs, sonra açık isimle web Worker deploy edilir. Jobs başarısızsa web adımı çalışmaz. Web başarısızsa workflow başarısız olur; jobs'ın yeni sürümde kalabileceği raporlanır, otomatik veri veya kod geri alma yapılmaz.

Ortam başına concurrency sıralaması yürüyen deploy'u iptal etmez; farklı staging/production ortamları birbirini kilitlemez. PR doğrulamaları eski PR run'ını iptal edebilir. D1 migration, içerik aktarımı, bucket oluşturma, AI gateway deploy veya silme komutu bu yayın akışında yoktur.

## Etkinleştirme ve doğrulama

Bu dosyanın hazırlanması hesapta token oluşturma veya saklama işlemi değildir. Sorumlu operatör somut token kapsamını kullanıcıya gösterip istenen onayı aldıktan sonra:

1. Mevcut Workers Builds production/staging deploy tetikleyicilerinin kapalı olduğunu doğrular; iki otomatik yayın yolu bırakmaz.
2. GitHub `staging` environment'ını yalnız `staging` branch'ine, `production` environment'ını yalnız `main` branch'ine sınırlar. İki secret kendi environment'ına kaydedilir; değerleri loga veya repo'ya yazılmaz.
3. İncelenmiş değişikliği commit/push eder. `JOTCOLORING_DEPLOY_ENABLED` repo değişkeni tanımsız/false iken yayın job'ı atlanır; Verify çalışabilir.
4. Onaylı kurulum tamamlanınca değişkeni `true` yapar ve gerçek staging push'ıyla akışı sınar. Eksik secret açık hatadır; production secret eksikken staging tokenına fallback yapılmaz.
5. Başarılı run URL/commit, jobs deployment, web deployment ve canlı smoke sonuçlarını kaydeder. Ardından production push ile aynı zinciri doğrular. Kontrol kapısının başarısız örnekte deploy'u gerçekten engellediği ayrı kanıtlanır.

Şu anda remote secret kapsamı, environment branch politikaları, Workers Builds kapatma ve yeni otomatik jobs→web yayını **NOT RUN / operatör kurulumunu bekliyor**. Yerel doğrulama sonuçları `evidence/ci-deploy-review.json` içinde ayrı kayıtlıdır.
