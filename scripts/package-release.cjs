// Assemble only public runtime files, never a recursive copy of a live app profile.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'dist/browser-0.7.0');
const out=path.join(root,'dist/releases/ETS2CarPlay-0.8.0');
if(fs.existsSync(out))throw Error('Release staging folder already exists. Preserve it and use a fresh destination.');
const pkg=path.join(out,'dist/browser-0.7.0'),app=path.join(pkg,'Player/resources/app');
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
copy(path.join(root,'dist/standalone/FH6Standalone.dll'),path.join(pkg,'FH6Standalone.dll'));
for(const name of ['ImGui-LICENSE.txt','MinHook-LICENSE.txt','SCS-SDK-LICENSE.txt'])copy(path.join(source,name),path.join(pkg,name));
for(const name of fs.readdirSync(path.join(source,'Player'))){
 if(name==='resources')continue;
 fs.cpSync(path.join(source,'Player',name),path.join(pkg,'Player',name),{recursive:true});
}
for(const name of ['main.cjs','package.json'])copy(path.join(source,'Player/resources/app',name),path.join(app,name));
const info=JSON.parse(fs.readFileSync(path.join(app,'package.json')));info.version='0.8.0';info.fh6NativeRevision='0.8.0';info.fh6WorkshopOnly=true;
fs.writeFileSync(path.join(app,'package.json'),JSON.stringify(info,null,2));
for(const name of ['browser-host.cjs','browser-bridge.cjs','browser-diagnostics.cjs','transport.cjs'])copy(path.join(root,'desktop',name),path.join(app,name));
for(const name of ['manifest.json','page-player.js','service-worker.js','popup.html','popup.js','popup.css','offscreen.html','offscreen.js','frames.js','capture-policy.js'])copy(path.join(root,'browser-extension',name),path.join(pkg,'Extension',name));
for(const name of ['install-carplay.ps1','install-managed.ps1','install-package.ps1','install-standalone.ps1','update-ingame.ps1','player-config.ps1','find-ets2.ps1'])copy(path.join(root,'scripts',name),path.join(out,'scripts',name));
copy(path.join(root,'Install.cmd'),path.join(out,'Install.cmd'));
fs.writeFileSync(path.join(out,'README.txt'),`ETS2CarPlay - Windows x64 / DirectX 11 / ETS2 1.61

KURULUM
1. ZIP'i bir klasore cikarin. Basarili kurulumdan sonra ZIP ve bu klasor silinebilir.
2. ETS2 kapaliyken Install.cmd dosyasini calistirin. Oyun ve Belgeler klasorleri otomatik bulunur.
3. Chrome/Edge uzantilar sayfasinda gelistirici modunu acin. Paketlenmemis oge yukle ile kurucunun gosterdigi Belgeler/Euro Truck Simulator 2/mod/ETS2CarPlay/Extension klasorunu secin.
Eski uzanti indirme klasorunden yukluyse kaldirip bu kalici klasorden yeniden yukleyin.
4. Kabin ekranlari icin Steam Atolye ogesine abone olun ve Mod Yoneticisinde etkinlestirin:
https://steamcommunity.com/sharedfiles/filedetails/?id=3827251497
Eski yerel CarPlay ekran modu varsa devre disi birakin. Bu ZIP ekran modu icermez.
5. Tarayicida video acip uzantidan Kabine aktar secin. Kontroller tarayicidadir.

SETUP
Extract the ZIP, close ETS2 and run Install.cmd; game and Documents paths are detected automatically.
Files are installed permanently under Documents/Euro Truck Simulator 2/mod/ETS2CarPlay.
Load its Extension folder as an unpacked Chrome/Edge extension in developer mode. Replace an extension loaded from an older download folder with this installed copy.
After successful installation the downloaded ZIP and extracted folder can be deleted. Keep the installed ETS2CarPlay folder.
Subscribe to the Workshop dashboard item linked above and enable it in Mod Manager. This ZIP contains no dashboard mod. Then play a browser video and select Kabine aktar.
Pairing settings are generated locally on first installation. Do not share the generated configuration files.
`);
console.log(out);
