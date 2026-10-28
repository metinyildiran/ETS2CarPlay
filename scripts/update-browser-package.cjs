// Refresh the paired local package without rotating or printing its private key.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/browser-0.7.0'),app=path.join(out,'Player/resources/app');
const env={...process.env};for(const key of Object.keys(env))if(key.toLowerCase()==='psmodulepath')delete env[key];
const check=spawnSync('powershell.exe',['-NoProfile','-Command',"Get-Process eurotrucks2,electron -ErrorAction SilentlyContinue | Select-Object ProcessName,Path | ConvertTo-Json -Compress"],{env,encoding:'utf8',windowsHide:true});
if(check.error)throw check.error;
if(check.status!==0&&!check.stdout.trim()){
  // Get-Process returns a nonzero status when none of the named processes exist.
  const verify=spawnSync('powershell.exe',['-NoProfile','-Command',"@(Get-Process | Where-Object {$_.ProcessName -in @('eurotrucks2','electron')} | Select-Object ProcessName,Path) | ConvertTo-Json -Compress"],{env,encoding:'utf8',windowsHide:true});
  if(verify.status!==0)throw Error('Çalışan uygulamalar denetlenemedi.');check.stdout=verify.stdout;
}
const processes=check.stdout.trim()?JSON.parse(check.stdout):[];
if([].concat(processes).some(p=>p.ProcessName==='eurotrucks2'||!p.Path||p.Path.toLowerCase().startsWith(out.toLowerCase()+path.sep)))throw Error('Önce ETS2 ve bu paketin yardımcısını kapat.');
const extensionConfig=path.join(out,'Extension/config.json'),hostConfig=path.join(app,'browser-config.json');
const a=fs.readFileSync(extensionConfig),b=fs.readFileSync(hostConfig);
const ac=JSON.parse(a),bc=JSON.parse(b);
if(ac.token!==bc.token||ac.port!==bc.port||!/^[a-f0-9]{64}$/.test(ac.token))throw Error('Eşleşmiş tarayıcı paketi bulunamadı.');
const changes=[];
const add=(target,data)=>changes.push({target:path.join(out,target),data});
for(const name of ['manifest.json','page-player.js','service-worker.js','popup.html','popup.js','popup.css','offscreen.html','offscreen.js','frames.js','capture-policy.js'])add('Extension/'+name,fs.readFileSync(path.join(root,'browser-extension',name)));
for(const name of ['browser-host.cjs','browser-bridge.cjs','browser-diagnostics.cjs','transport.cjs'])add('Player/resources/app/'+name,fs.readFileSync(path.join(root,'desktop',name)));
add('FH6Standalone.dll',fs.readFileSync(path.join(root,'dist/standalone/FH6Standalone.dll')));
add('README.md',fs.readFileSync(path.join(root,'BROWSER.md')));
add('scripts/update-ingame.ps1',fs.readFileSync(path.join(root,'scripts/update-ingame.ps1')));
add('scripts/player-config.ps1',fs.readFileSync(path.join(root,'scripts/player-config.ps1')));
const pkg=JSON.parse(fs.readFileSync(path.join(app,'package.json')));pkg.version='0.8.0';pkg.fh6Mode='browser';pkg.fh6NativeRevision='0.8.0';
add('Player/resources/app/package.json',Buffer.from(JSON.stringify(pkg,null,2)));
const lock=JSON.parse(fs.readFileSync(path.join(app,'package-lock.json')));lock.version=pkg.version;lock.packages[''].version=pkg.version;
add('Player/resources/app/package-lock.json',Buffer.from(JSON.stringify(lock,null,2)));
const backup=path.join(root,'dist/browser-updates',crypto.randomUUID());fs.mkdirSync(backup,{recursive:true});
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
for(const [index,c] of changes.entries()){
  c.before=fs.existsSync(c.target)?fs.readFileSync(c.target):null;
  if(c.before){c.backup=path.join(backup,String(index));fs.writeFileSync(c.backup,c.before);}
}
const completed=[];
try{
  for(const c of changes){
    const current=fs.existsSync(c.target)?fs.readFileSync(c.target):null;
    if((current&&hash(current))!==(c.before&&hash(c.before)))throw Error('Paket güncelleme sırasında değişti.');
    completed.push(c);fs.mkdirSync(path.dirname(c.target),{recursive:true});fs.writeFileSync(c.target,c.data);
    if(hash(fs.readFileSync(c.target))!==hash(c.data))throw Error('Paket doğrulaması başarısız.');
  }
  if(!fs.readFileSync(extensionConfig).equals(a)||!fs.readFileSync(hostConfig).equals(b))throw Error('Eşleştirme ayarı değişti.');
  fs.writeFileSync(path.join(backup,'Changes.json'),JSON.stringify(changes.map(c=>({target:c.target,backup:c.backup||null,after:hash(c.data)})),null,2));
}catch(error){for(const c of completed.reverse()){if(c.before)fs.writeFileSync(c.target,c.before);else fs.rmSync(c.target);}throw error;}
console.log('0.7.0 yerel paketi hazır. Oyuna kurmak için Install.cmd, tarayıcıda uygulamak için uzantılarda Yenile kullan.');
