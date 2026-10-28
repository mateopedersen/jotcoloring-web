# Kaynak envanteri

28 Ekim 2026 durum kesiti. Kimlikler gizli token değildir; bu dosya kimlik bilgisi içermez. Kaynak oluşturulması, uygulamanın o kaynakla üretimde doğrulandığı anlamına gelmez.

| Kaynak | Kimlik / ad | Durum |
| --- | --- | --- |
| GitHub repo | mateopedersen/jotcoloring-web | Public; ilk staging run queue10000 ile durdu; version-only staging run40706443510 PASS; production kabulü ayrı |
| Ana Cloudflare hesap | 48c779c8eaa80234e0bb9d57f96e588b | Mevcut Workers Paid/R2; başka projelerin aboneliği değiştirilmez |
| jotcoloring.com zone | jotcoloring.com | Free tercihi; Pro yükseltmesi yok |
| Staging canonical D1 | jotcoloring-staging-catalog / 835240f5-90d7-4bf2-8a41-b67cc484fb4b | Oluşturuldu |
| Staging search D1 | jotcoloring-staging-search / 1f4852c1-2b4d-4e80-99a3-f86be83858b6 | Oluşturuldu |
| Production canonical D1 | jotcoloring-production-catalog / d075722e-c698-4b6e-a5e4-f53ae5c9e411 |18 content/108 asset bootstrap import edildi (root araç bildirimi) |
| Production search D1 | jotcoloring-production-search / 59133e5c-f73a-42d2-8b8b-223720e8b6ec |18 search document import edildi (root araç bildirimi) |
| Staging Worker | https://jotcoloring-staging.melihozcanapple.workers.dev | Gerçek HTTPS:18 content/108 asset/54 download/50 search PASS; https://staging.jotcoloring.com canonical/robots/sitemap hedefli5 GET PASS |
| Production Worker | https://jotcoloring.com · https://jotcoloring-production.melihozcanapple.workers.dev | Gerçek267 GET/29 kabul PASS;18 content/108 asset/54 download/50 search, canonical/robots/www308; alternate host noindex |
| İzole staging restore D1 | jotcoloring-restore-staging-20261028-first / d4b6745a-86eb-4fce-bcc0-79609c7faae0 | Gerçek R2 snapshot'tan restore/parity PASS; hiçbir Worker binding'ine eklenmedi; korunuyor |
| Production Access application | 48b38ce8-2867-4b8b-9a4d-51da967e7672 | ana domain Access, alternate admin anonim401/sahteJWT403 ve yetkili sahip girişi PASS; staging yönetimi ayrı test edildi |
| Ücretsiz AI hesap | 0dce4e45aa8f6fcab101ea9622db99f2 | Ücretli modele geçiş yetkisi yok |
| Free AI gateway | jotcoloring-ai-free-gateway.jotcoloring-web.workers.dev | Dağıtıldı; production gerçek text ve photo inference, özel indirme ve başka sahip izolasyonu PASS |

Her bir `staging` ve `production` ortamı için ayrı dört R2 bucket oluşturuldu:

- `jotcoloring-{environment}-originals`: private kaynaklar ve incoming içerik.
- `jotcoloring-{environment}-published`: yayımlanmış türevler; public medya alan adı kabulü ayrı kontrol edilir.
- `jotcoloring-{environment}-jobs`: private AI giriş/sonuçları ve retention.
- `jotcoloring-{environment}-backups`: private yedekler/export; kişisel AI verisi kalıcı katalog yedeğine eklenmez.

Ayrı altı queue: `jotcoloring-staging-ingest`, `jotcoloring-staging-ai`, `jotcoloring-staging-dead-letter`, `jotcoloring-production-ingest`, `jotcoloring-production-ai`, `jotcoloring-production-dead-letter`. Consumer bağlanması ve DLQ replay başarılı kaynak oluşturma işlemiyle aynı kanıt değildir.

`preview` ortamı şu anda boş D1/R2/queue binding'leriyle ve AI kapalı tanımlıdır. Canlı staging binding'leri production kimliklerini kullanmaz. Preview branch ortamının production'a yazamadığı gerçek branch testi henüz bu envanterde PASS değildir.

Staging R2 yükleyici418 nesneyi doğruladı (private originals ve backups dahil; root araç kanıtı). Staging remote D1 başlangıçta boş kontrol edildi ve18 content/108 asset ile başlatıldı; public HTTP bütün active byte'ları ayrıca doğruladı. Production Access kapsamı `/admin` ve `/api/admin`; team issuer `broken-term-6d26`. E-posta adresi veya kimlik bilgisi bu public belgede tutulmaz.

Production URL gerçek HTTP ile doğrulandı; bu kabul sırasında commit response header'ı bulunmadığı için HTTP kanıtı kendi başına kesin commit/deploy sürümünü ispatlamaz. Staging scoped-token Actions yayını ve canlı yetkili admin girişi doğrulandı. Production otomatik yayın commit/deploy eşleşmesi ayrıca kontrol edilmelidir; medya aynı origin üzerinden sunulur. Bunlar uydurulmaz; doğrulanmış araç çıktısından eklenir. Kimlik doğrulama secret'ları yalnız güvenli hesap/ortam kanallarında tutulur, rapora veya repo'ya yazılmaz.

Ek kurtarma denemesi: staging BACKUPS'ta ilk ve düzeltilmiş SQL/manifest snapshot'ları korunur. Staging ORIGINALS içinde yalnız `restore-drill/20261028-first/` altında3 temsilî PDF/WEBP/raw nesne oluşturuldu; toplam4.418.415byte. Public bucket veya mevcut immutable key üstüne yazılmadı.
