import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVideo } from '../ui/youtube.js';
import { createServer } from '../src/server.js';

test('YouTube bağlantı biçimlerini aynı video kimliğine dönüştürür', () => {
  const id = 'M7lc1UVf-VE';
  for (const value of [id, `https://youtu.be/${id}?si=abc`, `https://www.youtube.com/watch?v=${id}&t=5`, `https://music.youtube.com/watch?v=${id}`, `https://youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`]) assert.equal(parseVideo(value), id);
});
test('YouTube dışındaki adresleri ve hatalı video kimliklerini reddeder', () => {
  for (const value of ['https://youtube.com.evil.org/watch?v=M7lc1UVf-VE', 'javascript:alert(1)', 'https://example.com/M7lc1UVf-VE', 'https://youtube.com/watch?v=123', 'https://youtube.com/playlist?list=test', '']) assert.throws(() => parseVideo(value));
});
test('Sunucu yalnızca oynatıcı dosyalarını sunar', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const home = await fetch(base);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /FH6/);
    assert.equal(home.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal((await fetch(`${base}/package.json`)).status, 404);
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${base}/player.js`)).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
