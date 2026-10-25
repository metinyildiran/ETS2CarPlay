const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'research/fleet');
const archives=['def','base_vehicle',...fs.readdirSync(base).filter(n=>n.startsWith('dlc_')).sort()];
const files=new Map(),conflicts=[];
function walk(folder,relative,archive){if(!fs.existsSync(folder))return;for(const item of fs.readdirSync(folder,{withFileTypes:true})){const key=relative+'/'+item.name,full=path.join(folder,item.name);if(item.isDirectory())walk(full,key,archive);else if(/\.(sii|sui)$/.test(item.name)){const old=files.get(key);if(old&&fs.readFileSync(old.full,'utf8')!==fs.readFileSync(full,'utf8'))conflicts.push({path:key,old:old.archive,new:archive});files.set(key,{full,archive});}}}
for(const archive of archives)for(const relative of ['/ui','/def/vehicle/truck'])walk(path.join(base,archive,relative),relative,archive);
const cache=new Map();
function expanded(key,stack=[]){if(stack.includes(key))throw Error('Include cycle '+key);if(cache.has(key))return cache.get(key);const item=files.get(key);if(!item)return '';let text=fs.readFileSync(item.full,'utf8').replace(/^\s*#.*$/gm,'');text=text.replace(/@include\s+"([^"]+)"/g,(_match,name)=>expanded(name.startsWith('/')?name:path.posix.normalize(path.posix.dirname(key)+'/'+name),[...stack,key]));cache.set(key,text);return text;}
const trucks=new Map(),screens=new Map();
for(const [key,item] of files){const match=key.match(/^\/def\/vehicle\/truck\/([^/]+)\/interior\/[^/]+\.sii$/);if(!match)continue;const text=expanded(key);if(!/accessory_interior_data\s*:/.test(text))continue;const truck=trucks.get(match[1])||{id:match[1],interiors:0,withGps:0,withoutGps:[],screens:[]};truck.interiors++;
 const gps=[...text.matchAll(/\bgps_path\s*:\s*"([^"]+)"/g)].at(-1),size=[...text.matchAll(/\bgps_drawable_size\s*:\s*\(([^)]+)\)/g)].at(-1);
 if(gps&&!gps[1].endsWith('.sii'))gps[1]+='.sii';
 if(gps){truck.withGps++;if(!truck.screens.includes(gps[1]))truck.screens.push(gps[1]);const source=files.get(gps[1]);if(!source)throw Error('Missing GPS source '+gps[1]);const entry=screens.get(gps[1])||{path:gps[1],source:path.relative(root,source.full).replaceAll('\\','/'),trucks:[],sizes:[]};if(!entry.trucks.includes(truck.id))entry.trucks.push(truck.id);const drawable=size?size[1].replace(/\s/g,''):'default';if(!entry.sizes.includes(drawable))entry.sizes.push(drawable);screens.set(gps[1],entry);}else truck.withoutGps.push(key);
 trucks.set(truck.id,truck);
}
for(const [key] of files){const match=key.match(/^\/def\/vehicle\/truck\/([^/]+)\/accessory\//);if(!match)continue;const text=expanded(key);if(!/accessory_addon_int_ui_data\s*:/.test(text))continue;const ui=text.match(/\bui_path\s*:\s*"([^"]*gps[^\"]+\.sii)"/);if(!ui)continue;const source=files.get(ui[1]);if(!source)throw Error('Missing accessory GPS '+ui[1]);const entry=screens.get(ui[1])||{path:ui[1],source:path.relative(root,source.full).replaceAll('\\','/'),trucks:[],sizes:[],accessory:true};if(!entry.trucks.includes(match[1]))entry.trucks.push(match[1]);screens.set(ui[1],entry);const truck=trucks.get(match[1]);if(truck){truck.accessoryScreens??=[];if(!truck.accessoryScreens.includes(ui[1]))truck.accessoryScreens.push(ui[1]);}}
const inventory={archives,conflicts,trucks:[...trucks.values()].sort((a,b)=>a.id.localeCompare(b.id)),screens:[...screens.values()].sort((a,b)=>a.path.localeCompare(b.path))};
fs.writeFileSync(path.join(root,'research/fleet-inventory.json'),JSON.stringify(inventory,null,2));
console.log(JSON.stringify({trucks:inventory.trucks.map(t=>({id:t.id,interiors:t.interiors,withGps:t.withGps,screens:t.screens})),screens:inventory.screens,conflicts:conflicts.filter(c=>c.path.startsWith('/ui/'))},null,2));
