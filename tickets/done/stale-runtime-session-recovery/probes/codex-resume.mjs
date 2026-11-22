import { spawn } from "node:child_process";
const p = spawn("codex", ["app-server"], { stdio: ["pipe", "pipe", "pipe"], cwd: process.argv[2] });
let buf = ""; const send = (o) => p.stdin.write(JSON.stringify(o) + "\n");
p.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1);
  try { const m = JSON.parse(line); if (m.id !== undefined) { console.log("RESP", m.id, JSON.stringify(m).slice(0, 600)); if (m.id === 1) { send({ method: "initialized" }); send({ id: 2, method: "thread/resume", params: { threadId: "019a0000-1111-7222-8333-444455556666", cwd: process.argv[2] } }); } if (m.id === 2) p.kill(); } } catch {} } });
p.stderr.on("data", (d) => process.stderr.write("ERR " + String(d).slice(0, 300)));
send({ id: 1, method: "initialize", params: { clientInfo: { name: "probe599", version: "0" } } });
setTimeout(() => { console.log("timeout"); p.kill(); }, 30000);
