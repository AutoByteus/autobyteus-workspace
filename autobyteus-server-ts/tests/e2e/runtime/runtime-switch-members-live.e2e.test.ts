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

// LIVE agent runtime switch of a Team member, an Org member and a delegated copy between Claude Agent SDK and Codex App Server on the BUILT
// server (autobyteus-348, API/E2E). The real signed-in `claude` and `codex` CLIs run (they need the real HOME, USER and LOGNAME, TESTING.md;
// each run adds sessions to the user's CLI histories and spends the user's credits); the server, its data root and database are test-owned.
// The platform's own test vault holds provider API keys and is not needed for these two CLI runtimes (they use the CLIs' sign-in).
// For each member: Claude does a small task, the stopped member is switched to Codex, one message is sent, then switched back to Claude
// and one more message is sent. I-7 is asserted on BOTH archived segments: segment 1 holds exactly the Claude agent's records; segment 2
// holds the first marker and exactly the Codex agent's records. The copy is started by a scripted Antigravity host (`CALL_TOOL`).
// Gate: RUN_RUNTIME_SWITCH_MEMBERS_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 (+ ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs for the copy)
// Run: env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" RUN_RUNTIME_SWITCH_MEMBERS_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/runtime-switch-members-live.e2e.test.ts --no-watch
// Optional: RUNTIME_SWITCH_MEMBERS_EVIDENCE_DIR=<dir> copies each member's manifest, markers and a record-type listing (synthetic task only).
const commandReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const FAKE_AGY = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const ENABLED = process.env.RUN_RUNTIME_SWITCH_MEMBERS_E2E === "1" && process.env.RUN_CLAUDE_E2E === "1" && process.env.RUN_CODEX_E2E === "1"
  && commandReady("claude") && commandReady("codex") && existsSync(path.resolve("dist/app.js"));
const COPY_ENABLED = ENABLED && path.isAbsolute(FAKE_AGY) && existsSync(FAKE_AGY) && commandReady(FAKE_AGY);
const AGY = "antigravity_cli";
const CLAUDE = "claude_agent_sdk";
const CODEX = "codex_app_server";
const AGY_MODEL = "gemini-3.8-flash-low";
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


