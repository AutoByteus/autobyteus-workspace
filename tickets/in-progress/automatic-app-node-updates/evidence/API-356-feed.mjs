// TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
// A local electron-updater generic feed for isolated desktop copies (--test-update-feed http://127.0.0.1:<port>).
// Serves latest-mac.yml / beta-mac.yml for the zip in <dir>, and the zip itself. The mode is read from <control>
// (JSON {"mode": ...}) on every request, so a run can change it between checks:
//   none    no newer version (the yml names the running version given as <current>)
//   good    the zip with its real sha512 and size
//   badsha  the same zip, but the yml carries a wrong sha512 (a broken package: the download fails verification)
// Every request is appended to <log> as one JSON line {at, method, url, status, bytes}.
// Usage: node API-356-feed.mjs <port> <dir with one .zip> <control.json> <log.jsonl> <current version> <new version>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [port, dir, control, logFile, current, next] = process.argv.slice(2);
const zipName = fs.readdirSync(dir).find((f) => f.endsWith('.zip'));
const zipPath = path.join(dir, zipName);
const zip = fs.readFileSync(zipPath);
const sha512 = crypto.createHash('sha512').update(zip).digest('base64');
const wrong = crypto.createHash('sha512').update('not the package').digest('base64');
const mode = () => { try { return JSON.parse(fs.readFileSync(control, 'utf8')).mode; } catch { return 'none'; } };
const log = (entry) => fs.appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
const yml = (m) => m === 'none'
  ? `version: ${current}\nfiles:\n  - url: ${zipName}\n    sha512: ${sha512}\n    size: ${zip.length}\npath: ${zipName}\nsha512: ${sha512}\nreleaseDate: '2026-11-01T00:00:00.000Z'\n`
  : `version: ${next}\nfiles:\n  - url: ${zipName}\n    sha512: ${m === 'badsha' ? wrong : sha512}\n    size: ${zip.length}\npath: ${zipName}\nsha512: ${m === 'badsha' ? wrong : sha512}\nreleaseDate: '2026-11-01T00:00:00.000Z'\n`;

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://feed');
  const m = mode();
  if (/^\/(latest|beta)-mac\.yml$/.test(url.pathname)) {
    const body = yml(m);
    res.writeHead(200, { 'content-type': 'text/yaml' }); res.end(body);
    return log({ method: req.method, url: req.url, status: 200, mode: m, bytes: body.length });
  }
  if (url.pathname === `/${zipName}`) {
    res.writeHead(200, { 'content-type': 'application/zip', 'content-length': zip.length });
    res.end(zip);
    return log({ method: req.method, url: req.url, status: 200, mode: m, bytes: zip.length });
  }
  res.writeHead(404); res.end('missing');
  log({ method: req.method, url: req.url, status: 404, mode: m });
}).listen(Number(port), '127.0.0.1', () => log({ event: 'listening', port: Number(port), zipName, size: zip.length, sha512 }));
