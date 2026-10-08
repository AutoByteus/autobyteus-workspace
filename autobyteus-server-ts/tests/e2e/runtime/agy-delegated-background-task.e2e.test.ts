import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY } from "../../../src/config/task-execution-idle-shutdown-setting.js";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";
import { useStandaloneClaudeCli } from "../helpers/claude-live-agent-harness.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT } from "../helpers/team-run-graphql-documents.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// A delegated AGY agent (Team root, Claude coordinator) starts a background daemon step and ends its turn
// (idle-shutdown-background-tasks SR-003: BEH-002/BEH-003, AC-002, AC-004). The grace period is set to 60 s.
// The daemon (`sleep 180; echo … > daemon-exit.txt`) outlives two grace periods. While it runs the copy is not
// idle-shut-down: the copy never goes `offline`, keeps its AGY process, and a later message is answered by that same
// process. When the daemon exits on its own, AGY's exit message finishes the background task and, with no following
// turn, the copy is shut down one grace period later. (A daemon killed from outside gets no exit message from AGY 1.3.1,
// so this test lets it exit by itself, as agy-background-task-updates-live.e2e.test.ts does.)
// Opt-in; uses the local `agy` and `claude` logins; about 6 minutes.
// Optional AGY_E2E_MODEL (default gemini-3.8-flash-high), CLAUDE_E2E_TOOL_MODEL (default haiku) and
// DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR (keeps a JSON receipt).
// Run: RUN_AGY_BACKGROUND_E2E=1 RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts --no-watch
const cliCandidates = resolveClaudeCliExecutableCandidates();
const agyReady = spawnSync("agy", ["--version"], { stdio: "ignore" }).status === 0;
const suite = process.env.RUN_AGY_BACKGROUND_E2E === "1" && process.env.RUN_CLAUDE_E2E === "1" && agyReady
  && cliCandidates.length > 0 ? describe : describe.skip;
const AGY_MODEL = process.env.AGY_E2E_MODEL?.trim() || "gemini-3.8-flash-high";
const CLAUDE_MODEL = process.env.CLAUDE_E2E_TOOL_MODEL?.trim() || "haiku";
const GRACE_MS = 60_000;
/** Longer than the grace period: earlier releases stopped AGY and its daemon by then. */
const QUIET_MS = 75_000;
const DAEMON_SECONDS = 180;
/** A shutdown one grace period after its trigger, allowing for the monitor's 2 s poll and the serialized queue. */
const SHUTDOWN_WINDOW = { min: GRACE_MS - 2_000, max: GRACE_MS + 15_000 };
type Wire = { type: string; payload: Record<string, unknown>; receivedAt: number };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
/** pids of live processes named `agy` whose working directory belongs to the agent run. */
const agyPidsOf = (agentRunId: string): string[] => spawnSync("pgrep", ["-x", "agy"], { encoding: "utf8" }).stdout.trim().split("\n")
  .filter(Boolean).filter((pid) => spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout.includes(agentRunId));

const COORDINATOR_INSTRUCTIONS = [
  "You are the coordinator in a live delegation test.",
  "1. When the user asks you to call a tool with exact JSON arguments, call exactly that tool exactly once with exactly those arguments, then reply with the single word DONE.",
  "2. When you receive a message from another agent, do not call any tool; reply with the single word NOTED.",
  "3. Never call a tool unless the current user message gives exact JSON arguments for it. Do not explore the environment.",
].join("\n");
const WORKER_INSTRUCTIONS = "You are a delegated worker in a live delegation test. Follow the steps you are given exactly with your run_command tool. Keep text replies to one word.";

