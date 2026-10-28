const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/browser-0.7.0'),base=path.join(root,'dist/ingame-0.4.2');
// Never replace a package that might be running. Rebuilding requires a new path.
if(fs.existsSync(out))throw new Error('Browser package already exists; use a new version directory to rebuild.');
fs.cpSync(base,out,{recursive:true});
fs.copyFileSync(path.join(root,'dist/standalone/FH6Standalone.dll'),path.join(out,'FH6Standalone.dll'));
const app=path.join(out,'Player/resources/app'),extension=path.join(out,'Extension');
for(const file of ['browser-host.cjs','browser-bridge.cjs','browser-diagnostics.cjs','transport.cjs'])fs.copyFileSync(path.join(root,'desktop',file),path.join(app,file));
fs.writeFileSync(path.join(app,'main.cjs'),"require('./browser-host.cjs');\n");
const pkg=JSON.parse(fs.readFileSync(path.join(app,'package.json')));pkg.version='0.8.0';pkg.fh6Mode='browser';pkg.fh6NativeRevision='0.8.0';fs.writeFileSync(path.join(app,'package.json'),JSON.stringify(pkg,null,2));
const lock=JSON.parse(fs.readFileSync(path.join(app,'package-lock.json')));lock.version=pkg.version;lock.packages[''].version=pkg.version;fs.writeFileSync(path.join(app,'package-lock.json'),JSON.stringify(lock,null,2));
fs.mkdirSync(extension,{recursive:true});
for(const file of ['manifest.json','page-player.js','service-worker.js','popup.html','popup.js','popup.css','offscreen.html','offscreen.js','frames.js','capture-policy.js'])fs.copyFileSync(path.join(root,'browser-extension',file),path.join(extension,file));
const config=JSON.stringify({port:32127,token:randomBytes(32).toString('hex')});
fs.writeFileSync(path.join(app,'browser-config.json'),config);fs.writeFileSync(path.join(extension,'config.json'),config);
fs.copyFileSync(path.join(root,'BROWSER.md'),path.join(out,'README.md'));
fs.copyFileSync(path.join(root,'scripts/update-ingame.ps1'),path.join(out,'scripts/update-ingame.ps1'));
fs.copyFileSync(path.join(root,'scripts/player-config.ps1'),path.join(out,'scripts/player-config.ps1'));
console.log('Browser package: '+out);
