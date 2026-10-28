let current;
async function api(ctx,route,{method='GET',body}={}){
  const response=await fetch(ctx.base+route,{method,headers:{'X-FH6-Token':ctx.token,'X-FH6-Session':ctx.session||'','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(2500)});
  if(!response.ok)throw new Error(response.status===409?'Bağlantıyı yeniden başlat.':'ETS2 tarayıcı modunu açıp yeniden dene.');
  return response.status===204?null:response.json();
}
const status=message=>chrome.runtime.sendMessage({to:'service',type:'status',message}).catch(()=>{});
async function finish(message='Aktarım durdu. Navigasyon geri gelir.'){
  const ctx=current;if(!ctx)return;current=null;ctx.stopped=true;
  clearTimeout(ctx.poll);ctx.worker?.terminate();ctx.stream?.getTracks().forEach(t=>t.stop());
  await Promise.allSettled([ctx.output?.close(),ctx.session?api(ctx,'/disconnect',{method:'POST'}):Promise.resolve(),status(message)]);
}
async function begin(msg){
  await finish();
  const config=await (await fetch('config.json')).json();
  const ctx=current={...config,base:`http://127.0.0.1:${config.port}`,tabId:msg.tabId,applied:0};
  try{
    // Consume the short-lived stream ID immediately, before any server roundtrip.
    ctx.stream=await navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:msg.streamId}},video:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:msg.streamId,maxFrameRate:60}}});
    ctx.output=new AudioContext();ctx.source=ctx.output.createMediaStreamSource(ctx.stream);ctx.source.connect(ctx.output.destination);await ctx.output.resume();
    const connection=await api(ctx,'/connect',{method:'POST',body:{}});ctx.session=connection.session;
    const track=ctx.stream.getVideoTracks()[0];track.onended=()=>{if(current===ctx)void finish('Sekme paylaşımı sona erdi.');};
    if(!window.MediaStreamTrackProcessor)throw new Error('Bu tarayıcı sürümü aktarımı desteklemiyor. Chrome veya Edge’i güncelle.');
    const readable=new MediaStreamTrackProcessor({track,maxBufferSize:1}).readable;
    ctx.worker=new Worker('frames.js');ctx.worker.postMessage({type:'start',readable,base:ctx.base,token:ctx.token,session:ctx.session},[readable]);
    ctx.worker.onmessage=event=>{if(event.data?.error&&current===ctx)void finish(event.data.error);};
    ctx.worker.onerror=()=>{if(current===ctx)void finish('Görüntü aktarımı durdu; yeniden bağlan.');};
    async function poll(){
      if(current!==ctx)return;
      try{
        const commands=await api(ctx,'/commands');
        for(const command of commands){
          if(['pause','stop','load'].includes(command.type))ctx.worker.postMessage({type:'state',playing:false,applied:ctx.applied});
          // The bridge's initial sync serial is still used to reject stale frames.
          // Playback and all other controls now belong to the browser player.
          ctx.applied=command.serial;
        }
        const result=await chrome.runtime.sendMessage({to:'service',type:'snapshot',tabId:ctx.tabId});
        if(!result?.state)throw new Error(result?.message||'Video sekmesine erişilemiyor.');
        const state={...result.state,applied:ctx.applied};
        await api(ctx,'/state',{method:'POST',body:state});
        if(current!==ctx)return;
        ctx.worker.postMessage({type:'state',playing:state.playing,applied:ctx.applied,crop:state.crop});
        await status(state.reason||(!state.crop?'Video alanını tamamen görünür tut.':state.playing?'Aktarım açık. Kontrolleri tarayıcıdan kullan.':'Video duraklatıldı; navigasyon gösteriliyor.'));
        ctx.poll=setTimeout(poll,200);
      }catch(error){if(current===ctx)await finish(error.message);}
    }
    void poll();return {ok:true};
  }catch(error){await finish(error.message);return {ok:false,message:error.message};}
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||msg?.to!=='offscreen')return;
  if(msg.type==='start'){begin(msg).then(reply);return true;}
  if(msg.type==='stop'){finish().then(()=>reply({ok:true}));return true;}
});
