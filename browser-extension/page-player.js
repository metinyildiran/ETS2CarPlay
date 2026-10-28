// Runs in the extension's isolated world in the explicitly selected tab.
// No page styles, playback settings, URLs or cookies are changed.
function pageVideo(action='snapshot',selection='auto'){
  const key='__ets2VideoCaptureV1';
  const state=globalThis[key]??={ids:new WeakMap(),next:1,selected:null,region:null,cancel:null,anchor:null};
  const viewport=()=>({width:innerWidth,height:innerHeight,x:scrollX,y:scrollY,scale:globalThis.visualViewport?.scale||1});
  const vp=viewport();
  const normalize=r=>{
    if(!r||r.width<2||r.height<2||r.left<0||r.top<0||r.right>vp.width||r.bottom>vp.height)return null;
    return {x:r.left/vp.width,y:r.top/vp.height,w:r.width/vp.width,h:r.height/vp.height,viewportWidth:vp.width,viewportHeight:vp.height};
  };
  function collect(root=document,ox=0,oy=0,sx=1,sy=1,clip={left:0,top:0,right:vp.width,bottom:vp.height},depth=0,route=null){
    if(depth>8)return [];
    const found=[];
    for(const node of route?[route[0]]:root.querySelectorAll('video,iframe')){
      const r=node.getBoundingClientRect(),style=node.ownerDocument.defaultView.getComputedStyle(node);
      if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||r.width<2||r.height<2)continue;
      const tx=node.offsetWidth?r.width/node.offsetWidth:1,ty=node.offsetHeight?r.height/node.offsetHeight:1;
      const left=ox+(r.left+node.clientLeft*tx)*sx,top=oy+(r.top+node.clientTop*ty)*sy;
      const rect={left,top,width:node.clientWidth*tx*sx,height:node.clientHeight*ty*sy};rect.right=left+rect.width;rect.bottom=top+rect.height;
      if(node.tagName==='IFRAME'){
        try{if(node.contentDocument)found.push(...collect(node.contentDocument,left,top,sx*tx,sy*ty,{left:Math.max(clip.left,left),top:Math.max(clip.top,top),right:Math.min(clip.right,rect.right),bottom:Math.min(clip.bottom,rect.bottom)},depth+1,route?route.slice(1):null));}catch{}
      }else{
        if(!state.ids.has(node))state.ids.set(node,String(state.next++));
        const contained=rect.left>=clip.left&&rect.top>=clip.top&&rect.right<=clip.right&&rect.bottom<=clip.bottom;
        found.push({id:state.ids.get(node),node,rect,crop:contained?normalize(rect):null,playing:!node.paused&&!node.ended&&node.readyState>=2});
      }
    }
    if(!route)for(const node of root.querySelectorAll('*'))if(node.shadowRoot)found.push(...collect(node.shadowRoot,ox,oy,sx,sy,clip,depth+1));
    return found;
  }
  if(action==='region'){
    state.cancel?.();state.region=null;state.selected=null;state.anchor=null;
    return new Promise(resolve=>{
      const host=document.createElement('div');host.style.cssText='position:fixed!important;inset:0!important;z-index:2147483647!important;cursor:crosshair!important;touch-action:none!important;';
      const shadow=host.attachShadow({mode:'closed'});
      shadow.innerHTML='<style>:host{all:initial}.hint{position:absolute;top:12px;left:12px;background:#142333;color:white;padding:12px;font:16px system-ui;pointer-events:none}.box{position:absolute;border:2px solid #51bfff;box-sizing:border-box;background:#51bfff22;pointer-events:none}</style><div class="hint">Video alanını sürükleyerek seç · Esc: iptal</div><div class="box"></div>';
      const box=shadow.querySelector('.box');let start;
      const finish=rect=>{host.remove();document.removeEventListener('keydown',escape,true);state.cancel=null;if(rect){state.region={rect,viewport:viewport()};resolve({ok:true});}else resolve({ok:false});};
      const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(null);}};
      state.cancel=()=>finish(null);document.addEventListener('keydown',escape,true);
      host.onpointerdown=e=>{e.preventDefault();start={x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId);};
      const rect=e=>{const left=Math.max(0,Math.min(start.x,e.clientX)),top=Math.max(0,Math.min(start.y,e.clientY)),right=Math.min(innerWidth,Math.max(start.x,e.clientX)),bottom=Math.min(innerHeight,Math.max(start.y,e.clientY));return {left,top,right,bottom,width:right-left,height:bottom-top};};
      host.onpointermove=e=>{if(!start)return;const r=rect(e);Object.assign(box.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});};
      host.onpointerup=e=>{if(!start)return;const r=rect(e);finish(r.width>=20&&r.height>=20?r:null);};
      host.onpointercancel=()=>finish(null);
      (document.fullscreenElement||document.documentElement).append(host);
    });
  }
  if(action==='stop'){state.cancel?.();state.region=null;state.selected=null;state.anchor=null;return {};}
  if(action==='snapshot'&&state.region){
    const valid=JSON.stringify(vp)===JSON.stringify(state.region.viewport);
    if(!valid)state.region.invalid=true;
    const crop=state.region.invalid?null:normalize(state.region.rect);
    return {sourceId:'region',playing:!!crop,crop,reason:crop?'':'Sayfa konumu değişti. Alanı yeniden seç.'};
  }
  // Once selected, measure only that video and its iframe ancestors. Scanning
  // every element/shadow root on each heartbeat competes with video rendering.
  let route=null;
  if(action==='snapshot'&&state.selected?.isConnected&&!state.selected.ended){
    route=[state.selected];let doc=state.selected.ownerDocument;
    while(doc!==document){const frame=doc.defaultView?.frameElement;if(!frame){route=null;break;}route.unshift(frame);doc=frame.ownerDocument;}
  }
  const videos=collect(document,0,0,1,1,undefined,0,route);
  const best=items=>items.filter(v=>v.crop).sort((a,b)=>Number(b.playing)-Number(a.playing)||b.rect.width*b.rect.height-a.rect.width*a.rect.height)[0];
  const remember=v=>{state.selected=v.node;state.anchor={...v.rect};};
  if(action==='list')return videos.map(v=>({id:v.id,label:`Video ${v.id} · ${Math.round(v.rect.width)}×${Math.round(v.rect.height)}${v.playing?' · oynuyor':''}`,visible:!!v.crop}));
  if(action==='select'){
    state.region=null;
    const v=selection==='auto'?best(videos):videos.find(v=>v.id===selection&&v.crop);
    if(!v)throw new Error('Görünür video bulunamadı. Videoyu görünür tut veya Alan seç kullan.');
    remember(v);
  }
  let v=videos.find(v=>v.node===state.selected);
  if(action==='snapshot'&&!state.region){
    // Same-origin document navigation loses the isolated-world state. Only the
    // explicitly started automatic mode may select a new main video there.
    if(!state.selected&&selection==='follow'){v=best(videos);if(v)remember(v);}
    // Sites often replace the video element between playlist items. Follow the
    // same player area, never a sidebar autoplay video just because ours paused.
    else if(state.selected&&(state.selected.isConnected===false||state.selected.ended)){
      const a=state.anchor;
      const next=best(videos.filter(candidate=>{
        if(candidate.node===state.selected||!candidate.playing||!a)return false;
        const r=candidate.rect,intersection=Math.max(0,Math.min(a.right,r.right)-Math.max(a.left,r.left))*Math.max(0,Math.min(a.bottom,r.bottom)-Math.max(a.top,r.top));
        return intersection/Math.max(a.width*a.height,r.width*r.height)>=.6;
      }));
      if(next){v=next;remember(v);}
    }
  }
  if(v?.crop)state.anchor={...v.rect};
  const quality=v?.node.getVideoPlaybackQuality?.();
  return {sourceId:v?'video-'+v.id:'',sourceFrames:quality?quality.totalVideoFrames-quality.droppedVideoFrames:null,sourceAt:Date.now(),playing:!!v?.playing&&!!v?.crop,crop:v?.crop||null,reason:!v?'Sonraki video bekleniyor. Video görünür olduğunda aktarım devam eder.':!v.crop?'Video alanını tamamen görünür tut.':''};
}
