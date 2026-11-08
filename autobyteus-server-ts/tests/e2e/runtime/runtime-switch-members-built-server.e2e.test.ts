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

// Agent runtime switch of a TEAM member and of ORG members (a direct Agent and an Agent of a mounted Team) on the BUILT server
// (autobyteus-348: REQ-001..REQ-004, AC-001..AC-007; invariants I-3, I-5, I-7, I-8, I-10). The server is `dist/app.js` on a
// test-owned data root with a private HOME and database. Only models are scripted, as in runtime-switch-native-built-server:
//   - the native runtime talks to a test-owned HTTP endpoint that answers LM Studio's model list and chat completions;
//   - Antigravity is the scripted CLI tests/fixtures/agy-failure-cli.mjs (case `linked_skills`: `ECHO_INPUT` answers with the
//     exact input of the turn).
// A member is switched exactly as the Settings page does it: the stopped-run mutation names the member's scope with its new
// agent runtime and model, then the member's next message makes the switch real.
// Cases:
//   MS-01 Team member native -> Antigravity: the save is a pending switch on that member only (the other member and every
//         raw trace unchanged); the first message archives exactly the native agent's records as one `runtime_switch`
//         segment (I-7), starts the new file with one marker (I-3, I-5), delivers the hand-over notice before the user's text
//         and once, and clears the pending field and sets the session in the Team's tree; the reopened chat shows the earlier
//         conversation and the marker (I-10).
//   MS-02 Team member Antigravity -> native with a start that fails (the archive step is obstructed after the native
//         candidate wrote its instruction): the previous agent's file is as before, the switch stays pending, and the retry
//         completes with one marker and one more segment holding only the Antigravity agent's records (I-7); the Team's
//         other member never moved.
//   MS-03 a server restart after a switch: the tree keeps the new agent runtime with no pending field, the member restores
//         and answers, and the earlier segments are unchanged (I-8).
//   MS-05 (autobyteus-440) the same Team member goes back to Antigravity after its native era: its earlier Antigravity capsule is replaced,
//         the message completes, one segment and one marker for the switch.
//   MS-04 Org members: a direct Agent and an Agent of a mounted Team switched in ONE save; each switches by its own first
//         message with its own I-7 segment and marker; the Org's other members never moved.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist). Run:
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//     ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/runtime-switch-members-built-server.e2e.test.ts --no-watch

const FAKE_AGY = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const ENABLED = process.env.RUN_AGY_FAILURE_E2E === "1" && path.isAbsolute(FAKE_AGY) && existsSync(FAKE_AGY)
  && spawnSync(FAKE_AGY, ["--version"], { stdio: "ignore" }).status === 0 && existsSync(path.resolve("dist/app.js"));
const AGY = "antigravity_cli";
const NATIVE = "autobyteus";
const AGY_MODEL = "gemini-3.8-flash-low";
const NATIVE_KEY = "ms-native-a";

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

