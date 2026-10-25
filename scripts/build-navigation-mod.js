import {readFile,writeFile,mkdir,copyFile,readdir,unlink} from 'node:fs/promises';
import {injectVideo} from './dashboard-overlay.js';
const base=new URL('../build/navigation-mod/',import.meta.url);
const inventory=JSON.parse(await readFile(new URL('../research/fleet-inventory.json',import.meta.url),'utf8'));
// Validate every source before writing generated output.
const screens=await Promise.all(inventory.screens.map(async screen=>({path:screen.path,text:injectVideo(await readFile(new URL('../'+screen.source,import.meta.url),'utf8'))})));
// Remove only obsolete generated GPS files, never arbitrary paths.
const expected=new Set(screens.map(s=>s.path));
for(const item of await readdir(new URL('ui/dashboard/',base)).catch(()=>[]))if(item.endsWith('.sii')&&!expected.has('/ui/dashboard/'+item))await unlink(new URL('ui/dashboard/'+item,base));
for(const screen of screens){const destination=new URL(screen.path.slice(1),base);await mkdir(new URL('.',destination),{recursive:true});await writeFile(destination,screen.text);}
await mkdir(new URL('material/ui/fh6_carplay/',base),{recursive:true});
for(const file of ['screen.dds','screen.tobj','screen.mat'])await copyFile(new URL('../build/mod/material/ui/fh6_carplay/'+file,import.meta.url),new URL('material/ui/fh6_carplay/'+file,base));
const ddsPath=new URL('material/ui/fh6_carplay/screen.dds',base),dds=await readFile(ddsPath);
dds.fill(0,128+64);await writeFile(ddsPath,dds);
await writeFile(new URL('manifest.sii',base),`SiiNunit
{
mod_package : .package {
 package_version: "0.6.3-experimental"
 display_name: "ETS2 YouTube + Navigation - All Trucks"
 author: "ETS2CarPlay"
 category[]: "interior"
 description_file: "description.txt"
 compatible_versions[]: "1.61.*"
}
}
`);
await writeFile(new URL('description.txt',base),'Browser video on stock truck GPS screens and Cabin Accessories GPS devices. Requires FH6Standalone.dll. Pause or stop playback to restore navigation. Trucks/cabins without a built-in GPS require an installed GPS accessory. Install in place of FH6YouTube.scs; do not enable a second copy.');
console.log(`Built ${screens.length} GPS layouts for ${inventory.trucks.length} stock truck models.`);
