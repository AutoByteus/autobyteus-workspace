import { spawn } from "node:child_process";
import readline from "node:readline";
const child = spawn("/tmp/grok-api-e2e/noauth/grok", ["agent", "--no-leader", "--model", "grok-4.7", "stdio"], { stdio: ["pipe", "pipe", "pipe"], cwd: "/tmp/grok-api-e2e/noauth" });
let stderr = "";
child.stderr.on("data", (c) => { stderr += c; });
const pending = new Map();
let id = 0;
const send = (method, params) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n"); });
readline.createInterface({ input: child.stdout }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.id !== undefined && pending.has(m.id) && !m.method) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) console.log("NOTIFY", m.method, JSON.stringify(m.params).slice(0, 200));
});
child.on("exit", (code, sig) => { console.log("EXIT", code, sig, "stderr:", stderr.slice(0, 600)); process.exit(0); });
setTimeout(() => { console.log("TIMEOUT; stderr:", stderr.slice(0, 600)); child.kill(); }, 60000);
const init = await send("initialize", { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
console.log("INIT", JSON.stringify(init).slice(0, 700));
const sn = await send("session/new", { cwd: "/tmp/grok-api-e2e/noauth", mcpServers: [] });
console.log("SESSION_NEW", JSON.stringify(sn).slice(0, 700));
if (sn.result?.sessionId) {
  const pr = await send("session/prompt", { sessionId: sn.result.sessionId, prompt: [{ type: "text", text: "Reply OK." }] });
  console.log("PROMPT", JSON.stringify(pr).slice(0, 700));
}
child.stdin.end(); setTimeout(() => child.kill(), 2000);
