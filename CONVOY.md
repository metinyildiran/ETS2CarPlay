# Konvoy için CarPlay'i kapatma

Mod Yöneticisindeki ekran modunu kapatmak, oyun başlarken yüklenen yerel eklentiyi kapatmaz. Ana klasördeki `Install.cmd` yalnızca kurulum yapar.

Gerekirse oyun kapalıyken proje klasöründe şu bakım komutunu çalıştırın:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/set-carplay-enabled.ps1 -Mode Off
```

Eklenti doğrulanmış bir yedeğe alınır ve oyunun `plugins` klasöründen kaldırılır. Oyunu açıp ekran modunu da kapatın; konvoy oturumunu yeniden oluşturun. Bu durumda video aktarımı ve CarPlay kontrolleri çalışmaz.

Tekrar etkinleştirmek için oyun kapalıyken aynı komutta `-Mode On` kullanın. `Install.cmd` ile tekrar kurulum da eklentiyi etkinleştirir. Tarayıcı eşleştirmesi korunur.

SDK uyarısı tek başına konvoya katılma sorununun nedenini kanıtlamaz. Trafik modu ve konvoy ayarları bu işlemde değiştirilmez. Yedekler `dist/standalone/ConvoyBackups` altında saklanır.
