import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PIXEL_BYTES, packFrame } from './frames.js';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/player.js', ['player.js', 'text/javascript; charset=utf-8']],
  ['/youtube.js', ['youtube.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']]
  ,['/capture.js', ['capture.js', 'text/javascript; charset=utf-8']]
]);

export function createServer() {
  let frame = null, frameTime = 0, sequence = 0, addonTime = 0, targets = 0, epoch = 0;
  return http.createServer(async (req, res) => {
    const host = `127.0.0.1:${req.socket.localPort}`;
    if (req.headers.host !== host) { res.writeHead(403).end(); return; }
    if (req.url === '/frame' || req.url === '/bridge-status') {
      res.setHeader('Cache-Control', 'no-store');
      if (req.headers['x-fh6-bridge'] !== '1' || (req.headers.origin && req.headers.origin !== `http://${host}`)) {
        res.writeHead(403).end(); return;
      }
      if (req.url === '/bridge-status' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ addon: Date.now() - addonTime < 3000, targets, streaming: Date.now() - frameTime < 2000 }));
        return;
      }
      if (req.url === '/frame' && req.method === 'GET') {
        if (req.headers['x-fh6-targets'] !== undefined) {
          addonTime = Date.now();
          targets = Math.min(100, Math.max(0, Number(req.headers['x-fh6-targets']) || 0));
        }
        if (!frame || Date.now() - frameTime > 2000) { res.writeHead(204).end(); return; }
        res.setHeader('Content-Type', 'application/octet-stream');
        res.end(frame); return;
      }
      if (req.url === '/frame' && req.method === 'DELETE') {
        epoch++; frame = null; frameTime = 0; res.writeHead(204).end(); return;
      }
      if (req.url === '/frame' && req.method === 'POST') {
        if (req.headers['content-type'] !== 'application/octet-stream' || Number(req.headers['content-length']) !== PIXEL_BYTES) {
          res.writeHead(400).end(); return;
        }
        const uploadEpoch = epoch;
        const chunks = []; let size = 0;
        try {
          for await (const chunk of req) {
            size += chunk.length;
            if (size > PIXEL_BYTES) { res.writeHead(413).end(); return; }
            chunks.push(chunk);
          }
          if (size !== PIXEL_BYTES) { res.writeHead(400).end(); return; }
          if (uploadEpoch !== epoch) { res.writeHead(204).end(); return; }
          frame = packFrame(Buffer.concat(chunks), ++sequence);
          frameTime = Date.now(); res.writeHead(204).end();
        } catch { if (!res.headersSent) res.writeHead(400).end(); }
        return;
      }
      res.writeHead(405).end(); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const asset = assets.get(req.url);
    if (!asset) { res.writeHead(404).end(); return; }
    try {
      const data = await readFile(new URL(`../ui/${asset[0]}`, import.meta.url));
      res.writeHead(200, {
        'Content-Type': asset[1],
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; frame-src https://www.youtube.com; style-src 'self'; connect-src 'self' https://www.youtube.com; img-src 'self' https://i.ytimg.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(500).end('Oynatıcı dosyası okunamadı.');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? 'Port 32126 kullanımda. Önce diğer oynatıcıyı kapat.' : error.message);
    process.exitCode = 1;
  });
  server.listen(32126, '127.0.0.1', () => {
    console.log('YouTube önizleme: http://127.0.0.1:32126');
    console.log('Eski HTTP test oynatıcısı. Güncel kurulum ve kullanım için README.md dosyasına bakın. Kapatmak için Ctrl+C.');
  });
}
