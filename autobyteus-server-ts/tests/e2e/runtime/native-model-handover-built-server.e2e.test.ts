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
import { shownText } from "../helpers/agent-stream-frames.js";

// Native model hand-over of a stopped run on the BUILT server (autobyteus-53 `stopped-run-unavailable-model`: REQ-001..REQ-006,
// AC-001..AC-003, AC-006 (a)-(d), AC-008; DEC-003, DEC-005, DEC-007, DEC-008, DEC-009). The server is `dist/app.js` on a test-owned
// data root with a private HOME and database. Only models are scripted: the native runtime talks to a test-owned HTTP endpoint that
// answers LM Studio's model list (each model with its own context window; a model can be REMOVED, as LM Studio does when a user
// deletes it) and its chat completions, and records every request body. Antigravity is the scripted CLI
// tests/fixtures/agy-failure-cli.mjs (only a settings save names it, in MH-02 (d)).
// Rule under test (the user's, DEC-003): the model the session last ran on is the reference; both capacities verified and the new one
// equal or bigger -> same session; otherwise (smaller, unknown, or the old model gone) -> the next message starts a fresh session of
// the new model, with the hand-over notice and the marker "Model changed from {old} to {new}.".
// Cases:
//   MH-01 standalone run on a model that was removed (AC-001, AC-002, DEC-008): the options list the offered models and no current
//         model, the save is a pending model hand-over (same runtime, session binding dropped, nothing archived), the first message
//         archives exactly the previous agent's records, starts the new file with one "Model changed from ... to ..." marker, delivers
//         the hand-over notice before the user's text, sends the request to the new model with none of the earlier conversation in
//         it, and the reopened chat keeps the earlier messages; a second message carries no notice.
//   MH-02 re-edits of a run on the verified native models of a custom OpenAI-compatible endpoint (AC-003, AC-004, AC-006): an equal-capacity model keeps the session; a smaller one is pending; (b) another
//         smaller one stays pending from the first model; (c) an equal one resumes the first session; (a) the first model again
//         undoes a pending hand-over; (d) another runtime keeps it pending from the first model; the message after an undo is a
//         plain message of the first session (no marker, no notice).
//   MH-05 (AC-005) an LM Studio model has no verified capacity in the real catalog: even an equal-window LM Studio model is a hand-over,
//         and choosing the first model again undoes it.
//   MH-03 Team (AC-008): a member on a removed model hands over (that member only; the other member and the raw traces are
//         untouched); the Team's default row on a removed model accepts any offered model directly, with no hand-over.
//   MH-04 Org (AC-008, CR-001): a direct Agent member and an Agent of a mounted Team, on removed models, saved in one Org save: each
//         is a pending model hand-over (UPDATED, not an internal error), the session binding is persisted in the Org's tree, and each
//         hands over by its own first message with its own segment and marker; the Org's other member never moves.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist). Run:
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//     ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/native-model-handover-built-server.e2e.test.ts --no-watch

const FAKE_AGY = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const ENABLED = process.env.RUN_AGY_FAILURE_E2E === "1" && path.isAbsolute(FAKE_AGY) && existsSync(FAKE_AGY)
  && spawnSync(FAKE_AGY, ["--version"], { stdio: "ignore" }).status === 0 && existsSync(path.resolve("dist/app.js"));
const AGY = "antigravity_cli";
const NATIVE = "autobyteus";
const AGY_MODEL = "gemini-3.8-flash-low";
/**
 * The scripted LM Studio's models and their context windows; the `gone*` ones are removed by the cases that use them. The real
 * catalog gives an LM Studio model NO verified capacity (its `resolved_model_metadata` is null, so `nativeModelCapacity` is null):
 * every LM Studio model counts as "unknown" to the rule.
 */
const WINDOWS: Record<string, number> = {
  "mh-big": 65536, "mh-mid": 65536, "mh-small": 8192,
  "mh-gone-solo": 32768, "mh-gone-team": 32768, "mh-gone-org": 32768,
};
/**
 * The models of a custom OpenAI-compatible endpoint (served by the same scripted server under /v1) and their advertised context
 * windows. The endpoint's advertised window is `live` metadata, so these are the native models with a VERIFIED capacity.
 */
const ENDPOINT_WINDOWS: Record<string, number> = { "ce-big": 65536, "ce-mid": 65536, "ce-small": 8192, "ce-tiny": 4096 };

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
/** The folder named `name` anywhere under `base` (a member's memory folder is placed by its Team or Org). */
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

