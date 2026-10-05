import fs from "node:fs"; import path from "node:path";
const root = path.join(process.env.HOME, ".autobyteus/server-data/memory");
const un = JSON.parse(fs.readFileSync("/tmp/codex-probe/unmatched.json", "utf8"));
const rows = [];
for (const u of un) { const dir = path.join(root, u.dir); const m = u.ms[0];
  const files = fs.readdirSync(dir).filter(n => /^raw_traces/.test(n)).sort((a,b)=> (a==="raw_traces_active.jsonl")-(b==="raw_traces_active.jsonl") || a.localeCompare(b));
  const all = []; for (const f of files) for (const l of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) { if (!l.trim()) continue; try { const r = JSON.parse(l); r.__f = f; all.push(r); } catch {} }
  const i = all.findIndex(r => r.id === m.id);
  const after = all.slice(i + 1, i + 6).map(r => `${r.trace_type}${r.tool_result?.source_surface ? ":" + r.tool_result.source_surface : ""}${r.trace_type==="tool_result" && r.tool_error ? "(err)" : ""}@+${Math.round((r.ts - m.ts))}s`);
  const sameTurnAfter = all.slice(i + 1).filter(r => r.turn_id === m.turn).length;
  const nextTurn = all.slice(i + 1).find(r => r.turn_id !== m.turn);
  const lastInTurn = all.slice(0, i + 1 + sameTurnAfter).filter(r=>r.turn_id===m.turn).pop();
  rows.push({ run: u.dir.split("/").slice(-1)[0].slice(0, 40), when: new Date(m.ts * 1000).toISOString().slice(0, 16), file: m.file, posFromEnd: all.length - 1 - i, sameTurnAfter, nextTurnGapMin: nextTurn ? Math.round((nextTurn.ts - m.ts) / 60) : null, nextTurnFirst: nextTurn ? nextTurn.trace_type : null, after: after.join(", ") });
}
for (const r of rows) console.log(JSON.stringify(r));
