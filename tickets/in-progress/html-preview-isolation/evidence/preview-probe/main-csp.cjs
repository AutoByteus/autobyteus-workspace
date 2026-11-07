// CSP check in Electron: app window (as main.cjs) loading app-csp.html, plus the static URL opened top-level.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
ipcMain.handle('probe-ping', (event) => {
  console.log('PROBE ' + JSON.stringify({ frame: 'main-process', check: 'ipc-received', value: `senderFrame=${event.senderFrame ? event.senderFrame.url : '<none>'}` }));
  return 'main process answered';
});
const relay = (w) => w.webContents.on('console-message', (...args) => {
  const message = typeof args[0] === 'object' && args[0] && 'message' in args[0] ? args[0].message : args[2];
  if (String(message).startsWith('PROBE ')) console.log(message);
});
app.whenReady().then(() => {
  const prefs = { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true };
  const w = new BrowserWindow({ show: false, webPreferences: prefs });
  relay(w);
  w.loadURL(pathToFileURL(path.join(__dirname, 'app-csp.html')).toString());
  const top = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  relay(top);
  top.loadURL('http://127.0.0.1:47921/rest/workspaces/ws-1/static/report.html?label=csp/top-level');
  setTimeout(() => app.quit(), 4000);
});
