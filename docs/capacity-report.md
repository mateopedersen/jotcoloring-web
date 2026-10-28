# Ölçülen kapasite ve büyüme sınırı

28 Ekim 2026. **5 milyon kayıt yük testi NOT RUN.** Aşağıdaki tablo gerçek yerel 18 içeriklik katalog ölçümüdür. Üretim RPS, tepe eşzamanlılık, çok bölge gecikmesi veya faturayı temsil etmez. Yeni varlıklar ve revision'lar eklendikçe tekrar ölçülmelidir.

| Yerel DB | Satır | Ayrılmış tablo+indeks alanı | Normal indeks alanı |
| --- | ---: | ---: | ---: |
| Canonical | 18 içerik | 532.480 byte | 217.088 byte |
| Search | 18 arama dokümanı | 69.632 byte | 24.576 byte |

Kanıt `evidence/capacity-local.json`. SQLite `page_count × page_size` ve `dbstat` kullanıldı; Search toplamı FTS yardımcı tablolarını içerir. Canlı D1 API ölçümünde desteklenen `D1Result.meta.size_after` kullanılır; D1'de yasak olan PRAGMA page_count sorgusuna güvenilmez. Yerel canonical ölçüm geçmiş asset review kayıtlarını da kapsar. Küçük örnekte sabit tablo/indeks sayfaları büyük pay tutar; doğrusal uzatma kesin ihtiyaç değildir.

## Sayısal projeksiyon

Bunlar aynı küçük örnekten içerik başına toplam alanın doğrusal uzatılması ve **%30 mühendislik payı**dır. Ölçülmüş büyük katalog sonuçları değildir.

| Hedef | Canonical projeksiyonu | Search projeksiyonu | Yük testi |
| --- | ---: | ---: | --- |
| 100.000 | 3,846 GB | 0,503 GB | NOT RUN |
| 1.000.000 | 38,457 GB | 5,029 GB | NOT RUN |
| 5.000.000 | 192,284 GB | 25,145 GB | NOT RUN |

GB ondalıktır. Mevcut ücretli hesapta tek D1 için 10 GB sınırı, satır sayısından bağımsızdır. Buradaki 5 milyon projeksiyonu tek canonical veya tek search D1'e sığmaz. Şu anki küçük DB'ler %60 eşiğinin altındadır; projeksiyonun büyük olması mevcut okumaları veya küçük güvenli import'u kapatma gerekçesi değildir. Import'un hedef hacmi kapasiteyi aşacaksa geçiş yapılmadan o büyük import kabul edilmez.

## Gerçek arama ölçümü

50 önceden belirlenmiş anlamlı sorgu, üçer tekrar: **150/150 sonuç kontrolü PASS**. Yerel adapter p50 **20,397 ms**, p95 **53,502 ms**, p99 **110,970 ms**. Gerçek FTS ve hydrate sorguları dahildir. Kaynak sürümleri arama dokümanlarıyla uyumludur. Olay üretiminden indeks görünürlüğüne geçen süre ayrıca ölçülmedi; sıfır gecikme denmez. Sorgu bazında D1 statement/rows_read/rows_written değerleri `evidence/search-acceptance.json` içindedir.

Türkçe karakterli giriş güvenli işlenir; İngilizce içerik için otomatik Türkçe çeviri, eş anlamlı veya typo toleransı vaat edilmez. `tilki`/`çiçek` için boş sonuç bu açık kapsamla doğrulandı. Sorgu seti mühendislik kabulüdür; bağımsız insan relevance paneli değildir.

## Aktif kapılar ve sonraki ölçüm

- %60 mevcut alan: büyüme tahmini ve göç takvimi güncellenir.
- %70: kapasite geçişi prova edilmiş olmalıdır.
- %80: büyük yeni import durur; read hizmeti sürer.
- Boyut dolmadan gecikme, rows_read, kuyruk backlog veya hata oranı kötüleşirse daha erken müdahale gerekir.

`scripts/ops/capacity.py` mevcut doluluk kapısını ve hedef projeksiyonunu ayrı alanlarda verir. `data-migration-runbook.md` içindeki gerçek PostgreSQL provası yerel veri taşınmasını kapsar; production Hyperdrive geçişi tamamlanmış değildir. Temsilî 100 bin/1 milyon test, p95/p99 hedeflerinin sahibiyle belirlenmesi, uzak yük testi için süre/RPS/bütçe, actual queue lag ve başarısızlık oranı açık kalır.

Medya boyutları aktif türevlerin tamamından ayrıca ölçülür; kaynak PNG, aktif WEBP/PDF, eski revision ve yedek çarpanları birbirine karıştırılmaz. Bütün PDF'ler için 1.000.000 byte sınırı, iki sayfalı kişisel export dahil, kapasite hedefinden bağımsız bir kabul kapısıdır. Güncel medya boyut raporu backend'in final prepared-media doğrulama çıktısıyla ilişkilendirilmelidir; yeniden üretilen branded footer dosyaları eski ölçümü geçersiz kılar.

## Son markalı medya ölçümü

18 içerikte108 aktif türev toplam **38.094.254 byte**; içerik başına tüm aktif varyantların medianı **2.111.729,5 byte**, p95'i **2.774.463 byte**. Ayrı18 private kaynak PNG toplam **46.071.547 byte**. Bu değerler `evidence/media-capacity.json` içinde rol bazında ayrıdır. 36 katalog PDF'sinin en büyüğü **743.353 byte**; gerçek render/renk/footer doğrulaması `evidence/media-final.json`.

Mevcut aktif türev ortalamasıyla5 milyon içerik yalnız aktif dosyalarda yaklaşık **10,582 TB** eder. Kaynak PNG, private incoming kopya, geçmiş revision ve yedek buna dahil değildir. Şu bootstrap yükleyicisi her türevi private incoming+published+backup olmak üzere üç yerde, her raw kaynağı originals+backup olmak üzere iki yerde tutar. Aynı kopya politikasının ölçekle sürdürülmesi aktif dosya sayısını tek kopya gibi fiyatlamaya izin vermez. Staging küçük kontrollü örnek kalmalıdır;5 milyonluk production kataloğunu otomatik staging'e kopyalama planı yoktur.

Home renkli kartlar **400×600** ayrı responsive türevlere dönüştürüldü.18 dosya toplam **2.557.222 byte**, median **140.737 byte**, en büyük **160.656 byte**. Önceki tam boy renkli paket34.058.148byte idi; toplam **%92,49** azaldı. Diğer90 türev ve18 raw kaynak hash'i değişmedi. Kanıt `evidence/responsive-cards-verification.json`. Yeniden sıkıştırma/hash değişikliği raporu yeniler.
