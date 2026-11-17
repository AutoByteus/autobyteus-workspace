import "reflect-metadata";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { agentStreamFramesOf } from "../helpers/agent-stream-frames.js";
import {
  closeLiveServerVault,
  initializeLiveServerVault,
  requireLiveCapability,
} from "../../../../test-support/test-vault/live-server-vault.js";

/**
 * Long shell commands in every agent runtime, through the real studio server and the host's real runtime CLIs
 * (autobyteus-483). Each case is one run created through GraphQL and driven through its agent WebSocket, as the
 * desktop app does; the long job is a script (`long-job.sh <seconds> <name>`: progress every 30 s, then
 * `<name>.done` and exit 0; on SIGTERM/SIGINT/SIGHUP it writes `<name>.killed`). It is a script because Claude Code
 * refuses a bare long `sleep`.
 *
 * Long cases (`-t LCL-LONG`, run concurrently; each job runs LONG_COMMAND_E2E_SECONDS, default 2100 = 35 min):
 *   LCL-LONG-CLAUDE-FG      Claude, foreground job of LONG_COMMAND_E2E_FOREGROUND_SECONDS (default 660) with no timeout
 *                           argument: the tool result is the job's own output; no background task (AC-001)
 *   LCL-LONG-CLAUDE-BG      Claude, run_in_background: completed, exit_code 0, never stopped at 30 min (AC-002)
 *   LCL-LONG-CLAUDE-TL      Claude, run_in_background with timeout 300000 on a 900 s job: stopped, end_reason
 *                           time_limit (AC-005)
 *   LCL-LONG-CLAUDE-HABIT   Claude, a plain request to run a ~12-min suite and report: tool calls recorded; one start,
 *                           no second copy, no sleep loop (AC-012, observational)
 *   LCL-LONG-CODEX-BG       Codex exec_command, the turn ends while the job runs: job not stopped (AC-002, REQ-008)
 *   LCL-LONG-GROK-BG        Grok run_terminal_command with block_until_ms 0: job not stopped (AC-002, REQ-008)
 *   LCL-LONG-AGY-DAEMON     Antigravity daemon run_command: listed, completed with exit_code 0 on the stream (the AGY
 *                           view lists running tasks only) (AC-002, REQ-008)
 *   LCL-LONG-AGY-BG         Antigravity non-daemon run_command past WaitMsBeforeAsync: job not stopped (REQ-008)
 *   LCL-LONG-NATIVE-BG      native run_bash run_in_background (gpt-5.4-mini): completed, exit_code 0 (AC-002, REQ-008)
 * Every long case also checks the job's process is still alive past 30 minutes (when the job is that long) and records
 * the run's background-task view (GraphQL `agentBackgroundTaskView`, what the panel reads) once a minute.
 *
 * Environment cases (`-t LCL-ENV`, run alone: one changes the server process environment):
 *   LCL-ENV-DEFAULT         Claude, nothing set: the Bash tool sees BASH_MAX/DEFAULT_TIMEOUT_MS = 7200000 (REQ-001)
 *   LCL-ENV-SETTINGS        Claude, the run workspace's `.claude/settings.json` env sets BASH_MAX_TIMEOUT_MS=900000:
 *                           the Bash tool sees 900000 and 7200000 (AC-003 settings part, ASM-001)
 *   LCL-ENV-SERVER          Claude, the server's environment sets BASH_MAX_TIMEOUT_MS=900000: 900000 and 7200000 (AC-003)
 *
 * Gate: RUN_LONG_COMMAND_LIMITS_E2E=1; the signed-in `claude`, `codex`, `grok` and `agy` on the host (a missing CLI
 * skips its cases); the native case needs `provider.openai.api-key` in the test vault. Uses real credits (a few short
 * turns per case) and adds sessions to the CLIs' own histories (AGY on the host login). Signed-in CLIs need the real
 * HOME, USER and LOGNAME; give the rest a clean environment:
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" SHELL=/bin/bash \
 *     AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LONG_COMMAND_LIMITS_E2E=1 \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/long-command-time-limits-live.e2e.test.ts --no-watch \
 *     --maxConcurrency=12 -t LCL-LONG
 * (vitest runs 5 concurrent cases by default; the long cases are meant to run side by side.)
 * Optional: LONG_COMMAND_E2E_SECONDS, LONG_COMMAND_E2E_FOREGROUND_SECONDS, LONG_COMMAND_E2E_EVIDENCE_DIR (per-case
 * JSON: tool calls, task snapshots, view polls, process samples, job files), LONG_COMMAND_E2E_CODEX_MODEL
 * (default gpt-6.1-terra, effort medium).
 */

