import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fswatch-probe-'));
const results = [];
for (let i = 0; i < 5; i++) {
  const file = path.join(dir, `f${i}.txt`);
  const ms = await new Promise((resolve) => {
    const start = Date.now();
    const w = fs.watch(dir, (ev, name) => { if (name === `f${i}.txt`) { w.close(); resolve(Date.now() - start); } });
    setTimeout(() => fs.writeFileSync(file, 'x'), 50);
    setTimeout(() => { w.close(); resolve('timeout>20000'); }, 20000);
  });
  results.push(ms);
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(JSON.stringify({ at: new Date().toISOString(), load: os.loadavg().map(n => n.toFixed(1)), fsWatchLatencyMs: results }));
