// electron/preload.ts

import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { NodeRegistryChange } from './nodeRegistryTypes'

type Cleanup = () => void

function registerIpcListener<T>(
  channel: string,
  callback: (payload: T) => void,
): Cleanup {
  const listener = (_event: unknown, payload: T) => callback(payload)
  ipcRenderer.on(channel, listener as any)
  return () => ipcRenderer.removeListener(channel, listener as any)
}

contextBridge.exposeInMainWorld('electronAPI', {
  sendPing: (message: string) => ipcRenderer.send('ping', message),
  onPong: (callback: (response: string) => void) =>
    ipcRenderer.on('pong', (event, response) => callback(response)),

  // Server-related methods
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  restartServer: () => ipcRenderer.invoke('restart-server'),
  onServerStatus: (callback: (status: any) => void) => {
    return registerIpcListener('server-status', callback)
  },

  openNodeWindow: (nodeId: string) => ipcRenderer.invoke('open-node-window', nodeId),
  focusNodeWindow: (nodeId: string) => ipcRenderer.invoke('focus-node-window', nodeId),
  listNodeWindows: () => ipcRenderer.invoke('list-node-windows'),
  getWindowContext: () => ipcRenderer.invoke('get-window-context'),
  upsertNodeRegistry: (change: NodeRegistryChange) => ipcRenderer.invoke('upsert-node-registry', change),
  getNodeRegistrySnapshot: () => ipcRenderer.invoke('get-node-registry-snapshot'),
  onNodeRegistryUpdated: (callback: (snapshot: any) => void) => {
    return registerIpcListener('node-registry-updated', callback)
  },

  // Method for directly checking server health
  checkServerHealth: () => ipcRenderer.invoke('check-server-health'),

  // Method to get the log file path
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),

  // Method to open the log file
  openLogFile: (filePath: string) => ipcRenderer.invoke('open-log-file', filePath),

  // Method to open an external link
  openExternalLink: (url: string) => ipcRenderer.invoke('open-external-link', url),

  // Method to read log file content
  readLogFile: (filePath: string) => ipcRenderer.invoke('read-log-file', filePath),

  // **NEW** Method to read local text file content
  readLocalTextFile: (filePath: string) => ipcRenderer.invoke('read-local-text-file', filePath),

  // Method to get OS platform
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Shutdown communication
  onAppQuitting: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('app-quitting', listener)
    return () => ipcRenderer.removeListener('app-quitting', listener)
  },
  startShutdown: () => ipcRenderer.send('start-shutdown'),

  // Advanced recovery options
  resetServerData: () => ipcRenderer.invoke('reset-server-data'),

  // Method for showing native folder picker dialog
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog'),

  // Method for getting file path from a dropped file object
  // In sandboxed renderers, `file.path` is removed. This is the secure way to get the real path.
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
})

// The previous global drop handler has been removed.
// The renderer process will now handle its own drop events on specific elements
// and use the exposed `electronAPI.getPathForFile` function to retrieve file paths.
// This aligns with the new documented pattern and gives components more control.
