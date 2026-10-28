import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>k.toLowerCase()!=='psmodulepath'));
const quote=s=>"'"+s.replaceAll("'","''")+"'";
function fixture(){
 const dir=fs.mkdtempSync(path.join(root,'build/managed-test-')),source=path.join(dir,'download'),game=path.join(dir,'game'),docs=path.join(dir,'documents');
 const target=path.join(docs,'mod/ETS2CarPlay'),ini=path.join(game,'bin/win_x64/plugins/FH6Player.ini'),dll=path.join(game,'bin/win_x64/plugins/FH6Standalone.dll');
 const files={'FH6Standalone.dll':'test plugin','Player/electron.exe':'fixture binary','Player/resources/app/main.cjs':"require('./browser-host.cjs');",'Player/resources/app/browser-host.cjs':'// fixture helper','Player/resources/app/package.json':JSON.stringify({version:'0.7.0',fh6Mode:'browser',fh6NativeRevision:'0.7.0',fh6WorkshopOnly:true}),'Extension/manifest.json':JSON.stringify({manifest_version:3,name:'test',version:'0.7.3'})};
 for(const [name,data] of Object.entries(files)){const f=path.join(source,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,data);}
 fs.mkdirSync(path.dirname(ini),{recursive:true});fs.mkdirSync(docs,{recursive:true});fs.writeFileSync(path.join(game,'bin/win_x64/eurotrucks2.exe'),'fixture');
 return {dir,source,game,docs,target,ini,dll};
}
function install(f){
 assert.ok(f.dir.startsWith(path.join(root,'build/managed-test-')));
 const code=`function Get-Process {param([string]$Name)}; & ${quote(path.join(root,'scripts/install-carplay.ps1'))} -PackagePath ${quote(f.source)} -GamePath ${quote(f.game)} -DocumentsPath ${quote(f.docs)}`;
 const r=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',code],{encoding:'utf8',windowsHide:true,env,timeout:20000});
 assert.ifError(r.error);return {...r,output:r.stdout+r.stderr};
}
const json=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
test('Managed install survives removal of download folder, retains pairing and updates from another ZIP',{skip:process.platform!=='win32'},()=>{
 const f=fixture(),r=install(f);assert.equal(r.status,0,r.output);assert.match(r.output,/artik silinebilir/);
 const token=json(path.join(f.target,'Extension/config.json')).token;
 assert.equal(json(path.join(f.target,'Player/resources/app/browser-config.json')).token,token);
 const ini=fs.readFileSync(f.ini,'utf16le');assert.ok(ini.includes(path.join(f.target,'Player/electron.exe')));assert.ok(!ini.includes(f.source));
 const manifest=json(path.join(f.target,'.installation/Installation.json'));
 assert.ok(!JSON.stringify(manifest).includes(f.source.replaceAll('\\','\\\\')));
 const next=path.join(f.dir,'second-download');fs.cpSync(f.source,next,{recursive:true});
 fs.renameSync(f.source,f.source+'-removed');
 assert.ok(fs.existsSync(path.join(f.target,'Player/electron.exe')));assert.ok(fs.existsSync(path.join(f.target,'Extension/manifest.json')));
 f.source=next;fs.writeFileSync(path.join(next,'Player/resources/app/browser-host.cjs'),'// updated helper');
 const again=install(f);assert.equal(again.status,0,again.output);
 assert.equal(json(path.join(f.target,'Extension/config.json')).token,token);
 assert.equal(fs.readFileSync(path.join(f.target,'Player/resources/app/browser-host.cjs'),'utf8'),'// updated helper');
 assert.equal(fs.existsSync(path.join(f.docs,'mod/FH6YouTube.scs')),false);
});
test('Migration from a download-based installation preserves its pairing key',{skip:process.platform!=='win32'},()=>{
 const f=fixture(),pair=JSON.stringify({port:32127,token:'c'.repeat(64)});
 fs.writeFileSync(path.join(f.source,'Extension/config.json'),pair);fs.writeFileSync(path.join(f.source,'Player/resources/app/browser-config.json'),pair);
 fs.writeFileSync(f.ini,'\uFEFF[Player]\r\nExecutable='+path.join(f.source,'Player/electron.exe')+'\r\n','utf16le');
 const r=install(f);assert.equal(r.status,0,r.output);
 assert.equal(json(path.join(f.target,'Extension/config.json')).token,'c'.repeat(64));
});
test('Unmanaged target folder is not overwritten',{skip:process.platform!=='win32'},()=>{
 const f=fixture();fs.mkdirSync(f.target,{recursive:true});fs.writeFileSync(path.join(f.target,'user.txt'),'keep');
 const r=install(f);assert.equal(r.status,1);assert.match(r.output,/bu kurucuya ait degil/);
 assert.equal(fs.readFileSync(path.join(f.target,'user.txt'),'utf8'),'keep');assert.equal(fs.existsSync(f.dll),false);
});
test('Failed managed update restores previous runtime and game-side files',{skip:process.platform!=='win32'},()=>{
 const f=fixture();let r=install(f);assert.equal(r.status,0,r.output);
 const originalIni=fs.readFileSync(f.ini),token=json(path.join(f.target,'Extension/config.json')).token;
 fs.writeFileSync(f.dll,'user modified DLL');fs.writeFileSync(path.join(f.source,'Player/resources/app/browser-host.cjs'),'// must roll back');
 r=install(f);assert.equal(r.status,1,r.output);
 assert.equal(fs.readFileSync(f.dll,'utf8'),'user modified DLL');assert.deepEqual(fs.readFileSync(f.ini),originalIni);
 assert.equal(json(path.join(f.target,'Extension/config.json')).token,token);
 assert.equal(fs.readFileSync(path.join(f.target,'Player/resources/app/browser-host.cjs'),'utf8'),'// fixture helper');
});
