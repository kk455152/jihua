const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('jihua', {
  setAlwaysOnTop: (on) => ipcRenderer.invoke('widget:setAlwaysOnTop', on),
  close: () => ipcRenderer.invoke('widget:close'),
  openMain: () => ipcRenderer.invoke('widget:openMain'),
})
