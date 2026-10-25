# ETS2CarPlay

Euro Truck Simulator 2 kabinindeki GPS ekranına YouTube videosu aktaran deneysel Windows projesi. Normal Chrome/Edge sekmesindeki video kullanılır; kalite, altyazı, ses dili ve oynatma konumu değişiklikleri oyuna yansır. Video duraklatıldığında veya aktarım durduğunda navigasyon geri görünür.

**Durum:** Kaynak kodu paylaşımıdır; hazır kurulum paketi içermez. Son gösterge düzeltmesi **0.6.3**, yerel DirectX eklentisi **0.6.0**, tarayıcı uzantısı **0.6.1**. Son yükleme çökmesi için çocuk öğelerin sırası ve SCS öğe adlarının uzunluğu düzeltildi. Otomatik kontroller geçti; **0.6.3 ile gerçek oyun yüklemesinin yeniden doğrulanması bekleniyor**.

## Özellikler

- 26 standart tır modeli için 18 dahili veya aksesuar GPS düzeni; ayrıntılar [FLEET.md](FLEET.md).
- ReShade gerektirmeyen DirectX 11 eklentisi ve yerel arka plan yardımcısı.
- Kullanıcı tıklamasıyla seçilen YouTube sekmesinin video alanını aktarım; hesap ve çerezler tarayıcıda kalır.
- Ctrl+Alt+Y ile oyun içinden oynat/duraklat, bağlantı, ses, ses dili ve altyazı kontrolleri.
- Sabit 10 FPS sınırı yok; yakalama üst sınırı 60 FPS, kabin görüntüsü 1024×512. Gerçek hız sisteme ve tarayıcıya bağlıdır.
- Normal YouTube reklamları da aktarılır; reklam engelleme uygulanmaz.

Ekransız kabinlerde uyumlu GPS aksesuarı gerekir. Üçüncü taraf tır/ekran modları ve tüm servis/konvoy geçişleri doğrulanmış değildir. Envanter ETS2 **1.61.1.9s** üzerinden hazırlanmıştır.

## Kullanım ve kurulum

[Tarayıcı aktarımı](BROWSER.md), [oyun paneli](INGAME.md) ve [konvoy için etkinleştirme/devre dışı bırakma](CONVOY.md) belgelerine bakın. Bu belgelerdeki `.cmd` başlatıcılar önceden hazırlanmış yerel paketleri ve kurulum kaydını kullanır; yalnızca depoyu indirmek kurulumu tamamlamaz. Kurulum/güncelleme sırasında oyun kapalı olmalıdır.

`dist/`, kişisel eşleştirme anahtarları, kurulum yedekleri ve oyundan çıkarılmış dosyalar depoya dahil değildir. Her bilgisayar için paketleme sırasında yeni bir yerel eşleştirme anahtarı üretilir; üretilen `Extension` ve `Player` birlikte kullanılmalıdır. Hazır paketin `config.json` ve `browser-config.json` dosyalarını paylaşmayın.

## Geliştirme

Windows x64, Node.js 22+, Visual Studio C++ derleme araçları ve Windows SDK gerekir. Tarayıcı modu Chrome/Edge kullanır; yerel yardımcı Electron tabanlıdır.

```powershell
npm ci --prefix desktop
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-standalone.ps1
```

Gösterge üretimi ayrıca kendi ETS2 kurulumunuzdan çıkarılmış kaynakları gerektirir. `research/fleet-inventory.json` dosyasındaki `archives` ve `screens[].source` alanları beklenen arşivleri ve yerel yolları gösterir. Kaynaklar `research/fleet/<arşiv adı>/` altında hazırlanır; SCS oyun dosyaları bu depoda dağıtılmaz. Envanter taraması `node scripts/scan-fleet.cjs` ile yapılır. Farklı oyun sürümleri veya DLC kapsamı ek uyarlama gerektirebilir.

Kaynaklar hazır olduğunda:

```powershell
node scripts/build-mod.js
node scripts/build-navigation-mod.js
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-ingame.ps1
node scripts/package-browser.cjs
```

Son adım `dist/browser-0.5.0` üretir ve var olan klasörün üzerine yazmaz. Paket klasöründeki 0.5.0 adı eski paketleme düzeninden kalmıştır; bileşen sürümleri yukarıda ayrı belirtilmiştir. `build/mod` eski ReShade modunun üretim alanıdır; güncel paketleyici bunun yalnızca işaret materyallerini kullanır ve navigasyon arayüzünü `build/navigation-mod` üzerinden paketler.

Kurulum betikleri yerel oyun yolu ve kurulum kaydı kullanır. Yeni bilgisayarda `scripts/install-standalone.ps1` parametrelerini (`GamePath`, `DocumentsPath`, `PackagePath`) ve ardından `scripts/update-ingame.ps1` paket/kurulum kaydı yollarını kendi kurulumunuza göre ayarlayın. Varsayılan D: sürücüsü yolu herkeste geçerli değildir.

## Testler

Oyun varlıkları veya yerel derleme gerektirmeyen temel kontroller:

```powershell
node --test test/audio-tracks.test.js test/captions.test.js test/capture-worker.test.js test/youtube-start.test.js
```

Tam kaynak testi `node --test test/*.test.js` ile çalışır. `fleet` ve `standalone` testleri çıkarılmış oyun kaynaklarını ve üretilmiş gösterge dosyalarını gerektirir; eski FH6 testleri ayrıca `research/fh6/ui/dashboard/` kaynaklarını kullanır. DirectX ve tarayıcı aktarım deneyleri `native/dx11_probe.cpp` ve `scripts/run-browser-probe.cjs` içindedir. Bu kontroller gerçek oyundaki sürüş ve tır değişimi testlerinin yerine geçmez.

## Kaynak düzeni

| Klasör | İçerik |
|---|---|
| `browser-extension/` | YouTube sekmesi yakalama ve kontroller |
| `desktop/` | Yerel aktarım köprüsü, Electron yardımcı ve dahili oynatıcı |
| `native/` | DirectX 11 eklentisi, oyun paneli ve test programları |
| `scripts/` | Gösterge üretimi, derleme, paketleme ve kurulum |
| `test/` | Otomatik kontroller |
| `research/` | Ekran envanteri ve inceleme notları; özgün oyun varlıkları hariç |
| `vendor/` | Lisanslarıyla birlikte kullanılan üçüncü taraf kaynakları |

Önceki ReShade sürümünün açıklaması [tarihsel README](docs/LEGACY-README.md) içinde saklanır. Bu eski yöntem güncel tarayıcı aktarımı için gerekli değildir.

Üçüncü taraf lisansları: [MinHook](vendor/minhook/LICENSE.txt), [Dear ImGui](vendor/imgui/LICENSE.txt), [SCS SDK](vendor/scs-sdk/sdk_license.txt), [eski ReShade başlıkları](vendor/reshade/LICENSE.md). Bu proje SCS Software, YouTube veya Apple tarafından sunulan resmi bir ürün değildir.
