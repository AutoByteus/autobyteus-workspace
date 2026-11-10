import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";
import { capturedTestVaultSetting } from "../../../../test-support/test-vault/test-vault-selection.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import {
  createSanitizedTestEnvironment,
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

/**
 * Live proof (autobyteus-9: AC-005, AC-006, AC-008, QR-003; REQ-005, REQ-006, REQ-008) that the Claude Agent SDK runtime
 * sends effort and nothing else about thinking. A built server runs real Claude Agent SDK sessions on the real Claude CLI;
 * the CLI is started through a logging wrapper, so the arguments the SDK passes (`--effort <level>`, `--thinking ...`,
 * `--max-thinking-tokens`, `--thinking-display`) are read at the process boundary, whatever the server's own options were.
 *
 * Cases (each runs once per usable Claude CLI: the one on PATH and the SDK-bundled one):
 *  - A run created with `{ thinking_enabled: false, reasoning_effort: "xhigh", thinking_display: "omitted" }` stores
 *    `{ reasoning_effort: "xhigh" }` (AC-008); its turn replies; the CLI is started with `--effort xhigh` and no thinking
 *    argument (AC-005). Creating the run starts no CLI that reads the model list (QR-003).
 *  - A run created with no settings is started with no `--effort` and no thinking argument (AC-006).
 *  - The same run saved by an earlier release with `{ thinking_enabled: false, reasoning_effort: "xhigh", thinking_display:
 *    "omitted" }` in its metadata resumes the same way: effort `xhigh`, no thinking argument, no failure (AC-005, persisted
 *    data: directly usable).
 *
 * Gate: RUN_CLAUDE_E2E=1 with the Anthropic key in the test vault (`AUTOBYTEUS_TEST_VAULT`, TESTING.md#test-vault; the
 * server reads it read-only, the CLI runs in api-key mode with its own private config folder, so no Claude login or file of
 * the operator is used). Each turn is one short `haiku` reply (a few cents at most for the whole file).
 * Command (from the repository root):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault \
 *     RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-effort-only-live.e2e.test.ts --no-watch
 * Needs `pnpm -C autobyteus-server-ts build` of the same worktree (the built server is what runs).
 */
const cliCandidates = resolveClaudeCliExecutableCandidates();
// The test setup moves the selector out of `process.env`; a live opt-in reads it through its captured copy.
const vault = capturedTestVaultSetting();
const live = process.env.RUN_CLAUDE_E2E === "1" && Boolean(vault) && cliCandidates.length > 0;
const describeLive = live ? describe : describe.skip;
const cliCases = cliCandidates.map((candidate) => [candidate.label, candidate] as const);

const CLAUDE_SDK = "claude_agent_sdk";
const TURN_TIMEOUT_MS = Number(process.env.CLAUDE_FLOW_TEST_TIMEOUT_MS || 180_000);
const THINKING_ARGUMENTS = ["--thinking", "--max-thinking-tokens", "--thinking-display"];

type RunningServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type Invocation = { at: number; argv: string[] };
type StreamFrame = { type?: string; payload?: Record<string, unknown> };

const owned: Array<{ runtimeRoot: string; database: ReturnType<typeof resolveTestDatabaseLocation>; server?: RunningServer }> = [];

