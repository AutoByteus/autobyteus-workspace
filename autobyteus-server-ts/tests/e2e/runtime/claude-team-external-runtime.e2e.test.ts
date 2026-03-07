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
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getClaudeAgentSdkRuntimeService } from "../../../src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";
import { ClaudeRuntimeTranscriptStore } from "../../../src/runtime-execution/claude-agent-sdk/claude-runtime-transcript-store.js";

const claudeBinaryReady = spawnSync("claude", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeClaudeRuntime = claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const simulateClaudeRuntimeRestart = (): void => {
  const runtimeService = getClaudeAgentSdkRuntimeService() as any;
  runtimeService.sessions?.clear?.();
  runtimeService.v2SessionsByRunId?.clear?.();
  runtimeService.v2SessionControlsByRunId?.clear?.();
  runtimeService.deferredListenersByRunId?.clear?.();
  runtimeService.transcriptStore = new ClaudeRuntimeTranscriptStore();
};

describeClaudeRuntime("Claude team external-member runtime e2e (live transport)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "claude-team-runtime-e2e-appdata-"));
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
    for (const root of createdWorkspaceRoots) {
      await rm(root, { recursive: true, force: true });
    }
    createdWorkspaceRoots.clear();
    if (testDataDir) {
      await rm(testDataDir, { recursive: true, force: true });
      testDataDir = null;
    }
  });

  afterEach(async () => {
    const exec = async <T>(query: string, variables?: Record<string, unknown>): Promise<T | null> => {
      const result = await graphql({
        schema,
        source: query,
        variableValues: variables,
      });
      return result.errors?.length ? null : (result.data as T);
    };

    const terminateTeamRunMutation = `
      mutation TerminateAgentTeamRun($id: String!) {
        terminateAgentTeamRun(id: $id) {
          success
        }
      }
    `;
    for (const teamRunId of createdTeamRunIds) {
      await exec(terminateTeamRunMutation, { id: teamRunId });
    }
    createdTeamRunIds.clear();

    const deleteTeamDefinitionMutation = `
      mutation DeleteAgentTeamDefinition($id: String!) {
        deleteAgentTeamDefinition(id: $id) {
          success
        }
      }
    `;
    for (const id of createdTeamDefinitionIds) {
      await exec(deleteTeamDefinitionMutation, { id });
    }
    createdTeamDefinitionIds.clear();

    const deleteAgentDefinitionMutation = `
      mutation DeleteAgentDefinition($id: String!) {
        deleteAgentDefinition(id: $id) {
          success
        }
      }
    `;
    for (const id of createdAgentDefinitionIds) {
      await exec(deleteAgentDefinitionMutation, { id });
    }
    createdAgentDefinitionIds.clear();

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

  const fetchClaudeModelIdentifier = async (): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
          provider
          models {
            modelIdentifier
          }
        }
      }
    `;

    const result = await execGraphql<{
      availableLlmProvidersWithModels: Array<{
        provider: string;
        models: Array<{ modelIdentifier: string }>;
      }>;
    }>(query, {
      runtimeKind: "claude_agent_sdk",
    });

    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.length > 0),
    );
    if (modelIdentifiers.length === 0) {
      throw new Error("No Claude runtime model was returned by availableLlmProvidersWithModels.");
    }
    return modelIdentifiers[0];
  };

  it(
    "routes live inter-agent send_message_to ping->pong->ping roundtrip in Claude team runtime",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-roundtrip-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const instructions = `
You are participating in a two-agent team roundtrip validation in a team with members "ping" and "pong".

