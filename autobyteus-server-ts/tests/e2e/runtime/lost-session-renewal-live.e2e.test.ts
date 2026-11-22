import fs from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
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
import { capturedTestVaultSetting } from "../../../../test-support/test-vault/test-vault-selection.js";
import { agentStreamFramesOf } from "../helpers/agent-stream-frames.js";

// A lost runtime session with REAL agent runtimes on the BUILT server (autobyteus-599; AC-007, AC-001 and AC-002 live,
// AC-003, AC-006, REQ-004, REQ-007; RSK-003). Synthetic runs on a test-owned data root; every runtime home is test-owned:
//   Claude: HOME and CLAUDE_CONFIG_DIR are folders of this suite; CLAUDE_AGENT_SDK_AUTH_MODE=api-key, so the server gives the
//           CLI the test vault's Anthropic key (provider.anthropic.api-key) and the CLI never reads ~/.claude.
//   Codex:  a throwaway CODEX_HOME holding a link to the host auth.json; its rollouts are written there and removed with it.
// A recorder in front of each CLI (CLAUDE_CODE_EXECUTABLE_PATH, CODEX_APP_SERVER_COMMAND) keeps what the server sent it.
//   LC-01 (Claude, AC-007): era 1 answers; the CLI's saved session file is removed (Claude Code's own 30-day cleanup does
//         this); the next message continues in a new session behind the REQ-004 line with the hand-over notice first, and is
//         answered. A server whose Claude cannot sign in then restores the renewed session: the message fails as today
//         (AC-003), with no marker and no new session. Signed in again, the renewed session resumes, with no second notice.
//   LC-02 (Claude, RSK-003): the server stops while a run is busy in a foreground command; after the restart the run's
//         next message resumes its saved session (the process now opens at activation) and recalls its context; no renewal.
//   LC-03 (Codex, AC-002): the thread's rollout is removed from CODEX_HOME; the next message renews the same way.
// Paid inference, one short turn per step, the cheapest models (Claude haiku, Codex gpt-5.6-luna or CODEX_E2E_MODEL).
// Gates (run each runtime alone):
//   Claude: RUN_CLAUDE_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault (the `claude` CLI on PATH)
//   Codex:  RUN_CODEX_E2E=1 (the host's ~/.codex/auth.json; the `codex` CLI on PATH)
// Built server first: pnpm -C autobyteus-server-ts build. Command (resolved PATH, the real HOME only to find the CLIs' logins):
//   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" <gate> \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/lost-session-renewal-live.e2e.test.ts --no-watch
// LOST_SESSION_LIVE_E2E_EVIDENCE_DIR (optional) keeps each case's summary.

type Json = Record<string, any>;
type Wire = { type: string; payload: Json };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const which = (command: string): string => {
  const found = spawnSync("/bin/sh", ["-c", `command -v ${command}`], { encoding: "utf8" }).stdout.trim();
  return found && path.isAbsolute(found) ? found : "";
};
const BUILT = existsSync(path.resolve("dist/app.js"));
// The test setup takes AUTOBYTEUS_TEST_VAULT out of the environment and keeps it for live suites (TESTING.md#test-vault).
const TEST_VAULT = capturedTestVaultSetting()?.trim() || "";
const CLAUDE_CLI = which("claude");
const CODEX_CLI = which("codex");
const CODEX_AUTH = path.join(os.homedir(), ".codex", "auth.json");
const CLAUDE_ENABLED = process.env.RUN_CLAUDE_E2E === "1" && BUILT && TEST_VAULT !== "" && CLAUDE_CLI !== "";
const CODEX_ENABLED = process.env.RUN_CODEX_E2E === "1" && BUILT && CODEX_CLI !== "" && existsSync(CODEX_AUTH);
const EVIDENCE_DIR = process.env.LOST_SESSION_LIVE_E2E_EVIDENCE_DIR?.trim() || "";
const HANDOVER_NOTICE_START = "[System: runtime hand-over]";
const markerText = (runtimeName: string) =>
  `The saved ${runtimeName} session of this run was no longer available, so a new session continues from the work journal.`;

