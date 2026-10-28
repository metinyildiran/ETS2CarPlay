let playing=false,applied=0,crop=null,epoch=0,discardPending=()=>{};
onmessage=event=>{
  const msg=event.data;
  if(msg.type==='state'){
    const next=msg.playing===true;
    if(next!==playing||msg.applied!==applied||JSON.stringify(msg.crop)!==JSON.stringify(crop)){epoch++;discardPending();}
    playing=next;applied=msg.applied;crop=msg.crop;
  }
  if(msg.type==='start')void pump(msg).catch(error=>postMessage({error:error.message}));
};
function validCrop(c){return c&&['x','y','w','h'].every(k=>Number.isFinite(c[k]))&&c.x>=0&&c.y>=0&&c.w>0&&c.h>0&&c.x+c.w<=1.002&&c.y+c.h<=1.002;}
function sourceRect(frame,crop){
  // Chromium can letterbox a tab into the capture track's fixed frame size.
  // Map CSS viewport coordinates into the CONTENT rectangle, not the padding.
  const fw=frame.displayWidth,fh=frame.displayHeight;
  const vw=crop.viewportWidth||fw,vh=crop.viewportHeight||fh;
  const scale=Math.min(fw/vw,fh/vh),cw=vw*scale,ch=vh*scale;
  return [(fw-cw)/2+crop.x*cw,(fh-ch)/2+crop.y*ch,Math.min(crop.w*cw,cw*(1-crop.x)),Math.min(crop.h*ch,ch*(1-crop.y))];
}
async function pump({readable,base,token,session}){
  const reader=readable.getReader(),canvas=new OffscreenCanvas(1024,512);
  // Keep scaling on the GPU. Software drawImage on a captured high-resolution
  // tab used most of a 60-fps frame budget before the HTTP request even began.
  const ctx=canvas.getContext('2d',{alpha:false}),bytes=new Uint8Array(1024*512*4);
  let pending=null,draining=null,failed=false,nativeCopy=true;
  discardPending=()=>{pending?.frame.close();pending=null;};
  async function drain(){
    while(pending&&!failed){
      const {frame,frameCrop,frameEpoch,frameSerial}=pending;pending=null;
      try{
        const [sx,sy,sw,sh]=sourceRect(frame,frameCrop);
        const scale=Math.min(1024/sw,512/sh),w=sw*scale,h=sh*scale;
        ctx.fillStyle='#000';ctx.fillRect(0,0,1024,512);ctx.drawImage(frame,sx,sy,sw,sh,(1024-w)/2,(512-h)/2,w,h);
        if(nativeCopy){
          const output=new VideoFrame(canvas,{timestamp:frame.timestamp,alpha:'discard'});
          try{await output.copyTo(bytes,{format:'BGRA',colorSpace:'srgb',layout:[{offset:0,stride:4096}]});}
          catch(error){if(error.name!=='NotSupportedError'&&error.name!=='TypeError')throw error;nativeCopy=false;}
          finally{output.close();}
        }
        if(!nativeCopy){
          // Compatibility path for browsers without explicit BGRA copy support.
          const rgba=ctx.getImageData(0,0,1024,512).data;
          for(let i=0;i<rgba.length;i+=4){bytes[i]=rgba[i+2];bytes[i+1]=rgba[i+1];bytes[i+2]=rgba[i];bytes[i+3]=255;}
        }
        if(!playing||frameEpoch!==epoch)continue;
        // One in flight + one newest pending frame. Slow uploads never leave
        // a FIFO of old frames and don't wait for another capture after finishing.
        const response=await fetch(base+'/frame',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-FH6-Token':token,'X-FH6-Session':session,'X-FH6-Serial':String(frameSerial)},body:bytes,signal:AbortSignal.timeout(2500)});
        if(!response.ok)throw new Error('ETS2 bağlantısı kesildi.');
      }finally{frame.close();}
    }
  }
  function startDrain(){
    if(draining||!pending||failed)return;
    draining=drain().catch(error=>{failed=true;discardPending();postMessage({error:error.message});void reader.cancel();}).finally(()=>{draining=null;startDrain();});
  }
  try{
    while(!failed){
      const {value:frame,done}=await reader.read();if(done)break;
      if(!playing||!validCrop(crop)){frame.close();continue;}
      discardPending();pending={frame,frameCrop:{...crop},frameEpoch:epoch,frameSerial:applied};
      startDrain();
    }
    while(draining)await draining;
  }finally{discardPending();await reader.cancel();}
}