const ENABLED = process.env.RUN_LONG_COMMAND_LIMITS_E2E === "1" && process.platform !== "win32";
const commandReady = (command: string) => spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
const READY = {
  claude: ENABLED && commandReady("claude"),
  codex: ENABLED && commandReady("codex"),
  grok: ENABLED && commandReady(process.env.GROK_BUILD_COMMAND?.trim() || "grok"),
  agy: ENABLED && commandReady("agy"),
};
const LONG_SECONDS = Number(process.env.LONG_COMMAND_E2E_SECONDS || 2100);
const FOREGROUND_SECONDS = Number(process.env.LONG_COMMAND_E2E_FOREGROUND_SECONDS || 660);
const TIME_LIMIT_JOB_SECONDS = 900;
const HABIT_SECONDS = Math.min(720, LONG_SECONDS);
const EVIDENCE_DIR = process.env.LONG_COMMAND_E2E_EVIDENCE_DIR?.trim() || null;
const CODEX_MODEL = process.env.LONG_COMMAND_E2E_CODEX_MODEL?.trim() || "gpt-6.1-terra";
const STEP_MS = 300_000;
const LONG_CASE_MS = (LONG_SECONDS + 25 * 60) * 1000;
const THIRTY_MINUTES_S = 30 * 60;

const LONG_JOB = `#!/bin/bash
# long-job.sh <seconds> <name>: a long build stand-in (autobyteus-483 live checks).
secs="$1"; name="$2"; start=$(date +%s)
elapsed() { echo $(( $(date +%s) - start )); }
trap 'echo "signal after $(elapsed)s" > "$name.killed"; exit 143' TERM INT HUP
echo $$ > "$name.pid"
echo "$name started"
while [ "$(elapsed)" -lt "$secs" ]; do
  sleep 30
  echo "$name progress $(elapsed)s"
done
echo "$name finished after $(elapsed)s" > "$name.done"
echo "LONG_JOB_DONE $name after $(elapsed)s"
`;

type Frame = { at: number; type: string; payload: Record<string, any> };
type Json = Record<string, any>;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const alive = (pid: number | null): boolean => {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
};
const readText = (file: string): string | null => { try { return readFileSync(file, "utf8").trim(); } catch { return null; } };
const toolArgs = (frame: Frame): Json => (frame.payload.arguments && typeof frame.payload.arguments === "object" ? frame.payload.arguments : {});
const argsText = (frame: Frame) => JSON.stringify(toolArgs(frame));
const resultText = (frame: Frame) => typeof frame.payload.result === "string" ? frame.payload.result : JSON.stringify(frame.payload.result ?? null);

const describeLive = ENABLED ? describe : describe.skip;

