const net=require('node:net');
function decodeCommand(line){
  const [type,value,index]=line.split('\t');
  if(type==='load'&&value&&value.length<=2048)return {type,value};
  if(['play','pause','stop'].includes(type))return {type};
  if(type==='volume'&&Number.isFinite(Number(value)))return {type,value:Number(value)};
  if(type==='audio'&&/^[\w-]{11}$/.test(value)&&/^\d{1,2}$/.test(index)&&Number(index)<64)return {type,videoId:value,index:Number(index)};
  if(type==='captions'&&/^[\w-]{11}$/.test(value)&&/^[01]$/.test(index))return {type,videoId:value,enabled:index==='1'};
  return null;
}
class ControlClient {
  constructor(command,quit,pipe){this.command=command;this.quit=quit;this.pipe=pipe;this.closed=false;this.connect();}
  connect(){
    if(this.closed)return;
    let pending='';
    this.socket=net.createConnection('\\\\.\\pipe\\'+this.pipe);
    this.socket.setEncoding('utf8');
    this.socket.on('data',bytes=>{
      pending+=bytes;if(pending.length>16384){this.socket.destroy();return;}
      let end;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(line==='quit')this.quit();else{const cmd=decodeCommand(line);if(cmd)this.command(cmd);}}
    });
    this.socket.on('error',()=>{});
    this.socket.on('close',()=>{if(!this.closed)this.retry=setTimeout(()=>this.connect(),1000);});
  }
  report(value){if(this.socket?.readyState==='open'&&this.socket.writableLength<8192)this.socket.write(String(value).replace(/[\r\n]/g,' ').slice(0,1024)+'\n');}
  captions(value){this.report(['@captions',/^[\w-]{11}$/.test(value.videoId)?value.videoId:'',value.available?1:0,value.enabled?1:0].join('\t'));}
  audio(value){
    const clean=text=>String(text).replace(/[\r\n\t]/g,' ').slice(0,60);
    const line=['@audio',clean(value.videoId||''),value.tracks.findIndex(t=>t.id===value.selected),...value.tracks.map(t=>clean(t.label))].join('\t')+'\n';
    if(this.socket?.readyState==='open'&&this.socket.writableLength<8192)this.socket.write(line);
  }
  close(){this.closed=true;clearTimeout(this.retry);this.socket?.destroy();}
}
module.exports={ControlClient,decodeCommand};
