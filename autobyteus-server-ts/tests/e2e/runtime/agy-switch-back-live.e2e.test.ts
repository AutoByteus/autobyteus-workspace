import fs from "node:fs/promises";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

// LIVE switch BACK to Antigravity on the BUILT server (switch-back-eexist, autobyteus-440, API/E2E): a Team member runs on the REAL Antigravity
// CLI (`agy`), switches to the real Claude Agent SDK (or Codex App Server), then back to Antigravity. The second Antigravity era used to fail with
// `EEXIST ... agy-project`. The real signed-in `agy` and `codex` need the real HOME, USER and LOGNAME (TESTING.md); each run adds
// conversations to the user's `agy` and `codex` histories and spends their credits (a synthetic `ls` task); the server, its data root and
// database are test-owned. Asserted: I-7 by exact record-id equality on both archived segments, markers first, one marker per era, the
// first segment unchanged, Antigravity answers in era 3 with a fresh session.
// Gate: RUN_AGY_SWITCH_BACK_E2E=1 and the gate of the other runtime: RUN_CLAUDE_E2E=1 (default, `claude`) or RUN_CODEX_E2E=1 with
// AGY_SWITCH_BACK_OTHER=codex. The middle era runs on the other runtime.
// Run: env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" RUN_AGY_SWITCH_BACK_E2E=1 RUN_CODEX_E2E=1 \
//   pnpm exec vitest run tests/e2e/runtime/agy-switch-back-live.e2e.test.ts --no-watch
const commandReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const OTHER_IS_CODEX = process.env.AGY_SWITCH_BACK_OTHER === "codex";
const ENABLED = process.env.RUN_AGY_SWITCH_BACK_E2E === "1" && process.env[OTHER_IS_CODEX ? "RUN_CODEX_E2E" : "RUN_CLAUDE_E2E"] === "1"
  && commandReady("agy") && commandReady(OTHER_IS_CODEX ? "codex" : "claude") && existsSync(path.resolve("dist/app.js"));
const AGY = "antigravity_cli";
const CLAUDE = "antigravity_cli"; // the first and the third era (named CLAUDE in the file this was derived from)
const CODEX = OTHER_IS_CODEX ? "codex_app_server" : "claude_agent_sdk"; // the middle era (named CODEX in the file this was derived from)
const OTHER_LABEL = OTHER_IS_CODEX ? "Codex App Server" : "Claude Agent SDK";
const EVIDENCE_DIR = process.env.RUNTIME_SWITCH_MEMBERS_EVIDENCE_DIR?.trim() || "";
const STEP_MS = Number(process.env.RUNTIME_SWITCH_MEMBERS_STEP_TIMEOUT_MS || 300_000);
const TASK = "Use your shell tool to run the command `ls`, then reply with exactly: DONE";
const FOLLOW_UP = "You are continuing this member's work. Reply with exactly: CONTINUED";

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


