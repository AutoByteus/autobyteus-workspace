import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen/qwen3-30b-a3b-2507";
const describeAutoByteusTeamRuntime =
  process.env.RUN_LMSTUDIO_E2E === "1" ? describe : describe.skip;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for websocket open")),
      timeoutMs,
    );
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

const parseWsMessage = (raw: WebSocket.RawData): WsMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString()) as {
      type?: unknown;
      payload?: unknown;
    };
    if (typeof parsed.type !== "string") {
      return null;
    }
    const payload =
      parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
        ? (parsed.payload as Record<string, unknown>)
        : {};
    return {
      type: parsed.type,
      payload,
    };
  } catch {
    return null;
  }
};

const waitForMessage = async (
  messages: WsMessage[],
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 180_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.find(predicate);
    if (match) {
      return match;
    }
    await wait(250);
  }

  const preview = messages
    .slice(-25)
    .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 180)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for team websocket message '${label}'. preview='${preview}'`);
};

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 180_000,
): Promise<WsMessage> => {
  return waitForMessage(
    messages,
    (message) => messages.indexOf(message) >= startIndex && predicate(message),
    label,
    timeoutMs,
  );
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

const assistantTextMatches = (message: WsMessage, memberName: string, token: string): boolean => {
  if (message.payload.agent_name !== memberName) {
    return false;
  }

  if (message.type === "SEGMENT_CONTENT") {
    return (
      message.payload.segment_type === "text" &&
      typeof message.payload.delta === "string" &&
      message.payload.delta.includes(token)
    );
  }

  if (message.type === "SEGMENT_END") {
    return (
      message.payload.segment_type === "text" &&
      typeof message.payload.text === "string" &&
      message.payload.text.includes(token)
    );
  }

  if (message.type === "ASSISTANT_COMPLETE") {
    const text =
      typeof message.payload.text === "string"
        ? message.payload.text
        : typeof message.payload.content === "string"
          ? message.payload.content
          : typeof message.payload.result === "string"
            ? message.payload.result
            : null;
    return typeof text === "string" && text.includes(token);
  }

  return false;
};

describeAutoByteusTeamRuntime("AutoByteus team current GraphQL runtime e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "autobyteus-team-runtime-api-e2e-"));
    await writeFile(
      path.join(testDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    for (const workspaceRoot of createdWorkspaceRoots) {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
    createdWorkspaceRoots.clear();

    if (testDataDir) {
      await rm(testDataDir, { recursive: true, force: true });
      testDataDir = null;
    }
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const fetchModelIdentifier = async (): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
          models {
            modelIdentifier
          }
        }
      }
    `;

    const result = await execGraphql<{
      availableLlmProvidersWithModels: Array<{
        models: Array<{ modelIdentifier: string }>;
      }>;
    }>(query, {
      runtimeKind: "autobyteus",
    });

    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.trim().length > 0),
    );
    if (modelIdentifiers.length === 0) {
      throw new Error("No AutoByteus model identifier was returned for team API E2E.");
    }

    const exactOverride = process.env.LMSTUDIO_MODEL_ID?.trim();
    if (exactOverride && modelIdentifiers.includes(exactOverride)) {
      return exactOverride;
    }

    const preferredFragment = process.env.LMSTUDIO_TARGET_TEXT_MODEL ?? DEFAULT_LMSTUDIO_TEXT_MODEL;
    const preferredMatch = modelIdentifiers.find((modelIdentifier) =>
      modelIdentifier.includes(preferredFragment),
    );
    if (preferredMatch) {
      return preferredMatch;
    }

    const qwenMatch = modelIdentifiers.find((modelIdentifier) =>
      modelIdentifier.toLowerCase().includes("qwen"),
    );
    return qwenMatch ?? modelIdentifiers[0]!;
  };

  const createAgentDefinition = async (memberName: string): Promise<string> => {
    const mutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
        }
      }
    `;

    const result = await execGraphql<{
      createAgentDefinition: { id: string };
    }>(mutation, {
      input: {
        name: `autobyteus-team-${memberName}-${randomUUID()}`,
        role: "assistant",
        description: "AutoByteus team API e2e agent",
        instructions:
          "Follow the user's request exactly. " +
          "If asked to create a file, use the write_file tool exactly once. " +
          "If asked to reply with an exact token, output that token exactly.",
        category: "runtime-e2e",
        toolNames: ["write_file"],
      },
    });
    return result.createAgentDefinition.id;
  };

  it("creates a real team, approves a tool call, restores it, and continues on the same websocket", async () => {
    const llmModelIdentifier = await fetchModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "autobyteus-team-runtime-workspace-"));
    createdWorkspaceRoots.add(workspaceRootPath);

    const workerAgentDefinitionId = await createAgentDefinition("worker");
    const reviewerAgentDefinitionId = await createAgentDefinition("reviewer");

    const createTeamDefinitionMutation = `
      mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
        }
      }
    `;

    const teamDefinitionResult = await execGraphql<{
      createAgentTeamDefinition: { id: string };
    }>(createTeamDefinitionMutation, {
      input: {
        name: `autobyteus-team-runtime-${randomUUID()}`,
        description: "AutoByteus team API e2e team",
        instructions: "Coordinate the worker and reviewer when needed.",
        coordinatorMemberName: "worker",
        nodes: [
          {
            memberName: "worker",
            ref: workerAgentDefinitionId,
            refType: "AGENT",
          },
          {
            memberName: "reviewer",
            ref: reviewerAgentDefinitionId,
            refType: "AGENT",
          },
        ],
      },
    });
    const teamDefinitionId = teamDefinitionResult.createAgentTeamDefinition.id;

    const createTeamRunMutation = `
      mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
        createAgentTeamRun(input: $input) {
          success
          message
          teamRunId
        }
      }
    `;

    const createTeamRunResult = await execGraphql<{
      createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
    }>(createTeamRunMutation, {
      input: {
        teamDefinitionId,
        memberConfigs: [
          {
            memberName: "worker",
            agentDefinitionId: workerAgentDefinitionId,
            llmModelIdentifier,
            autoExecuteTools: false,
            skillAccessMode: "NONE",
            runtimeKind: "autobyteus",
            workspaceRootPath,
          },
          {
            memberName: "reviewer",
            agentDefinitionId: reviewerAgentDefinitionId,
            llmModelIdentifier,
            autoExecuteTools: false,
            skillAccessMode: "NONE",
            runtimeKind: "autobyteus",
            workspaceRootPath,
          },
        ],
      },
    });

    expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
    expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
    const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;

    const streamApp = fastify();
    await streamApp.register(websocket);
    await registerAgentWebsocket(streamApp);
    const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
    const streamUrl = new URL(streamAddress);
    const teamSocket = new WebSocket(
      `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
    );
    const streamMessages: WsMessage[] = [];
    teamSocket.on("message", (raw) => {
      const parsed = parseWsMessage(raw);
      if (parsed) {
        streamMessages.push(parsed);
      }
    });
    await waitForSocketOpen(teamSocket);
    await waitForMessage(streamMessages, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);

    const targetRelativePath = `team-api-${randomUUID().replace(/-/g, "_")}.txt`;
    const targetAbsolutePath = path.join(workspaceRootPath, targetRelativePath);
    const expectedContent = `TEAM_TOOL_OK_${randomUUID().replace(/-/g, "_")}`;
    const toolStartIndex = streamMessages.length;

    try {
      teamSocket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: {
            target_member_name: "worker",
            content:
              `Create the file ${targetRelativePath} with exactly this content: ${expectedContent}. ` +
              "Use a relative path and perform the real tool call.",
          },
        }),
      );

      const approvalRequested = await waitForMessageAfter(
        streamMessages,
        toolStartIndex,
        (message) =>
          message.type === "TOOL_APPROVAL_REQUESTED" && message.payload.agent_name === "worker",
        "worker TOOL_APPROVAL_REQUESTED",
      );
      const invocationId = resolveInvocationId(approvalRequested.payload);
      expect(invocationId).toBeTruthy();

      teamSocket.send(
        JSON.stringify({
          type: "APPROVE_TOOL",
          payload: {
            agent_name: "worker",
            invocation_id: invocationId,
            reason: "approved by team API e2e",
          },
        }),
      );

      await waitForMessageAfter(
        streamMessages,
        toolStartIndex,
        (message) =>
          message.type === "TOOL_APPROVED" && message.payload.agent_name === "worker",
        "worker TOOL_APPROVED",
      );
      await waitForMessageAfter(
        streamMessages,
        toolStartIndex,
        (message) =>
          message.type === "TOOL_EXECUTION_SUCCEEDED" &&
          message.payload.agent_name === "worker",
        "worker TOOL_EXECUTION_SUCCEEDED",
      );
      await waitForMessageAfter(
        streamMessages,
        toolStartIndex,
        (message) =>
          message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.new_status === "IDLE",
        "worker AGENT_STATUS IDLE",
      );

      expect(await readFile(targetAbsolutePath, "utf-8")).toContain(expectedContent);

      const terminateMutation = `
        mutation TerminateAgentTeamRun($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `;
      const terminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

      const restoreMutation = `
        mutation RestoreAgentTeamRun($teamRunId: String!) {
          restoreAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
            teamRunId
          }
        }
      `;
      const restoreResult = await execGraphql<{
        restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(restoreMutation, { teamRunId });
      expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
      expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);

      const restoreToken = `TEAM_RESTORE_${randomUUID().replace(/-/g, "_")}`;
      const restoreStartIndex = streamMessages.length;
      teamSocket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: {
            content: `Reply with exactly ${restoreToken} and nothing else.`,
          },
        }),
      );

      await waitForMessageAfter(
        streamMessages,
        restoreStartIndex,
        (message) => assistantTextMatches(message, "worker", restoreToken),
        `worker assistant text containing ${restoreToken}`,
      );
      await waitForMessageAfter(
        streamMessages,
        restoreStartIndex,
        (message) =>
          message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.new_status === "IDLE",
        "worker AGENT_STATUS IDLE after restore",
      );
    } finally {
      teamSocket.close();
      await streamApp.close();

      const terminateMutation = `
        mutation TerminateAgentTeamRun($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `;
      await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId }).catch(() => undefined);
    }
  }, 240_000);

  it("serves team member projection after terminate, restore, and continue", async () => {
    const llmModelIdentifier = await fetchModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "autobyteus-team-projection-workspace-"));
    createdWorkspaceRoots.add(workspaceRootPath);

    const workerAgentDefinitionId = await createAgentDefinition("worker");

    const createTeamDefinitionMutation = `
      mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
        }
      }
    `;
    const teamDefinitionResult = await execGraphql<{
      createAgentTeamDefinition: { id: string };
    }>(createTeamDefinitionMutation, {
      input: {
        name: `autobyteus-team-projection-${randomUUID()}`,
        description: "AutoByteus team projection API e2e team",
        instructions: "Reply concisely.",
        coordinatorMemberName: "worker",
        nodes: [
          {
            memberName: "worker",
            ref: workerAgentDefinitionId,
            refType: "AGENT",
          },
        ],
      },
    });
    const teamDefinitionId = teamDefinitionResult.createAgentTeamDefinition.id;

    const createTeamRunMutation = `
      mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
        createAgentTeamRun(input: $input) {
          success
          message
          teamRunId
        }
      }
    `;
    const createTeamRunResult = await execGraphql<{
      createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
    }>(createTeamRunMutation, {
      input: {
        teamDefinitionId,
        memberConfigs: [
          {
            memberName: "worker",
            agentDefinitionId: workerAgentDefinitionId,
            llmModelIdentifier,
            autoExecuteTools: true,
            skillAccessMode: "NONE",
            runtimeKind: "autobyteus",
            workspaceRootPath,
          },
        ],
      },
    });
    expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
    const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;

    const teamResumeQuery = `
      query TeamResume($teamRunId: String!) {
        getTeamRunResumeConfig(teamRunId: $teamRunId) {
          metadata
        }
      }
    `;
    const projectionQuery = `
      query TeamMemberProjection($teamRunId: String!, $memberRouteKey: String!) {
        getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
          agentRunId
          summary
          lastActivityAt
          conversation
        }
      }
    `;
    const terminateMutation = `
      mutation TerminateAgentTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) {
          success
          message
        }
      }
    `;
    const restoreMutation = `
      mutation RestoreAgentTeamRun($teamRunId: String!) {
        restoreAgentTeamRun(teamRunId: $teamRunId) {
          success
          message
          teamRunId
        }
      }
    `;

    const streamApp = fastify();
    await streamApp.register(websocket);
    await registerAgentWebsocket(streamApp);
    const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
    const streamUrl = new URL(streamAddress);
    const teamSocket = new WebSocket(
      `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
    );
    const streamMessages: WsMessage[] = [];
    teamSocket.on("message", (raw) => {
      const parsed = parseWsMessage(raw);
      if (parsed) {
        streamMessages.push(parsed);
      }
    });
    await waitForSocketOpen(teamSocket);
    await waitForMessage(streamMessages, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);

    const firstToken = `TEAM_PROJECTION_FIRST_${randomUUID().replace(/-/g, "_")}`;
    const secondToken = `TEAM_PROJECTION_SECOND_${randomUUID().replace(/-/g, "_")}`;

    try {
      const firstStartIndex = streamMessages.length;
      teamSocket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: {
            content: `Reply with exactly ${firstToken} and nothing else.`,
          },
        }),
      );

      await waitForMessageAfter(
        streamMessages,
        firstStartIndex,
        (message) => assistantTextMatches(message, "worker", firstToken),
        `worker assistant text containing ${firstToken}`,
      );
      await waitForMessageAfter(
        streamMessages,
        firstStartIndex,
        (message) =>
          message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.new_status === "IDLE",
        "worker AGENT_STATUS IDLE for first projection turn",
      );

      const firstTerminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(firstTerminateResult.terminateAgentTeamRun.success).toBe(true);

      const firstResumeResult = await execGraphql<{
        getTeamRunResumeConfig: {
          metadata: {
            memberMetadata: Array<{ memberName: string; memberRouteKey: string }>;
          };
        };
      }>(teamResumeQuery, { teamRunId });
      const memberRouteKey =
        firstResumeResult.getTeamRunResumeConfig.metadata.memberMetadata.find(
          (member) => member.memberName === "worker",
        )?.memberRouteKey ?? "worker";

      const firstProjectionResult = await execGraphql<{
        getTeamMemberRunProjection: {
          agentRunId: string;
          summary: string | null;
          lastActivityAt: string | null;
          conversation: Array<Record<string, unknown>>;
        };
      }>(projectionQuery, { teamRunId, memberRouteKey });
      expect(firstProjectionResult.getTeamMemberRunProjection.conversation.length).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(firstProjectionResult.getTeamMemberRunProjection.conversation)).toContain(firstToken);

      const restoreResult = await execGraphql<{
        restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(restoreMutation, { teamRunId });
      expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
      expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);

      const secondStartIndex = streamMessages.length;
      teamSocket.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          payload: {
            content: `Reply with exactly ${secondToken} and nothing else.`,
          },
        }),
      );

      await waitForMessageAfter(
        streamMessages,
        secondStartIndex,
        (message) => assistantTextMatches(message, "worker", secondToken),
        `worker assistant text containing ${secondToken}`,
      );
      await waitForMessageAfter(
        streamMessages,
        secondStartIndex,
        (message) =>
          message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.new_status === "IDLE",
        "worker AGENT_STATUS IDLE for second projection turn",
      );

      const secondTerminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(secondTerminateResult.terminateAgentTeamRun.success).toBe(true);

      const secondProjectionResult = await execGraphql<{
        getTeamMemberRunProjection: {
          agentRunId: string;
          summary: string | null;
          lastActivityAt: string | null;
          conversation: Array<Record<string, unknown>>;
        };
      }>(projectionQuery, { teamRunId, memberRouteKey });
      const serializedConversation = JSON.stringify(secondProjectionResult.getTeamMemberRunProjection.conversation);
      expect(secondProjectionResult.getTeamMemberRunProjection.conversation.length).toBeGreaterThanOrEqual(4);
      expect(serializedConversation).toContain(firstToken);
      expect(serializedConversation).toContain(secondToken);
    } finally {
      teamSocket.close();
      await streamApp.close();
      await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId }).catch(() => undefined);
    }
  }, 240_000);
});
