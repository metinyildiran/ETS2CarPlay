const status=document.getElementById('status');
chrome.storage.session.get('status').then(value=>{if(value.status)status.textContent=value.status;});
for(const type of ['start','stop'])document.getElementById(type).onclick=async()=>{
  const button=document.getElementById(type);button.disabled=true;
  try{const result=await chrome.runtime.sendMessage({to:'service',type});status.textContent=result?.message||'İşlem tamamlandı.';}
  catch{status.textContent='Bağlantı kurulamadı. ETS2’yi ve YouTube sekmesini kontrol et.';}finally{button.disabled=false;}
};
