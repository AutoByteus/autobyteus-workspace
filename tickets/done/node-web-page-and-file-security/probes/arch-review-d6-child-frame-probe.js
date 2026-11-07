// Reviewer probe: D6 rule as written (frame.url, else webContents URL) against same-origin child frames and navigations.
const { app, BrowserWindow, session } = require('electron');
const http = require('http'); const fs = require('fs'); const path = require('path');
const seen = [];
const server = http.createServer((req, res) => { seen.push({ kind: 'http', method: req.method, url: req.url, origin: req.headers.origin ?? '(none)' }); res.end('ok'); });
server.on('upgrade', (req, sock) => { seen.push({ kind: 'ws', url: req.url, origin: req.headers.origin ?? '(none)' }); sock.destroy(); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = process.argv[process.argv.length - 1];
server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port; const base = `http://127.0.0.1:${port}`;
  await app.whenReady();
  const ses = session.fromPartition('probe-browser-416');
  const decisions = [];
  ses.webRequest.onBeforeSendHeaders((d, cb) => {
    const initiator = d.frame?.url || d.webContents?.getURL() || '';
    const rewrite = initiator.startsWith('file:') && !d.url.startsWith('file:');
    decisions.push({ url: d.url.replace(base, ''), resourceType: d.resourceType, frameUrl: d.frame?.url ?? '(no frame)', frameOrigin: d.frame?.origin ?? '(no frame)', rewrite });
    if (rewrite) d.requestHeaders.Origin = 'null';
    cb({ requestHeaders: d.requestHeaders });
  });
  const page = path.join(dir, 'page.html');
  fs.writeFileSync(page, `<body><script>
fetch('${base}/top-post',{method:'POST',body:'x'}).catch(()=>{});
const f=document.createElement('iframe'); document.body.append(f);
f.contentWindow.fetch('${base}/blank-iframe-post',{method:'POST',body:'x'}).catch(()=>{});
f.contentWindow.fetch('${base}/blank-iframe-get').catch(()=>{});
try{ new f.contentWindow.WebSocket('ws://127.0.0.1:${port}/blank-iframe-ws') }catch(e){}
const s=document.createElement('iframe'); s.srcdoc="<script>fetch('${base}/srcdoc-post',{method:'POST',body:'x'}).catch(()=>{})<\\/script>"; document.body.append(s);
</script></body>`);
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, session: ses } });
  await w.loadFile(page); await wait(2000);
  // Main-frame GET navigation from the file:// page to an http URL (address bar / agent navigate tool).
  try { await w.loadURL(`${base}/navigate-from-file`); } catch (e) {}
  await wait(1000);
  console.log(JSON.stringify({ electron: process.versions.electron, seen, decisions }, null, 1)); app.quit();
});
