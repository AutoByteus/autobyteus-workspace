// API-E02 temporary diagnostic: where does a sandbox-shaped node write a new run's memory? (value-free)
import { execFile } from "node:child_process";
import net from "node:net";
const image = process.argv[2];
const sh = (cmd, args) => new Promise((r) => execFile(cmd, args, (e, out) => r({ code: e ? 1 : 0, out: String(out) })));
const SETUP = 'const s=require("net").createConnection(process.argv[1],()=>s.write("setup-code\\n"));s.setTimeout(5000,()=>process.exit(1));let d="";s.setEncoding("utf8");s.on("data",(c)=>{d+=c});s.on("end",()=>{let r={};try{r=JSON.parse(d)}catch{}if(!r.setupCode)process.exit(1);process.stdout.write(r.setupCode)});s.on("error",()=>process.exit(1))';
const port = await new Promise((res) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const name = `api581-memdir-${process.pid}`;
await sh("docker", ["run", "-d", "--rm", "--name", name, "-p", `127.0.0.1:${port}:8000`, "-e", "AUTOBYTEUS_MEMORY_DIR=/home/autobyteus/run-memory",
  "-e", "AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace", "--tmpfs", "/home/autobyteus/run-memory", "--tmpfs", "/home/autobyteus/workspace", image]);
try {
  let code = "";
  for (let i = 0; i < 90 && !code; i += 1) { const r = await sh("docker", ["exec", name, "node", "-e", SETUP, "/home/autobyteus/data/node-access/local-control.sock"]); if (r.code === 0) code = r.out.trim(); else await new Promise((x) => setTimeout(x, 1000)); }
  let cred = null;
  for (let i = 0; i < 20 && !cred; i += 1) { try { cred = (await (await fetch(`http://127.0.0.1:${port}/rest/node-access/setup-exchanges`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ setupCode: code, desktopName: "diag" }) })).json()).credential; } catch { await new Promise((x) => setTimeout(x, 500)); } }
  const gql = async (q, v = {}) => (await (await fetch(`http://127.0.0.1:${port}/graphql`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${cred}` }, body: JSON.stringify({ query: q, variables: v }) })).json());
  const def = (await gql("mutation($i: CreateAgentDefinitionInput!) { createAgentDefinition(input: $i) { id } }", { i: { name: "memdir", role: "a", description: "d", instructions: "i", category: "test", toolNames: [], skillNames: [] } })).data.createAgentDefinition.id;
  const run = (await gql("mutation($i: CreateAgentRunInput!) { createAgentRun(input: $i) { success message runId } }", { i: { agentDefinitionId: def, workspaceRootPath: "/home/autobyteus/workspace", llmModelIdentifier: "claude-haiku-5-5", autoExecuteTools: false, runtimeKind: "autobyteus", llmConfig: null } })).data.createAgentRun;
  console.log("run created:", run.success, run.success ? "" : run.message.slice(0, 120));
  await new Promise((x) => setTimeout(x, 2000));
  console.log("container env AUTOBYTEUS_MEMORY_DIR:", (await sh("docker", ["exec", name, "sh", "-c", "echo $AUTOBYTEUS_MEMORY_DIR"])).out.trim());
  console.log("server process AUTOBYTEUS_MEMORY_DIR:", (await sh("docker", ["exec", name, "sh", "-c", "for p in $(pgrep -f dist/app.js); do tr '\\0' '\\n' < /proc/$p/environ | grep '^AUTOBYTEUS_MEMORY_DIR=' ; done | sort -u"])).out.trim() || "(not in its environment)");
  console.log("run_metadata.json under /home/autobyteus/run-memory:", (await sh("docker", ["exec", name, "sh", "-c", "find /home/autobyteus/run-memory -name run_metadata.json | wc -l"])).out.trim());
  console.log("run_metadata.json under /home/autobyteus/data/memory:", (await sh("docker", ["exec", name, "sh", "-c", "find /home/autobyteus/data/memory -name run_metadata.json | sed 's#/[^/]*/run_metadata.json##' | sort -u"])).out.trim());
} finally { await sh("docker", ["rm", "-f", "-v", name]); }
