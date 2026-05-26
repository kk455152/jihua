const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('jihua', {
  setAlwaysOnTop: (on) => ipcRenderer.invoke('widget:setAlwaysOnTop', on),
  close: () => ipcRenderer.invoke('widget:close'),
  openMain: () => ipcRenderer.invoke('widget:openMain'),
  toggleFullScreen: () => ipcRenderer.invoke('widget:toggleFullScreen'),
  isFullScreen: () => ipcRenderer.invoke('widget:isFullScreen'),
  onFullScreenChange: (cb) => {
    const listener = (_e, isFull) => cb(isFull)
    ipcRenderer.on('widget:fullScreenChanged', listener)
    return () => ipcRenderer.removeListener('widget:fullScreenChanged', listener)
  },
})
