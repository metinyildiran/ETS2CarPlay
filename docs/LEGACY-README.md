**0.6.0 tüm tır güncellemesi:** 26 standart tır modeli için dahili GPS ve takılabilir GPS/telefon/tablet ekranları eklendi; tır değişiminde aynı ekran dokusunun yeniden yüklenmesi düzeltildi. Kapsam, ekransız kabinler ve test sınırları: [FLEET.md](../FLEET.md).

# Volvo FH6 — yalnızca YouTube

**Tarayıcı modu 0.5.0 ve gösterge düzeltmesi 0.5.1 kurulu:** Normal Chrome/Edge YouTube sekmesini mevcut kalite, altyazı ve ses diliyle kabine aktarır. 0.5.1, servis ekranında kabin yeniden yüklenirken video katmanının adının çakışmasını giderir. Eklentide Kabine aktar seçilir; hesap oturumu tarayıcıda kalır. [Kurulum ve kullanım](../BROWSER.md). `Use-Browser.cmd` oyunun kapalı olmasını gerektirir. Dahili oynatıcıya dönüş `Update-InGame.cmd` ile yapılır.

**0.4.2:** Oyun paneline altyazı aç/kapat düğmesi eklendi; gerçek YouTube videosunda iki yönlü değişiklik doğrulandı. Ses dili seçimi, videonun hızına göre aktarım ve duraklatınca navigasyona dönüş korunuyor. 18 otomatik test geçti. Hesap bağlama veya tarayıcı eklentisi yok. Kullanım: [INGAME.md](../INGAME.md).

**0.4 deneysel:** Ctrl+Alt+Y ile oyun içi kontrol paneli, otomatik arka plan oynatıcısı, süreli link desteği ve DirectX 11.1 doku algılama düzeltmesi. [Kurulum ve kullanım](../INGAME.md). 13 otomatik test, gerçek DirectX panel çizimi ve oyun paneli üzerinden duraklat/devam iletişimi geçti; ETS2 içindeki son doğrulama bekleniyor. ReShade oyun klasöründen temizlendi.

0.2.1'in oyun içinde çalıştığı kullanıcı tarafından doğrulandı. Yeni **0.3.0 deneysel** sürüm ayrı tarayıcı ve ReShade gerektirmez; video yokken navigasyonu korur ve sabit 10 FPS sınırını kaldırır. Yeni sürümün kurulumu, kullanımı ve doğrulama sınırları: [STANDALONE.md](../STANDALONE.md). Aşağıdaki bilgiler eski 0.2.1 sürümüne aittir.

## 0.2.0 kuruluysa güncelleme

ETS2'yi kapatıp `Update.cmd` çalıştır, ardından oyunu tekrar aç. Bu işlem yalnızca bizim eklentimizi yedekleyerek günceller; ReShade'i yeniden kurmak, mod dosyasını veya tarayıcı oynatıcısını değiştirmek gerekmez.

0.2.1, işaret dokusunu ilk oluşturulmanın yanı sıra sonradan yükleme (`UpdateSubresource`), yazma (`Map/Unmap`) ve tam doku kopyalama yollarında da takip eder. Sadece imzası doğrulanmış kaynaklar video hedefi olur. Tanı bilgileri `ReShade.log` içine `FH6CarPlay 0.2.1` önekiyle yazılır.

Gerçek DX11/ReShade kullanan ayrı, görünmeyen bir test programında eski sürümün sonradan yükleme ve ara doku kopyasında başarısız olduğu yeniden üretildi. Yeni sürüm ilk veri, sonradan yükleme ve ara doku kopyasında başarılı; ilgisiz aynı boyuttaki doku değişmeden kaldı. Bu test oyun motorunun aynı yolu kullandığını tek başına kanıtlamaz; yeni sürümle FH6 kabin testi hâlâ gereklidir.

## Kullanım