/** A stand-in for LM Studio: model list on GET, a streamed chat completion on POST. */
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
    const chunk = (delta: Json, finish: string | null) => ({ id: `ms-${requests.length}`, object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(`data: ${JSON.stringify(chunk({ role: "assistant", content: `NATIVE-REPLY-${requests.length}` }, null))}\n\ndata: ${JSON.stringify(chunk({}, "stop"))}\n\ndata: [DONE]\n\n`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { origin, requests, close: () => { server.closeAllConnections(); return new Promise<void>((resolve) => server.close(() => resolve())); } };
};

describe.runIf(ENABLED)("agent runtime switch of Team and Org members on the built server", () => {
  const suffix = `runtime-switch-members-${process.pid}-${Date.now()}`;
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

  const agentDefinition = async (name: string) => (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
    { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: "runtime switch of members E2E", instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id as string;
  const teamDefinition = async (agentId: string) => (await gql("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
    { input: { name: `ms-team ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.", coordinatorMemberName: "lead",
      nodes: ["lead", "worker"].map((memberName) => ({ memberName, ref: agentId, refScope: "SHARED" })) } })).createAgentTeamDefinition.id as string;
  const nativeLaunch = (workspaceRootPath: string) => ({ runtimeKind: NATIVE, llmModelIdentifier: nativeModel, llmConfig: null, autoExecuteTools: true, workspaceRootPath });

  const treeOf = async (file: string): Promise<Json> => JSON.parse(await fs.readFile(file, "utf8")) as Json;
  const teamTreeFile = (teamRunId: string) => memory("agent_teams", teamRunId, "team_run_execution_tree.json");
  const orgTreeFile = (orgRunId: string) => memory("agent_orgs", orgRunId, "agent_org_run_execution_tree.json");
  const teamMember = (tree: Json, address: string): Json => tree.rootTeam.members.find((member: Json) => member.address === address);
  const orgAgents = (tree: Json): Json[] => tree.rootOrg.members.flatMap((member: Json) => "agentRunId" in member ? [member] : member.members);
  const orgAgent = (tree: Json, address: string): Json => orgAgents(tree).find((member) => member.address === address)!;

  /** The conversation stream of a Team or an Org run, and the command that sends one member a message (the two envelopes differ). */
  type Stream = Readonly<{ path: string; send(socket: WebSocket, agentRunId: string, content: string): void; turnEnded(message: Wire, agentRunId: string): boolean; failed(message: Wire): boolean }>;
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

  /** One conversation connection; a message to a stopped member restores its root first and activates a pending switch. */
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
  /** A message that is expected to fail: resolves with what happened instead of throwing on the server's error. */
  const attempt = async (stream: Stream, agentRunId: string, content: string) => {
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
    await until(() => messages.some((m) => m.type === "CONNECTED" || m.type === "ERROR") || closed, "attempt: connected, refused or closed", 90_000);
    if (messages.some((m) => m.type === "CONNECTED") && !messages.some((m) => m.type === "ERROR")) stream.send(socket, agentRunId, content);
    await until(() => messages.some((m) => stream.turnEnded(m, agentRunId) || stream.failed(m)) || closed, "attempt: outcome", 60_000);
    await wait(500);
    const completed = messages.some((m) => stream.turnEnded(m, agentRunId));
    socket.close();
    return { messages, completed };
  };

  const active = (dir: string) => readRaw(path.join(dir, "raw_traces_active.jsonl"));
  const segments = (dir: string): Json[] => existsSync(path.join(dir, "raw_traces_manifest.json"))
    ? (JSON.parse(readFileSync(path.join(dir, "raw_traces_manifest.json"), "utf8")) as { segments: Json[] }).segments.filter((segment) => segment.status === "complete") : [];
  const ids = (records: Json[]) => records.map((record) => record.id as string);
  const echoed = (dir: string): string[] => active(dir).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("ECHO:"))
    .map((record) => JSON.parse(String(record.content).slice("ECHO:".length)) as string);

  const teamSelection = (teamRunId: string, scopeAddress: string, runtimeKind: string, llmModelIdentifier: string) => gql(
    `mutation($input: UpdateStoppedTeamRunSelectionsInput!) { updateStoppedTeamRunSelections(input: $input) { success outcome message fieldErrors { path message } } }`,
    { input: { teamRunId, selectionPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress, runtimeKind, llmModelIdentifier, llmConfig: null }] } }).then((data) => data.updateStoppedTeamRunSelections as Json);

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

  // The Team's state shared by MS-01..MS-03 (they continue one run, like a user would).
  const team: { teamRunId: string; lead: string; worker: string; nativeIds: string[]; keyOne: string; agyIds: string[]; keyTwo: string } = {
    teamRunId: "", lead: "", worker: "", nativeIds: [], keyOne: "", agyIds: [], keyTwo: "",
  };
  const workerDir = () => findDir(memory("agent_teams", team.teamRunId), team.worker)!;
  const leadDir = () => findDir(memory("agent_teams", team.teamRunId), team.lead)!;
  const teamSocket = () => teamStream(team.teamRunId);

  it("MS-01: a Team member native -> Antigravity: the save marks that member only, the first message archives exactly the native agent's records and starts the new file with one marker, the reopened chat shows both", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const agentId = await agentDefinition("ms-member");
    const created = (await gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }", { input: {
      teamDefinitionId: await teamDefinition(agentId),
      teamConfigs: [{ teamAddress: "/", ...nativeLaunch(workspace) }],
      memberConfigs: ["lead", "worker"].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: agentId, ...nativeLaunch(workspace) })),
    } })).createAgentTeamRun as Json;
    expect(created.success, created.message).toBe(true);
    team.teamRunId = created.teamRunId;
    const startTree = await treeOf(teamTreeFile(team.teamRunId));
    team.lead = teamMember(startTree, "/lead").agentRunId;
    team.worker = teamMember(startTree, "/worker").agentRunId;

    await talk(teamSocket(), team.worker, "NATIVE-TURN-ONE: please say something.", "worker native turn");
    await talk(teamSocket(), team.lead, "NATIVE-TURN-LEAD: please say something.", "lead native turn");
    team.nativeIds = ids(active(workerDir()));
    const leadBefore = readFileSync(path.join(leadDir(), "raw_traces_active.jsonl"), "utf8");
    expect(team.nativeIds.length, "the worker recorded its turn").toBeGreaterThan(1);
    expect(lm.requests.length).toBeGreaterThan(0);

    // --- the save: a pending switch on the worker only; no raw trace moves
    expect((await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: team.teamRunId })).terminateAgentTeamRun.success).toBe(true);
    const treeBefore = await treeOf(teamTreeFile(team.teamRunId));
    const saved = await teamSelection(team.teamRunId, "/worker", AGY, AGY_MODEL);
    expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pendingTree = await treeOf(teamTreeFile(team.teamRunId));
    expect(teamMember(pendingTree, "/worker")).toMatchObject({
      launchConfiguration: expect.objectContaining({ runtimeKind: AGY, llmModelIdentifier: AGY_MODEL }), platformAgentRunId: null,
      pendingRuntimeSwitch: { switchId: expect.any(String), from: expect.objectContaining({ runtimeKind: NATIVE }) },
    });
    expect(teamMember(pendingTree, "/lead"), "the other member did not move").toEqual(teamMember(treeBefore, "/lead"));
    expect(Object.hasOwn(teamMember(pendingTree, "/lead"), "pendingRuntimeSwitch")).toBe(false);
    expect(ids(active(workerDir())), "the save changed no raw trace").toEqual(team.nativeIds);
    expect(segments(workerDir()), "nothing archived by the save").toEqual([]);
    team.keyOne = `runtime_switch:${team.worker}:${teamMember(pendingTree, "/worker").pendingRuntimeSwitch.switchId}`;

    // --- the first message makes the switch real
    const turn = await talk(teamSocket(), team.worker, "ECHO_INPUT", "worker antigravity first turn");
    const archived = segments(workerDir());
    expect(archived).toHaveLength(1);
    expect(archived[0], "the segment carries the switch and the previous runtime").toMatchObject({ boundary_type: "runtime_switch", boundary_key: team.keyOne, runtime_kind: NATIVE });
    expect(ids(readRaw(path.join(workerDir(), archived[0]!.file_name))), "I-7: the segment holds exactly the native agent's records").toEqual(team.nativeIds);
    const records = active(workerDir());
    expect(records[0], "I-3: the marker starts the new file").toMatchObject({ trace_type: "system_task_notification", sender_id: "system.runtime_handover", correlation_id: team.keyOne,
      content: expect.stringMatching(/^Agent runtime changed from AutoByteus \(.+\) to Antigravity CLI \(.+\)\.$/) });
    expect(records.filter((record) => record.correlation_id === team.keyOne), "I-5: one marker").toHaveLength(1);
    const received = echoed(workerDir())[0]!;
    expect(received.indexOf("[System: runtime hand-over]"), "the notice comes first").toBe(0);
    expect(received.indexOf("ECHO_INPUT")).toBeGreaterThan(received.indexOf("[System: runtime hand-over]"));
    expect(turn.some((m) => JSON.stringify(m.payload).includes("Agent runtime changed from")),
      `the live chat shows the marker (saw ${[...new Set(turn.map((m) => m.type))].join(", ")})`).toBe(true);
    const doneTree = await treeOf(teamTreeFile(team.teamRunId));
    expect(teamMember(doneTree, "/worker"), "the commit set the session and removed the pending field").toMatchObject({ platformAgentRunId: expect.any(String) });
    expect(Object.hasOwn(teamMember(doneTree, "/worker"), "pendingRuntimeSwitch")).toBe(false);
    expect(readFileSync(path.join(leadDir(), "raw_traces_active.jsonl"), "utf8"), "the other member's file never moved").toBe(leadBefore);
    expect(segments(leadDir())).toEqual([]);

    // A second message carries no notice (once per switch).
    await talk(teamSocket(), team.worker, "ECHO_INPUT", "worker antigravity second turn");
    expect(echoed(workerDir()).at(-1)).toBe("ECHO_INPUT");
    expect(active(workerDir()).filter((record) => record.sender_id === "system.runtime_handover")).toHaveLength(1);

    // --- the reopened chat (I-10): the earlier conversation and the marker
    const projection = (await gql(`query($teamRunId: String!, $agentRunId: String!) { getTeamMemberRunProjection(teamRunId: $teamRunId, agentRunId: $agentRunId) { conversation } }`,
      { teamRunId: team.teamRunId, agentRunId: team.worker })).getTeamMemberRunProjection as { conversation: Json[] };
    const chat = JSON.stringify(projection.conversation);
    expect(chat).toContain("NATIVE-TURN-ONE");
    expect(chat).toContain("Agent runtime changed from");
    expect(chat).toContain("ECHO_INPUT");
    team.agyIds = ids(active(workerDir()));
  }, 360_000);

  it("MS-02: a Team member Antigravity -> native with a failed start leaves the previous agent's file as it was, and the retry completes with one marker and one segment", async () => {
    expect((await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: team.teamRunId })).terminateAgentTeamRun.success).toBe(true);
    expect(await teamSelection(team.teamRunId, "/worker", NATIVE, nativeModel)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pending = teamMember(await treeOf(teamTreeFile(team.teamRunId)), "/worker").pendingRuntimeSwitch;
    expect(pending).toMatchObject({ from: expect.objectContaining({ runtimeKind: AGY }) });
    team.keyTwo = `runtime_switch:${team.worker}:${pending.switchId}`;
    const before = readFileSync(path.join(workerDir(), "raw_traces_active.jsonl"), "utf8");

    // The native candidate writes its system instruction while it is prepared; the archive step then fails (its segment name is taken by a folder).
    const obstruction = path.join(workerDir(), "raw_traces_000002.jsonl");
    await fs.mkdir(obstruction);
    const failed = await attempt(teamSocket(), team.worker, "NATIVE-TURN-TWO: carry on.");
    expect(failed.completed, "the failed start ends no turn").toBe(false);
    expect(readFileSync(path.join(workerDir(), "raw_traces_active.jsonl"), "utf8"), "the previous agent's file is exactly as before").toBe(before);
    const stillPending = teamMember(await treeOf(teamTreeFile(team.teamRunId)), "/worker");
    expect(stillPending.pendingRuntimeSwitch, "the switch stays pending").toMatchObject({ switchId: pending.switchId });
    expect(stillPending.platformAgentRunId).toBeNull();
    expect(segments(workerDir()), "no second segment yet").toHaveLength(1);

    await fs.rm(obstruction, { recursive: true, force: true });
    await talk(teamSocket(), team.worker, "NATIVE-TURN-TWO: carry on.", "worker native retry");
    const archived = segments(workerDir());
    expect(archived).toHaveLength(2);
    const second = archived.find((segment) => segment.boundary_key === team.keyTwo)!;
    expect(second, "exactly one segment for the retried switch").toMatchObject({ boundary_type: "runtime_switch", runtime_kind: AGY });
    const secondRecords = readRaw(path.join(workerDir(), second.file_name));
    expect(ids(secondRecords), "I-7: the segment = the first marker and exactly the Antigravity agent's records").toEqual(team.agyIds);
    expect(secondRecords.filter((record) => record.trace_type === "system_instruction"), "none of the native candidate's records").toEqual([]);
    const records = active(workerDir());
    expect(records[0]).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: team.keyTwo,
      content: expect.stringMatching(/^Agent runtime changed from Antigravity CLI \(.+\) to AutoByteus \(.+\)\.$/) });
    expect(records.filter((record) => record.correlation_id === team.keyTwo), "one marker").toHaveLength(1);
    expect(records.some((record) => record.trace_type === "system_instruction"), "the native candidate's instruction opens the new file after the marker").toBe(true);
    const done = teamMember(await treeOf(teamTreeFile(team.teamRunId)), "/worker");
    expect(Object.hasOwn(done, "pendingRuntimeSwitch")).toBe(false);
    expect(done.launchConfiguration).toMatchObject({ runtimeKind: NATIVE });
    expect(segments(leadDir()), "the other member never moved").toEqual([]);
  }, 360_000);

  it("MS-03: after a server restart the member keeps its agent runtime with no pending field, restores and answers, and the earlier segments are unchanged", async () => {
    const archivedBefore = segments(workerDir()).map((segment) => ({ name: segment.file_name, ids: ids(readRaw(path.join(workerDir(), segment.file_name))) }));
    expect((await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: team.teamRunId })).terminateAgentTeamRun.success).toBe(true);
    await stop();
    await launch();
    const config = (await gql("query($id: String!) { getTeamRunResumeConfig(teamRunId: $id) { isActive executionTree } }", { id: team.teamRunId })).getTeamRunResumeConfig as Json;
    const restoredMember = config.executionTree.root_team.members.find((member: Json) => member.address === "/worker");
    expect(restoredMember.launch_configuration).toMatchObject({ runtime_kind: NATIVE });
    await talk(teamSocket(), team.worker, "NATIVE-TURN-THREE: after the restart.", "worker after restart");
    expect(segments(workerDir()).map((segment) => ({ name: segment.file_name, ids: ids(readRaw(path.join(workerDir(), segment.file_name))) })), "I-8: earlier segments unchanged").toEqual(archivedBefore);
    expect(active(workerDir()).filter((record) => String(record.correlation_id ?? "").startsWith("runtime_switch:")).map((record) => record.correlation_id),
      "the restart added no marker: only the retried switch's").toEqual([team.keyTwo]);
  }, 360_000);

  it("MS-05: a Team member native -> Antigravity -> native -> Antigravity: the fourth hop back to Antigravity completes on a fresh capsule, with one segment and one marker per switch (autobyteus-440)", async () => {
    // The worker has now had an Antigravity era (MS-01) and a native era (MS-02): its Antigravity capsule folder is left behind.
    const capsule = path.join(workerDir(), "agy-project");
    expect(existsSync(capsule), "the first Antigravity era left its capsule").toBe(true);
    const nativeEraIds = ids(active(workerDir()));
    const segmentsBefore = segments(workerDir());
    expect((await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: team.teamRunId })).terminateAgentTeamRun.success).toBe(true);
    expect(await teamSelection(team.teamRunId, "/worker", AGY, AGY_MODEL)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pending = teamMember(await treeOf(teamTreeFile(team.teamRunId)), "/worker").pendingRuntimeSwitch;
    expect(pending).toMatchObject({ from: expect.objectContaining({ runtimeKind: NATIVE }) });
    const keyThree = `runtime_switch:${team.worker}:${pending.switchId}`;

    await talk(teamSocket(), team.worker, "ECHO_INPUT", "worker back to antigravity");
    const archived = segments(workerDir());
    expect(archived, "one more segment for this switch").toHaveLength(segmentsBefore.length + 1);
    const third = archived.find((segment) => segment.boundary_key === keyThree)!;
    expect(third, "exactly one segment for the third switch").toMatchObject({ boundary_type: "runtime_switch", runtime_kind: NATIVE });
    expect(ids(readRaw(path.join(workerDir(), third.file_name))), "I-7: the segment holds the native era's records only").toEqual(nativeEraIds);
    const records = active(workerDir());
    expect(records[0]).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: keyThree,
      content: expect.stringMatching(/^Agent runtime changed from AutoByteus \(.+\) to Antigravity CLI \(.+\)\.$/) });
    expect(records.filter((record) => record.correlation_id === keyThree), "one marker").toHaveLength(1);
    const received = echoed(workerDir()).at(-1)!;
    expect(received.indexOf("[System: runtime hand-over]"), "the notice comes first").toBe(0);
    expect(received).toContain("ECHO_INPUT");
    const done = teamMember(await treeOf(teamTreeFile(team.teamRunId)), "/worker");
    expect(Object.hasOwn(done, "pendingRuntimeSwitch")).toBe(false);
    expect(done.launchConfiguration).toMatchObject({ runtimeKind: AGY });
    expect(segments(leadDir()), "the other member never moved").toEqual([]);
  }, 360_000);

  it("MS-04: Org members, a direct Agent and an Agent of a mounted Team, switched in one save: each switches by its own first message with its own segment and marker", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    const agentId = await agentDefinition("ms-org-member");
    const teamId = await teamDefinition(agentId);
    const orgId = (await gql("mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }", { input: {
      name: `ms-org ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.",
      members: [
        { memberName: "direct", ref: agentId, refType: "AGENT", refScope: "SHARED" },
        { memberName: "crew", ref: teamId, refType: "AGENT_TEAM", refScope: "SHARED" },
      ], handoffs: [] } })).createAgentOrgDefinition.id as string;
    const created = (await gql("mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }", { input: {
      agentOrgDefinitionId: orgId, rootConfiguration: nativeLaunch(workspace), agentOverrides: [] } })).createAgentOrgRun as Json;
    expect(created.success, created.message).toBe(true);
    const orgRunId = created.agentOrgRunId as string;
    const startTree = await treeOf(orgTreeFile(orgRunId));
    const direct = orgAgent(startTree, "/direct").agentRunId as string;
    const worker = orgAgent(startTree, "/crew/worker").agentRunId as string;
    const lead = orgAgent(startTree, "/crew/lead").agentRunId as string;
    const socketPath = orgStream(orgRunId);
    const dir = (runId: string) => findDir(memory("agent_orgs", orgRunId), runId)!;

    await talk(socketPath, direct, "NATIVE-TURN-DIRECT: please say something.", "direct native turn");
    await talk(socketPath, worker, "NATIVE-TURN-WORKER: please say something.", "worker native turn");
    await talk(socketPath, lead, "NATIVE-TURN-LEAD: please say something.", "lead native turn");
    const nativeDirect = ids(active(dir(direct)));
    const nativeWorker = ids(active(dir(worker)));
    const leadBefore = readFileSync(path.join(dir(lead), "raw_traces_active.jsonl"), "utf8");

    expect((await gql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id: orgRunId })).terminateAgentOrgRun.success).toBe(true);
    const treeBefore = await treeOf(orgTreeFile(orgRunId));
    const saved = (await gql(`mutation($input: UpdateStoppedAgentOrgRunConfigInput!) { updateStoppedAgentOrgRunConfig(input: $input) { success outcome message fieldErrors { path message } } }`, { input: {
      orgRunId, teamWorkspacePatches: [], selectionPatches: ["/direct", "/crew/worker"].map((scopeAddress) => ({
        scopeKind: "CONFIGURED_AGENT", scopeAddress, runtimeKind: AGY, llmModelIdentifier: AGY_MODEL, llmConfig: null })) } })).updateStoppedAgentOrgRunConfig as Json;
    expect(saved, JSON.stringify(saved)).toMatchObject({ success: true, outcome: "UPDATED" });
    const pendingTree = await treeOf(orgTreeFile(orgRunId));
    for (const address of ["/direct", "/crew/worker"]) {
      expect(orgAgent(pendingTree, address)).toMatchObject({
        launchConfiguration: expect.objectContaining({ runtimeKind: AGY }), platformAgentRunId: null,
        pendingRuntimeSwitch: { from: expect.objectContaining({ runtimeKind: NATIVE }) } });
    }
    expect(orgAgent(pendingTree, "/crew/lead"), "the other member did not move").toEqual(orgAgent(treeBefore, "/crew/lead"));
    expect(ids(active(dir(direct)))).toEqual(nativeDirect);
    expect(segments(dir(direct))).toEqual([]);

    // The stopped Org is restored as the Settings page does it; its members start on their first message.
    const restored = (await gql("mutation($id: String!) { restoreAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId })).restoreAgentOrgRun as Json;
    expect(restored.success, restored.message).toBe(true);
    const keyOf = (address: string, runId: string) => `runtime_switch:${runId}:${orgAgent(pendingTree, address).pendingRuntimeSwitch.switchId}`;
    for (const [address, runId, nativeIds] of [["/direct", direct, nativeDirect], ["/crew/worker", worker, nativeWorker]] as const) {
      await talk(socketPath, runId, "ECHO_INPUT", `${address} antigravity first turn`);
      const archived = segments(dir(runId));
      expect(archived, `${address}: one segment`).toHaveLength(1);
      expect(archived[0]).toMatchObject({ boundary_type: "runtime_switch", boundary_key: keyOf(address, runId), runtime_kind: NATIVE });
      expect(ids(readRaw(path.join(dir(runId), archived[0]!.file_name))), `${address}: I-7`).toEqual(nativeIds);
      const records = active(dir(runId));
      expect(records[0], `${address}: I-3`).toMatchObject({ trace_type: "system_task_notification", sender_id: "system.runtime_handover", correlation_id: keyOf(address, runId) });
      expect(records.filter((record) => record.sender_id === "system.runtime_handover"), `${address}: I-5`).toHaveLength(1);
      expect(echoed(dir(runId))[0]!.indexOf("[System: runtime hand-over]"), `${address}: the notice comes first`).toBe(0);
    }
    const doneTree = await treeOf(orgTreeFile(orgRunId));
    for (const address of ["/direct", "/crew/worker"]) {
      expect(Object.hasOwn(orgAgent(doneTree, address), "pendingRuntimeSwitch"), `${address}: pending cleared`).toBe(false);
      expect(orgAgent(doneTree, address).platformAgentRunId, `${address}: session set`).toEqual(expect.any(String));
    }
    expect(readFileSync(path.join(dir(lead), "raw_traces_active.jsonl"), "utf8"), "the other member's file never moved").toBe(leadBefore);
    expect(segments(dir(lead))).toEqual([]);
  }, 480_000);
});
