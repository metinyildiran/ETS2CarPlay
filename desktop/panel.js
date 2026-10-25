const el=id=>document.getElementById(id);
document.querySelector('form').onsubmit=e=>{e.preventDefault();window.fh6.command({type:'load',value:el('url').value});};
for(const type of ['play','pause'])el(type).onclick=()=>window.fh6.command({type});
el('volume').oninput=e=>window.fh6.command({type:'volume',value:e.target.value});
let audio;
let captions;
el('captions').onclick=()=>{if(captions?.available)window.fh6.command({type:'captions',videoId:captions.videoId,enabled:!captions.enabled});};
el('audio').onchange=e=>window.fh6.command({type:'audio',videoId:audio.videoId,index:Number(e.target.value)});
window.fh6.onStatus(s=>{
 if(s.captions){captions=s.captions;el('captions').disabled=!captions.available;el('captions').textContent=!captions.available?'Altyazı yok':captions.enabled?'Altyazıyı kapat':'Altyazıyı aç';el('captions').setAttribute('aria-pressed',String(captions.enabled));}
 if(s.message)el('message').textContent=s.message;else if(s.state!==undefined)el('message').textContent=({'ready':'Video bağlantısı açabilirsin.','1':'Video oynatılıyor.','2':'Duraklatıldı.','0':'Video bitti.','3':'Video yükleniyor…','5':'Video hazır.','-1':''})[s.state]??s.state;
 if(s.audio){audio=s.audio;const select=el('audio');select.replaceChildren();audio.tracks.forEach((track,index)=>{const option=new Option(track.label,String(index),false,track.id===audio.selected);select.add(option);});if(!audio.tracks.length)select.add(new Option('Bu videoda seçenek yok',''));select.disabled=audio.tracks.length<2;}
});
