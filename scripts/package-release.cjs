// Assemble only public runtime files, never a recursive copy of a live app profile.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'dist/browser-0.7.0');
const out=path.join(root,'dist/releases/ETS2CarPlay-0.7.3');
if(fs.existsSync(out))throw Error('Release staging folder already exists. Preserve it and use a fresh destination.');
const pkg=path.join(out,'dist/browser-0.7.0'),app=path.join(pkg,'Player/resources/app');
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
for(const name of ['FH6Standalone.dll','FH6YouTubeNavigation.scs','ImGui-LICENSE.txt','MinHook-LICENSE.txt','SCS-SDK-LICENSE.txt'])copy(path.join(source,name),path.join(pkg,name));
for(const name of fs.readdirSync(path.join(source,'Player'))){
 if(name==='resources')continue;
 fs.cpSync(path.join(source,'Player',name),path.join(pkg,'Player',name),{recursive:true});
}
for(const name of ['main.cjs','package.json'])copy(path.join(source,'Player/resources/app',name),path.join(app,name));
for(const name of ['browser-host.cjs','browser-bridge.cjs','browser-diagnostics.cjs','transport.cjs'])copy(path.join(root,'desktop',name),path.join(app,name));
for(const name of ['manifest.json','page-player.js','service-worker.js','popup.html','popup.js','popup.css','offscreen.html','offscreen.js','frames.js'])copy(path.join(root,'browser-extension',name),path.join(pkg,'Extension',name));
for(const name of ['install-carplay.ps1','install-standalone.ps1','update-ingame.ps1'])copy(path.join(root,'scripts',name),path.join(out,'scripts',name));
copy(path.join(root,'Install.cmd'),path.join(out,'Install.cmd'));
fs.writeFileSync(path.join(out,'README.txt'),`ETS2CarPlay - Windows x64 / DirectX 11 / ETS2 1.61

KURULUM
1. ZIP'i kalici bir klasore cikarin; kurulumdan sonra bu klasoru silmeyin veya tasimayin.
2. ETS2 kapaliyken Install.cmd dosyasini calistirin ve oyun/belgeler klasorlerini belirtin.
3. Chrome/Edge uzantilar sayfasinda gelistirici modunu acin. Paketlenmemis oge yukle ile dist/browser-0.7.0/Extension klasorunu secin.
4. Oyun Mod Yoneticisinde yerel ekran modunu veya Atolye kopyasini etkinlestirin; ikisini birlikte kullanmayin.
5. Tarayicida video acip uzantidan Kabine aktar secin. Kontroller tarayicidadir.

SETUP
Extract to a permanent folder and keep it there. Close ETS2 and run Install.cmd.
Load dist/browser-0.7.0/Extension as an unpacked Chrome/Edge extension in developer mode.
Enable either the local dashboard mod or its Workshop copy, then play a browser video and select Kabine aktar.
Pairing settings are generated locally on first installation. Do not share the generated configuration files.
`);
console.log(out);
