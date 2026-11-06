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

// A registered Agent root follows the saved edit of its stopped host (stopped-run-edit-root-check, FU-008 of autobyteus-348, API/E2E) on the
// BUILT server (`dist/app.js`, test-owned data root, private HOME). Only models are scripted: Antigravity = tests/fixtures/agy-failure-cli.mjs
// (`linked_skills`: `CALL_TOOL:{...}` makes a real platform tool call), native = a test-owned LM Studio stand-in.
//   SRE-01 A scripted host delegates a copy; the host's own Antigravity process is killed (the root and the copy survive: "a host crash does
//          not end the root"); the host's model is edited through `updateStoppedAgentRunSelection` (UPDATED); the surviving copy, messaged
//          through the root, delegates a second copy: it carries the SAVED model, the first copy keeps its started one.
//   SRE-02 Then the host is edited to the native runtime (a pending runtime switch): a third copy inherits the native runtime; the host
//          takes its next input (a copy's report wakes it through the root) and switches: one marker, one segment, pending cleared.
//   SRE-03 While the host is live the edit is refused (RUN_ACTIVE).
// The host's process is killed by pid, found through AGY_FAKE_PROCESS_LOG (each launch logs its cwd, which names the run).
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//     ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs \
//     pnpm exec vitest run tests/e2e/runtime/stopped-run-edit-root-built-server.e2e.test.ts --no-watch

const FAKE_AGY = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const ENABLED = process.env.RUN_AGY_FAILURE_E2E === "1" && path.isAbsolute(FAKE_AGY) && existsSync(FAKE_AGY)
  && spawnSync(FAKE_AGY, ["--version"], { stdio: "ignore" }).status === 0 && existsSync(path.resolve("dist/app.js"));