const readRaw = (file: string): Json[] => {
  try { return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Json); } catch { return []; }
};
const until = async (check: () => boolean | Promise<boolean>, label: string, ms = 180_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await check()) return; await wait(200); }
  throw new Error(`Timed out: ${label}`);
};
const filesNamed = (base: string, predicate: (name: string) => boolean): string[] => {
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && predicate(entry.name)).map((entry) => path.join(entry.parentPath, entry.name));
};
const findDir = (base: string, name: string): string | null => {
  if (!existsSync(base)) return null;
  const hit = readdirSync(base, { withFileTypes: true, recursive: true }).find((entry) => entry.isDirectory() && entry.name === name);
  return hit ? path.join(hit.parentPath, hit.name) : null;
};
/** A recorder that runs the real CLI unchanged and appends what the server writes to its stdin (and its argv). */
const recorderSource = (realCommand: string, logPrefix: string) => `#!${process.execPath}
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const log = ${JSON.stringify(logPrefix)} + "-" + process.pid + ".jsonl";
const note = (dir, data) => fs.appendFileSync(log, JSON.stringify({ at: Date.now(), dir, data }) + "\\n");
note("argv", process.argv.slice(2));
const child = spawn(${JSON.stringify(realCommand)}, process.argv.slice(2), { stdio: ["pipe", "inherit", "inherit"] });
process.stdin.on("data", (chunk) => { note("in", chunk.toString("utf8")); child.stdin.write(chunk); });
process.stdin.on("end", () => child.stdin.end());
child.stdin.on("error", () => {});
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(signal, () => child.kill(signal));
child.on("close", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
`;
type WireProcess = { argv: string[]; sentText: string; startedAt: number };
const readWire = (logPrefix: string): WireProcess[] => {
  const dir = path.dirname(logPrefix);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.startsWith(`${path.basename(logPrefix)}-`)).map((name) => {
    const entries = readFileSync(path.join(dir, name), "utf8").split("\n").flatMap((line) => { try { return [JSON.parse(line) as Json]; } catch { return []; } });
    const argvEntry = entries.find((entry) => entry.dir === "argv");
    return { argv: (argvEntry?.data ?? []) as string[], startedAt: Number(argvEntry?.at ?? 0),
      sentText: entries.filter((entry) => entry.dir === "in").map((entry) => String(entry.data)).join("") };
  });
};

