import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { registerAgentToolsMcpRoutes } from "../../../src/agent-tools/mcp/agent-tools-mcp-routes.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
  seedInternalServerBaseUrlFromListenAddress,
} from "../../../src/config/server-runtime-endpoints.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { loadAllAgentTools } from "../../../src/startup/agent-tool-loader.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const codexBinaryReady = process.env.RUN_CODEX_E2E === "1" || spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const liveMixedTaskDelegationEnabled =
  process.env.RUN_MIXED_TASK_DELEGATION_E2E === "1" ||
  (process.env.RUN_LMSTUDIO_E2E === "1" && process.env.RUN_CODEX_E2E === "1");
const describeLive = codexBinaryReady && liveMixedTaskDelegationEnabled ? describe : describe.skip;
const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen3.6-35b-a3b";
const originalCodexApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;

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
  sendE2eSendMessageCommand(socket, {
      content: input.content,
      target_member_route_key: input.targetMemberRouteKey,
      context_file_paths: [],
      image_urls: [],
    });
};

const resolveInvocationId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.invocation_id, payload.tool_invocation_id, payload.id];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
};

const sendToolApproval = (
  socket: WebSocket,
  input: {
    approved: boolean;
    invocationId: string;
    reason: string;
    targetMemberRouteKey: string;
  },
) => {
  socket.send(JSON.stringify({
    type: input.approved ? "APPROVE_TOOL" : "DENY_TOOL",
    payload: {
      target_member_route_key: input.targetMemberRouteKey,
      invocation_id: input.invocationId,
      reason: input.reason,
    },
  }));
};

const resolveToolArguments = (payload: Record<string, unknown>): Record<string, unknown> => {
  const value = payload.arguments;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
};

