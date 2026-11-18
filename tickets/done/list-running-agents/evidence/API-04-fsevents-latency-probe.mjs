import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fsev-")); const results = [];
for (let i = 0; i < 3; i++) {
  const w = fs.watch(dir, { recursive: true });
  const t0 = Date.now(); let ev = null;
  const p = new Promise((r) => { w.on("change", () => { if (ev === null) { ev = Date.now() - t0; r(); } }); setTimeout(r, 20000); });
  fs.writeFileSync(path.join(dir, `f${i}.txt`), "x"); await p;
  const c0 = Date.now(); w.close(); results.push({ eventMs: ev, closeMs: Date.now() - c0 });
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(JSON.stringify({ at: new Date().toISOString(), results }));
