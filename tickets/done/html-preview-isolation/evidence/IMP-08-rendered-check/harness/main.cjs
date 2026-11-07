// App window with the app's webPreferences (preload, contextIsolation, sandbox, file:// page),
// rendering the two preview sources exactly as HtmlPreviewer.vue now does, plus the static URL top-level.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const OUT = process.env.HPI_OUT;
ipcMain.handle('probe-ping', (event) => {
  console.log('PROBE ' + JSON.stringify({ frame: 'main-process', check: 'ipc-received', value: `senderFrame=${event.senderFrame ? event.senderFrame.url : '<none>'}` }));
  return 'main process answered';
});
const relay = (w) => w.webContents.on('console-message', (...args) => {
  const message = typeof args[0] === 'object' && args[0] && 'message' in args[0] ? args[0].message : args[2];
  if (String(message).startsWith('PROBE ')) console.log(message);
});
const STATIC = 'http://127.0.0.1:47931/rest/workspaces/ws-1/static/report.html';
const content = fs.readFileSync(path.join(__dirname, 'workspace', 'report.html'), 'utf8');
const appHtml = `<!doctype html><html><head><title>AppWindow</title>
<style>body{margin:0;display:flex;gap:8px}iframe{width:480px;height:300px;border:1px solid #888}</style></head><body>
<script>
localStorage.setItem('app-secret', 'app-only');
window.addEventListener('message', (e) => {
  console.log('PROBE ' + JSON.stringify({ frame: e.data.probe, check: e.data.name, value: e.data.value, eventOrigin: e.origin }));
});
const add = (src) => { const el = document.createElement('iframe'); el.setAttribute('sandbox', 'allow-scripts'); el.src = src; document.body.appendChild(el); };
add(${JSON.stringify(STATIC + '?label=workspace-preview')});
add(URL.createObjectURL(new Blob([${JSON.stringify(content).replace(/<\//g, '<\\/')}], { type: 'text/html' })));
console.log('PROBE ' + JSON.stringify({ frame: 'app', check: 'app-origin', value: window.location.origin }));
<\/script></body></html>`;
fs.writeFileSync(path.join(OUT, 'app.html'), appHtml);
app.whenReady().then(() => {
  const w = new BrowserWindow({ show: false, width: 1000, height: 320, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  relay(w);
  w.loadURL(pathToFileURL(path.join(OUT, 'app.html')).toString());
  const top = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  relay(top);
  top.loadURL(STATIC + '?label=top-level');
  setTimeout(async () => {
    const image = await w.webContents.capturePage();
    fs.writeFileSync(path.join(OUT, 'app-window.png'), image.toPNG());
    app.quit();
  }, 3500);
});
