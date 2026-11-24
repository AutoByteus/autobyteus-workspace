// Temporary (574 r5): per-window request analysis of the stack's proxy log for one file.
// Usage: node req-analysis.mjs <controlPort> <file name> <window start ms> <window end ms|now> [<earlier window start> <earlier end>]
const [port, name, a, b, pa, pb] = process.argv.slice(2);
const log = await (await fetch(`http://127.0.0.1:${port}/log?since=0`)).json();
const end = b === 'now' ? Infinity : Number(b);
const rng = (e) => { const m = /bytes=(\d+)-/.exec(e.range ?? ''); const f = m ? Number(m[1]) : 0; return [f, f + e.bytes - 1]; };
const win = log.filter((e) => e.path.includes(name) && e.at >= Number(a) && e.at < end);
const data = win.filter((e) => e.bytes > 2);
const merge = (l) => { const s = [...l].sort((x, y) => x[0] - y[0]); const o = []; for (const r of s) { if (o.length && r[0] <= o.at(-1)[1] + 1) o.at(-1)[1] = Math.max(o.at(-1)[1], r[1]); else o.push([...r]); } return o; };
let dup = 0; const seen = [];
for (const e of data) { const [x, y] = rng(e); for (const [p, q] of seen) { const ov = Math.min(y, q) - Math.max(x, p) + 1; if (ov > 0) dup += ov; } seen.push([x, y]); }
let maxConc = 0; for (const e of data) { const c = data.filter((o) => o.at <= e.at && o.at + o.ms > e.at).length; maxConc = Math.max(maxConc, c); }
const out = { requests: win.length, dataRequests: data.length, bytes: data.reduce((t, e) => t + e.bytes, 0), aborted: data.filter((e) => e.aborted).length,
  statuses: [...new Set(win.map((e) => e.status))], headerOnly: win.every((e) => e.credential === 'phone' && !e.urlCredential), maxConcurrent: maxConc,
  bytesFetchedTwiceWithinWindow: dup, ranges: data.map((e) => `${e.range}:${e.bytes}${e.aborted ? ':aborted' : ''}`) };
if (pa) { const earlier = merge(log.filter((e) => e.path.includes(name) && e.at >= Number(pa) && e.at < Number(pb) && e.bytes > 2).map(rng)); let ov = 0; for (const [x, y] of data.map(rng)) for (const [p, q] of earlier) { const o = Math.min(y, q) - Math.max(x, p) + 1; if (o > 0) ov += o; } out.overlapWithEarlierWindow = ov; }
console.log(JSON.stringify(out, null, 1));
