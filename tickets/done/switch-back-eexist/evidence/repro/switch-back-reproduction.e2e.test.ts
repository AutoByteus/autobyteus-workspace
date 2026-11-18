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
//         runtime; the delegated copy cannot switch through the stopped-run mutation (REQ-013); it switches through its own
//         choice (updateDelegatedLaunchSelections, autobyteus-348; see delegated-copy-model-change DCM-009).
//   RS-04 a server restart: a pending switch survives it; a switch that was activated (marker first, no user record yet)
//         still delivers its notice with the first input after the restart, once (I-11, derived from the raw traces).
//   RS-05 a failed attempt: the archive step fails after the native candidate wrote its instruction; the previous agent's file
//         is exactly as before, the switch stays pending, and the retry completes with one marker and one segment (I-7).
//   RS-06 Grok as the switch target, with the same failed attempt and retry.
//   RS-07 a Grok start that fails after the switch became durable (the Grok process ends before the run is published)
//         leaves a completed switch; the retry restores the Grok session and still carries the notice.
//   RS-08 a model edit while a switch to the native runtime is pending is a fresh selection (the never-started candidate
//         is not a current model), and the first message runs on it.
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

  /** Switch A -> native -> A on one run; the third step is an `attempt` so the server's answer is reported, not thrown. */
  const backAndForth = async (kind: string, model: string, label: string) => {
    const runId = await createRun(await definition(`rb-${label}`), kind, model);
    const first = await attempt(runId, "ECHO_INPUT");
    await terminate(runId);
    expect(await save(runId, NATIVE, nativeModel)).toMatchObject({ success: true, outcome: "UPDATED" });
    const second = await attempt(runId, "NATIVE-TURN: carry on.");
    await terminate(runId);
    expect(await save(runId, kind, model)).toMatchObject({ success: true, outcome: "UPDATED" });
    const third = await attempt(runId, "ECHO_INPUT");
    const entries = await fs.readdir(runDir(runId));
    return { runId, first: first.completed, second: second.completed, third, thirdErrors: JSON.stringify([...third.errors, ...third.acks]),
      entries, meta: await metadata(runId) };
  };

  it("RB-01 (reproduction): scripted Antigravity -> native -> Antigravity on one standalone run", async () => {
    const r = await backAndForth(AGY, AGY_MODEL, "agy");
    console.log("RB-01", JSON.stringify({ first: r.first, second: r.second, thirdCompleted: r.third.completed, thirdErrors: r.thirdErrors.slice(0, 400), entries: r.entries,
      pending: Boolean(r.meta.pendingRuntimeSwitch), runtime: r.meta.runtimeKind }));
    expect(r.first && r.second).toBe(true);
    expect(r.thirdErrors, "switching back to Antigravity must not fail").not.toContain("EEXIST");
    expect(r.third.completed).toBe(true);
  }, 300_000);

  it("RB-02 (sweep): Grok -> native -> Grok on one standalone run", async () => {
    const r = await backAndForth(GROK, GROK_MODEL, "grok");
    console.log("RB-02", JSON.stringify({ first: r.first, second: r.second, thirdCompleted: r.third.completed, thirdErrors: r.thirdErrors.slice(0, 400), entries: r.entries,
      pending: Boolean(r.meta.pendingRuntimeSwitch), runtime: r.meta.runtimeKind }));
    expect(r.thirdErrors).not.toContain("EEXIST");
    expect(r.third.completed).toBe(true);
  }, 300_000);
});
