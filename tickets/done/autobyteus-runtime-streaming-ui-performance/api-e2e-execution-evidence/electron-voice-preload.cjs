const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('electronAPI', {
  getServerStatus: () => Promise.resolve({ status: 'running', port: 29695, urls: {} }),
  checkServerHealth: () => Promise.resolve({ status: 'ok', data: { status: 'ok' } }),
  onServerStatus: () => () => {},
  getLogFilePath: () => Promise.resolve(''),
  getAppUpdateState: () => Promise.resolve({
    status: 'idle', currentVersion: 'probe', availableVersion: null,
    downloadPercent: null, downloadTransferredBytes: null, downloadTotalBytes: null,
    releaseNotes: null, message: '', errorKind: null, errorOperation: null, checkedAt: null,
  }),
  onAppUpdateState: () => () => {},
  getWindowContext: () => invoke('probe:window-context'),
  getAppLocale: () => Promise.resolve('en'),
  getPlatform: () => Promise.resolve(process.platform),
  getExtensionsState: () => invoke('probe:extensions'),
  installExtension: () => invoke('probe:extensions'),
  enableExtension: () => invoke('probe:extensions'),
  disableExtension: () => invoke('probe:extensions'),
  removeExtension: () => invoke('probe:extensions'),
  reinstallExtension: () => invoke('probe:extensions'),
  updateVoiceInputSettings: (_id, payload) => invoke('probe:update-settings', payload),
  openExtensionFolder: () => Promise.resolve({ success: true }),
  transcribeVoiceInput: (request) => invoke('probe:transcribe', request),
  probeTrackStopped: () => invoke('probe:track-stopped'),
  onAppQuitting: () => () => {},
});
