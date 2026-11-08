import fs from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Switching BACK to Antigravity on the BUILT server (switch-back-eexist, autobyteus-440, API/E2E): an Org member, a delegated copy and a
// Team member each run on Antigravity, switch to native, then back to Antigravity. A second Antigravity era used to fail with
// `EEXIST ... agy-project` because the first era's capsule folder was never removed. Test-owned data root, private HOME; only models are
// scripted (native = LM Studio stand-in, Antigravity = tests/fixtures/agy-failure-cli.mjs `linked_skills`).
//   SB-01 Org member: Antigravity -> native -> Antigravity. Before the third era's message the server RESTARTS; that message first FAILS
//         at the archive step AFTER the Antigravity candidate made its capsule (the retry of a failed start used to hit the same EEXIST),
//         leaves the previous file byte-identical, then the retry completes: one marker, one segment holding exactly the native era (I-7).
//   SB-02 Delegated copy: the same sequence through the host's Settings choice and its wake.
//   SB-03 Team member: the same with a restart between the save and the message of the third era.
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//     ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs \
//     pnpm exec vitest run tests/e2e/runtime/agy-switch-back-built-server.e2e.test.ts --no-watch

const FAKE_AGY = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const ENABLED = process.env.RUN_AGY_FAILURE_E2E === "1" && path.isAbsolute(FAKE_AGY) && existsSync(FAKE_AGY)
  && spawnSync(FAKE_AGY, ["--version"], { stdio: "ignore" }).status === 0 && existsSync(path.resolve("dist/app.js"));
const AGY = "antigravity_cli";
const NATIVE = "autobyteus";
const AGY_MODEL = "gemini-3.8-flash-low";
const NATIVE_KEY = "ex-native-a";
const FIRST_SEGMENT = "raw_traces_000001.jsonl";

