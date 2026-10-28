# Tarayıcıdan kabine video aktarımı

**ETS2 Video Aktarımı**, seçtiğiniz Chrome/Edge sekmesindeki video alanını ETS2 kabin ekranına yansıtır. YouTube'a özel değildir: erişilebilir HTML5 videolarını otomatik bulur. Otomatik bulunamayan gömülü oynatıcılar veya canvas tabanlı yayınlar için **Alan seç ve aktar** kullanılabilir.

## Kurulum ve kullanım

1. ETS2 kapalıyken proje kökündeki `Install.cmd` dosyasını çalıştırın. Hazır yerel paket gerekir; geliştirme adımları [README](README.md) içinde.
2. Chrome'da `chrome://extensions`, Edge'de `edge://extensions` açın. Geliştirici modunda **Paketlenmemiş öğe yükle** ile `dist/browser-0.7.0/Extension` klasörünü seçin.
3. Oyunda CarPlay ekran modunu etkinleştirin. Yerel mod ve Atölye kopyasını aynı anda etkinleştirmeyin.
4. Tarayıcıda videoyu açıp oynatın. Eklentiden **Kabine aktar** seçin. Varsayılan olarak görünür ve oynayan en büyük video seçilir; birden fazla video varsa listeden seçim yapabilirsiniz.
5. Video bulunamazsa **Alan seç ve aktar** düğmesine basın, sayfada video bölgesini sürükleyerek işaretleyin. Esc ile iptal edebilirsiniz.

Tam ekran gerekmez. Otomatik seçim videonun kendi sınırlarını izler; sayfanın altındaki veya sağındaki içerik kırpılır. Yakalama karesindeki kenar boşlukları ve sayfa yakınlaştırması hesaba katılır. Video bölgesi sekmenin görünür alanında tamamen kalmalıdır. Sekmeyi açık bırakıp oyuna geçebilirsiniz; tarayıcıyı küçültmenin davranışı tarayıcıya bağlıdır.

## Kontroller ve navigasyon

Ctrl+Alt+Y paneli kaldırılmıştır; oyun klavye ve fare girişleri yakalanmaz. Oynatma, kalite, ses, dil ve altyazı kontrollerini doğrudan tarayıcıdaki oynatıcıdan kullanın. Mevcut oynatma konumu korunur; aktarım videoyu yeniden başlatmaz.

Otomatik video seçiminde duraklatma veya videonun bitmesi navigasyonu geri getirir. Aynı oynatıcı alanında sonraki video başladığında aktarım otomatik devam eder; video öğesi yenilense de bağlantı korunur. Otomatik seçim modu aynı sitedeki sayfa geçişlerinde videoyu yeniden bulur. Geçişte video henüz hazır değilse navigasyon görünür. Duraklatılan video yerine yan taraftaki başka bir oynatıcıya geçilmez. Farklı bir siteye gidildiğinde yeniden **Kabine aktar** seçin. Listeden belirli bir video seçtiyseniz tam sayfa yenilemesinden sonra tekrar seçim yapın.

**Elle alan seçiminde oynatma durumu bilinmez:** duraklatılmış görüntü de aktarılır. Navigasyona dönmek için **Aktarımı durdur** seçin. Kaydırma, pencere boyutu veya yakınlaştırma değişirse alan aktarımı durur; alanı yeniden seçin.

Sekmenin kapanması veya aktarımın durdurulması navigasyonu geri getirir. Beklenmedik bağlantı kesilmesinde görüntü birkaç saniyelik zaman aşımıyla temizlenir.

## Kapsam ve sınırlar

- Tarayıcının tamamı veya masaüstü paylaşılmaz. Seçilen sekme yakalanır, yalnızca seçilen video/alan bilgisayardaki oyun bağlantısına gönderilir.
- Altyazılar, reklamlar ve video üzerine açılan menüler seçilen alan içindeyse görünür. Ses seçili sekmeden gelir; aynı sekmedeki diğer sesler de duyulabilir.
- Başka alan adından yüklenen iframe videoları ve kapalı shadow DOM oynatıcıları otomatik bulunamayabilir; alan seçimi kullanılabilir. Bu işlem ek sitelere sürekli erişim izni istemez.
- DRM ile korunan içerikler tarayıcı tarafından siyah gösterilebilir. Her site ve oynatıcı için uyumluluk garantisi yoktur.
- Yerel video dosyaları için tarayıcının uzantı ayarlarındaki dosya URL'lerine erişim izni gerekebilir. Dahili tarayıcı sayfaları desteklenmez.
- Kabin görüntüsü 1024×512'dir. 0.7.3 sekmeyi en fazla 1920×1080 yakalar ve 60 FPS ister; gerçek hız kaynak videoya, tarayıcıya ve sistem yüküne bağlıdır.
- Hesap, oturum ve çerezler tarayıcıda kalır. Görüntü internete tekrar yüklenmez.

## Güncelleme

Hazır paket güncellendikten sonra oyun kapalıyken `Install.cmd` yeniden çalıştırılır. 0.5.0 klasöründeki eski uzantıyı kullanıyorsanız devre dışı bırakıp **Paketlenmemiş öğe yükle** ile yeni `dist/browser-0.7.0/Extension` klasörünü seçin. Aynı klasörde yapılan sonraki güncellemelerde **Yenile** yeterlidir. Aynı paketin `Extension` ve `Player` klasörlerini birlikte kullanın; yerel eşleştirme ayarlarını paylaşmayın.

Tır kapsamı ve test sınırları: [FLEET.md](FLEET.md).
