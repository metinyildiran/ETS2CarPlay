const {app,BrowserWindow}=require('electron');
const http=require('node:http');
const path=require('node:path');
const {inspectScript,selectScript}=require('../desktop/audio-tracks.cjs');
app.setPath('userData',path.join(app.getPath('temp'),'fh6-audio-probe'));
const id=process.argv.find(a=>a.startsWith('--video='))?.slice(8)||'M7lc1UVf-VE';
let win,server;
app.whenReady().then(async()=>{
 server=http.createServer((_q,r)=>r.end(`<html><body><div id="player"></div><script src="https://www.youtube.com/iframe_api"></script><script>function onYouTubeIframeAPIReady(){new YT.Player('player',{videoId:${JSON.stringify(id)},playerVars:{origin:location.origin},events:{onReady:e=>{e.target.mute();e.target.playVideo();}}});}</script></body></html>`));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:false,width:1024,height:512,webPreferences:{offscreen:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
 await win.loadURL(`http://127.0.0.1:${server.address().port}`);
 for(let attempt=0;attempt<15;attempt++){
  await new Promise(r=>setTimeout(r,1000));
  const f=win.webContents.mainFrame.frames.find(f=>f.url.startsWith('https://www.youtube.com/embed/'));
  if(!f)continue;
  try{const result=await f.executeJavaScript(inspectScript);if(attempt===14)console.log(JSON.stringify(await f.executeJavaScript(`(()=>{const p=document.getElementById('movie_player');return {player:!!p,audioMethods:p?Object.keys(p).filter(k=>/audio/i.test(k)):[],state:p?.getPlayerState?.(),error:document.querySelector('.ytp-error-content-wrap')?.innerText,result:${inspectScript}}})()`)));if(result.tracks?.length){
   console.log(JSON.stringify({supported:result.supported,videoId:result.videoId,count:result.tracks.length,selected:result.selected}));
   console.log('track-shape='+JSON.stringify(await f.executeJavaScript(`(()=>{const t=document.getElementById('movie_player').getAvailableAudioTracks()[0];return {languageInfo:t.getLanguageInfo?.(),xtags:t.getXtags?.()}})()`)));
   const next=result.tracks.find(t=>t.id!==result.selected);
   if(next){const requested=await f.executeJavaScript(selectScript(result.videoId,next.id));await new Promise(r=>setTimeout(r,1200));const after=await f.executeJavaScript(inspectScript);console.log(JSON.stringify({requested,selectionConfirmed:after.selected===next.id,labels:after.tracks.map(t=>t.label)}));if(after.selected!==next.id)process.exitCode=1;}
   app.quit();return;
  }}catch(e){console.log(e.message);}
 }
 console.log('No selectable audio tracks detected');process.exitCode=1;app.quit();
});
app.on('before-quit',()=>server?.close());
setTimeout(()=>app.quit(),25000).unref();
