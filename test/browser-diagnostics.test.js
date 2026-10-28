import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('Local diagnostics separates source/capture/transport rates and tolerates counter resets',()=>{
 let tick,now=1000,result;
 const RealDate=Date;
 class Clock extends RealDate{static now(){return now;}}
 const context={module:{exports:{}},require:()=>({writeFile:(_p,data,done)=>{result=JSON.parse(data.trim().split('\n').at(-1));done();}}),Date:Clock,performance:{now:()=>now},setInterval:f=>{tick=f;return {unref(){}};},clearInterval:()=>{}};
 vm.runInNewContext(readFileSync(new URL('../desktop/browser-diagnostics.cjs',import.meta.url),'utf8'),context);
 const d=context.module.exports.diagnostics('test');
 const state=(frames,at)=>({sourceId:'video-1',sourceFrames:frames,sourceAt:at,playing:true,metrics:{received:frames,prepared:frames/2,sent:frames/2,copyMs:frames*2,sendMs:frames,at,width:1920,height:1080}});
 d.state(state(0,1000));d.ack({sequence:0,uploaded:0,connected:true,targets:1});tick();
 now=3000;d.state(state(120,3000));d.ack({sequence:60,uploaded:58});for(let i=0;i<60;i++)d.frame();tick();
 assert.equal(result.sourceFps,60);assert.equal(result.capturedFps,60);assert.equal(result.sentFps,30);assert.equal(result.receivedFps,30);assert.equal(result.nativeUploadFps,29);assert.equal(result.copyMs,4);assert.equal(result.sendMs,2);
 now=5000;d.state(state(0,5000));tick();assert.equal(result.capturedFps,null);
});

test('Slow diagnostic storage never blocks frame counting or queues concurrent writes',()=>{
 let tick,now=1000,writes=[],done;
 class Clock extends Date{static now(){return now;}}
 const context={module:{exports:{}},require:()=>({writeFile:(_p,data,callback)=>{writes.push(data);done=callback;}}),Date:Clock,performance:{now:()=>now},setInterval:f=>{tick=f;return {unref(){}};},clearInterval:()=>{}};
 vm.runInNewContext(readFileSync(new URL('../desktop/browser-diagnostics.cjs',import.meta.url),'utf8'),context);
 const d=context.module.exports.diagnostics('test');d.state({playing:true,sourceId:'video-1'});tick();
 now=3500;d.frame();d.ack({pipeMs:4});tick();assert.equal(writes.length,1);
 now=6000;d.frame();d.ack({pipeMs:8});tick();assert.equal(writes.length,1);
 done();now=8500;d.frame();d.ack({pipeMs:12});tick();assert.equal(writes.length,2);
 const result=JSON.parse(writes[1].trim().split('\n').at(-1));assert.equal(result.receivedFps,.4);assert.equal(result.pipeP95Ms,12);
});
