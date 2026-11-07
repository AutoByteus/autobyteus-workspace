// Stand-in for the node: serves a workspace "static" folder and logs the Origin of every
// HTTP request and WebSocket upgrade. Loopback only. Usage: node server.mjs <port> <logFile>
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 47921);
// With PROBE_CSP_SANDBOX=1 every static response carries the header the design adds to the route.
const cspSandbox = process.env.PROBE_CSP_SANDBOX === "1";
const logFile = process.argv[3] || path.join(here, "server-log.txt");
fs.writeFileSync(logFile, "");
const log = (line) => fs.appendFileSync(logFile, line + "\n");

const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };
const server = http.createServer((req, res) => {
  log(`HTTP ${req.method} ${req.url} origin=${req.headers.origin ?? "<absent>"}`);
  const prefix = "/rest/workspaces/ws-1/static/";
  if (req.url.startsWith(prefix)) {
    const file = path.join(here, "workspace", decodeURIComponent(req.url.slice(prefix.length).split("?")[0]));
    if (fs.existsSync(file)) {
      const headers = { "content-type": types[path.extname(file)] || "application/octet-stream" };
      if (cspSandbox) headers["content-security-policy"] = "sandbox allow-scripts";
      res.writeHead(200, headers);
      return fs.createReadStream(file).pipe(res);
    }
  }
  res.writeHead(404).end();
});
server.on("upgrade", (req, socket) => {
  log(`WS ${req.url} origin=${req.headers.origin ?? "<absent>"}`);
  socket.destroy();
});
server.listen(port, "127.0.0.1", () => log(`listening ${port}`));