type Json = Record<string, any>;
type Wire = { type: string; payload: Json };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const readRaw = (file: string): Json[] => {
  try { return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Json); } catch { return []; }
};
const until = async (check: () => boolean | Promise<boolean>, label: string, ms = 60_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await check()) return; await wait(100); }
  throw new Error(`Timed out: ${label}`);
};
const findDir = (base: string, name: string, depth = 0): string | null => {
  if (depth > 6 || !existsSync(base)) return null;
  for (const entry of readdirSync(base)) {
    const full = path.join(base, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry === name) return full;
    const nested = findDir(full, name, depth + 1);
    if (nested) return nested;
  }
  return null;
};
const segmentName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const startFakeLmStudio = async () => {
  const requests: Json[] = [];
  const server: Server = createServer(async (req, res) => {
    if (req.method === "GET") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [{ key: NATIVE_KEY, max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] }] }));
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw) as Json;
    requests.push(body);
    const chunk = (delta: Json, finish: string | null) => ({ id: `ex-${requests.length}`, object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk({ role: "assistant", content: `NATIVE-REPLY-${requests.length}` }, null))}\n\ndata: ${JSON.stringify(chunk({}, "stop"))}\n\ndata: [DONE]\n\n`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, requests, close: () => { server.closeAllConnections(); return new Promise<void>((resolve) => server.close(() => resolve())); } };
};

describe.runIf(ENABLED)("switching back to Antigravity: Org member, delegated copy and Team member", () => {
  const suffix = `rsm-extended-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  let server: Awaited<ReturnType<typeof startBuiltTestServer>>;
  let lm: Awaited<ReturnType<typeof startFakeLmStudio>>;
  let nativeModel = "";
  const sockets: WebSocket[] = [];
  const memory = (...parts: string[]) => path.join(runtimeRoot, "memory", ...parts);

  const gql = async <T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> => executeGraphql<T>(server.serverUrl, query, variables);
  const launch = async () => {
    server = await startBuiltTestServer({
      runtimeRoot, databaseUrlOverride: database.databaseUrl,
      environment: { HOME: path.join(runtimeRoot, "isolated-home"), LMSTUDIO_HOSTS: lm.origin, ANTIGRAVITY_CLI_COMMAND: FAKE_AGY, AGY_FAKE_CASE: "linked_skills" },
    });
    await gql("mutation($providerId: String!, $runtimeKind: String) { reloadProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }", { providerId: "LMSTUDIO", runtimeKind: NATIVE });
  };
  const stop = async () => {
    for (const socket of sockets.splice(0)) if (socket.readyState === WebSocket.OPEN) socket.close();
    await server.stop();
  };
  const modelsOf = async (runtimeKind: string): Promise<string[]> =>
    (await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }", { runtimeKind }))
      .providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
  const agentDefinition = async (name: string) => (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id name } }",
    { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: "runtime switch extended E2E", instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition as { id: string; name: string };
  const teamDefinition = async (agentId: string) => (await gql("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id name } }",
    { input: { name: `ex-team ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.", coordinatorMemberName: "lead",
      nodes: ["lead", "worker"].map((memberName) => ({ memberName, ref: agentId, refScope: "SHARED" })) } })).createAgentTeamDefinition as { id: string; name: string };
  const launchOf = (runtimeKind: string, llmModelIdentifier: string, workspaceRootPath: string) => ({ runtimeKind, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, workspaceRootPath });

  const treeOf = async (file: string): Promise<Json> => JSON.parse(await fs.readFile(file, "utf8")) as Json;
  const orgTreeFile = (orgRunId: string) => memory("agent_orgs", orgRunId, "agent_org_run_execution_tree.json");
  const orgAgents = (tree: Json): Json[] => tree.rootOrg.members.flatMap((member: Json) => "agentRunId" in member ? [member] : member.members);
  const orgAgent = (tree: Json, address: string): Json => orgAgents(tree).find((member) => member.address === address)!;

  type Stream = Readonly<{ path: string; send(socket: WebSocket, agentRunId: string, content: string): void; turnEnded(message: Wire, agentRunId: string): boolean; failed(message: Wire): boolean }>;
  const agentStream = (runId: string): Stream => ({
    path: `/ws/agent/${runId}`,
    send: (socket, agentRunId, content) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content }),
    turnEnded: (message) => message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED",
    failed: (message) => message.type === "ERROR" || (message.type === "AGENT_COMMAND_ACK" && message.payload.state !== "accepted"),
  });
  const teamStream = (teamRunId: string): Stream => ({
    path: `/ws/agent-team/${teamRunId}`,
    send: (socket, agentRunId, content) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content }),
    turnEnded: (message, agentRunId) => message.payload.agent_run_id === agentRunId && (message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED"),
    failed: (message) => message.type === "ERROR" || (message.type === "AGENT_COMMAND_ACK" && message.payload.state !== "accepted"),
  });
  const orgStream = (orgRunId: string): Stream => ({
    path: `/ws/agent-org/${orgRunId}`,
    send: (socket, agentRunId, content) => {
      const id = `e2e-${randomUUID()}`;
      socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agentRunId,
        command_id: id, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: `agent_run_input:e2e:${id}` } }));
    },
    turnEnded: (message, agentRunId) => message.type === "ROOT_EXECUTION_EVENT" && /turn_(completed|interrupted)/i.test(JSON.stringify(message.payload)) && JSON.stringify(message.payload).includes(agentRunId),
    failed: (message) => message.type === "ERROR" || (message.type === "AGENT_COMMAND_ACK" && message.payload.state !== "accepted"),
  });
  const openSocket = async (stream: Stream, label: string) => {
    const messages: Wire[] = [];
    let closed = false;
    const socket = new WebSocket(`ws://127.0.0.1:${new URL(server.serverUrl).port}${stream.path}`);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: string; payload?: Json };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload : {} });
      } catch { /* diagnostic rows only */ }
    });
    socket.on("close", () => { closed = true; });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => messages.some((m) => m.type === "CONNECTED" || m.type === "ERROR") || closed, `${label}: CONNECTED`, 120_000);
    return { socket, messages, isClosed: () => closed };
  };
  const talk = async (stream: Stream, agentRunId: string, content: string, label: string) => {
    const { socket, messages } = await openSocket(stream, label);
    stream.send(socket, agentRunId, content);
    await until(() => messages.some((m) => stream.turnEnded(m, agentRunId) || stream.failed(m)), `${label}: turn end`, 120_000);
    expect(messages.filter(stream.failed).map((m) => m.payload), `${label}: errors`).toEqual([]);
    await wait(300);
    socket.close();
    return messages;
  };
  /** A first message that is expected to fail: resolves with what happened instead of throwing on the server's error. */
  const attempt = async (stream: Stream, agentRunId: string, content: string) => {
    const { socket, messages, isClosed } = await openSocket(stream, "attempt");
    if (messages.some((m) => m.type === "CONNECTED") && !messages.some((m) => m.type === "ERROR")) stream.send(socket, agentRunId, content);
    await until(() => messages.some((m) => stream.turnEnded(m, agentRunId) || stream.failed(m)) || isClosed(), "attempt: outcome", 60_000);
    await wait(500);
    const completed = messages.some((m) => stream.turnEnded(m, agentRunId));
    socket.close();
    return { messages, completed, acks: messages.filter((m) => m.type === "AGENT_COMMAND_ACK").map((m) => m.payload) };
  };

  const active = (dir: string) => readRaw(path.join(dir, "raw_traces_active.jsonl"));
  const activeText = (dir: string) => readFileSync(path.join(dir, "raw_traces_active.jsonl"), "utf8");
  const completeSegments = (dir: string): Json[] => existsSync(path.join(dir, "raw_traces_manifest.json"))
    ? (JSON.parse(readFileSync(path.join(dir, "raw_traces_manifest.json"), "utf8")) as { segments: Json[] }).segments.filter((segment) => segment.status === "complete") : [];
  const ids = (records: Json[]) => records.map((record) => record.id as string);
  const echoed = (dir: string): string[] => active(dir).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("ECHO:"))
    .map((record) => JSON.parse(String(record.content).slice("ECHO:".length)) as string);
  const markers = (dir: string) => active(dir).filter((record) => String(record.correlation_id ?? "").startsWith("runtime_switch:"));
  /** The segment a switch made, by its key: its ids and the runtime it archived. */
  const switchSegment = (dir: string, key: string) => {
    const found = completeSegments(dir).filter((segment) => segment.boundary_key === key);
    expect(found, `exactly one complete segment for ${key}`).toHaveLength(1);
    return { ids: ids(readRaw(path.join(dir, found[0]!.file_name))), runtimeKind: found[0]!.runtime_kind as string };
  };
  const obstruct = (dir: string) => fs.mkdir(path.join(dir, FIRST_SEGMENT));
  const clear = (dir: string) => fs.rm(path.join(dir, FIRST_SEGMENT), { recursive: true, force: true });

  beforeAll(async () => {
    await fs.mkdir(path.join(runtimeRoot, "isolated-home"), { recursive: true });
    lm = await startFakeLmStudio();
    await launch();
    const native = await modelsOf(NATIVE);
    nativeModel = native.find((id) => id.startsWith(`${NATIVE_KEY}:`)) ?? "";
    expect(nativeModel, `native models: ${native.join(", ")}`).not.toBe("");
    expect(await modelsOf(AGY)).toEqual(expect.arrayContaining([AGY_MODEL]));
  }, 240_000);

  afterAll(async () => {
    try { if (server) await stop(); } finally {
      if (lm) await lm.close();
      await removeOwnedTestRuntime(runtimeRoot, database);
    }
  }, 120_000);

  /** A scripted Antigravity host (a standalone Agent run) that makes real platform tool calls through `CALL_TOOL`. */
  const startHost = async (workspace: string) => {
    await fs.mkdir(workspace, { recursive: true });
    const definition = await agentDefinition("ex-host");
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definition.id, ...launchOf(AGY, AGY_MODEL, workspace), runtimeKind: AGY } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    const call = async (name: string, args: Json, label: string): Promise<Json> => {
      const before = active(findDir(memory("agents"), runId)!).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("CALLED:")).length;
      await talk(agentStream(runId), runId, `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`, label);
      const replies = active(findDir(memory("agents"), runId)!).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("CALLED:"));
      expect(replies.length, `${label}: the host answered`).toBeGreaterThan(before);
      const called = JSON.parse(String(replies.at(-1)!.content).slice("CALLED:".length)) as Json;
      return called.structuredContent ?? JSON.parse(called.content.find((part: Json) => part.type === "text").text) as Json;
    };
    return { runId, call };
  };

  const capsuleOf = (dir: string) => path.join(dir, "agy-project");
  const saveOrg = async (orgRunId: string, address: string, runtimeKind: string, llmModelIdentifier: string) => (await gql(`mutation($input: UpdateStoppedAgentOrgRunConfigInput!) { updateStoppedAgentOrgRunConfig(input: $input) { success outcome message fieldErrors { path message } } }`,
    { input: { orgRunId, teamWorkspacePatches: [], selectionPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: address, runtimeKind, llmModelIdentifier, llmConfig: null }] } })).updateStoppedAgentOrgRunConfig as Json;
  const restoreOrg = async (orgRunId: string) => { const restored = (await gql("mutation($id: String!) { restoreAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId })).restoreAgentOrgRun as Json; expect(restored.success, restored.message).toBe(true); };
  const stopOrg = async (orgRunId: string) => { expect((await gql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id: orgRunId })).terminateAgentOrgRun.success).toBe(true); };

  it("SB-01: an Org member Antigravity -> native -> Antigravity: restart before the third era, a start that fails after the capsule was made, then the retry", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const agent = await agentDefinition("sb-org-member");
    const team = await teamDefinition(agent.id);
    const orgId = (await gql("mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }", { input: {
      name: `sb-org ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.",
      members: [{ memberName: "direct", ref: agent.id, refType: "AGENT", refScope: "SHARED" }, { memberName: "crew", ref: team.id, refType: "AGENT_TEAM", refScope: "SHARED" }], handoffs: [] } })).createAgentOrgDefinition.id as string;
    const created = (await gql("mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }", { input: {
      agentOrgDefinitionId: orgId, rootConfiguration: launchOf(AGY, AGY_MODEL, workspace), agentOverrides: [] } })).createAgentOrgRun as Json;
    expect(created.success, created.message).toBe(true);
    const orgRunId = created.agentOrgRunId as string;
    const tree0 = await treeOf(orgTreeFile(orgRunId));
    const direct = orgAgent(tree0, "/direct").agentRunId as string;
    const worker = orgAgent(tree0, "/crew/worker").agentRunId as string;
    const dir = (runId: string) => findDir(memory("agent_orgs", orgRunId), runId)!;
    const pendingKey = async (address: string, runId: string) => `runtime_switch:${runId}:${orgAgent(await treeOf(orgTreeFile(orgRunId)), address).pendingRuntimeSwitch.switchId}`;

    // era 1: Antigravity (the nested worker too, so a second member's capsule is replaced as well)
    for (const [runId, label] of [[direct, "direct"], [worker, "worker"]] as const) await talk(orgStream(orgRunId), runId, "ECHO_INPUT", `${label} era 1`);
    const era1 = { direct: ids(active(dir(direct))), worker: ids(active(dir(worker))) };
    expect(existsSync(capsuleOf(dir(direct))), "era 1 left its capsule").toBe(true);

    // hop 1: native
    await stopOrg(orgRunId);
    for (const address of ["/direct", "/crew/worker"]) expect(await saveOrg(orgRunId, address, NATIVE, nativeModel), `${address} to native`).toMatchObject({ success: true, outcome: "UPDATED" });
    await restoreOrg(orgRunId);
    const key1 = { direct: await pendingKey("/direct", direct), worker: await pendingKey("/crew/worker", worker) };
    await talk(orgStream(orgRunId), direct, "NATIVE-TURN one.", "direct era 2");
    await talk(orgStream(orgRunId), worker, "NATIVE-TURN one.", "worker era 2");
    expect(switchSegment(dir(direct), key1.direct), "hop 1 I-7").toEqual({ ids: era1.direct, runtimeKind: AGY });
    const era2 = { direct: ids(active(dir(direct))), worker: ids(active(dir(worker))) };
    expect(era2.direct.length).toBeGreaterThan(1);

    // hop 2: back to Antigravity; the server restarts between the save and the message
    await stopOrg(orgRunId);
    for (const address of ["/direct", "/crew/worker"]) expect(await saveOrg(orgRunId, address, AGY, AGY_MODEL), `${address} back to Antigravity`).toMatchObject({ success: true, outcome: "UPDATED" });
    const key2 = { direct: await pendingKey("/direct", direct), worker: await pendingKey("/crew/worker", worker) };
    expect(key2.direct, "a new switch").not.toBe(key1.direct);
    await stop();
    await launch();
    await restoreOrg(orgRunId);
    const stream = orgStream(orgRunId);

    // the direct member: the start fails after the Antigravity candidate made its capsule, then is retried
    const before = activeText(dir(direct));
    // segment 1 exists from hop 1, so the second switch archives into segment 2: a folder of that name makes the real archive step fail
    const secondSegment = path.join(dir(direct), "raw_traces_000002.jsonl");
    await fs.mkdir(secondSegment);
    const failed = await attempt(stream, direct, "ECHO_INPUT");
    expect(failed.completed, "the failed start ends no turn").toBe(false);
    expect(JSON.stringify(failed.acks), "the user is told, and the reason is the archive step (not EEXIST)").toContain("EISDIR");
    expect(JSON.stringify(failed.acks)).not.toContain("EEXIST");
    expect(activeText(dir(direct)), "the previous agent's file is byte-identical after the failure").toBe(before);
    expect(orgAgent(await treeOf(orgTreeFile(orgRunId)), "/direct").pendingRuntimeSwitch, "the switch stays pending").toMatchObject({ switchId: expect.any(String) });
    await fs.rm(secondSegment, { recursive: true, force: true });
    await talk(stream, direct, "ECHO_INPUT", "direct era 3 retry");
    expect(switchSegment(dir(direct), key2.direct), "hop 2 I-7: exactly the native era").toEqual({ ids: era2.direct, runtimeKind: NATIVE });
    expect(markers(dir(direct)), "one marker").toHaveLength(1);
    expect(active(dir(direct))[0], "the marker first").toMatchObject({ sender_id: "system.runtime_handover", correlation_id: key2.direct,
      content: expect.stringMatching(/^Agent runtime changed from AutoByteus \(.+\) to Antigravity CLI \(.+\)\.$/) });
    expect(completeSegments(dir(direct)), "two segments in all, the first unchanged").toHaveLength(2);
    expect(switchSegment(dir(direct), key1.direct)).toEqual({ ids: era1.direct, runtimeKind: AGY });
    expect(echoed(dir(direct)).length, "Antigravity answered in era 3").toBeGreaterThan(0);
    expect(existsSync(capsuleOf(dir(direct))), "a fresh capsule").toBe(true);

    // the nested worker: no failure, plain third era after the restart
    await talk(stream, worker, "ECHO_INPUT", "worker era 3");
    expect(switchSegment(dir(worker), key2.worker), "worker hop 2 I-7").toEqual({ ids: era2.worker, runtimeKind: NATIVE });
    expect(markers(dir(worker))).toHaveLength(1);
    for (const address of ["/direct", "/crew/worker"]) expect(Object.hasOwn(orgAgent(await treeOf(orgTreeFile(orgRunId)), address), "pendingRuntimeSwitch"), `${address}: pending cleared`).toBe(false);
  }, 900_000);

  it("SB-02: a delegated copy Antigravity -> native -> Antigravity", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    const host = await startHost(workspace);
    const writer = await agentDefinition("sb-copy-writer");
    const delegated = await host.call("delegate_task", { recipient_address: `/${segmentName(writer.name)}`, description: "Draft the notes." }, "host delegates");
    expect(delegated.delegated, JSON.stringify(delegated)).toBe(true);
    const copyId = delegated.target_agent_run_id as string;
    const copyDir = () => findDir(memory("agents"), copyId)!;
    await until(() => !!findDir(memory("agents"), copyId) && active(copyDir()).length > 0, "the copy recorded its start", 90_000);
    await host.call("send_message_to", { target_agent_run_id: copyId, content: "ECHO_INPUT" }, "host messages the copy (era 1)");
    await until(() => echoed(copyDir()).length > 0, "the copy answered", 60_000);
    const era1 = ids(active(copyDir()));
    const hop = async (runtimeKind: string, model: string, content: string) => {
      expect((await gql("mutation($input: DelegatedExecutionTargetInput!) { stopDelegatedExecution(input: $input) { success } }", { input: { rootKind: "AGENT", rootRunId: host.runId, agentRunId: copyId } })).stopDelegatedExecution.success).toBe(true);
      expect((await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: host.runId })).terminateAgentRun.success).toBe(true);
      const update = (await gql("mutation($input: UpdateDelegatedLaunchSelectionsInput!) { updateDelegatedLaunchSelections(input: $input) { success outcome message fieldErrors { path message } } }",
        { input: { rootKind: "AGENT", rootRunId: host.runId, changes: [{ agentRunId: copyId, selection: { runtimeKind, llmModelIdentifier: model, llmConfig: null } }] } })).updateDelegatedLaunchSelections as Json;
      expect(update, JSON.stringify(update)).toMatchObject({ success: true, outcome: "UPDATED" });
      await host.call("send_message_to", { target_agent_run_id: copyId, content }, `host wakes the copy with ${runtimeKind}`);
    };
    await hop(NATIVE, nativeModel, "NATIVE-COPY-TURN: carry on.");
    await until(() => markers(copyDir()).length > 0 && active(copyDir()).some((record) => record.trace_type === "user" && String(record.content).includes("NATIVE-COPY-TURN")), "hop 1 switched", 90_000);
    const key1 = markers(copyDir())[0]!.correlation_id as string;
    expect(switchSegment(copyDir(), key1)).toEqual({ ids: era1, runtimeKind: AGY });
    await until(() => active(copyDir()).some((record) => record.trace_type === "assistant"), "the native copy answered", 60_000);
    await wait(1000);
    const era2 = ids(active(copyDir()));
    await hop(AGY, AGY_MODEL, "ECHO_INPUT");
    await until(() => markers(copyDir()).some((record) => record.correlation_id !== key1) && echoed(copyDir()).length > 0, "hop 2 switched back to Antigravity", 90_000);
    const key2 = markers(copyDir())[0]!.correlation_id as string;
    expect(key2).not.toBe(key1);
    expect(markers(copyDir()), "one marker in the new file").toHaveLength(1);
    expect(switchSegment(copyDir(), key2), "hop 2 I-7: exactly the native era").toEqual({ ids: era2, runtimeKind: NATIVE });
    expect(switchSegment(copyDir(), key1), "the first segment is unchanged").toEqual({ ids: era1, runtimeKind: AGY });
    expect(completeSegments(copyDir())).toHaveLength(2);
    expect(active(copyDir())[0]).toMatchObject({ sender_id: "system.runtime_handover", content: expect.stringMatching(/^Agent runtime changed from AutoByteus \(.+\) to Antigravity CLI \(.+\)\.$/) });
  }, 900_000);

  it("SB-03: a Team member Antigravity -> native -> Antigravity with a restart between the save and the message of the third era", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const agent = await agentDefinition("sb-team-member");
    const definition = await teamDefinition(agent.id);
    const created = (await gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }", { input: {
      teamDefinitionId: definition.id, teamConfigs: [{ teamAddress: "/", ...launchOf(AGY, AGY_MODEL, workspace) }],
      memberConfigs: ["lead", "worker"].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: agent.id, ...launchOf(AGY, AGY_MODEL, workspace) })) } })).createAgentTeamRun as Json;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId as string;
    const file = memory("agent_teams", teamRunId, "team_run_execution_tree.json");
    const workerNode = async () => (await treeOf(file)).rootTeam.members.find((entry: Json) => entry.address === "/worker") as Json;
    const worker = (await workerNode()).agentRunId as string;
    const dir = () => findDir(memory("agent_teams", teamRunId), worker)!;
    const save = async (runtimeKind: string, model: string) => (await gql(`mutation($input: UpdateStoppedTeamRunSelectionsInput!) { updateStoppedTeamRunSelections(input: $input) { success outcome message fieldErrors { path message } } }`,
      { input: { teamRunId, selectionPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/worker", runtimeKind, llmModelIdentifier: model, llmConfig: null }] } })).updateStoppedTeamRunSelections as Json;
    const stopTeam = async () => expect((await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: teamRunId })).terminateAgentTeamRun.success).toBe(true);
    await talk(teamStream(teamRunId), worker, "ECHO_INPUT", "worker era 1");
    const era1 = ids(active(dir()));
    await stopTeam();
    expect(await save(NATIVE, nativeModel)).toMatchObject({ success: true, outcome: "UPDATED" });
    const key1 = `runtime_switch:${worker}:${(await workerNode()).pendingRuntimeSwitch.switchId}`;
    await talk(teamStream(teamRunId), worker, "NATIVE-TURN one.", "worker era 2");
    expect(switchSegment(dir(), key1)).toEqual({ ids: era1, runtimeKind: AGY });
    const era2 = ids(active(dir()));
    await stopTeam();
    expect(await save(AGY, AGY_MODEL)).toMatchObject({ success: true, outcome: "UPDATED" });
    const key2 = `runtime_switch:${worker}:${(await workerNode()).pendingRuntimeSwitch.switchId}`;
    expect(key2).not.toBe(key1);
    await stop();
    await launch();
    await talk(teamStream(teamRunId), worker, "ECHO_INPUT", "worker era 3 after the restart");
    expect(switchSegment(dir(), key2), "I-7: exactly the native era").toEqual({ ids: era2, runtimeKind: NATIVE });
    expect(switchSegment(dir(), key1), "the first segment unchanged").toEqual({ ids: era1, runtimeKind: AGY });
    expect(markers(dir())).toHaveLength(1);
    expect(echoed(dir()).length, "Antigravity answered").toBeGreaterThan(0);
    const done = await workerNode();
    expect(Object.hasOwn(done, "pendingRuntimeSwitch")).toBe(false);
    expect(done.launchConfiguration).toMatchObject({ runtimeKind: AGY });
    expect(done.platformAgentRunId, "the new Antigravity era binds its session").toEqual(expect.any(String));
  }, 900_000);
});
