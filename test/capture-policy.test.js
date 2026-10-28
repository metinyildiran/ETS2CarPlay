import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../browser-extension/capture-policy.js',import.meta.url),'utf8');
test('Initial source envelope is reduced before capture, and unsupported initialization stays usable',async()=>{
  const context=vm.createContext({});vm.runInContext(source,context);let constraints;
  const p=context.createCapturePolicy({applyConstraints:async c=>{constraints=c;}},{now:()=>0,initialLevel:2});
  await p.initialize();assert.equal(p.snapshot().captureLevel,1);assert.equal(constraints.width.max,1280);
  const failed=context.createCapturePolicy({applyConstraints:async()=>{throw Error('unsupported');}},{now:()=>0,initialLevel:2});
  await failed.initialize();assert.equal(failed.snapshot().captureLevel,2);assert.equal(failed.snapshot().captureFailures,1);
});
function harness(apply=async()=>{}){
  let time=0,frames=0,copyMs=0,sendMs=0;const calls=[];
  const context=vm.createContext({});vm.runInContext(source,context);
  const policy=context.createCapturePolicy({applyConstraints:async c=>{calls.push(c);await apply(c);}},{now:()=>time});
  const crop={w:1,h:1,viewportWidth:1920,viewportHeight:1080};
  return {policy,calls,crop,async step(cost=5,state={playing:true,crop},n=120){
    time+=2000;frames+=n;copyMs+=n*cost;sendMs+=n*cost;
    policy.observe({at:time,prepared:frames,sent:frames,copyMs,sendMs},state);await new Promise(r=>setImmediate(r));
  }};
}
test('Overload lowers resolution without lowering the 60 FPS request; recovery has hysteresis',async()=>{
  const h=harness();await h.step();await h.step(100);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].width.max,960);assert.equal(h.calls[0].frameRate.min,60);
  for(let i=0;i<8;i++)await h.step();assert.equal(h.calls.length,1,'must not oscillate after a few healthy frames');
  for(let i=0;i<5;i++)await h.step();assert.equal(h.calls.length,2);assert.equal(h.calls[1].width.max,1280);
  for(let i=0;i<20;i++)await h.step();assert.equal(h.calls.length,2,'full tab does not need 1080p');
});
test('Small video region can recover detail; 24 FPS alone is never treated as overload',async()=>{
  const h=harness();const state={playing:true,crop:{...h.crop,w:.4,h:.4}};
  for(let i=0;i<13;i++)await h.step(5,state,48);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].width.max,1920);assert.equal(h.calls[0].frameRate.max,60);
});
test('Rejected constraints keep capture running and disable repeated attempts',async()=>{
  const h=harness(async()=>{throw Error('unsupported');});
  for(let i=0;i<15;i++)await h.step(100);
  assert.equal(h.calls.length,1);assert.equal(h.policy.snapshot().captureLevel,1);assert.equal(h.policy.snapshot().captureFailures,1);
});
test('Pause resets overload samples and closing prevents further changes',async()=>{
  const h=harness();await h.step(100);await h.step(100,{playing:false});await h.step(100);
  assert.equal(h.calls.length,0);h.policy.close();await h.step(100);assert.equal(h.calls.length,0);
});
test('Pending constraints never overlap, and completion after close is ignored',async()=>{
  let release;const h=harness(()=>new Promise(r=>{release=r;}));await h.step(100);await h.step(100);
  for(let i=0;i<5;i++)await h.step(100);assert.equal(h.calls.length,1);
  h.policy.close();release();await new Promise(r=>setImmediate(r));assert.equal(h.policy.snapshot().captureChanges,0);
});
