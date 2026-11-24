/**
 * A restart keeps a person's runs running on the external runtimes (autobyteus-638, AC-001, AC-002): Antigravity (the
 * scripted AGY CLI), Claude Agent SDK (the real `claude` CLI) and Codex App Server (the real `codex` CLI), across real
 * restarts of the BUILT server, gracefully (SIGTERM, the app's quit) and by a kill (SIGKILL, a crash).
 *
 * Per case: a person's Agent run on the runtime has one exchange ("remember the codeword"), is idle, and is in the
 * running-run record. The node stops; at the next start the run is running again with its own runtime session
 * (`platformAgentRunId` unchanged), and the restore posted nothing (the run's conversation is unchanged). The person's
 * next message is answered in the same conversation: Claude and Codex name the codeword from before the restart; the
 * scripted AGY answers the message.
 *
 *   RUN-X-AGY-TERM, RUN-X-AGY-KILL       Antigravity (scripted; no provider)
 *   RUN-X-CLAUDE-TERM, RUN-X-CLAUDE-KILL Claude (paid: two short turns each, the cheapest model, haiku)
 *   RUN-X-CODEX-TERM, RUN-X-CODEX-KILL   Codex (paid: two short turns each, gpt-6.1-terra or CODEX_E2E_MODEL)
 *   RUN-X-CODEX-READY-TERM, -READY-KILL  Codex without inference: a run started and not yet messaged comes back running,
 *                                        with no input and no model call (its empty thread was never saved by Codex, so the
 *                                        existing renewal line of autobyteus-599 appears; runs without account credits)
 *
 * Isolation (TESTING.md): AGY runs under the suite's own HOME. Claude: HOME and CLAUDE_CONFIG_DIR are the suite's,
 * CLAUDE_AGENT_SDK_AUTH_MODE=api-key, the vault's key reaches the CLI child only. Codex: a throwaway CODEX_HOME holding a
 * link to the host's auth.json; its sessions are written there and removed with it.
 * Gates (each runtime alone): RUN_AGY_FAILURE_E2E=1 with ANTIGRAVITY_CLI_COMMAND=<abs agy-failure-cli.mjs>;
 *   RUN_CLAUDE_E2E=1 with AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault; RUN_CODEX_E2E=1 (the host's ~/.codex/auth.json).
 * Built server first: pnpm -C autobyteus-server-ts build. Command (the real HOME only to find the CLIs):
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" <gate> \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/restart-resume/running-runs-external-runtimes.e2e.test.ts --no-watch
 * RUNNING_RUNS_EXTERNAL_E2E_EVIDENCE_DIR (optional) keeps each case's summary.
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { once } from "node:events";
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

type Json = Record<string, any>;
type Wire = { type: string; payload: Json };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const which = (command: string): string => {
  const found = spawnSync("/bin/sh", ["-c", `command -v ${command}`], { encoding: "utf8" }).stdout.trim();
  return found && path.isAbsolute(found) ? found : "";
};
const until = async (check: () => boolean | Promise<boolean>, label: string, ms = 180_000) => {
  const deadline = Date.now() + ms;
  let last: unknown;
  while (Date.now() < deadline) { try { if (await check()) return; } catch (error) { last = error; } await wait(200); }
  throw new Error(`Timed out: ${label}${last ? ` (${String(last)})` : ""}`);
};
const BUILT = existsSync(path.resolve("dist/app.js"));
const TEST_VAULT = capturedTestVaultSetting() ?? "";
const AGY_CLI = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const AGY_ENABLED = process.env.RUN_AGY_FAILURE_E2E === "1" && BUILT && AGY_CLI !== ""
  && spawnSync(AGY_CLI, ["--version"], { stdio: "ignore" }).status === 0;
const CLAUDE_CLI = which("claude");
const CODEX_CLI = which("codex");
const CODEX_AUTH = path.join(os.homedir(), ".codex", "auth.json");
const CLAUDE_ENABLED = process.env.RUN_CLAUDE_E2E === "1" && BUILT && TEST_VAULT !== "" && CLAUDE_CLI !== "";
const CODEX_ENABLED = process.env.RUN_CODEX_E2E === "1" && BUILT && CODEX_CLI !== "" && existsSync(CODEX_AUTH);
const EVIDENCE_DIR = process.env.RUNNING_RUNS_EXTERNAL_E2E_EVIDENCE_DIR?.trim() || "";

/** One built server per runtime on its own data root and runtime home, restarted in place. */
const liveNode = (label: string, runtimeEnvironment: (root: string) => Promise<Record<string, string>>) => {
  const suffix = `running-runs-${label}-${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, suffix);
  const database = resolveTestDatabaseLocation(`file:./db/${suffix}.db`);
  let server: Awaited<ReturnType<typeof startBuiltTestServer>> | null = null;
  let environment: Record<string, string> = {};
  const outputs: string[] = [];
  const gql = async <T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> => executeGraphql<T>(server!.serverUrl, query, variables);
  const launch = async () => {
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl,
      ...(TEST_VAULT ? { testVaultSetting: TEST_VAULT } : {}), environment });
  };
  /** SIGTERM (the app's quit) waits for the node's own end; SIGKILL (a crash) leaves none. */
  const stop = async (signal: "SIGTERM" | "SIGKILL") => {
    if (!server) return;
    outputs.push(server.output());
    if (signal === "SIGTERM") { await server.stop(); server = null; return; }
    const child = server.child;
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, "exit"); child.kill("SIGKILL"); await exited; }
    server = null;
  };
  const output = () => server?.output() ?? "";
  const turnEnded = (message: Wire) => message.type === "TURN_COMPLETED" || message.type === "TURN_INTERRUPTED";
  const failed = (message: Wire) => message.type === "ERROR" || (message.type === "AGENT_COMMAND_ACK" && message.payload.state !== "accepted");
  /** The person's message on the run's own stream; resolves with the reply once the turn ends. */
  const talk = async (runId: string, content: string, label: string) => {
    const messages: Wire[] = [];
    const socket = new WebSocket(`ws://127.0.0.1:${new URL(server!.serverUrl).port}/ws/agent/${runId}`);
    socket.on("message", (raw: unknown) => {
      try {
        for (const frame of agentStreamFramesOf(JSON.parse(String(raw)) as never) as unknown as Array<{ type?: string; payload?: Json }>) {
          if (typeof frame.type === "string") messages.push({ type: frame.type, payload: frame.payload && typeof frame.payload === "object" ? frame.payload : {} });
        }
      } catch { /* diagnostic rows only */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => messages.some((m) => m.type === "CONNECTED"), `${label}: CONNECTED`, 120_000);
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    await until(() => messages.some(turnEnded) || messages.some(failed), `${label}: the turn ended`, 300_000);
    await wait(500);
    socket.close();
    expect(messages.filter(failed).map((m) => m.payload), `${label}: errors`).toEqual([]);
    return messages.filter((m) => m.type === "SEGMENT_CONTENT").map((m) => String(m.payload.delta ?? "")).join("");
  };
  const createRun = async (runtimeKind: string, llmModelIdentifier: string, name: string) => {
    const workspace = path.join(runtimeRoot, `workspace-${name}`);
    await fs.mkdir(workspace, { recursive: true });
    const definitionId = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
      { input: { name: `${name} ${randomUUID().slice(0, 6)}`, role: "assistant", description: "running runs E2E",
        instructions: "Do what the user asks. Keep replies short.", category: "runtime-e2e", toolNames: [] } })).createAgentDefinition.id as string;
    const created = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitionId, runtimeKind, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace } })).createAgentRun as Json;
    expect(created.success, created.message).toBe(true);
    return created.runId as string;
  };
  const pickModel = async (runtimeKind: string, preferred: string[]) => {
    const snapshots = (await gql("query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
      { runtimeKind })).providerModelCatalogSnapshots as Json[];
    const available = snapshots.flatMap((snapshot) => (snapshot.llmModels as Json[]).map((model) => model.modelIdentifier as string));
    const chosen = preferred.map((fragment) => available.find((id) => id.includes(fragment))).find(Boolean) ?? available[0];
    expect(chosen, `${runtimeKind} models: ${available.join(", ")}`).toBeTruthy();
    return chosen!;
  };
  const isActive = async (runId: string) =>
    (await gql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: runId })).getAgentRunResumeConfig.isActive === true;
  const conversation = async (runId: string) => JSON.stringify((await gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? null);
  const metadataOf = async (runId: string): Promise<Json> => JSON.parse(await fs.readFile(path.join(runtimeRoot, "memory", "agents", runId, "run_metadata.json"), "utf8")) as Json;
  const runningRecord = async (): Promise<Json | null> => JSON.parse(await fs.readFile(path.join(runtimeRoot, "restart-resume", "running-runs.json"), "utf8").catch(() => "null")) as Json | null;
  const keep = async (name: string, value: unknown) => {
    if (!EVIDENCE_DIR) return;
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(path.join(EVIDENCE_DIR, name), JSON.stringify(value, null, 2).replaceAll(runtimeRoot, "<RUNTIME_ROOT>"));
  };

  /** One case: an exchange, the record, a restart by `signal`, the run running again untouched, then the next exchange. */
  const restartCase = async (caseId: string, runtimeKind: string, model: string, signal: "SIGTERM" | "SIGKILL", remembers: boolean,
    options: { inference?: boolean } = {}) => {
    const inference = options.inference !== false;
    const runId = await createRun(runtimeKind, model, caseId.toLowerCase());
    const codeword = `ORCHID-${randomUUID().slice(0, 6).toUpperCase()}`;
    // Without inference the person started the run and has not messaged it yet: it is running all the same.
    const first = inference ? await talk(runId, `Remember the codeword ${codeword}. Reply only OK.`, `${caseId} before`) : "";
    await until(async () => ((await runningRecord())?.runs as Json[] | undefined)?.some((run) => run.rootRunId === runId) === true, `${caseId}: recorded running`, 15_000);
    const session = (await metadataOf(runId)).platformAgentRunId as string | null;
    const before = await conversation(runId);
    await stop(signal);
    const afterStop = await runningRecord();
    await launch();
    await until(() => output().includes("Running runs after the restart:"), `${caseId}: the restore summary`, 120_000);
    const summary = output().match(/Running runs after the restart: [^\n]*/)?.[0] ?? "";
    await until(() => isActive(runId), `${caseId}: running again`, 60_000);
    await wait(2_000);
    const afterRestore = await conversation(runId);
    const sessionAfter = (await metadataOf(runId)).platformAgentRunId as string | null;
    const answer = inference ? await talk(runId, "What is the codeword you were asked to remember? Reply with the codeword only.", `${caseId} after`) : "";
    await keep(`${caseId}.json`, { caseId, runtimeKind, model, signal, runId, first, session, sessionAfter, afterStop, summary,
      unchanged: before === afterRestore, answer });
    expect((afterStop?.runs as Json[] | undefined)?.some((run) => run.rootRunId === runId), `${caseId}: the record after the stop`).toBe(true);
    expect(summary, `${caseId}: the restore`).toMatch(/^Running runs after the restart: [1-9]\d* brought back, 0 skipped, 0 failed$/);
    if (!inference) {
      // A run never messaged has no saved runtime session on Codex (an empty thread is not kept), so its activation, here
      // the restore, renews it with the existing renewal line (autobyteus-599). The restore made no model call: no user or
      // assistant entry was added.
      const added = (JSON.parse(afterRestore) as Json[] | null ?? []).slice((JSON.parse(before) as Json[] | null ?? []).length);
      expect(added.filter((entry) => entry.kind !== "system_task_notification" || entry.senderId !== "system.runtime_handover"),
        `${caseId}: the restore posted no input and made no model call`).toEqual([]);
      return;
    }
    expect(afterRestore, `${caseId}: the restore posted nothing`).toBe(before);
    expect(sessionAfter, `${caseId}: its own runtime session`).toBe(session);
    if (remembers) expect(answer.toUpperCase(), `${caseId}: the same conversation`).toContain(codeword);
    else expect(answer.trim().length, `${caseId}: answered`).toBeGreaterThan(0);
  };
  return {
    runtimeRoot, launch, stop, pickModel, restartCase,
    setUp: async () => { await fs.mkdir(runtimeRoot, { recursive: true }); environment = await runtimeEnvironment(runtimeRoot); await launch(); },
    tearDown: async () => { try { await stop("SIGTERM"); } finally { await removeOwnedTestRuntime(runtimeRoot, database); } },
  };
};

