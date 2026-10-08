import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { resolveClaudeCliExecutableCandidates } from "../../helpers/claude-cli-executable-candidates.js";
import { useStandaloneClaudeCli } from "../helpers/claude-live-agent-harness.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT } from "../helpers/team-run-graphql-documents.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// A delegated Claude agent starts a background Bash task that outlives its turn by more than the
// old one-minute minimum idle-shutdown delay, ends its turn, and is still live when the task
// completes: the CLI starts a turn with the completion and the agent reports to its delegator.
// Opt-in; uses the local Claude login. Optional CLAUDE_E2E_TOOL_MODEL (default haiku) and
// DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR (keeps a JSON receipt).
// Run: RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts --no-watch
const cliCandidates = resolveClaudeCliExecutableCandidates();
const suite = process.env.RUN_CLAUDE_E2E === "1" && cliCandidates.length > 0 ? describe : describe.skip;
const MODEL = process.env.CLAUDE_E2E_TOOL_MODEL?.trim() || "haiku";
/** Longer than the old minimum idle-shutdown delay (60 s). */
const BACKGROUND_SLEEP_SECONDS = 90;
const OLD_MINIMUM_GRACE_MS = 60_000;
type Wire = { type: string; payload: Record<string, unknown>; receivedAt: number };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const COORDINATOR_INSTRUCTIONS = [
  "You are the coordinator in a live delegation test.",
  "1. When the user asks you to call a tool with exact JSON arguments, call exactly that tool exactly once with exactly those arguments, then reply with the single word DONE.",
  "2. When you receive a message from another agent, do not call any tool; reply with the single word NOTED.",
  "3. Never call a tool unless the current user message gives exact JSON arguments for it. Do not explore the environment.",
].join("\n");
const WORKER_INSTRUCTIONS = [
  "You are a delegated worker in a live delegation test.",
  "Follow the instructions of your delegated task exactly. send_message_to is your collaboration tool.",
  "Do not explore the environment or run diagnostics. Keep text replies to one word.",
].join("\n");

