import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const {parseYouTube}=require('../desktop/youtube-url.cjs');
test('YouTube links preserve seconds, h/m/s, start and fragment timestamps',()=>{
  for(const [url,seconds] of [
    ['https://youtu.be/M7lc1UVf-VE?t=90',90],
    ['https://www.youtube.com/watch?v=M7lc1UVf-VE&t=1h2m3s',3723],
    ['https://www.youtube.com/embed/M7lc1UVf-VE?start=125',125],
    ['https://www.youtube.com/watch?v=M7lc1UVf-VE#t=2m30s',150],
    ['https://www.youtube.com/shorts/M7lc1UVf-VE?si=abc&t=12.5',12.5],
    ['M7lc1UVf-VE',0]])assert.deepEqual(parseYouTube(url),{id:'M7lc1UVf-VE',startSeconds:seconds});
  for(const url of ['https://evil.test/watch?v=M7lc1UVf-VE','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://youtu.be/M7lc1UVf-VE?t=bad'])assert.throws(()=>parseYouTube(url));
});
test('Renderer passes the requested time into the actual YouTube load API',()=>{
  let command,call;
  const context={window:{fh6:{state:()=>{},onCommand:cb=>command=cb}},YT:{Player:class{loadVideoById(arg){call=arg;}}},location:{origin:'http://127.0.0.1'},document:{createElement:()=>({}),head:{append:()=>{}}}};
  vm.runInNewContext(readFileSync(new URL('../desktop/screen.js',import.meta.url),'utf8'),context);
  context.window.onYouTubeIframeAPIReady();command({type:'load',...parseYouTube('https://youtu.be/M7lc1UVf-VE?t=2m3s')});
  assert.equal(call.videoId,'M7lc1UVf-VE');assert.equal(call.startSeconds,123);
});
