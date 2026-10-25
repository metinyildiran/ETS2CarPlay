importScripts('page-player.js','player-options.js');
const youtube=url=>{try{const u=new URL(url);return u.origin==='https://www.youtube.com'&&u.pathname==='/watch';}catch{return false;}};
let starting=false,capturedTab;
const run=async(tabId,func,args=[])=>{
  const tab=await chrome.tabs.get(tabId);if(!youtube(tab.url))throw new Error('YouTube’da normal bir video sayfası aç.');
  const result=await chrome.scripting.executeScript({target:{tabId},world:'MAIN',func,args});
  return result[0]?.result;
};
async function stop(){
  capturedTab=undefined;
  if(await chrome.offscreen.hasDocument()){
    await chrome.runtime.sendMessage({to:'offscreen',type:'stop'}).catch(()=>{});
    await chrome.offscreen.closeDocument();
  }
}
async function start(){
  if(starting)throw new Error('Bağlantı hazırlanıyor.');starting=true;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!youtube(tab?.url))throw new Error('YouTube’da bir video aç, ardından eklentiyi tekrar aç.');
    await stop();
    await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['USER_MEDIA'],justification:'Kullanıcının seçtiği YouTube sekmesini FH6 kabinine aktar.'});
    const streamId=await chrome.tabCapture.getMediaStreamId({targetTabId:tab.id});
    capturedTab=tab.id;
    const result=await chrome.runtime.sendMessage({to:'offscreen',type:'start',streamId,tabId:tab.id});
    if(!result?.ok){await stop();throw new Error(result?.message||'Aktarım başlatılamadı.');}
    return {message:'Bağlandı. Tarayıcıyı açık tutarak oyuna dönebilirsin.'};
  }finally{starting=false;}
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||msg?.to!=='service')return;
  const offscreen=sender.url===chrome.runtime.getURL('offscreen.html'),popup=sender.url===chrome.runtime.getURL('popup.html');
  if(!offscreen&&!popup)return;
  (async()=>{
    if(popup&&msg.type==='start')return start();
    if(popup&&msg.type==='stop'){await stop();return {message:'Aktarım durdu. Navigasyon geri gelir.'};}
    if(offscreen&&msg.type==='status'){await chrome.storage.session.set({status:String(msg.message).slice(0,300)});return {};}
    if(offscreen&&msg.type==='snapshot'){
      const state=await run(msg.tabId,playerSnapshot);
      const audio=await run(msg.tabId,inspectAudio),cc=await run(msg.tabId,captions,[state.videoId]);
      return {state:{...state,audio,captions:cc}};
    }
    if(offscreen&&msg.type==='command'){
      const cmd=msg.command;
      if(cmd.type==='audio'){
        const audio=await run(msg.tabId,inspectAudio);
        const track=audio?.videoId===cmd.videoId&&Number.isInteger(cmd.index)?audio.tracks[cmd.index]:null;
        if(!track||!await run(msg.tabId,chooseAudio,[cmd.videoId,track.id]))throw new Error('Ses dili değiştirilemedi.');
      }else if(cmd.type==='captions'){
        const cc=await run(msg.tabId,captions,[cmd.videoId,cmd.enabled]);if(!cc?.available)throw new Error('Altyazı seçeneği yok.');
      }else await run(msg.tabId,playerCommand,[cmd]);
      return {ok:true};
    }
    throw new Error('Geçersiz istek.');
  })().then(reply,error=>reply({ok:false,message:error.message}));return true;
});
chrome.tabs.onRemoved.addListener(tabId=>{if(tabId===capturedTab)void stop();});
chrome.tabs.onUpdated.addListener((tabId,change)=>{
  if(tabId===capturedTab&&change.url&&!youtube(change.url))void stop();
});