const approveToolAndWait = async (
  socket: WebSocket,
  messages: WsMessage[],
  startIndex: number,
  input: {
    agentName: string;
    toolName: string;
    targetMemberRouteKey: string;
    reason: string;
    label: string;
    argumentPredicate?: (args: Record<string, unknown>) => boolean;
    timeoutMs?: number;
  },
): Promise<string> => {
  const deadline = Date.now() + (input.timeoutMs ?? 120_000);
  const handledInvocations = new Set<string>();
  let approvedInvocationId: string | null = null;
  while (Date.now() < deadline && !approvedInvocationId) {
    for (const message of messages.slice(startIndex)) {
      if (
        message.type !== "TOOL_APPROVAL_REQUESTED" ||
        message.payload.agent_name !== input.agentName ||
        message.payload.tool_name !== input.toolName
      ) {
        continue;
      }
      const invocationId = resolveInvocationId(message.payload);
      if (!invocationId || handledInvocations.has(invocationId)) {
        continue;
      }
      handledInvocations.add(invocationId);
      const args = resolveToolArguments(message.payload);
      if (input.argumentPredicate && !input.argumentPredicate(args)) {
        sendToolApproval(socket, {
          approved: false,
          invocationId,
          reason: `${input.reason}; denied mismatched arguments for deterministic ${input.label}`,
          targetMemberRouteKey: input.targetMemberRouteKey,
        });
        continue;
      }
      sendToolApproval(socket, {
        approved: true,
        invocationId,
        reason: input.reason,
        targetMemberRouteKey: input.targetMemberRouteKey,
      });
      approvedInvocationId = invocationId;
      break;
    }
    if (!approvedInvocationId) await wait(500);
  }
  if (!approvedInvocationId) {
    const preview = messages.slice(-30).map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 220)}`).join(" | ");
    throw new Error(`Timed out waiting for matching tool approval '${input.label}'. preview='${preview}'`);
  }
  await waitForMessageAfter(
    messages,
    startIndex,
    (message) =>
      message.type === "TOOL_APPROVED" &&
      message.payload.agent_name === input.agentName &&
      resolveInvocationId(message.payload) === approvedInvocationId,
    `${input.label} approved`,
    input.timeoutMs ?? 120_000,
  );
  return approvedInvocationId;
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

const extractTargetAgentRunIdFromActivation = (message: WsMessage): string => {
  expect(message.payload).not.toHaveProperty("taskAgentInstance");
  expect(message.payload).not.toHaveProperty("taskTeamInstance");
  expect(message.payload).not.toHaveProperty("member");
  const tasks = Array.isArray(message.payload.tasks) ? message.payload.tasks : [];
  for (const task of tasks) {
    if (!task || typeof task !== "object" || Array.isArray(task)) continue;
    const typed = task as Record<string, unknown>;
    const value = typed.executionRunId ?? typed.execution_run_id;
    if (typeof value === "string" && value.trim()) return value;
  }
  const flattenedTaskAgentRunId = message.payload.task_agent_run_id;
  if (typeof flattenedTaskAgentRunId === "string" && flattenedTaskAgentRunId.trim()) {
    return flattenedTaskAgentRunId;
  }
  throw new Error(`Activation payload did not include current task-agent execution run id: ${JSON.stringify(message.payload)}`);
};

const extractTargetTaskTeamRunIdFromActivation = (message: WsMessage): string => {
  expect(message.payload).not.toHaveProperty("taskAgentInstance");
  expect(message.payload).not.toHaveProperty("taskTeamInstance");
  expect(message.payload).not.toHaveProperty("member");
  const tasks = Array.isArray(message.payload.tasks) ? message.payload.tasks : [];
  for (const task of tasks) {
    if (!task || typeof task !== "object" || Array.isArray(task)) continue;
    const typed = task as Record<string, unknown>;
    const value = typed.executionRunId ?? typed.execution_run_id;
    if (typeof value === "string" && value.trim()) return value;
  }
  const flattenedTaskTeamRunId = message.payload.task_team_run_id;
  if (typeof flattenedTaskTeamRunId === "string" && flattenedTaskTeamRunId.trim()) {
    return flattenedTaskTeamRunId;
  }
  throw new Error(`Activation payload did not include current task-team execution run id: ${JSON.stringify(message.payload)}`);
};

const shouldDisableDeepSeekThinkingForRequiredToolChoice = (modelIdentifier: string): boolean =>
  modelIdentifier.toLowerCase().includes("deepseek-v4");

const buildCoordinatorLlmConfig = (modelIdentifier: string): Record<string, unknown> => {
  const config: Record<string, unknown> = {
    temperature: 0,
    tool_choice: "required",
  };
  if (shouldDisableDeepSeekThinkingForRequiredToolChoice(modelIdentifier)) {
    config.extra_params = { thinking_type: "disabled" };
  }
  return config;
};

const payloadContent = (message: WsMessage): string =>
  typeof message.payload.content === "string" ? message.payload.content : "";

const hasAllSnippets = (content: string, snippets: readonly string[]): boolean =>
  snippets.every((snippet) => content.includes(snippet));

const TASK_NOTIFICATION_FORBIDDEN_VISIBLE_SNIPPETS = [
  "New delegated task",
  "New delegated team task",
  "Accountable team",
  "Logical member",
  "target_agent_run_id",
  "task_agent_run_id",
  "task_team_run_id",
  "Task-agent run",
  "Task-team run ID",
  "task_team_instance_id",
  "Ingress coordinator",
  "Execution kind",
  "Lifecycle instructions",
  "Submission ID",
  "Review ID",
  "Reviewed submission ID",
  "submit_task_result",
  "review_task_result",
  "send_message_to",
  "```json",
] as const;

