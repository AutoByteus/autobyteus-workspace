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

// Agent runtime switch of Org members and delegated copies beyond runtime-switch-members-built-server (autobyteus-348, API/E2E):
// failed starts, restarts, Grok and native targets, and Team copies activated in different orders, on the BUILT server
// (`dist/app.js`, test-owned data root, private HOME). Only models are scripted: native = a test-owned LM Studio stand-in,
// Antigravity = tests/fixtures/agy-failure-cli.mjs (`linked_skills`: `ECHO_INPUT` answers with the exact input of the turn,
// `CALL_TOOL:{…}` calls a real platform tool), Grok = tests/fixtures/grok-acp/fake-grok-cli.mjs replaying `prompt.jsonl`.
// Cases:
//   EX-01 Org members (AGY -> native, AGY -> Grok): a direct Agent and an Agent of a mounted Team in one save. The native member's
//         start fails after its candidate wrote its instruction (the archive step is obstructed): its file is byte-identical,
//         its switch stays pending, the other member is untouched; after the retry one marker and one segment holding only the
//         Antigravity agent's records (I-7). The Grok member switches under the same rules: its captured instructions belong to the
//         new file (I-7).
//   EX-02 an agent COPY (AGY -> native): the choice is saved, the server restarts before the first message, the first message
//         fails after the candidate wrote its instruction (obstructed), the file is byte-identical, the retry completes with one
//         marker and one segment (I-7).
//   EX-03 a Team COPY with a Team-level choice of another runtime, two copies of one definition woken in opposite orders:
//         each member switches at its own first input with its own segment and marker; a member that never ran starts plainly.
//   EX-04 a configured Team's default runtime edit with its linked members in one save (the `CONFIGURED_TEAM` scope plus a patch per
//         member, as the web draft planner sends them): each member holds its own pending switch; they switch at their own first
//         input, lead-first in one Team and worker-first in another; the member not yet woken stays pending and untouched.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist). Run:
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//     ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs \
//     pnpm exec vitest run tests/e2e/runtime/runtime-switch-members-extended-built-server.e2e.test.ts --no-watch

const FAKE_AGY = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const FAKE_GROK = path.resolve("tests/fixtures/grok-acp/fake-grok-cli.mjs");
const GROK_FIXTURE = path.resolve("tests/fixtures/grok-acp/prompt.jsonl");
const ENABLED = process.env.RUN_AGY_FAILURE_E2E === "1" && path.isAbsolute(FAKE_AGY) && existsSync(FAKE_AGY)
  && spawnSync(FAKE_AGY, ["--version"], { stdio: "ignore" }).status === 0 && existsSync(path.resolve("dist/app.js")) && existsSync(FAKE_GROK);
const AGY = "antigravity_cli";
const NATIVE = "autobyteus";
const GROK = "grok_build";
const AGY_MODEL = "gemini-3.8-flash-low";
const GROK_MODEL = "grok-4.7";
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

