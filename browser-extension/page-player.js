// Injected only in the explicitly selected YouTube watch tab. We do not change
// its layout, quality, language, captions, login or playback when attaching.
function playerCommand(cmd){
  const p=document.getElementById('movie_player');if(!p)throw new Error('YouTube’da önce bir video aç.');
  if(cmd.type==='load'){
    if(!/^[\w-]{11}$/.test(cmd.id)||!Number.isFinite(cmd.startSeconds)||cmd.startSeconds<0)throw new Error('Geçersiz video.');
    p.loadVideoById({videoId:cmd.id,startSeconds:cmd.startSeconds});
  }else if(cmd.type==='play')p.playVideo();
  else if(cmd.type==='pause'||cmd.type==='stop')p.pauseVideo();
  else if(cmd.type==='volume')p.setVolume(Math.min(100,Math.max(0,Number(cmd.value)||0)));
  else if(cmd.type!=='sync')throw new Error('Geçersiz komut.');
  return true;
}
function playerSnapshot(){
  const p=document.getElementById('movie_player'),v=p?.querySelector('video');
  if(!p||!v)return {videoId:'',playing:false,crop:null};
  const r=p.getBoundingClientRect(),width=innerWidth,height=innerHeight;
  // Entire player must be on screen: never crop in unrelated page content or
  // silently stretch a half-visible player after the user scrolls the page.
  const visible=r.width>1&&r.height>1&&r.left>=-1&&r.top>=-1&&r.right<=width+1&&r.bottom<=height+1;
  const crop=visible?{x:Math.max(0,r.left)/width,y:Math.max(0,r.top)/height,w:Math.min(r.width,width)/width,h:Math.min(r.height,height)/height}:null;
  return {videoId:p.getVideoData?.()?.video_id||'',playing:visible&&!v.paused&&!v.ended&&v.readyState>=2,crop};
}
