# Steam Atölye

[ETS2CarPlay - YouTube GPS Screens (External Plugin Required)](https://steamcommunity.com/sharedfiles/filedetails/?id=3827251497)

- Öğe kimliği: `3827251497`, oyun: ETS2 (`227300`).
- İlk yayın: 25 Ekim 2026, gösterge sürümü 0.6.3, görünürlük Public.
- Bu paket yalnızca gösterge/UI bileşenidir. Video için harici Windows x64 DirectX 11 DLL'si, Electron yardımcısı ve Chrome/Edge uzantısı ayrıca kurulmalıdır. GitHub deposu henüz hazır ikili kurulum sürümü sunmaz.
- Yerel `FH6YouTube.scs` ve Atölye kopyası birlikte etkinleştirilmemelidir.
- Kullanıcı son yükleme çökmesinin düzeldiğini doğruladı; bu bütün tır/servis/konvoy geçişlerinin doğrulandığı anlamına gelmez.

## Paketleme

Gösterge kaynakları hazırlanıp `build/navigation-mod` üretildikten sonra:

```powershell
node scripts/package-workshop.cjs
```

SCS Workshop Uploader'a `dist/workshop-0.6.3/content` klasörü ve `dist/workshop-0.6.3/preview.jpg` verilir. Açıklama ve sürüm notu aynı üst klasörde üretilir. Kapak ve oyun içi simge kaynakları `assets/workshop/` altındadır.

`versions.sii`, 1.61 için `ets2_161` paketini seçer. Diğer sürümlerde yalnızca bilgi içeren `unsupported` paketi kullanılır. DLC ekranları kendi `dlc_*` bölümlerine ayrılmıştır; ortak materyal ve temel oyun ekranları `base` altında bulunur. Bu yapı farklı DLC sahipliklerinde gereksiz ekran tanımları yüklemez.

Yayından önce 18 ekranın test edilmiş 0.6.3 çıktısıyla birebir aynı olduğu kontrol edildi. Altı gösterge/oynatma testi ve SCS Workshop Uploader 1.61.2 paket doğrulaması geçti. İlk doğrulamada istenen evrensel bilgi paketi eklendi; son paket doğrulaması hatasız tamamlandı.

Sonraki güncellemelerde yeni öğe oluşturmak yerine yukarıdaki mevcut Atölye öğesi seçilmelidir. Paket içinde DLL, çalıştırılabilir dosya, hesap bilgisi veya eşleştirme anahtarı yoktur.
