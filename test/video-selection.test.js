import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../browser-extension/page-player.js',import.meta.url),'utf8');
function harness(){
  const nodes=[];
  const doc={querySelectorAll:()=>nodes,defaultView:{getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})}};
  const c=vm.createContext({document:doc,innerWidth:1280,innerHeight:720,scrollX:0,scrollY:0});vm.runInContext(source,c);
  const add=(left,top,width,height,paused=false)=>{
    const r={left,top,width,height,right:left+width,bottom:top+height};
    const v={tagName:'VIDEO',isConnected:true,offsetWidth:width,offsetHeight:height,clientWidth:width,clientHeight:height,clientLeft:0,clientTop:0,ownerDocument:doc,paused,ended:false,readyState:4,getBoundingClientRect:()=>r};nodes.push(v);return {v,r};
  };
  return {c,nodes,doc,add,call:(...args)=>c.pageVideo(...args)};
}
test('Generic video selection uses the video rectangle and stays on a paused source',()=>{
  const h=harness(),a=h.add(128,72,640,360),b=h.add(0,0,1200,600,true);
  let s=h.call('select');assert.equal(s.sourceId,'video-1');assert.equal(s.crop.x,.1);assert.equal(s.crop.w,.5);
  a.v.paused=true;b.v.paused=false;s=h.call();assert.equal(s.playing,false);assert.equal(s.sourceId,'video-1');
  assert.equal(h.call('select','2').sourceId,'video-2');
});
test('Offscreen video does not leak adjacent page content and removed sources stop',()=>{
  const h=harness(),a=h.add(128,72,640,360);h.call('select');
  a.r.top=-10;assert.equal(h.call().crop,null);assert.equal(h.call().playing,false);
  a.v.isConnected=false;h.nodes.length=0;assert.equal(h.call().sourceId,'');
  assert.throws(()=>h.call('select'),/video bulunamadı/);
});
test('Same-origin iframe coordinates and clipping are transformed into the top viewport',()=>{
  const h=harness(),child=h.add(20,30,400,200);h.nodes.length=0;
  const childDoc={querySelectorAll:()=>[child.v]};
  h.nodes.push({tagName:'IFRAME',getBoundingClientRect:()=>({left:100,top:50,width:600,height:400}),ownerDocument:h.doc,offsetWidth:600,offsetHeight:400,clientWidth:600,clientHeight:400,clientLeft:0,clientTop:0,contentDocument:childDoc});
  childDoc.defaultView={...h.doc.defaultView,frameElement:h.nodes[0]};child.v.ownerDocument=childDoc;
  const s=h.call('select');assert.equal(s.crop.x,120/1280);assert.equal(s.crop.y,80/720);
  child.r.left=250;assert.equal(h.call().crop,null);
});
test('Manual region invalidates permanently after scrolling instead of showing unrelated content',()=>{
  const h=harness();h.call('list');
  h.c.__ets2VideoCaptureV1.region={rect:{left:0,top:0,right:640,bottom:360,width:640,height:360},viewport:{width:1280,height:720,x:0,y:0,scale:1}};
  assert.equal(h.call().playing,true);h.c.scrollY=100;assert.equal(h.call().playing,false);
  h.c.scrollY=0;assert.equal(h.call().crop,null);
});
test('Capture crop compensates centered tab padding, zoom scale and portrait frames',()=>{
  const c=vm.createContext({});vm.runInContext(readFileSync(new URL('../browser-extension/frames.js',import.meta.url),'utf8'),c);
  const r=(fw,fh,vw,vh)=>Array.from(c.sourceRect({displayWidth:fw,displayHeight:fh},{x:.1,y:.1,w:.5,h:.5,viewportWidth:vw,viewportHeight:vh}));
  assert.deepEqual(r(1920,1080,1280,720),[192,108,960,540]);
  assert.deepEqual(r(1920,1080,1280,600),[192,180,960,450]);
  assert.deepEqual(r(1920,1080,600,1000),[700.8,108,324,540]);
});

test('Autoplay follows a replacement in the same player after an empty loading interval',()=>{
  const h=harness(),old=h.add(128,72,640,360);h.call('select');
  old.v.isConnected=false;h.nodes.length=0;assert.equal(h.call().playing,false);
  const sidebar=h.add(850,72,300,180);assert.equal(h.call().playing,false);
  const next=h.add(128,72,640,360);const s=h.call();assert.equal(s.playing,true);assert.equal(s.sourceId,'video-3');
  next.v.paused=true;assert.equal(h.call().playing,false);
});
test('Ended player can hand off to its overlapping successor, paused player cannot',()=>{
  const h=harness(),old=h.add(128,72,640,360);h.call('select');
  old.v.paused=true;h.add(128,72,640,360);assert.equal(h.call().sourceId,'video-1');
  old.v.ended=true;assert.equal(h.call().sourceId,'video-2');
});
test('Automatic mode reacquires a video in a fresh document; fixed mode waits for selection',()=>{
  const h=harness();h.add(128,72,640,360);
  assert.equal(h.call('snapshot','fixed').playing,false);
  assert.equal(h.call('snapshot','follow').playing,true);
});

test('Steady playback measures only the selected video without rescanning the DOM',()=>{
  const h=harness(),video=h.add(128,72,640,360);h.call('select');
  h.doc.querySelectorAll=()=>{throw Error('Unexpected full-page scan');};
  for(let i=0;i<100;i++){video.r.left=128+i;assert.equal(h.call().crop.x,(128+i)/1280);}
  video.v.paused=true;assert.equal(h.call().playing,false);
});
