const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const probe=spawn(path.join(root,'build/standalone/standalone_probe.exe'),['--stream','--panel'],{cwd:path.join(root,'build/standalone'),windowsHide:true,stdio:'pipe'});
let probeText='',appText='';probe.stdout.on('data',d=>{probeText+=d;process.stdout.write(d);});probe.stderr.on('data',d=>process.stderr.write(d));
let app;
const timer=setTimeout(()=>{
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  app=spawn(path.join(root,'desktop/node_modules/electron/dist/electron.exe'),[path.join(root,'desktop'),'--smoke'],{env,windowsHide:true,stdio:'pipe'});
  app.stdout.on('data',d=>{appText+=d;process.stdout.write(d);});app.stderr.on('data',d=>process.stderr.write(d));
  app.on('error',e=>{console.error(e);process.exitCode=1;});
},700);
probe.on('error',e=>{clearTimeout(timer);console.error(e);process.exitCode=1;});
probe.on('exit',code=>{
  const reports=appText.split(/\r?\n/).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
  const max=Math.max(0,...reports.map(r=>r.transferFps||0));
  const paused=reports.findIndex(r=>r.active===false);
  const controlPassed=paused>=0&&reports.slice(paused+1).some(r=>r.active===true);
  console.log(JSON.stringify({probeExit:code,peakTransferFps:max,videoAndNavigation:probeText.includes('video=1 navigation-return=1'),inGamePauseResume:controlPassed}));
  if(code!==0 || max<=10 || !controlPassed || !probeText.includes('video=1 navigation-return=1'))process.exitCode=1;
  app?.kill();
});
setTimeout(()=>{probe.kill();app?.kill();},25000).unref();