afterEach(async () => {
  for (const target of owned.splice(0)) {
    if (target.server && target.server.child.exitCode === null) await target.server.stop().catch(() => target.server!.child.kill("SIGKILL"));
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

/** A `claude` that records its arguments (one JSON line per start) and then is the real CLI, unchanged. */
const writeLoggingWrapper = (directory: string, realCli: string, logFile: string): string => {
  const wrapper = path.join(directory, "claude");
  fs.writeFileSync(wrapper, [
    "#!/bin/sh",
    `"${process.execPath}" -e 'require("fs").appendFileSync(process.argv[1], JSON.stringify({ at: Date.now(), argv: process.argv.slice(2) }) + "\\n")' "${logFile}" "$@"`,
    `exec "${realCli}" "$@"`,
    "",
  ].join("\n"), { mode: 0o755 });
  return wrapper;
};

const invocations = (logFile: string): Invocation[] =>
  (fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8").trim().split("\n").filter(Boolean) : []).map((line) => JSON.parse(line) as Invocation);

/** The value following `flag` in an argument list, or null when the flag is absent. */
const argumentAfter = (argv: readonly string[], flag: string): string | null => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] ?? null : null;
};

describeLive("Claude Agent SDK runtime: effort only reaches the Claude CLI (live)", () => {
  it.each(cliCases)("%s: stored effort is passed, stale thinking settings and an unchosen effort are not", async (_label, candidate) => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const runtimeRoot = path.join(testRuntimeRoot, `claude-effort-only-${suffix}`);
    const database = resolveTestDatabaseLocation(`file:./db/claude-effort-only-${suffix}.db`);
    const target: (typeof owned)[number] = { runtimeRoot, database };
    owned.push(target);
    const privateHome = path.join(runtimeRoot, "home");
    const cliDirectory = path.join(runtimeRoot, "cli");
    const workspaceRootPath = path.join(runtimeRoot, "workspace");
    for (const directory of [privateHome, cliDirectory, workspaceRootPath, path.join(privateHome, "claude-config")]) {
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    }
    const logFile = path.join(cliDirectory, "claude-starts.jsonl");
    const wrapper = writeLoggingWrapper(cliDirectory, candidate.executablePath, logFile);
    const server = await startBuiltTestServer({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
      testVaultSetting: vault,
      environment: createSanitizedTestEnvironment({
        HOME: privateHome,
        CLAUDE_CONFIG_DIR: path.join(privateHome, "claude-config"),
        CLAUDE_AGENT_SDK_AUTH_MODE: "api-key",
        CLAUDE_CODE_EXECUTABLE_PATH: wrapper,
      }),
    });
    target.server = server;

    const definition = await executeGraphql<{ createAgentDefinition: { id: string } }>(server.serverUrl, `
      mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }
    `, { input: { name: `effort-only-${suffix}`, role: "assistant", description: "Effort-only live check", instructions: "Reply with one word.", category: "api-e2e" } });
    const agentDefinitionId = definition.createAgentDefinition.id;

    const createRun = async (llmConfig: Record<string, unknown> | null) => {
      const before = invocations(logFile).length;
      const started = Date.now();
      const created = await executeGraphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(server.serverUrl, `
        mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }
      `, { input: { agentDefinitionId, workspaceRootPath, llmModelIdentifier: "haiku", llmConfig, autoExecuteTools: true, runtimeKind: CLAUDE_SDK } });
      const elapsedMs = Date.now() - started;
      if (!created.createAgentRun.success || !created.createAgentRun.runId) throw new Error(created.createAgentRun.message);
      return { runId: created.createAgentRun.runId, elapsedMs, startsDuringCreate: invocations(logFile).slice(before) };
    };
    const storedConfig = async (runId: string) => (await executeGraphql<{ getAgentRunResumeConfig: { metadataConfig: { llmConfig: unknown } } }>(server.serverUrl, `
      query($runId: String!) { getAgentRunResumeConfig(runId: $runId) { metadataConfig { llmConfig } } }
    `, { runId })).getAgentRunResumeConfig.metadataConfig.llmConfig;
    const turn = async (runId: string, content: string): Promise<string> => {
      const frames: StreamFrame[] = [];
      const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws/agent/${runId}`);
      socket.on("message", (raw: unknown) => { try { frames.push(JSON.parse(String(raw)) as StreamFrame); } catch { /* not an agent frame */ } });
      await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
      try {
        const from = frames.length;
        sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
        const deadline = Date.now() + TURN_TIMEOUT_MS;
        for (;;) {
          const settled = frames.slice(from).some((frame) => frame.type === "AGENT_STATUS" && frame.payload?.status === "idle")
            && frames.slice(from).some((frame) => frame.type === "SEGMENT_CONTENT");
          const failed = frames.find((frame) => frame.type === "ERROR");
          if (failed) throw new Error(`Run ${runId} failed: ${JSON.stringify(failed.payload)}`);
          if (settled) break;
          if (Date.now() > deadline) throw new Error(`Timed out waiting for the reply of ${runId}; frames: ${frames.map((frame) => frame.type).join(",")}`);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return frames.filter((frame) => frame.type === "SEGMENT_CONTENT").map((frame) => String(frame.payload?.delta ?? "")).join("");
      } finally {
        socket.close();
      }
    };
    const sessionStartsFrom = (index: number) => invocations(logFile).slice(index)
      .filter((entry) => entry.argv.some((argument) => argument.startsWith("--session-id") || argument.startsWith("--resume")));
    const catalogReadStartsFrom = (index: number) => invocations(logFile).slice(index)
      .filter((entry) => !entry.argv.includes("--version") && !entry.argv.some((argument) => argument.startsWith("--session-id") || argument.startsWith("--resume")));
    const expectEffortOnly = (start: Invocation, effort: string | null) => {
      expect(argumentAfter(start.argv, "--effort"), "the effort the CLI was started with").toBe(effort);
      for (const flag of THINKING_ARGUMENTS) expect(start.argv, `no ${flag} argument`).not.toContain(flag);
      expect(start.argv.some((argument) => argument.startsWith("--thinking")), "no thinking argument of any form").toBe(false);
    };

    // Control: reading the model list does start a CLI that is not a session, so "none during creation" can detect one.
    const beforeCatalog = invocations(logFile).length;
    await executeGraphql(server.serverUrl, `query { providerModelCatalogSnapshots(runtimeKind: "${CLAUDE_SDK}") { llmModels { modelIdentifier } } }`);
    expect(catalogReadStartsFrom(beforeCatalog).length, "a model list read starts the Claude CLI").toBeGreaterThanOrEqual(1);

    // AC-008, AC-005, QR-003: a launch carrying stale and undeclared settings.
    const withEffort = await createRun({ thinking_enabled: false, reasoning_effort: "xhigh", thinking_display: "omitted" });
    expect(await storedConfig(withEffort.runId), "stored with the declared setting only").toEqual({ reasoning_effort: "xhigh" });
    expect(withEffort.startsDuringCreate.filter((entry) => !entry.argv.includes("--version")), "creating the run starts no Claude CLI (no model list read)").toEqual([]);
    console.log(`[effort-only] ${candidate.label} ${candidate.version}: createAgentRun took ${withEffort.elapsedMs} ms`);
    const startsBeforeTurn = invocations(logFile).length;
    expect((await turn(withEffort.runId, "Reply with the single word OK.")).trim().length, "the turn replied").toBeGreaterThan(0);
    const effortStarts = sessionStartsFrom(startsBeforeTurn);
    expect(effortStarts, "one session CLI for the turn").toHaveLength(1);
    expectEffortOnly(effortStarts[0]!, "xhigh");

    // AC-006: nothing chosen, nothing sent.
    const unchosen = await createRun(null);
    expect(await storedConfig(unchosen.runId)).toBeNull();
    const startsBeforeUnchosen = invocations(logFile).length;
    expect((await turn(unchosen.runId, "Reply with the single word OK.")).trim().length).toBeGreaterThan(0);
    const unchosenStarts = sessionStartsFrom(startsBeforeUnchosen);
    expect(unchosenStarts).toHaveLength(1);
    expectEffortOnly(unchosenStarts[0]!, null);

    // AC-005, persisted data: a run an earlier release saved with the Off switch resumes on its effort alone.
    await executeGraphql(server.serverUrl, `mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }`, { id: withEffort.runId });
    const metadataPath = path.join(runtimeRoot, "memory", "agents", withEffort.runId, "run_metadata.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as Record<string, unknown>;
    metadata.llmConfig = { thinking_enabled: false, reasoning_effort: "xhigh", thinking_display: "omitted" };
    fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    const restored = await executeGraphql<{ restoreAgentRun: { success: boolean; message: string } }>(server.serverUrl,
      `mutation($id: String!) { restoreAgentRun(agentRunId: $id) { success message } }`, { id: withEffort.runId });
    expect(restored.restoreAgentRun.success, restored.restoreAgentRun.message).toBe(true);
    const startsBeforeResume = invocations(logFile).length;
    expect((await turn(withEffort.runId, "Reply with the single word OK again.")).trim().length, "the resumed run replied").toBeGreaterThan(0);
    const resumedStarts = sessionStartsFrom(startsBeforeResume);
    expect(resumedStarts).toHaveLength(1);
    expectEffortOnly(resumedStarts[0]!, "xhigh");
  }, 600_000);
});
