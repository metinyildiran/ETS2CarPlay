# ETS2CarPlay

Tarayıcı videolarını Euro Truck Simulator 2 kabinindeki GPS ekranlarına aktarır. Oynatma, kalite, altyazı ve ses dilini Chrome veya Edge üzerinden yönetin. Tam ekran gerekmez; videoyu seçebilir veya alanını elle işaretleyebilirsiniz.

**[Windows paketini indir (ZIP)](https://github.com/metinyildiran/ETS2CarPlay/releases/latest/download/ETS2CarPlay-Windows-x64.zip)** · [Steam Atölye](https://steamcommunity.com/sharedfiles/filedetails/?id=3827251497)

## Kurulum

1. ZIP'i bir klasöre çıkarın. Başarılı kurulumdan sonra ZIP'i ve çıkardığınız klasörü silebilirsiniz.
2. ETS2 kapalıyken **Install.cmd** dosyasını çalıştırın. Oyun klasörü Steam kütüphanelerinden, oyun belgeleri Windows'un Belgeler konumundan otomatik bulunur. Birden fazla kurulum varsa listeden seçim yapılır.
3. Chrome'da `chrome://extensions` veya Edge'de `edge://extensions` sayfasını açın. Geliştirici modunu etkinleştirip **Paketlenmemiş öğe yükle** ile kurucunun gösterdiği `Belgeler\Euro Truck Simulator 2\mod\ETS2CarPlay\Extension` klasörünü seçin. Eski indirme klasöründen yüklenmiş uzantı varsa kaldırıp bu kalıcı klasörden yeniden yükleyin.
4. [Steam Atölye ekran moduna](https://steamcommunity.com/sharedfiles/filedetails/?id=3827251497) abone olun ve oyunun Mod Yöneticisinde etkinleştirin. Eski yerel CarPlay ekran modu varsa devre dışı bırakın.
5. Tarayıcıda video açıp uzantıdan **Kabine aktar** seçin. Video bulunamazsa **Alan seç ve aktar** ile alanını işaretleyin.

Kabin ekranı modu yalnızca Steam Atölye üzerinden kurulur; GitHub ZIP'inde bulunmaz. Video aktarımı için ZIP içindeki oyun eklentisi, yardımcı program ve tarayıcı uzantısı da gereklidir. GitHub'ın kaynak kodu ZIP'i hazır kurulum paketi değildir.

Yardımcı program, uzantı ve kurulum ayarları oyun belgelerindeki `mod\ETS2CarPlay` klasörüne kopyalanır. Sonraki kurulumlar aynı klasörü günceller ve eşleştirmeyi korur. Bu kalıcı klasörü silmeyin; indirme klasörüne ihtiyaç kalmaz.

## Kullanım

Video alanını sekmede tamamen görünür tutup oyuna geçin. Otomatik seçilen videoyu duraklatınca veya aktarımı durdurunca navigasyon geri gelir. Aynı oynatıcıdaki sonraki videoda aktarım devam eder. Elle alan seçiminde navigasyona dönmek için **Aktarımı durdur** kullanın.

Kalite, altyazı, ses dili ve oynatma konumu tarayıcıdaki seçimleri izler. Hesaplar ve çerezler tarayıcıda kalır; seçilen görüntü yalnızca bilgisayarınızdaki oyuna aktarılır.

## Gereksinimler

Windows x64, DirectX 11, ETS2 1.61 ve uyumlu bir dahili GPS ekranı veya GPS aksesuarı gerekir. DRM korumalı içerikler siyah görünebilir. Akıcılık kaynak videoya, tarayıcıya ve sistem yüküne bağlıdır.

[Detaylı kullanım](BROWSER.md) · [Desteklenen tırlar](FLEET.md) · [Konvoy](CONVOY.md) · [Geliştirme ve testler](DEVELOPMENT.md) · [Lisanslar](THIRD_PARTY.md)