describe.runIf(AGY_ENABLED)("a restart keeps an Antigravity run running (scripted AGY)", () => {
  const live = liveNode("agy", async (root) => {
    const home = path.join(root, "agy-home");
    await fs.mkdir(home, { recursive: true });
    // `linked_skills`: the scripted AGY answers each message and keeps a resumed conversation's ID.
    return { HOME: home, ANTIGRAVITY_CLI_COMMAND: AGY_CLI, AGY_FAKE_CASE: "linked_skills" };
  });
  beforeAll(async () => { await live.setUp(); }, 300_000);
  afterAll(async () => { await live.tearDown(); }, 180_000);
  it("RUN-X-AGY-TERM: graceful restart", async () => {
    await live.restartCase("RUN-X-AGY-TERM", "antigravity_cli", "gemini-3.8-flash-low", "SIGTERM", false);
  }, 600_000);
  it("RUN-X-AGY-KILL: kill", async () => {
    await live.restartCase("RUN-X-AGY-KILL", "antigravity_cli", "gemini-3.8-flash-low", "SIGKILL", false);
  }, 600_000);
});

describe.runIf(CLAUDE_ENABLED)("a restart keeps a Claude run running (the real Claude CLI)", () => {
  const live = liveNode("claude", async (root) => {
    const home = path.join(root, "claude-home");
    await fs.mkdir(path.join(home, "config"), { recursive: true });
    return { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, "config"), CLAUDE_AGENT_SDK_AUTH_MODE: "api-key" };
  });
  let model = "";
  beforeAll(async () => { await live.setUp(); model = await live.pickModel("claude_agent_sdk", ["haiku"]); }, 300_000);
  afterAll(async () => { await live.tearDown(); }, 180_000);
  it("RUN-X-CLAUDE-TERM: graceful restart", async () => {
    await live.restartCase("RUN-X-CLAUDE-TERM", "claude_agent_sdk", model, "SIGTERM", true);
  }, 600_000);
  it("RUN-X-CLAUDE-KILL: kill", async () => {
    await live.restartCase("RUN-X-CLAUDE-KILL", "claude_agent_sdk", model, "SIGKILL", true);
  }, 600_000);
});

