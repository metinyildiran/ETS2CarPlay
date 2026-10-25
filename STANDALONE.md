# FH6 YouTube + Navigasyon — 0.3.0 deneysel

ReShade ve ayrı Chrome/Edge penceresi gerektirmez. YouTube, küçük oynatıcı uygulamasının içindeki Chromium motorunda açılır; bu sürüm tamamen web motorundan bağımsız değildir. Sekme paylaşımı gerekmez. Video indirilmez veya diske kaydedilmez.

## Kullanım

1. ETS2 kapalıyken `Install-Standalone.cmd` çalıştır. Kurulum, eski ReShade çalışma dosyasını ve FH6 eklentisini yedekler. ReShade efektleri yeni kurulumda çalışmaz; ayarları silinmez.
2. `Start-Standalone.cmd` ile oynatıcıyı aç ve YouTube bağlantısını gir.
3. ETS2'yi DirectX 11 ile aç. Oyun SDK eklentisi bildirimi gösterebilir. Önceden etkin olan `FH6YouTube.scs` aynı dosya adıyla güncellenir; Mod Yöneticisinde adı **FH6 YouTube + Navigation** olur. İkinci bir kopyasını etkinleştirme.
4. FH6 kabininde video oynatıldığında orta ekranda görünür. Video yoksa, duraklatılırsa, biterse, yükleniyorsa veya hata verirse orijinal navigasyon altta çalışmaya devam eder. **Navigasyona dön** videoyu durdurur. Oynatıcı kapanırsa bağlantı kesildiğinde; kilitlenirse yaklaşık iki saniye içinde video katmanı temizlenir.

Ses oynatıcıdan gelir. Ses düzeyi ve oynatma düğmeleri oynatıcı penceresindedir; kabin ekranına fareyle basarak kontrol henüz uygulanmadı. İnternet ve YouTube'un videoyu gömülü oynatmaya izin vermesi gerekir.

## Akıcılık

Sabit 10 FPS sınırlaması kaldırıldı. Yeni kareler hazır oldukça aktarılır; kuyruk büyütmek yerine en güncel kare tutulur. Oynatıcı, video zamanlamasını ölçerek görüntüleme hızını buna uyarlar (örneğin 24, 25, 29.97, 50 veya 60 FPS). Ölçüm alınamıyorsa başlangıç sınırı 60 FPS'tir. Oyun içindeki görünen hız, oyunun FPS'i ve sistemin yetişebildiği hızla sınırlıdır; her video karesinin mutlaka gösterileceği garanti edilmez.

Panelde kaynak, aktarım ve dokuya yazma hızları ayrı gösterilir. Dokuya yazma sayısı birden fazla hedef varsa bunların toplamıdır. Kaynak FPS ölçümü birkaç saniye sürebilir.

## Geri dönüş

ETS2'yi ve yeni oynatıcıyı kapatıp `Restore-Previous.cmd` çalıştır. Kurulumda alınan yedeklerden eski ReShade, FH6 eklentisi ve mod geri yüklenir. Sonradan değiştirilmiş dosyalar varsa işlem durur. Eski sürüm için proje kökündeki `Start-Player.cmd` kullanılır.

## Doğrulama ve sınırlar

- 0.2.1'in oyun içinde çalıştığı kullanıcı tarafından doğrulandı.
- 0.3, ReShade yüklenmeyen ayrı bir gerçek DirectX 11 testinde ilk yükleme, sonradan yükleme ve ara doku kopyalama yollarından geçti; ilgisiz doku değişmedi.
- Gizli oynatıcıdan gerçek yerel eklentiye sentetik görüntü aktarımında 239 FPS tepe aktarım ve yaklaşık 60 FPS doku yazımı ölçüldü. Bu, 239 FPS YouTube oynatımı ölçümü değildir; 10 FPS engelinin kalktığını gösterir.
- Aynı testte oynatıcı kapanınca dokunun tamamen şeffaflaştığı doğrulandı. Orijinal navigasyon öğelerinin modda korunduğu ayrıca kontrol edildi.
- 24/25/29.97/50/60 FPS zamanlama örnekleri dahil 11 otomatik test geçti. Gerçek YouTube videosu ve yeni navigasyon katmanının ETS2 içindeki son görsel kontrolü henüz yapılmadı.
- Windows x64, DirectX 11 ve FH6'nın bu projede incelenen ETS2 1.61 ekranı hedeflenir. Başka kabin ekranı modlarıyla çakışabilir.

## Geliştirme

`scripts/build-standalone.ps1` yerel eklentiyi derler. `scripts/package-standalone.ps1` oynatıcıyı ve mod dosyasını paketler. `node --test` bir gizli DirectX/oynatıcı testi de çalıştırır; yaklaşık 25 saniye sürer. Derleme için Visual Studio C++ araçları gerekir. Dağıtılan oynatıcı için ayrıca Node kurulması gerekmez.

Mimari: YouTube iframe → uygulama içindeki görünmeyen oynatma yüzeyi → RAM'de BGRA kare → yerel named pipe → SCS SDK üzerinden yüklenen DirectX 11 eklentisi → sadece imzası doğrulanmış şeffaf video katmanı. Orijinal navigasyon altta korunur. MinHook ve SCS SDK lisansları pakette bulunur; Electron/Chromium lisansları Player klasöründedir.

Başvuru: [SCS Telemetry SDK](https://modding.scssoft.com/wiki/Documentation/Engine/SDK/Telemetry), [Electron offscreen rendering](https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering), [YouTube iframe API](https://developers.google.com/youtube/iframe_api_reference).