const AGY = "antigravity_cli";
const NATIVE = "autobyteus";
const AGY_MODEL = "gemini-3.8-flash-low";
const AGY_ALT_MODEL = "sre-alt-model";
const NATIVE_KEY = "sre-native-a";

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
    const chunk = (delta: Json, finish: string | null) => ({ id: `sre-${requests.length}`, object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk({ role: "assistant", content: `NATIVE-REPLY-${requests.length}` }, null))}\n\ndata: ${JSON.stringify(chunk({}, "stop"))}\n\ndata: [DONE]\n\n`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, requests, close: () => { server.closeAllConnections(); return new Promise<void>((resolve) => server.close(() => resolve())); } };
};


describe.runIf(ENABLED)("a registered Agent root follows the saved edit of its stopped host", () => {
  const suffix = `sre-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  const processLog = path.join(runtimeRoot, "agy-process.log");
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
        AGY_FAKE_EXTRA_MODELS: AGY_ALT_MODEL, AGY_FAKE_PROCESS_LOG: processLog },
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

  beforeAll(async () => {
    await fs.mkdir(path.join(runtimeRoot, "isolated-home"), { recursive: true });
    lm = await startFakeLmStudio();
    await launch();
    const native = await modelsOf(NATIVE);
    nativeModel = native.find((id) => id.startsWith(`${NATIVE_KEY}:`)) ?? "";
    expect(nativeModel, `native models: ${native.join(", ")}`).not.toBe("");
    expect(await modelsOf(AGY)).toEqual(expect.arrayContaining([AGY_MODEL, AGY_ALT_MODEL]));
  }, 240_000);

  afterAll(async () => {
    try { if (server) await stop(); } finally {
      if (lm) await lm.close();
      await removeOwnedTestRuntime(runtimeRoot, database);
    }
  }, 120_000);

  const processEvents = (): Json[] => readRaw(processLog);
  const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

  it("SRE-01..03: copies delegated from the registered root after a saved edit of the crashed host carry the saved launch; a runtime change is pending on the host and inherited; a live host refuses the edit", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const hostDefinition = await agentDefinition("sre-host");
    const writer = await agentDefinition("sre-writer");
    // a copy cannot delegate to its own team (the writer's), so the copies it starts later come from another definition
    const helper = await agentDefinition("sre-helper");
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: hostDefinition.id, ...launchOf(AGY, AGY_MODEL, workspace), runtimeKind: AGY } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    const hostId = created.runId as string;
    const hostDir = () => findDir(memory("agents"), hostId)!;
    const toolResult = (replies: Json[], before: number): Json => {
      expect(replies.length, "the agent answered the tool call").toBeGreaterThan(before);
      const called = JSON.parse(String(replies.at(-1)!.content).slice("CALLED:".length)) as Json;
      return called.structuredContent ?? JSON.parse(called.content.find((part: Json) => part.type === "text").text) as Json;
    };
    const callsOf = (dir: string) => active(dir).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("CALLED:"));
    /** The host calls a platform tool (its live stream). */
    const hostCalls = async (name: string, args: Json, label: string): Promise<Json> => {
      const before = callsOf(hostDir()).length;
      await talk(agentStream(hostId), hostId, `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`, label);
      return toolResult(callsOf(hostDir()), before);
    };
    /** A user message to a copy through the host's collaboration stream (the copy chat's composer path); the host is not asked to start. */
    const copyCalls = async (copyId: string, name: string, args: Json, label: string): Promise<Json> => {
      const copyDir = () => findDir(memory("agents"), copyId)!;
      const before = callsOf(copyDir()).length;
      const { socket, messages } = await openSocket({ ...agentStream(hostId), path: `/ws/agent-collaboration/${hostId}` }, label);
      await until(() => messages.some((m) => m.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"), `${label}: root view`, 60_000);
      const id = `e2e-${randomUUID()}`;
      socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent", root_run_id: hostId, target_agent_run_id: copyId, command_id: id,
        content: `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: `agent_run_input:e2e:${id}` } }));
      await until(() => messages.some((m) => m.type === "AGENT_COMMAND_ACK" && m.payload.command_id === id), `${label}: ack (frames: ${messages.map((m) => m.type).join(",")})`, 20_000).catch((error) => { throw new Error(`${error.message} frames=${messages.map((m) => m.type + ":" + JSON.stringify(m.payload).slice(0, 160)).join(" | ")}`); });
      expect(messages.find((m) => m.type === "AGENT_COMMAND_ACK" && m.payload.command_id === id)!.payload.state, `${label}: accepted`).toBe("accepted");
      await until(() => callsOf(copyDir()).length > before, `${label}: the copy answered`, 90_000);
      await wait(300); socket.close();
      return toolResult(callsOf(copyDir()), before);
    };
    const copyLaunches = async (): Promise<Record<string, Json>> => {
      const view = (await gql("query($id: String!) { agentRunCollaboration(runId: $id) }", { id: hostId })).agentRunCollaboration.root_agent.execution_tree as Json;
      return Object.fromEntries((view.taskExecutions as Json[]).filter((entry) => entry.agentRunId).map((entry) => [entry.agentRunId as string, entry.source.launchConfiguration as Json]));
    };
    const hostActive = async () => (await gql("query($id: String!) { getAgentRunResumeConfig(runId: $id) { isActive } }", { id: hostId })).getAgentRunResumeConfig.isActive as boolean;
    const edit = async (runtimeKind: string, llmModelIdentifier: string) => (await gql(`mutation($input: UpdateStoppedAgentRunSelectionInput!) { updateStoppedAgentRunSelection(input: $input) { success outcome message isActive } }`,
      { input: { agentRunId: hostId, runtimeKind, llmModelIdentifier, llmConfig: null } })).updateStoppedAgentRunSelection as Json;

    // the host delegates a first copy: it inherits the host's launch (the writer definition has no default)
    const first = await hostCalls("delegate_task", { recipient_address: `/${segmentName(writer.name)}`, description: "COPY-ONE: answer briefly." }, "host delegates copy one");
    expect(first.delegated, JSON.stringify(first)).toBe(true);
    const copyOne = first.target_agent_run_id as string;
    await until(() => !!findDir(memory("agents"), copyOne) && active(findDir(memory("agents"), copyOne)!).some((record) => record.trace_type === "assistant"), "copy one answered", 90_000);
    expect((await copyLaunches())[copyOne], "copy one started on the host's launch").toMatchObject({ runtimeKind: AGY, llmModelIdentifier: AGY_MODEL });

    // SRE-03 (first half): the host is live, so the edit is refused and nothing changes
    expect(await hostActive(), "the host is live").toBe(true);
    const refused = await edit(AGY, AGY_ALT_MODEL);
    expect(refused, JSON.stringify(refused)).toMatchObject({ success: false, outcome: "RUN_ACTIVE" });

    /** The host's own Antigravity process dies (its cwd names the run): the root and its copies survive. */
    const crashHost = async () => {
      const mine = processEvents().filter((event) => event.event === "launch" && String(event.cwd).includes(hostId) && alive(event.pid as number));
      expect(mine.length, "the host has a running Antigravity process").toBeGreaterThan(0);
      for (const event of mine) process.kill(event.pid as number, "SIGKILL");
      await until(async () => !(await hostActive()), "the host reports offline", 60_000);
    };
    await crashHost();

    // SRE-01: the saved edit reaches the lingering root
    const before = activeText(hostDir());
    const saved = await edit(AGY, AGY_ALT_MODEL);
    expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED" });
    expect(activeText(hostDir()), "a model-only edit writes nothing to the host's traces").toBe(before);
    const second = await copyCalls(copyOne, "delegate_task", { recipient_address: `/${segmentName(helper.name)}`, description: "COPY-TWO: answer briefly." }, "copy one delegates copy two");
    expect(second.delegated, JSON.stringify(second)).toBe(true);
    const copyTwo = second.target_agent_run_id as string;
    const afterEdit = await copyLaunches();
    expect(afterEdit[copyTwo], "copy two carries the SAVED model").toMatchObject({ runtimeKind: AGY, llmModelIdentifier: AGY_ALT_MODEL });
    expect(afterEdit[copyOne], "copy one keeps its started launch").toMatchObject({ runtimeKind: AGY, llmModelIdentifier: AGY_MODEL });
    // the copy's report wakes the host again through the root (no manager call); crash it again for the second edit
    await until(async () => await hostActive(), "the root woke the host", 60_000).catch(() => undefined);
    await crashHost().catch(() => undefined);
    expect(await hostActive(), "the host is offline again").toBe(false);

    // SRE-02: a runtime change is pending on the host and inherited by the next copy; the marker waits for the host's input
    const switched = await edit(NATIVE, nativeModel);
    expect(switched, JSON.stringify(switched)).toMatchObject({ success: true, outcome: "UPDATED" });
    const hostMeta = JSON.parse(await fs.readFile(path.join(hostDir(), "run_metadata.json"), "utf8")) as Json;
    expect(hostMeta, "the host holds a pending switch from Antigravity").toMatchObject({ runtimeKind: NATIVE, pendingRuntimeSwitch: { from: { runtimeKind: AGY } } });
    const third = await copyCalls(copyOne, "delegate_task", { recipient_address: `/${segmentName(helper.name)}`, description: "COPY-THREE: answer briefly." }, "copy one delegates copy three");
    expect(third.delegated, JSON.stringify(third)).toBe(true);
    const copyThree = third.target_agent_run_id as string;
    expect((await copyLaunches())[copyThree], "copy three inherits the new runtime").toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: nativeModel });
    // The marker is written only when the host takes its next input; here it is copy three's report that wakes the host through the root.
    await until(() => markers(hostDir()).length > 0, "the host's next input switched it", 120_000);
    expect(markers(hostDir()), "one marker").toHaveLength(1);
    expect(completeSegments(hostDir()), "one segment").toHaveLength(1);
    expect(completeSegments(hostDir())[0], "the segment holds the Antigravity agent").toMatchObject({ boundary_type: "runtime_switch", runtime_kind: AGY });
    const done = JSON.parse(await fs.readFile(path.join(hostDir(), "run_metadata.json"), "utf8")) as Json;
    expect(Object.hasOwn(done, "pendingRuntimeSwitch"), "the switch is committed").toBe(false);
    expect(done).toMatchObject({ runtimeKind: NATIVE });
  }, 600_000);
});
