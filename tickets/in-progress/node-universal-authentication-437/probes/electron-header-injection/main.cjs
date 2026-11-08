// autobyteus-437 PROBE-03: does Electron's main process attach a header to every request a file:// window sends to a node
// (fetch, WebSocket upgrade, iframe and its subresources, <img>), and to none sent by another session partition?
const { app, BrowserWindow, session } = require("electron");
const http = require("node:http");
const path = require("node:path");
const seen = [];
const server = http.createServer((req, res) => {
  seen.push({ kind: "http", url: req.url, auth: req.headers["x-probe-key"] ?? null });
  if (req.url.startsWith("/frame")) { res.setHeader("content-type", "text/html"); res.end('<img src="/frame-sub.png">'); return; }
  res.setHeader("access-control-allow-origin", "*"); res.end("ok");
});
server.on("upgrade", (req, socket) => { seen.push({ kind: "ws-upgrade", url: req.url, auth: req.headers["x-probe-key"] ?? null }); socket.destroy(); });
server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  const node = `http://127.0.0.1:${port}`;
  await app.whenReady();
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: [`${node}/*`, `ws://127.0.0.1:${port}/*`] }, (details, cb) => {
    cb({ requestHeaders: { ...details.requestHeaders, "X-Probe-Key": "probe-key-1" } });
  });
  const win = new BrowserWindow({ show: false });
  await win.loadFile(path.join(__dirname, "page.html"), { query: { node } });
  const other = new BrowserWindow({ show: false, webPreferences: { partition: "persist:abx437-other" } });
  await other.loadURL(`${node}/other-partition-page`);
  setTimeout(() => { console.log(JSON.stringify(seen, null, 1)); app.exit(0); }, 3000);
});
