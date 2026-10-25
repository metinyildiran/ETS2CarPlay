const {app,BrowserWindow}=require('electron');
const path=require('node:path');app.setPath('userData',path.resolve(__dirname,'../build/capture-bench-profile'));
app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,webPreferences:{offscreen:true,backgroundThrottling:false}});await win.loadURL('about:blank');const results=await win.webContents.executeJavaScript(`(async()=>{
 const source=new OffscreenCanvas(2560,1440),s=source.getContext('2d');s.fillStyle='red';s.fillRect(0,0,2560,1440);
 const results=[];
 for(const mode of ['cpu','webcodecs','cpu','webcodecs']){
  const canvas=new OffscreenCanvas(1024,512),c=canvas.getContext('2d',{willReadFrequently:mode==='cpu'}),bytes=new Uint8Array(1024*512*4),times=[];
  for(let i=0;i<100;i++){s.fillStyle=i%2?'red':'blue';s.fillRect(0,0,2560,1440);const input=new VideoFrame(source,{timestamp:i*16667}),start=performance.now();c.fillStyle='black';c.fillRect(0,0,1024,512);c.drawImage(input,0,0,2560,1440,57,0,910,512);
   if(mode==='cpu'){const rgba=c.getImageData(0,0,1024,512).data;for(let n=0;n<rgba.length;n+=4){const r=rgba[n];rgba[n]=rgba[n+2];rgba[n+2]=r;}}
   else {const output=new VideoFrame(canvas,{timestamp:input.timestamp});await output.copyTo(bytes,{format:'BGRA',layout:[{offset:0,stride:4096}]});output.close();}
   input.close();if(i>=10)times.push(performance.now()-start);
  }times.sort((a,b)=>a-b);results.push({mode,medianMs:times[45],p95Ms:times[85]});
 }return results;
})()`);console.log(JSON.stringify(results));app.quit();}).catch(e=>{console.error(e);app.exit(1)});
setTimeout(()=>app.exit(1),30000).unref();
