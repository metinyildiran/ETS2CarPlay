import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../browser-extension/frames.js',import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let i=0;i<100;++i){if(predicate())return;await tick();}throw Error('Worker condition timed out');}
function harness({fallback=false,holdCopy=false}={}){
 const requests=[],messages=[],frames=[],copies=[];let controller,releaseCopy;
 const stream=new ReadableStream({start(c){controller=c;}});
 class Canvas {constructor(){this.id=0;}getContext(){return {fillRect(){},drawImage:frame=>{this.id=frame.id;},getImageData:()=>({data:Uint8Array.of(193,67,this.id,255)})};}}
 class Frame {constructor(canvas){this.id=canvas.id;}async copyTo(bytes,options){copies.push(this.id);assert.equal(options.format,'BGRA');if(fallback)throw Object.assign(Error('unsupported'),{name:'NotSupportedError'});if(holdCopy)await new Promise(resolve=>{releaseCopy=resolve;});bytes.set([this.id,67,193,255]);}close(){}}
 const context=vm.createContext({OffscreenCanvas:Canvas,VideoFrame:Frame,ReadableStream,Uint8Array,AbortSignal,postMessage:msg=>messages.push(msg),fetch:(_url,opts)=>new Promise(resolve=>requests.push({id:opts.body[0],body:opts.body,red:opts.body[2],serial:opts.headers['X-FH6-Serial'],release:(ok=true)=>resolve({ok})}))});
 vm.runInContext(source,context);
 const state=(playing,applied=1)=>context.onmessage({data:{type:'state',playing,applied,crop:{x:0,y:0,w:1,h:1}}});
 state(true);context.onmessage({data:{type:'start',readable:stream,base:'http://127.0.0.1',token:'test',session:'test'}});
 return {requests,messages,copies,state,releaseCopy:()=>releaseCopy?.(),push(id){const frame={id,displayWidth:1024,displayHeight:512,timestamp:id,closed:0,close(){this.closed++;}};frames.push(frame);controller.enqueue(frame);return frame;},frames,finish(){controller.close();}};
}
test('Readback overlaps upload with two buffers and overload keeps only the latest pending input',async()=>{
 const h=harness();h.push(1);await until(()=>h.requests.length===1);
 const prepared=h.push(2);await until(()=>prepared.closed===1);
 assert.deepEqual(h.copies,[1,2]);assert.equal(h.requests.length,1);
 assert.equal(h.requests[0].body[0],1,'in-flight upload buffer must not be overwritten');
 const skipped=h.push(3);const latest=h.push(4);await until(()=>skipped.closed===1);
 assert.equal(h.requests.length,1);assert.equal(latest.closed,0);
 h.requests[0].release();await until(()=>h.requests.length===2);assert.equal(h.requests[1].id,2);
 await until(()=>latest.closed===1);h.requests[1].release();await until(()=>h.requests.length===3);
 assert.equal(h.requests[2].id,4);assert.equal(new Set(h.requests.map(r=>r.body)).size,2);
 h.requests[2].release();h.finish();
 assert.ok(h.frames.every(f=>f.closed===1));assert.equal(h.messages.length,0);
});

test('Pause discards a prepared frame waiting behind an upload',async()=>{
 const h=harness();h.push(1);await until(()=>h.requests.length===1);
 const ready=h.push(2);await until(()=>ready.closed===1);h.state(false);h.state(true);
 h.requests[0].release();await tick();await tick();assert.equal(h.requests.length,1);
 h.push(3);await until(()=>h.requests.length===2);assert.equal(h.requests[1].id,3);
 h.requests[1].release();h.finish();
});

test('Upload failure disposes queued frames and reports one error',async()=>{
 const h=harness();h.push(1);await until(()=>h.requests.length===1);
 const ready=h.push(2);await until(()=>ready.closed===1);const pending=h.push(3);await tick();
 h.requests[0].release(false);await until(()=>h.messages.length===1&&pending.closed===1);
 assert.equal(h.requests.length,1);assert.ok(h.frames.every(f=>f.closed===1));
});
test('Pause during asynchronous pixel copy suppresses the old frame after playback resumes',async()=>{
 const h=harness({holdCopy:true}),frame=h.push(7);await tick();await tick();
 h.state(false);h.state(true);h.releaseCopy();await until(()=>frame.closed===1);
 assert.equal(h.requests.length,0);h.finish();assert.equal(h.messages.length,0);
});
test('Unsupported BGRA copy falls back with correct colors and disposes frames',async()=>{
 const h=harness({fallback:true}),frame=h.push(31);await until(()=>h.requests.length===1);
 assert.equal(h.requests[0].id,31);assert.equal(h.requests[0].red,193);
 h.requests[0].release();h.finish();await until(()=>frame.closed===1);assert.equal(h.messages.length,0);
});