/** One built server per runtime: its data root, its runtime home, its recorder, and the run helpers the cases share. */
const liveServer = (label: string, runtimeEnvironment: (root: string) => Promise<Record<string, string>>) => {
  const suffix = `lost-session-live-${label}-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  let server: Awaited<ReturnType<typeof startBuiltTestServer>> | null = null;
  let environment: Record<string, string> = {};
  const sockets: WebSocket[] = [];
  const outputs: string[] = [];
  const memory = (...parts: string[]) => path.join(runtimeRoot, "memory", ...parts);
  const gql = async <T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> => executeGraphql<T>(server!.serverUrl, query, variables);
  const launch = async (overrides: Record<string, string> = {}) => {
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl,
      ...(TEST_VAULT ? { testVaultSetting: TEST_VAULT } : {}), environment: { ...environment, ...overrides } });
  };
  const stop = async () => {
    for (const socket of sockets.splice(0)) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (server) { outputs.push(server.output()); await server.stop(); server = null; }
  };
  const serverLog = () => [...outputs, server?.output() ?? ""].join("\n");
  const failed = (message: Wire) => message.type === "ERROR" || (message.type === "AGENT_COMMAND_ACK" && message.payload.state !== "accepted");
  const turnEnded = (message: Wire) => message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED";
  /** Opens the agent socket, sends one message, resolves once `until` holds; the socket stays open for the caller. */
  const open = async (runId: string, content: string, label: string, stopWhen: (messages: Wire[]) => boolean, options: { send?: boolean } = {}) => {
    const messages: Wire[] = [];
    let closed = false;
    const socket = new WebSocket(`ws://127.0.0.1:${new URL(server!.serverUrl).port}/ws/agent/${runId}`);
    sockets.push(socket);
    socket.on("message", (raw: unknown) => {
      try {
        // A SEGMENT_CONTENT_BATCH is its items (each a SEGMENT_CONTENT), as the web applies it.
        for (const frame of agentStreamFramesOf(JSON.parse(String(raw)) as never) as unknown as Array<{ type?: string; payload?: Json }>) {
          if (typeof frame.type === "string") messages.push({ type: frame.type, payload: frame.payload && typeof frame.payload === "object" ? frame.payload : {} });
        }
      } catch { /* diagnostic rows only */ }
    });
    socket.on("close", () => { closed = true; });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => messages.some((m) => m.type === "CONNECTED" || m.type === "ERROR") || closed, `${label}: CONNECTED`, 120_000);
    if (options.send !== false) sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    await until(() => stopWhen(messages) || messages.some(failed) || closed, `${label}: outcome`, 300_000);
    return { socket, messages };
  };
  const send = async (runId: string, content: string, label: string) => {
    const { socket, messages } = await open(runId, content, label, (all) => all.some(turnEnded));
    await wait(500);
    socket.close();
    const text = messages.filter((m) => m.type === "SEGMENT_CONTENT").map((m) => String(m.payload.delta ?? "")).join("");
    return { messages, completed: messages.some(turnEnded), failures: messages.filter(failed).map((m) => m.payload), text };
  };
  const talk = async (runId: string, content: string, label: string) => {
    const outcome = await send(runId, content, label);
    expect(outcome.failures, `${label}: errors`).toEqual([]);
    expect(outcome.completed, `${label}: the turn ended`).toBe(true);
    return outcome;
  };
  const createRun = async (runtimeKind: string, llmModelIdentifier: string, name: string) => {
    const workspace = path.join(runtimeRoot, `workspace-${name}`);
    await fs.mkdir(workspace, { recursive: true });
    const definitionId = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: "lost session live E2E",
        instructions: "Do what the user asks. Keep replies short.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id as string;
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, runtimeKind, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    return { runId, dir: () => findDir(memory("agents"), runId)! };
  };
  const terminate = async (runId: string) =>
    expect((await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }", { id: runId })).terminateAgentRun.success).toBe(true);
  const pickModel = async (runtimeKind: string, preferred: string[]) => {
    const snapshots = (await gql("query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
      { runtimeKind })).providerModelCatalogSnapshots as Json[];
    const available = snapshots.flatMap((snapshot) => (snapshot.llmModels as Json[]).map((model) => model.modelIdentifier as string));
    const chosen = preferred.map((fragment) => available.find((id) => id.includes(fragment))).find(Boolean) ?? available[0];
    expect(chosen, `${runtimeKind} models: ${available.join(", ")}`).toBeTruthy();
    return chosen!;
  };
  const metadata = async (dir: string): Promise<Json> => JSON.parse(await fs.readFile(path.join(dir, "run_metadata.json"), "utf8")) as Json;
  const active = (dir: string) => readRaw(path.join(dir, "raw_traces_active.jsonl"));
  const completeSegments = (dir: string): Json[] => existsSync(path.join(dir, "raw_traces_manifest.json"))
    ? (JSON.parse(readFileSync(path.join(dir, "raw_traces_manifest.json"), "utf8")) as { segments: Json[] }).segments.filter((segment) => segment.status === "complete") : [];
  const renewalMarkers = (dir: string) => active(dir).filter((record) => String(record.correlation_id ?? "").startsWith("session_renewal:"));
  const keep = async (name: string, value: unknown) => {
    if (!EVIDENCE_DIR) return;
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(path.join(EVIDENCE_DIR, name), JSON.stringify(value, null, 2).replaceAll(runtimeRoot, "<RUNTIME_ROOT>"));
  };
  return {
    runtimeRoot, memory, gql, launch, stop, serverLog, open, send, talk, createRun, terminate, pickModel, metadata, active,
    completeSegments, renewalMarkers, keep,
    setUp: async () => { await fs.mkdir(path.join(runtimeRoot, "bin"), { recursive: true }); environment = await runtimeEnvironment(runtimeRoot);
      // The server only uses a recorder that answers `--version` (else it falls back to the real CLI, unrecorded).
      for (const recorder of Object.entries(environment).filter(([key]) => key.endsWith("_PATH") || key.endsWith("_COMMAND")).map(([, value]) => value)) {
        expect(spawnSync(recorder, ["--version"], { stdio: "ignore", timeout: 3000, env: { PATH: process.env.PATH, HOME: environment.HOME } }).status, `${recorder} answers --version`).toBe(0);
      }
      await launch(); },
    tearDown: async () => { try { await stop(); } finally { await removeOwnedTestRuntime(runtimeRoot, database); } },
  };
};

