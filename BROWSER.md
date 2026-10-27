# Tarayıcıdan kabine video aktarımı

Chrome veya Edge'de normal bir YouTube videosu açın. Uzantıda **Kabine aktar** seçildiğinde video alanı desteklenen kabin ekranlarına aktarılır. Kalite, altyazı, ses dili ve oynatma konumu değişiklikleri aynı oynatıcıdan oyuna yansır. Hesap ve çerezler tarayıcıda kalır; normal YouTube reklamları da aktarılır.

## Kurulum ve kullanım

1. ETS2 kapalıyken proje kökündeki `Install.cmd` dosyasını çalıştırın. Hazır yerel paket gerekir; eksikse [README](README.md) içindeki geliştirme adımlarına bakın.
2. Chrome'da `chrome://extensions`, Edge'de `edge://extensions` açın. Geliştirici modunda **Paketlenmemiş öğe yükle** ile `dist/browser-0.5.0/Extension` klasörünü seçin.
3. Oyunda CarPlay ekran modunu etkinleştirin. Yerel mod ve Atölye kopyasını aynı anda etkinleştirmeyin.
4. Normal bir `youtube.com/watch` sayfasında uzantıdan **Kabine aktar** seçin. Tarayıcıyı ve sekmeyi açık bırakın.

Oyun veya tarayıcı yeniden açıldığında tekrar **Kabine aktar** seçilir. YouTube dışına gidilirse bağlantı sonlanır. Shorts için normal izleme sayfasını kullanın. Video alanını sayfada görünür tutun; küçültülmüş tarayıcı penceresinin davranışı tarayıcıya bağlıdır.

## Kontroller

Tarayıcı oynatıcısı asıl kaynaktır. Oyunda **Ctrl+Alt+Y** paneli de bağlı sekmenin oynatma, ses, dil, altyazı ve bağlantı kontrollerini yönetir. Yeni bağlantı girildiğinde video değişebilir; tarayıcı adres çubuğu aynı kalabilir.

Duraklatma, videonun bitmesi, sekmenin kapanması veya aktarımın durması navigasyonu geri getirir. Beklenmedik bağlantı kesilmesinde video birkaç saniyelik zaman aşımıyla temizlenir. Görüntü bilgisayar içindeki bağlantıdan geçer, internete tekrar yüklenmez.

Kabin görüntüsü 1024×512, yakalama üst sınırı 60 FPS'tir. Gerçek hız sistem yüküne bağlıdır; tarayıcıda 4K seçmek kabin ekranını 4K yapmaz. Altyazılar, reklamlar ve video üzerinde açılan ayar menüleri aktarılan görüntünün parçasıdır.

## Güncelleme

Hazır paket güncellendikten sonra oyun kapalıyken `Install.cmd` yeniden çalıştırılır. Uzantı dosyaları değiştiyse tarayıcının uzantılar sayfasında **Yenile** seçip aktarımı yeniden başlatın. Aynı paketin `Extension` ve `Player` klasörlerini birlikte kullanın; yerel eşleştirme ayarlarını paylaşmayın.

Tır kapsamı ve test sınırları: [FLEET.md](FLEET.md).
