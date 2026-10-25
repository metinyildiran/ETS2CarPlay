import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { access, readFile } from 'node:fs/promises';
import { createServer } from '../src/server.js';
import { packFrame, WIDTH, HEIGHT, PIXEL_BYTES } from '../src/frames.js';
const headers = { 'X-FH6-Bridge': '1' };
async function withServer(fn) {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try { await fn(`http://127.0.0.1:${port}`, port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('Frame protocol validates size and stores RGBA pixels unchanged', () => {
  assert.throws(() => packFrame(Buffer.alloc(5), 1));
  const packet = packFrame(Buffer.alloc(PIXEL_BYTES, 37), 8);
  assert.equal(packet.toString('ascii',0,4), 'FH6F');
  assert.equal(packet.readUInt32LE(8), WIDTH);
  assert.equal(packet.readUInt32LE(12), HEIGHT);
  assert.equal(packet.readUInt32LE(20), 8);
  assert.equal(packet[24], 37);
});
test('Bridge rejects cross-origin/oversized uploads and clears stopped frames', async () => withServer(async base => {
  assert.equal((await fetch(`${base}/frame`)).status, 403);
  assert.equal((await fetch(`${base}/frame`, { headers: { ...headers, Origin: 'https://example.com' } })).status, 403);
  assert.equal((await fetch(`${base}/frame`, { headers })).status, 204);
  for (const size of [4, PIXEL_BYTES+1]) {
    assert.equal((await fetch(`${base}/frame`, { method:'POST', headers:{...headers,'Content-Type':'application/octet-stream'}, body:Buffer.alloc(size) })).status,400);
  }
  const pixels = Buffer.alloc(PIXEL_BYTES, 70);
  assert.equal((await fetch(`${base}/frame`, {method:'POST', headers:{...headers,'Content-Type':'application/octet-stream'},body:pixels})).status,204);
  const frame = Buffer.from(await (await fetch(`${base}/frame`, {headers})).arrayBuffer());
  assert.deepEqual(frame.subarray(24),pixels);
  await fetch(`${base}/frame`, {method:'DELETE',headers});
  assert.equal((await fetch(`${base}/frame`, {headers})).status,204);
}));
test('Stale frames expire after the producer disappears', async () => withServer(async base => {
  await fetch(`${base}/frame`, { method:'POST',headers:{...headers,'Content-Type':'application/octet-stream'},body:Buffer.alloc(PIXEL_BYTES) });
  await new Promise(resolve=>setTimeout(resolve,2100));
  assert.equal((await fetch(`${base}/frame`,{headers})).status,204);
}));
test('Native add-on receiver reads real local HTTP frames', async t => {
  const exe = new URL('../build/bridge_probe.exe',import.meta.url);
  try { await access(exe); } catch { t.skip('Build native tests first'); return; }
  await withServer(async (base, port) => {
    const pixels = Buffer.alloc(PIXEL_BYTES);
    pixels.set([23,67,149,255]);
    await fetch(`${base}/frame`, {method:'POST',headers:{...headers,'Content-Type':'application/octet-stream'},body:pixels});
    const result = await new Promise((resolve,reject) => {
      const child = spawn(fileURLToPath(exe),[String(port)],{ windowsHide:true, timeout:8000, stdio:'pipe', shell:false });
      child.on('error',reject); child.on('exit',resolve);
    });
    assert.equal(result,0);
  });
});
test('Generated texture has an exact native marker and DDS/TObj dimensions', async () => {
  const dds = await readFile(new URL('../build/mod/material/ui/fh6_carplay/screen.dds',import.meta.url));
  assert.equal(dds.toString('ascii',0,4),'DDS ');
  assert.equal(dds.readUInt32LE(12),HEIGHT); assert.equal(dds.readUInt32LE(16),WIDTH);
  assert.equal(dds.length,128+PIXEL_BYTES);
  const marker=[17,83,29,211,61,137,43,193,101,7,157,71,229,113,47,181];
  marker.forEach((v,i)=>assert.deepEqual([...dds.subarray(128+i*4,132+i*4)],[v,v,v,255]));
  const tobj=await readFile(new URL('../build/mod/material/ui/fh6_carplay/screen.tobj',import.meta.url));
  assert.equal(tobj.readUInt32LE(40),tobj.length-48);
  assert.equal(tobj.subarray(48).toString(),'/material/ui/fh6_carplay/screen.dds');
});
