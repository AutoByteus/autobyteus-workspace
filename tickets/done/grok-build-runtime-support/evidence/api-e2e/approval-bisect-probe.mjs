// Temporary AC-004 bisect probe: does Grok send session/request_permission for a file-writing shell command?
import { spawn } from "node:child_process";
import fs from "node:fs";
import readline from "node:readline";
const cfg = JSON.parse(process.argv[2]);
const cwd = cfg.cwd; fs.mkdirSync(cwd, { recursive: true });
const env = { ...process.env, ...(cfg.env ?? {}) };
const child = spawn("grok", cfg.args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
let id = 0; const pending = new Map(); const out = { label: cfg.label, permissionRequests: [], toolCalls: [], usage: [] };
const send = (m) => child.stdin.write(JSON.stringify(m) + "\n");
const req = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); send({ jsonrpc: "2.0", id: i, method, params }); });
let sessionId = null; let done = false;
const finish = () => { if (done) return; done = true; console.log("RESULT " + JSON.stringify(out)); child.kill(); setTimeout(() => process.exit(0), 500); };
readline.createInterface({ input: child.stdout }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.method === "session/request_permission") {
    out.permissionRequests.push({ title: m.params.toolCall?.title, options: m.params.options?.map((o) => o.kind) });
    const reject = m.params.options.find((o) => o.kind === "reject_once") ?? m.params.options[0];
    send({ jsonrpc: "2.0", id: m.id, result: { outcome: { outcome: "selected", optionId: reject.optionId } } });
    setTimeout(() => sessionId && send({ jsonrpc: "2.0", method: "session/cancel", params: { sessionId } }), 200);
    return;
  }
  if (m.id !== undefined && !m.method && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "session/update") {
    const u = m.params.update;
    if (u.sessionUpdate === "tool_call_update" && u.status) {
      out.toolCalls.push({ title: u.title ?? null, status: u.status });
      if (!cfg.noCancel && (u.status === "completed" || u.status === "failed")) setTimeout(() => sessionId && send({ jsonrpc: "2.0", method: "session/cancel", params: { sessionId } }), 100);
    }
  }
  if (m.method === "_x.ai/session_notification" && m.params.update?.sessionUpdate === "response_completed") out.usage.push(m.params.update.usage);
  if (m.method === "session/update" && m.params.update.sessionUpdate === "tool_call") out.toolCalls.push({ start: m.params.update.title, kind: m.params.update.kind, meta: JSON.stringify(m.params.update._meta ?? {}).slice(0, 200) });
  if (m.method === "session/update" && m.params.update.sessionUpdate === "agent_message_chunk") out.text = (out.text ?? "") + (m.params.update.content?.text ?? "");
  if (m.id !== undefined && !m.method && m.result?.stopReason) out.turnUsage = m.result._meta?.usage;
});
setTimeout(finish, 120000);
await req("initialize", { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false }, clientInfo: { name: "autobyteus", version: "1.0.0" } });
const sn = await req("session/new", { cwd, mcpServers: [], ...(cfg.meta ? { _meta: cfg.meta } : {}) });
sessionId = sn.result.sessionId; out.sessionId = sessionId;
const pr = await req("session/prompt", { sessionId, prompt: [{ type: "text", text: cfg.promptText ?? `Run the shell command \`touch ${cfg.label}.txt\` in the current directory now, then reply DONE.` }] });
out.stopReason = pr.result?.stopReason ?? pr.error; out.fileCreated = fs.existsSync(`${cwd}/${cfg.label}.txt`);
finish();
