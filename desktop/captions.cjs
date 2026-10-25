// Use the player's own CC button, including its current language selection.
// Feature-detect the control; never claim a requested toggle succeeded before
// reading its actual aria-pressed state back from YouTube.
function captions(videoId,enabled){
  const p=document.getElementById('movie_player');
  const current=p?.getVideoData?.()?.video_id||'';
  const result={videoId:current,available:false,enabled:false};
  if(current!==videoId)return result;
  // YouTube serves both desktop and mobile-style embedded controls. In the
  // latter, the CC button is outside movie_player. Hidden control bars should
  // not disable the in-game button while the video continues playing.
  const button=document.querySelector('.ytp-subtitles-button, .ytmClosedCaptioningButtonButton');
  if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return result;
  const style=getComputedStyle(button);
  if(style.display==='none'||!['true','false'].includes(button.getAttribute('aria-pressed')))return result;
  result.available=true;
  if(typeof enabled==='boolean'&&(button.getAttribute('aria-pressed')==='true')!==enabled)button.click();
  result.enabled=button.getAttribute('aria-pressed')==='true';
  return result;
}
const inspectCaptions=id=>`(${captions.toString()})(${JSON.stringify(id)})`;
const setCaptions=(id,enabled)=>`(${captions.toString()})(${JSON.stringify(id)},${JSON.stringify(enabled)})`;
module.exports={inspectCaptions,setCaptions};
