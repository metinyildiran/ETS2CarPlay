const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist/workshop-0.6.3');
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
 package_version: "0.6.3-experimental"
 author: "metinyildiran"
 category[]: "interior"
 category[]: "ui"
 icon: "mod_icon.jpg"
 description_file: "description.txt"
}
}
`);
fs.writeFileSync(path.join(pkg, 'description.txt'), `ETS2CarPlay 0.6.3 - dashboard component.
Requires the separate FH6Standalone.dll, local helper and Chrome/Edge extension from the ETS2CarPlay project. Subscribing alone does NOT enable video.
Source and setup: https://github.com/metinyildiran/ETS2CarPlay
Pause/stop video to return to navigation. Disable the local FH6YouTube.scs copy when enabling this Workshop copy.
Windows x64 / DirectX 11 / ETS2 1.61. Built-in GPS or compatible GPS accessory required.
Original dashboard definitions: SCS Software; video integration: ETS2CarPlay.
`);
fs.writeFileSync(path.join(out, 'description.bbcode.txt'), `[b]External plugin required — subscribing alone does not enable YouTube.[/b]
This Workshop item provides the GPS/dashboard component of ETS2CarPlay. Video streaming also requires the separate Windows DirectX 11 plugin (FH6Standalone.dll), local helper and Chrome/Edge extension.

[url=https://github.com/metinyildiran/ETS2CarPlay]Source code and build/setup instructions on GitHub[/url]
The GitHub repository currently provides source code, not a ready-to-install binary release. Developer tools and a separate local build are required.

[h1]What it does[/h1]
Stream the video area of your normal YouTube tab to supported in-cab GPS screens. Quality, subtitles, audio language and playback position follow the browser. Pause or stop playback to restore navigation. Your YouTube login stays in your browser; normal YouTube ads are also shown.

[list]
[*]26 stock truck models mapped to 18 GPS layouts, including supported GPS accessories.
[*]Ctrl+Alt+Y controls through the separately installed game plugin.
[*]1024x512 video; capture up to 60 FPS depending on browser and system load.
[*]No ReShade required.
[/list]

[h1]Setup[/h1]
1. Build and install the external components using the GitHub instructions, with ETS2 closed.
2. Subscribe and activate this item in Mod Manager. Disable the local FH6YouTube.scs mod to avoid loading two copies.
3. Open a normal YouTube watch page in Chrome/Edge and select Kabine aktar in the extension.
4. Keep the browser tab open. Playback controls and language/subtitle selections remain in YouTube.

[h1]Compatibility[/h1]
Windows x64, DirectX 11, ETS2 1.61. Trucks/cabins without a built-in GPS need a compatible GPS accessory; Cabin Accessories content requires its DLC. Third-party truck/dashboard mods and all truck/service/convoy combinations have not been exhaustively tested. Other mods replacing the same GPS layouts can conflict.

0.6.3 fixes dashboard child ordering and overlong SCS unit-name tokens. The original user confirmed the loading crash was resolved. This is still an experimental project; that confirmation is not a test of every truck and transition.

[h1]Turkce[/h1]
Bu paket kabin ekrani dosyalarini kurar. Yalnizca abone olmak yeterli degildir: GitHub'daki harici oyun eklentisi, yerel yardimci ve tarayici uzantisi ayrica kurulmalidir. GitHub su anda kaynak kodu sunar; hazir kurulum surumu yoktur. Yerel FH6YouTube.scs kopyasini devre disi birakin. Video duraklayinca navigasyon geri gelir. Son yukleme cokmesinin giderildigi kullanici tarafindan dogrulanmistir.

[h1]Credits[/h1]
Original dashboard definitions: SCS Software. Video integration: ETS2CarPlay / metinyildiran. Not affiliated with SCS Software, YouTube or Apple.
`);
fs.writeFileSync(path.join(out, 'changelog.txt'), 'Initial Workshop dashboard release, 0.6.3. Includes stock-truck GPS coverage, instance-local overlay names, ordered child references and SCS token-length fixes. Original user confirmed the loading crash resolved. External plugin/helper/extension required.');
const unsupported = path.join(content, 'unsupported');
fs.mkdirSync(unsupported, {recursive: true});
fs.copyFileSync(path.join(pkg, 'manifest.sii'), path.join(unsupported, 'manifest.sii'));
fs.writeFileSync(path.join(unsupported, 'description.txt'), 'ETS2CarPlay currently supports ETS2 1.61 only. This informational package does not change any game files. Check https://github.com/metinyildiran/ETS2CarPlay for updates. The external video plugin/helper/extension also require a compatible game version.');
for (const target of [pkg, unsupported]) fs.copyFileSync(path.join(root, 'assets/workshop/mod_icon.jpg'), path.join(target, 'mod_icon.jpg'));
fs.copyFileSync(path.join(root, 'assets/workshop/preview.jpg'), path.join(out, 'preview.jpg'));
console.log(out);
