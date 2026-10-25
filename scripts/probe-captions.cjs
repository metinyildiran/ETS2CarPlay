const {app,BrowserWindow}=require('electron');
const http=require('node:http');
const path=require('node:path');
const {inspectCaptions,setCaptions}=require('../desktop/captions.cjs');
app.setPath('userData',path.join(app.getPath('temp'),'fh6-captions-probe'));
const id='iogcY_4xGjo';let win,server,passed=false;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 server=http.createServer((_q,r)=>r.end(`<html><body><div id="player"></div><script src="https://www.youtube.com/iframe_api"></script><script>function onYouTubeIframeAPIReady(){new YT.Player('player',{videoId:'${id}',playerVars:{origin:location.origin},events:{onReady:e=>{e.target.mute();e.target.playVideo();}}});}</script></body></html>`));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:false,width:1024,height:512,webPreferences:{offscreen:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
 await win.loadURL(`http://127.0.0.1:${server.address().port}`);
 for(let attempt=0;attempt<18;attempt++){
  await delay(1000);const frame=win.webContents.mainFrame.frames.find(f=>f.url.startsWith('https://www.youtube.com/embed/'));if(!frame)continue;
  const before=await frame.executeJavaScript(inspectCaptions(id));if(!before.available){if(attempt===17)console.log(JSON.stringify(await frame.executeJavaScript(`(()=>{const p=document.getElementById('movie_player'),b=p?.querySelector('.ytp-subtitles-button');return {videoId:p?.getVideoData?.()?.video_id,state:p?.getPlayerState?.(),buttons:[...document.querySelectorAll('button')].map(e=>({class:e.className,label:e.getAttribute('aria-label'),pressed:e.getAttribute('aria-pressed')})),captionMethods:p?Object.keys(p).filter(k=>/caption|subtitle/i.test(k)):[],button:!!b,pressed:b?.getAttribute('aria-pressed'),disabled:b?.getAttribute('aria-disabled'),display:b&&getComputedStyle(b).display,visibility:b&&getComputedStyle(b).visibility,error:document.querySelector('.ytp-error-content-wrap')?.innerText}})()`)));continue;}
  await frame.executeJavaScript(setCaptions(id,true));await delay(1200);
  const enabled=await frame.executeJavaScript(inspectCaptions(id));
  await frame.executeJavaScript(setCaptions(id,false));await delay(500);
  const disabled=await frame.executeJavaScript(inspectCaptions(id));
  passed=enabled.enabled&&!disabled.enabled;
  console.log(JSON.stringify({available:before.available,enabled:enabled.enabled,disabled:!disabled.enabled,passed}));break;
 }
 app.exit(passed?0:1);
}).catch(error=>{console.error(error.message);app.exit(1);});
app.on('before-quit',()=>server?.close());
setTimeout(()=>app.exit(1),25000).unref();
