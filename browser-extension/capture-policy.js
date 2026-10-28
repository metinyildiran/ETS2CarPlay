// Resolution changes are deliberately slower than frame delivery. Never infer a
// video's nominal FPS from dropped-frame counters, or cap a 60 FPS source at 24.
function createCapturePolicy(track,{now=()=>performance.now(),initialLevel=1}={}){
  const sizes=[[960,540],[1280,720],[1920,1080]];
  let level=initialLevel,previous=null,busy=false,closed=false,disabled=false;
  let changed=now(),healthySince=null,slow=0,changes=0,failures=0;
  function ceiling(crop){
    if(!crop||!Number.isFinite(crop.w)||!Number.isFinite(crop.h)||crop.w<=0||crop.h<=0)return 1;
    const vw=crop.viewportWidth||16,vh=crop.viewportHeight||9;
    const scale=Math.min(1280/vw,720/vh),w=crop.w*vw*scale,h=crop.h*vh*scale;
    // Only pay for 1080p when the selected video occupies a small part of the tab.
    return Math.min(1024/w,512/h)>1.2?2:1;
  }
  async function change(next){
    busy=true;healthySince=null;slow=0;
    const [width,height]=sizes[next];
    try{
      await track.applyConstraints({width:{ideal:width,max:width},height:{ideal:height,max:height},frameRate:{min:60,max:60}});
      if(!closed){level=next;changes++;changed=now();previous=null;}
    }catch{
      // Rejected constraints leave the existing stream usable. Don't retry on
      // every poll, restart capture, or interrupt audio on unsupported browsers.
      failures++;disabled=true;
    }finally{busy=false;}
  }
  return {
    async initialize(){if(!closed&&!disabled&&!busy&&level!==1)await change(1);},
    observe(metrics,{playing,crop}={}){
      if(closed||disabled||busy)return;
      if(!playing){previous=null;healthySince=null;slow=0;return;}
      if(!metrics||!Number.isFinite(metrics.at)||metrics.at===previous?.at)return;
      const old=previous;previous={...metrics};
      if(!old)return;
      const dt=metrics.at-old.at,n=metrics.prepared-old.prepared,s=metrics.sent-old.sent;
      const copy=metrics.copyMs-old.copyMs,send=metrics.sendMs-old.sendMs;
      if(dt<1000||dt>6000||n<3||s<3||copy<0||send<0){healthySince=null;slow=0;return;}
      const cost=Math.max(copy/n,send/s),time=now();
      slow=cost>20?slow+1:0;
      if(level>0&&time-changed>=4000&&(cost>40||slow>=2)){void change(level-1);return;}
      const cap=ceiling(crop);
      if(level>cap&&time-changed>=10000){void change(cap);return;}
      if(cost<12){
        healthySince??=time;
        if(level<cap&&time-healthySince>=20000&&time-changed>=20000)void change(level+1);
      }else healthySince=null;
    },
    snapshot(){return {captureLevel:level,captureChanges:changes,captureFailures:failures};},
    close(){closed=true;}
  };
}
