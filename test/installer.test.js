import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex').toUpperCase();
// Match a launcher started from Explorer, not a Node child inheriting PS7 modules.
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>key.toLowerCase()!=='psmodulepath'));
function fixture(){
 const parent=path.join(root,'build/installer-tests');fs.mkdirSync(parent,{recursive:true});
 const dir=fs.mkdtempSync(path.join(parent,'case-'));
 const game=path.join(dir,'game'),pkg=path.join(dir,'package');
 const dll=path.join(game,'bin/win_x64/plugins/FH6Standalone.dll');
 const ini=path.join(game,'bin/win_x64/plugins/FH6Player.ini');
 const mod=path.join(dir,'documents/mod/FH6YouTube.scs');
 const manifest=path.join(dir,'Installation.json');
 for(const [relative,content] of Object.entries({
  'FH6Standalone.dll':'test DLL bytes',
  'FH6YouTubeNavigation.scs':'new test mod',
  'Player/electron.exe':'not executable',
  'Player/resources/app/main.cjs':'',
  'Player/resources/app/package.json':'{"version":"0.5.0","fh6Mode":"browser"}'
 })){
  const target=path.join(pkg,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);
 }
 fs.mkdirSync(path.dirname(mod),{recursive:true});fs.writeFileSync(mod,'old mod');
 fs.writeFileSync(manifest,JSON.stringify({Version:'0.5.0-browser-experimental',GamePath:game,Actions:[
  {Target:dll,After:hash('previous DLL'),Source:null,Backup:null,Before:null},
  {Target:mod,After:hash('old mod'),Source:null,Backup:null,Before:null},
  {Target:ini,After:hash('previous config'),Source:null,Backup:null,Before:null}
 ]}));
 return {dir,game,pkg,dll,ini,mod,manifest};
}
function update(f,repair=false){
 const args=['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts/update-ingame.ps1'),'-PackagePath',f.pkg,'-ManifestPath',f.manifest];
 if(repair)args.push('-RepairMissing');
 const result=spawnSync('powershell.exe',args,{encoding:'utf8',windowsHide:true,env});
 assert.ifError(result.error);
 return {...result,output:result.stdout+result.stderr};
}

test('Missing installed files require explicit repair; repair restores files and matching manifest hashes',{skip:process.platform!=='win32'},()=>{
 const f=fixture();
 const refused=update(f);
 assert.notEqual(refused.status,0);assert.match(refused.output,/Kurulumdan sonra degisen/);
 assert.equal(fs.existsSync(f.dll),false);assert.equal(fs.readFileSync(f.mod,'utf8'),'old mod');
 const repaired=update(f,true);
 assert.equal(repaired.status,0,repaired.output);
 assert.equal(fs.readFileSync(f.dll,'utf8'),'test DLL bytes');
 assert.equal(fs.readFileSync(f.mod,'utf8'),'new test mod');
 assert.match(fs.readFileSync(f.ini,'utf16le'),/Executable=.*Player\\electron\.exe/);
 const installation=JSON.parse(fs.readFileSync(f.manifest,'utf8').replace(/^\uFEFF/,''));
 for(const a of installation.Actions)assert.equal(hash(fs.readFileSync(a.Target)),a.After);
});

test('Repair refuses to overwrite a modified existing file',{skip:process.platform!=='win32'},()=>{
 const f=fixture();fs.writeFileSync(f.mod,'user changes');
 const result=update(f,true);
 assert.notEqual(result.status,0);assert.match(result.output,/Kurulumdan sonra degisen/);
 assert.equal(fs.readFileSync(f.mod,'utf8'),'user changes');assert.equal(fs.existsSync(f.dll),false);
});

test('Launcher rejects installation changes while the game is reported running',{skip:process.platform!=='win32'},()=>{
 const script=path.join(root,'scripts/install-carplay.ps1').replaceAll("'","''");
 const command=`function Get-Process { param([string]$Name) if($Name -eq 'eurotrucks2'){ [pscustomobject]@{ProcessName='eurotrucks2'} } }; & '${script}'`;
 const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',command],{encoding:'utf8',windowsHide:true,env});
 assert.ifError(result.error);assert.equal(result.status,1);
 assert.match(result.stdout,/Acik oyuna degisiklik yapilmadi/);
});

test('Single installer completes a fresh browser setup and can be rerun without menus',{skip:process.platform!=='win32'},()=>{
 const f=fixture();fs.unlinkSync(f.manifest);
 fs.mkdirSync(path.join(f.game,'bin/win_x64'),{recursive:true});
 fs.writeFileSync(path.join(f.game,'bin/win_x64/eurotrucks2.exe'),'test game');
 const args=['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts/install-carplay.ps1'),'-PackagePath',f.pkg,'-ManifestPath',f.manifest,'-GamePath',f.game,'-DocumentsPath',path.join(f.dir,'documents')];
 for(let run=0;run<2;run++){
  const result=spawnSync('powershell.exe',args,{encoding:'utf8',windowsHide:true,env,timeout:15000});
  assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/CarPlay kurulumu tamamlandi/);
  const installation=JSON.parse(fs.readFileSync(f.manifest,'utf8').replace(/^\uFEFF/,''));
  assert.equal(installation.Version,'0.5.0-browser-experimental');
  for(const a of installation.Actions)assert.equal(hash(fs.readFileSync(a.Target)),a.After);
 }
});
