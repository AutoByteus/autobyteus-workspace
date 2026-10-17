#!/usr/bin/env node
// project-tool-split API/E2E real-app journeys (AC-003, AC-005, AC-006), ticket-owned temporary probe.
// Drives an ISOLATED AutoByteus desktop instance (worktree build or the downloaded v1.5.5-beta.2 release) through its
// public GraphQL / WebSocket API, as the renderer does:
//   1. imports the LOCAL_PATH test package (evidence/api-e2e/test-package) with importAgentPackage;
//   2. launches each package agent on the AGY runtime, whose CLI is the repository's scripted
//      `agy-failure-cli.mjs` (AGY_FAKE_CASE=linked_skills, set as the instance's ANTIGRAVITY_CLI_COMMAND server setting):
//      a message `CALL_TOOL:{name,arguments}` makes the agent call the real tool over the run's scoped Agent Tools MCP
//      session and reply `CALLED:<result>`;
//   3. lists the run's exposed tools with an MCP client on that same session (the capsule's mcp_config.json);
//   4. confirms every created/updated Project through GraphQL `projects`.
// Real-model cases (REAL-*, REL-REAL-*) launch on the Claude Agent SDK runtime with Haiku 5.5 (real inference; the
// user's choice for real-model testing) and ask in plain words, so the model picks the tool itself.
// Usage: node app-journey.mjs --backend http://127.0.0.1:<port> --mode new|release --out <fresh dir>
//          --argv-log <AGY_FAKE_ARGV_LOG path> --package <test-package dir> [--cases A,B]
//          [--real-runtime claude_agent_sdk] --real-model <Haiku 5.5 identifier from the instance's catalog>
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
const backend = arg("backend"); const mode = arg("mode"); const out = arg("out"); const argvLog = arg("argv-log");
const packageDir = arg("package", path.join(here, "test-package")); const nativeModel = arg("native-model");
const selected = (arg("cases", "") || "").split(",").filter(Boolean);
assert(backend && mode && out && argvLog, "--backend --mode --out --argv-log are required");
fs.mkdirSync(out, { recursive: true });
const logFile = path.join(out, "journey.log");
const log = (...parts) => { const line = `[${new Date().toISOString()}] ${parts.map((p) => typeof p === "string" ? p : JSON.stringify(p)).join(" ")}`; console.log(line); fs.appendFileSync(logFile, line + "\n"); };
const save = (name, value) => fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(value, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, label, timeoutMs = 60_000) => {
  const end = Date.now() + timeoutMs; let last;
  while (Date.now() < end) { last = await fn(); if (last) return last; await sleep(500); }
  throw new Error(`Timed out: ${label}`);
};
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backend}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const PROJECT_MUTATION_TOOLS = ["create_or_update_project", "create_project", "update_project"];
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;

// ---------------------------------------------------------------- setup
const results = { mode, backend, startedAt: new Date().toISOString(), cases: {} };
const pass = (id, detail) => { results.cases[id] = { result: "Pass", ...detail }; log(`CASE ${id} PASS`); save("results", results); };
const fail = (id, error, detail = {}) => { results.cases[id] = { result: "Fail", error: String(error?.stack ?? error), ...detail }; log(`CASE ${id} FAIL ${error}`); save("results", results); };

const imported = (await gql(`mutation($input:ImportAgentPackageInput!){importAgentPackage(input:$input){packageId displayName path sourceKind sharedAgentCount}}`,
  { input: { sourceKind: "LOCAL_PATH", source: packageDir } }).catch(async (error) => {
  if (!/already/i.test(String(error))) throw error;
  return gql(`query{agentPackages{packageId displayName path sourceKind sharedAgentCount}}`).then((d) => ({ importAgentPackage: d.agentPackages }));
})).importAgentPackage;
const ourPackage = imported.find((p) => path.resolve(p.path) === path.resolve(packageDir));
assert(ourPackage, `package not imported: ${JSON.stringify(imported)}`);
log("package imported", ourPackage);
const definitions = (await gql(`query{agentDefinitions{id name toolNames}}`)).agentDefinitions.filter((d) => d.name.startsWith("PTS "));
save("agent-definitions", definitions);
log("package agent definitions", definitions);
const def = (name) => { const d = definitions.find((x) => x.name === name); assert(d, `definition ${name} missing`); return d; };

