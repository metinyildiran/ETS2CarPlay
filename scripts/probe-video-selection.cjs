const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',path.resolve(__dirname,'../build/video-selection-profile'));
const source=fs.readFileSync(path.resolve(__dirname,'../browser-extension/page-player.js'),'utf8');
const cropSource=fs.readFileSync(path.resolve(__dirname,'../browser-extension/frames.js'),'utf8');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1100,height:740,webPreferences:{offscreen:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
 await win.loadURL('data:text/html,'+encodeURIComponent('<style>body{margin:0;background:lime}.player{position:absolute;left:80px;top:60px;width:850px;height:500px;background:lime}video{width:640px;height:360px;display:block}.caption{position:absolute;left:160px;top:300px;width:320px;height:30px;background:white}</style><div class="player"><video muted autoplay></video><div class="caption"></div></div>'));
 await win.webContents.executeJavaScript(`(async()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const c=canvas.getContext('2d');const paint=()=>{c.fillStyle='red';c.fillRect(0,0,640,360)};paint();window.paint=setInterval(paint,16);const v=document.querySelector('video');v.srcObject=canvas.captureStream(30);await v.play();})()`);
 const call=(action,selection)=>win.webContents.executeJavaScript(`(()=>{${source};return pageVideo(${JSON.stringify(action)},${JSON.stringify(selection||'auto')});})()`);
 for(const zoom of [1,1.25,.8]){
  win.webContents.setZoomFactor(zoom);await new Promise(r=>setTimeout(r,250));
  const state=await call('select');assert.equal(state.playing,true);
  const shot=await win.webContents.capturePage();
  const image=shot.toDataURL();
  const result=await win.webContents.executeJavaScript(`(async()=>{${cropSource};const im=new Image();im.src=${JSON.stringify(image)};await im.decode();const tab=new OffscreenCanvas(1920,1080),t=tab.getContext('2d');const scale=Math.min(1920/im.width,1080/im.height);t.fillStyle='black';t.fillRect(0,0,1920,1080);t.drawImage(im,(1920-im.width*scale)/2,(1080-im.height*scale)/2,im.width*scale,im.height*scale);const frame=new VideoFrame(tab,{timestamp:0});const out=new OffscreenCanvas(640,360),c=out.getContext('2d');c.drawImage(frame,...sourceRect(frame,${JSON.stringify(state.crop)}),0,0,640,360);frame.close();const pixel=(x,y)=>Array.from(c.getImageData(x,y,1,1).data);return {corners:[pixel(3,3),pixel(636,3),pixel(3,356),pixel(636,356)],caption:pixel(320,315)};})()`);
  assert.ok(result.corners.every(p=>p[0]>240&&p[1]<20&&p[2]<20),JSON.stringify({zoom,result}));
  assert.ok(result.caption.slice(0,3).every(v=>v>240),'caption must remain in capture');
 }
 win.webContents.setZoomFactor(1);await new Promise(r=>setTimeout(r,100));
 await call('select');
 await win.webContents.executeJavaScript("(async()=>{const old=document.querySelector('video'),next=old.cloneNode();next.srcObject=old.srcObject;old.pause();old.replaceWith(next);await next.play();})()");
 assert.equal((await call('snapshot')).playing,true,'replacement autoplay video must resume without reconnecting');
 const chosen=call('region');
 await new Promise(r=>setTimeout(r,100));
 await win.webContents.executeJavaScript(`(()=>{const host=document.documentElement.lastElementChild;host.setPointerCapture=()=>{};host.dispatchEvent(new PointerEvent('pointerdown',{clientX:80,clientY:60,pointerId:1}));host.dispatchEvent(new PointerEvent('pointerup',{clientX:720,clientY:420,pointerId:1}));})()`);
 assert.equal((await chosen).ok,true);assert.equal((await call('snapshot')).sourceId,'region');
 await win.webContents.executeJavaScript("document.querySelector('video').pause()");
 await call('select');assert.equal((await call('snapshot')).playing,false);
 console.log('PASS: real Chromium DOM + video pixels, caption, 80/100/125% zoom, padded frames, replacement autoplay, manual selection, pause');
 app.exit(0);
}).catch(error=>{console.error(error.stack);app.exit(1)});
setTimeout(()=>app.exit(1),20000).unref();
