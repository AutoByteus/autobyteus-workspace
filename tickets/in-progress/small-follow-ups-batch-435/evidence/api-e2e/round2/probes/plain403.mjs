// autobyteus-435 API/E2E API-13: something that is not a node answers 403 without a refusal code (plain text).
import http from 'node:http';
http.createServer((req, res) => { res.writeHead(403, { 'content-type': 'text/plain' }); res.end('Forbidden'); }).listen(Number(process.argv[2]), '127.0.0.1');