Rules:
1. Follow direct user instructions exactly.
2. You must not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. If the user asks you to call send_message_to with explicit arguments, call send_message_to exactly once with those exact arguments and do not call any other tool.
5. Keep assistant text responses very short.
`;

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const pingDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-ping-${unique}`,
            role: "assistant",
            description: "Claude ping agent for inter-agent roundtrip validation.",
            instructions,
          },
        },
      );
      const pongDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-pong-${unique}`,
            role: "assistant",
            description: "Claude pong agent for inter-agent roundtrip validation.",
            instructions,
          },
        },
      );
      const pingAgentDefinitionId = pingDefResult.createAgentDefinition.id;
      const pongAgentDefinitionId = pongDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(pingAgentDefinitionId);
      createdAgentDefinitionIds.add(pongAgentDefinitionId);

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;
      const teamDefResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `claude-roundtrip-team-${unique}`,
            description: "Live Claude inter-agent roundtrip validation team.",
            instructions: "Coordinate ping and pong to execute directed send_message_to hops.",
            coordinatorMemberName: "ping",
            nodes: [
              {
                memberName: "ping",
                ref: pingAgentDefinitionId,
                refType: "AGENT",
              },
              {
                memberName: "pong",
                ref: pongAgentDefinitionId,
                refType: "AGENT",
              },
            ],
          },
        },
      );
      const teamDefinitionId = teamDefResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(teamDefinitionId);

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
              memberName: "ping",
              agentDefinitionId: pingAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: false,
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
            {
              memberName: "pong",
              agentDefinitionId: pongAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: false,
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
      const teamSocket = new WebSocket(`ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`);
      await waitForSocketOpen(teamSocket);

      const streamMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];
      const approvedInvocationIds = new Set<string>();
      teamSocket.on("message", (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as {
            type?: unknown;
            payload?: unknown;
          };
          if (typeof parsed.type !== "string") {
            return;
          }
          const payload =
            parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          streamMessages.push({
            type: parsed.type,
            payload,
          });

          if (
            parsed.type === "TOOL_APPROVAL_REQUESTED" &&
            typeof payload.invocation_id === "string" &&
            payload.invocation_id.length > 0
          ) {
            if (!approvedInvocationIds.has(payload.invocation_id)) {
              approvedInvocationIds.add(payload.invocation_id);
              teamSocket.send(
                JSON.stringify({
                  type: "APPROVE_TOOL",
                  payload: {
                    invocation_id: payload.invocation_id,
                    ...(typeof payload.agent_name === "string" && payload.agent_name.length > 0
                      ? { agent_name: payload.agent_name }
                      : {}),
                    reason: "claude-team-send-message-approval-e2e",
                  },
                }),
              );
            }
          }
        } catch {
          // ignore malformed rows in stream capture
        }
      });

      const sendMessageToTeamMutation = `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;
      const sendRelayInstruction = async (input: {
        targetMemberName: "ping" | "pong";
        recipientName: "ping" | "pong";
        messageType: string;
        content: string;
      }): Promise<void> => {
        const argsJson = JSON.stringify({
          recipient_name: input.recipientName,
          content: input.content,
          message_type: input.messageType,
        });
        const result = await execGraphql<{
          sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: input.targetMemberName,
            userInput: {
              content:
                "Call send_message_to exactly once now with these exact JSON arguments: " +
                `${argsJson}. Do not call any other tool.`,
              contextFiles: [],
            },
          },
        });
        expect(result.sendMessageToTeam.success).toBe(true);
      };

      const waitForTeamStreamEvent = async (
        predicate: (message: { type: string; payload: Record<string, unknown> }) => boolean,
        label: string,
      ): Promise<void> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          if (streamMessages.some(predicate)) {
            return;
          }
          await wait(500);
        }
        const preview = streamMessages
          .slice(-20)
          .map((entry) => `${entry.type}:${JSON.stringify(entry.payload).slice(0, 200)}`)
          .join(" | ");
        throw new Error(`Timed out waiting for team websocket event '${label}'. preview='${preview}'`);
      };

      const waitForSendMessageLifecycleAndReceipt = async (input: {
        senderMemberName: "ping" | "pong";
        recipientMemberName: "ping" | "pong";
        content: string;
      }): Promise<void> => {
        await waitForTeamStreamEvent(
          (message) =>
            message.type === "TOOL_APPROVAL_REQUESTED" &&
            message.payload.agent_name === input.senderMemberName &&
            message.payload.tool_name === "send_message_to",
          `${input.senderMemberName} TOOL_APPROVAL_REQUESTED`,
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "TOOL_APPROVED" &&
            message.payload.agent_name === input.senderMemberName &&
            message.payload.tool_name === "send_message_to",
          `${input.senderMemberName} TOOL_APPROVED`,
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "SEGMENT_START" &&
            message.payload.agent_name === input.senderMemberName &&
            message.payload.segment_type === "tool_call" &&
            (message.payload.metadata as Record<string, unknown> | undefined)?.tool_name ===
              "send_message_to" &&
            ((message.payload.metadata as Record<string, unknown> | undefined)?.arguments as
              | Record<string, unknown>
              | undefined)?.recipient_name === input.recipientMemberName &&
            ((message.payload.metadata as Record<string, unknown> | undefined)?.arguments as
              | Record<string, unknown>
              | undefined)?.content === input.content,
          `${input.senderMemberName} send_message_to SEGMENT_START`,
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "INTER_AGENT_MESSAGE" &&
            message.payload.agent_name === input.recipientMemberName &&
            typeof message.payload.sender_agent_id === "string" &&
            (message.payload.sender_agent_id as string).trim().length > 0 &&
            message.payload.sender_agent_name === input.senderMemberName &&
            message.payload.recipient_role_name === input.recipientMemberName &&
            message.payload.content === input.content,
          `${input.recipientMemberName} INTER_AGENT_MESSAGE`,
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "TOOL_EXECUTION_SUCCEEDED" &&
            message.payload.agent_name === input.senderMemberName &&
            message.payload.tool_name === "send_message_to",
          `${input.senderMemberName} send_message_to TOOL_EXECUTION_SUCCEEDED`,
        );

        const hasUnknownToolSuccess = streamMessages.some(
          (message) =>
            message.type === "TOOL_EXECUTION_SUCCEEDED" &&
            message.payload.agent_name === input.senderMemberName &&
            message.payload.tool_name === "unknown_tool",
        );
        expect(hasUnknownToolSuccess).toBe(false);

        const hasMcpPrefixedSuccess = streamMessages.some(
          (message) =>
            message.type === "TOOL_EXECUTION_SUCCEEDED" &&
            message.payload.agent_name === input.senderMemberName &&
            message.payload.tool_name === "mcp__autobyteus_team__send_message_to",
        );
        expect(hasMcpPrefixedSuccess).toBe(false);
      };

      const pingToken = `ROUNDTRIP_PING:${unique}`;
      const pongToken = `ROUNDTRIP_PONG:${unique}`;

      try {
        await sendRelayInstruction({
          targetMemberName: "ping",
          recipientName: "pong",
          content: `PING-TO-PONG ${pingToken}`,
          messageType: "roundtrip_ping",
        });
        await waitForSendMessageLifecycleAndReceipt({
          senderMemberName: "ping",
          recipientMemberName: "pong",
          content: `PING-TO-PONG ${pingToken}`,
        });

        await sendRelayInstruction({
          targetMemberName: "pong",
          recipientName: "ping",
          content: `PONG-TO-PING ${pongToken}`,
          messageType: "roundtrip_pong",
        });
        await waitForSendMessageLifecycleAndReceipt({
          senderMemberName: "pong",
          recipientMemberName: "ping",
          content: `PONG-TO-PING ${pongToken}`,
        });
      } finally {
        teamSocket.close();
        await streamApp.close();
      }
    },
    180_000,
  );

  it(
    "auto-approves send_message_to in Claude team runtime when autoExecuteTools is enabled",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-auto-approve-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const instructions = `
You are participating in a two-agent team validation in a team with members "ping" and "pong".

Rules:
1. Follow direct user instructions exactly.
2. You must not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. If the user asks you to call send_message_to with explicit arguments, call send_message_to exactly once with those exact arguments and do not call any other tool.
5. Keep assistant text responses very short.
`;

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const pingDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-auto-approve-ping-${unique}`,
            role: "assistant",
            description: "Claude ping agent for auto-approve validation.",
            instructions,
          },
        },
      );
      const pongDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-auto-approve-pong-${unique}`,
            role: "assistant",
            description: "Claude pong agent for auto-approve validation.",
            instructions,
          },
        },
      );
      const pingAgentDefinitionId = pingDefResult.createAgentDefinition.id;
      const pongAgentDefinitionId = pongDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(pingAgentDefinitionId);
      createdAgentDefinitionIds.add(pongAgentDefinitionId);

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;
      const teamDefResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `claude-auto-approve-team-${unique}`,
            description: "Live Claude inter-agent auto-approve validation team.",
            instructions: "Coordinate ping and pong to execute directed send_message_to hops.",
            coordinatorMemberName: "ping",
            nodes: [
              {
                memberName: "ping",
                ref: pingAgentDefinitionId,
                refType: "AGENT",
              },
              {
                memberName: "pong",
                ref: pongAgentDefinitionId,
                refType: "AGENT",
              },
            ],
          },
        },
      );
      const teamDefinitionId = teamDefResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(teamDefinitionId);

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
              memberName: "ping",
              agentDefinitionId: pingAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
            {
              memberName: "pong",
              agentDefinitionId: pongAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
      const teamSocket = new WebSocket(`ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`);
      await waitForSocketOpen(teamSocket);

      const streamMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];
      teamSocket.on("message", (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as {
            type?: unknown;
            payload?: unknown;
          };
          if (typeof parsed.type !== "string") {
            return;
          }
          const payload =
            parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          streamMessages.push({
            type: parsed.type,
            payload,
          });
        } catch {
          // ignore malformed rows in stream capture
        }
      });

      const sendMessageToTeamMutation = `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;
      const token = `AUTO_APPROVE_SEND_MESSAGE_TO:${unique}`;
      const argsJson = JSON.stringify({
        recipient_name: "pong",
        content: token,
        message_type: "auto_approve_roundtrip",
      });

      const waitForTeamStreamEvent = async (
        predicate: (message: { type: string; payload: Record<string, unknown> }) => boolean,
        label: string,
      ): Promise<void> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          if (streamMessages.some(predicate)) {
            return;
          }
          await wait(500);
        }
        const preview = streamMessages
          .slice(-20)
          .map((entry) => `${entry.type}:${JSON.stringify(entry.payload).slice(0, 200)}`)
          .join(" | ");
        throw new Error(`Timed out waiting for team websocket event '${label}'. preview='${preview}'`);
      };

      try {
        const sendResult = await execGraphql<{
          sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: "ping",
            userInput: {
              content:
                "Call send_message_to exactly once now with these exact JSON arguments: " +
                `${argsJson}. Do not call any other tool.`,
              contextFiles: [],
            },
          },
        });
        expect(sendResult.sendMessageToTeam.success).toBe(true);

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "SEGMENT_START" &&
            message.payload.agent_name === "ping" &&
            message.payload.segment_type === "tool_call" &&
            (message.payload.metadata as Record<string, unknown> | undefined)?.tool_name ===
              "send_message_to",
          "ping send_message_to SEGMENT_START",
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "INTER_AGENT_MESSAGE" &&
            message.payload.agent_name === "pong" &&
            message.payload.sender_agent_name === "ping" &&
            message.payload.content === token,
          "pong INTER_AGENT_MESSAGE",
        );

        await wait(1_000);

        const hasCanonicalSendMessageSuccess = streamMessages.some(
          (message) =>
            message.type === "TOOL_EXECUTION_SUCCEEDED" &&
            message.payload.agent_name === "ping" &&
            message.payload.tool_name === "send_message_to",
        );
        expect(hasCanonicalSendMessageSuccess).toBe(true);

        const hasApprovalRequest = streamMessages.some(
          (message) =>
            message.type === "TOOL_APPROVAL_REQUESTED" &&
            message.payload.agent_name === "ping" &&
            message.payload.tool_name === "send_message_to",
        );
        expect(hasApprovalRequest).toBe(false);

        const hasUnknownToolSuccess = streamMessages.some(
          (message) =>
            message.type === "TOOL_EXECUTION_SUCCEEDED" &&
            message.payload.agent_name === "ping" &&
            message.payload.tool_name === "unknown_tool",
        );
        expect(hasUnknownToolSuccess).toBe(false);

        const hasMcpPrefixedSuccess = streamMessages.some(
          (message) =>
            message.type === "TOOL_EXECUTION_SUCCEEDED" &&
            message.payload.agent_name === "ping" &&
            message.payload.tool_name === "mcp__autobyteus_team__send_message_to",
        );
        expect(hasMcpPrefixedSuccess).toBe(false);
      } finally {
        teamSocket.close();
        await streamApp.close();
      }
    },
    180_000,
  );

  it(
    "preserves workspace mapping across create->send->terminate->continue for Claude team runs created with workspaceId",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-workspaceid-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const createWorkspaceMutation = `
        mutation CreateWorkspace($input: CreateWorkspaceInput!) {
          createWorkspace(input: $input) {
            workspaceId
          }
        }
      `;
      const createWorkspaceResult = await execGraphql<{
        createWorkspace: { workspaceId: string };
      }>(createWorkspaceMutation, {
        input: {
          rootPath: workspaceRootPath,
        },
      });
      const workspaceId = createWorkspaceResult.createWorkspace.workspaceId;
      expect(workspaceId).toBeTruthy();

      const instructions = "Reply concisely in one sentence.";

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-professor-${unique}`,
            role: "assistant",
            description: "Claude team workspace lifecycle professor agent.",
            instructions,
          },
        },
      );
      const professorAgentDefinitionId = professorDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(professorAgentDefinitionId);

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;
      const teamDefinitionResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `claude-workspace-team-${unique}`,
            description: "Claude workspace lifecycle validation team.",
            instructions: "Coordinate workspace lifecycle checks.",
            coordinatorMemberName: "professor",
            nodes: [
              {
                memberName: "professor",
                ref: professorAgentDefinitionId,
                refType: "AGENT",
              },
            ],
          },
        },
      );
      const teamDefinitionId = teamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(teamDefinitionId);

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
              memberName: "professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "claude_agent_sdk",
              workspaceId,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const sendMessageToTeamMutation = `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;
      const terminateTeamRunMutation = `
        mutation TerminateAgentTeamRun($id: String!) {
          terminateAgentTeamRun(id: $id) {
            success
            message
          }
        }
      `;
      const listTeamRunHistoryQuery = `
        query ListTeamRunHistory {
          listTeamRunHistory {
            teamRunId
            workspaceRootPath
            members {
              memberName
              workspaceRootPath
            }
          }
        }
      `;
      const teamResumeQuery = `
        query TeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) {
            teamRunId
            isActive
            manifest
          }
        }
      `;

      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
      const teamSocket = new WebSocket(`ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`);
      await waitForSocketOpen(teamSocket);

      const teamMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];
      teamSocket.on("message", (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as {
            type?: unknown;
            payload?: unknown;
          };
          if (typeof parsed.type !== "string") {
            return;
          }
          const payload =
            parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          teamMessages.push({
            type: parsed.type,
            payload,
          });
        } catch {
          // ignore malformed rows in stream capture
        }
      });
      let resumedTeamSocket: WebSocket | null = null;

      const waitForProfessorTurnOutput = async (
        expectedToken: string,
        startIndex: number,
        messageBuffer: Array<{ type: string; payload: Record<string, unknown> }>,
      ): Promise<void> => {
        const deadline = Date.now() + 120_000;
        let lastSawRunning = false;
        let lastSawIdle = false;
        let lastOutput = "";
        while (Date.now() < deadline) {
          const phaseMessages = messageBuffer.slice(startIndex);
          const sawRunning = phaseMessages.some(
            (message) =>
              message.type === "AGENT_STATUS" &&
              message.payload.agent_name === "professor" &&
              message.payload.new_status === "RUNNING",
          );
          const sawIdle = phaseMessages.some(
            (message) =>
              message.type === "AGENT_STATUS" &&
              message.payload.agent_name === "professor" &&
              message.payload.new_status === "IDLE",
          );
          const output = phaseMessages
            .filter(
              (message) =>
                (message.type === "SEGMENT_CONTENT" || message.type === "SEGMENT_END") &&
                message.payload.agent_name === "professor",
            )
            .map((message) => {
              const delta = message.payload.delta;
              if (typeof delta === "string") {
                return delta;
              }
              const text = message.payload.text;
              if (typeof text === "string") {
                return text;
              }
              return "";
            })
            .join("")
            .trim();
          lastSawRunning = sawRunning;
          lastSawIdle = sawIdle;
          lastOutput = output;

          if (sawRunning && sawIdle && output.length > 0) {
            expect(output.toUpperCase()).toContain(expectedToken.toUpperCase());
            return;
          }
          await wait(500);
        }
        throw new Error(
          `Timed out waiting for professor output containing '${expectedToken}' (running=${String(lastSawRunning)} idle=${String(lastSawIdle)} outputLength=${String(lastOutput.length)} recentTypes=${messageBuffer
            .slice(Math.max(startIndex, messageBuffer.length - 12))
            .map((message) => message.type)
            .join(",")}).`,
        );
      };

      try {
        let phaseStart = teamMessages.length;
        const firstSendResult = await execGraphql<{
          sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: "professor",
            userInput: {
              content: `Reply with exactly READY-FIRST-${unique}.`,
              contextFiles: [],
            },
          },
        });
        expect(firstSendResult.sendMessageToTeam.success).toBe(true);
        expect(firstSendResult.sendMessageToTeam.teamRunId).toBe(teamRunId);
        await waitForProfessorTurnOutput(`READY-FIRST-${unique}`, phaseStart, teamMessages);

        const deadline = Date.now() + 120_000;
        let matchedRow:
          | {
              teamRunId: string;
              workspaceRootPath: string | null;
              members: Array<{ memberName: string; workspaceRootPath: string | null }>;
            }
          | null = null;
        while (Date.now() < deadline) {
          const listResult = await execGraphql<{
            listTeamRunHistory: Array<{
              teamRunId: string;
              workspaceRootPath: string | null;
              members: Array<{ memberName: string; workspaceRootPath: string | null }>;
            }>;
          }>(listTeamRunHistoryQuery);
          matchedRow = listResult.listTeamRunHistory.find((row) => row.teamRunId === teamRunId) ?? null;
          if (
            matchedRow &&
            matchedRow.workspaceRootPath === workspaceRootPath &&
            matchedRow.members.every((member) => member.workspaceRootPath === workspaceRootPath)
          ) {
            break;
          }
          await wait(2_000);
        }

        expect(matchedRow).toBeTruthy();
        expect(matchedRow?.workspaceRootPath).toBe(workspaceRootPath);
        expect(matchedRow?.members.every((member) => member.workspaceRootPath === workspaceRootPath)).toBe(
          true,
        );

        const terminateResult = await execGraphql<{
          terminateAgentTeamRun: { success: boolean; message: string };
        }>(terminateTeamRunMutation, { id: teamRunId });
        expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

        const continuePhaseStart = teamMessages.length;
        const continueResult = await execGraphql<{
          sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: "professor",
            userInput: {
              content: `Reply with exactly READY-CONTINUE-${unique}.`,
              contextFiles: [],
            },
          },
        });
        expect(continueResult.sendMessageToTeam.success).toBe(true);
        expect(continueResult.sendMessageToTeam.teamRunId).toBe(teamRunId);
        await waitForProfessorTurnOutput(
          `READY-CONTINUE-${unique}`,
          continuePhaseStart,
          teamMessages,
        );

        teamSocket.close();

        const resumedTeamMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];
        resumedTeamSocket = new WebSocket(
          `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
        );
        await waitForSocketOpen(resumedTeamSocket);
        resumedTeamSocket.on("message", (raw) => {
          try {
            const parsed = JSON.parse(String(raw)) as {
              type?: unknown;
              payload?: unknown;
            };
            if (typeof parsed.type !== "string") {
              return;
            }
            const payload =
              parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
                ? (parsed.payload as Record<string, unknown>)
                : {};
            resumedTeamMessages.push({
              type: parsed.type,
              payload,
            });
          } catch {
            // ignore malformed rows in stream capture
          }
        });

        phaseStart = resumedTeamMessages.length;
        resumedTeamSocket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: `Reply with exactly READY-POST-CONTINUE-${unique}.`,
              target_member_name: "professor",
            },
          }),
        );
        await waitForProfessorTurnOutput(
          `READY-POST-CONTINUE-${unique}`,
          phaseStart,
          resumedTeamMessages,
        );

        const resumeResult = await execGraphql<{
          getTeamRunResumeConfig: {
            teamRunId: string;
            isActive: boolean;
            manifest: {
              workspaceRootPath: string | null;
              memberBindings: Array<{ memberName: string; workspaceRootPath: string | null }>;
            };
          };
        }>(teamResumeQuery, { teamRunId });

        expect(resumeResult.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
        expect(resumeResult.getTeamRunResumeConfig.manifest.workspaceRootPath).toBe(workspaceRootPath);
        expect(
          resumeResult.getTeamRunResumeConfig.manifest.memberBindings.every(
            (binding) => binding.workspaceRootPath === workspaceRootPath,
          ),
        ).toBe(true);
      } finally {
        teamSocket.close();
        resumedTeamSocket?.close();
        await streamApp.close();
      }
    },
    180_000,
  );

  it(
    "restores complete team-member projection history after two turns and terminate",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-history-projection-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const instructions = "Reply exactly with the requested token and no additional text.";

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-history-professor-${unique}`,
            role: "assistant",
            description: "Claude team-history projection professor agent.",
            instructions,
          },
        },
      );
      const professorAgentDefinitionId = professorDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(professorAgentDefinitionId);

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;
      const teamDefinitionResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `claude-history-team-${unique}`,
            description: "Claude team-member history projection validation team.",
            instructions: "Coordinate continuation and preserve member context.",
            coordinatorMemberName: "professor",
            nodes: [
              {
                memberName: "professor",
                ref: professorAgentDefinitionId,
                refType: "AGENT",
              },
            ],
          },
        },
      );
      const teamDefinitionId = teamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(teamDefinitionId);

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
              memberName: "professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const sendMessageToTeamMutation = `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;
      const terminateTeamRunMutation = `
        mutation TerminateAgentTeamRun($id: String!) {
          terminateAgentTeamRun(id: $id) {
            success
            message
          }
        }
      `;
      const getTeamMemberProjectionQuery = `
        query TeamMemberProjection($teamRunId: String!, $memberRouteKey: String!) {
          getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
            agentRunId
            summary
            lastActivityAt
            conversation
          }
        }
      `;

      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
      const teamSocket = new WebSocket(`ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`);
      await waitForSocketOpen(teamSocket);

      const teamMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];
      teamSocket.on("message", (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as {
            type?: unknown;
            payload?: unknown;
          };
          if (typeof parsed.type !== "string") {
            return;
          }
          const payload =
            parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          teamMessages.push({
            type: parsed.type,
            payload,
          });
        } catch {
          // ignore malformed rows in stream capture
        }
      });

      const waitForProfessorTurnOutput = async (
        expectedToken: string,
        startIndex: number,
      ): Promise<void> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const phaseMessages = teamMessages.slice(startIndex);
          const sawRunning = phaseMessages.some(
            (message) =>
              message.type === "AGENT_STATUS" &&
              message.payload.agent_name === "professor" &&
              message.payload.new_status === "RUNNING",
          );
          const sawIdle = phaseMessages.some(
            (message) =>
              message.type === "AGENT_STATUS" &&
              message.payload.agent_name === "professor" &&
              message.payload.new_status === "IDLE",
          );
          const output = phaseMessages
            .filter(
              (message) =>
                (message.type === "SEGMENT_CONTENT" || message.type === "SEGMENT_END") &&
                message.payload.agent_name === "professor",
            )
            .map((message) => {
              const delta = message.payload.delta;
              if (typeof delta === "string") {
                return delta;
              }
              const text = message.payload.text;
              if (typeof text === "string") {
                return text;
              }
              return "";
            })
            .join("")
            .trim();

          if (sawRunning && sawIdle && output.length > 0) {
            expect(output.toUpperCase()).toContain(expectedToken.toUpperCase());
            return;
          }

          await wait(500);
        }
        throw new Error(`Timed out waiting for professor output containing '${expectedToken}'.`);
      };

      const turnOneToken = `TEAM-HISTORY-TURN-ONE-${unique}`;
      const turnTwoToken = `TEAM-HISTORY-TURN-TWO-${unique}`;

      try {
        let phaseStart = teamMessages.length;
        const sendTurnOneResult = await execGraphql<{
          sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: "professor",
            userInput: {
              content: `Reply with exactly ${turnOneToken}.`,
              contextFiles: [],
            },
          },
        });
        expect(sendTurnOneResult.sendMessageToTeam.success).toBe(true);
        await waitForProfessorTurnOutput(turnOneToken, phaseStart);

        phaseStart = teamMessages.length;
        const sendTurnTwoResult = await execGraphql<{
          sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: "professor",
            userInput: {
              content: `Reply with exactly ${turnTwoToken}.`,
              contextFiles: [],
            },
          },
        });
        expect(sendTurnTwoResult.sendMessageToTeam.success).toBe(true);
        await waitForProfessorTurnOutput(turnTwoToken, phaseStart);

        const terminateResult = await execGraphql<{
          terminateAgentTeamRun: { success: boolean; message: string };
        }>(terminateTeamRunMutation, { id: teamRunId });
        expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

        simulateClaudeRuntimeRestart();

        const projectionDeadline = Date.now() + 120_000;
        let projection:
          | {
              agentRunId: string;
              conversation: Array<Record<string, unknown>>;
            }
          | null = null;

        while (Date.now() < projectionDeadline) {
          const projectionResult = await execGraphql<{
            getTeamMemberRunProjection: {
              agentRunId: string;
              conversation: Array<Record<string, unknown>>;
            };
          }>(getTeamMemberProjectionQuery, {
            teamRunId,
            memberRouteKey: "professor",
          });

          const candidate = projectionResult.getTeamMemberRunProjection;
          const serializedConversation = (candidate.conversation ?? [])
            .map((entry) => JSON.stringify(entry))
            .join("\n");

          if (
            (candidate.conversation ?? []).length >= 4 &&
            serializedConversation.includes(turnOneToken) &&
            serializedConversation.includes(turnTwoToken)
          ) {
            projection = candidate;
            break;
          }

          await wait(2_000);
        }

        expect(projection).toBeTruthy();
        expect((projection?.conversation ?? []).length).toBeGreaterThanOrEqual(4);
        const finalSerializedConversation = (projection?.conversation ?? [])
          .map((entry) => JSON.stringify(entry))
          .join("\n");
        expect(finalSerializedConversation).toContain(turnOneToken);
        expect(finalSerializedConversation).toContain(turnTwoToken);
      } finally {
        teamSocket.close();
        await streamApp.close();
      }
    },
    180_000,
  );

  it(
    "restores two-member team history after terminate/reopen and continues with full projection",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-two-member-history-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const instructions = `
You are in a two-member team ("professor", "student").
Rules:
1. If user asks for exact reply token, reply exactly that token.
2. If user asks to call send_message_to with explicit JSON args, call send_message_to exactly once with those args.
3. Do not run any other tool.
`;

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorDef = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-professor-history-${unique}`,
            role: "assistant",
            description: "Professor for two-member history restore test.",
            instructions,
          },
        },
      );
      const studentDef = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-student-history-${unique}`,
            role: "assistant",
            description: "Student for two-member history restore test.",
            instructions,
          },
        },
      );
      createdAgentDefinitionIds.add(professorDef.createAgentDefinition.id);
      createdAgentDefinitionIds.add(studentDef.createAgentDefinition.id);

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;
      const teamDef = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `claude-two-member-history-team-${unique}`,
            description: "Two-member history restore regression test.",
            instructions: "Coordinate professor and student for history restore validation.",
            coordinatorMemberName: "professor",
            nodes: [
              {
                memberName: "professor",
                ref: professorDef.createAgentDefinition.id,
                refType: "AGENT",
              },
              {
                memberName: "student",
                ref: studentDef.createAgentDefinition.id,
                refType: "AGENT",
              },
            ],
          },
        },
      );
      const teamDefinitionId = teamDef.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(teamDefinitionId);

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
              memberName: "professor",
              agentDefinitionId: professorDef.createAgentDefinition.id,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
            {
              memberName: "student",
              agentDefinitionId: studentDef.createAgentDefinition.id,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
          ],
        },
      });
      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      expect(teamRunId).toBeTruthy();
      createdTeamRunIds.add(teamRunId);

      const sendMessageToTeamMutation = `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;
      const terminateTeamRunMutation = `
        mutation TerminateAgentTeamRun($id: String!) {
          terminateAgentTeamRun(id: $id) {
            success
            message
          }
        }
      `;
      const getTeamMemberProjectionQuery = `
        query TeamMemberProjection($teamRunId: String!, $memberRouteKey: String!) {
          getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
            agentRunId
            summary
            lastActivityAt
            conversation
          }
        }
      `;

      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
      const teamSocket = new WebSocket(`ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`);
      await waitForSocketOpen(teamSocket);

      const streamMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];
      teamSocket.on("message", (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as {
            type?: unknown;
            payload?: unknown;
          };
          if (typeof parsed.type !== "string") {
            return;
          }
          const payload =
            parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          streamMessages.push({
            type: parsed.type,
            payload,
          });
        } catch {
          // ignore malformed messages
        }
      });

      const waitForEvent = async (
        predicate: (message: { type: string; payload: Record<string, unknown> }) => boolean,
        label: string,
      ): Promise<void> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          if (streamMessages.some(predicate)) {
            return;
          }
          await wait(500);
        }
        throw new Error(`Timed out waiting for ${label}.`);
      };

      const waitForAgentOutputToken = async (agentName: "professor" | "student", token: string): Promise<void> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const output = streamMessages
            .filter(
              (message) =>
                (message.type === "SEGMENT_CONTENT" || message.type === "SEGMENT_END") &&
                message.payload.agent_name === agentName,
            )
            .map((message) => {
              const delta = message.payload.delta;
              if (typeof delta === "string") {
                return delta;
              }
              const text = message.payload.text;
              return typeof text === "string" ? text : "";
            })
            .join("");
          if (output.toUpperCase().includes(token.toUpperCase())) {
            return;
          }
          await wait(500);
        }
        throw new Error(`Timed out waiting for ${agentName} output token '${token}'.`);
      };

      const fetchProjection = async (memberRouteKey: "professor" | "student") => {
        const result = await execGraphql<{
          getTeamMemberRunProjection: {
            conversation: Array<Record<string, unknown>>;
          };
        }>(getTeamMemberProjectionQuery, {
          teamRunId,
          memberRouteKey,
        });
        return result.getTeamMemberRunProjection;
      };

      const professorTurnOneToken = `TEAM-HISTORY-PROF-TURN-1-${unique}`;
      const professorTurnTwoToken = `TEAM-HISTORY-PROF-TURN-2-${unique}`;
      const studentTurnOneToken = `TEAM-HISTORY-STUDENT-TURN-1-${unique}`;
      const studentTurnTwoToken = `TEAM-HISTORY-STUDENT-TURN-2-${unique}`;
      const continueToken = `TEAM-HISTORY-CONTINUE-${unique}`;

      let resumedSocket: WebSocket | null = null;
      try {
        const sendExactTokenInstruction = async (
          targetMemberName: "professor" | "student",
          token: string,
        ): Promise<void> => {
          const sendResult = await execGraphql<{
            sendMessageToTeam: { success: boolean };
          }>(sendMessageToTeamMutation, {
            input: {
              teamRunId,
              targetMemberName,
              userInput: {
                content: `Reply with exactly ${token}.`,
                contextFiles: [],
              },
            },
          });
          expect(sendResult.sendMessageToTeam.success).toBe(true);
          await waitForAgentOutputToken(targetMemberName, token);
        };

        await sendExactTokenInstruction("professor", professorTurnOneToken);
        await sendExactTokenInstruction("professor", professorTurnTwoToken);
        await sendExactTokenInstruction("student", studentTurnOneToken);
        await sendExactTokenInstruction("student", studentTurnTwoToken);

        const terminateResult = await execGraphql<{
          terminateAgentTeamRun: { success: boolean };
        }>(terminateTeamRunMutation, { id: teamRunId });
        expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

        teamSocket.close();
        simulateClaudeRuntimeRestart();

        const projectionDeadline = Date.now() + 120_000;
        let professorProjection: { conversation: Array<Record<string, unknown>> } | null = null;
        let studentProjection: { conversation: Array<Record<string, unknown>> } | null = null;
        while (Date.now() < projectionDeadline) {
          const candidateProfessor = await fetchProjection("professor");
          const candidateStudent = await fetchProjection("student");
          const professorSerialized = candidateProfessor.conversation
            .map((entry) => JSON.stringify(entry))
            .join("\n");
          const studentSerialized = candidateStudent.conversation
            .map((entry) => JSON.stringify(entry))
            .join("\n");
          if (
            candidateProfessor.conversation.length >= 4 &&
            candidateStudent.conversation.length >= 4 &&
            professorSerialized.includes(professorTurnOneToken) &&
            professorSerialized.includes(professorTurnTwoToken) &&
            studentSerialized.includes(studentTurnOneToken) &&
            studentSerialized.includes(studentTurnTwoToken)
          ) {
            professorProjection = candidateProfessor;
            studentProjection = candidateStudent;
            break;
          }
          await wait(2_000);
        }

        expect(professorProjection).toBeTruthy();
        expect(studentProjection).toBeTruthy();

        resumedSocket = new WebSocket(`ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`);
        await waitForSocketOpen(resumedSocket);
        resumedSocket.on("message", (raw) => {
          try {
            const parsed = JSON.parse(String(raw)) as {
              type?: unknown;
              payload?: unknown;
            };
            if (typeof parsed.type !== "string") {
              return;
            }
            const payload =
              parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
                ? (parsed.payload as Record<string, unknown>)
                : {};
            streamMessages.push({
              type: parsed.type,
              payload,
            });
          } catch {
            // ignore malformed messages
          }
        });

        const continueResult = await execGraphql<{
          sendMessageToTeam: { success: boolean };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: "professor",
            userInput: {
              content: `Reply with exactly ${continueToken}.`,
              contextFiles: [],
            },
          },
        });
        expect(continueResult.sendMessageToTeam.success).toBe(true);

        const finalProjectionDeadline = Date.now() + 120_000;
        let finalProfessorProjection: { conversation: Array<Record<string, unknown>> } | null = null;
        while (Date.now() < finalProjectionDeadline) {
          const candidate = await fetchProjection("professor");
          const serialized = candidate.conversation
            .map((entry) => JSON.stringify(entry))
            .join("\n");
          if (
            candidate.conversation.length >= 6 &&
            serialized.includes(professorTurnOneToken) &&
            serialized.includes(professorTurnTwoToken) &&
            serialized.includes(continueToken)
          ) {
            finalProfessorProjection = candidate;
            break;
          }
          await wait(2_000);
        }

        expect(finalProfessorProjection).toBeTruthy();
      } finally {
        teamSocket.close();
        resumedSocket?.close();
        await streamApp.close();
      }
    },
    240_000,
  );
});