/** A stand-in for LM Studio: a model list that can lose a model, and a streamed chat completion that records every request body. */
const startFakeLmStudio = async () => {
  const requests: Json[] = [];
  const offered = new Set(Object.keys(WINDOWS));
  const server: Server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url?.startsWith("/v1/models")) {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ object: "list", data: Object.entries(ENDPOINT_WINDOWS).map(([id, window]) => ({ id, object: "model", context_window: window })) }));
      return;
    }
    if (req.method === "GET") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ models: [...offered].map((key) => ({ key, max_context_length: WINDOWS[key], loaded_instances: [{ config: { context_length: WINDOWS[key] } }] })) }));
      return;
    }
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw) as Json;
    requests.push(body);
    const chunk = (delta: Json, finish: string | null) => ({ id: `mh-${requests.length}`, object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk({ role: "assistant", content: `NATIVE-REPLY-${requests.length}` }, null))}\n\ndata: ${JSON.stringify(chunk({}, "stop"))}\n\ndata: [DONE]\n\n`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, requests, offered, close: () => { server.closeAllConnections(); return new Promise<void>((resolve) => server.close(() => resolve())); } };
};

describe.runIf(ENABLED)("native model hand-over of a stopped run on the built server", () => {
  const suffix = `native-model-handover-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  let server: Awaited<ReturnType<typeof startBuiltTestServer>>;
  let lm: Awaited<ReturnType<typeof startFakeLmStudio>>;
  const model: Record<string, string> = {};
  const sockets: WebSocket[] = [];
  const memory = (...parts: string[]) => path.join(runtimeRoot, "memory", ...parts);
  const workspace = () => path.join(runtimeRoot, "workspace");

  const gql = async <T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> => executeGraphql<T>(server.serverUrl, query, variables);
  const reloadCatalog = () => gql("mutation($providerId: String!, $runtimeKind: String) { reloadProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }", { providerId: "LMSTUDIO", runtimeKind: NATIVE });
  const modelsOf = async (runtimeKind: string): Promise<string[]> =>
    (await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }", { runtimeKind }))
      .providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((entry) => entry.modelIdentifier));
  /** LM Studio loses a model (the user deleted it); the server's catalog is refreshed, as the Settings page does. */
  const removeModel = async (key: string) => {
    lm.offered.delete(key);
    await reloadCatalog();
    expect(await modelsOf(NATIVE), `${key} is no longer offered`).not.toContain(model[key]);
  };
  const keyOf = (identifier: string) => identifier.split(":")[0]!;

  const agentDefinition = async (name: string) => (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
    { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: "native model hand-over E2E", instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id as string;
  const teamDefinition = async (agentId: string) => (await gql("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
    { input: { name: `mh-team ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.", coordinatorMemberName: "lead",
      nodes: ["lead", "worker"].map((memberName) => ({ memberName, ref: agentId, refScope: "SHARED" })) } })).createAgentTeamDefinition.id as string;
  const nativeLaunch = (llmModelIdentifier: string) => ({ runtimeKind: NATIVE, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace() });

  /** The conversation stream of a standalone run, a Team or an Org (the envelopes differ). */
  type Stream = Readonly<{ path: string; send(socket: WebSocket, agentRunId: string, content: string): void; turnEnded(message: Wire, agentRunId: string): boolean; failed(message: Wire): boolean }>;
  const failedMessage = (message: Wire) => message.type === "ERROR" || (message.type === "AGENT_COMMAND_ACK" && message.payload.state !== "accepted");
  const agentStream = (runId: string): Stream => ({
    path: `/ws/agent/${runId}`,
    send: (socket, agentRunId, content) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content }),
    turnEnded: (message) => message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED",
    failed: failedMessage,
  });
  const teamStream = (teamRunId: string): Stream => ({
    path: `/ws/agent-team/${teamRunId}`,
    send: (socket, agentRunId, content) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content }),
    turnEnded: (message, agentRunId) => message.payload.agent_run_id === agentRunId && (message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED"),
    failed: failedMessage,
  });
  const orgStream = (orgRunId: string): Stream => ({
    path: `/ws/agent-org/${orgRunId}`,
    send: (socket, agentRunId, content) => {
      const id = `e2e-${randomUUID()}`;
      socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agentRunId,
        command_id: id, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: `agent_run_input:e2e:${id}` } }));
    },
    turnEnded: (message, agentRunId) => message.type === "ROOT_EXECUTION_EVENT" && /turn_(completed|interrupted)/i.test(JSON.stringify(message.payload)) && JSON.stringify(message.payload).includes(agentRunId),
    failed: failedMessage,
  });
  /** One conversation connection; a message to a stopped run restores it first and activates a pending hand-over. */
  const talk = async (stream: Stream, agentRunId: string, content: string, label: string) => {
    const messages: Wire[] = [];
    const socket = new WebSocket(`ws://127.0.0.1:${new URL(server.serverUrl).port}${stream.path}`);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: string; payload?: Json };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload : {} });
      } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => messages.some((m) => m.type === "CONNECTED"), `${label}: CONNECTED`, 120_000);
    stream.send(socket, agentRunId, content);
    await until(() => messages.some((m) => stream.turnEnded(m, agentRunId) || stream.failed(m)), `${label}: turn end`, 120_000);
    expect(messages.filter(stream.failed).map((m) => m.payload), `${label}: errors`).toEqual([]);
    await wait(300);
    socket.close();
    return messages;
  };

  const active = (dir: string) => readRaw(path.join(dir, "raw_traces_active.jsonl"));
  const segments = (dir: string): Json[] => existsSync(path.join(dir, "raw_traces_manifest.json"))
    ? (JSON.parse(readFileSync(path.join(dir, "raw_traces_manifest.json"), "utf8")) as { segments: Json[] }).segments.filter((segment) => segment.status === "complete") : [];
  const ids = (records: Json[]) => records.map((record) => record.id as string);
  /** The chat marker of a switch (stored with `source_event: runtime_switch`), and the hand-over notice a native agent records with its first input. */
  const markers = (dir: string) => active(dir).filter((record) => record.sender_id === "system.runtime_handover" && record.source_event === "runtime_switch");
  const notices = (dir: string) => active(dir).filter((record) => record.sender_id === "system.runtime_handover" && record.source_event !== "runtime_switch");
  const treeOf = async (file: string): Promise<Json> => JSON.parse(await fs.readFile(file, "utf8")) as Json;
  const teamTreeFile = (teamRunId: string) => memory("agent_teams", teamRunId, "team_run_execution_tree.json");
  /** The Org's tree as its settings page reads it: composed from the files of the container and its units (a member's own run folder holds its record). */
  const orgTree = async (orgRunId: string): Promise<Json> =>
    (await gql("query($id: String!) { getAgentOrgRunConfig(orgRunId: $id) { executionTree } }", { id: orgRunId })).getAgentOrgRunConfig.executionTree as Json;
  const teamMember = (tree: Json, address: string): Json => tree.rootTeam.members.find((member: Json) => member.address === address);
  const orgAgents = (tree: Json): Json[] => (tree.rootOrg?.members ?? (() => { throw new Error(`unexpected Org tree: ${JSON.stringify(tree).slice(0, 1500)}`); })()).flatMap((member: Json) => "agentRunId" in member ? [member] : member.members);
  const orgAgent = (tree: Json, address: string): Json => orgAgents(tree).find((member) => member.address === address)!;

  const runDir = (runId: string) => memory("agents", runId);
  const metadata = async (runId: string) => JSON.parse(await fs.readFile(path.join(runDir(runId), "run_metadata.json"), "utf8")) as Json;
  const SAVE = `mutation($input: UpdateStoppedAgentRunSelectionInput!) { updateStoppedAgentRunSelection(input: $input) { success outcome message fieldErrors { path message } canonicalSelection { runtimeKind llmModelIdentifier } } }`;
  const save = async (agentRunId: string, runtimeKind: string, llmModelIdentifier: string) =>
    (await gql(SAVE, { input: { agentRunId, runtimeKind, llmModelIdentifier, llmConfig: null } })).updateStoppedAgentRunSelection as Json;
  const OPTIONS = "currentModelIdentifier modelListReadable unavailableReason currentModel { llmModelIdentifier } replacements { llmModelIdentifier }";
  const soloOptions = async (agentRunId: string) => (await gql(`query($id: String!) { agentRunModelOptions(agentRunId: $id) { ${OPTIONS} } }`, { id: agentRunId })).agentRunModelOptions as Json;
  const teamSelection = (teamRunId: string, scopeKind: string, scopeAddress: string, llmModelIdentifier: string) => gql(
    `mutation($input: UpdateStoppedTeamRunSelectionsInput!) { updateStoppedTeamRunSelections(input: $input) { success outcome message fieldErrors { path message } } }`,
    { input: { teamRunId, selectionPatches: [{ scopeKind, scopeAddress, runtimeKind: NATIVE, llmModelIdentifier, llmConfig: null }] } }).then((data) => data.updateStoppedTeamRunSelections as Json);
  /** The LM Studio models an options answer lists (the native catalog also lists every other provider's models). */
  const offeredBy = (options: Json) => (options.replacements as Json[]).filter((entry) => String(entry.llmModelIdentifier).includes(":lmstudio@")).map((entry) => keyOf(entry.llmModelIdentifier)).sort();
  /** The `messages` of the first provider request after `before`, as one string (the user's input and the system instruction). */
  const requestAfter = (before: number): Json => {
    expect(lm.requests.length, "a provider request was made").toBeGreaterThan(before);
    return lm.requests[before]!;
  };
  const userText = (request: Json): string => (request.messages as Json[]).filter((message) => message.role === "user")
    .map((message) => typeof message.content === "string" ? message.content : JSON.stringify(message.content)).join("\n---\n");
  const NOTICE = "[System: runtime hand-over]";
  /** The user input of the turn a request answers: the last user message (a native session keeps earlier inputs, a notice included, as history). */
  const lastUserText = (request: Json): string => {
    const turns = (request.messages as Json[]).filter((message) => message.role === "user");
    const last = turns.at(-1)!;
    return typeof last.content === "string" ? last.content : JSON.stringify(last.content);
  };

  beforeAll(async () => {
    await fs.mkdir(path.join(runtimeRoot, "isolated-home"), { recursive: true });
    lm = await startFakeLmStudio();
    server = await startBuiltTestServer({
      runtimeRoot, databaseUrlOverride: database.databaseUrl,
      environment: { HOME: path.join(runtimeRoot, "isolated-home"), LMSTUDIO_HOSTS: lm.origin, ANTIGRAVITY_CLI_COMMAND: FAKE_AGY, AGY_FAKE_CASE: "linked_skills" },
    });
    await reloadCatalog();
    const custom = (await gql("mutation($input: CustomProviderInputObject!) { createCustomProvider(input: $input) { provider { id } } }",
      { input: { name: "Verified Gateway", baseUrl: `${lm.origin}/v1`, apiKey: "synthetic-endpoint-key" } })).createCustomProvider;
    expect(custom.provider.id).toEqual(expect.any(String));
    const native = await modelsOf(NATIVE);
    for (const key of Object.keys(WINDOWS)) {
      model[key] = native.find((id) => id.startsWith(`${key}:`)) ?? "";
      expect(model[key], `native models: ${native.join(", ")}`).not.toBe("");
    }
    for (const key of Object.keys(ENDPOINT_WINDOWS)) {
      model[key] = native.find((id) => id === `openai-compatible:${custom.provider.id}:${key}`) ?? "";
      expect(model[key], `native models: ${native.join(", ")}`).not.toBe("");
    }
    expect(await modelsOf(AGY)).toEqual(expect.arrayContaining([AGY_MODEL]));
    // Fixture fidelity: the catalog reports each scripted model's context window, as the capacity rule needs it.
    const details = (await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Json[] }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier maxContextTokens activeContextTokens metadataProvenance } } }", { runtimeKind: NATIVE }))
      .providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels);
    for (const [key, window] of Object.entries({ ...WINDOWS, ...ENDPOINT_WINDOWS })) {
      expect(details.find((entry) => entry.modelIdentifier === model[key]), `${key}: ${JSON.stringify(details.find((entry) => entry.modelIdentifier === model[key]))}`)
        .toMatchObject({ maxContextTokens: window });
    }
  }, 240_000);

  afterAll(async () => {
    try {
      for (const socket of sockets.splice(0)) if (socket.readyState === WebSocket.OPEN) socket.close();
      if (server) await server.stop();
    } finally {
      if (lm) await lm.close();
      await removeOwnedTestRuntime(runtimeRoot, database);
    }
  }, 120_000);

  it("MH-01: a stopped native run whose model was removed: the menu lists the offered models, Save is a pending model hand-over, the next message hands over to a fresh session of the new model with the marker and the notice, and the chat keeps the earlier messages", async () => {
    await fs.mkdir(workspace(), { recursive: true });
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: await agentDefinition("mh-solo"), ...nativeLaunch(model["mh-gone-solo"]!) } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    const stream = agentStream(runId);
    await talk(stream, runId, "NATIVE-TURN-ONE: please say something.", "first turn on the model that will be removed");
    const original = await metadata(runId);
    expect(original).toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: model["mh-gone-solo"], platformAgentRunId: expect.any(String) });
    const nativeIds = ids(active(runDir(runId)));
    expect(nativeIds.length).toBeGreaterThan(1);
    expect((await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId })).terminateAgentRun.success).toBe(true);

    await removeModel("mh-gone-solo");
    // AC-001: the Settings menu. The current model is not offered (the "No longer offered" note), and every offered model is listed.
    const options = await soloOptions(runId);
    expect(options, JSON.stringify(options)).toMatchObject({ currentModelIdentifier: model["mh-gone-solo"], modelListReadable: true, currentModel: null });
    expect(offeredBy(options), "the menu lists every offered model, of any capacity").toEqual([...lm.offered].sort());
    expect([...lm.offered].sort(), "the removed model is the only one missing").toEqual(["mh-big", "mh-gone-org", "mh-gone-team", "mh-mid", "mh-small"]);

    const saved = await save(runId, NATIVE, model["mh-small"]!);
    expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED", canonicalSelection: { runtimeKind: NATIVE, llmModelIdentifier: model["mh-small"] } });
    const pending = await metadata(runId);
    expect(pending).toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: model["mh-small"], platformAgentRunId: null,
      pendingRuntimeSwitch: { switchId: expect.any(String), from: expect.objectContaining({ runtimeKind: NATIVE, llmModelIdentifier: model["mh-gone-solo"], platformAgentRunId: original.platformAgentRunId }) } });
    expect(ids(active(runDir(runId))), "the save changed no raw trace").toEqual(nativeIds);
    expect(segments(runDir(runId)), "nothing archived by the save").toEqual([]);
    const key = `runtime_switch:${runId}:${pending.pendingRuntimeSwitch.switchId}`;

    // AC-002: the first message.
    const before = lm.requests.length;
    const turn = await talk(stream, runId, "NATIVE-AFTER-HANDOVER: carry on.", "first turn after the hand-over");
    const archived = segments(runDir(runId));
    expect(archived, "one segment").toHaveLength(1);
    expect(archived[0]).toMatchObject({ boundary_type: "runtime_switch", boundary_key: key, runtime_kind: NATIVE, status: "complete" });
    expect(ids(readRaw(path.join(runDir(runId), archived[0]!.file_name))), "I-7: the segment holds exactly the previous agent's records").toEqual(nativeIds);
    const records = active(runDir(runId));
    expect(records[0], "I-3: the marker starts the new file").toMatchObject({ trace_type: "system_task_notification", sender_id: "system.runtime_handover", correlation_id: key,
      content: `Model changed from ${model["mh-gone-solo"]} to ${model["mh-small"]}.` });
    expect(markers(runDir(runId)), "I-5: one marker").toHaveLength(1);
    expect(notices(runDir(runId)), "the notice is recorded once, with the first input").toHaveLength(1);
    const request = requestAfter(before);
    expect(request.model, "the request goes to the new model").toBe("mh-small");
    const input = userText(request);
    expect(input.indexOf(NOTICE), "the notice comes first").toBeGreaterThanOrEqual(0);
    expect(input.indexOf("NATIVE-AFTER-HANDOVER"), "the user's text follows the notice").toBeGreaterThan(input.indexOf(NOTICE));
    expect(input, "the notice points to the previous journal").toContain("work_journal");
    expect(JSON.stringify(request.messages), "a fresh session: none of the earlier conversation is in the request").not.toContain("NATIVE-TURN-ONE");
    expect(shownText(turn).match(/Model changed from/g) ?? [], "the live chat shows the marker once").toHaveLength(1);
    const done = await metadata(runId);
    expect(done).toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: model["mh-small"], platformAgentRunId: expect.any(String), startedAt: original.startedAt });
    expect(Object.hasOwn(done, "pendingRuntimeSwitch")).toBe(false);
    // A second message carries no notice (once per hand-over).
    const beforeSecond = lm.requests.length;
    await talk(stream, runId, "NATIVE-SECOND: and again.", "second turn");
    expect(lastUserText(requestAfter(beforeSecond)), "no second notice with the second input").not.toContain(NOTICE);
    expect(markers(runDir(runId))).toHaveLength(1);
    expect(notices(runDir(runId))).toHaveLength(1);
    // The reopened chat keeps the earlier conversation and shows the marker.
    const chat = JSON.stringify(((await gql("query($id: String!) { getRunProjection(runId: $id) { conversation } }", { id: runId })).getRunProjection as { conversation: Json[] }).conversation);
    expect(chat).toContain("NATIVE-TURN-ONE");
    expect(chat).toContain(`Model changed from ${model["mh-gone-solo"]} to ${model["mh-small"]}.`);
    expect(chat).toContain("NATIVE-AFTER-HANDOVER");
  }, 420_000);

  it("MH-02: re-edits of a native run: on a model with a verified capacity (a custom endpoint's) an equal model keeps the session; while a hand-over is pending (a) the first model again undoes it, (b) a smaller third model stays pending from the first, (c) an equal third model resumes the first session, (d) another runtime stays pending from the first", async () => {
    await fs.mkdir(workspace(), { recursive: true });
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: await agentDefinition("mh-reedit"), ...nativeLaunch(model["ce-big"]!) } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    const stream = agentStream(runId);
    await talk(stream, runId, "NATIVE-REEDIT-ONE: please say something.", "first turn");
    const session = (await metadata(runId)).platformAgentRunId as string;
    expect(session).toEqual(expect.any(String));
    const nativeIds = ids(active(runDir(runId)));
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId });

    // AC-003: an equal, verified model stays in the same session; nothing pending.
    expect(await save(runId, NATIVE, model["ce-mid"]!), "equal model").toMatchObject({ success: true, outcome: "UPDATED" });
    expect(await metadata(runId), `same session, no hand-over: ${JSON.stringify(await metadata(runId))}`).toMatchObject({ llmModelIdentifier: model["ce-mid"], platformAgentRunId: session });
    expect(Object.hasOwn(await metadata(runId), "pendingRuntimeSwitch")).toBe(false);

    // A smaller model: a pending hand-over from the model the session ran on (mid).
    expect(await save(runId, NATIVE, model["ce-small"]!), "smaller model").toMatchObject({ success: true, outcome: "UPDATED" });
    const pending = await metadata(runId);
    expect(pending).toMatchObject({ llmModelIdentifier: model["ce-small"], platformAgentRunId: null,
      pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: NATIVE, llmModelIdentifier: model["ce-mid"], platformAgentRunId: session }) } });
    // (b) a third, smaller model: still pending, still from mid (the same switch).
    expect(await save(runId, NATIVE, model["ce-tiny"]!), "(b) smaller third model").toMatchObject({ success: true, outcome: "UPDATED" });
    const stillPending = await metadata(runId);
    expect(stillPending).toMatchObject({ llmModelIdentifier: model["ce-tiny"], platformAgentRunId: null });
    expect(stillPending.pendingRuntimeSwitch, "(b) the switch stays as it was").toEqual(pending.pendingRuntimeSwitch);
    // (d) another runtime: pending from the first model (mid).
    expect(await save(runId, AGY, AGY_MODEL), "(d) another runtime").toMatchObject({ success: true, outcome: "UPDATED" });
    const toAgy = await metadata(runId);
    expect(toAgy).toMatchObject({ runtimeKind: AGY, platformAgentRunId: null });
    expect(toAgy.pendingRuntimeSwitch.from, "(d) still from the first model").toEqual(pending.pendingRuntimeSwitch.from);
    // (c) an equal-or-bigger third model, both verified (big = the capacity of mid): the first session resumes with it.
    expect(await save(runId, NATIVE, model["ce-big"]!), "(c) equal third model").toMatchObject({ success: true, outcome: "UPDATED" });
    const resumed = await metadata(runId);
    expect(resumed, "(c) the first session resumes with the third model").toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: model["ce-big"], platformAgentRunId: session });
    expect(Object.hasOwn(resumed, "pendingRuntimeSwitch"), "(c) nothing pending").toBe(false);

    // (a) from a pending hand-over from big: choosing big again is an undo.
    expect(await save(runId, NATIVE, model["ce-small"]!)).toMatchObject({ success: true, outcome: "UPDATED" });
    const again = await metadata(runId);
    expect(again.pendingRuntimeSwitch.from).toMatchObject({ llmModelIdentifier: model["ce-big"], platformAgentRunId: session });
    expect(await save(runId, NATIVE, model["ce-big"]!), "(a) undo").toMatchObject({ success: true, outcome: "UPDATED" });
    const undone = await metadata(runId);
    expect(undone, "(a) the session is back").toMatchObject({ llmModelIdentifier: model["ce-big"], platformAgentRunId: session });
    expect(Object.hasOwn(undone, "pendingRuntimeSwitch"), "(a) nothing pending").toBe(false);
    expect(ids(active(runDir(runId))), "no settings save wrote a raw trace").toEqual(nativeIds);
    expect(segments(runDir(runId))).toEqual([]);

    // The message after an undo is a plain message of the first session: no marker, no notice, no segment.
    const before = lm.requests.length;
    await talk(stream, runId, "NATIVE-AFTER-UNDO: carry on.", "message after the undo");
    expect(requestAfter(before).model).toBe("ce-big");
    expect(lastUserText(requestAfter(before)), "no notice").not.toContain(NOTICE);
    expect(markers(runDir(runId)), "no marker").toEqual([]);
    expect(notices(runDir(runId)), "no notice").toEqual([]);
    expect(segments(runDir(runId)), "no segment").toEqual([]);
    expect((await metadata(runId)).platformAgentRunId, "the same session").toBe(session);
  }, 420_000);

  it("MH-03: a Team member on a removed model hands over (that member only); the Team's default row on a removed model accepts any offered model directly", async () => {
    await fs.mkdir(workspace(), { recursive: true });
    const agentId = await agentDefinition("mh-team-member");
    const created = (await gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }", { input: {
      teamDefinitionId: await teamDefinition(agentId),
      teamConfigs: [{ teamAddress: "/", ...nativeLaunch(model["mh-gone-team"]!) }],
      memberConfigs: ["lead", "worker"].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: agentId, ...nativeLaunch(model["mh-gone-team"]!) })),
    } })).createAgentTeamRun as Json;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId as string;
    const startTree = await treeOf(teamTreeFile(teamRunId));
    const lead = teamMember(startTree, "/lead").agentRunId as string;
    const worker = teamMember(startTree, "/worker").agentRunId as string;
    const dir = (runId: string) => findDir(memory("agent_teams", teamRunId), runId)!;
    const stream = teamStream(teamRunId);
    await talk(stream, worker, "NATIVE-TEAM-WORKER: please say something.", "worker first turn");
    await talk(stream, lead, "NATIVE-TEAM-LEAD: please say something.", "lead first turn");
    const workerIds = ids(active(dir(worker)));
    const leadBefore = readFileSync(path.join(dir(lead), "raw_traces_active.jsonl"), "utf8");
    expect((await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: teamRunId })).terminateAgentTeamRun.success).toBe(true);

    await removeModel("mh-gone-team");
    const scopes = (await gql(`query($id: String!) { teamRunModelOptions(teamRunId: $id) { scopeKind scopeAddress ${OPTIONS} } }`, { id: teamRunId })).teamRunModelOptions as Json[];
    for (const scope of scopes) {
      expect(scope, `${scope.scopeAddress}: the removed model is the current one, and the menu is not empty`).toMatchObject({ currentModel: null, modelListReadable: true });
      expect(offeredBy(scope), `${scope.scopeAddress}: every offered model is listed`).toEqual([...lm.offered].sort());
    }
    expect(scopes.map((scope) => `${scope.scopeKind} ${scope.scopeAddress}`).sort()).toEqual(["CONFIGURED_AGENT /lead", "CONFIGURED_AGENT /worker", "CONFIGURED_TEAM /"]);

    // The Team's default row (no session): accepted directly, nothing becomes pending.
    const defaultSave = await teamSelection(teamRunId, "CONFIGURED_TEAM", "/", model["mh-small"]!);
    expect(defaultSave, JSON.stringify(defaultSave)).toMatchObject({ success: true, outcome: "UPDATED" });
    const afterDefault = await treeOf(teamTreeFile(teamRunId));
    expect(afterDefault.rootTeam.defaultLaunchConfiguration, "the default carries the new model").toMatchObject({ runtimeKind: NATIVE, llmModelIdentifier: model["mh-small"] });
    for (const address of ["/lead", "/worker"]) expect(Object.hasOwn(teamMember(afterDefault, address), "pendingRuntimeSwitch"), `${address}: the default row made no hand-over`).toBe(false);

    // The worker (a member with a session): a pending model hand-over, that member only.
    const treeBefore = await treeOf(teamTreeFile(teamRunId));
    const saved = await teamSelection(teamRunId, "CONFIGURED_AGENT", "/worker", model["mh-small"]!);
    expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pendingTree = await treeOf(teamTreeFile(teamRunId));
    expect(teamMember(pendingTree, "/worker")).toMatchObject({
      launchConfiguration: expect.objectContaining({ runtimeKind: NATIVE, llmModelIdentifier: model["mh-small"] }), platformAgentRunId: null,
      pendingRuntimeSwitch: { switchId: expect.any(String), from: expect.objectContaining({ runtimeKind: NATIVE, llmModelIdentifier: model["mh-gone-team"] }) } });
    expect(teamMember(pendingTree, "/lead"), "the other member did not move").toEqual(teamMember(treeBefore, "/lead"));
    expect(ids(active(dir(worker))), "the save changed no raw trace").toEqual(workerIds);
    const key = `runtime_switch:${worker}:${teamMember(pendingTree, "/worker").pendingRuntimeSwitch.switchId}`;

    const before = lm.requests.length;
    await talk(stream, worker, "NATIVE-TEAM-AFTER: carry on.", "worker first turn after the hand-over");
    const archived = segments(dir(worker));
    expect(archived).toHaveLength(1);
    expect(archived[0]).toMatchObject({ boundary_type: "runtime_switch", boundary_key: key, runtime_kind: NATIVE });
    expect(ids(readRaw(path.join(dir(worker), archived[0]!.file_name))), "I-7").toEqual(workerIds);
    expect(active(dir(worker))[0]).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: key, content: `Model changed from ${model["mh-gone-team"]} to ${model["mh-small"]}.` });
    expect(markers(dir(worker)), "one marker").toHaveLength(1);
    const request = requestAfter(before);
    expect(request.model).toBe("mh-small");
    const input = userText(request);
    expect(input.indexOf(NOTICE), "the notice comes first").toBeGreaterThanOrEqual(0);
    expect(input.indexOf("NATIVE-TEAM-AFTER")).toBeGreaterThan(input.indexOf(NOTICE));
    expect(JSON.stringify(request.messages)).not.toContain("NATIVE-TEAM-WORKER");
    const doneTree = await treeOf(teamTreeFile(teamRunId));
    // (A native Team member never stores a session ID in its Team's tree: its session is derived from the member's run, before and after.)
    expect(teamMember(doneTree, "/worker"), "the hand-over is complete: the new model is kept").toMatchObject({ launchConfiguration: expect.objectContaining({ llmModelIdentifier: model["mh-small"] }) });
    expect(Object.hasOwn(teamMember(doneTree, "/worker"), "pendingRuntimeSwitch")).toBe(false);
    expect(readFileSync(path.join(dir(lead), "raw_traces_active.jsonl"), "utf8"), "the other member's file never moved").toBe(leadBefore);
    expect(segments(dir(lead))).toEqual([]);
    const chat = JSON.stringify(((await gql("query($t: String!, $a: String!) { getTeamMemberRunProjection(teamRunId: $t, agentRunId: $a) { conversation } }", { t: teamRunId, a: worker })).getTeamMemberRunProjection as { conversation: Json[] }).conversation);
    expect(chat).toContain("NATIVE-TEAM-WORKER");
    expect(chat).toContain(`Model changed from ${model["mh-gone-team"]} to ${model["mh-small"]}.`);
  }, 600_000);

  it("MH-04: Org members on removed models, a direct Agent and an Agent of a mounted Team, saved in one Org save: UPDATED (no internal error), the session is persisted in the Org's tree, and each hands over by its own first message", async () => {
    await fs.mkdir(workspace(), { recursive: true });
    const agentId = await agentDefinition("mh-org-member");
    const teamId = await teamDefinition(agentId);
    const orgId = (await gql("mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }", { input: {
      name: `mh-org ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.",
      members: [
        { memberName: "direct", ref: agentId, refType: "AGENT", refScope: "SHARED" },
        { memberName: "crew", ref: teamId, refType: "AGENT_TEAM", refScope: "SHARED" },
      ], handoffs: [] } })).createAgentOrgDefinition.id as string;
    const created = (await gql("mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }", { input: {
      agentOrgDefinitionId: orgId, rootConfiguration: nativeLaunch(model["mh-gone-org"]!), agentOverrides: [] } })).createAgentOrgRun as Json;
    expect(created.success, created.message).toBe(true);
    const orgRunId = created.agentOrgRunId as string;
    const startTree = await orgTree(orgRunId);
    const direct = orgAgent(startTree, "/direct").agentRunId as string;
    const worker = orgAgent(startTree, "/crew/worker").agentRunId as string;
    const lead = orgAgent(startTree, "/crew/lead").agentRunId as string;
    const stream = orgStream(orgRunId);
    const dir = (runId: string) => findDir(memory(), runId)!;
    await talk(stream, direct, "NATIVE-ORG-DIRECT: please say something.", "direct first turn");
    await talk(stream, worker, "NATIVE-ORG-WORKER: please say something.", "worker first turn");
    await talk(stream, lead, "NATIVE-ORG-LEAD: please say something.", "lead first turn");
    const nativeDirect = ids(active(dir(direct)));
    const nativeWorker = ids(active(dir(worker)));
    const leadBefore = readFileSync(path.join(dir(lead), "raw_traces_active.jsonl"), "utf8");
    expect((await gql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id: orgRunId })).terminateAgentOrgRun.success).toBe(true);

    await removeModel("mh-gone-org");
    const scopes = (await gql(`query($id: String!) { agentOrgRunModelOptions(orgRunId: $id) { scopeKind scopeAddress ${OPTIONS} } }`, { id: orgRunId })).agentOrgRunModelOptions as Json[];
    const memberScopes = scopes.filter((scope) => scope.scopeKind === "CONFIGURED_AGENT");
    expect(memberScopes.length).toBeGreaterThanOrEqual(3);
    for (const scope of memberScopes) {
      expect(scope, `${scope.scopeAddress}: the removed model is not offered`).toMatchObject({ currentModel: null, modelListReadable: true });
      expect(offeredBy(scope), `${scope.scopeAddress}: every offered model is listed`).toEqual([...lm.offered].sort());
    }

    const treeBefore = await orgTree(orgRunId);
    const saved = (await gql(`mutation($input: UpdateStoppedAgentOrgRunConfigInput!) { updateStoppedAgentOrgRunConfig(input: $input) { success outcome message fieldErrors { path message } } }`, { input: {
      orgRunId, teamWorkspacePatches: [], selectionPatches: ["/direct", "/crew/worker"].map((scopeAddress) => ({
        scopeKind: "CONFIGURED_AGENT", scopeAddress, runtimeKind: NATIVE, llmModelIdentifier: model["mh-small"], llmConfig: null })) } })).updateStoppedAgentOrgRunConfig as Json;
    expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pendingTree = await orgTree(orgRunId);
    // The member's own record is what the Org's save wrote (the settings page's tree view does not carry the pending field).
    const teamRunIdOfCrew = (pendingTree.rootOrg.members as Json[]).find((member) => member.teamRunId)!.teamRunId as string;
    const disk = (runId: string): Json => {
      if (runId === direct) return JSON.parse(readFileSync(path.join(dir(runId), "run_metadata.json"), "utf8")) as Json;
      // An Agent of a mounted Team keeps its record in that Team's own tree file.
      const member = (JSON.parse(readFileSync(teamTreeFile(teamRunIdOfCrew), "utf8")) as Json).rootTeam.members.find((entry: Json) => entry.agentRunId === runId) as Json;
      return { ...member, runtimeKind: member.launchConfiguration.runtimeKind, llmModelIdentifier: member.launchConfiguration.llmModelIdentifier };
    };
    for (const [address, runId] of [["/direct", direct], ["/crew/worker", worker]] as const) {
      expect(orgAgent(pendingTree, address), `${address}: the new model, session binding dropped`).toMatchObject({
        launchConfiguration: expect.objectContaining({ runtimeKind: NATIVE, llmModelIdentifier: model["mh-small"] }), platformAgentRunId: null });
      expect(disk(runId), `${address}: a pending model hand-over, written to the member's record (CR-001 and its second fix: the session binding is persisted)`).toMatchObject({
        runtimeKind: NATIVE, llmModelIdentifier: model["mh-small"], platformAgentRunId: null, launchSource: { origin: "settings" },
        pendingRuntimeSwitch: { switchId: expect.any(String), from: expect.objectContaining({ runtimeKind: NATIVE, llmModelIdentifier: model["mh-gone-org"], platformAgentRunId: runId === direct ? runId : null }) } });
    }
    expect(orgAgent(pendingTree, "/crew/lead"), "the other member did not move").toEqual(orgAgent(treeBefore, "/crew/lead"));
    expect(ids(active(dir(direct)))).toEqual(nativeDirect);
    expect(segments(dir(direct))).toEqual([]);

    const pendingSwitchIds: Record<string, string> = { "/direct": disk(direct).pendingRuntimeSwitch.switchId as string, "/crew/worker": disk(worker).pendingRuntimeSwitch.switchId as string };
    const switchKey = (address: string, runId: string) => `runtime_switch:${runId}:${pendingSwitchIds[address]}`;
    for (const [address, runId, nativeIds, userMessage] of [["/direct", direct, nativeDirect, "NATIVE-ORG-DIRECT-AFTER"], ["/crew/worker", worker, nativeWorker, "NATIVE-ORG-WORKER-AFTER"]] as const) {
      const before = lm.requests.length;
      await talk(stream, runId, `${userMessage}: carry on.`, `${address} first turn after the hand-over`);
      const archived = segments(dir(runId));
      expect(archived, `${address}: one segment`).toHaveLength(1);
      expect(archived[0]).toMatchObject({ boundary_type: "runtime_switch", boundary_key: switchKey(address, runId), runtime_kind: NATIVE });
      expect(ids(readRaw(path.join(dir(runId), archived[0]!.file_name))), `${address}: I-7`).toEqual(nativeIds);
      expect(active(dir(runId))[0], `${address}: I-3`).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: switchKey(address, runId),
        content: `Model changed from ${model["mh-gone-org"]} to ${model["mh-small"]}.` });
      expect(markers(dir(runId)), `${address}: I-5`).toHaveLength(1);
      const request = requestAfter(before);
      expect(request.model, `${address}: the request goes to the new model`).toBe("mh-small");
      const input = userText(request);
      expect(input.indexOf(NOTICE), `${address}: the notice comes first`).toBeGreaterThanOrEqual(0);
      expect(input.indexOf(userMessage), `${address}: the user's text follows the notice`).toBeGreaterThan(input.indexOf(NOTICE));
    }
    for (const [address, runId] of [["/direct", direct], ["/crew/worker", worker]] as const) {
      expect(Object.hasOwn(disk(runId), "pendingRuntimeSwitch"), `${address}: pending cleared`).toBe(false);
      if (runId === direct) expect(disk(runId).platformAgentRunId, `${address}: the session is set`).toEqual(expect.any(String));
      expect(orgAgent(await orgTree(orgRunId), address).platformAgentRunId, `${address}: the Org's tree shows the same session`).toBe(disk(runId).platformAgentRunId);
    }
    expect(readFileSync(path.join(dir(lead), "raw_traces_active.jsonl"), "utf8"), "the other member's file never moved").toBe(leadBefore);
    expect(segments(dir(lead))).toEqual([]);
  }, 600_000);
  it("MH-05: an LM Studio model has no verified capacity in the real catalog, so even an equal-window LM Studio model is a hand-over (the user's rule: unknown capacity hands over)", async () => {
    await fs.mkdir(workspace(), { recursive: true });
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: await agentDefinition("mh-unverified"), ...nativeLaunch(model["mh-big"]!) } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    await talk(agentStream(runId), runId, "NATIVE-UNVERIFIED-ONE: please say something.", "first turn");
    const session = (await metadata(runId)).platformAgentRunId as string;
    await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId });
    expect(await save(runId, NATIVE, model["mh-mid"]!)).toMatchObject({ success: true, outcome: "UPDATED" });
    expect(await metadata(runId), "AC-005: unverified capacities hand over, even for equal windows").toMatchObject({ llmModelIdentifier: model["mh-mid"], platformAgentRunId: null,
      pendingRuntimeSwitch: { from: expect.objectContaining({ llmModelIdentifier: model["mh-big"], platformAgentRunId: session }) } });
    // Choosing the first model again is an undo whatever the capacity evidence is.
    expect(await save(runId, NATIVE, model["mh-big"]!)).toMatchObject({ success: true, outcome: "UPDATED" });
    const undone = await metadata(runId);
    expect(undone).toMatchObject({ llmModelIdentifier: model["mh-big"], platformAgentRunId: session });
    expect(Object.hasOwn(undone, "pendingRuntimeSwitch")).toBe(false);
  }, 300_000);
});