suite("Delegated AGY agent with a background daemon under idle shutdown (live E2E)", () => {
  let appDataDir = "";
  let app: FastifyInstance;
  let url: URL;
  const agentDefinitionIds: string[] = [];
  const teamDefinitionIds: string[] = [];
  const teamRunIds: string[] = [];
  const sockets: WebSocket[] = [];
  const graphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const terminateTeam = async (teamRunId: string) => (await graphql<{ terminateAgentTeamRun: { success: boolean } }>(
    "mutation($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }", { teamRunId })).terminateAgentTeamRun.success;

  beforeAll(async () => {
    useStandaloneClaudeCli(cliCandidates[0]!);
    vi.stubEnv(TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_SETTING_KEY, String(GRACE_MS));
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-delegated-background-live-"));
    await fs.writeFile(path.join(appDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(appDataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    url = started.mainUrl;
  });
  afterAll(async () => {
    for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.close();
    if (url) {
      for (const id of teamRunIds) await terminateTeam(id).catch(() => undefined);
      for (const id of teamDefinitionIds) await graphql("mutation($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }", { id }).catch(() => undefined);
      for (const id of agentDefinitionIds) await graphql("mutation($id: String!) { deleteAgentDefinition(id: $id) { success } }", { id }).catch(() => undefined);
    }
    if (app) await app.close();
    if (appDataDir) await fs.rm(appDataDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("AC-002/AC-004: the copy outlives the grace period while its daemon runs, then is shut down one grace period after the daemon exits", async () => {
    const unique = randomUUID().slice(0, 8);
    const workspaceRootPath = await fs.mkdtemp(path.join(appDataDir, "workspace-"));
    const createAgent = async (name: string, instructions: string, toolNames: string[]) => {
      const id = (await graphql<{ createAgentDefinition: { id: string } }>(
        "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
        { input: { name: `${name}-${unique}`, role: "assistant", description: `AGY delegation ${name}`, instructions, toolNames, category: "runtime-e2e" } },
      )).createAgentDefinition.id;
      agentDefinitionIds.push(id);
      return id;
    };
    const coordinatorDefinitionId = await createAgent("coordinator", COORDINATOR_INSTRUCTIONS, ["delegate_task", "send_message_to"]);
    const workerDefinitionId = await createAgent("worker", WORKER_INSTRUCTIONS, []);
    const teamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `agy-delegated-background-${unique}`, description: "Delegated AGY background lifetime",
        instructions: "Members follow their own instructions exactly.", coordinatorMemberName: "coordinator",
        nodes: [
          { memberName: "coordinator", ref: coordinatorDefinitionId, refScope: "SHARED" },
          { memberName: "worker", ref: workerDefinitionId, refScope: "SHARED" },
        ] } },
    )).createAgentTeamDefinition.id;
    teamDefinitionIds.push(teamDefinitionId);
    const claude = { llmModelIdentifier: CLAUDE_MODEL, autoExecuteTools: true, runtimeKind: "claude_agent_sdk", workspaceRootPath };
    const agy = { llmModelIdentifier: AGY_MODEL, llmConfig: {}, autoExecuteTools: true, runtimeKind: "antigravity_cli", workspaceRootPath };
    const created = (await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...claude }],
        memberConfigs: [{ memberAddress: "/coordinator", agentDefinitionId: coordinatorDefinitionId, ...claude },
          { memberAddress: "/worker", agentDefinitionId: workerDefinitionId, ...agy }] } },
    )).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId!;
    teamRunIds.push(teamRunId);
    const members = flattenE2eConfiguredAgentExecutions((await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId })).getTeamRunResumeConfig.executionTree);
    const coordinatorRunId = members.find((member) => member.memberName === "coordinator")!.agentRunId;

    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${teamRunId}`);
    sockets.push(socket);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type, payload: asRecord(parsed.payload) ?? {}, receivedAt: Date.now() });
      } catch { /* Ignore malformed rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const until = async <T>(probe: () => T | undefined, label: string, ms = 300_000): Promise<T> => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) { const value = probe(); if (value !== undefined) return value; await wait(250); }
      throw new Error(`Timed out waiting for ${label}; seen ${messages.slice(-30).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 160)}`).join(" | ")}`);
    };

    const delegation = {
      recipient_address: "/worker",
      description: "Using your run_command tool, start exactly this command as a long-running background daemon (IsDaemon true) "
        + `in the project directory: \`sleep ${DAEMON_SECONDS}; echo DAEMON_EXITED > daemon-exit.txt\`. `
        + "Do not wait for it and do not check it. Immediately reply STARTED and end your turn.",
    };
    sendE2eSendMessageCommand(socket, { agent_run_id: coordinatorRunId,
      content: `Call delegate_task exactly once now with these exact JSON arguments: ${JSON.stringify(delegation)}. Do not call any other tool.` });
    const started = await until(() => messages.find((m) => m.type === "TASK_EXECUTION_STARTED" &&
      asRecord(m.payload.execution)?.delegator_agent_run_id === coordinatorRunId), "TASK_EXECUTION_STARTED");
    const childRunId = String(asRecord(started.payload.execution)!.agent_run_id);
    const childTasks = () => messages.filter((m) => m.type === "BACKGROUND_TASK_UPDATED" && m.payload.agent_run_id === childRunId);
    const childStatuses = () => messages.filter((m) => m.type === "AGENT_STATUS" && m.payload.agent_run_id === childRunId);
    const running = await until(() => childTasks().find((m) => m.payload.status === "running"), "delegated AGY copy's running background task");
    const taskId = String(running.payload.task_id);
    const idle = await until(() => childStatuses().find((m) => m.receivedAt >= running.receivedAt && m.payload.status === "idle"),
      "delegated AGY copy idle after ending its turn");
    const pidsBefore = agyPidsOf(childRunId);
    expect(pidsBefore, "the copy's live AGY process").toHaveLength(1);

    // The grace period elapses while the daemon runs: earlier releases stopped AGY and the daemon here.
    await wait(Math.max(0, idle.receivedAt + QUIET_MS - Date.now()));
    const taskRunningAfterQuiet = !childTasks().some((m) => m.payload.task_id === taskId && m.payload.status !== "running");
    const pidsAfterQuiet = agyPidsOf(childRunId);
    const offlineWhileRunning = childStatuses().filter((m) => m.payload.status === "offline");
    const stoppedWhileRunning = childTasks().filter((m) => m.payload.status !== "running");

    // A later message reaches the same live AGY run (its turn ends idle again; the daemon still runs).
    const followUpFrom = messages.length;
    sendE2eSendMessageCommand(socket, { agent_run_id: childRunId, content: "Reply with only the word ALIVE. Do not use any tool." });
    const followUpIdle = await until(() => messages.slice(followUpFrom).find((m) => m.type === "AGENT_STATUS" && m.payload.agent_run_id === childRunId
      && m.payload.status === "idle"), "follow-up turn finished", 180_000);
    const replyText = messages.slice(followUpFrom).filter((m) => m.type === "SEGMENT_CONTENT" && m.payload.agent_run_id === childRunId)
      .map((m) => String(m.payload.delta ?? "")).join("");
    const pidsAfterFollowUp = agyPidsOf(childRunId);
    // The daemon exits by itself; AGY records the exit, the task ends with no following turn, and the copy is
    // released one grace period later. The follow-up's own grace period elapses before that exit.
    const ended = await until(() => childTasks().find((m) => m.payload.task_id === taskId && m.payload.status !== "running"),
      "background task ended after the daemon exited", DAEMON_SECONDS * 1_000 + 60_000);
    const offlineBeforeTaskEnd = childStatuses().filter((m) => m.payload.status === "offline" && m.receivedAt < ended.receivedAt);
    const offline = await until(() => childStatuses().find((m) => m.payload.status === "offline"), "copy shut down after its task ended", GRACE_MS + 60_000);
    await until(() => agyPidsOf(childRunId).length === 0 ? true : undefined, "copy's AGY process gone", 15_000);

    const evidence: Record<string, unknown> = {
      childRunId, taskId, agyModel: AGY_MODEL, graceMs: GRACE_MS, daemonSeconds: DAEMON_SECONDS,
      statuses: childStatuses().map((m) => `${String(m.payload.status)}@${m.receivedAt - idle.receivedAt}`),
      backgroundTask: childTasks().map((m) => `${String(m.payload.status)}@${m.receivedAt - idle.receivedAt}`),
      taskRunningAfterQuiet, pidsBefore, pidsAfterQuiet, pidsAfterFollowUp, replyText: replyText.slice(0, 200),
      followUpIdleToTaskEndMs: ended.receivedAt - followUpIdle.receivedAt,
      taskEndStatus: ended.payload.status, taskEndSummary: ended.payload.summary ?? null,
      taskEndToOfflineMs: offline.receivedAt - ended.receivedAt, idleToTaskEndMs: ended.receivedAt - idle.receivedAt,
    };
    console.log("[AC-002/AC-004 delegated AGY background daemon]", JSON.stringify(evidence));
    if (process.env.DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR) {
      await fs.mkdir(process.env.DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR, { recursive: true });
      await fs.writeFile(path.join(process.env.DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR, `ac-002-agy-${unique}.json`), JSON.stringify(evidence, null, 2));
    }

    expect(taskRunningAfterQuiet, JSON.stringify(evidence)).toBe(true);
    expect(pidsAfterQuiet).toEqual(pidsBefore);
    expect(offlineWhileRunning, JSON.stringify(evidence)).toEqual([]);
    expect(stoppedWhileRunning, JSON.stringify(evidence)).toEqual([]);
    expect(replyText).toContain("ALIVE");
    expect(pidsAfterFollowUp).toEqual(pidsBefore);
    expect(offlineBeforeTaskEnd, JSON.stringify(evidence)).toEqual([]);
    expect(evidence.followUpIdleToTaskEndMs as number, "the follow-up's grace period elapsed while the daemon ran").toBeGreaterThan(GRACE_MS);
    expect(ended.payload.status).toBe("completed");
    expect(String(ended.payload.summary ?? "")).toMatch(/exited with code 0/u);
    // The daemon ran its full time (AGY reports its own exit, not an early stop).
    expect(evidence.idleToTaskEndMs as number).toBeGreaterThanOrEqual(DAEMON_SECONDS * 1_000 - 15_000);
    expect(evidence.taskEndToOfflineMs as number).toBeGreaterThanOrEqual(SHUTDOWN_WINDOW.min);
    expect(evidence.taskEndToOfflineMs as number).toBeLessThanOrEqual(SHUTDOWN_WINDOW.max);
  }, 900_000);
});
