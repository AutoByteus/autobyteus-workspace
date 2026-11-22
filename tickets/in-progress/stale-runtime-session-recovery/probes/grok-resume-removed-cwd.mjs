// N-1 (autobyteus-599): `session/resume` of a PRESENT Grok session whose workspace folder (cwd) was removed.
// Run with an isolated home only (DEC-006): the Grok key comes from the test vault through autobyteus-ts and reaches only the
// Grok child as XAI_API_KEY; it is never printed or written:
//   env -i PATH="$PATH" HOME=<new temp dir> XDG_*=<inside it> AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault \
//     node grok-resume-removed-cwd.mjs <base dir> <worktree>/autobyteus-ts/dist/secrets/provider-api-key-resolver.js
// Steps: (1) one grok process: initialize, session/new in <base>/ws (no prompt, no model call), stop;
// (2) remove <base>/ws; (3) a fresh grok process: initialize, session/resume of that id with the removed cwd,
// then session/new with the removed cwd and with an existing cwd (would a fresh session succeed in that state?).
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const base = path.resolve(process.argv[2]);
const resolverModule = process.argv[3];
let childEnv = { ...process.env };
delete childEnv.AUTOBYTEUS_TEST_VAULT;
if (resolverModule) {
  const { resolveProviderApiKeyResolver } = await import(path.resolve(resolverModule));
  const key = (await resolveProviderApiKeyResolver().resolve("GROK")).revealToTrustedConsumer();
  childEnv = { ...childEnv, XAI_API_KEY: key };
  console.log("key: from the test vault (provider.grok.api-key), passed to the Grok child only");
}
const ws = path.join(base, "ws");
const other = path.join(base, "other");
fs.mkdirSync(ws, { recursive: true });
fs.mkdirSync(other, { recursive: true });

const rpc = (cwd) => {
  const child = spawn("grok", ["agent", "stdio"], { cwd, stdio: ["pipe", "pipe", "pipe"], env: childEnv });
  let buffer = "";
  let nextId = 1;
  const pending = new Map();
  child.stdout.on("data", (data) => {
    buffer += data;
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      try { const message = JSON.parse(line); if (message.id !== undefined && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } } catch {}
    }
  });
  let stderr = "";
  child.stderr.on("data", (data) => { stderr += data; });
  const call = (method, params) => new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); resolve({ timeout: `${method} 30s` }); } }, 30_000);
  });
  return { call, stop: () => child.kill(), stderr: () => stderr };
};
const brief = (message) => JSON.stringify(message.error ?? message.result ?? message).slice(0, 400);

const first = rpc(ws);
const init1 = await first.call("initialize", { protocolVersion: 1, clientCapabilities: {} });
console.log("initialize:", brief(init1).slice(0, 200));
const created = await first.call("session/new", { cwd: ws, mcpServers: [] });
console.log("session/new (present cwd):", brief(created));
const sessionId = created.result?.sessionId;
first.stop();
await new Promise((resolve) => setTimeout(resolve, 1000));
if (!sessionId) { console.log("no session created; stderr:", first.stderr().slice(0, 400)); process.exit(0); }

fs.rmSync(ws, { recursive: true, force: true });
console.log("removed cwd:", ws, "exists:", fs.existsSync(ws));

const second = rpc(other);
await second.call("initialize", { protocolVersion: 1, clientCapabilities: {} });
console.log("session/resume (present session, removed cwd):", brief(await second.call("session/resume", { sessionId, cwd: ws, mcpServers: [] })));
console.log("session/new (removed cwd):", brief(await second.call("session/new", { cwd: ws, mcpServers: [] })));
console.log("session/new (existing cwd):", brief(await second.call("session/new", { cwd: other, mcpServers: [] })));
console.log("session/resume (random missing session, existing cwd):",
  brief(await second.call("session/resume", { sessionId: "3f2c9e7a-1111-4222-8333-444455556666", cwd: other, mcpServers: [] })));
second.stop();
process.exit(0);
