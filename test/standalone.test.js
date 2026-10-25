import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {sampleVideoRate}=require('../desktop/video-rate.cjs');
test('Video timing follows 24, 25, 29.97, 50 and 60 fps sources',async()=>{
  for(const fps of [24,25,29.97,50,60]){
    let count=0;
    const video={paused:false,requestVideoFrameCallback:callback=>setImmediate(()=>{count++;callback(0,{presentedFrames:count,mediaTime:count/fps});}),cancelVideoFrameCallback:clearImmediate};
    const result=await vm.runInNewContext(sampleVideoRate,{document:{querySelector:()=>video},setTimeout,clearTimeout});
    assert.ok(Math.abs(result-fps)<0.001);
  }
});
test('Navigation mod preserves original GPS controls below the video layer',async()=>{
  for(const suffix of ['gps','mph_gps']){
    const name=`volvo_fh_2024_${suffix}.sii`;
    const original=await readFile(new URL('../research/fh6/ui/dashboard/'+name,import.meta.url),'utf8');
    const modified=await readFile(new URL('../build/navigation-mod/ui/dashboard/'+name,import.meta.url),'utf8');
    const units=[...original.matchAll(/(?:ui::\w+) : ([^\s]+) \{/g)].map(m=>m[1]);
    for(const unit of units)assert.ok(modified.includes(`: ${unit} {`));
    assert.ok(modified.includes('my_children[2]: _nameless._.fh6_video'));
    assert.ok(modified.includes('layer: 100'));
  }
  const dds=await readFile(new URL('../build/navigation-mod/material/ui/fh6_carplay/screen.dds',import.meta.url));
  assert.ok(dds.subarray(128+64).every(byte=>byte===0));
});

test('Dashboard video nodes are instance-local when driving and service previews coexist',async()=>{
  const globals=new Set();
  for(const suffix of ['gps','mph_gps','gps','mph_gps']){
    const text=await readFile(new URL(`../build/navigation-mod/ui/dashboard/volvo_fh_2024_${suffix}.sii`,import.meta.url),'utf8');
    const definitions=[...text.matchAll(/ui::\w+\s*:\s*([^\s]+)\s*\{/g)].map(m=>m[1]);
    const local=new Set(definitions);assert.equal(local.size,definitions.length,'Duplicate node within one dashboard');
    for(const name of definitions){
      // SCS resolves nameless references per SiiNunit load, whereas named
      // definitions remain global and collide with subsequent cab instances.
      if(name.startsWith('.')||name.startsWith('_nameless.'))continue;
      assert.ok(!globals.has(name),`Dashboard reload redefines global unit ${name}`);globals.add(name);
    }
    for(const ref of text.matchAll(/my_children\[\d+\]:\s*(\S+)|my_parent:\s*(\S+)/g)){
      const name=ref[1]||ref[2];if(name!=='null')assert.ok(local.has(name),`Unresolved dashboard node ${name}`);
    }
  }
});