describe.runIf(ENABLED)("agent runtime switch of Org members and delegated copies: failed starts, restarts, Grok and native targets", () => {
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
      environment: { HOME: path.join(runtimeRoot, "isolated-home"), LMSTUDIO_HOSTS: lm.origin, ANTIGRAVITY_CLI_COMMAND: FAKE_AGY, AGY_FAKE_CASE: "linked_skills",
        GROK_BUILD_COMMAND: path.join(runtimeRoot, "fake-grok"), FAKE_ACP_FIXTURE: GROK_FIXTURE, FAKE_ACP_REPORT_MCP_READY: "1" },
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
    await fs.writeFile(path.join(runtimeRoot, "fake-grok"), `#!/bin/sh\nexec "${process.execPath}" "${FAKE_GROK}" "$@"\n`, { mode: 0o755 });
    lm = await startFakeLmStudio();
    await launch();
    const native = await modelsOf(NATIVE);
    nativeModel = native.find((id) => id.startsWith(`${NATIVE_KEY}:`)) ?? "";
    expect(nativeModel, `native models: ${native.join(", ")}`).not.toBe("");
    expect(await modelsOf(AGY)).toEqual(expect.arrayContaining([AGY_MODEL]));
    expect(await modelsOf(GROK)).toEqual(expect.arrayContaining([GROK_MODEL]));
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

  it("EX-01: Org members: a native target whose start fails after its instruction was written and is retried, and a Grok target; I-7 on both archived segments", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const agent = await agentDefinition("ex-org-member");
    const team = await teamDefinition(agent.id);
    const orgId = (await gql("mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }", { input: {
      name: `ex-org ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.",
      members: [{ memberName: "direct", ref: agent.id, refType: "AGENT", refScope: "SHARED" }, { memberName: "crew", ref: team.id, refType: "AGENT_TEAM", refScope: "SHARED" }], handoffs: [] } })).createAgentOrgDefinition.id as string;
    const created = (await gql("mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }", { input: {
      agentOrgDefinitionId: orgId, rootConfiguration: launchOf(AGY, AGY_MODEL, workspace), agentOverrides: [] } })).createAgentOrgRun as Json;
    expect(created.success, created.message).toBe(true);
    const orgRunId = created.agentOrgRunId as string;
    const startTree = await treeOf(orgTreeFile(orgRunId));
    const direct = orgAgent(startTree, "/direct").agentRunId as string;
    const worker = orgAgent(startTree, "/crew/worker").agentRunId as string;
    const lead = orgAgent(startTree, "/crew/lead").agentRunId as string;
    const stream = orgStream(orgRunId);
    const dir = (runId: string) => findDir(memory("agent_orgs", orgRunId), runId)!;

    for (const [runId, label] of [[direct, "direct"], [worker, "worker"], [lead, "lead"]] as const) await talk(stream, runId, "ECHO_INPUT", `${label} antigravity turn`);
    const agyDirect = ids(active(dir(direct)));
    const agyWorker = ids(active(dir(worker)));
    const leadBefore = activeText(dir(lead));
    expect(agyDirect.length).toBeGreaterThan(1);

    expect((await gql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id: orgRunId })).terminateAgentOrgRun.success).toBe(true);
    const saved = (await gql(`mutation($input: UpdateStoppedAgentOrgRunConfigInput!) { updateStoppedAgentOrgRunConfig(input: $input) { success outcome message fieldErrors { path message } } }`, { input: {
      orgRunId, teamWorkspacePatches: [], selectionPatches: [
        { scopeKind: "CONFIGURED_AGENT", scopeAddress: "/direct", runtimeKind: NATIVE, llmModelIdentifier: nativeModel, llmConfig: null },
        { scopeKind: "CONFIGURED_AGENT", scopeAddress: "/crew/worker", runtimeKind: GROK, llmModelIdentifier: GROK_MODEL, llmConfig: null }] } })).updateStoppedAgentOrgRunConfig as Json;
    expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pendingTree = await treeOf(orgTreeFile(orgRunId));
    const keyOf = (address: string, runId: string) => `runtime_switch:${runId}:${orgAgent(pendingTree, address).pendingRuntimeSwitch.switchId}`;
    expect(orgAgent(pendingTree, "/direct")).toMatchObject({ launchConfiguration: expect.objectContaining({ runtimeKind: NATIVE }), platformAgentRunId: null });
    expect(orgAgent(pendingTree, "/crew/worker")).toMatchObject({ launchConfiguration: expect.objectContaining({ runtimeKind: GROK }), platformAgentRunId: null });
    const restored = (await gql("mutation($id: String!) { restoreAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId })).restoreAgentOrgRun as Json;
    expect(restored.success, restored.message).toBe(true);

    // --- the native member: the start fails after the native candidate wrote its instruction
    const directBefore = activeText(dir(direct));
    await obstruct(dir(direct));
    const failed = await attempt(stream, direct, "NATIVE-ORG-TURN: carry on.");
    expect(failed.completed, "the failed start ends no turn").toBe(false);
    expect(failed.acks.some((ack) => ack.state !== "accepted" && typeof ack.code === "string"), `the user is told: ${JSON.stringify(failed.acks).slice(0, 400)}`).toBe(true);
    expect(JSON.stringify(failed.acks), "the reason names the failing archive step").toContain("EISDIR");
    expect(activeText(dir(direct)), "the previous agent's file is byte-identical after the failure").toBe(directBefore);
    expect(completeSegments(dir(direct)), "no complete segment").toEqual([]);
    const stillPending = orgAgent(await treeOf(orgTreeFile(orgRunId)), "/direct");
    expect(stillPending.pendingRuntimeSwitch, "the switch stays pending").toMatchObject({ switchId: orgAgent(pendingTree, "/direct").pendingRuntimeSwitch.switchId });
    expect(stillPending.platformAgentRunId).toBeNull();
    expect(activeText(dir(lead)), "an unrelated member did not move").toBe(leadBefore);
    await clear(dir(direct));
    await talk(stream, direct, "NATIVE-ORG-TURN: carry on.", "direct native retry");
    expect(switchSegment(dir(direct), keyOf("/direct", direct)), "I-7 (native target): exactly the Antigravity agent's records").toEqual({ ids: agyDirect, runtimeKind: AGY });
    let records = active(dir(direct));
    expect(records[0], "I-3: the marker first").toMatchObject({ sender_id: "system.runtime_handover", correlation_id: keyOf("/direct", direct),
      content: expect.stringMatching(/^Agent runtime changed from Antigravity CLI \(.+\) to AutoByteus \(.+\)\.$/) });
    expect(markers(dir(direct)), "I-5: one marker").toHaveLength(1);
    expect(records[1], "the native instruction follows the marker").toMatchObject({ trace_type: "system_instruction" });
    expect(records.filter((record) => record.trace_type === "system_instruction"), "once, not once per attempt").toHaveLength(1);
    expect(completeSegments(dir(direct)), "one segment after the retry").toHaveLength(1);

    // --- the Grok member of the mounted Team
    await talk(stream, worker, "GROK-ORG-TURN: carry on.", "worker grok first turn");
    expect(switchSegment(dir(worker), keyOf("/crew/worker", worker)), "I-7 (Grok target): exactly the Antigravity agent's records").toEqual({ ids: agyWorker, runtimeKind: AGY });
    records = active(dir(worker));
    expect(records[0], "I-3 (Grok)").toMatchObject({ sender_id: "system.runtime_handover", correlation_id: keyOf("/crew/worker", worker),
      content: expect.stringMatching(/^Agent runtime changed from Antigravity CLI \(.+\) to Grok Build \(.+\)\.$/) });
    expect(markers(dir(worker)), "I-5 (Grok)").toHaveLength(1);
    expect(records.filter((record) => record.trace_type === "system_instruction"), "Grok's captured instructions are in the new file, once").toHaveLength(1);
    const doneTree = await treeOf(orgTreeFile(orgRunId));
    for (const address of ["/direct", "/crew/worker"]) {
      expect(Object.hasOwn(orgAgent(doneTree, address), "pendingRuntimeSwitch"), `${address}: pending cleared`).toBe(false);
    }
    // A native agent binds no external provider session (the commit carries `platformAgentRunId|null`); Grok binds its session.
    expect(orgAgent(doneTree, "/direct").platformAgentRunId, "native member: no external session").toBeNull();
    expect(orgAgent(doneTree, "/crew/worker").platformAgentRunId, "Grok member: session set").toEqual(expect.any(String));
    expect(orgAgent(doneTree, "/direct").launchConfiguration).toMatchObject({ runtimeKind: NATIVE });
    expect(orgAgent(doneTree, "/crew/worker").launchConfiguration).toMatchObject({ runtimeKind: GROK });
    expect(activeText(dir(lead)), "the unrelated member never moved").toBe(leadBefore);
    expect(completeSegments(dir(lead))).toEqual([]);
  }, 600_000);

  it("EX-02: an agent copy AGY -> native: the server restarts after the save, the first message fails after the candidate wrote its instruction, the retry completes with one marker and one segment", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    const host = await startHost(workspace);
    const writer = await agentDefinition("ex-copy-writer");
    const delegated = await host.call("delegate_task", { recipient_address: `/${segmentName(writer.name)}`, description: "Draft the notes." }, "host delegates an agent");
    expect(delegated.delegated, JSON.stringify(delegated)).toBe(true);
    const copyRunId = delegated.target_agent_run_id as string;
    await until(() => !!findDir(memory("agents"), copyRunId) && active(findDir(memory("agents"), copyRunId)!).length > 0, "the copy recorded its start", 90_000);
    const copyDir = () => findDir(memory("agents"), copyRunId)!;
    await host.call("send_message_to", { target_agent_run_id: copyRunId, content: "ECHO_INPUT" }, "host messages the copy");
    await until(() => echoed(copyDir()).length > 0, "the copy answered", 60_000);
    const agyIds = ids(active(copyDir()));

    const stopped = (await gql("mutation($input: DelegatedExecutionTargetInput!) { stopDelegatedExecution(input: $input) { success outcome } }", { input: { rootKind: "AGENT", rootRunId: host.runId, agentRunId: copyRunId } })).stopDelegatedExecution;
    expect(stopped).toMatchObject({ success: true });
    expect((await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: host.runId })).terminateAgentRun.success).toBe(true);
    const copyBefore = activeText(copyDir());
    const update = (await gql("mutation($input: UpdateDelegatedLaunchSelectionsInput!) { updateDelegatedLaunchSelections(input: $input) { success outcome message fieldErrors { path message } } }",
      { input: { rootKind: "AGENT", rootRunId: host.runId, changes: [{ agentRunId: copyRunId, selection: { runtimeKind: NATIVE, llmModelIdentifier: nativeModel, llmConfig: null } }] } })).updateDelegatedLaunchSelections as Json;
    expect(update, JSON.stringify(update)).toMatchObject({ success: true, outcome: "UPDATED" });
    expect(activeText(copyDir()), "the save changed no raw trace of the copy").toBe(copyBefore);
    expect(completeSegments(copyDir()), "nothing archived by the save").toEqual([]);

    // restart between the save and the first message: the choice is on disk and the copy still has its pending switch
    await stop();
    await launch();
    expect(activeText(copyDir()), "the restart changed no raw trace").toBe(copyBefore);

    // The host is restored by its first message; it wakes the copy, whose switch fails after the native candidate wrote its instruction.
    await obstruct(copyDir());
    const hostStream = agentStream(host.runId);
    const hostAttempt = async (content: string) => { const { socket, messages } = await openSocket(hostStream, "host"); hostStream.send(socket, host.runId, content); await until(() => messages.some((m) => hostStream.turnEnded(m, host.runId) || hostStream.failed(m)), "host turn end", 120_000); await wait(500); socket.close(); };
    const wake = `CALL_TOOL:${JSON.stringify({ name: "send_message_to", arguments: { target_agent_run_id: copyRunId, content: "NATIVE-COPY-TURN: carry on." } })}`;
    await hostAttempt(wake);
    await wait(4000);
    expect(activeText(copyDir()), "the previous agent's file is byte-identical after the failed start").toBe(copyBefore);
    expect(completeSegments(copyDir()), "no complete segment").toEqual([]);
    expect(markers(copyDir()), "no marker").toEqual([]);

    await clear(copyDir());
    await hostAttempt(wake);
    await until(() => markers(copyDir()).length > 0 && active(copyDir()).some((record) => record.trace_type === "user" && String(record.content).includes("NATIVE-COPY-TURN")), "the retried switch", 90_000);
    const key = markers(copyDir())[0]!.correlation_id as string;
    expect(markers(copyDir()), "I-5: one marker").toHaveLength(1);
    expect(switchSegment(copyDir(), key), "I-7: exactly the Antigravity agent's records").toEqual({ ids: agyIds, runtimeKind: AGY });
    const records = active(copyDir());
    expect(records[0], "I-3").toMatchObject({ sender_id: "system.runtime_handover", content: expect.stringMatching(/^Agent runtime changed from Antigravity CLI \(.+\) to AutoByteus \(.+\)\.$/) });
    expect(records[1], "the native instruction follows the marker").toMatchObject({ trace_type: "system_instruction" });
    expect(records.filter((record) => record.trace_type === "system_instruction")).toHaveLength(1);
    expect(completeSegments(copyDir()), "one segment").toHaveLength(1);
  }, 600_000);

  it("EX-03: Team copies with a Team-level choice of another runtime, woken in different orders: each member switches at its own first input with its own segment and marker; a member that never ran starts plainly", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    const host = await startHost(workspace);
    const member = await agentDefinition("ex-copy-member");
    const duo = await teamDefinition(member.id);
    type Copy = { teamRunId: string; lead: string; worker: string };
    const delegate = async (label: string): Promise<Copy> => {
      const result = await host.call("delegate_task", { recipient_address: `/${segmentName(duo.name)}`, description: "Review the notes." }, `host delegates Team copy ${label}`);
      expect(result.delegated, JSON.stringify(result)).toBe(true);
      const teamRunId = result.target_team_run_id as string;
      const tree = (await gql("query($id: String!) { agentRunCollaboration(runId: $id) }", { id: host.runId })).agentRunCollaboration.root_agent.execution_tree as Json;
      const execution = (tree.taskExecutions as Json[]).find((entry) => entry.teamRunId === teamRunId)!;
      const byName = (name: string) => (execution.members as Json[]).find((entry) => String(entry.address).endsWith(`/${name}`))!.agentRunId as string;
      return { teamRunId, lead: byName("lead"), worker: byName("worker") };
    };
    const dirOf = (runId: string) => findDir(memory(), runId)!;
    const startMember = async (runId: string, label: string) => {
      await until(() => !!findDir(memory(), runId) && active(dirOf(runId)).length > 0, `${label} recorded`, 90_000);
    };
    const ran = async (runId: string, label: string) => {
      await host.call("send_message_to", { target_agent_run_id: runId, content: "ECHO_INPUT" }, `host messages ${label}`);
      await until(() => !!findDir(memory(), runId) && echoed(dirOf(runId)).length > 0, `${label} answered`, 90_000);
    };
    const one = await delegate("one");
    const two = await delegate("two");
    const three = await delegate("three");
    for (const [copy, name] of [[one, "one"], [two, "two"], [three, "three"]] as const) await startMember(copy.lead, `lead ${name}`);
    await ran(one.lead, "lead one"); await ran(one.worker, "worker one");
    await ran(two.lead, "lead two"); await ran(two.worker, "worker two");
    await ran(three.lead, "lead three");   // the worker of copy three never runs
    const agyBefore = Object.fromEntries([one, two, three].flatMap((copy, i) => [[`lead${i + 1}`, ids(active(dirOf(copy.lead)))], ...(i < 2 ? [[`worker${i + 1}`, ids(active(dirOf(copy.worker)))]] : [])]));
    expect(findDir(memory(), three.worker), "the worker of copy three never ran: it has no memory folder").toBeNull();

    for (const copy of [one, two, three]) {
      const stopped = (await gql("mutation($input: DelegatedExecutionTargetInput!) { stopDelegatedExecution(input: $input) { success outcome } }", { input: { rootKind: "AGENT", rootRunId: host.runId, teamRunId: copy.teamRunId } })).stopDelegatedExecution;
      expect(stopped, JSON.stringify(stopped)).toMatchObject({ success: true });
    }
    const update = (await gql("mutation($input: UpdateDelegatedLaunchSelectionsInput!) { updateDelegatedLaunchSelections(input: $input) { success outcome message fieldErrors { path message } } }",
      { input: { rootKind: "AGENT", rootRunId: host.runId, changes: [one, two, three].map((copy) => ({ teamRunId: copy.teamRunId, selection: { runtimeKind: NATIVE, llmModelIdentifier: nativeModel, llmConfig: null } })) } })).updateDelegatedLaunchSelections as Json;
    expect(update, JSON.stringify(update)).toMatchObject({ success: true, outcome: "UPDATED" });

    const switched = async (runId: string, label: string, previous: string[]) => {
      await until(() => !!findDir(memory(), runId) && markers(dirOf(runId)).length > 0, `${label} switched`, 90_000);
      const dir = dirOf(runId);
      expect(markers(dir), `${label}: one marker`).toHaveLength(1);
      expect(switchSegment(dir, markers(dir)[0]!.correlation_id as string), `${label}: I-7`).toEqual({ ids: previous, runtimeKind: AGY });
      expect(active(dir)[0], `${label}: I-3`).toMatchObject({ sender_id: "system.runtime_handover",
        content: expect.stringMatching(/^Agent runtime changed from Antigravity CLI \(.+\) to AutoByteus \(.+\)\.$/) });
      expect(completeSegments(dir), `${label}: one segment`).toHaveLength(1);
    };
    const wake = (runId: string, label: string) => host.call("send_message_to", { target_agent_run_id: runId, content: `NATIVE-${label}: carry on.` }, `host wakes ${label}`);
    // copy one: lead first, then worker; copy two: worker first, then lead
    await wake(one.lead, "lead-one"); await switched(one.lead, "lead one", agyBefore.lead1!);
    await wake(one.worker, "worker-one"); await switched(one.worker, "worker one", agyBefore.worker1!);
    await wake(two.worker, "worker-two"); await switched(two.worker, "worker two", agyBefore.worker2!);
    await wake(two.lead, "lead-two"); await switched(two.lead, "lead two", agyBefore.lead2!);
    // copy three: the worker that never ran starts plainly on the new runtime (no marker, no segment); the lead switches
    await wake(three.worker, "worker-three");
    await until(() => !!findDir(memory(), three.worker) && active(dirOf(three.worker)).some((record) => record.trace_type === "user" && String(record.content).includes("NATIVE-worker-three")), "worker three started", 90_000);
    expect(markers(dirOf(three.worker)), "REQ-005: no marker for a member that never ran").toEqual([]);
    expect(completeSegments(dirOf(three.worker)), "REQ-005: nothing archived").toEqual([]);
    expect(active(dirOf(three.worker)).some((record) => record.trace_type === "system_instruction"), "it started as a native agent (its own instruction)").toBe(true);
    await wake(three.lead, "lead-three"); await switched(three.lead, "lead three", agyBefore.lead3!);
    // the host's saved tree records the Team-level choice for every copy
    const saved = JSON.stringify((await gql("query($id: String!) { agentRunCollaboration(runId: $id) }", { id: host.runId })).agentRunCollaboration);
    expect((saved.match(new RegExp(`"(runtimeKind|runtime_kind)":"${NATIVE}"`, "g")) ?? []).length, "the Team-level runtime choice is recorded").toBeGreaterThan(0);
  }, 900_000);

  it("EX-04: a configured Team's default runtime edit with its linked members, in one save: every member switches at its own first input, activated lead-first in one Team and worker-first in another", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const agent = await agentDefinition("ex-team-member");
    const definition = await teamDefinition(agent.id);
    const makeTeam = async () => {
      const created = (await gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }", { input: {
        teamDefinitionId: definition.id, teamConfigs: [{ teamAddress: "/", ...launchOf(AGY, AGY_MODEL, workspace) }],
        memberConfigs: ["lead", "worker"].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: agent.id, ...launchOf(AGY, AGY_MODEL, workspace) })) } })).createAgentTeamRun as Json;
      expect(created.success, created.message).toBe(true);
      const teamRunId = created.teamRunId as string;
      const file = memory("agent_teams", teamRunId, "team_run_execution_tree.json");
      const tree = await treeOf(file);
      const member = (address: string) => tree.rootTeam.members.find((entry: Json) => entry.address === address).agentRunId as string;
      const lead = member("/lead"); const worker = member("/worker");
      for (const [runId, label] of [[lead, "lead"], [worker, "worker"]] as const) await talk(teamStream(teamRunId), runId, "ECHO_INPUT", `${label} antigravity turn`);
      const dir = (runId: string) => findDir(memory("agent_teams", teamRunId), runId)!;
      return { teamRunId, file, lead, worker, dir, before: { lead: ids(active(dir(lead))), worker: ids(active(dir(worker))) } };
    };
    const lead1 = await makeTeam();
    const worker1 = await makeTeam();
    for (const team of [lead1, worker1]) {
      expect((await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: team.teamRunId })).terminateAgentTeamRun.success).toBe(true);
      const saved = (await gql(`mutation($input: UpdateStoppedTeamRunSelectionsInput!) { updateStoppedTeamRunSelections(input: $input) { success outcome message fieldErrors { path message } } }`, { input: { teamRunId: team.teamRunId,
        selectionPatches: [{ scopeKind: "CONFIGURED_TEAM", scopeAddress: "/", runtimeKind: NATIVE, llmModelIdentifier: nativeModel, llmConfig: null },
          ...["/lead", "/worker"].map((scopeAddress) => ({ scopeKind: "CONFIGURED_AGENT", scopeAddress, runtimeKind: NATIVE, llmModelIdentifier: nativeModel, llmConfig: null }))] } })).updateStoppedTeamRunSelections as Json;
      expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED" });
      const tree = await treeOf(team.file);
      expect(tree.rootTeam.defaultLaunchConfiguration, "the Team default carries the new runtime").toMatchObject({ runtimeKind: NATIVE });
      for (const address of ["/lead", "/worker"]) {
        expect(tree.rootTeam.members.find((entry: Json) => entry.address === address), `${address}: a pending switch each`).toMatchObject({
          launchConfiguration: expect.objectContaining({ runtimeKind: NATIVE }), platformAgentRunId: null, pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: AGY }) } });
      }
      expect(ids(active(team.dir(team.lead))), "the save changed no raw trace").toEqual(team.before.lead);
    }
    const pendingKey = async (team: typeof lead1, address: string, runId: string) =>
      `runtime_switch:${runId}:${(await treeOf(team.file)).rootTeam.members.find((entry: Json) => entry.address === address).pendingRuntimeSwitch.switchId}`;
    for (const [team, order] of [[lead1, ["lead", "worker"]], [worker1, ["worker", "lead"]]] as const) {
      const keys = { lead: await pendingKey(team, "/lead", team.lead), worker: await pendingKey(team, "/worker", team.worker) };
      for (const name of order) {
        const runId = team[name];
        await talk(teamStream(team.teamRunId), runId, "NATIVE-DEFAULT: carry on.", `${name} native first turn`);
        expect(switchSegment(team.dir(runId), keys[name]), `${name} (${order.join("→")}): I-7`).toEqual({ ids: team.before[name], runtimeKind: AGY });
        expect(markers(team.dir(runId)), `${name}: one marker`).toHaveLength(1);
        expect(active(team.dir(runId))[0], `${name}: I-3`).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: keys[name],
          content: expect.stringMatching(/^Agent runtime changed from Antigravity CLI \(.+\) to AutoByteus \(.+\)\.$/) });
        // the member not yet woken is still pending and untouched
        const other = order.find((entry) => entry !== name)!;
        const tree = await treeOf(team.file);
        const otherNode = tree.rootTeam.members.find((entry: Json) => entry.address === `/${other}`);
        if (name === order[0]) {
          expect(Object.hasOwn(otherNode, "pendingRuntimeSwitch"), `${other} is still pending after ${name} switched`).toBe(true);
          expect(completeSegments(team.dir(team[other])), `${other} untouched`).toEqual([]);
        } else {
          expect(Object.hasOwn(otherNode, "pendingRuntimeSwitch"), "both done: no pending left").toBe(false);
        }
      }
    }
  }, 900_000);
});
