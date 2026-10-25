// YouTube's public iframe API has no audio-track selector. The embedded player
// exposes these capabilities in some versions; feature-detect them and never
// invent a list or report a change unless the player confirms it.
function inspectAudio() {
  const p=document.getElementById('movie_player');
  if(!p||typeof p.getAvailableAudioTracks!=='function'||typeof p.getAudioTrack!=='function'||typeof p.setAudioTrack!=='function')return {supported:false,tracks:[]};
  const raw=p.getAvailableAudioTracks();
  const current=p.getAudioTrack();
  const videoId=p.getVideoData?.()?.video_id||'';
  const tracks=(Array.isArray(raw)?raw:[]).map(t=>{
    const info=t.getLanguageInfo?.()||t.languageInfo||{};
    const language=String(info.id||t.languageCode||'').replace(/\.\d+$/,'');
    let label=info.name||t.displayName?.simpleText||(typeof t.displayName==='string'?t.displayName:'')||t.name||language||'Ses parçası';
    try{if(language){label=new Intl.DisplayNames(['tr'],{type:'language'}).of(language)||label;if(/original/i.test(info.name||''))label+=' (orijinal)';}}catch{}
    if(info.isAutoDubbed)label+=' (otomatik dublaj)';
    return {id:String(t.id??''),label,language};
  }).filter(t=>t.id).slice(0,64);
  return {supported:true,videoId,selected:String(current?.id??''),tracks};
}
function chooseAudio(videoId,id) {
  const p=document.getElementById('movie_player');
  if(!p||typeof p.setAudioTrack!=='function'||typeof p.getAvailableAudioTracks!=='function')return false;
  if((p.getVideoData?.()?.video_id||'')!==videoId)return false;
  const track=p.getAvailableAudioTracks().find(t=>String(t.id)===id);
  if(!track)return false;
  p.setAudioTrack(track);return true;
}
const inspectScript=`(${inspectAudio.toString()})()`;
const selectScript=(videoId,id)=>`(${chooseAudio.toString()})(${JSON.stringify(videoId)},${JSON.stringify(id)})`;
module.exports={inspectScript,selectScript};
