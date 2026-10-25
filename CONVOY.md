# Konvoy için CarPlay'i kapatma

Mod yöneticisindeki ekran modunu kapatmak, `FH6Standalone.dll` SDK eklentisini kapatmaz. DLL, oyun açılırken ayrıca yüklenir.

1. ETS2'yi tamamen kapat.
2. `Convoy-Mode.cmd` çalıştır. CarPlay DLL'si doğrulanmış bir yedeğe alınır ve oyunun `plugins` klasöründen kaldırılır.
3. Oyunu aç; mod yöneticisinde CarPlay ekran modu kapalı olsun. Konvoy oturumunu yeniden oluştur.

Bu durumda video aktarımı ve oyun içi CarPlay kontrolleri çalışmaz. Geri açmak için oyun kapalıyken `Enable-CarPlay.cmd` çalıştır, ardından ekran modunu etkinleştir. Tarayıcı eşleştirmesi korunur. CarPlay kurulum/güncelleme betikleri DLL'yi yeniden yükler.

SDK uyarısı eklenti yüklendiğini belirtir; tek başına konvoya katılma hatasının nedeni olduğunu kanıtlamaz. SDK kapalıyken katılma sorunu sürerse arkadaşın katılma ekranındaki tam hata metni gerekir. Trafik modu veya konvoy ayarları bu işlemde değiştirilmez.

Yedekler `dist/standalone/ConvoyBackups` içindedir. Kurulum kaydı hangi yedeğin etkinleştirileceğini tutar.
