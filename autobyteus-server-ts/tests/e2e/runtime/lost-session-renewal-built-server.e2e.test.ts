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

// A lost runtime session on the BUILT server (autobyteus-599, API surface; AC-001, AC-003, AC-005, AC-006): a standalone run and
// a Team member on Antigravity whose saved conversation the CLI no longer has. Test-owned data root, private HOME; the CLI is
// scripted (tests/fixtures/agy-failure-cli.mjs `linked_skills`, with AGY_FAKE_LOST_CONVERSATIONS_FILE giving PRB-004's shape).
//   LS-01 Standalone run: era 1, Stop, the conversation is lost; the next message is answered in a fresh session behind the
//         lost-session marker, the earlier records kept as one segment; after a server restart the renewed session is restored.
//   LS-02 Team member: the same through the Team root; the tree takes the new session, and a later activation resumes it.
//   LS-03 A different conversation WITHOUT the not-found warning is still a conflict: the message fails, nothing changes.
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//     ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs \
//     pnpm exec vitest run tests/e2e/runtime/lost-session-renewal-built-server.e2e.test.ts --no-watch

const FAKE_AGY = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const ENABLED = process.env.RUN_AGY_FAILURE_E2E === "1" && path.isAbsolute(FAKE_AGY) && existsSync(FAKE_AGY)
  && spawnSync(FAKE_AGY, ["--version"], { stdio: "ignore" }).status === 0 && existsSync(path.resolve("dist/app.js"));
const AGY = "antigravity_cli";
const AGY_MODEL = "gemini-3.8-flash-low";
const MARKER_TEXT = "The saved Antigravity CLI session of this run was no longer available, so a new session continues from the work journal.";

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

