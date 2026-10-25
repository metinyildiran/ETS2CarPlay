export function parseVideo(input) {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  let url;
  try { url = new URL(value); } catch { throw new Error('Bir YouTube video bağlantısı yapıştır.'); }
  if (url.protocol !== 'https:') throw new Error('HTTPS YouTube bağlantısı kullan.');
  const host = url.hostname.toLowerCase();
  let id;
  if (host === 'youtu.be') id = url.pathname.slice(1);
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const match = url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)\/?$/);
      id = match?.[1];
    }
  }
  if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('Geçerli bir YouTube videosu bulunamadı.');
  return id;
}
