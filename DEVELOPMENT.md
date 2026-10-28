# Geliştirme ve paketleme

Windows x64, Node.js 22+, Visual Studio C++ derleme araçları ve Windows SDK gerekir. Yerel yardımcı Electron tabanlıdır.

```powershell
npm ci --prefix desktop
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-standalone.ps1
```

Gösterge üretimi kendi ETS2 kurulumunuzdan çıkarılmış kaynakları gerektirir. `research/fleet-inventory.json` içindeki `archives` ve `screens[].source` alanları beklenen arşiv ve yolları gösterir. Kaynaklar `research/fleet/<arşiv adı>/` altında hazırlanır. Farklı oyun sürümleri veya DLC kapsamı uyarlama gerektirebilir. Envanter taraması: `node scripts/scan-fleet.cjs`.

Kaynaklar hazır olduğunda:

```powershell
node scripts/build-mod.js
node scripts/build-navigation-mod.js
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-ingame.ps1
node scripts/package-browser.cjs
```

Son adım `dist/browser-0.7.0` üretir ve var olan klasörün üzerine yazmaz. Güncel paketleyici işaret materyallerini `build/mod`, navigasyon arayüzlerini `build/navigation-mod` üzerinden alır. Mevcut eşleşmiş paketin kodunu ve DLL'ini güncellemek için oyun kapalıyken `node scripts/update-browser-package.cjs` çalıştırılır; eşleştirme anahtarları korunur ve değişen dosyalar yedeklenir. Paket hazır olduğunda `Install.cmd` çalıştırılır.

`dist/`, eşleştirme anahtarları, kurulum yedekleri ve çıkarılmış oyun dosyaları depoya dahil değildir. Paketleme her bilgisayar için yeni yerel eşleştirme anahtarı üretir. Aynı paketin `Extension` ve `Player` klasörleri birlikte kullanılmalıdır; `config.json` ve `browser-config.json` paylaşılmamalıdır.

Atölye paketleme ve yayın bilgileri: [WORKSHOP.md](WORKSHOP.md).

## Testler

Oyun varlıkları veya yerel DLL derlemesi gerektirmeyen kontroller:

```powershell
node --test test/installer.test.js test/video-selection.test.js test/capture-worker.test.js test/browser-bridge.test.js
```

Kurulum testleri Windows PowerShell ile ayrı deneme klasörlerinde çalışır; gerçek oyun kurulumunu değiştirmez. İlk kurulum, tekrar kurulum, eksik dosya onarımı, değiştirilmiş dosyaların korunması ve oyun açıkken durma davranışı kontrol edilir. Aktarım testleri video seçimi, iframe koordinatları, kenar boşlukları, duraklama, eski karelerin atılması ve bağlantı kesilmesini kontrol eder. `scripts/probe-video-selection.cjs`, Electron ile gerçek DOM ve video piksellerinde %80/%100/%125 yakınlaştırma, altyazı, alan seçimi ve duraklamayı doğrular.

Tam test komutu `node --test test/*.test.js` şeklindedir. Gösterge testleri çıkarılmış oyun kaynaklarını ve üretilmiş ekran dosyalarını gerektirir. DirectX ve tarayıcı aktarım deneyleri `native/dx11_probe.cpp` ile `scripts/run-browser-probe.cjs` içindedir. Bunlar gerçek oyun geçişlerinin yerine geçmez.

## Kaynaklar ve lisanslar

`browser-extension/` sekme yakalamayı, `desktop/` yerel yardımcıyı, `native/` oyun eklentisini, `scripts/` derleme/kurulumu ve `test/` kontrolleri içerir.

Üçüncü taraf kaynakları ve lisansları [THIRD_PARTY.md](THIRD_PARTY.md) içinde listelenir. Bu proje SCS Software, YouTube veya Apple tarafından sunulan resmi bir ürün değildir.
