import { spawn } from "node:child_process";
import readline from "node:readline";
const t0 = Date.now();
const p = spawn("/Users/normy/.grok/bin/grok", ["agent", "--no-leader", "stdio"], { cwd: "/tmp/routing-probes", stdio: ["pipe", "pipe", "ignore"] });
const rl = readline.createInterface({ input: p.stdout });
const pending = new Map(); let id = 0;
rl.on("line", (line) => { let m; try { m = JSON.parse(line); } catch { return; } if (m.id != null && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const req = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n"); setTimeout(() => { if (pending.has(i)) { pending.delete(i); res({ timeout: true }); } }, 20000); });
const init = await req("initialize", { protocolVersion: 1, clientCapabilities: {} });
console.log("init ms", Date.now() - t0, init.error ? JSON.stringify(init.error) : "ok");
for (const m of ["_x.ai/billing"]) {
  const r = await req(m, {});
  console.log("==", m, "ms", Date.now() - t0);
  console.log(JSON.stringify(r.result ?? r.error ?? r, null, 1).replace(/"(email|userId|user_id|teamId|team_id|accountId)":\s*"[^"]*"/g, '"$1":"<redacted>"').slice(0, 1500));
}
p.kill(); process.exit(0);
