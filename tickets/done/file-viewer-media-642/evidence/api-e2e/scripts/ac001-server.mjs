// Temporary (autobyteus-642 API/E2E, AC-001 server leg): a message reference's route on the real node, through the stack's
// /fetch (owner credential, unthrottled): 200/206/416/304/multi-range/401, exact bytes, ETag, Accept-Ranges, no-store; the
// deleted reference and the empty one.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const info = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const control = `http://127.0.0.1:${info.controlPort}`;
const get = async (url, extra = {}) => (await fetch(`${control}/fetch?${new URLSearchParams({ path: url, ...extra })}`)).json();
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');
const out = {};
for (const [name, ref] of Object.entries(info.team.references)) {
  if (!ref.url) { out[name] = { error: 'no url' }; continue; }
  if (name === 'gone' || name === 'empty') {
    out[name] = { plain: await get(ref.url), probe: await get(ref.url, { range: 'bytes=0-0' }), noCredential: (await get(ref.url, { as: 'none' })).status };
    continue;
  }
  const bytes = fs.readFileSync(ref.path);
  const plain = await get(ref.url);
  const cases = { a_b: ['bytes=100-199', bytes.subarray(100, 200)], from: ['bytes=1000-', bytes.subarray(1000)], suffix: ['bytes=-500', bytes.subarray(bytes.length - 500)] };
  const ranges = {};
  for (const [key, [range, expected]] of Object.entries(cases)) {
    const r = await get(ref.url, { range });
    ranges[key] = { status: r.status, contentRange: r.headers['content-range'], exact: r.sha256 === sha(expected) && r.length === expected.length };
  }
  const outside = await get(ref.url, { range: `bytes=${bytes.length + 10}-` });
  const notModified = await get(ref.url, { ifNoneMatch: plain.headers.etag });
  const multi = await get(ref.url, { range: 'bytes=0-9,20-29' });
  const none = await get(ref.url, { as: 'none' });
  out[name] = { size: bytes.length, plain: { status: plain.status, exact: plain.sha256 === sha(bytes), etag: plain.headers.etag, acceptRanges: plain.headers['accept-ranges'], cacheControl: plain.headers['cache-control'], contentType: plain.headers['content-type'] },
    ranges, outside: { status: outside.status, contentRange: outside.headers['content-range'] }, notModified: notModified.status, multi: { status: multi.status, whole: multi.length === bytes.length }, noCredential: none.status };
}
console.log(JSON.stringify(out, null, 1));
