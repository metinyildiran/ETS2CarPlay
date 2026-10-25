import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),{createBrowserBridge}=require('../desktop/browser-bridge.cjs');
const token='ab'.repeat(32),origin='chrome-extension://'+'a'.repeat(32),id='M7lc1UVf-VE';
async function setup(t,timeout=3000){
 const frames=[],bridge=createBrowserBridge({token,port:0,timeout,onFrame:b=>frames.push(b)});await bridge.listen();t.after(()=>bridge.close());
 const base=`http://127.0.0.1:${bridge.server.address().port}`;let session='';
 const request=(route,method='GET',body,extra={})=>fetch(base+route,{method,headers:{Origin:origin,'X-FH6-Token':token,'X-FH6-Session':session,'Content-Type':Buffer.isBuffer(body)?'application/octet-stream':'application/json',...extra},body:Buffer.isBuffer(body)?body:body===undefined?undefined:JSON.stringify(body)});
 const connect=await request('/connect','POST',{});session=(await connect.json()).session;
 const commands=await (await request('/commands')).json();
 return {bridge,frames,request,serial:commands[0].serial};
}
test('Browser bridge authenticates locally and blocks stale frames after pause or disconnect',async t=>{
 const {bridge,frames,request,serial}=await setup(t),pixels=Buffer.alloc(1024*512*4,255);
 assert.equal((await request('/state','POST',{},{'X-FH6-Token':'wrong'})).status,403);
 assert.equal((await request('/state','POST',{},{Origin:'https://evil.example'})).status,403);
 assert.equal((await request('/connect','POST',{})).status,409);
 assert.equal((await request('/frame','POST',Buffer.alloc(10))).status,400);
 await request('/state','POST',{videoId:id,playing:true,applied:serial});
 await request('/frame','POST',pixels,{'X-FH6-Serial':String(serial)});assert.equal(frames.at(-1)[3],255);
 bridge.command({type:'pause'});assert.equal(frames.at(-1)[3],0);
 await request('/state','POST',{videoId:id,playing:true,applied:serial});
 await request('/frame','POST',pixels,{'X-FH6-Serial':String(serial)});assert.equal(frames.at(-1)[3],0);
 const [pause]=await (await request('/commands')).json();assert.equal(pause.type,'pause');
 await request('/state','POST',{videoId:id,playing:true,applied:pause.serial});
 await request('/frame','POST',pixels,{'X-FH6-Serial':String(pause.serial)});assert.equal(frames.at(-1)[3],255);
 await request('/disconnect','POST');assert.equal(frames.at(-1)[3],0);
 assert.equal((await request('/frame','POST',pixels,{'X-FH6-Serial':String(pause.serial)})).status,409);
});
test('Browser disconnect timeout clears playback even if a capture worker remains alive',async t=>{
 const {frames,request,serial}=await setup(t,100);
 await request('/state','POST',{videoId:id,playing:true,applied:serial});
 await request('/frame','POST',Buffer.alloc(1024*512*4,255),{'X-FH6-Serial':String(serial)});
 await new Promise(r=>setTimeout(r,250));assert.equal(frames.at(-1)[3],0);
 assert.equal((await request('/commands')).status,409);
});
test('Browser source tracks the existing player without altering settings or page layout',()=>{
 const source=readFileSync(new URL('../browser-extension/page-player.js',import.meta.url),'utf8');
 const rect={left:128,top:72,right:1152,bottom:584,width:1024,height:512};
 const video={paused:false,ended:false,readyState:4};let loaded;
 const player={querySelector:()=>video,getBoundingClientRect:()=>rect,getVideoData:()=>({video_id:id}),loadVideoById:v=>loaded=v};
 const context={document:{getElementById:()=>player},innerWidth:1280,innerHeight:720};vm.createContext(context);vm.runInContext(source,context);
 let state=vm.runInContext('playerSnapshot()',context);assert.equal(state.playing,true);assert.equal(state.crop.x,.1);assert.equal(state.crop.w,.8);
 video.paused=true;assert.equal(vm.runInContext('playerSnapshot()',context).playing,false);
 video.paused=false;rect.top=-10;assert.equal(vm.runInContext('playerSnapshot()',context).crop,null);
 vm.runInContext(`playerCommand({type:'load',id:'${id}',startSeconds:123})`,context);assert.equal(loaded.startSeconds,123);
});
