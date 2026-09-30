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

// A Claude team member's background task reaches only that member's execution on the team stream
// (AC-009), and team terminate marks it stopped (AC-011). Opt-in; uses the local Claude login.
// Run: RUN_CLAUDE_E2E=1 vitest run tests/e2e/runtime/claude-team-member-background-task.e2e.test.ts
const cliCandidates = resolveClaudeCliExecutableCandidates();
const suite = process.env.RUN_CLAUDE_E2E === "1" && cliCandidates.length > 0 ? describe : describe.skip;
type Wire = { type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("Claude team member background tasks (live E2E)", () => {
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
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-team-background-live-"));
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

  it("delivers a member's background task only to that member and marks it stopped on team terminate", async () => {
    const unique = randomUUID();
    const workspaceRootPath = await fs.mkdtemp(path.join(appDataDir, "workspace-"));
    const instructions = "Follow the user's instructions exactly. Keep replies very short. Never message other members unless asked.";
    const createAgent = async (name: string) => {
      const id = (await graphql<{ createAgentDefinition: { id: string } }>(
        "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
        { input: { name: `${name}-${unique}`, role: "assistant", description: `Claude ${name} member`, instructions, toolNames: [] } },
      )).createAgentDefinition.id;
      agentDefinitionIds.push(id);
      return id;
    };
    const workerDefinitionId = await createAgent("worker");
    const peerDefinitionId = await createAgent("peer");
    const teamDefinitionId = (await graphql<{ createAgentTeamDefinition: { id: string } }>(
      "mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
      { input: { name: `claude-background-team-${unique}`, description: "Background-task routing team",
        instructions: "Members act independently.", coordinatorMemberName: "worker",
        nodes: [
          { memberName: "worker", ref: workerDefinitionId, refScope: "SHARED" },
          { memberName: "peer", ref: peerDefinitionId, refScope: "SHARED" },
        ] } },
    )).createAgentTeamDefinition.id;
    teamDefinitionIds.push(teamDefinitionId);
    const memberConfig = (memberAddress: string, agentDefinitionId: string) => ({ memberAddress, agentDefinitionId,
      llmModelIdentifier: "haiku", autoExecuteTools: true, skillAccessMode: "NONE", runtimeKind: "claude_agent_sdk", workspaceRootPath });
    const created = (await graphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      "mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
      { input: { teamDefinitionId,
        teamConfigs: [{ teamAddress: "/", llmModelIdentifier: "haiku", autoExecuteTools: true, skillAccessMode: "NONE",
          runtimeKind: "claude_agent_sdk", workspaceRootPath }],
        memberConfigs: [memberConfig("/worker", workerDefinitionId), memberConfig("/peer", peerDefinitionId)] } },
    )).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId!;
    teamRunIds.push(teamRunId);
    const members = flattenE2eConfiguredAgentExecutions((await graphql<{ getTeamRunResumeConfig: { executionTree: Record<string, unknown> } }>(
      E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId })).getTeamRunResumeConfig.executionTree);
    const workerRunId = members.find((member) => member.memberName === "worker")!.agentRunId;
    const peerRunId = members.find((member) => member.memberName === "peer")!.agentRunId;
    expect(workerRunId).toBeTruthy();
    expect(peerRunId).toBeTruthy();

    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${teamRunId}`);
    sockets.push(socket);
    const messages: Wire[] = [];
    socket.on("message", (raw: unknown) => {
      try {
        const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
        if (typeof parsed.type === "string") messages.push({ type: parsed.type,
          payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload as Record<string, unknown> : {} });
      } catch { /* Ignore malformed rows. */ }
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const until = async <T>(probe: () => T | undefined, label: string, ms = 180_000): Promise<T> => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) { const value = probe(); if (value !== undefined) return value; await wait(250); }
      throw new Error(`Timed out waiting for ${label}; seen ${messages.map((m) => m.type).join(",")}`);
    };
    const tasks = () => messages.filter((m) => m.type === "BACKGROUND_TASK_UPDATED").map((m) => m.payload);
    const taskWith = (status: string, taskId?: string) => () =>
      tasks().find((task) => task["status"] === status && (taskId === undefined || task["task_id"] === taskId));

    sendE2eSendMessageCommand(socket, { agent_run_id: workerRunId, context_file_paths: [], image_urls: [], content: [
      "Use the Bash tool with run_in_background set to true to run exactly: sleep 20; echo WORKER_DONE",
      "Do not wait for it. Reply only STARTED and end your turn.",
    ].join("\n") });
    const running = await until(taskWith("running"), "worker running task");
    expect(running).toMatchObject({ agent_run_id: workerRunId, kind: "shell", summary: null });
    expect(typeof running["change_sequence"]).toBe("number");
    // The terminal frame may arrive before the CLI's summary; the summary follows as another snapshot.
    const completed = await until(() => tasks().find((task) => task["task_id"] === running["task_id"] &&
      task["status"] === "completed" && typeof task["summary"] === "string" && task["summary"] !== ""), "worker completed task with summary", 120_000);
    expect(completed["agent_run_id"]).toBe(workerRunId);

    // A second background task on the same member, then team terminate while it runs.
    sendE2eSendMessageCommand(socket, { agent_run_id: workerRunId, context_file_paths: [], image_urls: [], content: [
      "Use the Bash tool with run_in_background set to true to run exactly: sleep 120; echo WORKER_LONG",
      "Do not wait for it. Reply only STARTED and end your turn.",
    ].join("\n") });
    const longRunning = await until(() => tasks().find((task) => task["status"] === "running" && task["task_id"] !== running["task_id"]),
      "second worker running task");
    await wait(2_000);
    expect(await terminateTeam(teamRunId)).toBe(true);
    const stopped = await until(taskWith("stopped", String(longRunning["task_id"])), "stopped task after team terminate", 10_000);
    expect(stopped["agent_run_id"]).toBe(workerRunId);

    // AC-009: nothing was routed to the other member.
    expect(tasks().every((task) => task["agent_run_id"] === workerRunId)).toBe(true);
    expect(tasks().some((task) => task["agent_run_id"] === peerRunId)).toBe(false);
    expect(messages.some((m) => m.type === "TODO_LIST_UPDATE")).toBe(false);
  }, 480_000);
});
