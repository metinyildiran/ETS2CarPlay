const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist/workshop-0.7.3');
const content = path.join(out, 'content');
const pkg = path.join(content, 'ets2_161');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'research/fleet-inventory.json')));
fs.mkdirSync(pkg, {recursive: true});
// Keep DLC dashboards scoped to their original DLC. Shared materials live in base.
for (const screen of inventory.screens) {
  const archive = screen.source.split('/')[2];
  const part = archive.startsWith('dlc_') ? archive : 'base';
  const target = path.join(pkg, part, screen.path.slice(1));
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, 'build/navigation-mod', screen.path.slice(1)), target);
}
fs.cpSync(path.join(root, 'build/navigation-mod/material'), path.join(pkg, 'base/material'), {recursive: true});
fs.writeFileSync(path.join(content, 'versions.sii'), `SiiNunit
{
package_version_info : .universal {
 package_name: "unsupported"
}
package_version_info : .ets2_161 {
 package_name: "ets2_161"
 compatible_versions[]: "1.61.*"
}
}
`);
fs.writeFileSync(path.join(pkg, 'manifest.sii'), `SiiNunit
{
mod_package : .package {
 package_version: "0.7.3-experimental"
 author: "ETS2CarPlay"
 category[]: "interior"
 category[]: "ui"
 icon: "mod_icon.jpg"
 description_file: "description.txt"
}
}
`);
fs.writeFileSync(path.join(pkg, 'description.txt'), `ETS2CarPlay brings browser videos to supported in-cab GPS screens.
Requires a separately installed game plugin, local helper and Chrome/Edge extension; subscribing alone does not enable video. Control playback, quality, subtitles and audio language in your browser. Pause an automatically selected video or stop capture to restore navigation. A compatible GPS screen is required. DRM-protected videos may appear black.
`);
fs.writeFileSync(path.join(out, 'description.bbcode.txt'), `[h1]ETS2CarPlay[/h1]
[url=https://github.com/metinyildiran/ETS2CarPlay/releases/latest/download/ETS2CarPlay-Windows-x64.zip]Download plugin + browser extension (ZIP) / Eklenti + tarayıcı uzantısını indir[/url]
[url=https://github.com/metinyildiran/ETS2CarPlay]GitHub[/url]

Watch browser videos on supported in-cab GPS screens. Control playback, quality, subtitles and audio language from Chrome or Edge. Fullscreen is not required; choose a video or select its area manually.

[b]Requires a separate game plugin, local helper and browser extension. Subscribing alone does not enable video.[/b]
Pause an automatically selected video or stop capture to restore navigation. A compatible GPS screen is required. DRM-protected videos may appear black.

[h1]Türkçe[/h1]
Tarayıcı videolarını desteklenen kabin GPS ekranlarında izleyin. Oynatma, kalite, altyazı ve ses dilini Chrome veya Edge üzerinden yönetin. Tam ekran gerekmez; videoyu seçebilir veya alanını elle işaretleyebilirsiniz.

[b]Harici oyun eklentisi, yerel yardımcı ve tarayıcı uzantısı ayrıca kurulmalıdır. Yalnızca abone olmak video aktarımını açmaz.[/b]
ZIP'i kalıcı bir klasöre çıkarın, oyun kapalıyken Install.cmd dosyasını çalıştırın ve paketteki kısa kurulum adımlarını izleyin.
Otomatik seçilen videoyu duraklatınca veya aktarımı durdurunca navigasyon geri gelir. Uyumlu bir GPS ekranı gerekir. DRM korumalı videolar siyah görünebilir.
`);
fs.writeFileSync(path.join(out, 'changelog.txt'), '0.7.3: Reduced in-cab video stutter by bounding tab capture to 1920x1080, requesting a steady 60 FPS cadence, overlapping frame preparation and transfer, and avoiding repeated full-page scans. Actual FPS depends on source/browser/system load. Automatic selection continues with the next video and same-site navigation. Smooth playback confirmed by the original user; 46 automated tests and browser/pixel checks passed. Update the external helper and browser extension to receive these changes, then reload the extension. Workshop dashboard layouts remain identical to tested 0.6.3 layouts; native plugin remains 0.7.0.');
const unsupported = path.join(content, 'unsupported');
fs.mkdirSync(unsupported, {recursive: true});
fs.copyFileSync(path.join(pkg, 'manifest.sii'), path.join(unsupported, 'manifest.sii'));
fs.writeFileSync(path.join(unsupported, 'description.txt'), 'ETS2CarPlay currently supports ETS2 1.61 only. This informational package does not change any game files. The external video plugin/helper/extension also require a compatible game version.');
for (const target of [pkg, unsupported]) fs.copyFileSync(path.join(root, 'assets/workshop/mod_icon.jpg'), path.join(target, 'mod_icon.jpg'));
fs.copyFileSync(path.join(root, 'assets/workshop/preview.jpg'), path.join(out, 'preview.jpg'));
console.log(out);