describe.runIf(CODEX_ENABLED)("a restart keeps a Codex run running (the real Codex app-server)", () => {
  const live = liveNode("codex", async (root) => {
    const codexHome = path.join(root, "codex-home");
    await fs.mkdir(codexHome, { recursive: true });
    await fs.symlink(CODEX_AUTH, path.join(codexHome, "auth.json"));
    await fs.mkdir(path.join(root, "isolated-home"), { recursive: true });
    return { HOME: path.join(root, "isolated-home"), CODEX_HOME: codexHome };
  });
  let model = "";
  beforeAll(async () => { await live.setUp(); model = await live.pickModel("codex_app_server", [process.env.CODEX_E2E_MODEL?.trim() || "gpt-6.1-terra"]); }, 300_000);
  afterAll(async () => { await live.tearDown(); }, 180_000);
  it("RUN-X-CODEX-READY-TERM: graceful restart of a run not yet messaged (no inference)", async () => {
    await live.restartCase("RUN-X-CODEX-READY-TERM", "codex_app_server", model, "SIGTERM", false, { inference: false });
  }, 600_000);
  it("RUN-X-CODEX-READY-KILL: kill, the same", async () => {
    await live.restartCase("RUN-X-CODEX-READY-KILL", "codex_app_server", model, "SIGKILL", false, { inference: false });
  }, 600_000);
  it("RUN-X-CODEX-TERM: graceful restart", async () => {
    await live.restartCase("RUN-X-CODEX-TERM", "codex_app_server", model, "SIGTERM", true);
  }, 600_000);
  it("RUN-X-CODEX-KILL: kill", async () => {
    await live.restartCase("RUN-X-CODEX-KILL", "codex_app_server", model, "SIGKILL", true);
  }, 600_000);
});
