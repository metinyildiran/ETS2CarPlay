// Read decoded video timing; does not seek, download, mute or alter YouTube playback.
const sampleVideoRate = `new Promise(resolve => {
  const video = document.querySelector('video');
  if (!video || !video.requestVideoFrameCallback || video.paused) { resolve(null); return; }
  const intervals = []; let previous, callback, done = false;
  const finish = () => {
    if (done) return; done = true; clearTimeout(timeout);
    if (callback !== undefined) video.cancelVideoFrameCallback(callback);
    intervals.sort((a,b) => a-b);
    resolve(intervals.length >= 6 ? 1 / intervals[Math.floor(intervals.length/2)] : null);
  };
  const timeout = setTimeout(finish, 2000);
  const sample = (_now, frame) => {
    if (previous) {
      const count = frame.presentedFrames - previous.presentedFrames;
      const delta = (frame.mediaTime - previous.mediaTime) / count;
      if (count > 0 && delta >= 1/240 && delta <= 1) intervals.push(delta);
    }
    previous = frame;
    if (intervals.length >= 12) finish();
    else if (!done) callback = video.requestVideoFrameCallback(sample);
  };
  callback = video.requestVideoFrameCallback(sample);
})`;
module.exports={sampleVideoRate};