const workspace = path.join(out, "workspace");
fs.mkdirSync(workspace, { recursive: true });
await gql(`mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}`, { input: { rootPath: workspace } }).catch((e) => log("createWorkspace", String(e)));

const agyConfig = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
const argvLines = () => (fs.existsSync(argvLog) ? fs.readFileSync(argvLog, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

const launch = async (definition, config) => {
  const r = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: definition.id, ...config } })).createAgentRun;
  log(`launch ${definition.name} (${config.runtimeKind})`, r);
  return r;
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
/** One scripted tool call: returns the parsed tool result the agent reported, or {agentError} when the turn errored. */
const agentCall = async (session, name, args) => {
  const before = strings(await conversation(session.runId)).filter((s) => s.includes("CALLED:")).length;
  const errorsBefore = session.input.frames.filter((f) => /ERROR/i.test(String(f.type))).length;
  session.input.send(callTool(name, args));
  const outcome = await until(async () => {
    const called = strings(await conversation(session.runId)).filter((s) => s.includes("CALLED:"));
    if (called.length > before) return { called: called[before] };
    const errors = session.input.frames.filter((f) => /ERROR/i.test(String(f.type)));
    if (errors.length > errorsBefore) return { agentError: errors.slice(errorsBefore) };
    return null;
  }, `${name} result`, 60_000);
  if (outcome.agentError) { log(`  ${name} -> agent turn error`, outcome.agentError); return { agentError: outcome.agentError }; }
  const raw = JSON.parse(outcome.called.slice(outcome.called.indexOf("CALLED:") + 7));
  const text = raw.content?.find?.((p) => p.type === "text")?.text;
  let parsed = raw.structuredContent ?? null;
  if (!parsed && text) { try { parsed = JSON.parse(text); } catch { parsed = { text }; } }
  const record = { tool: name, arguments: args, isError: raw.isError === true, result: parsed };
  log(`  ${name}(${JSON.stringify(args)}) ->`, record.isError ? "isError" : "ok", JSON.stringify(parsed).slice(0, 400));
  session.calls.push(record);
  return record;
};
/** The run's exposed tools, listed on the same scoped MCP session the agent uses. */
const listRunTools = async (argvLineIndex) => {
  const line = await until(() => argvLines()[argvLineIndex], "AGY launch line", 30_000);
  const config = JSON.parse(fs.readFileSync(path.join(line.cwd, ".agents", "mcp_config.json"), "utf8"));
  const server = config.mcpServers?.autobyteus_agent_tools;
  const { Client } = await import(serverRequire.resolve("@modelcontextprotocol/sdk/client/index.js"));
  const { StreamableHTTPClientTransport } = await import(serverRequire.resolve("@modelcontextprotocol/sdk/client/streamableHttp.js"));
  const client = new Client({ name: "pts-api-e2e-tools-list", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(server.serverUrl), { requestInit: { headers: server.headers ?? {} } }));
  try { return (await client.listTools()).tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })); }
  finally { await client.close(); }
};
const startAgy = async (name) => {
  const definition = def(name);
  const linesBefore = argvLines().length;
  const launched = await launch(definition, agyConfig());
  assert.equal(launched.success, true, `launch failed: ${launched.message}`);
  const input = await openInput(launched.runId);
  const session = { runId: launched.runId, input, calls: [], definition };
  // The AGY process starts with the first message; a list_projects call opens it.
  const first = await agentCall(session, "list_projects", {});
  assert.equal(first.isError, false, "list_projects failed");
  session.tools = await listRunTools(linesBefore);
  session.toolNames = session.tools.map((t) => t.name).sort();
  log(`  exposed tools for ${name}:`, session.toolNames);
  return session;
};
const projectsNow = async () => (await gql(`query{projects{projectId name description workspaces{workspaceRootPath description}}}`)).projects;
const projectById = async (id) => (await projectsNow()).find((p) => p.projectId === id);
const errCode = (record) => record.result?.error?.code ?? record.result?.code ?? null;
const notExposed = (record) => record.agentError || record.isError;
const terminate = async (session) => { session.input.close(); await gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: session.runId }).catch(() => undefined); };
const exposedMutationTools = (s) => s.toolNames.filter((n) => PROJECT_MUTATION_TOOLS.includes(n));

