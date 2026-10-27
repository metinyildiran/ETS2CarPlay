# ETS2CarPlay

YouTube videolarını Euro Truck Simulator 2 kabinindeki GPS ekranına aktarır. Chrome/Edge'de kalite, altyazı, ses dili veya oynatma konumu değiştiğinde aynı görüntü oyuna yansır. Video duraklatıldığında veya aktarım durduğunda navigasyon geri görünür.

[Steam Atölye](https://steamcommunity.com/sharedfiles/filedetails/?id=3827251497) · [Tarayıcı kullanımı](BROWSER.md) · [Desteklenen tırlar](FLEET.md)

## Kurulum

Ana klasördeki tek çalıştırma dosyası **`Install.cmd`** dosyasıdır. Menü içermez; tarayıcı aktarım paketini doğrudan kurar veya mevcut kurulumu onarır.

1. ETS2'yi ve CarPlay oynatıcısını kapatın.
2. `Install.cmd` dosyasına çift tıklayın. İlk kurulumda oyun ve ETS2 belgeler klasörünü belirtin; mevcut kurulumda kayıtlı yollar kullanılır.
3. Chrome'da `chrome://extensions`, Edge'de `edge://extensions` sayfasını açıp geliştirici modunu etkinleştirin. **Paketlenmemiş öğe yükle** ile proje altındaki `dist/browser-0.5.0/Extension` klasörünü seçin.
4. Oyunun Mod Yöneticisinde CarPlay ekran modunu etkinleştirin. Atölye kopyası kullanılıyorsa yerel `FH6YouTube.scs` kopyasını devre dışı bırakın; iki kopyayı birlikte etkinleştirmeyin.
5. Normal bir YouTube videosu açıp tarayıcı uzantısından **Kabine aktar** seçin.

Kurulum dosyası her oyun açılışında çalıştırılmaz. Yardımcı oyunla birlikte başlar; oyun içi kontroller **Ctrl+Alt+Y** ile açılır.

**Kaynak kodu deposu:** GitHub'dan indirilen kaynaklar hazır çalıştırılabilir paket içermez. `Install.cmd`, önceden derlenmiş `dist/browser-0.5.0` paketini kullanır; internetten paket indirmez. Bu klasör yoksa aşağıdaki geliştirme adımları gerekir. Steam Atölye de yalnızca ekran bileşenini sağlar; oyun eklentisi, yerel yardımcı ve tarayıcı uzantısı ayrıca kurulmalıdır.

Mevcut kurulumda eksik DLL, oynatıcı ayarı ve ekran modu dosyaları tamamlanır. Var olan dosyalar kurulum kaydından farklıysa üzerlerine yazılmaz. Kurulum kaydı ve yedekleri yerelde tutulur.

## Özellikler ve kapsam

- 26 standart tır modeli için 18 dahili veya aksesuar GPS düzeni.
- Tarayıcıdaki kalite, ses dili, altyazı ve oynatma konumu değişikliklerini yansıtır.
- Oyun içinden oynat/duraklat, bağlantı açma, ses, ses dili ve altyazı kontrolleri.
- 1024×512 kabin görüntüsü; yakalama üst sınırı 60 FPS. Gerçek hız sisteme ve tarayıcıya bağlıdır.
- YouTube hesabı ve çerezler tarayıcıda kalır. Normal YouTube reklamları da aktarılır.

Windows x64, DirectX 11 ve ETS2 1.61 hedeflenir. Ekransız kabinler uyumlu GPS aksesuarı gerektirir. Üçüncü taraf tır/ekran modları ve bütün servis/konvoy geçişleri doğrulanmış değildir. Ayrıntılar: [FLEET.md](FLEET.md), [CONVOY.md](CONVOY.md).

Bileşen sürümleri: gösterge **0.6.3**, yerel oyun eklentisi **0.6.0**, tarayıcı uzantısı **0.6.1**. Kullanıcı 25 Ekim 2026 tarihinde son yükleme çökmesinin düzeldiğini doğruladı.

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

Son adım `dist/browser-0.5.0` üretir ve var olan klasörün üzerine yazmaz. Klasördeki 0.5.0 adı paketleme düzeninden kalmıştır; bileşen sürümleri yukarıda ayrı belirtilmiştir. Güncel paketleyici işaret materyallerini `build/mod`, navigasyon arayüzlerini `build/navigation-mod` üzerinden alır. Paket hazır olduğunda `Install.cmd` çalıştırılır.

`dist/`, eşleştirme anahtarları, kurulum yedekleri ve çıkarılmış oyun dosyaları depoya dahil değildir. Paketleme her bilgisayar için yeni yerel eşleştirme anahtarı üretir. Aynı paketin `Extension` ve `Player` klasörleri birlikte kullanılmalıdır; `config.json` ve `browser-config.json` paylaşılmamalıdır.

Atölye paketleme ve yayın bilgileri: [WORKSHOP.md](WORKSHOP.md). Dahili oynatıcının teknik kullanım notları: [INGAME.md](INGAME.md).

## Testler

Oyun varlıkları veya yerel DLL derlemesi gerektirmeyen kontroller:

```powershell
node --test test/installer.test.js test/audio-tracks.test.js test/captions.test.js test/capture-worker.test.js test/youtube-start.test.js
```

Kurulum testleri Windows PowerShell ile ayrı deneme klasörlerinde çalışır; gerçek oyun kurulumunu değiştirmez. İlk kurulum, tekrar kurulum, eksik dosya onarımı, değiştirilmiş dosyaların korunması ve oyun açıkken durma davranışı kontrol edilir.

Tam test komutu `node --test test/*.test.js` şeklindedir. Gösterge testleri çıkarılmış oyun kaynaklarını ve üretilmiş ekran dosyalarını gerektirir. DirectX ve tarayıcı aktarım deneyleri `native/dx11_probe.cpp` ile `scripts/run-browser-probe.cjs` içindedir. Bunlar gerçek oyun geçişlerinin yerine geçmez.

## Kaynaklar ve lisanslar

`browser-extension/` sekme yakalamayı, `desktop/` yerel yardımcıyı, `native/` oyun eklentisini, `scripts/` derleme/kurulumu ve `test/` kontrolleri içerir.

Üçüncü taraf kaynakları ve lisansları [THIRD_PARTY.md](THIRD_PARTY.md) içinde listelenir. Bu proje SCS Software, YouTube veya Apple tarafından sunulan resmi bir ürün değildir.
