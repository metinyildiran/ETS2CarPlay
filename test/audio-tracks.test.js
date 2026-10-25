import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {inspectScript,selectScript}=require('../desktop/audio-tracks.cjs');
const {decodeCommand}=require('../desktop/control.cjs');
test('Audio tracks use language names and preserve original track objects for selection',()=>{
 const tracks=[{id:'english',getLanguageInfo:()=>({id:'en.4',name:'English (original)'})},{id:'turkish',getLanguageInfo:()=>({id:'tr.3',name:'Turkish'})}];
 let selected=tracks[0];const p={getAvailableAudioTracks:()=>tracks,getAudioTrack:()=>selected,getVideoData:()=>({video_id:'iogcY_4xGjo'}),setAudioTrack:track=>{assert.equal(track,tracks[1]);selected=track;}};
 const context={document:{getElementById:()=>p},Intl};
 const list=vm.runInNewContext(inspectScript,context);assert.equal(list.tracks[1].label,'Türkçe');assert.match(list.tracks[0].label,/orijinal/);
 assert.equal(vm.runInNewContext(selectScript('iogcY_4xGjo','turkish'),context),true);
 assert.equal(vm.runInNewContext(inspectScript,context).selected,'turkish');
 assert.equal(vm.runInNewContext(selectScript('M7lc1UVf-VE','turkish'),context),false);
 assert.equal(vm.runInNewContext(selectScript('iogcY_4xGjo','nonexistent'),context),false);
});
test('Unsupported players expose no invented audio options; commands reject invalid indices',()=>{
 const list=vm.runInNewContext(inspectScript,{document:{getElementById:()=>({})}});assert.equal(list.supported,false);assert.equal(list.tracks.length,0);
 assert.deepEqual(decodeCommand('audio\tiogcY_4xGjo\t2'),{type:'audio',videoId:'iogcY_4xGjo',index:2});
 for(const cmd of ['audio\tiogcY_4xGjo\t-1','audio\tiogcY_4xGjo\t64','audio\tbad\t1'])assert.equal(decodeCommand(cmd),null);
});