const wsA = path.join(workspace, "linked-a"); const wsB = path.join(workspace, "linked-b");
fs.mkdirSync(wsA, { recursive: true }); fs.mkdirSync(wsB, { recursive: true });
const run = async (id, fn) => {
  if (selected.length && !selected.includes(id)) return;
  log(`CASE ${id} START`);
  const detail = {};
  try { await fn(detail); pass(id, detail); } catch (error) { fail(id, error, detail); }
};

// ---------------------------------------------------------------- worktree build cases
if (mode === "new") {
  await run("APP-NEW", async (d) => {
    const s = await startAgy("PTS New Tools"); d.runId = s.runId; d.toolNames = s.toolNames;
    assert.deepEqual(exposedMutationTools(s), ["create_project", "update_project"]);
    d.descriptions = Object.fromEntries(s.tools.filter((t) => PROJECT_MUTATION_TOOLS.includes(t.name)).map((t) => [t.name, t.description]));
    const created = await agentCall(s, "create_project", { name: `PTS New ${randomUUID().slice(0, 4)}`, description: "Made by create_project.", workspaces: [{ workspace_path: wsA, description: "A" }] });
    assert.equal(created.isError, false); const p = created.result.project; assert.ok(p.projectId);
    assert.deepEqual(p.workspaces, [{ workspaceRootPath: wsA, description: "A" }]);
    const renamed = await agentCall(s, "update_project", { project_id: p.projectId, name: `${p.name} renamed`, description: "Changed by update_project." });
    assert.equal(renamed.isError, false); assert.equal(renamed.result.project.name, `${p.name} renamed`);
    assert.deepEqual(renamed.result.project.workspaces, p.workspaces, "omitted workspaces are kept");
    const relinked = await agentCall(s, "update_project", { project_id: p.projectId, workspaces: [{ workspace_path: wsB }] });
    assert.deepEqual(relinked.result.project.workspaces.map((w) => w.workspaceRootPath), [wsB], "a supplied list replaces all links");
    const unlinked = await agentCall(s, "update_project", { project_id: p.projectId, workspaces: [] });
    assert.deepEqual(unlinked.result.project.workspaces, [], "[] unlinks all");
    const withId = await agentCall(s, "create_project", { project_id: p.projectId, name: "Must not be created" });
    assert.equal(errCode(withId), "PROJECT_TOOL_ARGUMENT_INVALID");
    const noChange = await agentCall(s, "update_project", { project_id: p.projectId });
    assert.equal(errCode(noChange), "PROJECT_PATCH_REQUIRED");
    const noId = await agentCall(s, "update_project", { name: "x" });
    assert.equal(errCode(noId), "PROJECT_TOOL_ARGUMENT_INVALID");
    const blank = await agentCall(s, "create_project", { name: "  " });
    assert.equal(errCode(blank), "PROJECT_NAME_REQUIRED");
    const oldName = await agentCall(s, "create_or_update_project", { name: "Must not be created (old name)" });
    assert.ok(notExposed(oldName), "old tool must not be callable for an agent that does not list it");
    const stored = await projectById(p.projectId);
    assert.equal(stored.name, `${p.name} renamed`); assert.equal(stored.description, "Changed by update_project."); assert.deepEqual(stored.workspaces, []);
    const all = await projectsNow();
    assert.ok(!all.some((x) => /Must not be created/.test(x.name)), "no Project from rejected calls");
    d.projectId = p.projectId; d.stored = stored; d.calls = s.calls; save("APP-NEW", d); await terminate(s);
  });
  await run("APP-OLD", async (d) => {
    const s = await startAgy("PTS Old Tool"); d.runId = s.runId; d.toolNames = s.toolNames;
    assert.deepEqual(exposedMutationTools(s), ["create_or_update_project"]);
    d.oldDescription = s.tools.find((t) => t.name === "create_or_update_project").description;
    d.oldSchema = s.tools.find((t) => t.name === "create_or_update_project").inputSchema;
    const created = await agentCall(s, "create_or_update_project", { name: `PTS Old ${randomUUID().slice(0, 4)}`, description: "Made by the old tool.", workspaces: [{ workspace_path: wsA, description: "A" }] });
    assert.equal(created.isError, false); const p = created.result.project;
    const patched = await agentCall(s, "create_or_update_project", { project_id: p.projectId, description: "Patched by the old tool.", workspaces: [] });
    assert.equal(patched.isError, false); assert.equal(patched.result.project.description, "Patched by the old tool."); assert.deepEqual(patched.result.project.workspaces, []);
    const noChange = await agentCall(s, "create_or_update_project", { project_id: p.projectId });
    assert.equal(errCode(noChange), "PROJECT_PATCH_REQUIRED");
    const noName = await agentCall(s, "create_or_update_project", { description: "no name" });
    assert.equal(errCode(noName), "PROJECT_NAME_REQUIRED");
    const unknownKey = await agentCall(s, "create_or_update_project", { name: "x", extra: 1 });
    assert.equal(errCode(unknownKey), "PROJECT_TOOL_ARGUMENT_INVALID");
    const newName = await agentCall(s, "create_project", { name: "Must not be created (new name)" });
    assert.ok(notExposed(newName), "create_project must not be callable for an old-only agent");
    const stored = await projectById(p.projectId);
    assert.equal(stored.description, "Patched by the old tool."); assert.equal(stored.name, p.name);
    d.projectId = p.projectId; d.stored = stored; d.calls = s.calls; save("APP-OLD", d); await terminate(s);
  });
  await run("APP-MIX", async (d) => {
    const s = await startAgy("PTS Transition"); d.runId = s.runId; d.toolNames = s.toolNames;
    assert.deepEqual(exposedMutationTools(s), ["create_or_update_project", "create_project", "update_project"]);
    const a = await agentCall(s, "create_project", { name: `PTS Mix ${randomUUID().slice(0, 4)}` });
    const b = await agentCall(s, "update_project", { project_id: a.result.project.projectId, description: "via update_project" });
    const c = await agentCall(s, "create_or_update_project", { project_id: a.result.project.projectId, description: "via old tool" });
    assert.equal(a.isError || b.isError || c.isError, false);
    assert.equal((await projectById(a.result.project.projectId)).description, "via old tool");
    d.calls = s.calls; save("APP-MIX", d); await terminate(s);
  });
  await run("APP-NONE", async (d) => {
    const s = await startAgy("PTS No Project Tool"); d.runId = s.runId; d.toolNames = s.toolNames;
    assert.deepEqual(exposedMutationTools(s), []);
    for (const name of PROJECT_MUTATION_TOOLS) assert.ok(notExposed(await agentCall(s, name, { name: `Must not be created (${name})` })), `${name} must be refused`);
    assert.ok(!(await projectsNow()).some((x) => /Must not be created/.test(x.name)));
    d.calls = s.calls; save("APP-NONE", d); await terminate(s);
  });
}

