// Stand-in for the credential proxy: accepts only the run pass, swaps in the upstream key, streams the reply back.
// Usage: node pass-forwarder.mjs <listenPort> <upstreamOrigin> <log.jsonl>   (PASS and UPSTREAM_KEY from env; both fake)
import http from "node:http";
import fs from "node:fs";
const [port, upstream, logPath] = process.argv.slice(2);
const { PASS, UPSTREAM_KEY } = process.env;
http.createServer((req, res) => {
  const passOk = req.headers["x-api-key"] === PASS;
  fs.appendFileSync(logPath, JSON.stringify({ url: req.url, passOk }) + "\n");
  if (!passOk) { res.writeHead(401, { "content-type": "application/json" }); res.end('{"type":"error","error":{"type":"authentication_error","message":"invalid run pass"}}'); return; }
  const headers = { ...req.headers, "x-api-key": UPSTREAM_KEY };
  delete headers.host;
  const up = http.request(new URL(req.url, upstream), { method: req.method, headers }, (upRes) => {
    res.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(res);
  });
  req.pipe(up);
}).listen(Number(port), "127.0.0.1");
