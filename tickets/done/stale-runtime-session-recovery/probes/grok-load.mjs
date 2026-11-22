import { spawn } from "node:child_process";
const p = spawn(process.argv[3] ?? "grok", process.argv[4] ? process.argv[4].split(" ") : ["agent", "stdio"], { stdio: ["pipe", "pipe", "pipe"], cwd: process.argv[2] });
let buf = ""; const send = (o) => p.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...o }) + "\n");
p.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1);
  try { const m = JSON.parse(line); if (m.id !== undefined) { console.log("RESP", m.id, JSON.stringify(m).slice(0, 700));
    if (m.id === 1) { const caps = m.result?.agentCapabilities ?? {}; console.log("caps", JSON.stringify(caps).slice(0,300));
      send({ id: 2, method: caps.sessionCapabilities?.resume ? "session/resume" : "session/load", params: { sessionId: "3f2c9e7a-1111-4222-8333-444455556666", cwd: process.argv[2], mcpServers: [] } }); }
    else if (m.id === 2) p.kill(); } } catch {} } });
p.stderr.on("data", (d) => process.stderr.write("ERR " + String(d).slice(0, 300)));
send({ id: 1, method: "initialize", params: { protocolVersion: 1, clientCapabilities: {} } });
setTimeout(() => { console.log("timeout"); p.kill(); }, 30000);
