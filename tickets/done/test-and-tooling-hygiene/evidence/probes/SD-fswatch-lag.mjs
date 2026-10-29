import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const N = 40;
const res = { a: [], utimes: [], utimesNever: 0, mkdirCanaryMs: [] };
for (let i = 0; i < N; i++) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lag-")));
  const dir = path.join(base, "d"); fs.mkdirSync(dir);
  // A: lag until a write is observed
  let seen = null; const t0 = performance.now();
  const w = fs.watch(dir, () => { if (seen === null) seen = performance.now() - t0; });
  let k = 0;
  while (seen === null && performance.now() - t0 < 2000) { fs.writeFileSync(path.join(dir, `f${k++}`), "x"); await sleep(2); }
  res.a.push(Math.round(seen ?? -1)); w.close();
  // B: utimes canary on the watched dir right after watch
  let got = null; const t1 = performance.now();
  const w2 = fs.watch(dir, () => { if (got === null) got = performance.now() - t1; });
  const tick = setInterval(() => { const n = new Date(); fs.utimesSync(dir, n, n); }, 5);
  const deadline = performance.now() + 2000;
  while (got === null && performance.now() < deadline) await sleep(2);
  clearInterval(tick); w2.close();
  if (got === null) res.utimesNever++; else res.utimes.push(Math.round(got));
  fs.rmSync(base, { recursive: true, force: true });
}
const s = (a) => { const b = a.filter((x) => x >= 0).sort((x, y) => x - y); return { n: b.length, p50: b[Math.floor(b.length / 2)], p90: b[Math.floor(b.length * 0.9)], max: b[b.length - 1] }; };
console.log("write-observed lag ms", JSON.stringify(s(res.a)));
console.log("utimes-canary lag ms", JSON.stringify(s(res.utimes)), "never", res.utimesNever);
