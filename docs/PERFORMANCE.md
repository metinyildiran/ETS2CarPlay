# Kesintisiz 24–60 FPS için inceleme

28 Ekim 2026. İlk ölçüm ve uygulama raporu. Kaynak kod ve ayrı kurulum paketi güncellendi. Oyun ve yardımcısı kapandıktan sonra 0.8.0 kalıcı kuruluma uygulandı; DLL, yardımcı, uzantı ve eşleştirme doğrulandı. Kullanıcının yeniden başlattığı aktarımda kısa canlı ölçüm tamamlandı.

## Hedef

Kaynak video 24/25/30/50/60 FPS ise mümkün olduğunca kendi hızında, en fazla 60 FPS aktarım. 23.976 FPS kaynak doğal hızında korunur. Aynı kareyi tekrar yüklemek gerçek video FPS artışı sayılmaz. Oyun veya tarayıcı 24 kare üretemediğinde aktarım kodu tek başına 24 farklı kare sağlayamaz.

## Canlı ölçüm

Yerel, yalnızca sayısal kayıt: `build/perf-2026-10-28/baseline.jsonl` (Git'e dahil edilmez).
UTC 19:44:02–19:48:50 arasında oynatma ve bağlantı açık 116 örnek:

| Ölçüm | Sonuç |
| --- | --- |
| Native ekran yükleme hızı | 4.8–58.4 FPS |
| 24 FPS altında örnek | 74 / 116 |
| 48 FPS ve üzerinde örnek | 10 / 116 |
| Yavaş örneklerde ortalama görüntü hazırlama süresi | 114.4 ms |
| Hızlı örneklerde ortalama görüntü hazırlama süresi | 6.9 ms |
| Yakalama boyutu | 1920×1080 |
| Kabin dokusu | 1024×512 |

GPU iki ayrı okumada %100 yüke ulaştı; sonraki kısa örneklemde %26–100 arasında değişti. Sürekli %100 olduğu sonucuna varılamaz. Ön plandaki pencere ve oyun sahnesi kaydedilmediği için değişimlerin kesin nedeni bu ölçümle kanıtlanamaz.

Tarayıcıdan alınan kare, yardımcının aldığı kare ve native onay sayısı çoğu aralıkta birlikte düşüyor. Bu, ilk araştırılacak yerin native doku eşleştirmesinden önceki yakalama/hazırlama yolu olduğunu gösteriyor. HTTP gönderimi de yavaşlıyor; yalnızca GPU'yu kesin neden ilan etmek için yeterli ayrıntılı zamanlama yok.

Sınırlamalar: Mevcut sayaçlar yaklaşık 2–2.5 saniyelik, farklı zaman pencerelerine ait. `copyMs` çizim ve asenkron okuma beklemesini de içerir; saf GPU işlem süresi değildir. `nativeUploadFps` gerçek sunum zamanını ve benzersiz görüntü sayısını göstermez. Bu kayıt kesintisizlik garantisini doğrulayamaz.

## Öncelik sırası

1. **Yakalama boyutunu düşürerek A/B ölçümü.** 1920×1080 yerine 1280×720 başlangıç adayıdır: yakalanan piksel sayısı %55.6 azalır. 960×540 acil düşük yük seçeneğinde azalma %75 olur. Bunlar FPS kazancı değildir; ölçülmelidir. Sayfa içindeki video küçükse kırpma sonrası ayrıntı azalır; seçilen bölge/viewport oranını hesaba katmak gerekir. Son kabin dokusu boyutu değişmez.
2. **Çözünürlüğü yüke göre ayarla.** Uzun beklemelerde çözünürlük bir basamak düşer; birkaç saniye kararlı çalışmadan yükselmez. 60 FPS kaynağa düşük yükte 60 FPS sağlama hedefi korunur. Düşmüş `sourceFps` sayacını videonun gerçek FPS'i sanıp kalıcı bir FPS sınırına çevirmemek gerekir. Kullanılan Chrome yakalama kanalında `applyConstraints` davranışı önce ayrı test edilmelidir.
3. **Kare zamanlamasını ölç.** Hazırlama, HTTP alımı, native alım ve doku yüklemesine ayrı süre/seri ölçümü ekle. Saatler farklı süreçlerde doğrudan karşılaştırılmamalı; süreç içi süreler ve ortak kare seri numarası kullanılmalı. P95/P99 kare aralığı ve en uzun donma raporlanmalı. Yalnız ortalama FPS yeterli değil.
4. **Gereksiz CPU kopyalarını kaldır.** Şu an HTTP gövdesi birleştiriliyor, ardından başlıkla yeniden birleştirilip pipe'a yazılıyor; native taraf BGRA verisini tekrar kopyalıyor. Kare başına 2 MiB, 60 FPS'te yalnız ham yük 120 MiB/sn. Sabit boyutlu alım tamponu, güvenli tampon ömrü ve ayrı başlık/gövde yazımı araştırılmalı. Native BGRA yolunda değişmeyen veriye doğrudan erişim mümkün; RGBA dönüşümü ve navigasyona dönme korunmalı. Bu değişiklikler yükü azaltır ama tarayıcının 150 ms beklemesini tek başına çözmesi beklenmemeli.
5. **GPU üzerinde kalan aktarım için ayrı prototip.** Mevcut yol GPU → CPU → HTTP → pipe → GPU. Donanımlı video kodlama/çözme veya native GPU paylaşımı bu trafiği azaltabilir. WebRTC/H.264 çözümünde Chrome yakalama yükü devam eder, kodlama gecikmesi ve yeni çözme maliyeti eklenir. Chromium'dan DirectX'e ortak doku aktarımı sıradan uzantı API'siyle hazır bir özellik değildir; bağımsız doğrulama gerektirir. Bu yolun 60 FPS sağlayacağı şimdiden söylenemez.

Electron yerine küçük native köprü dağıtım boyutunu azaltır. Ölçümler, bunu ilk FPS düzeltmesi olarak seçmek için yeterli kanıt sunmuyor.

## Doğrulama

- Aynı video, aynı oyun sahnesi ve aynı tarayıcı görünürlüğüyle mevcut/aday sürümü karşılaştır.
- 23.976/24, 30 ve 60 FPS kaynakları ayrı çalıştır; arka planda tarayıcı, ekran yakınlaştırma, servis ve tır değiştirmeyi kapsa.
- Hareketli ve en az 24 FPS üretebilen kaynakta 10 dakikalık test: bir saniyelik pencerelerde 24 FPS altına düşme, 100 ms üzeri görüntü boşluğu ve P95/P99 kare aralığı ayrı raporlansın. 60 FPS kaynağın ideal aralığı 16.67 ms; 24 FPS için 41.67 ms.
- En az bir kare seri/timestamp iziyle tekrar yüklenen kareleri gerçek ilerleyen videodan ayır. Sabit görüntüde tab capture yeni kare üretmeyebilir; bunun donma sayılması engellenmeli.
- Navigasyona dönüş, altyazı, ses dili, otomatik sonraki video, tır değişimi ve uzun kullanımda bellek büyümesi kontrol edilsin.
- Gerekirse kullanıcı kontrollü oyun FPS sınırıyla GPU'ya pay bırakılan ayrı A/B ölçümü yap. Oyun/NVIDIA ayarlarını otomatik değiştirme.

## API araştırması

Chromium'un [yakalama tasarım belgesi](https://www.chromium.org/developers/design-documents/auto-throttled-screen-capture-and-mirroring/) yük altında compositor hızının düşebileceğini açıklıyor; bu tarihsel tasarım belgesi mevcut vakada kesin neden kanıtı değildir.

[Region Capture](https://developer.chrome.com/docs/web-platform/region-capture) ve [Element Capture](https://developer.chrome.com/docs/web-platform/element-capture) belgeleri self-capture kısıtını belirtiyor. Uzantının offscreen belgesinden başka sekmeyi yakalayan mevcut yöntemde bunları doğrudan kullanılabilir bir çözüm kabul etmemek gerekir.

## Uygulanan ilk paket

- Kaynak yakalama üst sınırı 1920×1080 tutulur, fakat worker başlamadan 1280×720 uygulanır. İlk getUserMedia sınırı 720p olursa sonradan 1080p isteğinin gerçek görüntüyü büyütmediği Chromium testinde görüldü; başlangıç bu yüzden iki aşamalıdır.
- Hazırlama/gönderme maliyeti iki ölçüm boyunca 20 ms üzerindeyse veya 40 ms'yi aşıyorsa çözünürlük düşürülür. En az 20 saniyelik işlem payı görülmeden yükseltilmez. Normal büyük video için üst seviye 720p, küçük seçili video alanı için 1080p'dir. Kare hızı isteği 60 kalır; düşmüş kaynak sayaçlarından nominal FPS tahmin edilmez. Desteklenmeyen constraints akışı kesmez, tekrar denemeler kapatılır.
- HTTP kare gövdesi tek sabit boyutlu tampona okunur; pipe başlığı/gövdesi birleştirilmeden yazılır. Native BGRA hedefi alınan kareden doğrudan yüklenir; birden fazla RGBA hedefi için dönüşüm aynı yükleme turunda yalnızca bir kere yapılır. Tampon ömürleri ve en son kareyi tutan sınırlı kuyruk korunur.
- Yerel ölçüm dosyası tek seferde en fazla bir asenkron yazma kullanır. Hazırlama, gönderme, kuyruk, alım ve pipe onayı için P95/gecikme ölçümleri eklendi. Bunlar monitörde sunum aralığı ölçümü değildir; native sunum zamanı ve gerçek benzersiz kaynak kareleri hâlâ ayrıca doğrulanmalıdır.

Doğrulama sonuçları:

- Gerçek Chromium tab capture: 720p → 540p → 720p → 1080p boyutları okunan VideoFrame üzerinde doğrulandı; her geçişte track canlı kaldı. Kısa test pencerelerinde 700–717 ms içinde 40–41 kare alındı. Bu oyun FPS testi değildir.
- DirectX: BGRA, RGBA ve dinamik RGBA hedeflerinde toplam 192 kabin yenileme döngüsü, 24 resize ve navigasyona dönüş hatasız geçti.
- Gerçek worker → HTTP → pipe → DirectX testinde 86 kırmızı / 105 mavi kare, altyazı pikselleri ve oynatma sonrası şeffaf navigasyon doğrulandı.
- 67 otomatik test geçti; bunlara çözünürlük yükseltme/düşürme, reddedilen constraints, yavaş disk, parçalı pipe yanıtı ve kurulum testleri dahil.
- 100 karelik yerel HTTP/pipe mikro testinde eski sürüm medyanı 4.28–4.46 ms, aday 4.60–4.87 ms; P95 eski 6.81–7.03 ms, aday 6.64–6.79 ms. CPU sonuçları değişkendi. Bu sonuç belirgin hız kazancı kanıtlamıyor; daha az tam kare kopyası FPS artışı diye sunulmamalı.

Henüz doğrulanmayanlar: oyunda 10 dakika boyunca en az 24 FPS, 60 FPS kaynakta sürekli 60 FPS, oyun içi gerçek servis/tır geçişleri. GPU üzerinde kalan aktarım yeniden tasarımı bu pakete eklenmedi; daha az riskli bu değişiklikler sonrasında hâlâ GPU okuması darboğazsa ayrı prototip gerekir.

## Kurulum sonrası canlı kayıt

Kullanıcı uzantıyı yenileyip video aktarımını yeniden başlattı. Uyarlanabilir çözünürlük 540p'ye indi ve constraints hatası oluşmadı. UTC 20:08:10–20:09:43 arasında, 540p ve tek ekran hedefindeki 38 geçerli örnekte:

| Ölçüm | Sonuç |
| --- | --- |
| Kabine yükleme | 27.5–49.6 FPS, örnek ortalaması 40.8 |
| 24 FPS altında ölçüm penceresi | 0 / 38 |
| Kaynak sayaç hızı | 47.5–60.2 FPS |
| Hazırlama ortalaması | 8.4 ms |
| HTTP gönderme ortalaması | 16.7 ms |
| Pipe onayı P95 örnek ortalaması | 2.4 ms |
| En uzun yardımcıya kare geliş aralığı | 91.7 ms |

Ham kayıt `build/perf-2026-10-28/candidate-0.8.0.jsonl` içinde yereldir. Bunlar yaklaşık 2.5 saniyelik FPS pencereleridir; 0/38 sonucu her bir saniyede veya her bir karede 24 FPS garantisi değildir. Eski/yeni kayıt aynı sahne ve pencere odağı kontrollü A/B testi olmadığından belirli bir yüzde hız artışı iddia edilmez.

Oyun ayarlarında `t_limit_fps_inactive=30`, `t_limit_fps=240`, `r_vsync=1` bulundu; hiçbiri değiştirilmedi. Tarayıcı öne geldiğinde kabinin 30 FPS'e yaklaşması bu sınırla uyumludur; hangi pencerenin önde olduğu kaydedilmedi. Son GPU okuması %65'ti. Yeni aktarım kısa örneklemde hedef aralığında kaldı; sürekli 60 FPS sonucu elde edilmedi.
