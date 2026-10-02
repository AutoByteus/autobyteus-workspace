const http = require('node:http');
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html><head><title>API-E2E Browser Proof</title></head><body style="background:#e8f4ff;color:#123;font:24px sans-serif;padding:32px"><h1>Automatic attachment verified</h1><p id="marker">API-REV-001 local fixture</p><p id="path">' + req.url.replace(/[<>&"]/g, '') + '</p></body></html>');
});
server.listen(0, '127.0.0.1', () => console.log(JSON.stringify({ pid: process.pid, port: server.address().port })));
