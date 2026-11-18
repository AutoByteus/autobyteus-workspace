// SR-003 control for the revised D6 rule: an http page's requests keep their Origin. Usage: env -u ELECTRON_RUN_AS_NODE <Electron 42.11.16 binary> <this file>
// Control: requests from a normal http page in the same session must keep their own Origin (rule must not touch them).
const { app, BrowserWindow, session } = require('electron');
const http = require('http');
const seen = []; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FILE_ORIGIN = 'file://';
const shouldMarkForeign = (d) => {
  if (d.url.startsWith('file:')) return false;
  const isNavigation = d.resourceType === 'mainFrame' || d.resourceType === 'subFrame';
  if (isNavigation && (d.method === 'GET' || d.method === 'HEAD')) return false;
  const origin = d.requestHeaders.Origin;
  if (d.frame?.origin === FILE_ORIGIN || origin === FILE_ORIGIN) return true;
  return origin === undefined && d.method !== 'GET' && d.method !== 'HEAD';
};
const page = `<body><form id=f method=post action='/control-form-nav'><input name=a value=1></form><script>
fetch('/control-fetch',{method:'POST',body:'x'});var x=new XMLHttpRequest();x.open('POST','/control-xhr');x.send('x');
fetch('/control-get');try{new WebSocket('ws://'+location.host+'/control-ws')}catch(e){}navigator.sendBeacon('/control-beacon','x');
fetch('http://localhost:'+location.port+'/control-crossorigin-post',{method:'POST',body:'x'}).catch(()=>{});
setTimeout(()=>document.getElementById('f').submit(),800)</script></body>`;
const server = http.createServer((req, res) => { req.resume(); req.on('end', () => {
  seen.push({ method: req.method, url: req.url, origin: req.headers.origin ?? '(none)' });
  res.setHeader('content-type', 'text/html'); res.end(req.url === '/control-page' ? page : 'ok'); }); });
server.on('upgrade', (req, sock) => { seen.push({ method: 'WS', url: req.url, origin: req.headers.origin ?? '(none)' }); sock.destroy(); });
server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  await app.whenReady();
  const ses = session.fromPartition('probe-d6-control');
  const marked = [];
  ses.webRequest.onBeforeSendHeaders((d, cb) => { if (shouldMarkForeign(d)) { marked.push(d.url); d.requestHeaders.Origin = 'null'; } cb({ requestHeaders: d.requestHeaders }); });
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, session: ses } });
  await w.loadURL(`${base}/control-page`); await wait(2500);
  console.log(JSON.stringify({ seen, marked }));
  app.quit();
});
