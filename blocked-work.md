# Açık kabul kapıları

28 Ekim 2026 kesiti; root dağıtım çalışması devam ediyor. Bu liste tamamlanmış işleri başarısız saymaz; kalan kanıtı açık tutar. Kullanıcıdan yeni izin istemeyi gerektiren bir genel bekleme listesi değildir.

| İş | Etki | Şu anki sınır / sonraki adım |
| --- | --- | --- |
| Main staging/production deploy ve domain | Canlı site teslimi | Staging Workers.dev kapsamlı HTTPS kontrolleri ve staging.jotcoloring.com canonical/robots/sitemap hedefli kontrolü PASS. Production bootstrap import edildi; Worker dağıtımı ve browser kontrolü bekliyor. |
| Git push, Workers Builds ve check gate | Tek kontrollü yayın yolu | Repo oluşturuldu. Gerçek Git bağlantısı ve branch build sonucu henüz kanıt kaydında yok. |
| Access yönetimi | Yetkili içerik yönetimi | Access application ve owner-only policy oluşturuldu; alternate-host engeli ve yetkili gerçek admin akışı ayrıca test edilecek. |
| Yeni marka footer'lı PDF/WEBP | Son kullanıcı biçim talebi | Son108 dosya yerel doğrulamadan ve staging gerçek HTTPS checksum kontrolünden geçti;54 download header/byte testi PASS.36 PDF en çok743.353byte. Production aynı-hash doğrulaması ayrı bekliyor. |
| On ekran görsel ve işlevsel kabul | Onaylı turuncu tasarım | Ekran bazlı gerçek screenshot/viewport/difference ve interaction kanıtı `docs/acceptance.json` içine işlenecek. |
| Gerçek text/photo AI | Kullanıcının üretim akışı | Free gateway dağıtıldı. Gerçek bir ücretsiz metin işi ve WEBP/PDF/preview byte+görsel kontrolü PASS; evidence/ai-text-staging.json. Fotoğraf, tarayıcı üretim akışı, private retention ve quota exhaustion için bu kayıtta başarı kanıtı yok. |
| Production CORS ve medya TLS | Tainted canvas olmadan export | Gerçek production origin + medya alan adı + tarayıcı export testi gerekli. |
| Bulut DB/R2 restore | Felaket kurtarma | Gerçek staging D1→private R2→izole D1 tam metadata parity ve3 temsilî private R2 dosya restore PASS. İlgili46 şema nesnesi/498 satır doğrulandı. Production cutover, FTS rebuild, tüm medya kurtarma ve RTO/RPO henüz kanıtlanmadı. |
| PostgreSQL/Hyperdrive production geçişi | D1 sınırı aşılınca büyüme | Gerçek yerel schema/import/replay/parity PASS. Canlı PostgreSQL repository/write/AI transaction adaptörü, provider/TLS/pool ve Hyperdrive yolu tamamlanmadı. Geçiş ihtiyacında sağlayıcı ve bütçe kararı gerekir. |
| 100k/1m/5m yük testi | Kapasite garantisi | Yerel18 kayıt ölçüldü. Büyük veri, trafik, kuyruk gecikmesi ve çok bölge testi yapılmadı; projeksiyonlar test başarısı değildir. |

Şu anda hesap doğrulaması gerektiren somut adım root tarafından ayrıca bildirilecektir; burada genel bir kullanıcı bekleme engeli varsayılmaz. Ücretli AI bütçesi0 olduğundan ücretli modele geçiş otomatik yapılmaz. Yalnız mevcut ücretsiz hesap kotası içinde çalışacak gerçek akış ayrıca doğrulanır.
