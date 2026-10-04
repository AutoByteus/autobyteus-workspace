import fs from "node:fs";
for (const l of fs.readFileSync(process.argv[2], "utf8").trim().split("\n")) { const { label, dt, data } = JSON.parse(l);
  if (label !== "OUT") { console.log(dt, label, JSON.stringify(data).slice(0, 300)); continue; }
  const e = data.event; const p = data.step_update || data.result || data.init || data;
  let s = JSON.stringify(p);
  if (e === "step_update" && p.step_type === "agent_response") s = `agent_response state=${p.state} idx=${p.step_index} delta=${JSON.stringify(p.text_delta ?? "").slice(0, 60)}`;
  console.log(dt, e, s.slice(0, 600)); }