describe.runIf(CLAUDE_ENABLED)("a lost Claude session with the real Claude CLI on the built server (AC-007, RSK-003)", () => {
  const live = liveServer("claude", async (root) => {
    const home = path.join(root, "claude-home");
    await fs.mkdir(path.join(home, "config"), { recursive: true });
    // `.cjs`: the runtime root is inside this ES-module package, where an extensionless script would load as a module.
    const recorder = path.join(root, "bin", "claude-recorder.cjs");
    await fs.writeFile(recorder, recorderSource(CLAUDE_CLI, path.join(root, "wire", "claude")), { mode: 0o755 });
    await fs.mkdir(path.join(root, "wire"), { recursive: true });
    return { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, "config"), CLAUDE_AGENT_SDK_AUTH_MODE: "api-key", CLAUDE_CODE_EXECUTABLE_PATH: recorder };
  });
  const configDir = () => path.join(live.runtimeRoot, "claude-home", "config");
  const wire = () => readWire(path.join(live.runtimeRoot, "wire", "claude"));
  const MARKER = markerText("Claude Agent SDK");
  let model = "";

  beforeAll(async () => {
    await live.setUp();
    model = await live.pickModel("claude_agent_sdk", ["haiku"]);
  }, 300_000);
  afterAll(async () => { await live.tearDown(); }, 180_000);

  it("LC-01: the removed Claude session continues in a new session with the line and the notice; an auth failure does not renew (AC-007, AC-003, AC-006)", async () => {
    const { runId, dir } = await live.createRun("claude_agent_sdk", model, "lc01");
    const codeword = `PLUM-${randomUUID().slice(0, 6)}`;
    await live.talk(runId, `Remember the codeword ${codeword}. Reply only OK.`, "era 1");
    const lost = (await live.metadata(dir())).platformAgentRunId as string;
    expect(lost, "era 1 has a Claude session").toEqual(expect.any(String));
    const era1 = live.active(dir()).map((record) => record.id as string);
    await live.terminate(runId);
    // Claude Code's cleanup removes saved sessions after 30 days; here the test removes the session its own run created.
    const sessionFiles = filesNamed(configDir(), (name) => name === `${lost}.jsonl`);
    expect(sessionFiles, "the CLI saved era 1's session in the test's own config folder").toHaveLength(1);
    await fs.rm(sessionFiles[0]!);
    const sentAt = Date.now();

    const renewed = await live.talk(runId, "Reply with one short sentence: what is the codeword you were asked to remember?", "after the loss");

    const key = `session_renewal:${runId}:${lost}`;
    const segments = live.completeSegments(dir()).filter((segment) => segment.boundary_key === key);
    expect(segments, "the earlier records kept as one segment").toHaveLength(1);
    expect(readRaw(path.join(dir(), segments[0]!.file_name)).map((record) => record.id), "the segment is era 1's records").toEqual(era1);
    expect(segments[0]).toMatchObject({ boundary_type: "runtime_switch", runtime_kind: "claude_agent_sdk" });
    expect(live.renewalMarkers(dir()), "one marker").toHaveLength(1);
    expect(live.active(dir())[0], "the marker first, in the REQ-004 words").toMatchObject({ sender_id: "system.runtime_handover", correlation_id: key, content: MARKER });
    // The chat shows the line through the run's stream (the runtime_switch segment's marker), as a reopened chat reads it (AC-006).
    const reopened = await live.open(runId, "", "reopen", (all) => all.some((m) => m.type === "AGENT_STREAM_SNAPSHOT"), { send: false });
    reopened.socket.close();
    const snapshot = JSON.stringify(reopened.messages.filter((m) => m.type === "AGENT_STREAM_SNAPSHOT").map((m) => m.payload));
    expect(snapshot.includes(MARKER), "a reopened chat shows the line").toBe(true);
    expect(snapshot.indexOf(codeword), "the earlier conversation comes before the line").toBeGreaterThan(-1);
    expect(snapshot.indexOf(codeword)).toBeLessThan(snapshot.indexOf(MARKER));
    const fresh = (await live.metadata(dir())).platformAgentRunId as string;
    expect(fresh, "a new session").toEqual(expect.any(String));
    expect(fresh).not.toBe(lost);
    expect((await live.metadata(dir())).llmModelIdentifier, "the same model").toBe(model);
    expect(renewed.text.trim().length, "the agent answered").toBeGreaterThan(0);
    const after = wire().filter((p) => p.startedAt >= sentAt);
    const resumedLost = after.filter((p) => p.argv.join(" ").includes(lost));
    expect(resumedLost.length, "the lost session was tried once at activation").toBeGreaterThanOrEqual(1);
    const freshProcess = after.find((p) => !p.argv.join(" ").includes(lost) && p.sentText.includes("\"type\":\"user\""));
    expect(freshProcess, "a fresh Claude process took the message").toBeTruthy();
    const firstInput = freshProcess!.sentText.split("\n").find((line) => line.includes("\"type\":\"user\"")) ?? "";
    expect(firstInput.includes(HANDOVER_NOTICE_START), "the fresh session's first input carries the hand-over notice").toBe(true);
    expect(firstInput.indexOf(HANDOVER_NOTICE_START)).toBeLessThan(firstInput.indexOf("what is the codeword"));
    const warnings = live.serverLog().split("RUNTIME_SESSION_LOST").slice(1).map((after) => after.slice(0, 600));
    expect(warnings.filter((warning) => warning.includes(runId)), "REQ-007: one warning for this run").toHaveLength(1);
    expect(warnings.find((warning) => warning.includes(runId)), "it names the runtime and the lost session")
      .toEqual(expect.stringMatching(new RegExp(`claude_agent_sdk[\\s\\S]*${lost}|${lost}[\\s\\S]*claude_agent_sdk`)));

    // AC-003 live: a server whose Claude cannot sign in restores the renewed session; the failure is not a lost session.
    await live.terminate(runId);
    await live.stop();
    await live.launch({ CLAUDE_AGENT_SDK_AUTH_MODE: "cli" });
    const beforeAuthFailure = readFileSync(path.join(dir(), "raw_traces_active.jsonl"), "utf8");
    const refused = await live.send(runId, "Reply only OK.", "without sign-in");
    expect(refused.completed && refused.failures.length === 0, "the message is not answered without a sign-in").toBe(false);
    expect(live.renewalMarkers(dir()), "no second marker").toHaveLength(1);
    expect(live.completeSegments(dir()), "no second segment").toHaveLength(1);
    expect((await live.metadata(dir())).platformAgentRunId, "the renewed session is kept").toBe(fresh);
    expect(readFileSync(path.join(dir(), "raw_traces_active.jsonl"), "utf8").startsWith(beforeAuthFailure), "nothing earlier changed").toBe(true);

    // Signed in again: the renewed session resumes, with no second notice (AC-006).
    await live.stop();
    await live.launch();
    const againAt = Date.now();
    const again = await live.talk(runId, "Reply only OK.", "renewed session again");
    const resumedProcesses = wire().filter((p) => p.startedAt >= againAt && p.argv.join(" ").includes(fresh));
    expect(resumedProcesses.length, "the renewed session is resumed").toBeGreaterThanOrEqual(1);
    expect(resumedProcesses.some((p) => p.sentText.includes(HANDOVER_NOTICE_START)), "no second notice").toBe(false);
    expect((await live.metadata(dir())).platformAgentRunId).toBe(fresh);
    expect(live.renewalMarkers(dir())).toHaveLength(1);
    await live.keep("LC-01-claude.json", { runId, lost, fresh, model, answerAfterLoss: renewed.text, answerAgain: again.text,
      answerRecallsCodeword: renewed.text.includes(codeword), refusedFailures: refused.failures,
      firstInputStart: firstInput.slice(0, 400), marker: live.active(dir())[0] });
    await live.terminate(runId);
  }, 1_200_000);

  it("LC-02: a run stopped by a server shutdown while busy resumes its existing session after the restart and recalls it; no renewal (RSK-003)", async () => {
    const { runId, dir } = await live.createRun("claude_agent_sdk", model, "lc02");
    const codeword = `FIG-${randomUUID().slice(0, 6)}`;
    await live.talk(runId, `Remember the codeword ${codeword}. Reply only OK.`, "era 1");
    const sessionId = (await live.metadata(dir())).platformAgentRunId as string;
    // Busy: a foreground command is running when the server stops.
    const { messages } = await live.open(runId, "Run the shell command `sleep 45` in the foreground with your Bash tool, then reply DONE.", "busy",
      (all) => all.some((m) => m.type === "TOOL_EXECUTION_STARTED" || m.type === "TOOL_APPROVAL_REQUESTED"));
    expect(messages.some((m) => m.type === "TOOL_EXECUTION_STARTED" || m.type === "TOOL_APPROVAL_REQUESTED"), "the run is busy in its command").toBe(true);
    await live.stop();
    await live.launch();
    const restartedAt = Date.now();

    const recall = await live.talk(runId, "Reply only with the codeword I asked you to remember.", "after the restart");

    expect(recall.text, "the resumed session recalls its context").toContain(codeword);
    const resumed = wire().filter((p) => p.startedAt >= restartedAt);
    expect(resumed.some((p) => p.argv.includes("--resume") || p.argv.some((arg) => arg.startsWith("--resume"))),
      `the saved session was resumed: ${JSON.stringify(resumed.map((p) => p.argv.filter((arg) => arg.startsWith("--")).join(" ")))}`).toBe(true);
    // The server also runs the CLI for its probes (`--version`, the model list); every SESSION process opened the saved session.
    const sessionProcesses = resumed.filter((p) => p.argv.some((arg) => arg.startsWith("--resume") || arg.startsWith("--session-id")));
    expect(sessionProcesses.length, "a session process opened after the restart").toBeGreaterThanOrEqual(1);
    expect(sessionProcesses.every((p) => p.argv.join(" ").includes(sessionId)),
      `only the saved session was opened: ${JSON.stringify(sessionProcesses.map((p) => p.argv.filter((arg) => arg.startsWith("--")).join(" ")))}`).toBe(true);
    expect(live.renewalMarkers(dir()), "a present session is not renewed").toEqual([]);
    expect(live.completeSegments(dir()).filter((segment) => String(segment.boundary_key).startsWith("session_renewal:")), "no renewal segment").toEqual([]);
    expect((await live.metadata(dir())).platformAgentRunId, "the session is kept").toBe(sessionId);
    await live.keep("LC-02-claude-busy-restart.json", { runId, sessionId, model, recall: recall.text,
      resumedArgv: resumed.map((p) => p.argv.filter((arg) => !arg.includes(live.runtimeRoot)).join(" ").slice(0, 300)) });
    await live.terminate(runId);
  }, 1_200_000);
});

