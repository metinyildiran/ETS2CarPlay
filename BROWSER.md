**0.6.0 tüm tır güncellemesi:** 26 standart tır modeli için dahili GPS ve takılabilir GPS/telefon/tablet ekranları eklendi; tır değişiminde aynı ekran dokusunun yeniden yüklenmesi düzeltildi. Kapsam, ekransız kabinler ve test sınırları: [FLEET.md](FLEET.md).

**Aktarım iyileştirmesi 0.6.1:** Yakınlaştırırken yalnızca videonun takılması bildirimi üzerine, tarayıcıdaki yazılımsal ölçekleme ve JavaScript piksel dönüşümü yerine GPU canvas + WebCodecs BGRA kopyası kullanılır. Desteklenmeyen tarayıcılarda uyumluluk yolu vardır. Tek gönderim sürerken yalnızca en yeni bekleyen kare tutulur; duraklatma veya video değişiminde devam eden eski dönüşüm gönderilmez. FPS sınırı düşürülmedi.

Yerel 2560×1440 → 1024×512 testinde eski yöntemin iki turun ortanca süreleri 15.9/21.2 ms, yeni yöntemin 4.6/8.0 ms oldu; yüzde 95 süreleri eski 18.0/25.7 ms, yeni 21.9/13.1 ms. Bu, oyun içi yakınlaştırmanın düzeldiğini tek başına kanıtlamaz. 27 otomatik test ve gerçek tarayıcı kare işleyicisi → DirectX renk/altyazı/navigasyon testi geçti. Oyun içi karşılaştırma bekleniyor.

Kurulu eklenti dosyalarını `scripts/update-capture.ps1` günceller ve yedekler. Tarayıcının uzantılar sayfasında **FH6 YouTube Aktarımı** için **Yenile** düğmesine basıp YouTube sekmesinden yeniden **Kabine aktar** seçilmelidir. Oyunu yeniden başlatmak gerekmez. Eşleştirme ayarları korunur.

# FH6 — normal YouTube sekmesinden aktarım (0.5.0 deneysel)

**Gösterge düzeltmesi 0.5.1:** Serviste Enter ile kabin önizlemesi açılırken günlükte `fh6.video.overlay ... already taken` ve gösterge yükleme hatası görüldü. Video öğesi `_nameless._.fh6_video` olarak her gösterge yüklemesine özel hale getirildi. Hem km/h hem mph tanımları ve iki oynatıcı paketinin mod kopyaları düzeltildi. Tarayıcı eklentisi, eşleştirme ve yerel DLL değişmedi. Eski pakette isim çakışmasını yakalayan kontrol, yeni pakette geçiyor; 21 otomatik kontrol başarılı. Oyun içindeki servis geçişi kullanıcı tarafından yeniden doğrulanmalı.

Chrome veya Edge'de normal YouTube videosu açılır. Eklentide **Kabine aktar** seçilince o sekmedeki video alanı FH6 ekranına aktarılır. Tarayıcıdan kalite, altyazı, ses dili, ses seviyesi veya oynatma konumu değiştirildiğinde aynı oynatıcı kullanıldığı için değişiklik kabine de yansır. YouTube hesabı ve çerezler tarayıcıda kalır. Normal YouTube reklamları da aktarılır; eklenti reklam engellemez.

## İlk kurulum

1. ETS2'yi kapatıp proje klasöründeki `Use-Browser.cmd` dosyasını çalıştır. Bu, hazırlanmış tarayıcı paketini kurar; ReShade gerekmez.
2. Chrome'da `chrome://extensions`, Edge'de `edge://extensions` sayfasını aç. **Geliştirici modu** seçeneğini etkinleştir.
3. **Paketlenmemiş öğe yükle** ile `D:\Projects\ETS2CarPlay\dist\browser-0.5.0\Extension` klasörünü seç. Eklentiyi tarayıcı araç çubuğuna sabitle.
4. Oyunu aç. Tarayıcıda normal bir `youtube.com/watch` videosu açıp eklentide **Kabine aktar** düğmesine bas. Giriş yapmak istiyorsan bunu doğrudan YouTube'da yap.
5. Tarayıcıyı ve sekmeyi açık bırakarak oyuna dön. Video alanının tamamını sayfada görünür tut. Başka uygulamanın arkasında çalışması hedeflenir; küçültülmüş pencere davranışı tarayıcıya göre değişebilir.

