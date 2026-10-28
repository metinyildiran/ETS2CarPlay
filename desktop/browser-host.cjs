// Headless bridge: playback controls stay in the selected browser tab.
const {app}=require('electron');
const {FrameSender}=require('./transport.cjs');
const {createBrowserBridge}=require('./browser-bridge.cjs');
const config=require('./browser-config.json');
const {diagnostics}=require('./browser-diagnostics.cjs');
const owner=Number(process.argv.find(a=>a.startsWith('--owner-pid='))?.split('=')[1])||0;
let sender,bridge,timer,metrics;
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
  metrics=diagnostics(require('node:path').join(__dirname,'capture-diagnostics.jsonl'));
  sender=new FrameSender(value=>metrics.ack(value));
  bridge=createBrowserBridge({token:config.token,port:config.port,onFrame:frame=>{metrics.frame();sender.push(frame);},onDiagnostics:value=>metrics.state(value)});
  await bridge.listen();
  timer=setInterval(()=>{if(owner){try{process.kill(owner,0);}catch{app.quit();}}},1000);
}).catch(error=>{console.error(error.message);app.quit();});
app.on('window-all-closed',()=>{});
app.on('before-quit',()=>{clearInterval(timer);metrics?.close();bridge?.close();sender?.close();});
