import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { loadAllAgentTools } from "../../../src/startup/agent-tool-loader.js";

const codexBinaryReady = process.env.RUN_CODEX_E2E === "1" || spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const liveMixedTaskDelegationEnabled =
  process.env.RUN_MIXED_TASK_DELEGATION_E2E === "1" ||
  (process.env.RUN_LMSTUDIO_E2E === "1" && process.env.RUN_CODEX_E2E === "1");
const describeLive = codexBinaryReady && liveMixedTaskDelegationEnabled ? describe : describe.skip;
const originalCodexApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
const originalToolCallFormat = process.env.AUTOBYTEUS_STREAM_PARSER;

type WsMessage = { type: string; payload: Record<string, unknown> };
type TeamMemberMetadata = {
  memberKind?: "agent" | "agent_team";
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  workspaceRootPath: string | null;
  platformAgentRunId: string | null;
  memberTree?: TeamMemberMetadata[];
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseWsMessage = (raw: WebSocket.RawData): WsMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
    if (typeof parsed.type !== "string") return null;
    return {
      type: parsed.type,
      payload: parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
        ? (parsed.payload as Record<string, unknown>)
        : {},
    };
  } catch {
    return null;
  }
};

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => { clearTimeout(timer); resolve(); });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
  });

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 180_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) return match;
    await wait(500);
  }
  const preview = messages.slice(-30).map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 220)}`).join(" | ");
  throw new Error(`Timed out waiting for team websocket message '${label}'. preview='${preview}'`);
};

const sendTeamMessageOverSocket = (socket: WebSocket, input: { content: string; targetMemberRouteKey: string }) => {
  socket.send(JSON.stringify({
    type: "SEND_MESSAGE",
    payload: {
      content: input.content,
      target_member_route_key: input.targetMemberRouteKey,
      context_file_paths: [],
      image_urls: [],
    },
  }));
};

const flattenMemberMetadata = (metadata: Record<string, unknown>): TeamMemberMetadata[] => {
  if (Array.isArray(metadata.memberMetadata)) return metadata.memberMetadata as TeamMemberMetadata[];
  const flattened: TeamMemberMetadata[] = [];
  const visit = (members: unknown[]) => {
    for (const member of members) {
      if (!member || typeof member !== "object" || Array.isArray(member)) continue;
      const typed = member as TeamMemberMetadata;
      if (typed.memberKind === "agent" || !Array.isArray(typed.memberTree)) flattened.push(typed);
      if (Array.isArray(typed.memberTree)) visit(typed.memberTree);
    }
  };
  visit(Array.isArray(metadata.memberTree) ? metadata.memberTree : []);
  return flattened;
};

const waitForSettledTaskAgentSnapshot = async (input: {
  teamRunId: string;
  memberRouteKey: string;
  taskAgentRunId: string;
  timeoutMs?: number;
}): Promise<void> => {
  const teamRunManager = AgentTeamRunManager.getInstance();
  const agentRunManager = AgentRunManager.getInstance();
  const deadline = Date.now() + (input.timeoutMs ?? 120_000);
  let lastLogicalSnapshot: unknown = null;
  let lastTaskAgentSnapshot: unknown = null;
  let lastActiveRun = true;
  while (Date.now() < deadline) {
    const teamRun = teamRunManager.getTeamRun(input.teamRunId);
    const snapshots = teamRun?.getMemberStatusSnapshots() ?? [];
    const logicalSnapshot = snapshots.find(
      (candidate) =>
        candidate.member_route_key === input.memberRouteKey &&
        !candidate.task_agent_run_id,
    ) ?? null;
    const taskAgentSnapshot = snapshots.find(
      (candidate) => candidate.task_agent_run_id === input.taskAgentRunId,
    ) ?? null;
    lastLogicalSnapshot = logicalSnapshot;
    lastTaskAgentSnapshot = taskAgentSnapshot;
    const activeRun = agentRunManager.getActiveRun(input.taskAgentRunId);
    lastActiveRun = Boolean(activeRun);
    if (logicalSnapshot?.status === "offline" && !taskAgentSnapshot && !activeRun) {
      return;
    }
    await wait(500);
  }
  throw new Error(
    `Timed out waiting for task-agent '${input.taskAgentRunId}' for member '${input.memberRouteKey}' to settle. lastLogicalSnapshot=${JSON.stringify(lastLogicalSnapshot)} lastTaskAgentSnapshot=${JSON.stringify(lastTaskAgentSnapshot)} activeRun=${lastActiveRun}`,
  );
};

const extractTaskAgentRunIdFromActivation = (message: WsMessage): string => {
  const taskAgentInstance = message.payload.taskAgentInstance;
  if (taskAgentInstance && typeof taskAgentInstance === "object" && !Array.isArray(taskAgentInstance)) {
    const taskAgentRunId = (taskAgentInstance as Record<string, unknown>).taskAgentRunId;
    if (typeof taskAgentRunId === "string" && taskAgentRunId.trim()) {
      return taskAgentRunId;
    }
  }
  const taskAgentRunId = message.payload.task_agent_run_id;
  if (typeof taskAgentRunId === "string" && taskAgentRunId.trim()) {
    return taskAgentRunId;
  }
  throw new Error(`Activation payload did not include a task-agent run id: ${JSON.stringify(message.payload)}`);
};

describeLive("Live mixed-runtime task delegation e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
    process.env.AUTOBYTEUS_STREAM_PARSER = "json";
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "mixed-task-delegation-e2e-appdata-"));
    await writeFile(path.join(testDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    await loadAllAgentTools();
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    if (typeof originalCodexApprovalPolicy === "string") process.env.CODEX_APP_SERVER_APPROVAL_POLICY = originalCodexApprovalPolicy;
    else delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
    if (typeof originalToolCallFormat === "string") process.env.AUTOBYTEUS_STREAM_PARSER = originalToolCallFormat;
    else delete process.env.AUTOBYTEUS_STREAM_PARSER;
    for (const root of createdWorkspaceRoots) await rm(root, { recursive: true, force: true });
    if (testDataDir) await rm(testDataDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    const exec = async <T>(query: string, variables?: Record<string, unknown>) => {
      const result = await graphql({ schema, source: query, variableValues: variables });
      return result.errors?.length ? null : (result.data as T);
    };
    for (const teamRunId of createdTeamRunIds) {
      await exec(`mutation TerminateAgentTeamRun($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }`, { teamRunId });
    }
    createdTeamRunIds.clear();
    for (const id of createdTeamDefinitionIds) {
      await exec(`mutation DeleteAgentTeamDefinition($id: String!) { deleteAgentTeamDefinition(id: $id) { success } }`, { id });
    }
    createdTeamDefinitionIds.clear();
    for (const id of createdAgentDefinitionIds) {
      await exec(`mutation DeleteAgentDefinition($id: String!) { deleteAgentDefinition(id: $id) { success } }`, { id });
    }
    createdAgentDefinitionIds.clear();
    for (const root of createdWorkspaceRoots) await rm(root, { recursive: true, force: true });
    createdWorkspaceRoots.clear();
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  const fetchModelIdentifier = async (runtimeKind: RuntimeKind, selector: (models: string[]) => string | null): Promise<string> => {
    const result = await execGraphql<{ availableLlmProvidersWithModels: Array<{ models: Array<{ modelIdentifier: string }> }> }>(
      `query Models($runtimeKind: String) { availableLlmProvidersWithModels(runtimeKind: $runtimeKind) { models { modelIdentifier } } }`,
      { runtimeKind },
    );
    const models = result.availableLlmProvidersWithModels.flatMap((provider) => provider.models.map((model) => model.modelIdentifier).filter(Boolean));
    const selected = selector(models);
    if (!selected) throw new Error(`No matching model for ${runtimeKind}. Available models: ${models.join(", ")}`);
    return selected;
  };

  const createAgentDefinition = async (input: { name: string; description: string; instructions: string; toolNames: string[] }) => {
    const result = await execGraphql<{ createAgentDefinition: { id: string } }>(
      `mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }`,
      { input: { ...input, role: "assistant", category: "runtime-e2e" } },
    );
    createdAgentDefinitionIds.add(result.createAgentDefinition.id);
    return result.createAgentDefinition.id;
  };

  const openTeamSocket = async (teamRunId: string) => {
    const streamApp = fastify();
    await streamApp.register(websocket);
    await registerAgentWebsocket(streamApp);
    const address = await streamApp.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${teamRunId}`);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      const message = parseWsMessage(raw);
      if (message) messages.push(message);
    });
    await waitForSocketOpen(socket);
    await waitForMessageAfter(messages, 0, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);
    return { streamApp, socket, messages };
  };

  it("AutoByteus coordinator delegates work and Codex gpt-5.5 worker reports terminal status", async () => {
    const unique = randomUUID();
    const autoByteusModel = await fetchModelIdentifier(RuntimeKind.AUTOBYTEUS, (models) => {
      const exact = process.env.LMSTUDIO_MODEL_ID?.trim();
      if (exact && models.includes(exact)) return exact;
      const fragment = process.env.LMSTUDIO_TARGET_TEXT_MODEL?.trim() || "qwen";
      return models.find((model) => model.includes(fragment) && model.includes("lmstudio")) ?? models.find((model) => model.toLowerCase().includes("qwen"));
    });
    const requestedCodexModel = process.env.CODEX_E2E_TASK_DELEGATION_MODEL?.trim() || "gpt-5.5";
    const codexModel = await fetchModelIdentifier(RuntimeKind.CODEX_APP_SERVER, (models) =>
      models.includes(requestedCodexModel) ? requestedCodexModel : null,
    );

    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "mixed-task-delegation-e2e-"));
    createdWorkspaceRoots.add(workspaceRootPath);
    const completionToken = `LIVE_MIXED_TASK_DELEGATION_DONE_${unique}`;

    const coordinatorAgentDefinitionId = await createAgentDefinition({
      name: `mixed-task-coordinator-${unique}`,
      description: "AutoByteus coordinator for live task delegation E2E.",
      toolNames: ["delegate_tasks", "accept_task"],
      instructions: `If the user asks you to call delegate_tasks with exact JSON arguments, call delegate_tasks exactly once by emitting only one raw JSON tool-call object and no prose or markdown: {"tool":{"function":"delegate_tasks","parameters":<exact arguments>}}. When you later receive a framework task completion notification with a Task ID, accept it exactly once by emitting only one raw JSON tool-call object and no prose or markdown: {"tool":{"function":"accept_task","parameters":{"task_id":"<Task ID>"}}}. Do not explore the environment.`,
    });
    const workerAgentDefinitionId = await createAgentDefinition({
      name: `mixed-task-worker-${unique}`,
      description: "Codex worker for live task delegation E2E.",
      toolNames: ["mark_task_completed", "mark_task_failed"],
      instructions: `When you receive a delegated task work packet, immediately call mark_task_completed exactly once with message="${completionToken}" and reference_files=[]. Do not pass status, task_id, or task_name. Do not run shell commands or create files.`,
    });

    const teamDefinition = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
      `mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }`,
      { input: {
        name: `mixed-task-delegation-team-${unique}`,
        description: "Live mixed AutoByteus+Codex task delegation validation team.",
        instructions: "The coordinator delegates one task; the worker reports terminal status.",
        coordinatorMemberName: "coordinator",
        nodes: [
          { memberName: "coordinator", ref: coordinatorAgentDefinitionId, refType: "AGENT", refScope: "SHARED" },
          { memberName: "worker", ref: workerAgentDefinitionId, refType: "AGENT", refScope: "SHARED" },
        ],
      } },
    );
    const teamDefinitionId = teamDefinition.createAgentTeamDefinition.id;
    createdTeamDefinitionIds.add(teamDefinitionId);

    const runResult = await execGraphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      `mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }`,
      { input: { teamDefinitionId, memberConfigs: [
        {
          memberName: "coordinator",
          agentDefinitionId: coordinatorAgentDefinitionId,
          llmModelIdentifier: autoByteusModel,
          autoExecuteTools: true,
          skillAccessMode: "NONE",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          workspaceRootPath,
          llmConfig: {
            temperature: 0,
          },
        },
        { memberName: "worker", agentDefinitionId: workerAgentDefinitionId, llmModelIdentifier: codexModel, autoExecuteTools: true, skillAccessMode: "NONE", runtimeKind: RuntimeKind.CODEX_APP_SERVER, workspaceRootPath },
      ] } },
    );
    expect(runResult.createAgentTeamRun.success).toBe(true);
    const teamRunId = runResult.createAgentTeamRun.teamRunId as string;
    createdTeamRunIds.add(teamRunId);

    const resume = await execGraphql<{ getTeamRunResumeConfig: { metadata: Record<string, unknown> } }>(
      `query TeamResume($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { metadata } }`,
      { teamRunId },
    );
    const members = flattenMemberMetadata(resume.getTeamRunResumeConfig.metadata);
    expect(members.find((member) => member.memberName === "coordinator")).toMatchObject({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: autoByteusModel });
    const workerMember = members.find((member) => member.memberName === "worker");
    expect(workerMember).toMatchObject({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: codexModel });

    const delegateArgs = {
      tasks: [
        {
          member_name: "worker",
          description: `Complete this delegated validation task by reporting message ${completionToken}. Done condition: call mark_task_completed once with message="${completionToken}" and reference_files=[].`,
        },
      ],
    };
    const connection = await openTeamSocket(teamRunId);
    try {
      const startIndex = connection.messages.length;
      sendTeamMessageOverSocket(connection.socket, {
        targetMemberRouteKey: "coordinator",
        content: `Emit exactly this raw JSON tool call object, with no markdown and no prose: ${JSON.stringify({ tool: { function: "delegate_tasks", parameters: delegateArgs } })}`,
      });

      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TOOL_EXECUTION_SUCCEEDED" && message.payload.agent_name === "coordinator" && message.payload.tool_name === "delegate_tasks",
        "coordinator delegate_tasks success", 240_000,
      );
      const activation = await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TASK_DELEGATION_EVENT" && message.payload.event_type === "TASK_DELEGATION_ACTIVATED" && Array.isArray(message.payload.taskIds) && message.payload.taskIds.length === 1,
        "task delegation activation event", 120_000,
      );
      const taskId = (activation.payload.taskIds as string[])[0];
      const taskAgentRunId = extractTaskAgentRunIdFromActivation(activation);
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TOOL_EXECUTION_SUCCEEDED" && message.payload.agent_name === "worker" && message.payload.tool_name === "mark_task_completed",
        "worker mark_task_completed success", 240_000,
      );
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TASK_DELEGATION_EVENT" && message.payload.event_type === "TASK_DELEGATION_TERMINAL_STATUS" && message.payload.taskId === taskId && message.payload.status === "completed" && JSON.stringify(message.payload).includes(completionToken),
        "task delegation terminal event", 120_000,
      );
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "EXTERNAL_USER_MESSAGE" && message.payload.agent_name === "coordinator" && typeof message.payload.content === "string" && message.payload.content.includes("reported completed") && message.payload.content.includes(taskId) && message.payload.content.includes(completionToken),
        "coordinator task completion notification", 120_000,
      );
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TOOL_EXECUTION_SUCCEEDED" && message.payload.agent_name === "coordinator" && message.payload.tool_name === "accept_task",
        "coordinator accept_task success", 240_000,
      );
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.status === "offline" &&
          message.payload.task_agent_run_id === taskAgentRunId,
        "worker offline after final delegated task", 120_000,
      );
      await waitForSettledTaskAgentSnapshot({
        teamRunId,
        memberRouteKey: "worker",
        taskAgentRunId,
      });
    } finally {
      connection.socket.close();
      await connection.streamApp.close();
    }
  }, 420_000);
});
