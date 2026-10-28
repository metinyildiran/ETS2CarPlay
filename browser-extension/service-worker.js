importScripts('page-player.js');
const supported=url=>{try{return ['https:','http:','file:'].includes(new URL(url).protocol);}catch{return false;}};
let starting=false,capturedTab,capturedOrigin,captureMode,generation=0,navigationUntil=0;
let lastStatus;
const status=message=>{const text=String(message).slice(0,300);if(text===lastStatus)return Promise.resolve();lastStatus=text;return chrome.storage.session.set({status:text});};
const run=async(tabId,action,selection)=>{
  const result=await chrome.scripting.executeScript({target:{tabId},func:pageVideo,args:[action,selection||'auto']});
  return result[0]?.result;
};
async function stop(){
  ++generation;
  const tab=capturedTab;capturedTab=undefined;capturedOrigin=undefined;captureMode=undefined;navigationUntil=0;
  if(tab!==undefined)await run(tab,'stop').catch(()=>{});
  if(await chrome.offscreen.hasDocument()){
    await chrome.runtime.sendMessage({to:'offscreen',type:'stop'}).catch(()=>{});
    await chrome.offscreen.closeDocument();
  }
}
async function activeTab(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!supported(tab?.url))throw new Error('Video içeren bir web sayfası aç. Tarayıcının dahili sayfaları paylaşılamaz.');
  return tab;
}
async function start(msg){
  if(starting)throw new Error('Bağlantı hazırlanıyor.');starting=true;
  try{
    const tab=await activeTab();await stop();capturedTab=tab.id;capturedOrigin=new URL(tab.url).origin;
    captureMode=msg.mode==='region'?'region':(!msg.selection||msg.selection==='auto')?'auto':'video';
    const ownGeneration=generation;
    if(msg.mode==='region'){
      const chosen=await run(tab.id,'region');if(!chosen?.ok)throw new Error('Alan seçimi iptal edildi.');
    }else await run(tab.id,'select',msg.selection);
    if(generation!==ownGeneration)throw new Error('Aktarım iptal edildi.');
    await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['USER_MEDIA'],justification:'Seçilen sekmenin video alanını ETS2 kabin ekranına aktar.'});
    const streamId=await chrome.tabCapture.getMediaStreamId({targetTabId:tab.id});
    if(generation!==ownGeneration)throw new Error('Aktarım iptal edildi.');
    const result=await chrome.runtime.sendMessage({to:'offscreen',type:'start',streamId,tabId:tab.id});
    if(!result?.ok)throw new Error(result?.message||'Aktarım başlatılamadı.');
    await status('Bağlandı. Tarayıcıyı açık tutarak oyuna dönebilirsin.');return {ok:true,message:'Bağlandı.'};
  }catch(error){await stop();throw error;}finally{starting=false;}
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||msg?.to!=='service')return;
  const offscreen=sender.url===chrome.runtime.getURL('offscreen.html'),popup=sender.url===chrome.runtime.getURL('popup.html');
  if(!offscreen&&!popup)return;
  (async()=>{
    if(popup&&msg.type==='list')return {videos:await run((await activeTab()).id,'list')};
    if(popup&&msg.type==='start')return start(msg);
    if(popup&&msg.type==='stop'){await stop();await status('Aktarım durdu. Navigasyon geri gelir.');return {message:'Aktarım durdu. Navigasyon geri gelir.'};}
    if(offscreen&&msg.type==='status'){await status(msg.message);return {};}
    if(offscreen&&msg.type==='snapshot'&&msg.tabId===capturedTab){
      const tab=await chrome.tabs.get(msg.tabId);
      if(!supported(tab.url)||new URL(tab.url).origin!==capturedOrigin){void stop();throw new Error('Site değişti. Yeni sitede Kabine aktar seç.');}
      try{return {state:await run(msg.tabId,'snapshot',captureMode==='auto'?'follow':'fixed')};}
      catch(error){
        // During navigation executeScript can briefly have no document to target.
        // Keep the stream/session alive but clear the cabin frame until it returns.
        if(Date.now()<navigationUntil)return {state:{sourceId:'',playing:false,crop:null,reason:'Sonraki video yükleniyor…'}};
        throw error;
      }
    }
    throw new Error('Geçersiz istek.');
  })().then(reply,async error=>{await status(error.message);reply({ok:false,message:error.message});});return true;
});
chrome.tabs.onRemoved.addListener(tabId=>{if(tabId===capturedTab)void stop();});
chrome.tabs.onUpdated.addListener((tabId,change,tab)=>{
  if(tabId!==capturedTab)return;
  const url=change.url||tab?.url;
  if(url&&(!supported(url)||new URL(url).origin!==capturedOrigin)){void stop();return;}
  if(change.status==='loading'||change.url){
    navigationUntil=Date.now()+15000;
    if(captureMode==='region')void stop();
  }
});
