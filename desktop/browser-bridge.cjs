const http=require('node:http');
const {randomBytes,timingSafeEqual}=require('node:crypto');
const BYTES=1024*512*4;
const videoId=value=>typeof value==='string'&&/^[\w-]{11}$/.test(value)?value:'';
function cleanState(value){
  if(!value||typeof value!=='object')throw new Error('Invalid state');
  const id=videoId(value.videoId);
  const tracks=(Array.isArray(value.audio?.tracks)?value.audio.tracks:[]).slice(0,64).filter(t=>typeof t?.id==='string'&&typeof t?.label==='string').map(t=>({id:t.id.slice(0,1024),label:t.label.replace(/[\r\n\t]/g,' ').slice(0,60)}));
  const sourceId=typeof value.sourceId==='string'&&/^(video-\d+|region)$/.test(value.sourceId)?value.sourceId:'';
  return {videoId:id,sourceId,playing:value.playing===true&&!!(sourceId||id),applied:Number.isSafeInteger(value.applied)?value.applied:-1,
    audio:{videoId:id,supported:tracks.length>0,selected:String(value.audio?.selected||'').slice(0,1024),tracks},
    captions:{videoId:id,available:value.captions?.available===true,enabled:value.captions?.enabled===true}};
}
function createBrowserBridge({token,onFrame,onStatus=()=>{},onAudio=()=>{},onCaptions=()=>{},onDiagnostics=()=>{},port=32127,timeout=3000}){
  if(!/^[a-f0-9]{64}$/.test(token))throw new Error('Invalid pairing token');
  let session='',sessionOrigin='',lastState=0,active=false,serial=0,barrier=0,queue=[];
  const clear=()=>{active=false;onFrame(Buffer.alloc(BYTES));};
  const reset=()=>{clear();session='';queue=[];onDiagnostics({playing:false,metrics:{}});onAudio({tracks:[]});onCaptions({});onStatus('Video sekmesinde Kabine aktar düğmesine bas.');};
  const server=http.createServer(async(req,res)=>{
    const origin=req.headers.origin||'';
    if(req.headers.host!==`127.0.0.1:${server.address().port}`||(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin))){res.writeHead(403).end();return;}
    if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Content-Type, X-FH6-Token, X-FH6-Session, X-FH6-Serial','Access-Control-Allow-Private-Network':'true','Access-Control-Max-Age':'600'}).end();return;}
    const supplied=Buffer.from(String(req.headers['x-fh6-token']||'')),expected=Buffer.from(token);
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){res.writeHead(403).end();return;}
    const json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
    const read=async(max)=>{let n=0,chunks=[];for await(const b of req){n+=b.length;if(n>max)throw new Error('Too large');chunks.push(b);}return Buffer.concat(chunks);};
    const readFrame=async()=>{
      const frame=Buffer.allocUnsafe(BYTES);let at=0;
      for await(const chunk of req){if(at+chunk.length>BYTES)throw new Error('Too large');chunk.copy(frame,at);at+=chunk.length;}
      if(at!==BYTES)throw new Error('Frame size');return frame;
    };
    try{
      if(req.url==='/connect'&&req.method==='POST'){
        await read(1024);
        if(session&&Date.now()-lastState<timeout){res.writeHead(409).end();return;}
        reset();session=randomBytes(24).toString('hex');sessionOrigin=origin;lastState=Date.now();barrier=++serial;
        queue=[{type:'sync',serial}];onStatus('Tarayıcı bağlandı.');json({session});return;
      }
      const key=session;
      if(!key||req.headers['x-fh6-session']!==key||(origin&&sessionOrigin&&origin!==sessionOrigin)){res.writeHead(409).end();return;}
      if(req.url==='/commands'&&req.method==='GET'){const result=queue;queue=[];json(result);return;}
      if(req.url==='/disconnect'&&req.method==='POST'){reset();res.writeHead(204).end();return;}
      if(req.url==='/state'&&req.method==='POST'){
        const raw=JSON.parse((await read(131072)).toString()),state=cleanState(raw);
        if(session!==key){res.writeHead(409).end();return;}
        lastState=Date.now();const next=state.playing&&state.applied>=barrier;
        const diagnostics={sourceId:state.sourceId,playing:state.playing};
        for(const key of ['sourceFrames','sourceAt'])if(Number.isFinite(raw[key])&&raw[key]>=0)diagnostics[key]=raw[key];
        diagnostics.metrics={};
        for(const key of ['received','prepared','sent','copyMs','sendMs','width','height','at','captureLevel','captureChanges','captureFailures','copyP95Ms','copyP99Ms','sendP95Ms','sendP99Ms','captureGapP95Ms','captureGapP99Ms','captureGapMaxMs','sendGapP95Ms','sendGapP99Ms','sendGapMaxMs','queueP95Ms','queueP99Ms','dropped'])if(Number.isFinite(raw.metrics?.[key])&&raw.metrics[key]>=0)diagnostics.metrics[key]=raw.metrics[key];
        onDiagnostics(diagnostics);
        if(!next&&active)clear();active=next;onAudio(state.audio);onCaptions(state.captions);
        onStatus(active?'Tarayıcıdaki video oynatılıyor.':'Video duraklatıldı veya görüntü bekleniyor.');res.writeHead(204).end();return;
      }
      if(req.url==='/frame'&&req.method==='POST'){
        if(Number(req.headers['content-length'])!==BYTES||req.headers['content-type']!=='application/octet-stream'){res.writeHead(400).end();return;}
        const frameSerial=Number(req.headers['x-fh6-serial']),frame=await readFrame();
        if(frame.length!==BYTES)throw new Error('Frame size');
        if(session===key&&active&&Number.isSafeInteger(frameSerial)&&frameSerial>=barrier&&Date.now()-lastState<timeout)onFrame(frame);
        res.writeHead(204).end();return;
      }
      res.writeHead(404).end();
    }catch{if(!res.headersSent)res.writeHead(400).end();}
  });
  server.requestTimeout=5000;server.headersTimeout=5000;
  const timer=setInterval(()=>{if(session&&Date.now()-lastState>timeout)reset();},Math.min(timeout,500));timer.unref();
  return {server,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);}),
    command(cmd){
      if(!session){onStatus('Önce Video sekmesinde Kabine aktar düğmesine bas.');return;}
      const next={...cmd,serial:++serial};
      if(['load','pause','stop'].includes(cmd.type)){barrier=serial;clear();}
      if(queue.length>=32){reset();return;}queue.push(next);
    },
    close(){clearInterval(timer);clear();server.closeAllConnections();server.close();}
  };
}
module.exports={createBrowserBridge,cleanState};
