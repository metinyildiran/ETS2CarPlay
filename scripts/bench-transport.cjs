// Bounded local-only microbenchmark. Fake receiver uses a unique pipe, never ETS2.
const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const {randomUUID}=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'build/transport-bench');fs.mkdirSync(out,{recursive:true});
for(const file of ['transport.cjs','browser-bridge.cjs'])fs.writeFileSync(path.join(out,file),execFileSync('git',['show','HEAD:desktop/'+file],{cwd:root}));
async function run(folder,label){
  const {FrameSender}=require(path.join(folder,'transport.cjs')),{createBrowserBridge}=require(path.join(folder,'browser-bridge.cjs'));
  const pipe='CarPlay-bench-'+randomUUID(),peers=new Set();let resolveAck;
  const server=net.createServer(socket=>{peers.add(socket);socket.on('close',()=>peers.delete(socket));let at=0,sequence=0;
    socket.on('data',data=>{let offset=0;while(offset<data.length){const n=Math.min(data.length-offset,2097176-at);at+=n;offset+=n;if(at===2097176){at=0;const ack=Buffer.alloc(12);ack.writeUInt32LE(++sequence);ack.writeUInt32LE(1,4);ack.writeUInt32LE(sequence,8);socket.write(ack);}}});
  });
  await new Promise(r=>server.listen('\\\\.\\pipe\\'+pipe,r));
  const sender=new FrameSender(a=>{if(a.sequence)resolveAck?.();},pipe),token='ba'.repeat(32);
  const bridge=createBrowserBridge({token,port:0,onFrame:frame=>{if(frame[3])sender.push(frame);}});await bridge.listen();
  const base='http://127.0.0.1:'+bridge.server.address().port,headers={'X-FH6-Token':token,'Content-Type':'application/json'};
  try{
    const response=await fetch(base+'/connect',{method:'POST',headers,body:'{}'});headers['X-FH6-Session']=(await response.json()).session;
    const [{serial}]=await(await fetch(base+'/commands',{headers})).json();
    await fetch(base+'/state',{method:'POST',headers,body:JSON.stringify({sourceId:'video-1',playing:true,applied:serial})});
    const pixels=Buffer.alloc(2097152,255),times=[],cpuStart=process.cpuUsage();
    for(let i=0;i<100;i++){
      const ack=new Promise(r=>{resolveAck=r;}),start=performance.now();
      const result=await fetch(base+'/frame',{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream','X-FH6-Serial':String(serial)},body:pixels});
      if(!result.ok)throw Error('Frame rejected');await ack;if(i>=10)times.push(performance.now()-start);
    }
    const cpu=process.cpuUsage(cpuStart);times.sort((a,b)=>a-b);
    return {label,medianMs:+times[45].toFixed(2),p95Ms:+times[85].toFixed(2),cpuMs:+((cpu.user+cpu.system)/1000).toFixed(1)};
  }finally{bridge.close();sender.close();for(const peer of peers)peer.destroy();await new Promise(r=>server.close(r));}
}
(async()=>{const results=[];for(const label of ['baseline','candidate','candidate','baseline'])results.push(await run(label==='baseline'?out:path.join(root,'desktop'),label));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));})().catch(e=>{console.error(e);process.exitCode=1;});
setTimeout(()=>{console.error('Benchmark deadline');process.exit(1);},20000).unref();
