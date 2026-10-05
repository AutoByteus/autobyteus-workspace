import fs from "node:fs";
const skip = /delta|tokenUsage|rateLimits|account\/|mcpServer|skills\/|codex\/event\/(agent_message_delta|reasoning|token_count|exec_command_output)/i;
for (const l of fs.readFileSync(process.argv[2], "utf8").trim().split("\n")) { const { label, dt, data } = JSON.parse(l);
  if (label === "NOTE") { const m = data.method; if (skip.test(m)) continue; const p = data.params || {}; const item = p.item ? ` item.type=${p.item.type} item.id=${p.item.id}` : ""; const extra = m === "turn/completed" ? ` status=${p.turn?.status} err=${JSON.stringify(p.turn?.error ?? null).slice(0, 200)}` : m.includes("compact") ? " " + JSON.stringify(p).slice(0, 400) : (m === "rawResponseItem/completed" ? ` raw.type=${p.item?.type}` : ""); console.log(dt, "NOTE", m, `turn=${p.turnId ?? p.turn?.id ?? ""}`, item, extra); continue; }
  if (label === "RES") { console.log(dt, "RES", data.method, JSON.stringify(data.result ?? data.error).slice(0, 200)); continue; }
  console.log(dt, label, JSON.stringify(data).slice(0, 250)); }
