// Electron with the app window's webPreferences (workspace-shell-window.ts): preload, contextIsolation, sandbox.
// Loads app.html from file:// (as the packaged renderer does) and prints every PROBE line.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

ipcMain.handle('probe-ping', (event) => {
  const frameUrl = event.senderFrame ? event.senderFrame.url : '<none>';
  console.log('PROBE ' + JSON.stringify({ frame: 'main-process', check: 'ipc-received', value: `senderFrame=${frameUrl}` }));
  return 'main process answered';
});

app.whenReady().then(() => {
  const w = new BrowserWindow({
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  w.webContents.on('console-message', (...args) => {
    const message = typeof args[0] === 'object' && args[0] && 'message' in args[0] ? args[0].message : args[2];
    if (String(message).startsWith('PROBE ')) console.log(message);
  });
  w.loadURL(pathToFileURL(path.join(__dirname, 'app.html')).toString());
  setTimeout(() => app.quit(), 4000);
});
