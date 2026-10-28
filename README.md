# ETS2CarPlay

Tarayıcı videolarını Euro Truck Simulator 2 kabinindeki GPS ekranına aktarır. **ETS2 Video Aktarımı** uzantısı Chrome/Edge'deki HTML5 videolarını bulur; otomatik bulunamayan oynatıcılar için elle alan seçimi sunar. Kalite, altyazı, ses dili ve oynatma konumu tarayıcıdan yönetilir. Otomatik seçilen video duraklatıldığında veya aktarım durduğunda navigasyon geri görünür.

[Steam Atölye](https://steamcommunity.com/sharedfiles/filedetails/?id=3827251497) · [Tarayıcı kullanımı](BROWSER.md) · [Desteklenen tırlar](FLEET.md)

## Kurulum

Ana klasördeki tek çalıştırma dosyası **`Install.cmd`** dosyasıdır. Menü içermez; tarayıcı aktarım paketini doğrudan kurar veya mevcut kurulumu onarır.

1. ETS2'yi ve CarPlay oynatıcısını kapatın.
2. `Install.cmd` dosyasına çift tıklayın. İlk kurulumda oyun ve ETS2 belgeler klasörünü belirtin; mevcut kurulumda kayıtlı yollar kullanılır.
3. Chrome'da `chrome://extensions`, Edge'de `edge://extensions` sayfasını açıp geliştirici modunu etkinleştirin. **Paketlenmemiş öğe yükle** ile proje altındaki `dist/browser-0.7.0/Extension` klasörünü seçin.
4. Oyunun Mod Yöneticisinde CarPlay ekran modunu etkinleştirin. Atölye kopyası kullanılıyorsa yerel `FH6YouTube.scs` kopyasını devre dışı bırakın; iki kopyayı birlikte etkinleştirmeyin.
5. Bir video açıp tarayıcı uzantısından **Kabine aktar** seçin. Birden fazla video varsa listeden seçebilirsiniz. Bulunamayan videolar için **Alan seç ve aktar** ile video bölgesini işaretleyin.

Kurulum dosyası her oyun açılışında çalıştırılmaz. Yardımcı oyunla birlikte başlar. **Ctrl+Alt+Y paneli kaldırılmıştır**; tüm oynatma kontrolleri tarayıcıdadır. Eski 0.5.0 uzantısını devre dışı bırakıp yukarıdaki yeni klasörü yükleyin; aynı klasörde yapılan sonraki güncellemelerde **Yenile** yeterlidir.

**Kaynak kodu deposu:** GitHub'dan indirilen kaynaklar hazır çalıştırılabilir paket içermez. `Install.cmd`, önceden derlenmiş `dist/browser-0.7.0` paketini kullanır; internetten paket indirmez. Bu klasör yoksa aşağıdaki geliştirme adımları gerekir. Steam Atölye de yalnızca ekran bileşenini sağlar; oyun eklentisi, yerel yardımcı ve tarayıcı uzantısı ayrıca kurulmalıdır.

Mevcut kurulumda eksik DLL, oynatıcı ayarı ve ekran modu dosyaları tamamlanır. Var olan dosyalar kurulum kaydından farklıysa üzerlerine yazılmaz. Kurulum kaydı ve yedekleri yerelde tutulur.

## Özellikler ve kapsam

- 26 standart tır modeli için 18 dahili veya aksesuar GPS düzeni.
- Tarayıcıdaki kalite, ses dili, altyazı ve oynatma konumu değişikliklerini yansıtır.
- YouTube dışındaki HTML5 videoları, video listesi ve elle alan seçimi.
- Otomatik seçimde aynı sitedeki sonraki videoya geçişte bağlantıyı koruma ve yenilenen oynatıcıyı yeniden bulma.
- Tam ekran gerektirmeyen kırpma: video sınırları, sayfa yakınlaştırması ve yakalama karesindeki kenar boşlukları hesaba katılır.
- 1024×512 kabin görüntüsü; yakalama üst sınırı 60 FPS. Gerçek hız sisteme ve tarayıcıya bağlıdır.
- Hesaplar ve çerezler tarayıcıda kalır. Seçilen alandaki altyazılar, menüler ve reklamlar da aktarılır; ses seçilen sekmeden gelir.

Video alanı sekmenin görünür bölümünde kalmalıdır. Başka alan adlarından gömülen oynatıcılar otomatik bulunamayabilir; elle alan seçimi kullanılabilir. Elle seçimde duraklama algılanmaz; navigasyona dönmek için **Aktarımı durdur** gerekir. Sayfa kaydırılır veya pencere boyutu değişirse alan yeniden seçilir. DRM korumalı içerikler siyah görünebilir; her site için uyumluluk garantisi yoktur. Ayrıntılar: [BROWSER.md](BROWSER.md).

Windows x64, DirectX 11 ve ETS2 1.61 hedeflenir. Ekransız kabinler uyumlu GPS aksesuarı gerektirir. Üçüncü taraf tır/ekran modları ve bütün servis/konvoy geçişleri doğrulanmış değildir. Ayrıntılar: [FLEET.md](FLEET.md), [CONVOY.md](CONVOY.md).

Bileşen sürümleri: gösterge **0.6.3**, yerel oyun eklentisi ve tarayıcı yardımcısı **0.7.0**, tarayıcı uzantısı **0.7.1**. Önceki sürümdeki yükleme çökmesinin düzeldiği kullanıcı tarafından 25 Ekim 2026 tarihinde doğrulandı; 0.7.x'in gerçek oyun içi doğrulaması ayrıca yapılmalıdır.

## Geliştirme ve paketleme

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

Atölye paketleme ve yayın bilgileri: [WORKSHOP.md](WORKSHOP.md). Eski panel hakkında: [INGAME.md](INGAME.md).

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
