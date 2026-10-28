import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>k.toLowerCase()!=='psmodulepath'));
const quote=s=>"'"+s.replaceAll("'","''")+"'";
function run(code){
 const r=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',`$ErrorActionPreference='Stop'; . ${quote(path.join(root,'scripts/find-ets2.ps1'))}; ${code}`],{encoding:'utf8',windowsHide:true,env});
 assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout.trim();
}
function setup(){
 const dir=fs.mkdtempSync(path.join(root,'build/discovery-')),steam=path.join(dir,'Steam'),library=path.join(dir,'Other Drive Library');
 fs.mkdirSync(path.join(steam,'steamapps'),{recursive:true});fs.mkdirSync(path.join(library,'steamapps'),{recursive:true});
 fs.writeFileSync(path.join(steam,'steamapps/libraryfolders.vdf'),`"libraryfolders" { "0" { "path" "${steam.replaceAll('\\','\\\\')}" } "1" { "path" "${library.replaceAll('\\','\\\\')}" } }`);
 return {dir,steam,library};
}
test('Steam manifest finds a secondary library and nonstandard install folder without prompting',{skip:process.platform!=='win32'},()=>{
 const f=setup(),game=path.join(f.library,'steamapps/common/My ETS2 Folder');
 fs.mkdirSync(path.join(game,'bin/win_x64'),{recursive:true});fs.writeFileSync(path.join(game,'bin/win_x64/eurotrucks2.exe'),'fixture');
 fs.writeFileSync(path.join(f.library,'steamapps/appmanifest_227300.acf'),'"AppState" { "appid" "227300" "installdir" "My ETS2 Folder" }');
 const found=run(`function Read-Host {throw 'Unexpected path prompt'}; Select-CarPlayGamePath @(Find-CarPlayGamePaths -SteamRoots @(${quote(f.steam)}))`);
 assert.equal(found,game);
});
test('Stale Steam manifests and traversal names are not installation candidates',{skip:process.platform!=='win32'},()=>{
 const f=setup();fs.writeFileSync(path.join(f.library,'steamapps/appmanifest_227300.acf'),'"installdir" "Missing Game"');
 assert.equal(run(`@(Find-CarPlayGamePaths -SteamRoots @(${quote(f.steam)})).Count`),'0');
 fs.writeFileSync(path.join(f.library,'steamapps/appmanifest_227300.acf'),'"installdir" ".."');
 assert.equal(run(`@(Find-CarPlayGamePaths -SteamRoots @(${quote(f.steam)})).Count`),'0');
});
test('Documents discovery respects redirected Windows Documents and rejects absent game data',{skip:process.platform!=='win32'},()=>{
 const f=setup(),docs=path.join(f.dir,'OneDrive/Documents'),gameDocs=path.join(docs,'Euro Truck Simulator 2');
 fs.mkdirSync(gameDocs,{recursive:true});
 assert.equal(run(`Find-CarPlayDocumentsPath -KnownDocuments ${quote(docs)}`),gameDocs);
 assert.equal(run(`$null -eq (Find-CarPlayDocumentsPath -KnownDocuments ${quote(path.join(f.dir,'absent'))})`),'True');
});
test('Multiple installations require selection instead of picking a guessed default',{skip:process.platform!=='win32'},()=>{
 assert.equal(run("function Read-Host { '2' }; Select-CarPlayGamePath -Candidates @('C:\\first','D:\\second')").split(/\r?\n/).at(-1),'D:\\second');
});