Aktarım tarayıcı tarafından kullanıcı tıklamasıyla başlatılır; oyun veya tarayıcı yeniden açıldığında tekrar **Kabine aktar** seçilir. Yalnızca seçilen YouTube sekmesine erişilir. YouTube dışına gidildiğinde bağlantı sonlanır. Shorts için videonun normal izleme sayfasını aç.

## Kontroller

Tarayıcıdaki oynatıcı asıl kaynaktır. Kalite menüsü, altyazı ve dil değişiklikleri doğal olarak yansır. Ses, seçilen sekmenin ses akışından bir kez çalınır; ikinci bir YouTube oynatıcısı başlatılmaz. Görüntü yerel bağlantıyla oyun eklentisine gider; internete tekrar yüklenmez.

Ctrl+Alt+Y oyun panelindeki oynat/duraklat, ses, ses dili, altyazı ve bağlantı açma kontrolleri de bağlı sekmeyi yönetir. Yeni bağlantı girilmesi oynatıcı içindeki videoyu değiştirir; tarayıcının adres çubuğu aynı kalabilir. YouTube'un kendi ayar menüsündeki seçimler korunur; eklenti otomatik kalite veya dil seçmez.

Duraklatma, videonun bitmesi, sekmenin kapanması veya aktarımın durdurulması navigasyonu geri getirir. Bağlantı beklenmedik biçimde kesilirse birkaç saniyelik zaman aşımıyla video temizlenir. Sayfayı kaydırıp video alanının bir bölümünü gizlersen görüntü aktarımı bekler; ses YouTube davranışına göre devam edebilir.

Sabit 10 FPS sınırı yoktur: tarayıcıdan gelen kareler işlenir, yakalama üst sınırı 60 FPS'tir. Fiili hız tarayıcı, oyun ve sistem yüküne bağlıdır. Kabin görüntüsü 1024×512'dir; tarayıcıda 4K seçmek kabin ekranını 4K yapmaz. En-boy oranı korunur. Oynatıcı içindeki altyazılar, reklamlar ve açılan ayar menüleri görüntünün parçasıdır.

## Önceki yönteme dönüş

Oyunu kapat, eklentiden aktarımı durdur ve `Update-InGame.cmd` çalıştır. Bu dosya 0.4.2 dahili oynatıcı paketini seçer. `Restore-Previous.cmd` çok daha eski ReShade kurulumunu geri getirdiği için iki yeni mod arasında geçişte kullanılmaz.

Bu paket kişisel bilgisayar içi eşleştirme anahtarı içerir; Google erişim tokeni içermez. Aynı paket içindeki `Extension` ve `Player` birlikte kullanılmalıdır. Tarayıcı eklentisinin gerçek kullanıcı oturumundaki ilk aktarımı ve oyundaki görüntüsü ayrıca doğrulanmalıdır.

Doğrulama: 20 otomatik kontrol geçti. Normal YouTube izleme sayfasında video alanının bulunması, altyazı değişimi ve 25 parçalı videoda ses dili değişimi ayrı sessiz oturumda doğrulandı. Eklentinin kare işleyicisi sentetik video ve altyazı görüntüsünü gerçek DirectX test eklentisine aktardı; duraklatma sonrası şeffaflık ve navigasyona dönüş geçti. Chrome/Edge araç çubuğundan gerçek sekme yakalama ve ETS2 içindeki son görüntü, kullanıcı kurulumundan sonra doğrulanacak; bu testler henüz yapılmış sayılmaz.

Teknik kaynak: [Chrome sekme yakalama](https://developer.chrome.com/docs/extensions/reference/api/tabCapture), [arka planda sekme aktarımı](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture).
