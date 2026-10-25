const {spawn}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(root,'desktop/node_modules/electron/dist/electron.exe'),[path.join(__dirname,'probe-browser-youtube.cjs')],{env,windowsHide:true,stdio:'inherit'});
child.on('error',error=>{console.error(error);process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});
setTimeout(()=>child.kill(),28000).unref();
