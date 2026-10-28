const status=document.getElementById('status'),select=document.getElementById('video');
chrome.storage.session.get('status').then(value=>{if(value.status)status.textContent=value.status;});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='session'&&changes.status)status.textContent=changes.status.newValue;});
chrome.runtime.sendMessage({to:'service',type:'list'}).then(result=>{
  for(const video of result?.videos||[]){const option=document.createElement('option');option.value=video.id;option.textContent=video.label;option.disabled=!video.visible;select.append(option);}
  if(!result?.videos?.length)status.textContent=result?.message||'Video otomatik bulunamadı. Alan seç kullanabilirsin.';
}).catch(()=>{});
for(const type of ['start','stop','region'])document.getElementById(type).onclick=async()=>{
  const button=document.getElementById(type);button.disabled=true;
  try{
    const request=chrome.runtime.sendMessage({to:'service',type:type==='region'?'start':type,mode:type==='region'?'region':'video',selection:select.value});
    if(type==='region'){request.catch(()=>{});window.close();return;}
    const result=await request;status.textContent=result?.message||'İşlem tamamlandı.';
  }catch{status.textContent='Bağlantı kurulamadı. ETS2’yi ve video sekmesini kontrol et.';}finally{button.disabled=false;}
};
