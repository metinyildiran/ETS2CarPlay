# Volvo FH6 ekran incelemesi

Kaynak: kullanıcının yerel `dlc_volvo_fh_2024.scs` arşivi. SCS'nin resmi 1.55+ çıkarıcısıyla proje klasörüne açıldı. Orijinal arşiv değiştirilmedi. Çıkarılan oyun varlıkları dağıtıma dahil edilmemeli.

Doğrulanan yollar:

- `def/vehicle/truck/volvo.fh_2024/interior/computers.sui`
- `ui/dashboard/volvo_fh_2024_gps.sii`
- Sağ direksiyon karşılığı: `ui/dashboard/volvo_fh_2024_mph_gps.sii`

`computers.sui` içinde GPS çizim hedefi 1024×512 olarak tanımlanıyor. UI koordinat alanı 1280×720. Bunlar aynı şey değil; köprüde doğru oran ve UV eşlemesi doğrulanmalı. Gösterge paneli de 1024×512, bu yüzden yalnızca boyuta bakarak DX11 dokusu seçmek yanlış ekranı değiştirebilir.

GPS arayüzü `ui::window`, `ui::group`, `ui::text` öğeleri kullanıyor. Paylaşılan grup 950, ilk sayfa grubu 100. Saat 1050. Bunlar web tarayıcısı kontrolü değil.

Guncel uygulama ve dogrulama bilgileri FLEET.md ve README.md dosyalarindadir.
