// Local-only numeric measurements. Never record URLs, titles, cookies or tokens.
const fs=require('node:fs');
function diagnostics(file){
  let state={},ack={},previous=null,count=0;const history=[];
  const delta=(a,b,key)=>Number.isFinite(a?.[key])&&Number.isFinite(b?.[key])&&a[key]>=b[key]?a[key]-b[key]:null;
  const timer=setInterval(()=>{
    const now={at:Date.now(),state,ack,count};
    if(previous){
      const dt=(now.at-previous.at)/1000,m=state.metrics,p=previous.state.metrics;
      const mt=delta(m,p,'at')/1000,sourceTime=delta(state,previous.state,'sourceAt')/1000;
      const rate=(d,t)=>d!==null&&t>0?Math.round(d/t*10)/10:null;
      const average=(sum,n)=>sum!==null&&n>0?Math.round(sum/n*10)/10:null;
      const output={at:new Date(now.at).toISOString(),playing:state.playing===true,
        sourceFps:state.sourceId===previous.state.sourceId?rate(delta(state,previous.state,'sourceFrames'),sourceTime):null,
        capturedFps:rate(delta(m,p,'received'),mt),preparedFps:rate(delta(m,p,'prepared'),mt),sentFps:rate(delta(m,p,'sent'),mt),
        copyMs:average(delta(m,p,'copyMs'),delta(m,p,'prepared')),sendMs:average(delta(m,p,'sendMs'),delta(m,p,'sent')),
        receivedFps:rate(count-previous.count,dt),nativeAckFps:rate(delta(ack,previous.ack,'sequence'),dt),nativeUploadFps:rate(delta(ack,previous.ack,'uploaded'),dt),
        captureWidth:m?.width,captureHeight:m?.height,targets:ack.targets,connected:ack.connected===true};
      history.push(JSON.stringify(output));if(history.length>120)history.shift();
      try{fs.writeFileSync(file,history.join('\n')+'\n');}catch{}
    }
    previous=now;
  },2500);timer.unref();
  return {state:value=>state=value,ack:value=>ack={...ack,...value},frame:()=>count++,close:()=>clearInterval(timer)};
}
module.exports={diagnostics};
