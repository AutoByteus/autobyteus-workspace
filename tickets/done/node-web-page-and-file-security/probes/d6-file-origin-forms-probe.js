// SR-003 probe for the revised D6 rule (AR-001, AR-002). Usage: env -u ELECTRON_RUN_AS_NODE <Electron 42.11.16 binary> <this file> <scratch dir>
// D6 revised rule probe (SR-003): decide on the requesting document's origin; leave GET/HEAD navigations alone.
const { app, BrowserWindow, session } = require('electron');
const http = require('http'); const fs = require('fs'); const path = require('path');
const seen = []; const decisions = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FILE_ORIGIN = 'file://';
// The rule under test (design-spec D6, SR-003).
const shouldMarkForeign = (d, ownerUrl) => {
  if (d.url.startsWith('file:')) return false;
  const isNavigation = d.resourceType === 'mainFrame' || d.resourceType === 'subFrame';
  if (isNavigation && (d.method === 'GET' || d.method === 'HEAD')) return false;
  const origin = d.requestHeaders.Origin;
  if (d.frame?.origin === FILE_ORIGIN || origin === FILE_ORIGIN) return true;
  // A browser always sends Origin on a non-GET/HEAD request from a web page; only a file:// document omits it.
  return origin === undefined && d.method !== 'GET' && d.method !== 'HEAD';
};
const server = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => body += c); req.on('end', () => {
    seen.push({ kind: 'http', method: req.method, url: req.url, origin: req.headers.origin ?? '(none)' });
    res.setHeader('content-type', 'text/html'); res.end('<p>ok</p>');
  });
});
server.on('upgrade', (req, sock) => { seen.push({ kind: 'ws', url: req.url, origin: req.headers.origin ?? '(none)' }); sock.destroy(); });
const dir = process.argv[process.argv.length - 1];
server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port; const base = `http://127.0.0.1:${port}`; const ws = `ws://127.0.0.1:${port}`;
  await app.whenReady();
  const ses = session.fromPartition('probe-d6-revised');
  ses.webRequest.onBeforeSendHeaders((d, cb) => {
    const ownerUrl = d.webContents?.getURL() ?? '';
    const mark = shouldMarkForeign(d, ownerUrl);
    decisions.push({ url: d.url.replace(base, '').replace(ws, ''), resourceType: d.resourceType, method: d.method, frame: d.frame ? { url: d.frame.url, origin: d.frame.origin } : null, mark });
    if (mark) d.requestHeaders.Origin = 'null';
    cb({ requestHeaders: d.requestHeaders });
  });
  const trio = (w, tag) => `${w}.fetch('${base}/${tag}-fetch',{method:'POST',body:'x'}).catch(()=>{});
var x=new ${w}.XMLHttpRequest();x.open('POST','${base}/${tag}-xhr');x.send('x');
try{new ${w}.WebSocket('${ws}/${tag}-ws')}catch(e){}`;
  const page = path.join(dir, 'page.html');
  fs.writeFileSync(page, `<body><script>
${trio('window', 'top')}
const f=document.createElement('iframe'); document.body.append(f);
${trio('f.contentWindow', 'blank')}
const s=document.createElement('iframe'); s.srcdoc="<script>${trio('window', 'srcdoc').replace(/\n/g, ' ').replace(/'/g, "\\'")}<\\/script>".replace(/\\\\'/g,"'"); document.body.append(s);
const b=document.createElement('iframe'); b.src=URL.createObjectURL(new Blob(["<script>${trio('window', 'blobframe').replace(/\n/g, ' ')}<\\/script>"],{type:'text/html'})); document.body.append(b);
const wk=new Worker(URL.createObjectURL(new Blob(["fetch('${base}/worker-fetch',{method:'POST',body:'x'}).catch(()=>{});try{new WebSocket('${ws}/worker-ws')}catch(e){}"],{type:'text/javascript'})));
const p=window.open('about:blank'); if(p){ ${trio('p', 'popup')} }
const n=document.createElement('iframe'); n.src='${base}/subframe-nav-get'; document.body.append(n);
addEventListener('pagehide',()=>{navigator.sendBeacon('${base}/beacon-on-hide','x');fetch('${base}/keepalive-on-hide',{method:'POST',body:'x',keepalive:true});});
</script></body>`);
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, session: ses } });
  w.webContents.setWindowOpenHandler(() => ({ action: 'allow', overrideBrowserWindowOptions: { show: false, webPreferences: { session: ses, sandbox: true } } }));
  await w.loadFile(page); await wait(2500);
  // Form POST navigation from the file page.
  const formPage = path.join(dir, 'form.html');
  fs.writeFileSync(formPage, `<form id=f method=post action='${base}/form-post-nav'><input name=a value=1></form><script>document.getElementById('f').submit()</script>`);
  await w.loadFile(page); await wait(500);
  try { await w.loadFile(formPage); } catch (e) {}
  await wait(1500);
  // GET navigation from a file page (address bar / agent navigate).
  await w.loadFile(page); await wait(500);
  try { await w.loadURL(`${base}/address-bar-get-nav`); } catch (e) {}
  await wait(1500);
  try { await w.loadURL(`${base}/control-page`); } catch (e) {}
  await wait(2500);
  console.log(JSON.stringify({ electron: process.versions.electron, seen, decisions }, null, 1)); app.quit();
});
