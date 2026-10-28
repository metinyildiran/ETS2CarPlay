// Local-only numeric measurements. Never record URLs, titles, cookies or tokens.
const fs=require('node:fs');
function diagnostics(file){
  let state={},ack={},previous=null,count=0,writing=false,lastFrame=0;const history=[],pipeTimes=[],receiveGaps=[];
  const sample=(list,value)=>{if(Number.isFinite(value)&&value>=0&&list.length<512)list.push(value);};
  const summary=list=>{if(!list.length)return {p95:null,p99:null,max:null};list.sort((a,b)=>a-b);const result={p95:Math.round(list[Math.ceil(list.length*.95)-1]*10)/10,p99:Math.round(list[Math.ceil(list.length*.99)-1]*10)/10,max:Math.round(list.at(-1)*10)/10};list.length=0;return result;};
  const delta=(a,b,key)=>Number.isFinite(a?.[key])&&Number.isFinite(b?.[key])&&a[key]>=b[key]?a[key]-b[key]:null;
  const timer=setInterval(()=>{
    const now={at:Date.now(),state,ack,count};
    if(previous){
      const dt=(now.at-previous.at)/1000,m=state.metrics,p=previous.state.metrics;
      const mt=delta(m,p,'at')/1000,sourceTime=delta(state,previous.state,'sourceAt')/1000;
      const rate=(d,t)=>d!==null&&t>0?Math.round(d/t*10)/10:null;
      const average=(sum,n)=>sum!==null&&n>0?Math.round(sum/n*10)/10:null;
      const pipe=summary(pipeTimes),receive=summary(receiveGaps);
      const output={at:new Date(now.at).toISOString(),playing:state.playing===true,
        sourceFps:state.sourceId===previous.state.sourceId?rate(delta(state,previous.state,'sourceFrames'),sourceTime):null,
        capturedFps:rate(delta(m,p,'received'),mt),preparedFps:rate(delta(m,p,'prepared'),mt),sentFps:rate(delta(m,p,'sent'),mt),
        copyMs:average(delta(m,p,'copyMs'),delta(m,p,'prepared')),sendMs:average(delta(m,p,'sendMs'),delta(m,p,'sent')),
        receivedFps:rate(count-previous.count,dt),nativeAckFps:rate(delta(ack,previous.ack,'sequence'),dt),nativeUploadFps:rate(delta(ack,previous.ack,'uploaded'),dt),
        captureWidth:m?.width,captureHeight:m?.height,targets:ack.targets,connected:ack.connected===true,
        pipeP95Ms:pipe.p95,pipeP99Ms:pipe.p99,pipeMaxMs:pipe.max,receiveGapP95Ms:receive.p95,receiveGapP99Ms:receive.p99,receiveGapMaxMs:receive.max};
      for(const key of ['captureLevel','captureChanges','captureFailures','copyP95Ms','copyP99Ms','sendP95Ms','sendP99Ms','captureGapP95Ms','captureGapP99Ms','captureGapMaxMs','sendGapP95Ms','sendGapP99Ms','sendGapMaxMs','queueP95Ms','queueP99Ms','dropped'])if(Number.isFinite(m?.[key]))output[key]=m[key];
      history.push(JSON.stringify(output));if(history.length>120)history.shift();
      // One bounded asynchronous write; slow OneDrive/storage cannot block frames
      // or accumulate outstanding writes. The next sample writes current history.
      if(!writing){writing=true;try{fs.writeFile(file,history.join('\n')+'\n',()=>{writing=false;});}catch{writing=false;}}
    }
    previous=now;
  },2500);timer.unref();
  return {state:value=>{if(!value.playing||value.sourceId!==state.sourceId){lastFrame=0;receiveGaps.length=0;}state=value;},ack:value=>{sample(pipeTimes,value.pipeMs);ack={...ack,...value};},frame:()=>{count++;if(state.playing){const time=performance.now();if(lastFrame)sample(receiveGaps,time-lastFrame);lastFrame=time;}},close:()=>clearInterval(timer)};
}
module.exports={diagnostics};
