const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/browser-0.5.0'),base=path.join(root,'dist/ingame-0.4.2');
// Never replace a package that might be running. Rebuilding requires a new path.
if(fs.existsSync(out))throw new Error('Browser package already exists; use a new version directory to rebuild.');
fs.cpSync(base,out,{recursive:true});
const app=path.join(out,'Player/resources/app'),extension=path.join(out,'Extension');
for(const file of ['browser-host.cjs','browser-bridge.cjs'])fs.copyFileSync(path.join(root,'desktop',file),path.join(app,file));
fs.writeFileSync(path.join(app,'main.cjs'),"require('./browser-host.cjs');\n");
const pkg=JSON.parse(fs.readFileSync(path.join(app,'package.json')));pkg.version='0.5.0';pkg.fh6Mode='browser';fs.writeFileSync(path.join(app,'package.json'),JSON.stringify(pkg,null,2));
const lock=JSON.parse(fs.readFileSync(path.join(app,'package-lock.json')));lock.version=pkg.version;lock.packages[''].version=pkg.version;fs.writeFileSync(path.join(app,'package-lock.json'),JSON.stringify(lock,null,2));
fs.cpSync(path.join(root,'browser-extension'),extension,{recursive:true});
const audio=fs.readFileSync(path.join(root,'desktop/audio-tracks.cjs'),'utf8').split('const inspectScript=')[0];
const captions=fs.readFileSync(path.join(root,'desktop/captions.cjs'),'utf8').split('const inspectCaptions=')[0];
fs.writeFileSync(path.join(extension,'player-options.js'),audio+'\n'+captions);
const config=JSON.stringify({port:32127,token:randomBytes(32).toString('hex')});
fs.writeFileSync(path.join(app,'browser-config.json'),config);fs.writeFileSync(path.join(extension,'config.json'),config);
fs.copyFileSync(path.join(root,'BROWSER.md'),path.join(out,'README.md'));
fs.copyFileSync(path.join(root,'scripts/update-ingame.ps1'),path.join(out,'scripts/update-ingame.ps1'));
console.log('Browser package: '+out);
