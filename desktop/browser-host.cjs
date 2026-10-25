// Entry point for the optional browser package. The ordinary player is unchanged.
const {app}=require('electron');
const {FrameSender}=require('./transport.cjs');
const {ControlClient}=require('./control.cjs');
const {parseYouTube}=require('./youtube-url.cjs');
const {createBrowserBridge}=require('./browser-bridge.cjs');
const config=require('./browser-config.json');
const owner=Number(process.argv.find(a=>a.startsWith('--owner-pid='))?.split('=')[1])||0;
let sender,control,bridge,timer;
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
  sender=new FrameSender();
  control=new ControlClient(cmd=>{
    if(cmd.type==='load'){try{cmd={type:'load',...parseYouTube(cmd.value)};}catch{control.report('Geçerli bir YouTube bağlantısı yapıştır.');return;}}
    bridge?.command(cmd);
  },()=>app.quit(),'FH6CarPlay-control-v4');
  bridge=createBrowserBridge({token:config.token,port:config.port,onFrame:frame=>sender.push(frame),onStatus:text=>control.report(text),onAudio:value=>control.audio(value),onCaptions:value=>control.captions(value)});
  await bridge.listen();control.report('YouTube sekmesinde Kabine aktar düğmesine bas.');
  timer=setInterval(()=>{if(owner){try{process.kill(owner,0);}catch{app.quit();}}},1000);
}).catch(error=>{console.error(error.message);app.quit();});
app.on('window-all-closed',()=>{});
app.on('before-quit',()=>{clearInterval(timer);bridge?.close();sender?.close();control?.close();});
