const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {inspectScript,selectScript}=require('../desktop/audio-tracks.cjs');
const {inspectCaptions,setCaptions}=require('../desktop/captions.cjs');
const source=fs.readFileSync(path.join(__dirname,'../browser-extension/page-player.js'),'utf8');
app.setPath('userData',path.join(__dirname,'../build/browser-youtube-probe-profile'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
 win.webContents.setAudioMuted(true);
 await win.loadURL('https://www.youtube.com/watch?v=iogcY_4xGjo').catch(error=>{if(error.errno!==-3&&error.code!=='ERR_ABORTED')throw error;});
 for(let attempt=0;attempt<18;attempt++){
  await delay(1000);
  const state=await win.webContents.executeJavaScript(`(()=>{${source};return playerSnapshot();})()`);
  if(state.videoId!=='iogcY_4xGjo'||!state.crop)continue;
  const cc=await win.webContents.executeJavaScript(inspectCaptions(state.videoId));
  await win.webContents.executeJavaScript(setCaptions(state.videoId,!cc.enabled));await delay(600);
  const after=await win.webContents.executeJavaScript(inspectCaptions(state.videoId));
  const audio=await win.webContents.executeJavaScript(inspectScript),next=audio.tracks.find(t=>t.id!==audio.selected);
  let audioChanged=false;
  if(next){await win.webContents.executeJavaScript(selectScript(state.videoId,next.id));await delay(700);audioChanged=(await win.webContents.executeJavaScript(inspectScript)).selected===next.id;}
  const result={sourceVideo:state.videoId,crop:state.crop,captionsAvailable:cc.available,captionChanged:after.enabled!==cc.enabled,audioTracks:audio.tracks.length,audioChanged};
  console.log(JSON.stringify(result));app.exit(result.captionChanged&&audioChanged?0:1);return;
 }
 console.log('YouTube source was not ready or fully visible.');app.exit(1);
}).catch(error=>{console.error(error.message);app.exit(1);});
setTimeout(()=>app.exit(1),25000).unref();
