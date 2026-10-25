const start = document.getElementById('capture');
const stop = document.getElementById('stop-capture');
const status = document.getElementById('bridge-status');
const options = { headers: { 'X-FH6-Bridge': '1' } };
let stream, timer, sending = false, generation = 0, upload;
const video = document.createElement('video');
video.muted = true;
const canvas = document.createElement('canvas');
canvas.width = 1024; canvas.height = 512;
const context = canvas.getContext('2d', { willReadFrequently: true });

async function finish(message = 'Kabin aktarımı durdu.') {
  generation++;
  upload?.abort();
  clearTimeout(timer);
  stream?.getTracks().forEach(track => track.stop());
  stream = null; video.srcObject = null;
  start.disabled = false; stop.disabled = true;
  status.textContent = message;
  try { await fetch('/frame', { ...options, method: 'DELETE' }); } catch {}
}

start.addEventListener('click', async () => {
  start.disabled = true;
  try {
    if (!navigator.mediaDevices?.getDisplayMedia || !window.CropTarget) throw new Error('Güncel Chrome veya Edge ile aç.');
    // Call directly inside the click gesture; the browser chooser is mandatory.
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 10 }, audio: false, preferCurrentTab: true,
      selfBrowserSurface: 'include', monitorTypeSurfaces: 'exclude', surfaceSwitching: 'exclude'
    });
    const track = stream.getVideoTracks()[0];
    if (track.getSettings().displaySurface !== 'browser' || !track.cropTo) throw new Error('Paylaşım penceresinde bu oynatıcı sekmesini seç.');
    await track.cropTo(await CropTarget.fromElement(document.querySelector('.video')));
    track.addEventListener('ended', () => finish(), { once: true });
    video.srcObject = stream;
    await video.play();
    stop.disabled = false;
    const current = ++generation;
    const send = async () => {
      if (current !== generation || !stream) return;
      if (video.readyState >= 2 && !sending) {
        sending = true;
        try {
          upload = new AbortController();
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const response = await fetch('/frame', {
            method: 'POST', headers: { ...options.headers, 'Content-Type': 'application/octet-stream' }, body: rgba,
            signal: AbortSignal.any([upload.signal, AbortSignal.timeout(2000)])
          });
          if (!response.ok) throw new Error('Görüntü aktarımı başarısız. Sunucuyu yeniden başlat.');
        } catch (error) { if (current === generation) await finish(error.message); }
        finally { sending = false; }
      }
      if (current === generation) timer = setTimeout(send, 100);
    };
    send();
  } catch (error) {
    await finish(error.name === 'NotAllowedError' ? 'Paylaşım iptal edildi.' : error.message);
  }
});
stop.addEventListener('click', () => finish());
setInterval(async () => {
  if (!stream) return;
  try {
    const response = await fetch('/bridge-status', options);
    const state = await response.json();
    status.textContent = !state.addon ? 'Görüntü hazır · Oyun eklentisi bekleniyor.' : !state.targets
      ? 'Eklenti bağlı · FH6 ekran dokusu henüz bulunamadı.' : 'FH6 ekran dokusu bağlı · Görüntü aktarılıyor.';
  } catch { status.textContent = 'Yerel sunucuya ulaşılamıyor.'; }
}, 1500);
window.addEventListener('pagehide', () => { stream?.getTracks().forEach(track => track.stop()); });
