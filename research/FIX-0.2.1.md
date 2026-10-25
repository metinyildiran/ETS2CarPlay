# Doku bulunamadı — 23 Ekim 2026

Gözlemler: oyun günlüğünde FH6YouTube aktif ve mod paketi bağlanmış. ReShade günlüğünde eklenti API 18 ile kayıtlı. Kurulu eklenti SHA256 değeri proje 0.2.0 çıktısıyla aynı. Kullanıcı orta ekranın siyah olduğunu bildirdi. Oyunda marker bulundu kaydı yok.

0.2.0 yalnızca `create_resource/init_resource` ilk verisine bakıyordu. Sonradan yüklemeyi kaçırdığı gerçek DX11/ReShade üzerinde yeniden üretildi. Bu bir kod eksiği olarak doğrulandı; ETS2'nin tam yükleme yolu henüz gözlenmedi.

Test: `scripts/build-dx11-test.ps1`, ardından `build/dx11-old/dx11_probe.exe` ve `build/dx11-new/dx11_probe.exe`. Test, kurulu ReShade DLL'sinin bir kopyasını yalnızca kendi klasöründe kullanır. Oyun sürecine bağlanmaz; görünmeyen 64x64 pencere ve ayrı DX11 cihazı oluşturur. WARP ReShade tarafından atlandığı için donanım cihazı kullanıldı.

Sonuç: eski sürüm initial PASS, late-update FAIL, staging-map-copy FAIL, unrelated PASS. Yeni sürüm dört testin tamamında PASS. Çerçeve gelmeyen durumda dokunun siyaha güncellenmesi GPU'dan geri okunarak doğrulandı.

Yeni sürüm: geç yükleme ve staging kopya takibi; yalnızca imza doğrulanan shader kaynaklarında güncelleme; staging kaynaklarına video yazmama; kaynak yok edilince kayıtları temizleme; kendi yazmalarını tekrar yakalamamak için thread-local koruma; sınırlı aday tanı günlükleri.

Oyun yeniden açıldığında `FH6CarPlay 0.2.1: marker via ...` ve `unique screen marker found` satırları kontrol edilmeli. Bunlar yoksa aday format/heap/initial/pitch kayıtları sonraki tanıyı sağlar.
