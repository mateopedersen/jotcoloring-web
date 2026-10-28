# Kurtarma ve rollback

Tarih: 28 Ekim 2026. Yerel checksum/izole dosya restore testi yapıldı; staging/production provası ve RTO/RPO **NOT RUN**. Kod rollback'i D1/R2/KV veya kuyruk durumunu geri almaz.

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
