// SCS UI declarations form a flat list; references express their hierarchy.
export function units(source){return [...source.matchAll(/ui::(\w+)\s*:\s*(\S+)\s*\{[^{}]*\}/g)].map(m=>({type:m[1],name:m[2],text:m[0]}));}
export function value(unit,key){return unit.text.match(new RegExp(`^\\s*${key}:\\s*(\\S+)`,'m'))?.[1];}
export function injectVideo(source){
 const nodes=units(source),root=nodes.find(n=>n.type==='window');
 if(!root||nodes.some(n=>n.name.includes('fh6_video')))throw Error('Missing root or already patched GPS');
 const coords=['l','r','t','b'].map(side=>` coords_${side}: ${value(root,'coords_'+side)}`).join('\n');
 if(coords.includes('undefined'))throw Error('Missing GPS bounds');
 // Shared backgrounds may sit below (Scania) or above (Volvo) normal pages.
 // Preserve original ordering and visibility; add a local overlay per page.
 let parents=nodes.filter(n=>n.type==='group'&&value(n,'my_parent')===root.name&&(/^[1-8]00$/.test(value(n,'id'))||value(n,'id')==='950'));
 if(!parents.length){if(nodes.some(n=>n.type==='group'))throw Error('Unrecognized GPS page hierarchy');parents=[root];}
 const added=[];
 for(const parent of parents){
  const name=value(parent,'id')==='950'||parent===root?'_nameless._.fh6_video':`_nameless._.fh6_video.${value(parent,'id')}`;
  // Every dot-separated component is an SCS token, limited to 12 characters.
  if(!name.split('.').every(part=>/^[a-z0-9_]{1,12}$/.test(part)))throw Error('Invalid video unit name');
  const count=Number(value(parent,'my_children'));
  if(!Number.isInteger(count)||count<0)throw Error('Invalid GPS child count');
  const children=[...parent.text.matchAll(/my_children\[(\d+)\]:/g)];
  if(children.length!==count||children.some((child,index)=>Number(child[1])!==index))throw Error('GPS child count/order mismatch');
  // SCS reads indexed arrays sequentially: [count] must follow [count - 1],
  // never the count declaration ahead of [0]. A set of indices is insufficient.
  let updated=parent.text.replace(/my_children:\s*\d+/,`my_children: ${count+1}`);
  const anchor=count?new RegExp(`my_children\\[${count-1}\\]:[^\\r\\n]*`):/my_children:\s*\d+/;
  updated=updated.replace(anchor,line=>`${line}\n my_children[${count}]: ${name}`);
  source=source.replace(parent.text,updated);
  const layer=Math.max(99,...nodes.filter(n=>value(n,'my_parent')===parent.name).map(n=>Number(value(n,'layer')||0)))+1;
  added.push(`\nui::text : ${name} {
 text: "<img src=/material/ui/fh6_carplay/screen.mat xscale=stretch yscale=stretch>"
${coords}
 area_l: 1
 area_r: 0
 area_t: 0
 area_b: 1
 id: 0
 layer: ${layer}
 tab: -1
 pointer: -1
 my_parent: ${parent.name}
}\n`);
 }
 const close=source.lastIndexOf('}');if(close<0)throw Error('Invalid SiiNunit');
 return source.slice(0,close)+added.join('')+source.slice(close);
}
