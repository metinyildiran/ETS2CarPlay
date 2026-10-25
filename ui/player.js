import { parseVideo } from './youtube.js';
const el = id => document.getElementById(id);
const status = text => { el('status').textContent = text; };
let player;
let loaded = false;
let ready = false;
let timeout = setTimeout(() => status('YouTube yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.'), 15000);
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('player', {
    width: '100%', height: '100%',
    playerVars: { playsinline: 1, origin: location.origin, controls: 1 },
    events: {
      onReady: () => {
        clearTimeout(timeout);
        ready = true;
        el('load').disabled = false;
        el('volume').disabled = false;
        player.setVolume(Number(el('volume').value));
        status('Bir YouTube bağlantısı aç.');
      },
      onStateChange: event => {
        const playing = event.data === YT.PlayerState.PLAYING;
        el('toggle').textContent = playing ? 'Duraklat' : 'Oynat';
        const labels = { '-1': 'Hazır.', 0: 'Video bitti.', 1: 'Çalıyor.', 2: 'Duraklatıldı.', 3: 'Yükleniyor…', 5: 'Hazır. Oynat düğmesine bas.' };
        status(labels[event.data] || 'Hazır.');
      },
      onAutoplayBlocked: () => status('Başlatmak için videonun üzerindeki oynat düğmesine bas.'),
      onError: event => {
        const messages = {
          2: 'Video bağlantısı geçersiz.', 5: 'Video bu oynatıcıda açılamadı.',
          100: 'Video bulunamadı veya özel.',
          101: 'Video sahibi gömülü oynatmaya izin vermiyor. Başka video seç.',
          150: 'Video sahibi gömülü oynatmaya izin vermiyor. Başka video seç.',
          153: 'YouTube uygulama kimliğini doğrulayamadı. Sayfayı yerel sunucu adresinden aç.'
        };
        status(messages[event.data] || `YouTube hatası: ${event.data}`);
      }
    }
  });
};
const script = document.createElement('script');
script.src = 'https://www.youtube.com/iframe_api';
script.onerror = () => { clearTimeout(timeout); status('YouTube servisine erişilemiyor. Sayfayı yeniden yükle.'); };
document.head.append(script);
el('load-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!ready) return;
  try {
    const id = parseVideo(el('url').value);
    player.loadVideoById(id);
    loaded = true;
    el('toggle').disabled = false;
    status('Video açılıyor…');
  } catch (error) { status(error.message); }
});
el('toggle').addEventListener('click', () => {
  if (!ready || !loaded) return;
  if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
  else player.playVideo();
});
el('volume').addEventListener('input', event => {
  const volume = Number(event.target.value);
  el('volume-value').textContent = `${volume}%`;
  if (ready) player.setVolume(volume);
});
