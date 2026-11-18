// R-4 probe (autobyteus-311): does a thread-level Codex `config` replace or merge with the user's own
// `shell_environment_policy` / `sandbox_workspace_write` tables? Real installed `codex app-server`, a private temp
// CODEX_HOME and HOME, and a loopback fake Responses provider that asks for one `exec_command` per thread and reads
// its output from the next request. No login, no inference, no personal config, dummy values only.
// Run: node r4-codex-thread-config-merge.mjs
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os";
import { spawn, spawnSync } from "node:child_process"; import { gunzipSync } from "node:zlib";

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "r4-codex-merge-")));
const codexHome = path.join(root, "codex"), cwd = path.join(root, "ws"), extraRoot = path.join(root, "extra");
for (const dir of [codexHome, cwd, extraRoot]) fs.mkdirSync(dir);

const commands = new Map(); // threadId -> cmd
const outputs = new Map();  // threadId -> output text
let nextCmd = null;
const sse = (events) => events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
const completed = (id) => ({ type: "response.completed", response: { id, usage: { input_tokens: 1, input_tokens_details: null, output_tokens: 1, output_tokens_details: null, total_tokens: 2 } } });
let responses = 0;
const server = http.createServer(async (req, res) => {
  if (req.url === "/ping") { res.writeHead(200); return res.end("pong"); }
  const chunks = []; for await (const c of req) chunks.push(c);
  let body = Buffer.concat(chunks); if (req.headers["content-encoding"] === "gzip") body = gunzipSync(body);
  const request = JSON.parse(body.toString());
  const id = `resp_${++responses}`;
  const callOutput = (request.input ?? []).find((item) => item.type === "function_call_output");
  res.writeHead(200, { "content-type": "text/event-stream" });
  if (callOutput) {
    const text = typeof callOutput.output === "string" ? callOutput.output : JSON.stringify(callOutput.output);
    outputs.set(callOutput.call_id, text);
    return res.end(sse([{ type: "response.created", response: { id } },
      { type: "response.output_item.done", item: { type: "message", role: "assistant", id: `msg_${id}`, content: [{ type: "output_text", text: "done" }] } },
      completed(id)]));
  }
  const callId = `call_${responses}`;
  commands.set(callId, nextCmd);
  res.end(sse([{ type: "response.created", response: { id } },
    { type: "response.output_item.done", item: { type: "function_call", name: "exec_command", call_id: callId,
      arguments: JSON.stringify({ cmd: nextCmd, login: false, tty: false, yield_time_ms: 5000 }) } },
    completed(id)]));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

fs.writeFileSync(path.join(codexHome, "config.toml"), `model = "gpt-probe"
model_provider = "local_probe"
approval_policy = "never"
web_search = "disabled"
[model_providers.local_probe]
name = "R-4 probe"
base_url = "${origin}/v1"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false
[features]
enable_request_compression = false
apps = false
plugins = false
hooks = false
[analytics]
enabled = false
[feedback]
enabled = false
[shell_environment_policy]
inherit = "core"
set = { USER_OWN_VAR = "from-user-config" }
[sandbox_workspace_write]
writable_roots = ["${extraRoot}"]
`);

const version = spawnSync("codex", ["--version"], { encoding: "utf8" }).stdout.trim();
const child = spawn("codex", ["app-server"], { cwd, stdio: ["pipe", "pipe", "pipe"], env: {
  PATH: process.env.PATH, HOME: root, CODEX_HOME: codexHome, TMPDIR: root, LANG: "en_US.UTF-8",
  SERVER_ONLY_VAR: "inherited-from-app-server" } });
child.stderr.resume();
let buf = ""; const pending = new Map(); let rpcId = 0; const listeners = new Set();
child.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1);
  if (!line.trim()) continue; const m = JSON.parse(line);
  if (m.id !== undefined && pending.has(m.id) && !m.method) { pending.get(m.id)(m); pending.delete(m.id); }
  else for (const l of listeners) l(m); } });
const request = (method, params) => new Promise((resolve, reject) => { const i = ++rpcId;
  pending.set(i, (m) => (m.error ? reject(new Error(`${method}: ${JSON.stringify(m.error)}`)) : resolve(m.result)));
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n"); });
await request("initialize", { clientInfo: { name: "r4-probe", version: "0" }, capabilities: { experimentalApi: true } });
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "initialized", params: {} }) + "\n");

const envCmd = `printf 'USER_OWN_VAR=%s THREAD_VAR=%s SERVER_ONLY_VAR=%s' "\${USER_OWN_VAR:-<unset>}" "\${THREAD_VAR:-<unset>}" "\${SERVER_ONLY_VAR:-<unset>}"`;
const sandboxCmd = (label) => `touch ${extraRoot}/${label} 2>/dev/null && printf 'WRITABLE_ROOT=kept ' || printf 'WRITABLE_ROOT=lost '; ` +
  `curl -s -m 3 ${origin}/ping >/dev/null 2>&1 && printf 'LOOPBACK=reachable' || printf 'LOOPBACK=blocked'`;
const cases = [
  ["E1 env, no thread config (baseline)", "danger-full-access", undefined, envCmd],
  ["E2 env, nested {shell_environment_policy:{set:{...}}}", "danger-full-access", { shell_environment_policy: { set: { THREAD_VAR: "from-thread-config" } } }, envCmd],
  ["E3 env, dotted shell_environment_policy.set.THREAD_VAR", "danger-full-access", { "shell_environment_policy.set.THREAD_VAR": "from-thread-config" }, envCmd],
  ["S1 workspace-write, no thread config (baseline)", "workspace-write", undefined, sandboxCmd("s1")],
  ["S2 workspace-write, nested {sandbox_workspace_write:{network_access:true}}", "workspace-write", { sandbox_workspace_write: { network_access: true } }, sandboxCmd("s2")],
  ["S3 workspace-write, dotted sandbox_workspace_write.network_access", "workspace-write", { "sandbox_workspace_write.network_access": true }, sandboxCmd("s3")],
];
const results = [];
for (const [label, sandbox, config, cmd] of cases) {
  nextCmd = cmd;
  const thread = await request("thread/start", { cwd, model: "gpt-probe", approvalPolicy: "never", sandbox, ephemeral: true, ...(config ? { config } : {}) });
  const threadId = thread.thread.id;
  const done = new Promise((resolve) => { const l = (m) => { if (m.method === "turn/completed" && m.params.threadId === threadId) { listeners.delete(l); resolve(m.params.turn.status); } }; listeners.add(l); });
  const before = new Set(outputs.keys());
  await request("turn/start", { threadId, input: [{ type: "text", text: "run it" }] });
  const status = await Promise.race([done, new Promise((r) => setTimeout(() => r("timeout"), 60000))]);
  const callId = [...outputs.keys()].find((k) => !before.has(k));
  const raw = callId ? outputs.get(callId) : "<no output>";
  const observed = (raw.match(/(USER_OWN_VAR|THREAD_VAR|SERVER_ONLY_VAR|WRITABLE_ROOT|LOOPBACK)=\S+/g) ?? []).join(" ");
  results.push({ case: label, sandbox, threadConfig: config ?? null, turn: status, observed });
}
child.kill(); server.close(); fs.rmSync(root, { recursive: true, force: true });
console.log(JSON.stringify({ codex: version, userConfig: { shell_environment_policy: { inherit: "core", set: { USER_OWN_VAR: "from-user-config" } },
  sandbox_workspace_write: { writable_roots: ["<temp>/extra"] } }, results }, null, 2));