describe.runIf(ENABLED)("LIVE switch back to Antigravity on a Team member", () => {
  const suffix = `rsm-live-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  let server: Awaited<ReturnType<typeof startBuiltTestServer>>;
  let agyModel = "";
  let codexModel = "";
  const sockets: WebSocket[] = [];
  const memory = (...parts: string[]) => path.join(runtimeRoot, "memory", ...parts);
  const gql = async <T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> => executeGraphql<T>(server.serverUrl, query, variables);
  const modelsOf = async (runtimeKind: string): Promise<string[]> =>
    (await gql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }", { runtimeKind }))
      .providerModelCatalogSnapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
  const pickModel = async (runtimeKind: string, preferred: string[]): Promise<string> => {
    const available = await modelsOf(runtimeKind);
    const chosen = preferred.map((fragment) => available.find((id) => id.includes(fragment))).find(Boolean) ?? available[0];
    expect(chosen, `${runtimeKind} models: ${available.join(", ")}`).toBeTruthy();
    return chosen!;
  };
  const agentDefinition = async (name: string, defaultLaunchConfig: Json | null = null) => (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id name } }",
    { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: "live runtime switch of members", instructions: "Follow the user's instructions exactly. Use your own shell tool for shell commands. Do not use AutoByteus MCP tools. Keep replies short.", category: "runtime-e2e", toolNames: [],
      ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition as { id: string; name: string };
  const teamDefinition = async (agentId: string) => (await gql("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id name } }",
    { input: { name: `live-team ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.", coordinatorMemberName: "lead",
      nodes: ["lead", "worker"].map((memberName) => ({ memberName, ref: agentId, refScope: "SHARED" })) } })).createAgentTeamDefinition as { id: string; name: string };
  const launchOf = (runtimeKind: string, llmModelIdentifier: string, workspaceRootPath: string) => ({ runtimeKind, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, workspaceRootPath });
  const treeOf = async (file: string): Promise<Json> => JSON.parse(await fs.readFile(file, "utf8")) as Json;
  const orgAgents = (tree: Json): Json[] => tree.rootOrg.members.flatMap((member: Json) => "agentRunId" in member ? [member] : member.members);
  const orgAgent = (tree: Json, address: string): Json => orgAgents(tree).find((member) => member.address === address)!;
  const active = (dir: string) => readRaw(path.join(dir, "raw_traces_active.jsonl"));
  const completeSegments = (dir: string): Json[] => existsSync(path.join(dir, "raw_traces_manifest.json"))
    ? (JSON.parse(readFileSync(path.join(dir, "raw_traces_manifest.json"), "utf8")) as { segments: Json[] }).segments.filter((segment) => segment.status === "complete") : [];
  const ids = (records: Json[]) => records.map((record) => record.id as string);
  const markers = (dir: string) => active(dir).filter((record) => String(record.correlation_id ?? "").startsWith("runtime_switch:"));
  type Stream = Readonly<{ path: string; send(socket: WebSocket, agentRunId: string, content: string): void; turnEnded(message: Wire, agentRunId: string): boolean; failed(message: Wire): boolean }>;
  const failedMessage = (message: Wire) => message.type === "ERROR" || (message.type === "AGENT_COMMAND_ACK" && message.payload.state !== "accepted");
  const agentStream = (runId: string): Stream => ({ path: `/ws/agent/${runId}`, failed: failedMessage,
    send: (socket, agentRunId, content) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content }),
    turnEnded: (message) => message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED" });
  const teamStream = (teamRunId: string): Stream => ({ path: `/ws/agent-team/${teamRunId}`, failed: failedMessage,
    send: (socket, agentRunId, content) => sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content }),
    turnEnded: (message, agentRunId) => message.payload.agent_run_id === agentRunId && (message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED") });
  const orgStream = (orgRunId: string): Stream => ({ path: `/ws/agent-org/${orgRunId}`, failed: failedMessage,
    send: (socket, agentRunId, content) => {
      const id = `e2e-${randomUUID()}`;
      socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: agentRunId,
        command_id: id, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: `agent_run_input:e2e:${id}` } }));
    },
    turnEnded: (message, agentRunId) => message.type === "ROOT_EXECUTION_EVENT" && /turn_(completed|interrupted)/i.test(JSON.stringify(message.payload)) && JSON.stringify(message.payload).includes(agentRunId) });
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
    await until(() => messages.some((m) => m.type === "CONNECTED"), `${label}: CONNECTED`, 180_000);
    stream.send(socket, agentRunId, content);
    await until(() => messages.some((m) => stream.turnEnded(m, agentRunId) || stream.failed(m)), `${label}: turn end`, STEP_MS);
    expect(messages.filter(stream.failed).map((m) => m.payload), `${label}: errors`).toEqual([]);
    await wait(500);
    socket.close();
  };

  beforeAll(async () => {
    await fs.mkdir(path.join(runtimeRoot, "workspace"), { recursive: true });
    await fs.writeFile(path.join(runtimeRoot, "workspace", "notes.txt"), "first line\nsecond line\n");
    server = await startBuiltTestServer({
      runtimeRoot, databaseUrlOverride: database.databaseUrl,
      environment: { HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME },
    });
    agyModel = await pickModel(CLAUDE, ["flash-low", "flash"]);
    codexModel = await pickModel(CODEX, OTHER_IS_CODEX ? [process.env.CODEX_E2E_MODEL?.trim() || "gpt-5.6-luna", "mini"] : ["haiku"]);
  }, 300_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    try { if (server) await server.stop(); } finally { await removeOwnedTestRuntime(runtimeRoot, database); }
  }, 120_000);

  const evidence = async (label: string, dir: string) => {
    if (!EVIDENCE_DIR) return;
    const out = path.join(EVIDENCE_DIR, label);
    await fs.mkdir(out, { recursive: true });
    await fs.copyFile(path.join(dir, "raw_traces_manifest.json"), path.join(out, "raw_traces_manifest.json"));
    const lines = (file: string) => readRaw(path.join(dir, file)).map((record) => `${record.trace_type} ${record.sender_id ?? ""} ${String(record.content ?? record.tool_name ?? "").slice(0, 70).replace(/\n/g, " ")}`).join("\n");
    for (const segment of completeSegments(dir)) await fs.writeFile(path.join(out, `${segment.file_name}.types.txt`), `${lines(segment.file_name)}\n`);
    await fs.writeFile(path.join(out, "raw_traces_active.jsonl.types.txt"), `${lines("raw_traces_active.jsonl")}\n`);
  };

  /**
   * One member's live journey: Claude works, switch to Codex (message), switch back to Claude (message). `switchTo` saves the choice on the
   * stopped root, `stopRoot` stops it, `message` sends a message to the member through its root's stream, `dirOf` finds its folder.
   */
  const journey = async (label: string, member: { runId: string; dirOf: () => string; stopRoot: () => Promise<void>; saveSelection: (runtimeKind: string, model: string) => Promise<Json>;
    message: (content: string, step: string) => Promise<void> }) => {
    await member.message(TASK, `${label}: claude task`);
    const claudeIds = ids(active(member.dirOf()));
    expect(claudeIds.length, `${label}: Claude recorded its turn`).toBeGreaterThan(3);
    // --- Claude -> Codex
    await member.stopRoot();
    expect(await member.saveSelection(CODEX, codexModel), `${label}: save to Codex`).toMatchObject({ success: true, outcome: "UPDATED" });
    expect(ids(active(member.dirOf())), `${label}: the save changed no raw trace`).toEqual(claudeIds);
    await member.message(FOLLOW_UP, `${label}: codex follow-up`);
    expect(completeSegments(member.dirOf()), `${label}: one segment`).toHaveLength(1);
    const first = completeSegments(member.dirOf())[0]!;
    const keyOne = String(active(member.dirOf())[0]?.correlation_id ?? "");
    expect(keyOne, `${label}: the marker is keyed to this member`).toMatch(new RegExp(`^runtime_switch:${member.runId}:`));
    expect(first, `${label}: segment 1 carries the switch and Claude`).toMatchObject({ boundary_type: "runtime_switch", boundary_key: keyOne, runtime_kind: CLAUDE });
    expect(ids(readRaw(path.join(member.dirOf(), first.file_name))), `${label}: I-7 on segment 1 = exactly the Claude agent's records`).toEqual(claudeIds);
    expect(active(member.dirOf())[0], `${label}: I-3 the marker first`).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: keyOne,
      content: expect.stringMatching(new RegExp(`^Agent runtime changed from Antigravity CLI \\(.+\\) to ${OTHER_LABEL} \\(.+\\)\\.$`)) });
    expect(markers(member.dirOf()), `${label}: I-5 one marker`).toHaveLength(1);
    const codexIds = ids(active(member.dirOf()));
    const codexRecords = active(member.dirOf());
    const codexUser = codexRecords.findIndex((record) => record.trace_type === "user" && String(record.content).includes("continuing this member's work"));
    expect(codexUser, `${label}: Codex recorded the message`).toBeGreaterThan(0);
    expect(codexRecords.slice(codexUser + 1).some((record) => record.trace_type === "assistant"), `${label}: Codex recorded its answer`).toBe(true);
    // --- Codex -> Claude
    await member.stopRoot();
    expect(await member.saveSelection(CLAUDE, agyModel), `${label}: save back to Claude`).toMatchObject({ success: true, outcome: "UPDATED" });
    await member.message(FOLLOW_UP, `${label}: claude follow-up`);
    const segments = completeSegments(member.dirOf());
    expect(segments, `${label}: two segments`).toHaveLength(2);
    const keyTwo = String(active(member.dirOf())[0]?.correlation_id ?? "");
    expect(keyTwo, `${label}: a new marker for the second switch`).toMatch(new RegExp(`^runtime_switch:${member.runId}:`));
    expect(keyTwo).not.toBe(keyOne);
    const second = segments.find((segment) => segment.boundary_key === keyTwo)!;
    expect(second, `${label}: segment 2 carries the second switch and Codex`).toMatchObject({ boundary_type: "runtime_switch", runtime_kind: CODEX });
    expect(ids(readRaw(path.join(member.dirOf(), second.file_name))), `${label}: I-7 on segment 2 = the first marker and exactly the Codex agent's records`).toEqual(codexIds);
    expect(ids(readRaw(path.join(member.dirOf(), first.file_name))), `${label}: I-8 segment 1 unchanged`).toEqual(claudeIds);
    expect(active(member.dirOf())[0], `${label}: I-3 second marker first`).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: keyTwo,
      content: expect.stringMatching(new RegExp(`^Agent runtime changed from ${OTHER_LABEL} \\(.+\\) to Antigravity CLI \\(.+\\)\\.$`)) });
    expect(markers(member.dirOf()), `${label}: I-5 one marker in the new file`).toHaveLength(1);
    // the journal reads each file with its own runtime
    await evidence(label, member.dirOf());
  };

  it("LV-01: a Team member, Antigravity -> other runtime -> Antigravity", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    const agent = await agentDefinition("live-team-member");
    const created = (await gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }", { input: {
      teamDefinitionId: (await teamDefinition(agent.id)).id, teamConfigs: [{ teamAddress: "/", ...launchOf(CLAUDE, agyModel, workspace) }],
      memberConfigs: ["lead", "worker"].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: agent.id, ...launchOf(CLAUDE, agyModel, workspace) })) } })).createAgentTeamRun as Json;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId as string;
    const file = memory("agent_teams", teamRunId, "team_run_execution_tree.json");
    const tree = await treeOf(file);
    const worker = tree.rootTeam.members.find((member: Json) => member.address === "/worker").agentRunId as string;
    const lead = tree.rootTeam.members.find((member: Json) => member.address === "/lead").agentRunId as string;
    await journey("team-member", {
      runId: worker, dirOf: () => findDir(memory("agent_teams", teamRunId), worker)!,
      stopRoot: async () => { expect((await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: teamRunId })).terminateAgentTeamRun.success).toBe(true); },
      saveSelection: async (runtimeKind, model) => (await gql(`mutation($input: UpdateStoppedTeamRunSelectionsInput!) { updateStoppedTeamRunSelections(input: $input) { success outcome message fieldErrors { path message } } }`,
        { input: { teamRunId, selectionPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: "/worker", runtimeKind, llmModelIdentifier: model, llmConfig: null }] } })).updateStoppedTeamRunSelections as Json,
      message: (content, step) => talk(teamStream(teamRunId), worker, content, step),
    });
    expect(findDir(memory("agent_teams", teamRunId), lead), "the other member never ran").toBeNull();
  }, STEP_MS * 10);
});
