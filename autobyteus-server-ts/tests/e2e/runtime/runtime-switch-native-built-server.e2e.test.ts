import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// Agent runtime switch to and from the NATIVE runtime and to Grok, the stopped-run settings, a failed attempt and a server
// restart, on the BUILT server (autobyteus-316: REQ-001, REQ-002, REQ-010, REQ-011, REQ-013, REQ-014; AC-001, AC-002, AC-009,
// AC-010; invariants I-3, I-5, I-7, I-8, I-10, I-11). The server is `dist/app.js` as a child process on a synthesized data root
// with a private HOME and database. Only models are scripted:
//   - the native runtime talks to a test-owned HTTP endpoint that answers LM Studio's model list and chat completions
//     (`LMSTUDIO_HOSTS=<origin>`), so the real native agent, its memory recording and its prompt run;
//   - Antigravity is the scripted CLI tests/fixtures/agy-failure-cli.mjs (case `linked_skills`: a plain message is answered
//     `OK`, `ECHO_INPUT` answers with the exact input of the turn, `CALL_TOOL:{…}` calls a real platform tool);
//   - Grok is the recorded-traffic fake CLI tests/fixtures/grok-acp/fake-grok-cli.mjs replaying `prompt.jsonl`.
// A candidate writes a record of its own while it prepares (a native agent's system instruction, Grok's captured instructions).
// The switch archives the records through the watermark (the last record the previous agent wrote), so the candidate's record
// belongs to the new file and never to the previous agent's segment; a failed attempt removes it again.
// Cases:
//   RS-01 native -> Antigravity -> native on one run: each archived segment holds exactly the previous agent's records (I-7), the
//         native candidate's own instruction follows the marker in the new file, one marker per switch (I-5), the notice
//         comes before the user's text, once; journal files carry their own runtime; the reopened chat shows the earlier
//         conversation and every marker (I-10).
//   RS-02 settings: save a switch (pending field, session binding dropped, nothing archived), undo it (the original
//         session ID returns, the field is cleared), switch again, edit only the model while the switch is pending (the
//         switch stays), refuse a running run, then the first message makes the switch.
//   RS-03 a host with a delegated copy: one Save carries the host's own runtime and the copy's model; the copy keeps its
//         runtime; the delegated copy itself cannot switch runtime (REQ-013).
//   RS-04 a server restart: a pending switch survives it; a switch that was activated (marker first, no user record yet)
//         still delivers its notice with the first input after the restart, once (I-11, derived from the raw traces).
//   RS-05 a failed attempt: the archive step fails after the native candidate wrote its instruction; the previous agent's file
//         is exactly as before, the switch stays pending, and the retry completes with one marker and one segment (I-7).
//   RS-06 Grok as the switch target, with the same failed attempt and retry.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist). Run:
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//     ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts --no-watch
// Optional: RUNTIME_SWITCH_NATIVE_EVIDENCE_DIR=<dir> copies the native pair's manifest, metadata, markers and journals.

const FAKE_AGY = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const ENABLED = process.env.RUN_AGY_FAILURE_E2E === "1" && path.isAbsolute(FAKE_AGY) && existsSync(FAKE_AGY)
  && spawnSync(FAKE_AGY, ["--version"], { stdio: "ignore" }).status === 0 && existsSync(path.resolve("dist/app.js"));
const EVIDENCE_DIR = process.env.RUNTIME_SWITCH_NATIVE_EVIDENCE_DIR?.trim() || "";
const AGY = "antigravity_cli";
const NATIVE = "autobyteus";
const AGY_MODEL = "gemini-3.8-flash-low";
const AGY_ALT = "rs-alt-model";
const NATIVE_KEY = "rs-native-a";
const NATIVE_KEY_B = "rs-native-b";
const GROK = "grok_build";
const GROK_MODEL = "grok-4.7";
const FAKE_GROK_SCRIPT = path.resolve("tests/fixtures/grok-acp/fake-grok-cli.mjs");
const GROK_FIXTURE = path.resolve("tests/fixtures/grok-acp/prompt.jsonl");

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

