import fs from "node:fs";
for (const l of fs.readFileSync(process.argv[2], "utf8").trim().split("\n")) { const { label, dt, data } = JSON.parse(l);
  if (label === "NOTE") { const m = data.method; const u = data.params?.update; const k = u?.sessionUpdate ?? ""; if (k === "agent_message_chunk" || k === "agent_thought_chunk") { if (k === "agent_message_chunk") process.stdout.write(`${dt} chunk:${JSON.stringify(u.content?.text ?? "").slice(0,60)}\n`); continue; }
    console.log(dt, "NOTE", m, k, JSON.stringify(data.params ?? {}).slice(0, 380)); continue; }
  if (label === "RES") { console.log(dt, "RES", data.method, JSON.stringify(data.result ?? data.error).slice(0, 300)); continue; }
  console.log(dt, label, JSON.stringify(data).slice(0, 300)); }