1. Oyundan çıktıktan sonra [resmi ReShade sitesinden](https://reshade.me/) **full add-on support** sürümünü ETS2'nin `bin/win_x64/eurotrucks2.exe` dosyası için, DirectX 11 seçerek kur. Mevcut ReShade/başka grafik eklentisi varsa onu incelemeden üzerine başka grafik DLL'si kopyalama. Bu proje ReShade DLL'si dağıtmaz veya otomatik değiştirmez.
2. `Install.cmd` dosyasını çalıştır. Betik yalnızca `FH6CarPlay.addon64` ve `FH6YouTube.scs` dosyalarını kopyalar; ETS2 açıkken ve hedef dosyalar zaten varsa durur. Oyun/Belgeler yolu farklıysa `scripts/install.ps1` içindeki parametrelerle çalıştır.
3. ETS2 Mod Yöneticisinde **FH6 YouTube - Experimental** modunu etkinleştir. ReShade eklenti listesinde **FH6 YouTube Screen** görünmeli. Bu mod FH6'nın orta GPS ekranını değiştirir. Başka FH6 ekran modlarıyla çakışabilir.
4. Eski oynatıcı sunucun açıksa onu kapat; `Start-Player.cmd` ile güncel sunucuyu başlat. Chrome veya Edge'de `http://127.0.0.1:32126` adresini aç. Node.js 22+ gerekir; bu bilgisayarda mevcut.
5. YouTube videosunu aç. **Kabine aktar** düğmesine basıp tarayıcının paylaşım penceresinde **bu oynatıcı sekmesini** seç. Uygulama seçilen sekmeyi yalnızca video alanına kırpar; farklı sekme seçimi desteklenmez. Sistem sesi yakalanmaz; video sesi tarayıcıdan çalar. Tarayıcıyı kapatma.
6. Sayfa “FH6 ekran dokusu bağlı” diyorsa eklenti özel ekran dokusunu bulmuştur. Görüntünün gerçekten kabin içinde doğru görünmesi oyun içinde ayrıca kontrol edilmeli. Video kontrolleri bu sürümde tarayıcıdadır; kabin ekranına fareyle tıklama uygulanmadı.

Kurulum için oyunu kapatmak gerekiyor; tarayıcıdaki **Kabine aktar** düğmesi tek başına oyuna eklenti kurmaz.

## Durum ve hata ayıklama

- **Oyun eklentisi bekleniyor:** ReShade full add-on sürümünü ve eklenti listesini kontrol et; sunucu 32126 portunda olmalı.
- **FH6 ekran dokusu henüz bulunamadı:** Modu etkinleştir, FH6 kabinine geç. Çakışan ekran modlarını kontrol et. `ReShade.log` içinde `FH6CarPlay: unique screen marker found.` satırı aranabilir.
- **Güncel Chrome veya Edge ile aç:** Sekme yakalama/kırpma API'si tarayıcıda desteklenmiyor.
- Eklenti ekranı bulamazsa başka dokulara tahmini olarak yazmaz. SCS'nin format/mipmap dönüşümü veya UI dokusunu önbelleklemesi henüz oyun içinde sınanmadı. Tanı günlüğü bu ayrımı yapmaya yardımcı olur.
- Hedef aktarım en fazla yaklaşık 10 FPS, 1024×512 RGBA. Kareler yalnızca RAM'de ve bilgisayar içindeki bağlantıda tutulur. Disk üzerine video kaydedilmez. Sekme kapanır/aktarım durursa ekran birkaç saniye içinde siyaha döner.
- YouTube gömme kısıtları aynen geçerlidir. Ses susturma/oynatma kısıtları aşılmaz.

## Kaldırma

Önce ETS2 Mod Yöneticisinde bu modu devre dışı bırak; oyundan çık. Kurulan `FH6CarPlay.addon64` ve `FH6YouTube.scs` dosyalarını kaldır. FH6'nın standart GPS arayüzü geri gelir. Diğer grafik eklentilerine veya ReShade dosyalarına dokunma.

## Geliştirme ve test

- `node scripts/build-mod.js`: bize ait DDS işaret dokusu, TOBJ, materyal ve iki FH6 GPS arayüzü üretir. SCS'nin orijinal grafik varlıkları pakete dahil edilmez.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-native.ps1`: x64 C++ eklentisini ve izole test programlarını derler. Visual Studio C++ araçları gerekir.
- `node --test`: URL, HTTP erişim, kare boyutu, durdurma, zaman aşımı, doku biçimi ve derlenmiş yerel alıcı testleri.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package.ps1`: `.scs` ve dağıtım ZIP paketi üretir.

8 otomatik test ve C++ protokol testi geçti. Yerel HTTP sunucusundan gerçek derlenmiş C++ alıcısına piksel aktarımı doğrulandı. Arayüz gizli önizlemede görüntülendi. Tarayıcının paylaşım penceresi ve gerçek ETS2/ReShade render yolu henüz uçtan uca denenmedi. Çalışan oyuna debugger, DLL veya hook bağlanmadı.

## Mimari

YouTube iframe → kullanıcı onaylı sekme yakalama → yalnızca oynatıcı alanını kırpma → RAM'deki son RGBA kare → localhost HTTP → ReShade eklentisinin arka plan alıcısı → yalnızca özel işaretli FH6 dokusu.

Eklenti sadece DX11'de çalışır. Doku hem boyut/format hem 16 piksellik imzayla doğrulanır; aynı boyuttaki gösterge paneli seçilmez. Güncellemeler çizim iş parçacığında `write_discard` ile yapılır; ağ beklemeleri ayrı iş parçacığındadır. Kaynak yok edildiğinde hedef listeden çıkarılır.

ReShade başlıkları: upstream `crosire/reshade` v6.7.3, API 18; lisans `vendor/reshade/LICENSE.md`. ReShade runtime ayrıca resmi sitesinden kurulur.

## Kaynaklar

- https://reshade.me/
- https://github.com/crosire/reshade/tree/v6.7.3/include
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- https://developers.google.com/youtube/iframe_api_reference
- Yerel FH6 ekran incelemesi: `research/FH6.md`.
