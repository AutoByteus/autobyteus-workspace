// Usage: env -u ELECTRON_RUN_AS_NODE <worktree>/node_modules/.pnpm/electron@42.11.16/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron <this file>
// Measured 2026-11-07 (Electron 42.11.16): [{"kind":"http","method":"POST","origin":"(none)"},{"kind":"ws","origin":"file://"},{"kind":"http","method":"GET","origin":"(none)"}]
// Writes page.html next to itself; run it from a scratch copy.
// Measures the Origin header Electron sends from a file:// page (fetch POST and WebSocket), as the in-app browser would load it.
const { app, BrowserWindow } = require('electron');
const http = require('http'); const fs = require('fs'); const path = require('path');
const seen = [];
const server = http.createServer((req, res) => { seen.push({ kind: 'http', method: req.method, origin: req.headers.origin ?? '(none)' }); res.end('ok'); });
server.on('upgrade', (req, sock) => { seen.push({ kind: 'ws', origin: req.headers.origin ?? '(none)' }); sock.destroy(); });
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const page = path.join(__dirname, 'page.html');
  fs.writeFileSync(page, `<script>fetch('http://127.0.0.1:${port}/p',{method:'POST',body:'x'}).catch(()=>{});fetch('http://127.0.0.1:${port}/g').catch(()=>{});try{new WebSocket('ws://127.0.0.1:${port}/ws')}catch(e){}</script>`);
  app.whenReady().then(() => {
    const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    w.loadFile(page);
    setTimeout(() => { console.log(JSON.stringify(seen)); app.quit(); }, 3000);
  });
});
