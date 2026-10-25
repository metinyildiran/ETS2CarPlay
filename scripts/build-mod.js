import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../build/mod/', import.meta.url);
const write = async (path, data) => {
  const target = new URL(path, root);
  await mkdir(new URL('.', target), { recursive: true });
  await writeFile(target, data);
};
const width = 1024, height = 512;
const dds = Buffer.alloc(128 + width * height * 4);
dds.write('DDS ');
for (const [offset, value] of [[4,124],[8,0x100f],[12,height],[16,width],[20,width*4],[28,1],[76,32],[80,0x41],[88,32],[92,0xff0000],[96,0xff00],[100,0xff],[104,0xff000000],[108,0x1000]]) dds.writeUInt32LE(value, offset);
for (let i=128; i<dds.length; i+=4) { dds[i]=dds[i+1]=dds[i+2]=12; dds[i+3]=255; }
const marker = [17,83,29,211,61,137,43,193,101,7,157,71,229,113,47,181];
marker.forEach((n,i) => { dds[128+i*4]=dds[129+i*4]=dds[130+i*4]=n; });
await write('material/ui/fh6_carplay/screen.dds', dds);
const path = Buffer.from('/material/ui/fh6_carplay/screen.dds');
const tobj = Buffer.alloc(48 + path.length);
Buffer.from('010ab170000000000000000000000000000000000100000002000101020002020000000000010000', 'hex').copy(tobj);
tobj.writeUInt32LE(path.length, 40); path.copy(tobj,48);
await write('material/ui/fh6_carplay/screen.tobj', tobj);
await write('material/ui/fh6_carplay/screen.mat', 'material : "ui"\n{\n texture : "screen.tobj"\n texture_name : "texture"\n}\n');
const ui = `SiiNunit
{
ui::window : fh6.carplay.window {
 window_handler: null
 clip_children: false
 keep_aspect: none
 user_string_data: ""
 first_direction_focus_id: 0
 fitting: false
 my_children: 1
 my_children[0]: fh6.carplay.shared
 coords_l: 0
 coords_r: 1280
 coords_t: 720
 coords_b: 0
 area_l: 0
 area_r: 1280
 area_t: 720
 area_b: 0
 id: 0
 layer: 0
 tab: -1
 pointer: -1
 my_parent: null
}
ui::group : fh6.carplay.shared {
 fitting: false
 my_children: 1
 my_children[0]: fh6.carplay.image
 coords_l: 0
 coords_r: 1280
 coords_t: 720
 coords_b: 0
 area_l: 0
 area_r: 1280
 area_t: 720
 area_b: 0
 id: 950
 layer: 3
 tab: -1
 pointer: -1
 my_parent: fh6.carplay.window
}
ui::text : fh6.carplay.image {
 text: "<img src=/material/ui/fh6_carplay/screen.mat xscale=stretch yscale=stretch>"
 coords_l: 0
 coords_r: 1280
 coords_t: 720
 coords_b: 0
 area_l: 1
 area_r: 0
 area_t: 0
 area_b: 1
 id: 0
 layer: 1
 tab: -1
 pointer: -1
 my_parent: fh6.carplay.shared
}
}
`;
await write('ui/dashboard/volvo_fh_2024_gps.sii', ui);
await write('ui/dashboard/volvo_fh_2024_mph_gps.sii', ui);
await write('manifest.sii', `SiiNunit
{
mod_package : .package {
 package_version: "0.2.0-experimental"
 display_name: "FH6 YouTube - Experimental"
 author: "ETS2CarPlay"
 category[]: "interior"
 description_file: "description.txt"
 compatible_versions[]: "1.61.*"
}
}
`);
await write('description.txt', 'Experimental Volvo FH6 YouTube screen. Requires FH6CarPlay.addon64, ReShade with full add-on support and the local video bridge. Replaces the FH6 GPS display. Disable this mod to restore navigation. In-game verification pending.');
console.log(fileURLToPath(root));
