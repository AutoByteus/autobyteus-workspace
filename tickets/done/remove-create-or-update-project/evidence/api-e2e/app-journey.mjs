#!/usr/bin/env node
// remove-create-or-update-project API/E2E real-app journeys (AC-001, AC-002, AC-003, AC-006), ticket-owned temporary probe.
// Adapted from tickets/done/project-tool-split/evidence/api-e2e/app-journey.mjs.
// Drives an ISOLATED AutoByteus instance of the worktree's packaged build through its public GraphQL / WebSocket API:
//   1. imports the LOCAL_PATH test package (evidence/api-e2e/test-package) with importAgentPackage;
//   2. launches package agents on the AGY runtime, whose CLI is the repository's scripted `agy-failure-cli.mjs`
//      (AGY_FAKE_CASE=linked_skills, set as the instance's ANTIGRAVITY_CLI_COMMAND server setting). `READ_SKILLS` starts the
//      run without a tool call; `CALL_TOOL:{name,arguments}` makes the agent call the real tool over its scoped Agent
//      Tools MCP session and reply `CALLED:<result>`;
//   3. lists each run's exposed tools with an MCP client on that same session (the capsule's mcp_config.json);
//   4. REAL-* cases launch on Claude Agent SDK with Haiku 5.5 (real inference; the user's choice) and ask in plain words;
//   5. NATIVE-LAUNCH launches the old-listed agent on the AutoByteus runtime and reports launch success (the resolver
//      warning is read from the instance log by the operator);
//   6. confirms Projects through GraphQL `projects`.
// Usage: node app-journey.mjs --backend http://127.0.0.1:<port> --out <fresh dir> --argv-log <AGY_FAKE_ARGV_LOG path>
//          [--package <dir>] [--cases A,B] [--real-model haiku] [--native-model <id>]
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const worktree = path.resolve(here, "../../../../..");
const serverRequire = createRequire(path.join(worktree, "autobyteus-server-ts", "package.json"));
const WebSocket = serverRequire("ws");
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const backend = arg("backend"); const out = arg("out"); const argvLog = arg("argv-log");
const packageDir = arg("package", path.join(here, "test-package"));
const realModel = arg("real-model", "haiku"); const nativeModel = arg("native-model");
const selected = (arg("cases", "") || "").split(",").filter(Boolean);
assert(backend && out && argvLog, "--backend --out --argv-log are required");
fs.mkdirSync(out, { recursive: true });
const logFile = path.join(out, "journey.log");
const log = (...parts) => { const line = `[${new Date().toISOString()}] ${parts.map((p) => typeof p === "string" ? p : JSON.stringify(p)).join(" ")}`; console.log(line); fs.appendFileSync(logFile, line + "\n"); };
const save = (name, value) => fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(value, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, label, timeoutMs = 60_000) => {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(500); }
  throw new Error(`Timed out: ${label}`);
};
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backend}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const OLD = "create_or_update_project";
const isMutation = (n) => /_project$/.test(n) && n !== "list_projects";
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;

const results = { backend, startedAt: new Date().toISOString(), cases: {} };
const pass = (id, detail) => { results.cases[id] = { result: "Pass", ...detail }; log(`CASE ${id} PASS`); save("results", results); };
const fail = (id, error, detail = {}) => { results.cases[id] = { result: "Fail", error: String(error?.stack ?? error), ...detail }; log(`CASE ${id} FAIL ${error}`); save("results", results); };
const run = async (id, fn) => {
  if (selected.length && !selected.includes(id)) return;
  log(`CASE ${id} START`); const detail = {};
  try { await fn(detail); pass(id, detail); } catch (error) { fail(id, error, detail); }
};

// ---------------------------------------------------------------- setup
const imported = (await gql(`mutation($input:ImportAgentPackageInput!){importAgentPackage(input:$input){packageId displayName path sourceKind sharedAgentCount}}`,
  { input: { sourceKind: "LOCAL_PATH", source: packageDir } })).importAgentPackage;
