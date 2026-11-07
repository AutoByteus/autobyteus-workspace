import http from "node:http";
import fs from "node:fs";
const log = (kind, req) => fs.appendFileSync("/tmp/ws-origin-probe/log.txt", JSON.stringify({kind, url: req.url, method: req.method, origin: req.headers.origin ?? "<absent>", host: req.headers.host, secFetchSite: req.headers["sec-fetch-site"]})+"\n");
const srv = http.createServer((req, res) => { log("http", req); res.writeHead(200, {"access-control-allow-origin": req.headers.origin || "*", "access-control-allow-headers": "content-type", "content-type":"text/plain"}); res.end("ok"); });
srv.on("upgrade", (req, socket) => { log("upgrade", req); socket.end("HTTP/1.1 403 Forbidden\r\n\r\n"); });
srv.listen(47911, "127.0.0.1", () => console.log("listening"));