// ---------------------------------------------------------------- release (v1.5.5-beta.2) cases
if (mode === "release") {
  await run("REL-MIX", async (d) => {
    const s = await startAgy("PTS Transition"); d.runId = s.runId; d.toolNames = s.toolNames;
    assert.deepEqual(exposedMutationTools(s), ["create_or_update_project"], "release exposes only the old tool for the transition list");
    const created = await agentCall(s, "create_or_update_project", { name: `PTS Rel Mix ${randomUUID().slice(0, 4)}` });
    const patched = await agentCall(s, "create_or_update_project", { project_id: created.result.project.projectId, description: "patched on release" });
    assert.equal(created.isError || patched.isError, false);
    const newName = await agentCall(s, "create_project", { name: "Must not be created (release)" });
    assert.ok(notExposed(newName));
    d.calls = s.calls; save("REL-MIX", d); await terminate(s);
  });
  await run("REL-OLD", async (d) => {
    const s = await startAgy("PTS Old Tool"); d.runId = s.runId; d.toolNames = s.toolNames;
    assert.deepEqual(exposedMutationTools(s), ["create_or_update_project"]);
    d.oldDescription = s.tools.find((t) => t.name === "create_or_update_project").description;
    d.oldSchema = s.tools.find((t) => t.name === "create_or_update_project").inputSchema;
    const created = await agentCall(s, "create_or_update_project", { name: `PTS Rel Old ${randomUUID().slice(0, 4)}` });
    assert.equal(created.isError, false);
    d.calls = s.calls; save("REL-OLD", d); await terminate(s);
  });
  await run("REL-NEW", async (d) => {
    const s = await startAgy("PTS New Tools"); d.runId = s.runId; d.toolNames = s.toolNames;
    assert.deepEqual(exposedMutationTools(s), [], "release does not know the new names and skips them");
    d.calls = s.calls; save("REL-NEW", d); await terminate(s);
  });
}

