# Tüm tırlar — ekran ve geçiş güncellemesi 0.6.0

**Ekran düzeltmesi 0.6.3:** İkinci yükleme hatası, üretilen `fh6_video_100` adının SCS'nin 12 karakterlik token sınırını aşmasından kaynaklandı. Yeni adlar `_nameless._.fh6_video.100` biçiminde ayrı, kısa parçalardan oluşur. Üretici ve paket kontrolleri artık ad uzunluğunu da doğrular. 18 ekran düzeni ve ilgili altı otomatik test geçti; gerçek oyun yüklemesinin yeniden doğrulanması bekleniyor.

**Ekran düzeltmesi 0.6.2 (24 Ekim 2026):** Oyun günlüğü, `my_children[2]` satırının `[0]` ve `[1]` satırlarından önce yazıldığını ve FH6 ekranının bu yüzden yüklenemediğini gösterdi. Üretici yeni öğeyi artık mevcut dizinin sonuna ekliyor. 18 düzenin bütün çocuk dizileri dosyada göründükleri sırayla doğrulanıyor; önceki testin indeksleri sıralayarak hatayı gizleyen kısmı kaldırıldı. Test eski pakette başarısız, düzeltilmiş pakette başarılı. `scripts/update-dashboard.ps1 -Install` yalnızca ekran modunu ve mevcut paketlerdeki mod kopyalarını günceller; DLL ve tarayıcı sürümü aynı kalır. Gerçek oyunda yeniden yükleme doğrulaması bekleniyor.

ETS2 1.61.1.9s kurulumundaki 26 standart tır modeli için 18 GPS ekran düzeni hazırlanmıştır. Tarayıcı eklentisi ve mevcut eşleştirme aynı kalır. Mod adı artık **ETS2 YouTube + Navigation - All Trucks**; mevcut `FH6YouTube.scs` yerinde güncellenir.

| Marka | Modeller |
|---|---|
| DAF | XF, XF Euro 6, 2021 XG/XG+/XF ailesi, XD, XF Electric |
| Iveco | Stralis, Hi-Way, S-Way |
| MAN | TGX, TGX Euro 6, TGX 2020 |
| Mercedes-Benz | Actros, New Actros |
| Renault | Magnum, Premium, T, E-Tech T |
| Scania | R, Streamline, R 2016, S 2016, S Electric |
| Volvo | FH16, FH16 2012, FH 2021, FH 2024/FH6 |

Dahili GPS bulunan kabinlerde video o ekranda gösterilir. **Eski Actros, Magnum ve Premium'da**, ayrıca bazı tırların ekonomik kabinlerinde dahili GPS yoktur. Bu kabinlere servisten **Cabin Accessories GPS veya GPS telefon aksesuarı** takılmalıdır; uyumlu kabinlerde GPS tablet de kullanılabilir. Bu DLC bu bilgisayarda kurulu. Güncelleme kaydını, kabin seçimini veya aksesuarlarını otomatik değiştirmez. Birden fazla desteklenen ekran takılıysa aynı video hepsinde görünür.

Video duraklatıldığında veya aktarım kesildiğinde özgün navigasyon geri görünür. Tır değiştirirken aktarımı yeniden başlatmak gerekmez: yeni yüklenen ekran, mevcut video karesini alır. GPS'nin ekran açma/kapama ve sayfa davranışı oyunda kalır. Kamera/uyarı sayfalarının tanımları değiştirilmez.

## Değişiklikler

- Orijinal GPS içeriği, boyutları, sayfa sırası ve görünürlük kimlikleri korunur. Video, normal ve ortak sayfalara ayrı yerel UI öğesi olarak eklenir. Farklı tırlar ve servis önizlemeleri aynı anda yüklendiğinde global öğe adı çakışmaz.
- Aynı DirectX dokusu yeniden doldurulduğunda “son kare zaten yazıldı” kaydı sıfırlanır. Bu düzeltme hem oynatırken hem navigasyona dönüşte uygulanır. Referanslar sahipli ve sayıları sınırlıdır.
- Bir önceki servis çökmesinin günlükte görülen `fh6.video.overlay ... already taken` nedeni bütün ekranlarda önlenir.

## Doğrulama

- 24 otomatik test geçti. 18 düzenin özgün öğeleri korundu; tüm çocuk/üst öğe bağlantıları ve üç tur karma gösterge yüklemesinde isimler denetlendi.
- Gerçek DirectX 11 testinde 64 ekran oluşturma/yenileme, eski ve yeni ekranın birlikte bulunması, 8 görüntü yüzeyi boyut değişimi ve bağlantı kesildikten sonra navigasyona dönüş geçti. Normal ve tek iş parçacıklı cihazla ayrı ayrı çalıştırıldı.
- Aynı dokuya yeniden yükleme testi eski DLL ile 73 kontrol hatası veriyordu; düzeltmeyle sıfır hata verdi.
- Tarayıcı kare işleyicisi → yerel köprü → DirectX aktarım testi, renk/altyazı değişimini ve durunca saydamlaşmayı doğruladı. Oyun içi kontrol panelinin ayrı DirectX testi de yapıldı.

**Sınır:** Bu testler ETS2 içinde her tırı sürüp servis/galeri geçişlerini denemek değildir. Her modelde görüntü yerleşimi ve gerçek oyun geçişleri ayrıca doğrulanmalıdır; sıfır hata garantisi verilmez. Üçüncü taraf tır/ekran modları ve farklı oyun sürümleri bu envantere dahil değildir. Küçük veya dikey GPS ekranlarında görüntü oranı/okunabilirliği değişebilir.

## Güncelleme ve yedek

Oyun kapalıyken `scripts/update-fleet.ps1 -Install` çalıştırılır. Betik mevcut kurulum dosyalarının kayıtlı özetlerini kontrol eder; DLL ve modu, iki mevcut oynatma paketinin kopyalarıyla birlikte günceller. Tarayıcı eklentisine, eşleştirme bilgisine ve oynatıcı ayarına dokunmaz.

Önceki dosyalar ve `Installation.json`, `dist/fleet-0.6.0/backup-*` altında saklanır; `Changes.json` hangi dosyanın hangi yedekten geri alınacağını gösterir. Kopyalama hatasında işlem otomatik geri alınır. Geri yükleme de oyun kapalıyken yapılmalıdır.

Teknik referans: [SCS gösterge sayfası kimlikleri](https://modding.scssoft.com/wiki/Documentation/Engine/Truck_Interior_Animations_and_IDs). Kuruluma ait kaynak eşlemesi `research/fleet-inventory.json` içindedir.
