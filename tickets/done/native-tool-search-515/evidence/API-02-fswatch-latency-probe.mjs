// API-02 probe: latency of fs.watch events for a file created in a fresh temp folder (macOS FSEvents path).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const out = [];
for (let i = 0; i < 5; i++) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fswatch-latency-'));
  const ms = await new Promise((resolve) => {
    const w = fs.watch(dir, { recursive: true }); const t0 = Date.now();
    const timer = setTimeout(() => { w.close(); resolve(null); }, 15000);
    w.once('change', () => { clearTimeout(timer); w.close(); resolve(Date.now() - t0); });
    setTimeout(() => fs.writeFileSync(path.join(dir, 'f.txt'), 'x'), 50);
  });
  out.push(ms); fs.rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ latenciesMs: out }));
