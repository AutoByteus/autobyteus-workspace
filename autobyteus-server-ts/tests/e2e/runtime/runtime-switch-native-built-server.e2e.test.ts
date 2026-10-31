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

// Agent runtime switch to and from the NATIVE runtime, and the stopped-run settings, on the BUILT server (autobyteus-316:
// REQ-001, REQ-002, REQ-010, REQ-011, REQ-013; AC-001, AC-002, AC-009; invariants I-3, I-5, I-7, I-8). The server is
// `dist/app.js` as a child process on a synthesized data root with a private HOME and database. Only models are scripted:
//   - the native runtime talks to a test-owned HTTP endpoint that answers LM Studio's model list and chat completions
//     (`LMSTUDIO_HOSTS=<origin>`), so the real native agent, its memory recording and its prompt run;
//   - Antigravity is the scripted CLI tests/fixtures/agy-failure-cli.mjs (case `linked_skills`: a plain message is answered
//     `OK`, `ECHO_INPUT` answers with the exact input of the turn, `CALL_TOOL:{…}` calls a real platform tool).
// Cases:
//   RS-01 native -> Antigravity -> native on one run: the native candidate is prepared before the marker but writes no
//         raw-trace record before it; each archived segment holds exactly the previous agent's records (I-7); one marker
//         per switch (I-5); the notice comes before the user's text, once; journal files carry their own runtime.
//   RS-02 settings: save a switch (pending field, session binding dropped, nothing archived), undo it (the original
//         session ID returns, the field is cleared), switch again, edit only the model while the switch is pending (the
//         switch stays), refuse a running run, then the first message makes the switch.
//   RS-03 a host with a delegated copy: one Save carries the host's own runtime and the copy's model; the copy keeps its
//         runtime; the delegated copy itself cannot switch runtime (REQ-013).
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

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-switch-native-"));
    await fs.mkdir(path.join(root, "home"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    lm = await startFakeLmStudio();
    const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
    Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "",
      LMSTUDIO_HOSTS: lm.origin, ANTIGRAVITY_CLI_COMMAND: FAKE_AGY, AGY_FAKE_CASE: "linked_skills", AGY_FAKE_EXTRA_MODELS: AGY_ALT });
    child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"], { env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout!.on("data", (data: Buffer) => { logs += data.toString(); });
    child.stderr!.on("data", (data: Buffer) => { logs += data.toString(); });
    await until(() => {
      if (child.exitCode !== null) throw new Error(`server exited: ${logs.slice(-3000)}`);
      return logs.includes("Server listening on 127.0.0.1:0");
    }, "server ready", 90_000);
    origin = [...logs.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
    // The LM Studio provider is loaded on demand: ask for it, as the Settings page does.
    await gql("mutation($providerId: String!, $runtimeKind: String) { reloadProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }", { providerId: "LMSTUDIO", runtimeKind: NATIVE });
    const native = await modelsOf(NATIVE);
    nativeModel = native.find((id) => id.startsWith(`${NATIVE_KEY}:`)) ?? "";
    nativeModelB = native.find((id) => id.startsWith(`${NATIVE_KEY_B}:`)) ?? "";
    expect([nativeModel, nativeModelB], `native models: ${native.join(", ")}`).not.toContain("");
    expect(await modelsOf(AGY)).toEqual(expect.arrayContaining([AGY_MODEL, AGY_ALT]));
  }, 180_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (child && child.exitCode === null) {
      for (const runId of runIds) await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId }).catch(() => undefined);
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
      try { await exited; } finally { clearTimeout(force); }
    }
    if (lm) await lm.close();
    if (root) await fs.rm(root, { recursive: true, force: true });
  }, 60_000);

  it("RS-01: native -> Antigravity -> native on one run: segments hold the previous agent's records only, the native candidate writes nothing before the marker", async () => {
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

    // --- scripted Antigravity -> native (the native candidate is prepared before the marker)
    const agyIds = activeRecords(runId).map((record) => record.id as string);
    await terminate(runId);
    expect(await save(runId, NATIVE, nativeModel)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pendingToNative = await metadata(runId);
    expect(pendingToNative).toMatchObject({ runtimeKind: NATIVE, platformAgentRunId: null, pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: AGY }) } });
    const keyTwo = `runtime_switch:${runId}:${pendingToNative.pendingRuntimeSwitch.switchId}`;
    const requestsBefore = lm.requests.length;
    await talk(runId, "NATIVE-TURN-TWO: carry on.", "native second turn");
    // I-7 on AGY -> native: segment 2 = the first marker and exactly the Antigravity agent's records, none of the native candidate's.
    // Soft: the rest of the journey is still checked when the candidate's own record leaked into the archive.
    const segmentTwo = readRaw(path.join(runDir(runId), "raw_traces_000002.jsonl"));
    expect.soft(segmentTwo.map((record) => record.id), "I-7: segment 2 = Antigravity records").toEqual(agyIds);
    expect.soft(segmentTwo.filter((record) => record.trace_type === "system_instruction"), "I-7: the prepared native candidate wrote no record before the marker").toEqual([]);
    expect(readRaw(path.join(runDir(runId), "raw_traces_000001.jsonl")).map((record) => record.id), "I-8: the first archive is unchanged").toEqual(nativeIds);
    active = activeRecords(runId);
    expect(active[0], "no native record before the marker").toMatchObject({ trace_type: "system_task_notification", correlation_id: keyTwo,
      content: expect.stringMatching(/^Agent runtime changed from Antigravity CLI \(.+\) to AutoByteus \(.+\)\.$/) });
    expect(active.filter((record) => record.correlation_id === keyTwo)).toHaveLength(1);
    expect.soft(active.filter((record) => record.trace_type === "system_instruction").length, "the native agent's own system instruction is recorded in its file").toBeGreaterThan(0);
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
    expect.soft(JSON.stringify(history), "the reopened chat keeps the earlier conversation").toContain("NATIVE-TURN-ONE");
    expect.soft(JSON.stringify(history), "...and shows the first marker").toContain("Agent runtime changed from AutoByteus");
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
});
