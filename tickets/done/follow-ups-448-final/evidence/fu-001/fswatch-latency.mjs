import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fswatch-latency-'));
const samples = [];
for (let i = 0; i < 8; i += 1) {
  const latency = await new Promise((resolve) => {
    const file = path.join(dir, `f-${i}.txt`);
    let start = 0;
    const watcher = fs.watch(dir, (_event, name) => { if (name === `f-${i}.txt`) { watcher.close(); clearTimeout(timer); resolve(Date.now() - start); } });
    const timer = setTimeout(() => { watcher.close(); resolve('timeout>20000'); }, 20000);
    setTimeout(() => { start = Date.now(); fs.writeFileSync(file, 'x'); }, 200);
  });
  samples.push(latency);
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(JSON.stringify({ fsWatchLatencyMs: samples, load: os.loadavg().map((v) => v.toFixed(1)) }));
