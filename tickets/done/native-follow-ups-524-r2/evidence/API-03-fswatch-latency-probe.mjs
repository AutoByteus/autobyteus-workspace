// API-03 probe (autobyteus-524 round 2, API/E2E): ms from writing a file in a freshly watched temp folder (fs.watch recursive,
// macOS FSEvents) to its first 'change' event; null = none within 15 s. Five tries.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const out = [];
for (let i = 0; i < 5; i++) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fswatch-latency-'));
  out.push(await new Promise((resolve) => {
    const w = fs.watch(dir, { recursive: true }); const t0 = Date.now();
    const timer = setTimeout(() => { w.close(); resolve(null); }, 15000);
    w.once('change', () => { clearTimeout(timer); w.close(); resolve(Date.now() - t0); });
    setTimeout(() => fs.writeFileSync(path.join(dir, 'f.txt'), 'x'), 50);
  }));
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ latenciesMs: out }));