/** A stand-in for LM Studio: model list on GET, a streamed chat completion on POST; it records every request body. */
const startFakeLmStudio = async () => {
  const requests: Json[] = [];
  const server: Server = createServer(async (req, res) => {
    if (req.method === "GET") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [NATIVE_KEY, NATIVE_KEY_B].map((key) => ({ key, max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] })) }));
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw) as Json;
    requests.push(body);
    const chunk = (delta: Json, finish: string | null) => ({ id: `rs-${requests.length}`, object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk({ role: "assistant", content: `NATIVE-REPLY-${requests.length}` }, null))}\n\ndata: ${JSON.stringify(chunk({}, "stop"))}\n\ndata: [DONE]\n\n`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, requests, close: () => { server.closeAllConnections(); return new Promise<void>((resolve) => server.close(() => resolve())); } };
};

describe.runIf(ENABLED)("agent runtime switch, native runtime and stopped-run settings on the built server", () => {
  let root = "";
  let child: ChildProcess;
  let origin = "";
  let logs = "";
  let lm: Awaited<ReturnType<typeof startFakeLmStudio>>;
  let nativeModel = "";
  let nativeModelB = "";
  const sockets: WebSocket[] = [];
  const runIds: string[] = [];
  const memory = (...parts: string[]) => path.join(root, "memory", ...parts);
  const runDir = (runId: string) => memory("agents", runId);

  const gql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const modelsOf = async (runtimeKind: string): Promise<string[]> =>
    (await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }", { runtimeKind }))
      .providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
  const definition = async (name: string) => (await gql<{ createAgentDefinition: { id: string } }>(
    "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
    { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: "runtime switch built-server E2E", instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id;
  const createRun = async (agentDefinitionId: string, runtimeKind: string, llmModelIdentifier: string) => {
    const workspace = path.join(root, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const created = (await gql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId, workspaceRootPath: workspace, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, runtimeKind } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    runIds.push(created.runId!);
    return created.runId!;
  };
  const terminate = async (runId: string) => expect((await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId })).terminateAgentRun.success).toBe(true);
  const SAVE = `mutation($input: UpdateStoppedAgentRunSelectionInput!) { updateStoppedAgentRunSelection(input: $input) { success outcome message fieldErrors { path message } canonicalSelection { runtimeKind llmModelIdentifier } } }`;
  const save = async (agentRunId: string, runtimeKind: string, llmModelIdentifier: string) =>
    (await gql(SAVE, { input: { agentRunId, runtimeKind, llmModelIdentifier, llmConfig: null } })).updateStoppedAgentRunSelection as Json;
  const metadata = async (runId: string) => JSON.parse(await fs.readFile(path.join(runDir(runId), "run_metadata.json"), "utf8")) as Json;
  const manifest = async (runId: string) => JSON.parse(await fs.readFile(path.join(runDir(runId), "raw_traces_manifest.json"), "utf8")) as { segments: Json[] };
  const activeRecords = (runId: string) => readRaw(path.join(runDir(runId), "raw_traces_active.jsonl"));
  const journalManifest = async (runId: string) => JSON.parse(await fs.readFile(path.join(runDir(runId), "work_journal", "work_journal_manifest.json"), "utf8")) as { files: Json[] };

  /** One conversation connection; a message to a stopped run restores it first and activates a pending switch. */
  const talk = async (runId: string, content: string, label: string) => {
    const messages: Wire[] = [];
    const socket = new WebSocket(`ws://127.0.0.1:${new URL(origin).port}/ws/agent/${runId}`);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: string; payload?: Json };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload : {} });
      } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => messages.some((m) => m.type === "CONNECTED"), `${label}: CONNECTED`, 120_000);
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    await until(() => messages.some((m) => m.type === "TURN_COMPLETED" || m.type === "TURN_INTERRUPTED" || m.type === "ERROR"), `${label}: turn end`, 120_000);
    expect(messages.filter((m) => m.type === "ERROR").map((m) => m.payload), `${label}: errors`).toEqual([]);
    await wait(300);
    socket.close();
    return messages;
  };

  /** Opens the run's conversation without sending anything (a stopped run is restored on connect). Returns what the server sent. */
  const connectOnly = async (runId: string, label: string) => {
    const messages: Wire[] = [];
    const socket = new WebSocket(`ws://127.0.0.1:${new URL(origin).port}/ws/agent/${runId}`);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: string; payload?: Json };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload : {} });
      } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => messages.some((m) => m.type === "CONNECTED"), `${label}: CONNECTED`, 120_000);
    await wait(500);
    socket.close();
    return messages;
  };
  /** A first message that is expected to fail: resolves with what happened instead of throwing on the server's error. */
  const attempt = async (runId: string, content: string) => {
    const messages: Wire[] = [];
    let closed = false;
    const socket = new WebSocket(`ws://127.0.0.1:${new URL(origin).port}/ws/agent/${runId}`);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: string; payload?: Json };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload : {} });
      } catch { /* diagnostic rows only */ }
    });
    socket.on("close", () => { closed = true; });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => messages.some((m) => m.type === "CONNECTED" || m.type === "ERROR") || closed, "attempt: connected, refused or closed", 90_000);
    if (messages.some((m) => m.type === "CONNECTED") && !messages.some((m) => m.type === "ERROR")) sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    // The server answers a message it cannot take with a command acknowledgement that says so (the user sees the reason).
    await until(() => messages.some((m) => m.type === "TURN_COMPLETED" || m.type === "ERROR" || m.type === "AGENT_COMMAND_ACK") || closed, "attempt: outcome", 60_000);
    await wait(500);
    const completed = messages.some((m) => m.type === "TURN_COMPLETED");
    socket.close();
    return { messages, completed, errors: messages.filter((m) => m.type === "ERROR").map((m) => m.payload),
      acks: messages.filter((m) => m.type === "AGENT_COMMAND_ACK").map((m) => m.payload) };
  };
  const completeSegments = async (runId: string) =>
    existsSync(path.join(runDir(runId), "raw_traces_manifest.json")) ? (await manifest(runId)).segments.filter((segment) => segment.status === "complete") : [];
  /** The ids of the one complete segment a switch made (its number depends on earlier failed attempts, which use up an index). */
  const switchSegmentIds = async (runId: string, key: string): Promise<{ ids: string[]; runtimeKind: unknown }> => {
    const found = (await completeSegments(runId)).filter((segment) => segment.boundary_key === key);
    expect(found, "exactly one complete segment for the switch").toHaveLength(1);
    return { ids: readRaw(path.join(runDir(runId), found[0]!.file_name)).map((record) => record.id as string), runtimeKind: found[0]!.runtime_kind };
  };
  const NO_SEGMENT_NAME = "raw_traces_000001.jsonl";
  /** Makes the switch's archive step fail without touching anything else: its segment file name is taken by a folder. */
  const obstructArchive = (runId: string) => fs.mkdir(path.join(runDir(runId), NO_SEGMENT_NAME));
  const clearObstruction = (runId: string) => fs.rm(path.join(runDir(runId), NO_SEGMENT_NAME), { recursive: true, force: true });
  const activeText = (runId: string) => readFileSync(path.join(runDir(runId), "raw_traces_active.jsonl"), "utf8");
  const echoedInputs = (runId: string): string[] => activeRecords(runId).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("ECHO:"))
    .map((record) => JSON.parse(String(record.content).slice("ECHO:".length)) as string);

  let serverEnv: NodeJS.ProcessEnv = {};
  const launchServer = async () => {
    logs = "";
    child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"], { env: serverEnv, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout!.on("data", (data: Buffer) => { logs += data.toString(); });
    child.stderr!.on("data", (data: Buffer) => { logs += data.toString(); });
    await until(() => {
      if (child.exitCode !== null) throw new Error(`server exited: ${logs.slice(-3000)}`);
      return logs.includes("Server listening on 127.0.0.1:0");
    }, "server ready", 90_000);
    origin = [...logs.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
    // The LM Studio provider is loaded on demand: ask for it, as the Settings page does.
    await gql("mutation($providerId: String!, $runtimeKind: String) { reloadProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }", { providerId: "LMSTUDIO", runtimeKind: NATIVE });
  };
  /** Ends the server process as a user quitting the app does (the runs stop with it); the data root stays. */
  const stopServer = async () => {
    for (const socket of sockets.splice(0)) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (child.exitCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 15_000);
    try { await exited; } finally { clearTimeout(force); }
  };
  const restartServer = async () => { await stopServer(); await launchServer(); };

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-switch-native-"));
    await fs.mkdir(path.join(root, "home"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    lm = await startFakeLmStudio();
    const grokCommand = path.join(root, "fake-grok");
    await fs.writeFile(grokCommand, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_GROK_SCRIPT}" "$@"\n`, { mode: 0o755 });
    serverEnv = Object.fromEntries(["PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
    Object.assign(serverEnv, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "",
      LMSTUDIO_HOSTS: lm.origin, ANTIGRAVITY_CLI_COMMAND: FAKE_AGY, AGY_FAKE_CASE: "linked_skills", AGY_FAKE_EXTRA_MODELS: AGY_ALT,
      GROK_BUILD_COMMAND: grokCommand, FAKE_ACP_FIXTURE: GROK_FIXTURE, FAKE_ACP_REPORT_MCP_READY: "1" });
    await launchServer();
    const native = await modelsOf(NATIVE);
    nativeModel = native.find((id) => id.startsWith(`${NATIVE_KEY}:`)) ?? "";
    nativeModelB = native.find((id) => id.startsWith(`${NATIVE_KEY_B}:`)) ?? "";
    expect([nativeModel, nativeModelB], `native models: ${native.join(", ")}`).not.toContain("");
    expect(await modelsOf(AGY)).toEqual(expect.arrayContaining([AGY_MODEL, AGY_ALT]));
    expect(await modelsOf(GROK), "the fake Grok offers its model").toContain(GROK_MODEL);
  }, 180_000);

  afterAll(async () => {
    if (child && child.exitCode === null) {
      for (const runId of runIds) await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
      await stopServer();
    }
    if (lm) await lm.close();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  it("RS-01: native -> Antigravity -> native on one run: each archived segment holds the previous agent's records only, the native candidate's own instruction opens the new file after the marker, the reopened chat shows everything", async () => {
    const runId = await createRun(await definition("rs-native"), NATIVE, nativeModel);
    await talk(runId, "NATIVE-TURN-ONE: please say something.", "native first turn");
    const initial = await metadata(runId);
    expect(initial).toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: nativeModel });
    expect(Object.hasOwn(initial, "pendingRuntimeSwitch")).toBe(false);
    const nativeIds = activeRecords(runId).map((record) => record.id as string);
    expect(nativeIds.length, "the native agent recorded its turn").toBeGreaterThan(1);
    expect(lm.requests.length).toBeGreaterThan(0);

    // --- native -> scripted Antigravity
    await terminate(runId);
    expect(await save(runId, AGY, AGY_MODEL)).toMatchObject({ success: true, outcome: "UPDATED", canonicalSelection: { runtimeKind: AGY, llmModelIdentifier: AGY_MODEL } });
    const pendingToAgy = await metadata(runId);
    expect(pendingToAgy).toMatchObject({ runtimeKind: AGY, platformAgentRunId: null, pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: NATIVE }) } });
    expect(activeRecords(runId).map((record) => record.id), "the save changed no raw trace").toEqual(nativeIds);
    expect(existsSync(path.join(runDir(runId), "raw_traces_000001.jsonl")), "nothing archived by the save").toBe(false);
    const keyOne = `runtime_switch:${runId}:${pendingToAgy.pendingRuntimeSwitch.switchId}`;

    const agyTurn = await talk(runId, "ECHO_INPUT", "antigravity first turn");
    // I-7 on native -> AGY: the archived segment holds exactly the native agent's records.
    expect(readRaw(path.join(runDir(runId), "raw_traces_000001.jsonl")).map((record) => record.id), "I-7: segment 1 = native records").toEqual(nativeIds);
    let active = activeRecords(runId);
    expect(active[0], "I-3: the marker starts the new file").toMatchObject({ trace_type: "system_task_notification", sender_id: "system.runtime_handover", correlation_id: keyOne,
      content: expect.stringMatching(/^Agent runtime changed from AutoByteus \(.+\) to Antigravity CLI \(.+\)\.$/) });
    expect(active.filter((record) => record.correlation_id === keyOne), "I-5: one marker").toHaveLength(1);
    // The AGY agent received the notice, then the user's text, in one input (the scripted CLI echoes what it received).
    const echoed = active.find((record) => record.trace_type === "assistant" && String(record.content).startsWith("ECHO:"));
    const received = JSON.parse(String(echoed!.content).slice("ECHO:".length)) as string;
    expect(received.indexOf("[System: runtime hand-over]"), "the notice comes first").toBe(0);
    expect(received.indexOf("ECHO_INPUT"), "the user's text follows the notice").toBeGreaterThan(received.indexOf("[System: runtime hand-over]"));
    expect(received).toContain("work_journal_active.md");
    expect(agyTurn.some((m) => m.type === "SYSTEM_TASK_NOTIFICATION" && m.payload.sender_id === "system.runtime_handover"), "the chat shows the marker").toBe(true);
    expect(await manifest(runId)).toMatchObject({ segments: [expect.objectContaining({ file_name: "raw_traces_000001.jsonl", boundary_type: "runtime_switch", boundary_key: keyOne, boundary_trace_id: active[0]!.id, runtime_kind: NATIVE, status: "complete" })] });
    // A second message carries no notice (once per switch).
    await talk(runId, "ECHO_INPUT", "antigravity second turn");
    const second = activeRecords(runId).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("ECHO:")).at(-1)!;
    expect(JSON.parse(String(second.content).slice("ECHO:".length))).toBe("ECHO_INPUT");
    expect(activeRecords(runId).filter((record) => record.sender_id === "system.runtime_handover")).toHaveLength(1);

    // --- scripted Antigravity -> native (the native candidate is prepared first and writes its system instruction while it does)
    const agyIds = activeRecords(runId).map((record) => record.id as string);
    await terminate(runId);
    expect(await save(runId, NATIVE, nativeModel)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pendingToNative = await metadata(runId);
    expect(pendingToNative).toMatchObject({ runtimeKind: NATIVE, platformAgentRunId: null, pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: AGY }) } });
    const keyTwo = `runtime_switch:${runId}:${pendingToNative.pendingRuntimeSwitch.switchId}`;
    const requestsBefore = lm.requests.length;
    await talk(runId, "NATIVE-TURN-TWO: carry on.", "native second turn");
    // I-7 on AGY -> native: segment 2 = the first marker and exactly the Antigravity agent's records. The native candidate wrote its
    // system instruction while it was prepared, before the archive; that record is after the watermark and belongs to the new file.
    const segmentTwo = readRaw(path.join(runDir(runId), "raw_traces_000002.jsonl"));
    expect(segmentTwo.map((record) => record.id), "I-7: segment 2 = Antigravity records").toEqual(agyIds);
    expect(segmentTwo.filter((record) => record.trace_type === "system_instruction"), "I-7: none of the native candidate's records in the previous agent's segment").toEqual([]);
    expect(readRaw(path.join(runDir(runId), "raw_traces_000001.jsonl")).map((record) => record.id), "I-8: the first archive is unchanged").toEqual(nativeIds);
    active = activeRecords(runId);
    expect(active[0], "I-3: the marker is the first record of the new file").toMatchObject({ trace_type: "system_task_notification", correlation_id: keyTwo,
      content: expect.stringMatching(/^Agent runtime changed from Antigravity CLI \(.+\) to AutoByteus \(.+\)\.$/) });
    expect(active.filter((record) => record.correlation_id === keyTwo)).toHaveLength(1);
    expect(active[1], "the native agent's own system instruction follows the marker").toMatchObject({ trace_type: "system_instruction" });
    expect(active.filter((record) => record.trace_type === "system_instruction"), "...once").toHaveLength(1);
    expect((await manifest(runId)).segments.map((segment) => [segment.file_name, segment.boundary_type, segment.runtime_kind])).toEqual([
      ["raw_traces_000001.jsonl", "runtime_switch", NATIVE], ["raw_traces_000002.jsonl", "runtime_switch", AGY]]);
    // The native agent received the notice before the user's text, in one input.
    const nativeInput = JSON.stringify(lm.requests.slice(requestsBefore).at(0)?.messages ?? []);
    expect(nativeInput.indexOf("[System: runtime hand-over]"), "the native input carries the notice").toBeGreaterThan(-1);
    expect(nativeInput.indexOf("NATIVE-TURN-TWO"), "...before the user's text").toBeGreaterThan(nativeInput.indexOf("[System: runtime hand-over]"));
    const finalMetadata = await metadata(runId);
    expect(finalMetadata).toMatchObject({ runId, runtimeKind: NATIVE, startedAt: initial.startedAt, workspaceRootPath: initial.workspaceRootPath });
    expect(Object.hasOwn(finalMetadata, "pendingRuntimeSwitch")).toBe(false);
    expect(finalMetadata.platformAgentRunId, "the native session binding exists again after the commit").toEqual(expect.any(String));
    // Each journal file reads with the runtime that wrote its raw file.
    expect((await journalManifest(runId)).files.map((file) => [file.journal_file, file.runtime_kind])).toEqual([
      ["work_journal_000001.md", NATIVE], ["work_journal_000002.md", AGY], ["work_journal_active.md", NATIVE]]);
    if (EVIDENCE_DIR) {
      const out = path.join(EVIDENCE_DIR, "runtime-switch-native");
      await fs.mkdir(out, { recursive: true });
      await fs.cp(path.join(runDir(runId), "work_journal"), path.join(out, "work_journal"), { recursive: true });
      await fs.copyFile(path.join(runDir(runId), "raw_traces_manifest.json"), path.join(out, "raw_traces_manifest.json"));
      await fs.copyFile(path.join(runDir(runId), "run_metadata.json"), path.join(out, "run_metadata.json"));
      await fs.writeFile(path.join(out, "chat-projection.json"), JSON.stringify((await gql("query($id: String!) { getRunProjection(runId: $id) { conversation } }", { id: runId })).getRunProjection.conversation, null, 2));
      for (const name of ["raw_traces_000001.jsonl", "raw_traces_000002.jsonl", "raw_traces_active.jsonl"]) {
        await fs.writeFile(path.join(out, `${name}.types.txt`), `${readRaw(path.join(runDir(runId), name)).map((record) => `${record.ts} ${record.trace_type} ${record.sender_id ?? ""} ${String(record.content ?? "").slice(0, 60).replace(/\n/g, " ")}`).join("\n")}\n`);
      }
      await fs.writeFile(path.join(out, "markers.json"), JSON.stringify(active.filter((record) => record.sender_id === "system.runtime_handover").map((record) => record.content), null, 2));
    }
    const history = (await gql("query($id: String!) { getRunProjection(runId: $id) { conversation } }", { id: runId })).getRunProjection.conversation;
    // BEH-005 / REQ-011: the reopened chat shows the earlier conversation unchanged and the markers (the projection is what the app hydrates from).
    expect(JSON.stringify(history), "the reopened chat keeps the earlier conversation").toContain("NATIVE-TURN-ONE");
    expect(JSON.stringify(history), "...and shows the first marker").toContain("Agent runtime changed from AutoByteus");
    expect(JSON.stringify(history), "...and the latest marker").toContain("Agent runtime changed from Antigravity CLI");
  }, 300_000);

  it("RS-02: settings of a stopped run: running refused, save a switch, undo it, switch again, model-only edit keeps the switch, first message makes it", async () => {
    // A native run (scripted model) is the run being switched, to the scripted Antigravity runtime.
    const runId = await createRun(await definition("rs-settings"), NATIVE, nativeModel);
    await talk(runId, "NATIVE-SETTINGS-ONE: say something.", "native first turn");
    const original = await metadata(runId);
    expect(original).toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: nativeModel, platformAgentRunId: expect.any(String) });
    expect(Object.hasOwn(original, "pendingRuntimeSwitch")).toBe(false);
    const nativeIds = activeRecords(runId).map((record) => record.id as string);

    // A running run cannot be switched, and the refused save writes nothing.
    const whileRunning = await save(runId, AGY, AGY_MODEL);
    expect(whileRunning, JSON.stringify(whileRunning)).toMatchObject({ success: false });
    expect(await metadata(runId), "a refused save writes nothing").toEqual(original);

    await terminate(runId);
    // Switch: the pending field names the previous binding; the session binding is dropped; nothing is archived or written.
    const switchSave = await save(runId, AGY, AGY_MODEL);
    expect(switchSave, `switch save: ${JSON.stringify(switchSave)}`).toMatchObject({ success: true, outcome: "UPDATED" });
    const switched = await metadata(runId);
    expect(switched).toMatchObject({ runtimeKind: AGY, llmModelIdentifier: AGY_MODEL, platformAgentRunId: null,
      pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: NATIVE, llmModelIdentifier: nativeModel, platformAgentRunId: original.platformAgentRunId }) } });
    // Undo: choosing the original runtime and model again returns the original session and clears the field.
    const undoSave = await save(runId, NATIVE, nativeModel);
    expect(undoSave, `undo save: ${JSON.stringify(undoSave)}`).toMatchObject({ success: true, outcome: "UPDATED" });
    const undone = await metadata(runId);
    expect(undone).toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: nativeModel, platformAgentRunId: original.platformAgentRunId });
    expect(Object.hasOwn(undone, "pendingRuntimeSwitch"), "the undo cleared the pending switch").toBe(false);
    expect(undone, "the undo restores the metadata as it was").toEqual(original);
    // Switch again, then edit only the model of the new runtime: the pending switch stays (same time, same previous binding).
    const againSave = await save(runId, AGY, AGY_MODEL);
    expect(againSave, `switch again: ${JSON.stringify(againSave)}`).toMatchObject({ success: true });
    const pending = await metadata(runId);
    expect(pending.pendingRuntimeSwitch.from).toMatchObject({ runtimeKind: NATIVE, platformAgentRunId: original.platformAgentRunId });
    const modelSave = await save(runId, AGY, AGY_ALT);
    expect(modelSave, `model-only edit: ${JSON.stringify(modelSave)}`).toMatchObject({ success: true, outcome: "UPDATED" });
    const modelOnly = await metadata(runId);
    expect(modelOnly).toMatchObject({ runtimeKind: AGY, llmModelIdentifier: AGY_ALT, platformAgentRunId: null });
    expect(modelOnly.pendingRuntimeSwitch, "the model-only edit keeps the pending switch").toEqual(pending.pendingRuntimeSwitch);
    expect(activeRecords(runId).map((record) => record.id), "settings saves wrote no raw trace").toEqual(nativeIds);
    expect(existsSync(path.join(runDir(runId), "raw_traces_000001.jsonl"))).toBe(false);

    // The first message makes the switch: marker, archive, notice before the user's text, once.
    const key = `runtime_switch:${runId}:${pending.pendingRuntimeSwitch.switchId}`;
    await talk(runId, "ECHO_INPUT", "antigravity first turn after the switch");
    expect(readRaw(path.join(runDir(runId), "raw_traces_000001.jsonl")).map((record) => record.id), "segment 1 = the native agent's records").toEqual(nativeIds);
    const active = activeRecords(runId);
    expect(active[0]).toMatchObject({ trace_type: "system_task_notification", correlation_id: key, content: expect.stringMatching(/^Agent runtime changed from AutoByteus \(.+\) to Antigravity CLI \(.+\)\.$/) });
    expect(active.filter((record) => record.correlation_id === key)).toHaveLength(1);
    const echoed = JSON.parse(String(active.find((record) => record.trace_type === "assistant" && String(record.content).startsWith("ECHO:"))!.content).slice("ECHO:".length)) as string;
    expect(echoed.startsWith("[System: runtime hand-over]"), "the notice comes first").toBe(true);
    expect(echoed.endsWith("ECHO_INPUT"), "the user's text follows").toBe(true);
    const after = await metadata(runId);
    expect(after).toMatchObject({ runtimeKind: AGY, llmModelIdentifier: AGY_ALT, startedAt: original.startedAt, platformAgentRunId: expect.any(String) });
    expect(Object.hasOwn(after, "pendingRuntimeSwitch")).toBe(false);
    // Once: a second message adds no notice and no marker.
    await talk(runId, "ECHO_INPUT", "antigravity second turn");
    const last = activeRecords(runId).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("ECHO:")).at(-1)!;
    expect(JSON.parse(String(last.content).slice("ECHO:".length))).toBe("ECHO_INPUT");
    expect(activeRecords(runId).filter((record) => record.sender_id === "system.runtime_handover")).toHaveLength(1);
  }, 300_000);

  it("RS-03: a host with a delegated copy saves its own runtime and the copy's model in one Save; the copy keeps its runtime and cannot switch", async () => {
    const hostDefinition = await definition("rs-host");
    const workerName = `rs-worker ${randomUUID().slice(0, 6)}`;
    await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: workerName, role: "assistant", description: "delegated copy", instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } });
    const hostId = await createRun(hostDefinition, AGY, AGY_MODEL);
    const call = `CALL_TOOL:${JSON.stringify({ name: "delegate_task", arguments: { recipient_address: `/${workerName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`, description: "Draft the notes." } })}`;
    await talk(hostId, call, "host delegates");
    const reply = activeRecords(hostId).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("CALLED:")).at(-1)!;
    const called = JSON.parse(String(reply.content).slice("CALLED:".length)) as Json;
    const result = called.structuredContent ?? JSON.parse(called.content.find((part: Json) => part.type === "text").text) as Json;
    expect(result, JSON.stringify(result)).toMatchObject({ delegated: true });
    const copyId = result.target_agent_run_id as string;
    runIds.push(copyId);
    await until(() => existsSync(path.join(runDir(copyId), "run_metadata.json")), "copy run metadata", 60_000);
    const copyBefore = await metadata(copyId);
    expect(copyBefore).toMatchObject({ runtimeKind: AGY });

    // The delegated copy itself offers no runtime choice: a switch is refused and nothing is written (REQ-013).
    const stopped = (await gql("mutation($input: DelegatedExecutionTargetInput!) { stopDelegatedExecution(input: $input) { success outcome } }", { input: { rootKind: "AGENT", rootRunId: hostId, agentRunId: copyId } })).stopDelegatedExecution;
    expect(stopped).toMatchObject({ success: true });
    const copyFile = await fs.readFile(path.join(runDir(copyId), "run_metadata.json"), "utf8");
    const refused = await save(copyId, NATIVE, nativeModel);
    expect(refused, JSON.stringify(refused)).toMatchObject({ success: false });
    expect(await fs.readFile(path.join(runDir(copyId), "run_metadata.json"), "utf8"), "a refused switch of a copy writes nothing").toBe(copyFile);

    await terminate(hostId);
    const hostBefore = await metadata(hostId);
    const combined = (await gql("mutation($input: UpdateDelegatedLaunchSelectionsInput!) { updateDelegatedLaunchSelections(input: $input) { success outcome message fieldErrors { path message } } }", { input: {
      rootKind: "AGENT", rootRunId: hostId,
      changes: [{ agentRunId: copyId, selection: { llmModelIdentifier: AGY_ALT, llmConfig: null } }],
      configuredPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/", runtimeKind: NATIVE, llmModelIdentifier: nativeModel, llmConfig: null }] } })).updateDelegatedLaunchSelections;
    expect(combined, JSON.stringify(combined)).toMatchObject({ success: true, outcome: "UPDATED" });
    const hostAfter = await metadata(hostId);
    expect(hostAfter).toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: nativeModel, platformAgentRunId: null,
      pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: AGY, platformAgentRunId: hostBefore.platformAgentRunId }) } });
    // The copy keeps its own runtime; only its chosen model is recorded (in the host's stored tree).
    expect(await metadata(copyId)).toMatchObject({ runtimeKind: AGY });
    const tree = JSON.stringify((await gql("query($id: String!) { agentRunCollaboration(runId: $id) }", { id: hostId })).agentRunCollaboration ?? {});
    expect(tree).toContain(AGY_ALT);
    expect(tree).toContain(copyId);

    // The host's first message makes its switch while the copy stays registered under it.
    const key = `runtime_switch:${hostId}:${hostAfter.pendingRuntimeSwitch.switchId}`;
    await talk(hostId, "NATIVE-HOST-TURN: continue.", "host first turn after the combined Save");
    expect(activeRecords(hostId)[0]).toMatchObject({ trace_type: "system_task_notification", correlation_id: key });
    expect(await metadata(hostId)).toMatchObject({ runtimeKind: NATIVE });
    expect(await metadata(copyId), "the copy was not touched by the host's switch").toMatchObject({ runtimeKind: AGY });
    expect(JSON.stringify((await gql("query($id: String!) { agentRunCollaboration(runId: $id) }", { id: hostId })).agentRunCollaboration ?? {})).toContain(copyId);
  }, 300_000);

  it("RS-04: a pending switch survives a server restart; an activated switch whose notice was not yet delivered still delivers it, once, after a restart", async () => {
    // A: saved, then the server restarts, then the first message.
    const a = await createRun(await definition("rs-restart-a"), NATIVE, nativeModel);
    await talk(a, "NATIVE-RESTART-A: say something.", "native turn A");
    const aIds = activeRecords(a).map((record) => record.id as string);
    await terminate(a);
    expect(await save(a, AGY, AGY_MODEL)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pendingA = await metadata(a);
    await restartServer();
    expect(await metadata(a), "the pending switch is on disk, untouched by the restart").toEqual(pendingA);
    await talk(a, "ECHO_INPUT", "antigravity first turn after the restart");
    const keyA = `runtime_switch:${a}:${pendingA.pendingRuntimeSwitch.switchId}`;
    expect(readRaw(path.join(runDir(a), "raw_traces_000001.jsonl")).map((record) => record.id), "segment 1 = the native agent's records").toEqual(aIds);
    expect(activeRecords(a)[0]).toMatchObject({ correlation_id: keyA });
    expect(echoedInputs(a)[0]!.startsWith("[System: runtime hand-over]"), "the notice comes with the first input").toBe(true);
    expect(Object.hasOwn(await metadata(a), "pendingRuntimeSwitch")).toBe(false);

    // B: the switch is activated and the first input delivered; then the state a crash between the activation and the user record
    // leaves is made by hand: the active file is cut back to the marker (nothing follows it, no user record). The hand-over is derived
    // from the raw traces (I-11), so the first input after the restart carries the notice again. (Opening a stopped run does not
    // activate the switch: the activation is the first input.)
    const b = await createRun(await definition("rs-restart-b"), NATIVE, nativeModel);
    await talk(b, "NATIVE-RESTART-B: say something.", "native turn B");
    const bIds = activeRecords(b).map((record) => record.id as string);
    await terminate(b);
    expect(await save(b, AGY, AGY_MODEL)).toMatchObject({ success: true, outcome: "UPDATED" });
    const keyB = `runtime_switch:${b}:${(await metadata(b)).pendingRuntimeSwitch.switchId}`;
    await connectOnly(b, "open the switched run");
    expect(activeRecords(b).map((record) => record.id), "opening the run does not activate the switch").toEqual(bIds);
    await talk(b, "ECHO_INPUT", "first message");
    expect(echoedInputs(b)[0]!.startsWith("[System: runtime hand-over]")).toBe(true);
    const committed = await metadata(b);
    expect(committed).toMatchObject({ runtimeKind: AGY, platformAgentRunId: expect.any(String) });
    expect(Object.hasOwn(committed, "pendingRuntimeSwitch")).toBe(false);
    await stopServer();
    const marker = activeRecords(b)[0]!;
    expect(marker).toMatchObject({ trace_type: "system_task_notification", correlation_id: keyB });
    await fs.writeFile(path.join(runDir(b), "raw_traces_active.jsonl"), `${JSON.stringify(marker)}\n`);
    await launchServer();
    await talk(b, "ECHO_INPUT", "first message after the restart");
    expect(echoedInputs(b), "exactly one input since the cut").toHaveLength(1);
    expect(echoedInputs(b)[0]!.startsWith("[System: runtime hand-over]"), "the notice is carried again: pending is derived from the raw traces").toBe(true);
    expect(echoedInputs(b)[0]!.endsWith("ECHO_INPUT")).toBe(true);
    expect(activeRecords(b).filter((record) => record.correlation_id === keyB), "still one marker").toHaveLength(1);
    expect(readRaw(path.join(runDir(b), "raw_traces_000001.jsonl")).map((record) => record.id), "the archive is untouched").toEqual(bIds);
    await talk(b, "ECHO_INPUT", "second message");
    expect(echoedInputs(b).at(-1), "the notice is not carried again").toBe("ECHO_INPUT");
  }, 400_000);

  it("RS-05: a failed switch attempt (the archive step fails after the native candidate wrote its instruction) leaves the previous agent's file as it was; the retry completes", async () => {
    const runId = await createRun(await definition("rs-failed"), AGY, AGY_MODEL);
    await talk(runId, "ECHO_INPUT", "antigravity first turn");
    const agyIds = activeRecords(runId).map((record) => record.id as string);
    await terminate(runId);
    expect(await save(runId, NATIVE, nativeModel)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pending = await metadata(runId);
    const key = `runtime_switch:${runId}:${pending.pendingRuntimeSwitch.switchId}`;
    const before = activeText(runId);

    await obstructArchive(runId);
    const failed = await attempt(runId, "NATIVE-FAILED-ATTEMPT");
    expect(failed.completed, `the attempt must fail: ${JSON.stringify(failed.errors)}`).toBe(false);
    expect(failed.acks, "the user is told: the message is not accepted and why").toEqual([expect.objectContaining({ state: "failed", accepted: false, code: "ACTIVATION_FAILED", message: expect.stringContaining("EISDIR") })]);
    expect(activeText(runId), "the previous agent's file is exactly as before: the candidate's instruction was removed").toBe(before);
    expect(activeRecords(runId).some((record) => record.correlation_id === key), "no marker").toBe(false);
    expect(await metadata(runId), "the switch is still pending, nothing committed").toEqual(pending);
    expect(await completeSegments(runId), "no complete segment").toEqual([]);

    await clearObstruction(runId);
    await talk(runId, "NATIVE-RETRY: carry on.", "native retry");
    expect(await switchSegmentIds(runId, key), "I-7: the segment holds exactly the previous agent's records").toEqual({ ids: agyIds, runtimeKind: AGY });
    const active = activeRecords(runId);
    expect(active[0]).toMatchObject({ trace_type: "system_task_notification", correlation_id: key });
    expect(active[1], "the native instruction follows the marker").toMatchObject({ trace_type: "system_instruction" });
    expect(active.filter((record) => record.trace_type === "system_instruction"), "once, not once per attempt").toHaveLength(1);
    expect(active.filter((record) => record.correlation_id === key), "one marker").toHaveLength(1);
    const committed = await metadata(runId);
    expect(committed).toMatchObject({ runtimeKind: NATIVE, platformAgentRunId: expect.any(String) });
    expect(Object.hasOwn(committed, "pendingRuntimeSwitch")).toBe(false);
  }, 300_000);

  it("RS-06: Grok as the switch target: its captured instructions belong to the new file; a failed attempt leaves nothing behind and the retry completes", async () => {
    const runId = await createRun(await definition("rs-grok"), NATIVE, nativeModel);
    await talk(runId, "NATIVE-GROK-ONE: say something.", "native turn");
    const nativeIds = activeRecords(runId).map((record) => record.id as string);
    await terminate(runId);
    expect(await save(runId, GROK, GROK_MODEL)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pending = await metadata(runId);
    expect(pending).toMatchObject({ runtimeKind: GROK, platformAgentRunId: null, pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: NATIVE }) } });
    const key = `runtime_switch:${runId}:${pending.pendingRuntimeSwitch.switchId}`;
    const before = activeText(runId);

    await obstructArchive(runId);
    const failed = await attempt(runId, "GROK-FAILED-ATTEMPT");
    expect(failed.completed, `the attempt must fail: ${JSON.stringify(failed.errors)}`).toBe(false);
    expect(failed.acks, "the user is told: the message is not accepted and why").toEqual([expect.objectContaining({ state: "failed", accepted: false, code: "ACTIVATION_FAILED" })]);
    expect(activeText(runId), "the previous agent's file is exactly as before: Grok's captured instructions were removed").toBe(before);
    expect(await metadata(runId)).toEqual(pending);
    expect(await completeSegments(runId), "no complete segment").toEqual([]);

    await clearObstruction(runId);
    await talk(runId, "GROK-RETRY: carry on.", "grok retry");
    expect(await switchSegmentIds(runId, key), "I-7: the segment holds exactly the native agent's records").toEqual({ ids: nativeIds, runtimeKind: NATIVE });
    const active = activeRecords(runId);
    expect(active[0]).toMatchObject({ trace_type: "system_task_notification", correlation_id: key });
    expect(active[1], "Grok's captured instructions follow the marker").toMatchObject({ trace_type: "system_instruction" });
    expect(active.filter((record) => record.trace_type === "system_instruction")).toHaveLength(1);
    expect(active.filter((record) => record.correlation_id === key)).toHaveLength(1);
    const committed = await metadata(runId);
    expect(committed).toMatchObject({ runtimeKind: GROK, llmModelIdentifier: GROK_MODEL, platformAgentRunId: expect.any(String) });
    expect(Object.hasOwn(committed, "pendingRuntimeSwitch")).toBe(false);
    const history = JSON.stringify((await gql("query($id: String!) { getRunProjection(runId: $id) { conversation } }", { id: runId })).getRunProjection.conversation);
    expect(history, "the reopened chat keeps the native conversation").toContain("NATIVE-GROK-ONE");
    expect(history, "...and shows the marker").toContain("Agent runtime changed from AutoByteus");
  }, 300_000);

  it("RS-07: a Grok start that fails after the switch became durable (the Grok process ends before the run is published) leaves a completed switch; the retry restores the Grok session and still carries the notice", async () => {
    const runId = await createRun(await definition("rs-grok-start"), NATIVE, nativeModel);
    await talk(runId, "NATIVE-GROK-START-ONE: say something.", "native turn");
    const nativeIds = activeRecords(runId).map((record) => record.id as string);
    await terminate(runId);
    expect(await save(runId, GROK, GROK_MODEL)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pending = await metadata(runId);
    const key = `runtime_switch:${runId}:${pending.pendingRuntimeSwitch.switchId}`;

    // The Grok stand-in replays the handshake and ends: the session opens and the process is gone before the run is published.
    Object.assign(serverEnv, { FAKE_ACP_FIXTURE: path.resolve("tests/fixtures/grok-acp/handshake.jsonl"), FAKE_ACP_EXIT_AT_END: "1" });
    await restartServer();
    const failed = await attempt(runId, "GROK-START-FAILS");
    expect(failed.completed).toBe(false);
    expect(failed.acks, "the user is told").toEqual([expect.objectContaining({ state: "failed", accepted: false, code: "ACTIVATION_FAILED", message: expect.stringContaining("publication failed after durable activation") })]);
    // The switch was already durable: marker first, Grok's captured instructions after it, the segment complete, the binding committed.
    expect(await switchSegmentIds(runId, key)).toEqual({ ids: nativeIds, runtimeKind: NATIVE });
    expect(activeRecords(runId).map((record) => record.trace_type)).toEqual(["system_task_notification", "system_instruction"]);
    const durable = await metadata(runId);
    expect(durable).toMatchObject({ runtimeKind: GROK, platformAgentRunId: expect.any(String) });
    expect(Object.hasOwn(durable, "pendingRuntimeSwitch")).toBe(false);

    // The retry restores the committed Grok session (no second switch) and the hand-over is still pending: derived from the raw traces.
    const record = path.join(root, "grok-client-frames.jsonl");
    Object.assign(serverEnv, { FAKE_ACP_FIXTURE: path.resolve("tests/fixtures/grok-acp/load.jsonl"), FAKE_ACP_RECORD: record });
    delete serverEnv["FAKE_ACP_EXIT_AT_END"];
    await restartServer();
    await talk(runId, "GROK-START-RETRY: carry on.", "grok retry");
    const frames = readFileSync(record, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Json);
    expect(frames.some((frame) => frame.method === "session/load"), "the committed session was restored").toBe(true);
    const prompt = JSON.stringify(frames.find((frame) => frame.method === "session/prompt")?.params ?? {});
    expect(prompt.indexOf("[System: runtime hand-over]"), "the notice is carried by the first input").toBeGreaterThan(-1);
    expect(prompt.indexOf("GROK-START-RETRY"), "...before the user's text").toBeGreaterThan(prompt.indexOf("[System: runtime hand-over]"));
    const active = activeRecords(runId);
    expect(active.filter((r) => r.correlation_id === key), "still one marker").toHaveLength(1);
    expect(active.filter((r) => r.trace_type === "system_instruction"), "the restore does not capture instructions again").toHaveLength(1);
    expect(await completeSegments(runId)).toHaveLength(1);
  }, 300_000);
});
