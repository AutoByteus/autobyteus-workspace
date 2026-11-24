// Temporary API/E2E check (autobyteus-574 AC-005) against the running native-video-node stack: every file route answers
// Range/ETag/no-cache as required, bytes compared with the file on disk. Usage: node ac005.mjs <stack-info.json>
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const info = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const control = `http://127.0.0.1:${info.controlPort}`;
const fetchVia = async (path, params = {}) => (await fetch(`${control}/fetch?${new URLSearchParams({ path, ...params })}`)).json();
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');
const routes = { workspaceContent: [info.files.wide.url, info.files.wide.path], workspaceStatic: [info.staticWide, info.files.wide.path],
  nodeFiles: [info.files.outside.url, info.files.outside.path], mediaFiles: [info.files.media.url, info.files.media.path] };
const results = {};
for (const [name, [url, file]] of Object.entries(routes)) {
  const bytes = await fs.readFile(file);
  const size = bytes.length;
  const full = await fetchVia(url);
  const r = {};
  r.full = { status: full.status, ok: full.status === 200 && full.length === size && full.sha256 === sha(bytes) && full.headers['accept-ranges'] === 'bytes' && Boolean(full.headers.etag), headers: full.headers };
  const cases = [['bytes=100-199', 100, 200], ['bytes=1000-', 1000, size], [`bytes=-500`, size - 500, size]];
  for (const [range, from, to] of cases) {
    const got = await fetchVia(url, { range });
    r[range] = { status: got.status, contentRange: got.headers['content-range'], ok: got.status === 206 && got.length === to - from && got.sha256 === sha(bytes.subarray(from, to))
      && got.headers['content-range'] === `bytes ${from}-${to - 1}/${size}` && Boolean(got.headers.etag) };
  }
  const bad = await fetchVia(url, { range: `bytes=${size + 10}-${size + 20}` });
  r.unsatisfiable = { status: bad.status, contentRange: bad.headers['content-range'], ok: bad.status === 416 };
  const notModified = await fetchVia(url, { ifNoneMatch: full.headers.etag });
  r.ifNoneMatch = { status: notModified.status, ok: notModified.status === 304 };
  const multi = await fetchVia(url, { range: 'bytes=0-1,5-6' });
  r.multiRange = { status: multi.status, ok: multi.status === 200 && multi.length === size };
  const anonymous = await fetchVia(url, { as: 'none' });
  r.noCredential = { status: anonymous.status, ok: anonymous.status === 401 };
  r.cacheControl = full.headers['cache-control'];
  r.ok = Object.values(r).every((value) => typeof value !== 'object' || value === null || value.ok !== false);
  results[name] = r;
}
console.log(JSON.stringify(results, null, 1));
console.log(`AC005 ${Object.values(results).every((r) => r.ok) ? 'PASS' : 'FAIL'}`);
