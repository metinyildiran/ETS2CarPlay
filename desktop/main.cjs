const {app,BrowserWindow,ipcMain}=require('electron');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {FrameSender}=require('./transport.cjs');
const {sampleVideoRate}=require('./video-rate.cjs');
const {parseYouTube}=require('./youtube-url.cjs');
const {ControlClient}=require('./control.cjs');
const {inspectScript,selectScript}=require('./audio-tracks.cjs');
const {inspectCaptions,setCaptions}=require('./captions.cjs');
app.commandLine.appendSwitch('force-device-scale-factor','1');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
const smoke=process.argv.includes('--smoke');
const embedded=process.argv.includes('--embedded');
const ownerPid=Number(process.argv.find(a=>a.startsWith('--owner-pid='))?.split('=')[1])||0;
if(smoke)app.setPath('userData',path.join(app.getPath('temp'),'fh6-player-smoke'));
let control;
let panel,screen,server,sender,active=false,ready=false,queued=null,paints=0,delivered=0,lastUploaded=0,bridge={connected:false};
let timer;
let sourceFps=null,sampling=false;
let currentVideoId='',audioBusy=false,audioTracks={supported:false,tracks:[]};
let captionsBusy=false,captionState={videoId:'',available:false,enabled:false};
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
  const allowed=new Map(['panel.html','screen.html','smoke.html','style.css','panel.js','screen.js','smoke.js'].map(n=>['/'+n,n]));
  server=http.createServer(async(req,res)=>{
    const file=allowed.get(req.url);if(!file||req.method!=='GET'){res.writeHead(404).end();return;}
    if(req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(403).end();return;}
    try{const body=await fs.readFile(path.join(__dirname,file));res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self'; frame-src https://www.youtube.com; connect-src 'self' https://www.youtube.com; img-src 'self' https://i.ytimg.com; object-src 'none'; base-uri 'none'"});res.end(body);}catch{res.writeHead(500).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const prefs={preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'};
  panel=new BrowserWindow({width:560,height:340,show:!smoke&&!embedded,autoHideMenuBar:true,title:'FH6 YouTube',webPreferences:prefs});
  screen=new BrowserWindow({width:1024,height:512,show:false,webPreferences:{...prefs,offscreen:true}});
  for(const win of [panel,screen]){
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==base)event.preventDefault();});
    win.webContents.session.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
  }
  screen.webContents.setFrameRate(smoke?240:60);
  sender=new FrameSender(s=>{bridge={...bridge,...s};if(s.sequence!==undefined)delivered++;},smoke?'FH6CarPlay-test':'FH6CarPlay-v4');
  const transparent=Buffer.alloc(1024*512*4);
  const clear=()=>{active=false;sender.push(transparent);};
  const youtubeFrame=()=>screen.webContents.mainFrame.frames.find(f=>{try{return new URL(f.url).hostname==='www.youtube.com';}catch{return false;}});
  const publishAudio=value=>{audioTracks=value;control?.audio(value);panel.webContents.send('status',{audio:value});};
  const publishCaptions=value=>{captionState=value;control?.captions(value);panel.webContents.send('status',{captions:value});};
  const refreshCaptions=async()=>{
    if(smoke||captionsBusy||!currentVideoId)return;
    const id=currentVideoId,frame=youtubeFrame();if(!frame)return;
    captionsBusy=true;
    try{const value=await frame.executeJavaScript(inspectCaptions(id));if(id===currentVideoId&&value.videoId===id)publishCaptions(value);}catch{}finally{captionsBusy=false;}
  };
  const refreshAudio=async()=>{
    if(smoke||audioBusy||!currentVideoId)return;
    const id=currentVideoId,frame=youtubeFrame();if(!frame)return;
    audioBusy=true;
    try{const value=await frame.executeJavaScript(inspectScript);if(id===currentVideoId&&(!value.videoId||value.videoId===id))publishAudio({...value,videoId:id});}catch{}finally{audioBusy=false;}
  };
  screen.webContents.on('paint',(_event,_dirty,image)=>{paints++;if(active){const size=image.getSize();if(size.width===1024&&size.height===512)sender.push(image.toBitmap());}});
  const dispatch=cmd=>{
    if(!cmd||typeof cmd!=='object')return;
    if(cmd.type==='captions'){
      const frame=youtubeFrame(),id=currentVideoId;
      if(!frame||captionsBusy||cmd.videoId!==id||captionState.videoId!==id||!captionState.available||typeof cmd.enabled!=='boolean')return;
      captionsBusy=true;
      frame.executeJavaScript(setCaptions(id,cmd.enabled)).then(value=>{if(currentVideoId===id&&value.videoId===id)publishCaptions(value);}).catch(()=>control?.report('Altyazı değiştirilemedi.')).finally(()=>{captionsBusy=false;setTimeout(refreshCaptions,350);});
      return;
    }
    if(cmd.type==='audio'){
      const track=audioTracks.videoId===cmd.videoId&&Number.isInteger(cmd.index)?audioTracks.tracks[cmd.index]:null;
      const frame=youtubeFrame();if(!track||!frame)return;
      frame.executeJavaScript(selectScript(cmd.videoId,track.id)).then(ok=>{if(!ok)control?.report('Ses dili değiştirilemedi.');setTimeout(refreshAudio,350);}).catch(()=>control?.report('Ses dili değiştirilemedi.'));
      return;
    }
    if(cmd.type==='load'){
      let video;try{video=parseYouTube(cmd.value);}catch(error){panel.webContents.send('status',{message:error.message});control?.report('Gecersiz YouTube baglantisi veya baslangic suresi.');return;}
      clear();cmd={type:'load',...video};
      currentVideoId=video.id;publishAudio({videoId:video.id,supported:false,tracks:[]});
      publishCaptions({videoId:video.id,available:false,enabled:false});
      sourceFps=null;screen.webContents.setFrameRate(60);
    }else if(!['play','pause','stop','volume'].includes(cmd.type))return;
    if(cmd.type==='volume')cmd={type:'volume',value:Math.max(0,Math.min(100,Number(cmd.value)||0))};
    if(cmd.type==='pause'||cmd.type==='stop')clear();
    if(ready)screen.webContents.send('player-command',cmd);else if(cmd.type==='load')queued=cmd;
  };
  ipcMain.on('command',(event,cmd)=>{
    if(event.sender===panel.webContents&&event.senderFrame===panel.webContents.mainFrame)dispatch(cmd);
  });
  control=new ControlClient(dispatch,()=>app.quit(),smoke?'FH6CarPlay-control-test':'FH6CarPlay-control-v4');
  sender.push(transparent);
  ipcMain.on('player-state',(event,state)=>{
    if(event.sender!==screen.webContents||event.senderFrame!==screen.webContents.mainFrame)return;
    if(state==='ready'){ready=true;if(queued){screen.webContents.send('player-command',queued);queued=null;}}
    else if(state===1){active=true;screen.webContents.invalidate();}
    else clear();
    panel.webContents.send('status',{state});
    control?.report(state==='ready'?'Bağlantı açabilirsin.':state===1?'Video oynatılıyor.':state===2?'Duraklatıldı.':state===0?'Video bitti.':state===3?'Video yükleniyor…':state===5?'Video hazır.':typeof state==='string'?state:'');
  });
  screen.webContents.on('render-process-gone',()=>{clear();panel.webContents.send('status',{message:'Oynatıcı kapandı. Uygulamayı yeniden aç.'});});
  await panel.loadURL(base+'/panel.html');
  await screen.loadURL(base+(smoke?'/smoke.html':'/screen.html'));
  let elapsed=0;
  timer=setInterval(()=>{
    const status={...bridge,sourceFps,paintFps:paints,transferFps:delivered,uploadFps:Math.max(0,(bridge.uploaded||0)-lastUploaded),active};
    panel.webContents.send('status',status);
    if(elapsed%2===0){void refreshAudio();void refreshCaptions();}
    if(smoke)console.log(JSON.stringify(status));
    lastUploaded=bridge.uploaded||0;paints=delivered=0;
    if(!smoke && active && !sampling && elapsed%5===0){
      const frame=screen.webContents.mainFrame.frames.find(f=>{try{return new URL(f.url).hostname==='www.youtube.com';}catch{return false;}});
      if(frame){sampling=true;frame.executeJavaScript(sampleVideoRate).then(fps=>{
        if(Number.isFinite(fps)&&fps>=1&&fps<=240&&!screen.isDestroyed()){
          sourceFps=Math.round(fps*100)/100;
          screen.webContents.setFrameRate(Math.min(240,Math.ceil(fps-0.02)));
        }
      }).catch(()=>{}).finally(()=>{sampling=false;});}
    }
    if(!smoke)elapsed++;
    if(smoke&&++elapsed===8)app.quit();
    if(embedded&&ownerPid){try{process.kill(ownerPid,0);}catch{app.quit();}}
  },1000);
  panel.on('closed',()=>app.quit());
}).catch(e=>{console.error(e);app.quit();});
app.on('before-quit',()=>{clearInterval(timer);sender?.close();control?.close();server?.close();});
