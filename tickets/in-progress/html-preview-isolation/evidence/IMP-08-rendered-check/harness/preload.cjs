// Mirrors the app's preload: an API exposed to the app window's main world.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('probe-ping'),
});
