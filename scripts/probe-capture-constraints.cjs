// Isolated Chromium tab-capture fixture. Never captures the user's desktop/tab.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');app.setPath('userData',path.join(root,'build/constraints-probe-profile'));
app.whenReady().then(async()=>{
  const options={show:false,width:1920,height:1080,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false}};
  const source=new BrowserWindow(options),sink=new BrowserWindow(options);
  const folder=path.join(root,'build/constraints-probe');fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'source.html'),'<body style="margin:0;background:red"><script>let n=0;setInterval(()=>document.body.style.background=++n%2?"red":"blue",16);</script>');
  fs.writeFileSync(path.join(folder,'sink.html'),'<body>capture fixture</body>');
  await source.loadFile(path.join(folder,'source.html'));await sink.loadFile(path.join(folder,'sink.html'));
  const id=source.webContents.getMediaSourceId(sink.webContents);
  const results=await sink.webContents.executeJavaScript(`(async()=>{
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:${JSON.stringify(id)},maxWidth:1920,maxHeight:1080,minFrameRate:60,maxFrameRate:60}}});
    const track=stream.getVideoTracks()[0];track.contentHint='motion';
    const reader=new MediaStreamTrackProcessor({track,maxBufferSize:1}).readable.getReader(),results=[];
    for(const [width,height] of [[1280,720],[960,540],[1280,720],[1920,1080]]){
      await track.applyConstraints({width:{ideal:width,max:width},height:{ideal:height,max:height},frameRate:{min:60,max:60}});
      let frames=0,actual,match=0;const start=performance.now();
      while(performance.now()-start<700||!match){
        const {value,done}=await reader.read();if(done)throw Error('Track ended during resize');
        actual=[value.displayWidth,value.displayHeight];value.close();frames++;
        if(actual[0]===width&&actual[1]===height)match++;
        if(performance.now()-start>4000)throw Error('Capture size did not settle: '+JSON.stringify({width,height,actual}));
      }
      results.push({requested:[width,height],actual,frames,elapsedMs:Math.round(performance.now()-start),readyState:track.readyState});
    }
    await reader.cancel();track.stop();return results;
  })()`);
  fs.writeFileSync(path.join(folder,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
setTimeout(()=>{console.error('Constraints probe deadline exceeded');app.exit(1);},20000).unref();
