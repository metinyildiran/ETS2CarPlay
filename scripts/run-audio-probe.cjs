const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(root,'desktop/node_modules/electron/dist/electron.exe'),[path.join(__dirname,'probe-audio.cjs'),...process.argv.slice(2)],{env,windowsHide:true,stdio:'inherit'});
child.on('error',e=>{console.error(e);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code;});
setTimeout(()=>child.kill(),28000).unref();
