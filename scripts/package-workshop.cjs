const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist/workshop-0.7.0');
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
 package_version: "0.7.0-experimental"
 author: "metinyildiran"
 category[]: "interior"
 category[]: "ui"
 icon: "mod_icon.jpg"
 description_file: "description.txt"
}
}
`);
fs.writeFileSync(path.join(pkg, 'description.txt'), `ETS2CarPlay 0.7.0 - dashboard component (tested 0.6.3 layouts preserved).
Requires the separate FH6Standalone.dll, local helper and Chrome/Edge extension from the ETS2CarPlay project. Subscribing alone does NOT enable video.
Source and setup: https://github.com/metinyildiran/ETS2CarPlay
Pause an automatically selected video, or stop capture, to return to navigation. Manual region capture requires Stop capture. Disable the local FH6YouTube.scs copy when enabling this Workshop copy.
Windows x64 / DirectX 11 / ETS2 1.61. Built-in GPS or compatible GPS accessory required.
Original dashboard definitions: SCS Software; video integration: ETS2CarPlay.
`);
fs.writeFileSync(path.join(out, 'description.bbcode.txt'), `[b]External plugin required — subscribing alone does not enable video.[/b]
This Workshop item provides the GPS/dashboard component of ETS2CarPlay. Video streaming also requires the separate Windows DirectX 11 plugin (FH6Standalone.dll), local helper and Chrome/Edge extension.

[url=https://github.com/metinyildiran/ETS2CarPlay]Source code and build/setup instructions on GitHub[/url]
The GitHub repository currently provides source code, not a ready-to-install binary release. Developer tools and a separate local build are required.

[h1]What it does[/h1]
Stream a video area from your Chrome/Edge tab to supported in-cab GPS screens. Version 0.7.0 supports accessible HTML5 videos beyond YouTube, with a video selector and manual region selection for players that cannot be detected automatically. Quality, subtitles, audio language and playback position follow the browser. Accounts and cookies stay in the browser; ads and menus inside the selected area are also shown.

[list]
[*]26 stock truck models mapped to 18 GPS layouts, including supported GPS accessories.
[*]Playback controls stay in the browser; the in-game panel has been removed in version 0.7.0.
[*]The extension is now named ETS2 Video Aktarımı.
[*]Fullscreen is not required: capture follows the video bounds and accounts for tab padding and page zoom.
[*]1024x512 video; capture up to 60 FPS depending on browser and system load.
[/list]

[h1]Setup[/h1]
1. Build and install the external components using the GitHub instructions, with ETS2 closed.
2. Subscribe and activate this item in Mod Manager. Disable the local FH6YouTube.scs mod to avoid loading two copies.
3. Load the dist/browser-0.7.0/Extension folder in Chrome/Edge. Disable the old FH6 YouTube extension when upgrading.
4. Play a video and select Kabine aktar. Choose a video from the list, or use Alan seç ve aktar to mark a region.
5. Keep the tab open and the entire selected video/region within the page viewport. Playback controls stay in the browser.

Automatically selected videos restore navigation when paused, ended or no longer visible. Manual region capture does not know the playback state: use Aktarımı durdur to restore navigation. Scroll, resize or zoom changes invalidate a manually selected region; select it again. Reloading the page requires reconnecting.

DRM-protected content may appear black. Cross-origin iframe players and closed shadow DOM players may need manual region selection. Compatibility with every website is not guaranteed. Audio comes from the selected tab, including any other sounds in that tab. Only the selected video/region is sent to the local game bridge; it is not uploaded to an internet streaming server.

[h1]Compatibility[/h1]
Windows x64, DirectX 11, ETS2 1.61. Trucks/cabins without a built-in GPS need a compatible GPS accessory; Cabin Accessories content requires its DLC. Third-party truck/dashboard mods and all truck/service/convoy combinations have not been exhaustively tested. Other mods replacing the same GPS layouts can conflict.

This 0.7.0 Workshop update preserves the dashboard layouts from 0.6.3, including the child-order and SCS unit-name fixes. The new browser features and removal of Ctrl+Alt+Y require updating the external components to 0.7.0; a Workshop subscription cannot update the DLL, helper or browser extension. The previous loading-crash fix was confirmed by the original user. Version 0.7.0 passed automated browser/pixel and isolated DirectX tests; actual gameplay and every truck/service transition have not been exhaustively tested.

[h1]Turkce[/h1]
Bu paket kabin ekranı dosyalarını kurar. Yalnızca abone olmak yeterli değildir: harici oyun eklentisi, yerel yardımcı ve tarayıcı uzantısını da 0.7.0 sürümüne güncelleyin. GitHub kaynak kodu ve derleme talimatlarını sunar; hazır ikili kurulum sürümü yoktur. Yerel FH6YouTube.scs kopyasını devre dışı bırakın.

Ctrl+Alt+Y paneli kaldırıldı; kontroller tarayıcıda. Uzantının yeni adı ETS2 Video Aktarımı. YouTube dışındaki HTML5 videoları otomatik seçilebilir; bulunamayan oynatıcılar için Alan seç ve aktar kullanılabilir. Tam ekran gerekmez. Otomatik seçilen video duraklayınca navigasyon geri gelir; elle alan seçiminde Aktarımı durdur düğmesi kullanılmalıdır. DRM korumalı videolar siyah görünebilir.

[h1]Credits[/h1]
Original dashboard definitions: SCS Software. Video integration: ETS2CarPlay / metinyildiran. Not affiliated with SCS Software, YouTube or Apple.
`);
fs.writeFileSync(path.join(out, 'changelog.txt'), '0.7.0: Updated setup and compatibility information for ETS2 Video Aktarımı. External components now support generic HTML5 videos, video selection and manual region capture; video cropping accounts for bounds, page zoom and tab padding. Ctrl+Alt+Y panel removed; controls remain in the browser. Workshop dashboard layouts remain identical to the tested 0.6.3 layouts. Update the external DLL, helper and browser extension separately; subscribing alone does not install these features.');
const unsupported = path.join(content, 'unsupported');
fs.mkdirSync(unsupported, {recursive: true});
fs.copyFileSync(path.join(pkg, 'manifest.sii'), path.join(unsupported, 'manifest.sii'));
fs.writeFileSync(path.join(unsupported, 'description.txt'), 'ETS2CarPlay currently supports ETS2 1.61 only. This informational package does not change any game files. Check https://github.com/metinyildiran/ETS2CarPlay for updates. The external video plugin/helper/extension also require a compatible game version.');
for (const target of [pkg, unsupported]) fs.copyFileSync(path.join(root, 'assets/workshop/mod_icon.jpg'), path.join(target, 'mod_icon.jpg'));
fs.copyFileSync(path.join(root, 'assets/workshop/preview.jpg'), path.join(out, 'preview.jpg'));
console.log(out);