describe.runIf(ENABLED)("a lost runtime session on the built server: standalone run and Team member", () => {
  const suffix = `lost-session-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  const lostFile = path.join(runtimeRoot, "agy-lost-conversations.txt");
  const argvLog = path.join(runtimeRoot, "agy-argv.jsonl");
  let server: Awaited<ReturnType<typeof startBuiltTestServer>>;
  const sockets: WebSocket[] = [];
  const memory = (...parts: string[]) => path.join(runtimeRoot, "memory", ...parts);

  const gql = async <T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> => executeGraphql<T>(server.serverUrl, query, variables);
  const launch = async () => {
    server = await startBuiltTestServer({
      runtimeRoot, databaseUrlOverride: database.databaseUrl,
      environment: { HOME: path.join(runtimeRoot, "isolated-home"), ANTIGRAVITY_CLI_COMMAND: FAKE_AGY, AGY_FAKE_CASE: "linked_skills",
        AGY_FAKE_LOST_CONVERSATIONS_FILE: lostFile, AGY_FAKE_ARGV_LOG: argvLog },
    });
  };
  const stop = async () => {
    for (const socket of sockets.splice(0)) if (socket.readyState === WebSocket.OPEN) socket.close();
    await server.stop();
  };
  const loseConversation = (id: string, line = id) => fs.appendFile(lostFile, `${line}\n`);
  const resumedWith = (id: string) => readRaw(argvLog).filter((entry) => {
    const argv = entry.argv as string[];
    return argv.includes("--conversation") && argv[argv.indexOf("--conversation") + 1] === id;
  }).length;
  const agentDefinition = async (name: string) => (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id name } }",
    { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: "lost session E2E", instructions: "Reply briefly.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition as { id: string; name: string };
  const launchOf = (workspaceRootPath: string) => ({ runtimeKind: AGY, llmModelIdentifier: AGY_MODEL, llmConfig: null, autoExecuteTools: true, workspaceRootPath });
  const treeOf = async (file: string): Promise<Json> => JSON.parse(await fs.readFile(file, "utf8")) as Json;

  type Stream = Readonly<{ path: string; turnEnded(message: Wire, agentRunId: string): boolean }>;
  const failed = (message: Wire) => message.type === "ERROR" || (message.type === "AGENT_COMMAND_ACK" && message.payload.state !== "accepted");
  const agentStream = (runId: string): Stream => ({ path: `/ws/agent/${runId}`,
    turnEnded: (message) => message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED" });
  const teamStream = (teamRunId: string): Stream => ({ path: `/ws/agent-team/${teamRunId}`,
    turnEnded: (message, agentRunId) => message.payload.agent_run_id === agentRunId && (message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED") });
  /** One message; resolves with the wire messages, whether the turn ended, and the failures. */
  const send = async (stream: Stream, agentRunId: string, content: string, label: string) => {
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
    sendE2eSendMessageCommand(socket, { agent_run_id: agentRunId, content });
    await until(() => messages.some((m) => stream.turnEnded(m, agentRunId) || failed(m)) || closed, `${label}: outcome`, 120_000);
    await wait(300);
    socket.close();
    return { messages, completed: messages.some((m) => stream.turnEnded(m, agentRunId)), failures: messages.filter(failed).map((m) => m.payload) };
  };
  const talk = async (stream: Stream, agentRunId: string, content: string, label: string) => {
    const outcome = await send(stream, agentRunId, content, label);
    expect(outcome.failures, `${label}: errors`).toEqual([]);
    expect(outcome.completed, `${label}: the turn ended`).toBe(true);
    return outcome.messages;
  };

  const active = (dir: string) => readRaw(path.join(dir, "raw_traces_active.jsonl"));
  const activeText = (dir: string) => readFileSync(path.join(dir, "raw_traces_active.jsonl"), "utf8");
  const completeSegments = (dir: string): Json[] => existsSync(path.join(dir, "raw_traces_manifest.json"))
    ? (JSON.parse(readFileSync(path.join(dir, "raw_traces_manifest.json"), "utf8")) as { segments: Json[] }).segments.filter((segment) => segment.status === "complete") : [];
  const ids = (records: Json[]) => records.map((record) => record.id as string);
  const echoed = (dir: string): string[] => active(dir).filter((record) => record.trace_type === "assistant" && String(record.content).startsWith("ECHO:"))
    .map((record) => JSON.parse(String(record.content).slice("ECHO:".length)) as string);
  const markers = (dir: string) => active(dir).filter((record) => String(record.correlation_id ?? "").startsWith("session_renewal:"));
  const segmentByKey = (dir: string, key: string) => {
    const found = completeSegments(dir).filter((segment) => segment.boundary_key === key);
    expect(found, `exactly one complete segment for ${key}`).toHaveLength(1);
    return { ids: ids(readRaw(path.join(dir, found[0]!.file_name))), runtimeKind: found[0]!.runtime_kind as string, boundaryType: found[0]!.boundary_type as string };
  };
  const runMetadata = async (dir: string): Promise<Json> => JSON.parse(await fs.readFile(path.join(dir, "run_metadata.json"), "utf8")) as Json;

  beforeAll(async () => {
    await fs.mkdir(path.join(runtimeRoot, "isolated-home"), { recursive: true });
    await launch();
  }, 240_000);

  afterAll(async () => {
    try { if (server) await stop(); } finally { await removeOwnedTestRuntime(runtimeRoot, database); }
  }, 120_000);

  const createStandalone = async (name: string) => {
    const workspace = path.join(runtimeRoot, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const definition = await agentDefinition(name);
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definition.id, ...launchOf(workspace) } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    return { runId, dir: () => findDir(memory("agents"), runId)! };
  };
  const terminate = async (runId: string) =>
    expect((await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId })).terminateAgentRun.success).toBe(true);

  it("LS-01: a standalone run continues in a fresh session behind the marker; after a restart the renewed session is restored", async () => {
    const { runId, dir } = await createStandalone("ls-standalone");
    await talk(agentStream(runId), runId, "ECHO_INPUT", "era 1");
    const lost = (await runMetadata(dir())).platformAgentRunId as string;
    expect(lost).toEqual(expect.any(String));
    const era1 = ids(active(dir()));
    await terminate(runId);
    await loseConversation(lost);

    await talk(agentStream(runId), runId, "ECHO_INPUT after the loss", "after the loss");

    const key = `session_renewal:${runId}:${lost}`;
    expect(segmentByKey(dir(), key), "the earlier records kept as one segment (AC-006)").toEqual({ ids: era1, runtimeKind: AGY, boundaryType: "runtime_switch" });
    expect(markers(dir()), "one marker").toHaveLength(1);
    expect(active(dir())[0], "the marker first, in the REQ-004 words").toMatchObject({ sender_id: "system.runtime_handover", correlation_id: key, content: MARKER_TEXT });
    const renewed = (await runMetadata(dir())).platformAgentRunId as string;
    expect(renewed, "a new session").toEqual(expect.any(String));
    expect(renewed).not.toBe(lost);
    expect((await runMetadata(dir())).runtimeKind).toBe(AGY);
    expect(echoed(dir()).at(-1), "the agent answered the message").toContain("ECHO_INPUT after the loss");

    await terminate(runId);
    await stop();
    await launch();
    const resumes = resumedWith(renewed);
    await talk(agentStream(runId), runId, "ECHO_INPUT after the restart", "after the restart");
    expect(resumedWith(renewed), "the renewed session was resumed").toBe(resumes + 1);
    expect((await runMetadata(dir())).platformAgentRunId).toBe(renewed);
    expect(markers(dir()), "no second marker").toHaveLength(1);
    expect(completeSegments(dir()), "no second segment").toHaveLength(1);
  }, 600_000);

  it("LS-02: a Team member is renewed through the Team root, and a later activation resumes the renewed session (AC-005)", async () => {
    const workspace = path.join(runtimeRoot, "workspace");
    await fs.mkdir(workspace, { recursive: true });
    const agent = await agentDefinition("ls-team-member");
    const definition = (await gql("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `ls-team ${randomUUID().slice(0, 6)}`, description: "members", instructions: "Wait for input.", coordinatorMemberName: "lead",
        nodes: ["lead", "worker"].map((memberName) => ({ memberName, ref: agent.id, refScope: "SHARED" })) } })).createAgentTeamDefinition as { id: string };
    const created = (await gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }", { input: {
      teamDefinitionId: definition.id, teamConfigs: [{ teamAddress: "/", ...launchOf(workspace) }],
      memberConfigs: ["lead", "worker"].map((name) => ({ memberAddress: `/${name}`, agentDefinitionId: agent.id, ...launchOf(workspace) })) } })).createAgentTeamRun as Json;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId as string;
    const file = memory("agent_teams", teamRunId, "team_run_execution_tree.json");
    const node = async (address: string) => (await treeOf(file)).rootTeam.members.find((entry: Json) => entry.address === address) as Json;
    const worker = (await node("/worker")).agentRunId as string;
    const dir = () => findDir(memory("agent_teams", teamRunId), worker)!;
    const stopTeam = async () => expect((await gql("mutation($id: String!) { terminateAgentTeamRun(teamRunId: $id) { success } }", { id: teamRunId })).terminateAgentTeamRun.success).toBe(true);

    await talk(teamStream(teamRunId), worker, "ECHO_INPUT", "worker era 1");
    const lost = (await node("/worker")).platformAgentRunId as string;
    expect(lost).toEqual(expect.any(String));
    const lead = (await node("/lead")).platformAgentRunId;
    const era1 = ids(active(dir()));
    await stopTeam();
    await loseConversation(lost);

    await talk(teamStream(teamRunId), worker, "ECHO_INPUT after the loss", "worker after the loss");

    const key = `session_renewal:${worker}:${lost}`;
    expect(segmentByKey(dir(), key)).toEqual({ ids: era1, runtimeKind: AGY, boundaryType: "runtime_switch" });
    expect(markers(dir())).toHaveLength(1);
    expect(active(dir())[0]).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: key, content: MARKER_TEXT });
    const renewed = (await node("/worker")).platformAgentRunId as string;
    expect(renewed, "the tree takes the new session").toEqual(expect.any(String));
    expect(renewed).not.toBe(lost);
    expect((await node("/lead")).platformAgentRunId, "the other member is untouched").toBe(lead);
    expect(echoed(dir()).at(-1)).toContain("ECHO_INPUT after the loss");

    await stopTeam();
    const resumes = resumedWith(renewed);
    await talk(teamStream(teamRunId), worker, "ECHO_INPUT again", "worker again");
    expect(resumedWith(renewed), "the renewed session was resumed").toBe(resumes + 1);
    expect((await node("/worker")).platformAgentRunId).toBe(renewed);
    expect(markers(dir())).toHaveLength(1);
    expect(completeSegments(dir())).toHaveLength(1);
  }, 600_000);

  it("LS-03: a different conversation without the not-found warning is still a conflict: the message fails and nothing changes (AC-003)", async () => {
    const { runId, dir } = await createStandalone("ls-conflict");
    await talk(agentStream(runId), runId, "ECHO_INPUT", "era 1");
    const saved = (await runMetadata(dir())).platformAgentRunId as string;
    await terminate(runId);
    await loseConversation(saved, `silent:${saved}`);
    const before = activeText(dir());

    const outcome = await send(agentStream(runId), runId, "ECHO_INPUT after the conflict", "conflict");

    expect(outcome.completed, "no turn").toBe(false);
    expect(JSON.stringify(outcome.failures), "the user is told the conflict").toContain("AGY_CONVERSATION_ID_CONFLICT");
    expect(activeText(dir()), "the file is byte-identical").toBe(before);
    expect(completeSegments(dir()), "no segment").toEqual([]);
    expect((await runMetadata(dir())).platformAgentRunId, "the saved session is unchanged").toBe(saved);
  }, 300_000);
});
