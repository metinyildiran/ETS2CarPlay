const net=require('node:net');
class FrameSender {
  constructor(status=()=>{},pipe='FH6CarPlay-v4'){this.pipe=pipe;this.status=status;this.pending=null;this.busy=false;this.sequence=0;this.closed=false;this.connect();}
  connect(){if(this.closed)return;this.socket=net.createConnection('\\\\.\\pipe\\'+this.pipe);let ack=Buffer.alloc(0);
    this.socket.on('connect',()=>{this.connected=true;this.status({connected:true});this.flush();});
    this.socket.on('data',bytes=>{ack=Buffer.concat([ack,bytes]);while(ack.length>=12){this.status({sequence:ack.readUInt32LE(0),targets:ack.readUInt32LE(4),uploaded:ack.readUInt32LE(8),connected:true});ack=ack.subarray(12);this.busy=false;this.flush();}});
    this.socket.on('error',()=>{});
    this.socket.on('close',()=>{this.connected=false;this.busy=false;this.status({connected:false});if(!this.closed)this.retry=setTimeout(()=>this.connect(),1000);});
  }
  push(bitmap){if(bitmap.length!==1024*512*4)throw new Error('Unexpected paint size');this.pending=bitmap;this.flush();}
  flush(){if(!this.connected||this.busy||!this.pending)return;const data=this.pending;this.pending=null;this.busy=true;const header=Buffer.alloc(24);header.write('FH6F');[2,1024,512,4096,++this.sequence>>>0].forEach((v,i)=>header.writeUInt32LE(v,4+i*4));this.socket.write(Buffer.concat([header,data]));}
  close(){this.closed=true;clearTimeout(this.retry);this.socket?.destroy();}
}
module.exports={FrameSender};