describe.runIf(ENABLED)("LIVE agent runtime switch of members and a copy between Claude Agent SDK and Codex App Server", () => {
  const suffix = `rsm-live-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  let server: Awaited<ReturnType<typeof startBuiltTestServer>>;
  let claudeModel = "";
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
    { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: "live runtime switch of members", instructions: "Do exactly what the user asks with your tools. Keep replies short.", category: "runtime-e2e", toolNames: [],
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
      environment: { HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, ...(COPY_ENABLED ? { ANTIGRAVITY_CLI_COMMAND: FAKE_AGY, AGY_FAKE_CASE: "linked_skills" } : {}) },
    });
    claudeModel = await pickModel(CLAUDE, ["haiku"]);
    codexModel = await pickModel(CODEX, [process.env.CODEX_E2E_MODEL?.trim() || "gpt-5.6-luna", "mini"]);
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
      content: expect.stringMatching(/^Agent runtime changed from Claude Agent SDK \(.+\) to Codex App Server \(.+\)\.$/) });
    expect(markers(member.dirOf()), `${label}: I-5 one marker`).toHaveLength(1);
    const codexIds = ids(active(member.dirOf()));
    const codexRecords = active(member.dirOf());
    const codexUser = codexRecords.findIndex((record) => record.trace_type === "user" && String(record.content).includes("continuing this member's work"));
    expect(codexUser, `${label}: Codex recorded the message`).toBeGreaterThan(0);
    expect(codexRecords.slice(codexUser + 1).some((record) => record.trace_type === "assistant"), `${label}: Codex recorded its answer`).toBe(true);
    // --- Codex -> Claude
    await member.stopRoot();
    expect(await member.saveSelection(CLAUDE, claudeModel), `${label}: save back to Claude`).toMatchObject({ success: true, outcome: "UPDATED" });
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
      content: expect.stringMatching(/^Agent runtime changed from Codex App Server \(.+\) to Claude Agent SDK \(.+\)\.$/) });
    expect(markers(member.dirOf()), `${label}: I-5 one marker in the new file`).toHaveLength(1);
    // the journal reads each file with its own runtime
    await evidence(label, member.dirOf());
  };

  it("LV-01: a Team member, Claude -> Codex -> Claude", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    const agent = await agentDefinition("live-team-member");
    const created = (await gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }", { input: {
      teamDefinitionId: (await teamDefinition(agent.id)).id, teamConfigs: [{ teamAddress: "/", ...launchOf(CLAUDE, claudeModel, workspace) }],
      memberConfigs: ["lead", "worker"].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: agent.id, ...launchOf(CLAUDE, claudeModel, workspace) })) } })).createAgentTeamRun as Json;
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

  it("LV-02: Org members, a direct Agent and an Agent of a mounted Team, Claude -> Codex -> Claude", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    const agent = await agentDefinition("live-org-member");
    const team = await teamDefinition(agent.id);
    const orgId = (await gql("mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }", { input: {
      name: `live-org ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.",
      members: [{ memberName: "direct", ref: agent.id, refType: "AGENT", refScope: "SHARED" }, { memberName: "crew", ref: team.id, refType: "AGENT_TEAM", refScope: "SHARED" }], handoffs: [] } })).createAgentOrgDefinition.id as string;
    const created = (await gql("mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }", { input: {
      agentOrgDefinitionId: orgId, rootConfiguration: launchOf(CLAUDE, claudeModel, workspace), agentOverrides: [] } })).createAgentOrgRun as Json;
    expect(created.success, created.message).toBe(true);
    const orgRunId = created.agentOrgRunId as string;
    const file = memory("agent_orgs", orgRunId, "agent_org_run_execution_tree.json");
    const tree = await treeOf(file);
    for (const address of ["/direct", "/crew/worker"]) {
      const runId = orgAgent(tree, address).agentRunId as string;
      await journey(`org-member ${address}`, {
        runId, dirOf: () => findDir(memory("agent_orgs", orgRunId), runId)!,
        stopRoot: async () => { expect((await gql("mutation($id: String!) { terminateAgentOrgRun(agentOrgRunId: $id) { success } }", { id: orgRunId })).terminateAgentOrgRun.success).toBe(true); },
        saveSelection: async (runtimeKind, model) => {
          const saved = (await gql(`mutation($input: UpdateStoppedAgentOrgRunConfigInput!) { updateStoppedAgentOrgRunConfig(input: $input) { success outcome message fieldErrors { path message } } }`, { input: {
            orgRunId, teamWorkspacePatches: [], selectionPatches: [{ scopeKind: "CONFIGURED_AGENT", scopeAddress: address, runtimeKind, llmModelIdentifier: model, llmConfig: null }] } })).updateStoppedAgentOrgRunConfig as Json;
          // a stopped Org is restored as the Settings page does; its members start on their first message
          const restored = (await gql("mutation($id: String!) { restoreAgentOrgRun(agentOrgRunId: $id) { success message } }", { id: orgRunId })).restoreAgentOrgRun as Json;
          expect(restored.success, restored.message).toBe(true);
          return saved;
        },
        message: (content, step) => talk(orgStream(orgRunId), runId, content, step),
      });
    }
  }, STEP_MS * 20);

  it.runIf(COPY_ENABLED)("LV-03: a delegated copy (started by a scripted host), Claude -> Codex -> Claude", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    const hostDefinition = await agentDefinition("live-host");
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: hostDefinition.id, ...launchOf(AGY, AGY_MODEL, workspace), runtimeKind: AGY } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    const hostId = created.runId as string;
    const call = async (name: string, args: Json, label: string): Promise<Json> => {
      const dir = () => findDir(memory("agents"), hostId)!;
      const before = active(dir()).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("CALLED:")).length;
      await talk(agentStream(hostId), hostId, `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`, label);
      const replies = active(dir()).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("CALLED:"));
      expect(replies.length, `${label}: the host answered`).toBeGreaterThan(before);
      const called = JSON.parse(String(replies.at(-1)!.content).slice("CALLED:".length)) as Json;
      return called.structuredContent ?? JSON.parse(called.content.find((part: Json) => part.type === "text").text) as Json;
    };
    // The copy's definition carries its own default launch: Claude.
    const writer = await agentDefinition("live-copy-writer", { runtimeKind: CLAUDE, llmModelIdentifier: claudeModel });
    const delegated = await call("delegate_task", { recipient_address: `/${segmentName(writer.name)}`, description: TASK }, "host delegates the copy");
    expect(delegated.delegated, JSON.stringify(delegated)).toBe(true);
    const copyId = delegated.target_agent_run_id as string;
    const dirOf = () => findDir(memory("agents"), copyId)!;
    // the copy has finished a turn when an assistant record follows the last user record and the file stops growing
    const settled = async (sentinel: string, label: string) => {
      await until(() => { const records = !!findDir(memory("agents"), copyId) ? active(dirOf()) : [];
        const lastUser = records.map((record) => record.trace_type).lastIndexOf("user");
        return lastUser >= 0 && String(records[lastUser]!.content).includes(sentinel) && records.slice(lastUser + 1).some((record) => record.trace_type === "assistant"); }, `${label}: the copy answered`, STEP_MS);
      let size = -1;
      await until(async () => { await wait(2500); const now = active(dirOf()).length; const stable = now === size; size = now; return stable; }, `${label}: the copy settled`, 60_000);
    };
    await settled(TASK.slice(0, 20), "first task");
    const copyTree = JSON.stringify((await gql("query($id: String!) { agentRunCollaboration(runId: $id) }", { id: hostId })).agentRunCollaboration);
    expect(copyTree, "the copy started on Claude").toContain(`"${CLAUDE}"`);
    const stopCopy = async () => {
      const stopped = (await gql("mutation($input: DelegatedExecutionTargetInput!) { stopDelegatedExecution(input: $input) { success outcome } }", { input: { rootKind: "AGENT", rootRunId: hostId, agentRunId: copyId } })).stopDelegatedExecution;
      expect(stopped, JSON.stringify(stopped)).toMatchObject({ success: true });
    };
    await journey("delegated-copy", {
      runId: copyId, dirOf,
      stopRoot: async () => {
        await stopCopy();
        const hostRun = (await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: hostId })).terminateAgentRun;
        expect(hostRun.success).toBe(true);
      },
      saveSelection: async (runtimeKind, model) => (await gql("mutation($input: UpdateDelegatedLaunchSelectionsInput!) { updateDelegatedLaunchSelections(input: $input) { success outcome message fieldErrors { path message } } }",
        { input: { rootKind: "AGENT", rootRunId: hostId, changes: [{ agentRunId: copyId, selection: { runtimeKind, llmModelIdentifier: model, llmConfig: null } }] } })).updateDelegatedLaunchSelections as Json,
      message: async (content, step) => {
        if (step.endsWith("claude task")) return;
        await call("send_message_to", { target_agent_run_id: copyId, content }, `${step}: host wakes the copy`);
        await settled(content.slice(0, 20), step);
      },
    });
  }, STEP_MS * 20);
});
