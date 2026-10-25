function parseTime(value) {
  if(value===null||value==='')return 0;
  if(/^\d+(?:\.\d+)?$/.test(value))return Math.min(604800,Number(value));
  const match=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/i.exec(value);
  if(!match||!match.slice(1).some(Boolean))throw new Error('Geçersiz başlangıç süresi.');
  return Math.min(604800,Number(match[1]||0)*3600+Number(match[2]||0)*60+Number(match[3]||0));
}
function parseYouTube(value) {
  value=String(value).trim();
  if(/^[\w-]{11}$/.test(value))return {id:value,startSeconds:0};
  const url=new URL(value);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port)throw new Error('Geçersiz YouTube bağlantısı.');
  let id;
  if(url.hostname==='youtu.be')id=url.pathname.slice(1).replace(/\/$/,'');
  else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(url.hostname))id=url.searchParams.get('v')||url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)\/?$/)?.[1];
  if(!/^[\w-]{11}$/.test(id))throw new Error('Geçerli YouTube bağlantısı gir.');
  const hash=new URLSearchParams(url.hash.slice(1));
  return {id,startSeconds:parseTime(url.searchParams.get('t')??url.searchParams.get('start')??url.searchParams.get('time_continue')??hash.get('t')??hash.get('start'))};
}
module.exports={parseYouTube,parseTime};