suite("Delegated Claude agent background task outlives the old idle-shutdown delay (live E2E)", () => {
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
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-delegated-background-live-"));
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

  it("AC-001: the copy stays live, its background task completes, and it reports to its delegator", async () => {
    const unique = randomUUID().slice(0, 8);
    const workspaceRootPath = await fs.mkdtemp(path.join(appDataDir, "workspace-"));
    const markerPath = path.join(workspaceRootPath, `background-marker-${unique}.txt`);
    const reportToken = `BACKGROUND_DONE_${unique}`;
    const createAgent = async (name: string, instructions: string, toolNames: string[]) => {
      const id = (await graphql<{ createAgentDefinition: { id: string } }>(
        "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
        { input: { name: `${name}-${unique}`, role: "assistant", description: `Claude ${name}`, instructions, toolNames, category: "runtime-e2e" } },
      )).createAgentDefinition.id;
      agentDefinitionIds.push(id);
      return id;
    };
    const coordinatorDefinitionId = await createAgent("coordinator", COORDINATOR_INSTRUCTIONS, ["delegate_task", "send_message_to"]);
    const workerDefinitionId = await createAgent("worker", WORKER_INSTRUCTIONS, ["send_message_to"]);
    const teamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `claude-delegated-background-${unique}`, description: "Delegated background task lifetime",
        instructions: "Members follow their own instructions exactly.", coordinatorMemberName: "coordinator",
        nodes: [
          { memberName: "coordinator", ref: coordinatorDefinitionId, refScope: "SHARED" },
          { memberName: "worker", ref: workerDefinitionId, refScope: "SHARED" },
        ] } },
    )).createAgentTeamDefinition.id;
    teamDefinitionIds.push(teamDefinitionId);
    const memberConfig = (memberAddress: string, agentDefinitionId: string) => ({ memberAddress, agentDefinitionId,
      llmModelIdentifier: MODEL, autoExecuteTools: true, runtimeKind: "claude_agent_sdk", workspaceRootPath });
    const created = (await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId,
        teamConfigs: [{ teamAddress: "/", llmModelIdentifier: MODEL, autoExecuteTools: true,
          runtimeKind: "claude_agent_sdk", workspaceRootPath }],
        memberConfigs: [memberConfig("/coordinator", coordinatorDefinitionId), memberConfig("/worker", workerDefinitionId)] } },
    )).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId!;
    teamRunIds.push(teamRunId);
    const members = flattenE2eConfiguredAgentExecutions((await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId })).getTeamRunResumeConfig.executionTree);
    const coordinatorRunId = members.find((member) => member.memberName === "coordinator")!.agentRunId;
    expect(coordinatorRunId).toBeTruthy();

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
    const until = async <T>(probe: () => T | undefined, label: string, ms = 240_000): Promise<T> => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) { const value = probe(); if (value !== undefined) return value; await wait(250); }
      throw new Error(`Timed out waiting for ${label}; seen ${messages.slice(-30).map((m) => `${m.type}:${JSON.stringify(m.payload).slice(0, 160)}`).join(" | ")}`);
    };

    // The coordinator delegates; the delegated copy starts the background task and ends its turn.
    const delegation = {
      recipient_address: "/worker",
      description: [
        `Step 1: use the Bash tool with run_in_background set to true to run exactly: sleep ${BACKGROUND_SLEEP_SECONDS} && echo done > ${markerPath}`,
        "Do not wait for it and do not check on it. Reply only STARTED and end your turn.",
        "Step 2: later you will be notified that the background task completed. Only then call send_message_to exactly once with these exact JSON arguments: " +
          `${JSON.stringify({ recipient_address: "/coordinator", content: reportToken })}. Then reply with the single word DONE.`,
      ].join("\n"),
    };
    sendE2eSendMessageCommand(socket, { agent_run_id: coordinatorRunId,
      content: `Call delegate_task exactly once now with these exact JSON arguments: ${JSON.stringify(delegation)}. Do not call any other tool.` });
    const started = await until(() => messages.find((m) => m.type === "TASK_EXECUTION_STARTED" &&
      asRecord(m.payload.execution)?.delegator_agent_run_id === coordinatorRunId), "TASK_EXECUTION_STARTED");
    const childRunId = String(asRecord(started.payload.execution)!.agent_run_id);
    const childTasks = () => messages.filter((m) => m.type === "BACKGROUND_TASK_UPDATED" && m.payload.agent_run_id === childRunId);
    const childStatuses = () => messages.filter((m) => m.type === "AGENT_STATUS" && m.payload.agent_run_id === childRunId);
    const running = await until(() => childTasks().find((m) => m.payload.status === "running"), "delegated copy running background task");
    const taskId = String(running.payload.task_id);
    const idle = await until(() => childStatuses().find((m) => m.receivedAt >= running.receivedAt && m.payload.status === "idle"),
      "delegated copy idle after ending its turn");

    // Either the report arrives (expected) or the copy is shut down / its task stopped (the old behavior).
    const outcome = await until(() => messages.find((m) => {
      if (m.receivedAt < idle.receivedAt) return false;
      if (m.type === "AGENT_STATUS" && m.payload.agent_run_id === childRunId && m.payload.status === "offline") return true;
      if (m.type === "BACKGROUND_TASK_UPDATED" && m.payload.task_id === taskId && m.payload.status === "stopped") return true;
      const projected = asRecord(m.payload.message);
      return m.type === "TEAM_COMMUNICATION_MESSAGE" && projected?.sender_agent_run_id === childRunId &&
        projected.receiver_agent_run_id === coordinatorRunId && String(projected.content ?? "").includes(reportToken);
    }), "report, shutdown or stopped task", (BACKGROUND_SLEEP_SECONDS + 150) * 1_000);

    const markerContent = await fs.readFile(markerPath, "utf8").catch(() => null);
    const evidence = {
      childRunId, taskId, outcome: outcome.type, outcomeStatus: outcome.payload.status ?? null,
      idleToOutcomeMs: outcome.receivedAt - idle.receivedAt,
      statuses: childStatuses().map((m) => `${String(m.payload.status)}@${m.receivedAt - idle.receivedAt}`),
      backgroundTask: childTasks().map((m) => `${String(m.payload.status)}@${m.receivedAt - idle.receivedAt}`),
      markerContent,
    };
    console.log("[AC-001 delegated background task]", JSON.stringify(evidence));
    if (process.env.DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR) {
      await fs.mkdir(process.env.DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR, { recursive: true });
      await fs.writeFile(path.join(process.env.DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR, `ac-001-${unique}.json`), JSON.stringify(evidence, null, 2));
    }

    expect(outcome.type, `copy was shut down or its task stopped: ${JSON.stringify(evidence)}`).toBe("TEAM_COMMUNICATION_MESSAGE");
    expect(evidence.idleToOutcomeMs).toBeGreaterThanOrEqual(OLD_MINIMUM_GRACE_MS);
    expect(childStatuses().filter((m) => m.payload.status === "offline")).toEqual([]);
    expect(childTasks().some((m) => m.payload.task_id === taskId && m.payload.status === "completed")).toBe(true);
    expect(childTasks().some((m) => m.payload.status === "stopped")).toBe(false);
    expect(markerContent?.trim()).toBe("done");
  }, 600_000);
});