const waitForSingleTaskNotificationSurface = async (
  messages: WsMessage[],
  startIndex: number,
  input: {
    agentName: string;
    memberRouteKey: string;
    contentSnippets: readonly string[];
    duplicateContentSnippets?: readonly string[];
    forbiddenContentSnippets?: readonly string[];
    label: string;
    timeoutMs?: number;
  },
): Promise<void> => {
  const matchesNotification = (message: WsMessage): boolean =>
    message.type === "SYSTEM_TASK_NOTIFICATION" &&
    message.payload.agent_name === input.agentName &&
    message.payload.member_route_key === input.memberRouteKey &&
    hasAllSnippets(payloadContent(message), input.contentSnippets);

  const notification = await waitForMessageAfter(
    messages,
    startIndex,
    matchesNotification,
    `${input.label} system task notification`,
    input.timeoutMs ?? 120_000,
  );
  const notificationContent = payloadContent(notification);
  for (const forbidden of input.forbiddenContentSnippets ?? []) {
    expect(notificationContent).not.toContain(forbidden);
  }

  // Give the target runtime a short chance to emit the legacy duplicate surface
  // before asserting the final visible event set for this task packet.
  await wait(1_000);

  const window = messages.slice(startIndex);
  const notificationMatches = window.filter(matchesNotification);
  expect(notificationMatches).toHaveLength(1);

  const duplicateContentSnippets = input.duplicateContentSnippets ?? input.contentSnippets;
  const duplicateMemberInputs = window.filter((message) =>
    message.type === "MEMBER_INPUT_MESSAGE" &&
    message.payload.agent_name === input.agentName &&
    message.payload.member_route_key === input.memberRouteKey &&
    hasAllSnippets(payloadContent(message), duplicateContentSnippets),
  );
  expect(duplicateMemberInputs).toEqual([]);
};

