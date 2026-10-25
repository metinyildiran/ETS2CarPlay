import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {inspectCaptions,setCaptions}=require('../desktop/captions.cjs');
const {decodeCommand,ControlClient}=require('../desktop/control.cjs');
const id='M7lc1UVf-VE';
function fixture(){
 let enabled=false,clicks=0;
 const button={disabled:false,getAttribute:key=>key==='aria-pressed'?String(enabled):null,click:()=>{enabled=!enabled;clicks++;}};
 const style={display:'block',visibility:'visible'};
 const context={document:{getElementById:()=>({getVideoData:()=>({video_id:id})}),querySelector:()=>button},getComputedStyle:()=>style};
 return {button,style,context,clicks:()=>clicks};
}
test('Captions toggle actual player control, stay idempotent and reject stale video IDs',()=>{
 const f=fixture(),run=code=>vm.runInNewContext(code,f.context);
 assert.equal(run(inspectCaptions(id)).enabled,false);
 assert.equal(run(setCaptions(id,true)).enabled,true);
 assert.equal(run(setCaptions(id,true)).enabled,true);assert.equal(f.clicks(),1);
 assert.equal(run(setCaptions('iogcY_4xGjo',false)).available,false);assert.equal(f.clicks(),1);
 assert.equal(run(setCaptions(id,false)).enabled,false);assert.equal(f.clicks(),2);
});
test('Missing or disabled captions never produce a fake enabled state',()=>{
 const f=fixture();f.style.display='none';
 assert.equal(vm.runInNewContext(setCaptions(id,true),f.context).available,false);assert.equal(f.clicks(),0);
 f.style.display='block';f.button.disabled=true;
 assert.equal(vm.runInNewContext(setCaptions(id,true),f.context).available,false);
 f.button.disabled=false;f.button.click=()=>{};
 assert.equal(vm.runInNewContext(setCaptions(id,true),f.context).enabled,false);
});
test('Caption protocol transports explicit state and rejects malformed requests',()=>{
 assert.deepEqual(decodeCommand('captions\t'+id+'\t1'),{type:'captions',videoId:id,enabled:true});
 assert.deepEqual(decodeCommand('captions\t'+id+'\t0'),{type:'captions',videoId:id,enabled:false});
 for(const line of ['captions\tbad\t1','captions\t'+id+'\ttrue','captions\t'+id+'\t2'])assert.equal(decodeCommand(line),null);
 let line;ControlClient.prototype.captions.call({report:value=>line=value},{videoId:id,available:true,enabled:false});
 assert.equal(line,'@captions\t'+id+'\t1\t0');
});
