// API-03 probe: how long the synchronous fs.watch(recursive) start and close calls block the Node main thread,
// and the longest event-loop stall seen meanwhile (setInterval drift).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
let maxStall = 0, last = Date.now();
const iv = setInterval(() => { const now = Date.now(); maxStall = Math.max(maxStall, now - last - 10); last = now; }, 10);
const rows = [];
for (let i = 0; i < 6; i++) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fswatch-block-'));
  let t = Date.now(); const w = fs.watch(dir, { recursive: true }); const startMs = Date.now() - t;
  await new Promise((r) => setTimeout(r, 200));
  t = Date.now(); w.close(); const closeMs = Date.now() - t;
  rows.push({ startMs, closeMs }); fs.rmSync(dir, { recursive: true, force: true });
  await new Promise((r) => setTimeout(r, 100));
}
clearInterval(iv);
console.log(JSON.stringify({ rows, maxEventLoopStallMs: maxStall }));
