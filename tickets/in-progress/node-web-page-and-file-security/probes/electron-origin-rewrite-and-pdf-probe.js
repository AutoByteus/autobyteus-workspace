// Usage: env -u ELECTRON_RUN_AS_NODE <worktree>/node_modules/.pnpm/electron@42.11.16/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron <this file> <path to a one-page PDF>
// Writes page.html and screenshots next to itself; run it from a scratch copy.
// Probe A: can a session's webRequest.onBeforeSendHeaders make file:// pages' requests carry Origin "null" (fetch POST/GET, WebSocket)?
// Probe B: does a top-level PDF render with and without "Content-Security-Policy: sandbox allow-scripts", with the in-app browser's webPreferences (plugins default) and with plugins:true?
const { app, BrowserWindow, session } = require('electron');
const http = require('http'); const fs = require('fs'); const path = require('path');
const seen = [];
const pdf = fs.readFileSync(process.argv[process.argv.length - 1]);
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/doc.pdf')) {
    const h = { 'content-type': 'application/pdf' };
    if (req.url.includes('sandbox')) h['content-security-policy'] = 'sandbox allow-scripts';
    res.writeHead(200, h); return res.end(pdf);
  }
  seen.push({ kind: 'http', method: req.method, origin: req.headers.origin ?? '(none)' }); res.end('ok');
});
server.on('upgrade', (req, sock) => { seen.push({ kind: 'ws', origin: req.headers.origin ?? '(none)' }); sock.destroy(); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pdfRendered = async (w) => w.webContents.mainFrame.framesInSubtree.some((f) => f.url.startsWith('chrome-extension://'));
server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  await app.whenReady();
  const ses = session.fromPartition('persist:probe-browser');
  ses.webRequest.onBeforeSendHeaders((details, cb) => {
    const fromFile = details.frame?.url?.startsWith('file:') || details.requestHeaders.Origin === 'file://';
    if (fromFile && !details.url.startsWith('file:')) details.requestHeaders.Origin = 'null';
    cb({ requestHeaders: details.requestHeaders });
  });
  const page = path.join(__dirname, 'page.html');
  fs.writeFileSync(page, `<script>fetch('http://127.0.0.1:${port}/p',{method:'POST',body:'x'}).catch(()=>{});fetch('http://127.0.0.1:${port}/g').catch(()=>{});try{new WebSocket('ws://127.0.0.1:${port}/ws')}catch(e){}</script>`);
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, session: ses } });
  await w.loadFile(page); await wait(2000);
  const out = { A_fileOriginRewrite: [...seen] };
  for (const [label, prefs, q] of [['inAppPrefs_noCsp', {}, ''], ['inAppPrefs_sandbox', {}, '?sandbox'], ['plugins_noCsp', { plugins: true }, ''], ['plugins_sandbox', { plugins: true }, '?sandbox']]) {
    const pw = new BrowserWindow({ show: false, width: 800, height: 600, webPreferences: { sandbox: true, contextIsolation: true, ...prefs } });
    try { await pw.loadURL(`http://127.0.0.1:${port}/doc.pdf${q}`); } catch (e) { out[label + '_loadError'] = String(e.message).slice(0, 80); }
    await wait(2500);
    const img = await pw.webContents.capturePage(); fs.writeFileSync(path.join(__dirname, label + '.png'), img.toPNG()); const bmp = img.toBitmap(); let dark = 0; for (let i = 0; i < bmp.length; i += 4) if (bmp[i] < 200) dark++; out['B_' + label] = { pdfViewerFrame: await pdfRendered(pw), nonWhitePixels: dark, size: img.getSize() };
    pw.destroy();
  }
  console.log(JSON.stringify(out)); app.quit();
});
