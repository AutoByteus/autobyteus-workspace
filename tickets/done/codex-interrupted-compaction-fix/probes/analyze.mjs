import fs from "node:fs"; import path from "node:path";
const root = path.join(process.env.HOME, ".autobyteus/server-data/memory");
const files = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name === "agy-project" || e.name === "work_traces") continue; walk(p); } else if (/^raw_traces(_\d+|_active)?\.jsonl$/.test(e.name)) files.push(p); } };
walk(root);
const runs = new Map();
for (const f of files) { const txt = fs.readFileSync(f, "utf8"); if (!txt.includes("codex.")) continue;
  const dir = path.dirname(f); const run = runs.get(dir) ?? { markers: [], files: new Set() }; runs.set(dir, run); run.files.add(path.basename(f));
  for (const line of txt.split("\n")) { if (!line.includes("provider_compaction_boundary")) continue; let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.trace_type !== "provider_compaction_boundary") continue; const t = r.tool_result || {}; if (t.provider !== "codex") continue;
    run.markers.push({ file: path.basename(f), id: r.id, ts: r.ts, turn: r.turn_id, surface: t.source_surface, key: t.boundary_key, ev: t.provider_event_id, status: t.status, rot: t.rotation_eligible, trigger: t.trigger }); } }
let started = 0, completed = 0, otherSurf = {}, unmatched = [], runsWithArch = 0, totalArch = 0, rotMarkers = 0; const perRun = [];
for (const [dir, run] of runs) { const arch = [...run.files].filter(n => /_\d+\.jsonl$/.test(n)).length; totalArch += arch; if (arch) runsWithArch++;
  const byEv = new Map(); for (const m of run.markers) { otherSurf[m.surface] = (otherSurf[m.surface] || 0) + 1; if (m.rot) rotMarkers++;
    const k = m.ev ?? m.key; const e = byEv.get(k) ?? []; e.push(m); byEv.set(k, e); }
  let s = 0, c = 0, u = 0; for (const [k, ms] of byEv) { const hasS = ms.some(m => m.surface === "codex.context_compaction_started"); const hasC = ms.some(m => m.rot);
    if (hasS) s++; if (hasC) c++; if (hasS && !hasC) { u++; unmatched.push({ dir: path.relative(root, dir), ev: k, ms }); } }
  started += s; completed += c; perRun.push({ dir: path.relative(root, dir), markers: run.markers.length, ops: byEv.size, s, c, u, arch, rot: run.markers.filter(m => m.rot).length }); }
console.log({ runs: runs.size, runsWithArch, totalArch, rotMarkers, startedOps: started, completedOps: completed, unmatchedStarted: unmatched.length, surfaces: otherSurf });
const mism = perRun.filter(r => r.rot !== r.arch);
console.log("runs where rotation markers != archive files:", mism.length); console.log(mism.slice(0, 10));
fs.writeFileSync("/tmp/codex-probe/unmatched.json", JSON.stringify(unmatched, null, 1));
console.log("unmatched sample:"); for (const u of unmatched.slice(0, 6)) console.log(u.dir, u.ev, u.ms.map(m => `${m.file}|${m.surface}|${new Date(m.ts*1000).toISOString()}`).join(" ; "));