const ourPackage = imported.find((p) => path.resolve(p.path) === path.resolve(packageDir));
assert(ourPackage, `package not imported: ${JSON.stringify(imported)}`);
log("package imported", ourPackage);
const definitions = (await gql(`query{agentDefinitions{id name toolNames}}`)).agentDefinitions.filter((d) => d.name.startsWith("PTS "));
save("agent-definitions", definitions); log("package agent definitions", definitions);
const def = (name) => { const d = definitions.find((x) => x.name === name); assert(d, `definition ${name} missing`); return d; };
const workspace = path.join(out, "workspace"); const wsA = path.join(workspace, "linked-a"); const wsB = path.join(workspace, "linked-b");
fs.mkdirSync(wsA, { recursive: true }); fs.mkdirSync(wsB, { recursive: true });
await gql(`mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}`, { input: { rootPath: workspace } }).catch((e) => log("createWorkspace", String(e)));
const config = (runtimeKind, model) => ({ workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind });
const argvLines = () => (fs.existsSync(argvLog) ? fs.readFileSync(argvLog, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const launch = async (definition, cfg) => {
  const r = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: definition.id, ...cfg } })).createAgentRun;
  log(`launch ${definition.name} (${cfg.runtimeKind})`, r); return r;
};
const conversation = async (runId) => (await gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? [];
const strings = (value, acc = []) => { if (typeof value === "string") acc.push(value); else if (Array.isArray(value)) value.forEach((v) => strings(v, acc)); else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, acc)); return acc; };
const openInput = async (runId) => {
  const socket = new WebSocket(`${backend.replace(/^http/, "ws")}/ws/agent/${runId}`);
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  const frames = []; socket.on("message", (m) => { try { frames.push(JSON.parse(String(m))); } catch { /* ignore */ } });
  const send = (content) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: runId, message_id: `pts-${randomUUID()}`,
    dedupe_key: `agent_run_input:pts:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
  return { send, frames, close: () => socket.close() };
};
const errorFrames = (s) => s.input.frames.filter((f) => /ERROR/i.test(String(f.type)));
/** One scripted message; resolves with the reply that contains `marker`, or {agentError}. */
const scripted = async (s, content, marker) => {
  const before = strings(await conversation(s.runId)).filter((x) => x.includes(marker)).length; const errorsBefore = errorFrames(s).length;
  s.input.send(content);
  return until(async () => {
    const hits = strings(await conversation(s.runId)).filter((x) => x.includes(marker));
    if (hits.length > before) return { reply: hits[before] };
    const errors = errorFrames(s); if (errors.length > errorsBefore) return { agentError: errors.slice(errorsBefore) };
    return null;
  }, `${marker} reply`, 60_000);
};
const agentCall = async (s, name, args) => {
  const outcome = await scripted(s, callTool(name, args), "CALLED:");
  if (outcome.agentError) { const record = { tool: name, arguments: args, refused: true, agentError: outcome.agentError }; log(`  ${name} -> refused`, outcome.agentError.map((e) => e.payload?.message)); s.calls.push(record); return record; }
  const raw = JSON.parse(outcome.reply.slice(outcome.reply.indexOf("CALLED:") + 7));
  const text = raw.content?.find?.((p) => p.type === "text")?.text;
  let parsed = raw.structuredContent ?? null; if (!parsed && text) { try { parsed = JSON.parse(text); } catch { parsed = { text }; } }
  const record = { tool: name, arguments: args, isError: raw.isError === true, result: parsed };
  log(`  ${name}(${JSON.stringify(args)}) ->`, record.isError ? "isError" : "ok", JSON.stringify(parsed).slice(0, 300)); s.calls.push(record); return record;
};
const listRunTools = async (argvLineIndex) => {
  const line = await until(() => argvLines()[argvLineIndex], "AGY launch line", 30_000);
  const cfg = JSON.parse(fs.readFileSync(path.join(line.cwd, ".agents", "mcp_config.json"), "utf8"));
  const server = cfg.mcpServers?.autobyteus_agent_tools;
  const { Client } = await import(serverRequire.resolve("@modelcontextprotocol/sdk/client/index.js"));
  const { StreamableHTTPClientTransport } = await import(serverRequire.resolve("@modelcontextprotocol/sdk/client/streamableHttp.js"));
  const client = new Client({ name: "pts-api-e2e-tools-list", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(server.serverUrl), { requestInit: { headers: server.headers ?? {} } }));
  try { return (await client.listTools()).tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })); } finally { await client.close(); }
};
const startAgy = async (name, d) => {
  const definition = def(name); const linesBefore = argvLines().length;
  const launched = await launch(definition, config("antigravity_cli", "gemini-3.8-flash-low"));
  d.launch = launched; assert.equal(launched.success, true, `launch failed: ${launched.message}`);
  const s = { runId: launched.runId, input: await openInput(launched.runId), calls: [], definition };
  const started = await scripted(s, "READ_SKILLS", "SKILLS:");
  assert.ok(!started.agentError, `first turn errored: ${JSON.stringify(started.agentError)}`);
  s.tools = await listRunTools(linesBefore); s.toolNames = s.tools.map((t) => t.name).sort();
  d.runId = s.runId; d.definitionToolNames = definition.toolNames; d.exposedToolNames = s.toolNames;
  log(`  ${name} lists ${JSON.stringify(definition.toolNames)}; exposed: ${JSON.stringify(s.toolNames)}`);
  return s;
};
const terminate = async (runId) => gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId }).catch(() => undefined);
const projectsNow = async () => (await gql(`query{projects{projectId name description workspaces{workspaceRootPath description}}}`)).projects;
const errCode = (r) => r.result?.error?.code ?? null;

// ---------------------------------------------------------------- scripted AGY (MCP) cases
await run("APP-OLD-MIXED", async (d) => {
  const s = await startAgy("PTS Old Listed", d);
  assert.ok(!s.toolNames.includes(OLD), "removed tool must not be exposed");
  for (const n of ["create_project", "update_project", "list_projects", "list_project_tasks", "create_task", "update_task"]) assert.ok(s.toolNames.includes(n), `${n} missing`);
  const old = await agentCall(s, OLD, { name: "Must not be created (old name)" });
  assert.ok(old.refused || old.isError, "old-name call must be refused");
  const created = await agentCall(s, "create_project", { name: `PTS OldListed ${randomUUID().slice(0, 4)}`, description: "via create_project" });
  assert.equal(created.isError, false);
  const updated = await agentCall(s, "update_project", { project_id: created.result.project.projectId, description: "via update_project" });
  assert.equal(updated.isError, false); assert.equal(updated.result.project.description, "via update_project");
  assert.ok(!(await projectsNow()).some((p) => /Must not be created/.test(p.name)));
  d.calls = s.calls; save("APP-OLD-MIXED", d); s.input.close(); await terminate(s.runId);
});
await run("APP-OLD-ALONE", async (d) => {
  const s = await startAgy("PTS Old Alone", d);
  assert.deepEqual(s.toolNames.filter(isMutation), [], "no Project mutation tool");
  const old = await agentCall(s, OLD, { name: "Must not be created (alone)" });
  assert.ok(old.refused || old.isError, "old-name call must be refused");
  assert.ok(!(await projectsNow()).some((p) => /Must not be created/.test(p.name)));
  d.calls = s.calls; save("APP-OLD-ALONE", d); s.input.close(); await terminate(s.runId);
});
await run("APP-NEW", async (d) => {
  const s = await startAgy("PTS New Tools", d);
  assert.deepEqual(s.toolNames.filter(isMutation), ["create_project", "update_project"]);
  d.descriptions = Object.fromEntries(s.tools.filter((t) => isMutation(t.name)).map((t) => [t.name, { description: t.description, inputSchema: t.inputSchema }]));
  const c = await agentCall(s, "create_project", { name: `PTS New ${randomUUID().slice(0, 4)}`, description: "made", workspaces: [{ workspace_path: wsA, description: "A" }] });
  assert.equal(c.isError, false); const p = c.result.project; assert.deepEqual(p.workspaces, [{ workspaceRootPath: wsA, description: "A" }]);
  const r = await agentCall(s, "update_project", { project_id: p.projectId, name: `${p.name} renamed` });
  assert.deepEqual(r.result.project.workspaces, p.workspaces, "omitted workspaces kept");
  const rel = await agentCall(s, "update_project", { project_id: p.projectId, workspaces: [{ workspace_path: wsB }] });
  assert.deepEqual(rel.result.project.workspaces.map((w) => w.workspaceRootPath), [wsB]);
  const un = await agentCall(s, "update_project", { project_id: p.projectId, workspaces: [] }); assert.deepEqual(un.result.project.workspaces, []);
  assert.equal(errCode(await agentCall(s, "create_project", { project_id: p.projectId, name: "Must not be created" })), "PROJECT_TOOL_ARGUMENT_INVALID");
  assert.equal(errCode(await agentCall(s, "update_project", { project_id: p.projectId })), "PROJECT_PATCH_REQUIRED");
  assert.equal(errCode(await agentCall(s, "update_project", { name: "x" })), "PROJECT_TOOL_ARGUMENT_INVALID");
  assert.equal(errCode(await agentCall(s, "create_project", { name: "  " })), "PROJECT_NAME_REQUIRED");
  const stored = (await projectsNow()).find((x) => x.projectId === p.projectId);
  assert.equal(stored.name, `${p.name} renamed`); assert.deepEqual(stored.workspaces, []);
  assert.ok(!(await projectsNow()).some((x) => /Must not be created/.test(x.name)));
  d.stored = stored; d.calls = s.calls; save("APP-NEW", d); s.input.close(); await terminate(s.runId);
});

// ---------------------------------------------------------------- real model (Claude Agent SDK, Haiku 5.5)
const tag = randomUUID().slice(0, 4);
const realCase = (id, agentName, prompt, verify, { expectNone = false } = {}) => run(id, async (d) => {
  const launched = await launch(def(agentName), config("claude_agent_sdk", realModel));
  d.runtimeKind = "claude_agent_sdk"; d.model = realModel; d.launch = launched; assert.equal(launched.success, true, launched.message);
  const input = await openInput(launched.runId); input.send(prompt);
  let outcome;
  if (expectNone) {
    await until(async () => strings(await conversation(launched.runId)).some((x) => x !== prompt && x.length > 30 && /project/i.test(x)), `${id} reply`, 240_000).catch(() => undefined);
    await sleep(5_000); outcome = verify(await projectsNow());
  } else outcome = await until(async () => verify(await projectsNow()), `${id} outcome`, 240_000).catch((e) => ({ timeout: String(e) }));
  d.outcome = outcome; d.conversation = await conversation(launched.runId);
  const text = JSON.stringify(d.conversation); d.toolNamesInConversation = [...new Set([...text.matchAll(/(create_or_update_project|create_project|update_project)/g)].map((m) => m[1]))];
  save(id, d); input.close(); await terminate(launched.runId);
  assert.ok(outcome && !outcome.timeout, JSON.stringify(outcome));
});
await realCase("REAL-OLD-MIXED", "PTS Old Listed", `Create a Project named "PTS Real OldListed ${tag}" with description "real create". Then change its description to "real update". Report both tool results.`,
  (all) => all.find((p) => p.name === `PTS Real OldListed ${tag}` && p.description === "real update"));
await realCase("REAL-OLD-ALONE", "PTS Old Alone", `Create a Project named "PTS Real OldAlone ${tag}". If you have no tool that can create a Project, say so.`,
  (all) => (all.some((p) => p.name === `PTS Real OldAlone ${tag}`) ? null : { noProjectCreated: true }), { expectNone: true });
await realCase("REAL-NEW", "PTS New Tools", `Create a Project named "PTS Real New ${tag}" with description "real create". Then change its description to "real update". Report both tool results.`,
  (all) => all.find((p) => p.name === `PTS Real New ${tag}` && p.description === "real update"));

// ---------------------------------------------------------------- AutoByteus runtime launch (no message sent)
await run("NATIVE-LAUNCH", async (d) => {
  assert(nativeModel, "--native-model required");
  const launched = await launch(def("PTS Old Listed"), config("autobyteus", nativeModel));
  d.launch = launched; assert.equal(launched.success, true, launched.message);
  await sleep(3_000); d.markerTime = new Date().toISOString(); save("NATIVE-LAUNCH", d); await terminate(launched.runId);
});

results.finishedAt = new Date().toISOString(); save("results", results);
const failed = Object.entries(results.cases).filter(([, r]) => r.result !== "Pass");
log(`SUMMARY ${Object.keys(results.cases).length} cases, ${failed.length} failed`, failed.map(([id]) => id));
process.exit(failed.length ? 1 : 0);