describe.runIf(CODEX_ENABLED)("a lost Codex thread with the real Codex app-server on the built server (AC-002)", () => {
  const live = liveServer("codex", async (root) => {
    const codexHome = path.join(root, "codex-home");
    await fs.mkdir(codexHome, { recursive: true });
    await fs.symlink(CODEX_AUTH, path.join(codexHome, "auth.json"));
    const recorder = path.join(root, "bin", "codex-recorder.cjs");
    await fs.mkdir(path.join(root, "wire"), { recursive: true });
    await fs.writeFile(recorder, recorderSource(CODEX_CLI, path.join(root, "wire", "codex")), { mode: 0o755 });
    return { HOME: path.join(root, "isolated-home"), CODEX_HOME: codexHome, CODEX_APP_SERVER_COMMAND: recorder };
  });
  const codexHome = () => path.join(live.runtimeRoot, "codex-home");
  const wire = () => readWire(path.join(live.runtimeRoot, "wire", "codex"));
  const MARKER = markerText("Codex App Server");

  beforeAll(async () => {
    await fs.mkdir(path.join(live.runtimeRoot, "isolated-home"), { recursive: true });
    await live.setUp();
  }, 300_000);
  afterAll(async () => { await live.tearDown(); }, 180_000);

  it("LC-03: the removed Codex rollout continues in a new thread with the line and the notice (AC-002)", async () => {
    const model = await live.pickModel("codex_app_server", [process.env.CODEX_E2E_MODEL?.trim() || "gpt-5.6-luna", "mini"]);
    const { runId, dir } = await live.createRun("codex_app_server", model, "lc03");
    await live.talk(runId, "Reply only OK.", "era 1");
    const lost = (await live.metadata(dir())).platformAgentRunId as string;
    expect(lost).toEqual(expect.any(String));
    await live.terminate(runId);
    const rollouts = filesNamed(path.join(codexHome(), "sessions"), (name) => name.includes(lost));
    expect(rollouts.length, "the thread's rollout is in the throwaway CODEX_HOME").toBeGreaterThanOrEqual(1);
    for (const file of rollouts) await fs.rm(file);

    const renewed = await live.talk(runId, "Reply with one short sentence saying you are ready.", "after the loss");

    const key = `session_renewal:${runId}:${lost}`;
    expect(live.completeSegments(dir()).filter((segment) => segment.boundary_key === key), "one segment").toHaveLength(1);
    expect(live.active(dir())[0]).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: key, content: MARKER });
    const fresh = (await live.metadata(dir())).platformAgentRunId as string;
    expect(fresh).toEqual(expect.any(String));
    expect(fresh).not.toBe(lost);
    expect(renewed.text.trim().length, "the agent answered").toBeGreaterThan(0);
    const turnStarts = wire().flatMap((p) => p.sentText.split("\n")).filter((line) => line.includes("\"turn/start\""));
    const lastTurn = turnStarts.at(-1) ?? "";
    expect(lastTurn.includes(HANDOVER_NOTICE_START), "the fresh thread's first input carries the hand-over notice").toBe(true);
    await live.keep("LC-03-codex.json", { runId, lost, fresh, model, answer: renewed.text, marker: live.active(dir())[0] });
    await live.terminate(runId);
  }, 900_000);
});