describeLive("Live mixed-runtime task delegation e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  let runtimeServerApp: FastifyInstance | null = null;
  let runtimeServerUrl: URL | null = null;
  let originalInternalServerBaseUrl: string | undefined;
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    originalInternalServerBaseUrl = process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "mixed-task-delegation-e2e-appdata-"));
    await writeFile(path.join(testDataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    await loadAllAgentTools();
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;

    runtimeServerApp = fastify();
    await registerAgentToolsMcpRoutes(runtimeServerApp);
    await runtimeServerApp.register(websocket);
    await registerAgentWebsocket(runtimeServerApp);
    const address = await runtimeServerApp.listen({ port: 0, host: "127.0.0.1" });
    seedInternalServerBaseUrlFromListenAddress({
      requestedHost: "127.0.0.1",
      listenAddress: runtimeServerApp.server.address(),
    });
    runtimeServerUrl = new URL(address);
  });

  afterAll(async () => {
    if (typeof originalCodexApprovalPolicy === "string") process.env.CODEX_APP_SERVER_APPROVAL_POLICY = originalCodexApprovalPolicy;
    else delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
    if (originalInternalServerBaseUrl) process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] = originalInternalServerBaseUrl;
    else delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    if (runtimeServerApp) {
      await runtimeServerApp.close();
      runtimeServerApp = null;
    }
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

  const assertDelegateTaskCatalogExposure = async (): Promise<void> => {
    const result = await execGraphql<{
      tools: Array<{
        name: string;
        description: string;
        argumentSchema: {
          parameters: Array<{
            name: string;
            description: string;
            required: boolean;
          }>;
        } | null;
      }>;
    }>(
      `query LocalTools($origin: ToolOriginEnum!) {
        tools(origin: $origin) {
          name
          description
          argumentSchema {
            parameters {
              name
              description
              required
            }
          }
        }
      }`,
      { origin: "LOCAL" },
    );
    const toolNames = result.tools.map((tool) => tool.name);
    expect(toolNames).toContain("delegate_task");
    expect(toolNames).not.toContain("delegate_tasks");

    const delegateTool = result.tools.find((tool) => tool.name === "delegate_task");
    expect(delegateTool?.description).toContain("Delegate one ready-to-run task");
    expect(delegateTool?.description).toContain("submit_task_result");
    expect(JSON.stringify(delegateTool)).not.toContain("Do not pass");
    expect(JSON.stringify(delegateTool)).not.toContain("completion_criteria");
    expect(delegateTool?.argumentSchema?.parameters.map((parameter) => parameter.name)).toEqual([
      "target",
      "description",
      "reference_files",
    ]);
    expect(delegateTool?.argumentSchema?.parameters.find((parameter) => parameter.name === "target"))
      .toMatchObject({ required: true });
    expect(delegateTool?.argumentSchema?.parameters.find((parameter) => parameter.name === "description"))
      .toMatchObject({ required: true });
    expect(delegateTool?.argumentSchema?.parameters.find((parameter) => parameter.name === "reference_files"))
      .toMatchObject({ required: false });
    expect(JSON.stringify(delegateTool)).not.toContain("member_name");
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
    if (!runtimeServerUrl) throw new Error("Runtime server URL was not initialized.");
    const socket = new WebSocket(`ws://${runtimeServerUrl.hostname}:${runtimeServerUrl.port}/ws/agent-team/${teamRunId}`);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      const message = parseWsMessage(raw);
      if (message) messages.push(message);
    });
    await waitForSocketOpen(socket);
    await waitForMessageAfter(messages, 0, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);
    return { socket, messages };
  };

  it("AutoByteus coordinator delegates work and reviews a concrete task-agent result/revision cycle", async () => {
    const unique = randomUUID();
    await assertDelegateTaskCatalogExposure();
    const autoByteusModel = await fetchModelIdentifier(RuntimeKind.AUTOBYTEUS, (models) => {
      const exact = process.env.LMSTUDIO_MODEL_ID?.trim();
      if (exact && models.includes(exact)) return exact;
      const fragment = process.env.LMSTUDIO_TARGET_TEXT_MODEL?.trim() || DEFAULT_LMSTUDIO_TEXT_MODEL;
      return models.find((model) => model.includes(fragment) && model.includes("lmstudio")) ?? models.find((model) => model.toLowerCase().includes("qwen"));
    });
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "mixed-task-delegation-e2e-"));
    createdWorkspaceRoots.add(workspaceRootPath);
    const initialResultToken = `LIVE_MIXED_TASK_DELEGATION_INITIAL_RESULT_${unique}`;
    const revisionRequestMessage = `Revision requested for live result ${unique}.`;

    const coordinatorAgentDefinitionId = await createAgentDefinition({
      name: `mixed-task-coordinator-${unique}`,
      description: "AutoByteus coordinator for live task delegation and revision feedback E2E.",
      toolNames: ["delegate_task", "review_task_result"],
      instructions: `If the user asks you to call delegate_task with exact JSON arguments, call delegate_task exactly once with those exact arguments and do not call any other tool. After the framework notifies you of the first submitted task result, call review_task_result exactly once with the task_id from the notification, decision="request_revision", and comment=${JSON.stringify(revisionRequestMessage)}. Do not delegate additional tasks. Do not accept the task during this scenario. Do not explore the environment.`,
    });
    const workerAgentDefinitionId = await createAgentDefinition({
      name: `mixed-task-worker-${unique}`,
      description: "AutoByteus worker for live task delegation revision feedback E2E.",
      toolNames: ["submit_task_result"],
      instructions: `When you receive the initial delegated task work packet, immediately call submit_task_result exactly once with message="${initialResultToken}" and reference_files=[]. Do not wait for another user message and do not reply in prose instead of calling the tool. If you later receive a framework revision request, do not call submit_task_result again during this scenario; reply exactly "WAITING_FOR_REVISION_COMMAND". Do not run shell commands or create files.`,
    });

    const teamDefinition = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
      `mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }`,
      { input: {
        name: `mixed-task-delegation-team-${unique}`,
        description: "Live mixed AutoByteus+Codex task delegation validation team.",
        instructions: "The coordinator delegates one task; the worker submits results through submit_task_result and the coordinator reviews through review_task_result.",
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
          autoExecuteTools: false,
          skillAccessMode: "NONE",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          workspaceRootPath,
          llmConfig: buildCoordinatorLlmConfig(autoByteusModel),
        },
        {
          memberName: "worker",
          agentDefinitionId: workerAgentDefinitionId,
          llmModelIdentifier: autoByteusModel,
          autoExecuteTools: true,
          skillAccessMode: "NONE",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          workspaceRootPath,
          llmConfig: buildCoordinatorLlmConfig(autoByteusModel),
        },
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
    expect(workerMember).toMatchObject({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: autoByteusModel });

    const delegateArgs = {
      target: { kind: "member", name: "worker" },
      description: `Produce exactly one delegated task result whose content is "${initialResultToken}". Use no reference files. Do this immediately without reading files or writing prose.`,
    };
    const connection = await openTeamSocket(teamRunId);
    try {
      const startIndex = connection.messages.length;
      sendTeamMessageOverSocket(connection.socket, {
        targetMemberRouteKey: "coordinator",
        content: `Call delegate_task exactly once now with these exact JSON arguments: ${JSON.stringify(delegateArgs)}. Do not call any other tool.`,
      });

      await approveToolAndWait(connection.socket, connection.messages, startIndex, {
        agentName: "coordinator",
        toolName: "delegate_task",
        targetMemberRouteKey: "coordinator",
        reason: "approved by mixed task delegation e2e",
        label: "coordinator delegate_task",
        argumentPredicate: (args) => {
          const target = args.target;
          return target !== null &&
            typeof target === "object" &&
            !Array.isArray(target) &&
            (target as Record<string, unknown>).kind === delegateArgs.target.kind &&
            (target as Record<string, unknown>).name === delegateArgs.target.name &&
            args.description === delegateArgs.description &&
            !Object.prototype.hasOwnProperty.call(args, "member_name") &&
            !Object.prototype.hasOwnProperty.call(args, "tasks");
        },
        timeoutMs: 240_000,
      });
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TOOL_EXECUTION_SUCCEEDED" && message.payload.agent_name === "coordinator" && message.payload.tool_name === "delegate_task",
        "coordinator delegate_task success", 240_000,
      );
      const activation = await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TASK_DELEGATION_EVENT" && message.payload.event_type === "TASK_DELEGATION_ACTIVATED" && Array.isArray(message.payload.taskIds) && message.payload.taskIds.length === 1,
        "task delegation activation event", 120_000,
      );
      const taskId = (activation.payload.taskIds as string[])[0];
      const taskAgentRunId = extractTargetAgentRunIdFromActivation(activation);
      await waitForSingleTaskNotificationSurface(connection.messages, startIndex, {
        agentName: "worker",
        memberRouteKey: "worker",
        contentSnippets: [`Task ID: ${taskId}`, delegateArgs.description],
        forbiddenContentSnippets: [
          ...TASK_NOTIFICATION_FORBIDDEN_VISIBLE_SNIPPETS,
          taskAgentRunId,
          "coordinator",
          "worker",
        ],
        label: "worker activation",
      });
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TOOL_EXECUTION_SUCCEEDED" && message.payload.agent_name === "worker" && message.payload.tool_name === "submit_task_result",
        "worker submit_task_result initial submit success", 240_000,
      );
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TASK_DELEGATION_EVENT" &&
          message.payload.event_type === "TASK_DELEGATION_RESULT_SUBMITTED" &&
          message.payload.taskId === taskId &&
          message.payload.submissionId === `${taskId}_submission_0001` &&
          message.payload.pendingSubmissionId === `${taskId}_submission_0001` &&
          message.payload.status === "awaiting_review",
        "task result submitted event", 120_000,
      );
      await waitForSingleTaskNotificationSurface(connection.messages, startIndex, {
        agentName: "coordinator",
        memberRouteKey: "coordinator",
        contentSnippets: ["A task result is ready for review.", `Task ID: ${taskId}`, initialResultToken],
        forbiddenContentSnippets: [
          ...TASK_NOTIFICATION_FORBIDDEN_VISIBLE_SNIPPETS,
          taskAgentRunId,
          `${taskId}_submission_0001`,
          "coordinator",
          "worker",
        ],
        label: "coordinator result-submitted",
      });

      const revisionStartIndex = connection.messages.length;
      const revisionReviewArgs = {
        task_id: taskId,
        decision: "request_revision",
        comment: revisionRequestMessage,
      };
      const revisionReviewInvocationId = await approveToolAndWait(connection.socket, connection.messages, revisionStartIndex, {
        agentName: "coordinator",
        toolName: "review_task_result",
        targetMemberRouteKey: "coordinator",
        reason: "approved by mixed task delegation e2e",
        label: "coordinator review_task_result revision request",
        argumentPredicate: (args) =>
          args.task_id === revisionReviewArgs.task_id &&
          args.decision === revisionReviewArgs.decision &&
          args.comment === revisionReviewArgs.comment &&
          !Object.prototype.hasOwnProperty.call(args, "message"),
        timeoutMs: 240_000,
      });
      expect(connection.messages.findIndex((message) =>
        message.type === "TOOL_APPROVED" &&
        message.payload.agent_name === "coordinator" &&
        resolveInvocationId(message.payload) === revisionReviewInvocationId,
      )).toBeGreaterThanOrEqual(0);
      await waitForMessageAfter(connection.messages, revisionStartIndex, (message) =>
        message.type === "TOOL_EXECUTION_SUCCEEDED" && message.payload.agent_name === "coordinator" && message.payload.tool_name === "review_task_result",
        "coordinator review_task_result revision success", 240_000,
      );
      await waitForMessageAfter(connection.messages, revisionStartIndex, (message) =>
        message.type === "TASK_DELEGATION_EVENT" &&
          message.payload.event_type === "TASK_DELEGATION_RESULT_REVIEWED" &&
          message.payload.taskId === taskId &&
          message.payload.reviewId === `${taskId}_review_0001` &&
          message.payload.reviewedSubmissionId === `${taskId}_submission_0001` &&
          message.payload.decision === "request_revision" &&
          message.payload.comment === revisionRequestMessage &&
          message.payload.status === "active" &&
          message.payload.terminal === false,
        "task result reviewed revision event", 120_000,
      );
      await waitForSingleTaskNotificationSurface(connection.messages, revisionStartIndex, {
        agentName: "worker",
        memberRouteKey: "worker",
        contentSnippets: ["This task needs revision.", `Task ID: ${taskId}`, revisionRequestMessage],
        forbiddenContentSnippets: [
          ...TASK_NOTIFICATION_FORBIDDEN_VISIBLE_SNIPPETS,
          taskAgentRunId,
          `${taskId}_submission_0001`,
          `${taskId}_review_0001`,
          "coordinator",
          "worker",
        ],
        label: "worker revision-requested",
      });
      const legacyLifecycleToolNames = new Set([
        "send_message_to",
        ["accept", "task"].join("_"),
        ["mark", "task", "completed"].join("_"),
        ["mark", "task", "failed"].join("_"),
      ]);
      const legacyLifecycleToolMessages = connection.messages.slice(startIndex).filter((message) =>
        [
          "TOOL_APPROVAL_REQUESTED",
          "TOOL_EXECUTION_STARTED",
          "TOOL_EXECUTION_SUCCEEDED",
          "TOOL_EXECUTION_FAILED",
        ].includes(message.type) &&
          typeof message.payload.tool_name === "string" &&
          legacyLifecycleToolNames.has(message.payload.tool_name),
      );
      expect(legacyLifecycleToolMessages).toEqual([]);
    } finally {
      connection.socket.close();
    }
  }, 720_000);

  it("AutoByteus coordinator delegates to an agent-team target with the same visible activation copy", async () => {
    const unique = randomUUID();
    await assertDelegateTaskCatalogExposure();
    const autoByteusModel = await fetchModelIdentifier(RuntimeKind.AUTOBYTEUS, (models) => {
      const exact = process.env.LMSTUDIO_MODEL_ID?.trim();
      if (exact && models.includes(exact)) return exact;
      const fragment = process.env.LMSTUDIO_TARGET_TEXT_MODEL?.trim() || DEFAULT_LMSTUDIO_TEXT_MODEL;
      return models.find((model) => model.includes(fragment) && model.includes("lmstudio")) ?? models.find((model) => model.toLowerCase().includes("qwen"));
    });
    const requestedCodexModel = process.env.CODEX_E2E_TASK_DELEGATION_MODEL?.trim() || "gpt-5.5";
    const codexModel = await fetchModelIdentifier(RuntimeKind.CODEX_APP_SERVER, (models) =>
      models.includes(requestedCodexModel) ? requestedCodexModel : null,
    );
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "mixed-task-team-delegation-e2e-"));
    createdWorkspaceRoots.add(workspaceRootPath);
    const teamTargetRouteKey = "review_squad";
    const teamLeadRouteKey = `${teamTargetRouteKey}/team_lead`;
    const teamTaskDescription = `Produce a concise validation note for marker LIVE_MIXED_TASK_TEAM_ACTIVATION_${unique}. Use no reference files.`;

    const coordinatorAgentDefinitionId = await createAgentDefinition({
      name: `mixed-task-team-coordinator-${unique}`,
      description: "AutoByteus coordinator for live task-team target activation E2E.",
      toolNames: ["delegate_task"],
      instructions: "If the user asks you to call delegate_task with exact JSON arguments, call delegate_task exactly once with those exact arguments and do not call any other tool. Do not explore the environment.",
    });
    const teamLeadAgentDefinitionId = await createAgentDefinition({
      name: `mixed-task-team-lead-${unique}`,
      description: "Codex task-team ingress for live task-team target activation E2E.",
      toolNames: ["submit_task_result"],
      instructions: "When you receive a delegated task work packet, wait for human approval before doing anything else. Do not call tools and do not write files unless another user message explicitly asks.",
    });

    const childTeamDefinition = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
      `mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }`,
      { input: {
        name: `mixed-task-target-team-${unique}`,
        description: "Child agent-team target for live task-delegation activation notification validation.",
        instructions: "The team lead receives the task-delegation activation work packet for validation.",
        coordinatorMemberName: "team_lead",
        nodes: [
          { memberName: "team_lead", ref: teamLeadAgentDefinitionId, refType: "AGENT", refScope: "SHARED" },
        ],
      } },
    );
    const childTeamDefinitionId = childTeamDefinition.createAgentTeamDefinition.id;
    createdTeamDefinitionIds.add(childTeamDefinitionId);

    const parentTeamDefinition = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
      `mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }`,
      { input: {
        name: `mixed-task-team-target-parent-${unique}`,
        description: "Parent team with an AutoByteus coordinator and a child agent-team delegation target.",
        instructions: "The coordinator delegates one task to the child agent-team target.",
        coordinatorMemberName: "coordinator",
        nodes: [
          { memberName: "coordinator", ref: coordinatorAgentDefinitionId, refType: "AGENT", refScope: "SHARED" },
          { memberName: teamTargetRouteKey, ref: childTeamDefinitionId, refType: "AGENT_TEAM", refScope: "SHARED" },
        ],
      } },
    );
    const parentTeamDefinitionId = parentTeamDefinition.createAgentTeamDefinition.id;
    createdTeamDefinitionIds.add(parentTeamDefinitionId);

    const runResult = await execGraphql<{ createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null } }>(
      `mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }`,
      { input: { teamDefinitionId: parentTeamDefinitionId, memberConfigs: [
        {
          memberName: "coordinator",
          memberRouteKey: "coordinator",
          agentDefinitionId: coordinatorAgentDefinitionId,
          llmModelIdentifier: autoByteusModel,
          autoExecuteTools: false,
          skillAccessMode: "NONE",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          workspaceRootPath,
          llmConfig: buildCoordinatorLlmConfig(autoByteusModel),
        },
        {
          memberName: "team_lead",
          memberRouteKey: teamLeadRouteKey,
          agentDefinitionId: teamLeadAgentDefinitionId,
          llmModelIdentifier: codexModel,
          autoExecuteTools: false,
          skillAccessMode: "NONE",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          workspaceRootPath,
        },
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
    expect(members.find((member) => member.memberRouteKey === "coordinator")).toMatchObject({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: autoByteusModel,
    });
    expect(members.find((member) => member.memberRouteKey === teamLeadRouteKey)).toMatchObject({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: codexModel,
    });

    const delegateArgs = {
      target: { kind: "team", name: teamTargetRouteKey },
      description: teamTaskDescription,
    };
    const connection = await openTeamSocket(teamRunId);
    try {
      const startIndex = connection.messages.length;
      sendTeamMessageOverSocket(connection.socket, {
        targetMemberRouteKey: "coordinator",
        content: `Call delegate_task exactly once now with these exact JSON arguments: ${JSON.stringify(delegateArgs)}. Do not call any other tool.`,
      });

      await approveToolAndWait(connection.socket, connection.messages, startIndex, {
        agentName: "coordinator",
        toolName: "delegate_task",
        targetMemberRouteKey: "coordinator",
        reason: "approved by mixed task-team target activation e2e",
        label: "coordinator delegate_task to team target",
        argumentPredicate: (args) => {
          const target = args.target;
          return target !== null &&
            typeof target === "object" &&
            !Array.isArray(target) &&
            (target as Record<string, unknown>).kind === delegateArgs.target.kind &&
            (target as Record<string, unknown>).name === delegateArgs.target.name &&
            args.description === delegateArgs.description &&
            !Object.prototype.hasOwnProperty.call(args, "member_name") &&
            !Object.prototype.hasOwnProperty.call(args, "tasks");
        },
        timeoutMs: 240_000,
      });
      await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TOOL_EXECUTION_SUCCEEDED" && message.payload.agent_name === "coordinator" && message.payload.tool_name === "delegate_task",
        "coordinator delegate_task team-target success", 240_000,
      );
      const activation = await waitForMessageAfter(connection.messages, startIndex, (message) =>
        message.type === "TASK_DELEGATION_EVENT" && message.payload.event_type === "TASK_DELEGATION_ACTIVATED" && Array.isArray(message.payload.taskIds) && message.payload.taskIds.length === 1,
        "team-target task delegation activation event", 120_000,
      );
      const taskId = (activation.payload.taskIds as string[])[0];
      const taskTeamRunId = extractTargetTaskTeamRunIdFromActivation(activation);
      const taskTeamInstanceId = typeof activation.payload.task_team_instance_id === "string"
        ? activation.payload.task_team_instance_id
        : `task_team_${taskId}`;
      expect(JSON.stringify(activation.payload)).toContain(teamTargetRouteKey);
      expect(JSON.stringify(activation.payload)).toContain(taskTeamRunId);
      await waitForSingleTaskNotificationSurface(connection.messages, startIndex, {
        agentName: "team_lead",
        memberRouteKey: teamLeadRouteKey,
        contentSnippets: [
          "You have a new task.",
          `Task ID: ${taskId}`,
          teamTaskDescription,
          "Reference files:",
          "- None specified",
        ],
        duplicateContentSnippets: [`Task ID: ${taskId}`, teamTaskDescription],
        forbiddenContentSnippets: [
          ...TASK_NOTIFICATION_FORBIDDEN_VISIBLE_SNIPPETS,
          taskTeamRunId,
          taskTeamInstanceId,
          "coordinator",
          teamTargetRouteKey,
          "team_lead",
        ],
        label: "task-team target activation",
        timeoutMs: 180_000,
      });
    } finally {
      connection.socket.close();
    }
  }, 480_000);
});