// ---------------------------------------------------------------- real-model runtime (Claude Agent SDK, Haiku 5.5)
// --real-runtime <runtimeKind> --real-model <llmModelIdentifier>; the agent decides the calls from a plain request.
const realRuntime = arg("real-runtime", "claude_agent_sdk"); const realModel = arg("real-model", nativeModel);
const realCase = async (id, agentName, prompt, verify, { expectNone = false, settleMs = 0 } = {}) => run(id, async (d) => {
  assert(realModel, "--real-model required");
  const definition = def(agentName);
  const launched = await launch(definition, { workspaceRootPath: workspace, llmModelIdentifier: realModel, llmConfig: null, autoExecuteTools: true, runtimeKind: realRuntime });
  d.runtimeKind = realRuntime; d.model = realModel; d.launch = launched; assert.equal(launched.success, true, launched.message);
  const input = await openInput(launched.runId);
  input.send(prompt);
  let outcome;
  if (expectNone) {
    // Wait for the agent's turn to finish, then prove nothing was created.
    await until(async () => strings(await conversation(launched.runId)).some((s) => /project/i.test(s) && s !== prompt), `${id} reply`, 240_000).catch(() => undefined);
    await sleep(settleMs);
    outcome = verify(await projectsNow());
  } else {
    outcome = await until(async () => verify(await projectsNow()), `${id} project outcome`, 240_000).catch((e) => ({ timeout: String(e) }));
  }
  d.outcome = outcome; d.conversation = await conversation(launched.runId); d.frameTypes = [...new Set(input.frames.map((f) => f.type))];
  save(id, d); input.close();
  await gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: launched.runId }).catch(() => undefined);
  assert.ok(outcome && !outcome.timeout, JSON.stringify(outcome));
});
const tag = randomUUID().slice(0, 4);
if (mode === "new") {
  await realCase("REAL-NEW", "PTS New Tools",
    `Create a Project named "PTS Real New ${tag}" with description "real create". Then change that Project's description to "real update". Report both tool results.`,
    (all) => all.find((p) => p.name === `PTS Real New ${tag}` && p.description === "real update"));
  await realCase("REAL-OLD", "PTS Old Tool",
    `Create a Project named "PTS Real Old ${tag}" with description "real old create". Then change that Project's description to "real old update". Report both tool results.`,
    (all) => all.find((p) => p.name === `PTS Real Old ${tag}` && p.description === "real old update"));
  await realCase("REAL-NONE", "PTS No Project Tool",
    `Create a Project named "PTS Real None ${tag}". If you have no tool that can create a Project, say so.`,
    (all) => (all.some((p) => p.name === `PTS Real None ${tag}`) ? null : { noProjectCreated: true }), { expectNone: true, settleMs: 5_000 });
}
if (mode === "release") {
  await realCase("REL-REAL-MIX", "PTS Transition",
    `Create a Project named "PTS Rel Real ${tag}" with description "release real". Report the tool result.`,
    (all) => all.find((p) => p.name === `PTS Rel Real ${tag}`));
}

results.finishedAt = new Date().toISOString();
save("results", results);
const failed = Object.entries(results.cases).filter(([, r]) => r.result !== "Pass");
log(`SUMMARY ${Object.keys(results.cases).length} cases, ${failed.length} failed`, failed.map(([id]) => id));
process.exit(failed.length ? 1 : 0);
