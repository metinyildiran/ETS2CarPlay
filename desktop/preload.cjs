const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('fh6',{
  command:cmd=>ipcRenderer.send('command',cmd),
  state:state=>ipcRenderer.send('player-state',state),
  onCommand:callback=>ipcRenderer.on('player-command',(_event,cmd)=>callback(cmd)),
  onStatus:callback=>ipcRenderer.on('status',(_event,status)=>callback(status))
});
