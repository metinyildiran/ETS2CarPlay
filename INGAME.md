# FH6 YouTube — oyun içi kontroller (0.4.2 deneysel)

Oyunu aç. **Ctrl+Alt+Y** ile YouTube panelini açıp kapat. Bağlantıyı yapıştır, **Aç** düğmesine bas. Oynat, Duraklat, Ses, Ses dili ve Altyazı kontrolleri aynı panelde bulunur. Duraklatınca navigasyon görünür; ayrı bir navigasyona dön düğmesi yoktur. Panelde FPS/aktarım/doku sayaçları gösterilmez. Ayrı oynatıcı penceresi açmak veya sekme paylaşmak gerekmez. Panel açıkken klavye ve fare girişleri oyun kontrollerinden ayrılır; panel kapatılınca geri verilir.

**Ses dili:** Video yüklendikten sonra sunulan ses parçaları listelenir. Çok dilli videolarda menüden seçim yapılabilir; ek ses parçası sunmayan videolarda menü pasiftir. Ses parçası seçimi mevcut YouTube oynatıcısının sunduğu, genel iframe API'sinde belgelenmeyen işlevleri koşullu kullanır. YouTube bu işlevleri değiştirirse menü kullanılamayabilir; olmayan diller uydurulmaz. Gerçek bir çok dilli videoda 25 dilin listelenmesi ve parça değişikliği onayı sessiz bir testte doğrulandı.

**Altyazı:** Ses dili menüsünün altındaki düğme, YouTube oynatıcısının altyazısını açar veya kapatır. Düğme gerçek duruma göre “Altyazıyı aç” / “Altyazıyı kapat” gösterir; seçenek yokken pasiftir. YouTube'un seçili altyazı dili korunur. Bu özellik hesap girişi gerektirmez. YouTube arayüzü değişirse kontrolün uyarlanması gerekebilir.

**Hesap ve reklam:** Bu uygulama Chrome/Edge hesabını veya çerezlerini aktarmıyor; hesap giriş arayüzü yok. Oynatıcı kendi ayrı profilini kullanır. YouTube'un gömülü video reklamları çıkabilir; uygulama reklam engellemez. [YouTube reklam açıklaması](https://support.google.com/youtube/answer/132596?hl=tr).

YouTube motoru oyunla birlikte görünmeden başlar ve oyun kapandığında kapanır. Bu bir web motoru içerir ve arka planda yardımcı süreçleri vardır; tamamen `.scs` dosyasından oluşan bir mod değildir. ReShade kullanılmaz. Video durunca veya oynatıcı bağlantısı kesilince görüntü katmanı şeffaflaşır; orijinal FH6 navigasyonu altta korunur.

Bağlantıdaki başlangıç süreleri korunur: `?t=90`, `?t=1m30s`, `?start=90`, `#t=1m30s`. Süre YouTube'un resmi `loadVideoById({videoId,startSeconds})` çağrısına gönderilir. YouTube videoyu en yakın anahtar kareden başlatabilir. Canlı yayınlarda zaman davranışı YouTube'a bağlıdır.

FPS, video zamanlamasına göre ölçülüp ayarlanır; sabit 10 FPS sınırı yoktur. Görünen hız oyun FPS'i ve sistem kapasitesiyle sınırlıdır.

## 0.3'ten güncelleme

ETS2'yi ve eski FH6 oynatıcı penceresini kapat, proje kökündeki `Update-InGame.cmd` dosyasını çalıştır. Sonra yalnızca oyunu aç. `FH6Player.ini`, arka plan oynatıcısının proje içindeki konumunu saklar; `dist/ingame-0.4.2/Player` klasörünü taşırsan bu yol da güncellenmelidir. Önceki sürüme dönüş için proje kökündeki `Restore-Previous.cmd` kullanılabilir; bu işlem eski ReShade tabanlı 0.2.1 kurulumunu geri yükler.

## Görüntü düzeltmesi ve doğrulama

0.3'te `UpdateSubresource1` yolu izlenmiyordu. Ayrı gerçek DirectX testinde bu yolun işaret dokusunu kaçırdığı yeniden üretildi; 0.4'te düzeltildi. `CopySubresourceRegion1` ve `Present1` yolları da desteklenir. Eklenti oyun günlüğüne `FH6 0.4` önekiyle doku, çizim ve yazma sayılarını kaydeder.

Testler ayrı süreçler ve ayrı iletişim kanalları kullanır; açık ETS2 oturumuna bağlanmaz. Panel görünmeyen bir DirectX penceresinde çizilip gerçek piksel çıktısı kontrol edilir. Link süresinin YouTube API çağrısına ulaşması ayrıca test edilir. Oyun içindeki son görsel doğrulama ve ETS2'nin gerçek giriş sistemiyle panel kontrolü kullanıcı oturumunda yapılmalıdır.

Başvuru: [YouTube iframe API](https://developers.google.com/youtube/iframe_api_reference), [DirectX UpdateSubresource1](https://learn.microsoft.com/en-us/windows/win32/api/d3d11_1/nf-d3d11_1-id3d11devicecontext1-updatesubresource1), [Dear ImGui](https://github.com/ocornut/imgui/tree/v1.93.0).