describeLive("long shell commands in every runtime (live, autobyteus-483)", () => {
  let dataDir = "";
  let app: FastifyInstance | null = null;
  let url: URL;
  const runIds: string[] = [];
  const definitionIds: string[] = [];
  const sockets: WebSocket[] = [];
  const jobDirs: string[] = [];
  const definitions: Record<"external" | "native", string> = { external: "", native: "" };

  const graphql = async <T = Json>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const pickModel = async (runtimeKind: string, preferred: string[]): Promise<string> => {
    const snapshots = (await graphql<{ providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }> }>(
      "query($runtimeKind: String) { providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } } }",
      { runtimeKind })).providerModelCatalogSnapshots;
    const available = snapshots.flatMap((snapshot) => snapshot.llmModels.map((model) => model.modelIdentifier));
    const chosen = preferred.map((fragment) => available.find((id) => id === fragment) ?? available.find((id) => id.includes(fragment)))
      .find(Boolean) ?? available[0];
    expect(chosen, `${runtimeKind} models: ${available.join(", ")}`).toBeTruthy();
    return chosen!;
  };
  const nativeModel = async (providerId: string, model: string): Promise<string> => {
    const result = await graphql<{ ensureProviderModelCatalog: { llmModels: Array<{ modelIdentifier: string; value: string }> } }>(
      "mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) { llmModels { modelIdentifier value } } }",
      { p: providerId, r: "autobyteus" });
    const found = result.ensureProviderModelCatalog.llmModels.find((entry) => entry.value === model || entry.modelIdentifier === model);
    expect(found, `${providerId} ${model}`).toBeTruthy();
    return found!.modelIdentifier;
  };

  beforeAll(async () => {
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "long-command-limits-")));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    await initializeLiveServerVault();
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
    const create = async (name: string, toolNames: string[]) => {
      const id = (await graphql<{ createAgentDefinition: { id: string } }>(
        "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
        { input: { name: `${name}-${randomUUID()}`, role: "assistant", description: "Long shell command live check",
          instructions: "You are a build assistant. Do exactly what the user asks with your tools. Keep replies short.",
          category: "runtime-e2e", toolNames } })).createAgentDefinition.id;
      definitionIds.push(id);
      return id;
    };
    definitions.external = await create("long-command-external", []);
    definitions.native = await create("long-command-native", ["run_bash"]);
  }, 180_000);

  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (app) {
      for (const runId of runIds) {
        await graphql("mutation($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success } }", { agentRunId: runId })
          .catch(() => undefined);
      }
      for (const id of definitionIds) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
      await app.close();
    }
    // A job a runtime left running (it never should past its case) is stopped by its pid file.
    for (const dir of jobDirs) {
      for (const entry of await fs.readdir(dir).catch(() => [] as string[])) {
        if (!entry.endsWith(".pid")) continue;
        const pid = Number(readText(path.join(dir, entry)));
        if (alive(pid)) { try { process.kill(pid, "SIGTERM"); } catch { /* gone */ } }
      }
    }
    await closeLiveServerVault();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 180_000);

  type Run = Awaited<ReturnType<typeof openRun>>;
  const openRun = async (input: { caseId: string; runtimeKind: string; model: string; llmConfig: Json | null;
    definition?: "external" | "native"; files?: Record<string, string> }) => {
    const workspace = await fs.realpath(await fs.mkdtemp(path.join(dataDir, `${input.caseId}-`)));
    jobDirs.push(workspace);
    await fs.writeFile(path.join(workspace, "long-job.sh"), LONG_JOB, { mode: 0o755 });
    for (const [name, content] of Object.entries(input.files ?? {})) {
      await fs.mkdir(path.dirname(path.join(workspace, name)), { recursive: true });
      await fs.writeFile(path.join(workspace, name), content, { mode: 0o755 });
    }
    const created = await graphql<{ createAgentRun: { success: boolean; message: string; runId: string | null } }>(
      "mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
      { input: { agentDefinitionId: definitions[input.definition ?? "external"], workspaceRootPath: workspace,
        llmModelIdentifier: input.model, llmConfig: input.llmConfig, autoExecuteTools: true, runtimeKind: input.runtimeKind } });
    expect(created.createAgentRun.success, created.createAgentRun.message).toBe(true);
    const runId = created.createAgentRun.runId!;
    runIds.push(runId);
    const t0 = Date.now();
    const frames: Frame[] = [];
    const socketEvents: Array<{ at: number; event: string }> = [];
    let socket: WebSocket;
    let closedByTest = false;
    const connect = async () => {
      socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
      sockets.push(socket);
      const from = frames.length;
      socket.on("message", (raw: unknown) => {
        try {
          for (const frame of agentStreamFramesOf(JSON.parse(String(raw)) as { type?: unknown; payload?: unknown })) {
            frames.push({ at: Date.now() - t0, type: frame.type, payload: frame.payload });
          }
        } catch { /* only malformed diagnostic rows */ }
      });
      socket.on("close", () => {
        socketEvents.push({ at: Date.now() - t0, event: "close" });
        // A long wait must not lose the stream: reconnect as the app does (its snapshot comes first).
        if (!closedByTest) void wait(1_000).then(() => connect().catch(() => undefined));
      });
      await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
      // Commands wait for this socket's own CONNECTED (a reconnect's frames follow the earlier ones).
      const deadline = Date.now() + 30_000;
      while (!frames.slice(from).some((frame) => frame.type === "CONNECTED") && Date.now() < deadline) await wait(20);
    };
    await connect();
    const send = (content: string) => { const from = frames.length; sendE2eSendMessageCommand(socket, { agent_run_id: runId, content }); return from; };
    const until = async <T>(probe: () => T | undefined | null | false, label: string, ms: number): Promise<T> => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) { const value = probe(); if (value) return value as T; await wait(500); }
      throw new Error(`${input.caseId}: timed out waiting for ${label}; last frames: ${frames.slice(-15).map((f) => f.type).join(", ")}`);
    };
    const turnEnd = (from: number) => frames.slice(from).find((f) => f.type === "TURN_COMPLETED" || f.type === "TURN_INTERRUPTED"
      || (f.type === "ERROR" && f.payload.error_effect === "terminal"));
    const tasks = (): Json[] => frames.filter((f) => f.type === "BACKGROUND_TASK_UPDATED").map((f) => ({ at: f.at, ...f.payload }));
    const toolStarts = () => frames.filter((f) => f.type === "TOOL_EXECUTION_STARTED");
    const view = async () => (await graphql<{ agentBackgroundTaskView: Json }>(`query($id: String!) { agentBackgroundTaskView(agentRunId: $id) {
      __typename
      ... on AgentBackgroundTaskSnapshot { observedAt tasks { taskId kind description status exitCode startedAt } }
      ... on AgentBackgroundTaskEventStream { currentTasks: tasks { taskId kind description command status summary endReason exitCode startedAt } }
      ... on AgentBackgroundTaskUnsupported { reason }
      ... on AgentBackgroundTaskUnavailable { reason } } }`, { id: runId })).agentBackgroundTaskView;
    const jobFile = (name: string, kind: "pid" | "done" | "killed") => readText(path.join(workspace, `${name}.${kind}`));
    const close = () => { closedByTest = true; socket.close(); };
    return { caseId: input.caseId, runId, workspace, t0, frames, socketEvents, send, until, turnEnd, tasks, toolStarts, view, jobFile, close };
  };

  /** Samples the job's process and the run's view once a minute until the job ended (done or killed) or `ms` passed. */
  const watchJob = async (run: Run, name: string, ms: number) => {
    const samples: Json[] = [];
    const deadline = Date.now() + ms;
    const pid = Number(await run.until(() => run.jobFile(name, "pid"), `${name}.pid`, STEP_MS));
    while (Date.now() < deadline) {
      const elapsedS = Math.round((Date.now() - run.t0) / 1000);
      const sample: Json = { elapsedS, pidAlive: alive(pid), done: run.jobFile(name, "done"), killed: run.jobFile(name, "killed") };
      sample.view = await run.view().catch((error: unknown) => ({ error: String(error) }));
      samples.push(sample);
      if (sample.done || sample.killed || !sample.pidAlive) break;
      await wait(60_000);
    }
    // One more view read after the end, for the final row.
    await wait(5_000);
    samples.push({ elapsedS: Math.round((Date.now() - run.t0) / 1000), pidAlive: alive(pid), done: run.jobFile(name, "done"),
      killed: run.jobFile(name, "killed"), view: await run.view().catch((error: unknown) => ({ error: String(error) })) });
    const aliveAfter30Min = samples.some((sample) => sample.pidAlive && sample.elapsedS > THIRTY_MINUTES_S + 30);
    return { pid, samples, aliveAfter30Min };
  };

  const record = async (caseId: string, evidence: Json) => {
    if (!EVIDENCE_DIR) return;
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    await fs.writeFile(path.join(EVIDENCE_DIR, `${caseId}.json`), JSON.stringify(evidence, null, 2));
  };
  const digest = (run: Run) => ({
    runId: run.runId,
    socketEvents: run.socketEvents,
    toolCalls: run.frames.filter((f) => f.type === "TOOL_EXECUTION_STARTED" || f.type === "TOOL_EXECUTION_SUCCEEDED" || f.type === "TOOL_EXECUTION_FAILED")
      .map((f) => ({ at: f.at, type: f.type, tool: f.payload.tool_name, invocation: f.payload.invocation_id,
        args: f.type === "TOOL_EXECUTION_STARTED" ? toolArgs(f) : undefined,
        result: f.type === "TOOL_EXECUTION_STARTED" ? undefined : resultText(f).slice(0, 1500) })),
    tasks: run.tasks(),
    notices: run.frames.filter((f) => f.type === "SYSTEM_TASK_NOTIFICATION").map((f) => ({ at: f.at, ...f.payload })),
    turns: run.frames.filter((f) => ["TURN_STARTED", "TURN_COMPLETED", "TURN_INTERRUPTED", "ERROR"].includes(f.type))
      .map((f) => ({ at: f.at, type: f.type, payload: JSON.stringify(f.payload).slice(0, 400) })),
    text: run.frames.filter((f) => f.type === "SEGMENT_CONTENT").map((f) => String(f.payload.delta ?? "")).join("").slice(-3000),
  });

  /** Runs a case body, writing its evidence whether it passes or fails. */
  const withEvidence = async (caseId: string, body: (evidence: Json) => Promise<void>) => {
    const evidence: Json = { caseId, startedAt: new Date().toISOString(), longSeconds: LONG_SECONDS };
    try {
      await body(evidence);
      evidence.result = "Pass";
    } catch (error) {
      evidence.result = "Fail";
      evidence.error = String(error);
      throw error;
    } finally {
      evidence.endedAt = new Date().toISOString();
      await record(caseId, evidence);
    }
  };

  const claudeRun = async (caseId: string, files?: Record<string, string>) =>
    openRun({ caseId, runtimeKind: "claude_agent_sdk", model: await pickModel("claude_agent_sdk", ["haiku"]), llmConfig: null, files });

  // ---------------------------------------------------------------------------------------------- long cases ---

  it.runIf(READY.claude).concurrent("LCL-LONG-CLAUDE-FG: a foreground command longer than 10 minutes returns its own output (AC-001)", async () => {
    await withEvidence("LCL-LONG-CLAUDE-FG", async (evidence) => {
      const run = await claudeRun("LCL-LONG-CLAUDE-FG");
      const from = run.send(["Use the Bash tool in the foreground (do not set run_in_background and do not set a timeout) to run exactly:",
        `bash long-job.sh ${FOREGROUND_SECONDS} fg`, "Then reply with the last line of its output and end your turn."].join("\n"));
      const end = await run.until(() => run.turnEnd(from), "turn end", (FOREGROUND_SECONDS + 600) * 1000);
      const start = run.toolStarts().find((f) => f.payload.tool_name === "Bash" && argsText(f).includes("long-job.sh"));
      const result = start && run.frames.find((f) => f.type !== "TOOL_EXECUTION_STARTED" && f.type.startsWith("TOOL_EXECUTION_")
        && f.payload.invocation_id === start.payload.invocation_id);
      Object.assign(evidence, { turnEnd: end.type, bashArgs: start ? toolArgs(start) : null, toolResultType: result?.type ?? null,
        toolResultMs: start && result ? result.at - start.at : null, done: run.jobFile("fg", "done"), ...digest(run) });
      expect(end.type).toBe("TURN_COMPLETED");
      expect(start, "the Bash call").toBeDefined();
      expect(toolArgs(start!).run_in_background ?? false).toBe(false);
      expect(toolArgs(start!).timeout ?? null).toBeNull();
      expect(result?.type).toBe("TOOL_EXECUTION_SUCCEEDED");
      expect(resultText(result!)).toContain("LONG_JOB_DONE fg");
      expect(result!.at - start!.at).toBeGreaterThanOrEqual(FOREGROUND_SECONDS * 1000);
      expect(resultText(result!)).not.toMatch(/moved to the background/i);
      expect(run.tasks(), "never moved to the background (no background task)").toEqual([]);
      expect(run.jobFile("fg", "done")).toMatch(/finished after/);
      run.close();
    });
  }, (FOREGROUND_SECONDS + 900) * 1000);

  it.runIf(READY.claude).concurrent("LCL-LONG-CLAUDE-BG: a background command longer than 30 minutes completes (AC-002)", async () => {
    await withEvidence("LCL-LONG-CLAUDE-BG", async (evidence) => {
      const run = await claudeRun("LCL-LONG-CLAUDE-BG");
      const from = run.send(["Use the Bash tool with run_in_background set to true (do not set a timeout) to run exactly:",
        `bash long-job.sh ${LONG_SECONDS} bg`, "Do not wait for it and do not check it. Reply only STARTED and end your turn.",
        "When you are later told that it finished, reply with its exit code."].join("\n"));
      await run.until(() => run.turnEnd(from), "first turn", STEP_MS);
      const watched = await watchJob(run, "bg", LONG_CASE_MS);
      const ended = await run.until(() => run.tasks().find((task) => task.status !== "running" && task.summary !== null), "ended task", 120_000);
      const finalView = watched.samples.at(-1)!.view;
      Object.assign(evidence, { watched, ended, ...digest(run) });
      expect(run.jobFile("bg", "done")).toMatch(/finished after/);
      expect(run.jobFile("bg", "killed")).toBeNull();
      if (LONG_SECONDS > THIRTY_MINUTES_S) expect(watched.aliveAfter30Min, "alive past 30 minutes").toBe(true);
      expect(ended).toMatchObject({ kind: "shell", status: "completed", end_reason: null, exit_code: 0 });
      expect(run.tasks().some((task) => task.status === "stopped")).toBe(false);
      expect(finalView.currentTasks).toContainEqual(expect.objectContaining({ status: "completed", endReason: null, exitCode: 0 }));
      run.close();
    });
  }, LONG_CASE_MS);

  it.runIf(READY.claude).concurrent("LCL-LONG-CLAUDE-TL: a background command past its explicit timeout is stopped at its time limit (AC-005)", async () => {
    await withEvidence("LCL-LONG-CLAUDE-TL", async (evidence) => {
      const run = await claudeRun("LCL-LONG-CLAUDE-TL");
      const from = run.send(["Use the Bash tool with run_in_background set to true and timeout set to 300000 to run exactly:",
        `bash long-job.sh ${TIME_LIMIT_JOB_SECONDS} tl`, "Do not wait for it and do not check it. Reply only STARTED and end your turn."].join("\n"));
      await run.until(() => run.turnEnd(from), "first turn", STEP_MS);
      const start = run.toolStarts().find((f) => f.payload.tool_name === "Bash" && argsText(f).includes("long-job.sh"));
      const stopped = await run.until(() => run.tasks().find((task) => task.status !== "running" && task.end_reason !== null),
        "ended task with a reason", (TIME_LIMIT_JOB_SECONDS + 300) * 1000).catch(() => null);
      await wait(5_000);
      const finalView = await run.view();
      const last = run.tasks().at(-1);
      Object.assign(evidence, { bashArgs: start ? toolArgs(start) : null, stopped, last, finalView, killed: run.jobFile("tl", "killed"),
        done: run.jobFile("tl", "done"), ...digest(run) });
      expect(toolArgs(start!).timeout).toBe(300000);
      expect(last).toMatchObject({ status: "stopped", end_reason: "time_limit", exit_code: null });
      expect(String(last!.summary)).toMatch(/background time limit/);
      expect(last!.at - start!.at).toBeLessThan((TIME_LIMIT_JOB_SECONDS - 60) * 1000);
      expect(finalView.currentTasks).toContainEqual(expect.objectContaining({ status: "stopped", endReason: "time_limit" }));
      run.close();
    });
  }, (TIME_LIMIT_JOB_SECONDS + 900) * 1000);

  it.runIf(READY.claude).concurrent("LCL-LONG-CLAUDE-HABIT: asked to run a ~12-minute suite, the agent starts it once and acts on its end (AC-012)", async () => {
    await withEvidence("LCL-LONG-CLAUDE-HABIT", async (evidence) => {
      const suite = `#!/bin/bash\nbash long-job.sh ${HABIT_SECONDS} suite > /dev/null\necho "ALL 42 TESTS PASSED"\n`;
      const run = await claudeRun("LCL-LONG-CLAUDE-HABIT", { "run-tests.sh": suite });
      const from = run.send(`Run the project's test suite with \`bash run-tests.sh\` (it takes about ${Math.round(HABIT_SECONDS / 60)} minutes) and tell me whether it passed.`);
      await run.until(() => run.jobFile("suite", "done"), "the suite's end", (HABIT_SECONDS + 600) * 1000);
      const doneAt = Date.now() - run.t0;
      await run.until(() => run.frames.find((f) => f.at >= doneAt - 5_000 && f.type === "TURN_COMPLETED")
        ?? (run.turnEnd(from)?.at ?? 0) >= doneAt - 5_000, "the turn that reports the suite", 600_000);
      const reported = run.frames.slice(from).filter((f) => f.type === "SEGMENT_CONTENT").map((f) => String(f.payload.delta ?? "")).join("");
      await wait(10_000);
      const bashCalls = run.toolStarts().filter((f) => f.payload.tool_name === "Bash");
      const suiteStarts = bashCalls.filter((f) => /run-tests\.sh/.test(String(toolArgs(f).command ?? "")));
      const sleepCalls = bashCalls.filter((f) => /\bsleep\b/.test(String(toolArgs(f).command ?? "")));
      Object.assign(evidence, { reported: reported.slice(-500), bashCalls: bashCalls.map((f) => ({ at: f.at, args: toolArgs(f) })),
        suiteStarts: suiteStarts.length, sleepCalls: sleepCalls.length, otherTools: run.toolStarts().filter((f) => f.payload.tool_name !== "Bash")
          .map((f) => ({ at: f.at, tool: f.payload.tool_name, args: toolArgs(f) })), ...digest(run) });
      expect(suiteStarts, "the suite was started once").toHaveLength(1);
      expect(sleepCalls, "no sleep loops").toHaveLength(0);
      expect(reported).toMatch(/pass/i);
      run.close();
    });
  }, (HABIT_SECONDS + 1200) * 1000);

  it.runIf(READY.codex).concurrent("LCL-LONG-CODEX-BG: a Codex command running past its turn for more than 30 minutes is not stopped (AC-002, REQ-008)", async () => {
    await withEvidence("LCL-LONG-CODEX-BG", async (evidence) => {
      const model = await pickModel("codex_app_server", [CODEX_MODEL]);
      const run = await openRun({ caseId: "LCL-LONG-CODEX-BG", runtimeKind: "codex_app_server", model, llmConfig: { reasoning_effort: "medium" } });
      const from = run.send(["Use exec_command to start exactly this command, with yield_time_ms 2000:", `bash long-job.sh ${LONG_SECONDS} codex`,
        "Do not wait for it: do not call write_stdin and do not check it. Reply only STARTED and end your turn."].join("\n"));
      const end = await run.until(() => run.turnEnd(from), "first turn", STEP_MS);
      // A turn that ended otherwise (a provider refusal, a usage limit) fails here with its own message.
      expect(end.type, JSON.stringify(end.payload).slice(0, 600)).toBe("TURN_COMPLETED");
      const watched = await watchJob(run, "codex", LONG_CASE_MS);
      Object.assign(evidence, { model, firstTurnEnd: end.type, watched, ...digest(run) });
      expect(end.type).toBe("TURN_COMPLETED");
      expect(run.jobFile("codex", "done")).toMatch(/finished after/);
      // The panel's polled snapshot row (what the Codex view shows): completed with exit code 0.
      expect(watched.samples.at(-1)!.view).toMatchObject({ __typename: "AgentBackgroundTaskSnapshot" });
      expect(watched.samples.at(-1)!.view.tasks).toContainEqual(expect.objectContaining({ status: "completed", exitCode: 0 }));
      expect(run.jobFile("codex", "killed")).toBeNull();
      if (LONG_SECONDS > THIRTY_MINUTES_S) expect(watched.aliveAfter30Min, "alive past 30 minutes").toBe(true);
      run.close();
    });
  }, LONG_CASE_MS);

  it.runIf(READY.grok).concurrent("LCL-LONG-GROK-BG: a Grok background command longer than 30 minutes is not stopped (AC-002, REQ-008)", async () => {
    await withEvidence("LCL-LONG-GROK-BG", async (evidence) => {
      const model = await pickModel("grok_build", [process.env.GROK_E2E_MODEL?.trim() || "grok-4.7"]);
      const run = await openRun({ caseId: "LCL-LONG-GROK-BG", runtimeKind: "grok_build", model, llmConfig: { reasoning_effort: "low" } });
      const from = run.send(["Use run_terminal_command with block_until_ms 0 to start exactly:", `bash long-job.sh ${LONG_SECONDS} grok`,
        "Do not wait for it and do not check it. Reply only STARTED and end your turn.",
        "When you are later told that it finished, reply with its last output line."].join("\n"));
      const end = await run.until(() => run.turnEnd(from), "first turn", STEP_MS);
      // A turn that ended otherwise (a provider refusal, a usage limit) fails here with its own message.
      expect(end.type, JSON.stringify(end.payload).slice(0, 600)).toBe("TURN_COMPLETED");
      const watched = await watchJob(run, "grok", LONG_CASE_MS);
      await wait(60_000);
      Object.assign(evidence, { model, firstTurnEnd: end.type, watched, ...digest(run) });
      expect(end.type).toBe("TURN_COMPLETED");
      expect(run.jobFile("grok", "done")).toMatch(/finished after/);
      expect(run.jobFile("grok", "killed")).toBeNull();
      if (LONG_SECONDS > THIRTY_MINUTES_S) expect(watched.aliveAfter30Min, "alive past 30 minutes").toBe(true);
      run.close();
    });
  }, LONG_CASE_MS);

  it.runIf(READY.agy).concurrent("LCL-LONG-AGY-DAEMON: an Antigravity daemon longer than 30 minutes completes with exit code 0 (AC-002, REQ-008)", async () => {
    await withEvidence("LCL-LONG-AGY-DAEMON", async (evidence) => {
      const run = await openRun({ caseId: "LCL-LONG-AGY-DAEMON", runtimeKind: "antigravity_cli", model: "gemini-3.8-flash-high", llmConfig: {} });
      const from = run.send("Using your run_command tool, start exactly this command as a long-running background daemon (IsDaemon true) "
        + `in the project directory: \`bash long-job.sh ${LONG_SECONDS} agyd\`. Do not wait for it and do not check it. Immediately reply STARTED and end your turn.`);
      const end = await run.until(() => run.turnEnd(from), "first turn", STEP_MS);
      // A turn that ended otherwise (a provider refusal, a usage limit) fails here with its own message.
      expect(end.type, JSON.stringify(end.payload).slice(0, 600)).toBe("TURN_COMPLETED");
      const watched = await watchJob(run, "agyd", LONG_CASE_MS);
      const ended = await run.until(() => run.tasks().find((task) => task.status !== "running"), "ended task", 120_000).catch(() => null);
      Object.assign(evidence, { firstTurnEnd: end.type, watched, ended, ...digest(run) });
      expect(end.type).toBe("TURN_COMPLETED");
      expect(run.jobFile("agyd", "done")).toMatch(/finished after/);
      expect(run.jobFile("agyd", "killed")).toBeNull();
      if (LONG_SECONDS > THIRTY_MINUTES_S) expect(watched.aliveAfter30Min, "alive past 30 minutes").toBe(true);
      expect(ended).toMatchObject({ kind: "shell", status: "completed", end_reason: null, exit_code: 0 });
      // The AGY view lists running tasks only (its monitor drops an ended step); the open panel shows the stream's end.
      evidence.finalViewAfterEnd = watched.samples.at(-1)!.view;
      run.close();
    });
  }, LONG_CASE_MS);

  it.runIf(READY.agy).concurrent("LCL-LONG-AGY-BG: an Antigravity command past WaitMsBeforeAsync for more than 30 minutes is not stopped (REQ-008)", async () => {
    await withEvidence("LCL-LONG-AGY-BG", async (evidence) => {
      const run = await openRun({ caseId: "LCL-LONG-AGY-BG", runtimeKind: "antigravity_cli", model: "gemini-3.8-flash-high", llmConfig: {} });
      const from = run.send(`Use run_command to run \`bash long-job.sh ${LONG_SECONDS} agyb\` with WaitMsBeforeAsync 5000 (it is NOT a daemon; `
        + "leave IsDaemon false). Do not check its status in between. When it has finished, reply with its last output line.");
      const watched = await watchJob(run, "agyb", LONG_CASE_MS);
      const end = await run.until(() => run.turnEnd(from), "turn end", 600_000).catch(() => null);
      Object.assign(evidence, { turnEnd: end?.type ?? null, watched, ...digest(run) });
      expect(run.jobFile("agyb", "done")).toMatch(/finished after/);
      expect(run.jobFile("agyb", "killed")).toBeNull();
      if (LONG_SECONDS > THIRTY_MINUTES_S) expect(watched.aliveAfter30Min, "alive past 30 minutes").toBe(true);
      run.close();
    });
  }, LONG_CASE_MS);

  it.runIf(ENABLED).concurrent("LCL-LONG-NATIVE-BG: a native background command longer than 30 minutes completes with exit code 0 (AC-002, REQ-008)", async (context: TestContext) => {
    await requireLiveCapability(context, "provider.openai.api-key");
    await withEvidence("LCL-LONG-NATIVE-BG", async (evidence) => {
      const model = await nativeModel("OPENAI", "gpt-5.4-mini");
      const run = await openRun({ caseId: "LCL-LONG-NATIVE-BG", runtimeKind: "autobyteus", model, llmConfig: null, definition: "native" });
      const from = run.send([`Start \`bash long-job.sh ${LONG_SECONDS} native\` with run_bash and run_in_background set to true.`,
        "Do not wait for it and do not check it. Reply only STARTED and end your turn.",
        "When you are later told that it finished, reply with its exit code."].join(" "));
      const end = await run.until(() => run.turnEnd(from), "first turn", STEP_MS);
      // A turn that ended otherwise (a provider refusal, a usage limit) fails here with its own message.
      expect(end.type, JSON.stringify(end.payload).slice(0, 600)).toBe("TURN_COMPLETED");
      const watched = await watchJob(run, "native", LONG_CASE_MS);
      const ended = await run.until(() => run.tasks().find((task) => task.status !== "running"), "ended task", 120_000).catch(() => null);
      const notice = await run.until(() => run.frames.find((f) => f.type === "SYSTEM_TASK_NOTIFICATION"), "notice", 120_000).catch(() => null);
      Object.assign(evidence, { model, firstTurnEnd: end.type, watched, ended, notice: notice?.payload ?? null, ...digest(run) });
      expect(end.type).toBe("TURN_COMPLETED");
      expect(run.jobFile("native", "done")).toMatch(/finished after/);
      expect(run.jobFile("native", "killed")).toBeNull();
      if (LONG_SECONDS > THIRTY_MINUTES_S) expect(watched.aliveAfter30Min, "alive past 30 minutes").toBe(true);
      expect(ended).toMatchObject({ kind: "shell", status: "completed", summary: null, end_reason: null, exit_code: 0 });
      expect(String(notice?.payload.content ?? "")).toMatch(/exit code 0/);
      run.close();
    });
  }, LONG_CASE_MS);

  // ------------------------------------------------------------------------------------------ environment cases ---

  /** Asks the Claude agent to print both variables as its Bash tool sees them; returns the tool result text. */
  const echoLimits = async (run: Run): Promise<string> => {
    const from = run.send("Use the Bash tool to run exactly: echo \"MAX=$BASH_MAX_TIMEOUT_MS DEFAULT=$BASH_DEFAULT_TIMEOUT_MS\"\n"
      + "Then reply with its output and end your turn.");
    await run.until(() => run.turnEnd(from), "turn end", STEP_MS);
    const start = run.toolStarts().find((f) => f.payload.tool_name === "Bash" && argsText(f).includes("BASH_MAX_TIMEOUT_MS"));
    const result = start && run.frames.find((f) => f.type === "TOOL_EXECUTION_SUCCEEDED" && f.payload.invocation_id === start.payload.invocation_id);
    expect(result, "the echo's tool result").toBeDefined();
    return resultText(result!);
  };

  it.runIf(READY.claude)("LCL-ENV-DEFAULT: with nothing set, Claude Code sees both limits at 7200000 (REQ-001)", async () => {
    await withEvidence("LCL-ENV-DEFAULT", async (evidence) => {
      expect(process.env.BASH_MAX_TIMEOUT_MS).toBeUndefined();
      expect(process.env.BASH_DEFAULT_TIMEOUT_MS).toBeUndefined();
      const run = await claudeRun("LCL-ENV-DEFAULT");
      const output = await echoLimits(run);
      Object.assign(evidence, { output, ...digest(run) });
      expect(output).toContain("MAX=7200000 DEFAULT=7200000");
      run.close();
    });
  }, 600_000);

  it.runIf(READY.claude)("LCL-ENV-SETTINGS: a Claude Code settings env value is kept; the other is filled in (AC-003, ASM-001)", async () => {
    await withEvidence("LCL-ENV-SETTINGS", async (evidence) => {
      const settings = JSON.stringify({ env: { BASH_MAX_TIMEOUT_MS: "900000" } }, null, 2);
      const run = await claudeRun("LCL-ENV-SETTINGS", { ".claude/settings.json": settings });
      const output = await echoLimits(run);
      Object.assign(evidence, { settingsFile: ".claude/settings.json (run workspace, project setting source)", settings, output, ...digest(run) });
      expect(output).toContain("MAX=900000 DEFAULT=7200000");
      run.close();
    });
  }, 600_000);

  it.runIf(READY.claude)("LCL-ENV-SERVER: a value in the server's environment is kept; the other is filled in (AC-003)", async () => {
    await withEvidence("LCL-ENV-SERVER", async (evidence) => {
      process.env.BASH_MAX_TIMEOUT_MS = "900000";
      try {
        const run = await claudeRun("LCL-ENV-SERVER");
        const output = await echoLimits(run);
        Object.assign(evidence, { serverEnv: { BASH_MAX_TIMEOUT_MS: "900000" }, output, ...digest(run) });
        expect(output).toContain("MAX=900000 DEFAULT=7200000");
        run.close();
      } finally {
        delete process.env.BASH_MAX_TIMEOUT_MS;
      }
    });
  }, 600_000);
});

