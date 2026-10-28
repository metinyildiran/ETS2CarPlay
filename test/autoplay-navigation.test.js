import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../browser-extension/service-worker.js',import.meta.url),'utf8');
async function harness(mode='video'){
  let listener,updated,removed,hasDocument=false,closed=0,fail=false,lastSelection;
  const tab={id:7,url:'https://video.example/watch/one'};
  const base='chrome-extension://'+'a'.repeat(32)+'/';
  const chrome={runtime:{id:'a'.repeat(32),getURL:p=>base+p,onMessage:{addListener:f=>listener=f},sendMessage:async()=>({ok:true})},
    storage:{session:{set:async()=>{}}},
    tabs:{query:async()=>[tab],get:async()=>tab,onRemoved:{addListener:f=>removed=f},onUpdated:{addListener:f=>updated=f}},
    scripting:{executeScript:async({args})=>{if(fail)throw Error('No document');lastSelection=args[1];return [{result:args[0]==='region'?{ok:true}:{sourceId:'video-1',playing:true,crop:{x:0,y:0,w:1,h:1}}}];}},
    tabCapture:{getMediaStreamId:async()=>'stream'},
    offscreen:{hasDocument:async()=>hasDocument,createDocument:async()=>{hasDocument=true;},closeDocument:async()=>{closed++;hasDocument=false;}}};
  vm.runInNewContext(source,{chrome,URL,Date,importScripts:()=>{},pageVideo:()=>{}});
  const send=(type,extra={},from='popup')=>new Promise(resolve=>listener({to:'service',type,...extra},{id:chrome.runtime.id,url:base+from+'.html'},resolve));
  assert.equal((await send('start',{mode,selection:'auto'})).ok,true);
  return {send,tab,update:change=>updated(7,change,tab),snapshot:()=>send('snapshot',{tabId:7},'offscreen'),setFail:v=>fail=v,get closed(){return closed;},get selection(){return lastSelection;}};
}
test('Same-origin autoplay loading preserves the stream and recovers transient document failures',async()=>{
  const h=await harness();h.tab.url='https://video.example/watch/two';h.update({status:'loading',url:h.tab.url});
  h.setFail(true);assert.equal((await h.snapshot()).state.playing,false);assert.equal(h.closed,0);
  h.setFail(false);assert.equal((await h.snapshot()).state.playing,true);assert.equal(h.selection,'follow');assert.equal(h.closed,0);
});
test('Cross-origin navigation closes capture rather than silently sharing another site',async()=>{
  const h=await harness();h.tab.url='https://another.example/';h.update({url:h.tab.url});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(h.closed,1);
});
test('Manual region capture stops on navigation instead of applying an old rectangle to a new page',async()=>{
  const h=await harness('region');h.update({status:'loading'});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(h.closed,1);
});
