const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const native=spawn(path.join(root,'build/standalone/standalone_probe.exe'),['--stream'],{cwd:path.join(root,'build/standalone'),windowsHide:true,stdio:'pipe'});
let text='',appCode;native.stdout.on('data',data=>{text+=data;process.stdout.write(data);});native.stderr.pipe(process.stderr);
const child=spawn(path.join(root,'desktop/node_modules/electron/dist/electron.exe'),[path.join(__dirname,'probe-browser-frames.cjs')],{env,windowsHide:true,stdio:'inherit'});
child.on('error',error=>{console.error(error);appCode=1;});child.on('exit',code=>{appCode=code;});
native.on('error',error=>{console.error(error);process.exitCode=1;child.kill();});
native.on('exit',(code,signal)=>{process.exitCode=code===0&&appCode===0&&text.includes('video=1 navigation-return=1')?0:1;if(process.exitCode)console.error(JSON.stringify({nativeExit:code,signal,appCode}));child.kill();});
// 1400 Sleep(10) iterations can take >28s with Windows timer rounding and GPU
// readbacks. Keep a bounded deadline without killing a healthy slow probe.
setTimeout(()=>{console.error('Browser/DX11 probe exceeded 45 seconds');child.kill();native.kill();},45000).unref();
