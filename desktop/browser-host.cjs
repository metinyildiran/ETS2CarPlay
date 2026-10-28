// Headless bridge: playback controls stay in the selected browser tab.
const {app}=require('electron');
const {FrameSender}=require('./transport.cjs');
const {createBrowserBridge}=require('./browser-bridge.cjs');
const config=require('./browser-config.json');
const owner=Number(process.argv.find(a=>a.startsWith('--owner-pid='))?.split('=')[1])||0;
let sender,bridge,timer;
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
  sender=new FrameSender();
  bridge=createBrowserBridge({token:config.token,port:config.port,onFrame:frame=>sender.push(frame)});
  await bridge.listen();
  timer=setInterval(()=>{if(owner){try{process.kill(owner,0);}catch{app.quit();}}},1000);
}).catch(error=>{console.error(error.message);app.quit();});
app.on('window-all-closed',()=>{});
app.on('before-quit',()=>{clearInterval(timer);bridge?.close();sender?.close();});
