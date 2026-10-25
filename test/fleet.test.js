import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {units,value,injectVideo} from '../scripts/dashboard-overlay.js';
const root=new URL('../',import.meta.url);
const inventory=JSON.parse(await readFile(new URL('research/fleet-inventory.json',root),'utf8'));
test('Every installed stock model has a built-in or attachable GPS route',()=>{
 assert.equal(inventory.trucks.length,26);
 for(const truck of inventory.trucks){assert.ok(truck.screens.length||truck.accessoryScreens?.length,truck.id);if(truck.withoutGps.length)assert.ok(truck.accessoryScreens?.length,truck.id+' screenless cabins');}
 assert.equal(inventory.screens.length,18);
 assert.equal(inventory.conflicts.filter(c=>c.path.startsWith('/ui/')).length,0);
});
test('All GPS pages preserve original content and restore it through transparent video',async()=>{
 for(const screen of inventory.screens){
  const original=await readFile(new URL(screen.source,root),'utf8');
  const output=await readFile(new URL('build/navigation-mod'+screen.path,root),'utf8');
  const before=units(original),after=units(output),window=before.find(n=>n.type==='window');
  const additions=after.filter(n=>n.name.includes('fh6_video'));
  assert.ok(additions.length,screen.path);
  for(const node of before){
   const changed=after.find(n=>n.name===node.name);assert.ok(changed,screen.path+' '+node.name);
   const child=additions.find(n=>value(n,'my_parent')===node.name);
   let restored=changed.text;
   if(child){restored=restored.replace(/my_children:\s*\d+/,`my_children: ${value(node,'my_children')}`).replace(/\n my_children\[\d+\]: _nameless\._\.fh6_video[^\s]*/,'');}
   assert.equal(restored,node.text,screen.path+' changes original '+node.name);
  }
  for(const node of additions){
   assert.equal(node.type,'text');assert.equal(value(node,'id'),'0');
   for(const side of ['l','r','t','b'])assert.equal(value(node,'coords_'+side),value(window,'coords_'+side));
   const siblings=after.filter(n=>value(n,'my_parent')===value(node,'my_parent')&&n!==node);
   assert.ok(siblings.every(n=>Number(value(n,'layer')||0)<Number(value(node,'layer'))));
  }
  assert.throws(()=>injectVideo(output),/already patched/);
 }
 const dds=await readFile(new URL('build/navigation-mod/material/ui/fh6_carplay/screen.dds',root));assert.ok(dds.subarray(192).every(n=>n===0));
});
test('Mixed truck/service/accessory reloads never introduce global nodes or broken references',async()=>{
 const globals=new Set();
 for(let repeat=0;repeat<3;++repeat)for(const screen of inventory.screens){
  const nodes=units(await readFile(new URL('build/navigation-mod'+screen.path,root),'utf8'));
  const map=new Map(nodes.map(n=>[n.name,n]));assert.equal(map.size,nodes.length,screen.path);
  for(const node of nodes){
   assert.ok(node.name.replace(/^\./,'').split('.').every(part=>/^[a-z0-9_]{1,12}$/.test(part)),screen.path+' invalid SCS unit token: '+node.name);
   if(!node.name.startsWith('.')&&!node.name.startsWith('_nameless.')){assert.ok(!globals.has(node.name),'Global collision '+node.name);globals.add(node.name);}
   const children=[...node.text.matchAll(/my_children\[(\d+)\]:\s*(\S+)/g)];
   if(value(node,'my_children')!==undefined){assert.equal(children.length,Number(value(node,'my_children')));assert.deepEqual(children.map(c=>Number(c[1])),Array.from({length:children.length},(_,i)=>i),screen.path+' '+node.name+' children must appear in load order');}
   for(const [,index,ref] of children){assert.ok(map.has(ref),ref);assert.equal(value(map.get(ref),'my_parent'),node.name,'Parent mismatch '+index);}
   const parent=value(node,'my_parent');if(parent&&parent!=='null')assert.ok(map.has(parent));
  }
 }
});
