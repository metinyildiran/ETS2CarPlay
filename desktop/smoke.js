const ctx=document.querySelector('canvas').getContext('2d');let n=0;
window.fh6.onCommand(cmd=>{if(cmd.type==='play')window.fh6.state(1);if(cmd.type==='pause'||cmd.type==='stop')window.fh6.state(2);});
window.fh6.state('ready');window.fh6.state(1);
function draw(){ctx.fillStyle=`rgb(${n++%255},40,90)`;ctx.fillRect(0,0,1024,512);requestAnimationFrame(draw);}draw();
