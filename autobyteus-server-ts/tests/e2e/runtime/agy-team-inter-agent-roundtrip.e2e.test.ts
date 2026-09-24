import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
} from "../../../src/config/server-runtime-endpoints.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getTeamMemberRunViewProjectionService } from "../../../src/run-history/services/team-member-run-view-projection-service.js";
import { isE2eTeamCommunicationMessage } from "../helpers/team-communication-message-helpers.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

const agyBinaryReady =
  spawnSync("agy", ["--version"], {
    stdio: "ignore",
  }).status === 0;
const liveAgyTestsEnabled = process.env["RUN_AGY_E2E"] === "1";
const describeAgyRuntime =
  agyBinaryReady && liveAgyTestsEnabled ? describe : describe.skip;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForSocketOpen = (
  socket: WebSocket,
  timeoutMs = 10_000,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for websocket open")),
      timeoutMs,
    );
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const closeSocket = async (socket: WebSocket): Promise<void> => {
  if (socket.readyState === WebSocket.CLOSED) {
    return;
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 2_000);
    socket.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.close();
  });
};

const sendTeamMessageOverSocket = (
  socket: WebSocket,
  input: {
    content: string;
    agentRunId: string;
    contextFilePaths?: string[];
    imageUrls?: string[];
  },
): void => {
  sendE2eSendMessageCommand(socket, {
    content: input.content,
    agent_run_id: input.agentRunId,
    context_file_paths: input.contextFilePaths ?? [],
    image_urls: input.imageUrls ?? [],
  });
};

describeAgyRuntime(
  "AGY team inter-agent roundtrip e2e (live transport)",
  () => {
    let schema: GraphQLSchema;
    let graphql: typeof graphqlFn;
    let testDataDir: string | null = null;
    let runtimeServerApp: FastifyInstance | null = null;
    let runtimeServerUrl: URL;
    let originalInternalServerBaseUrl: string | undefined;
    const createdAgentDefinitionIds = new Set<string>();
    const createdTeamDefinitionIds = new Set<string>();
    const createdTeamRunIds = new Set<string>();
    const createdWorkspaceRoots = new Set<string>();

    beforeAll(async () => {
      originalInternalServerBaseUrl =
        process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
      testDataDir = await mkdtemp(
        path.join(os.tmpdir(), "agy-team-runtime-e2e-appdata-"),
      );
      await writeFile(
        path.join(testDataDir, ".env"),
        "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
        "utf-8",
      );
      appConfigProvider.config.setCustomAppDataDir(testDataDir);
      const require = createRequire(import.meta.url);
      const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
      const graphqlPath = require.resolve("graphql", {
        paths: [typeGraphqlRoot],
      });
      const graphqlModule = await import(graphqlPath);
      graphql = graphqlModule.graphql as typeof graphqlFn;

      const started = await startStudioE2eRuntimeServer();
      runtimeServerApp = started.fastify;
      runtimeServerUrl = started.mainUrl;
      schema = await buildGraphqlSchema();
    });

    afterAll(async () => {
      if (originalInternalServerBaseUrl) {
        process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] =
          originalInternalServerBaseUrl;
      } else {
        delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
      }
      if (runtimeServerApp) {
        await runtimeServerApp.close();
        runtimeServerApp = null;
      }
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
      const exec = async <T>(
        query: string,
        variables?: Record<string, unknown>,
      ): Promise<T | null> => {
        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
        });
        return result.errors?.length ? null : (result.data as T);
      };

      const terminateTeamRunMutation = `
      mutation TerminateAgentTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) {
          success
        }
      }
    `;
      for (const teamRunId of createdTeamRunIds) {
        await exec(terminateTeamRunMutation, { teamRunId });
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

      for (const root of createdWorkspaceRoots) {
        await rm(root, { recursive: true, force: true });
      }
      createdWorkspaceRoots.clear();
    });

    const execGraphql = async <T>(
      query: string,
      variables?: Record<string, unknown>,
    ): Promise<T> => {
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


    const fetchPreferredAgyToolModelIdentifier = async (): Promise<string> => {
      const result = await execGraphql<{
        providerModelCatalogSnapshots: Array<{ llmModels: Array<{ modelIdentifier: string }> }>;
      }>(`query Models($runtimeKind: String) {
        providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
          llmModels { modelIdentifier }
        }
      }`, { runtimeKind: "antigravity_cli" });
      const models = result.providerModelCatalogSnapshots.flatMap(provider => provider.llmModels.map(model => model.modelIdentifier));
      const override = process.env["AGY_E2E_TOOL_MODEL"]?.trim();
      if (override && models.includes(override)) return override;
      if (models.includes("gemini-3.8-flash-low")) return "gemini-3.8-flash-low";
      if (models.length === 0) throw new Error("No available AGY model in GraphQL catalog");
      return models[0]!;
    };

    it("routes a real scoped AGY send_message_to to another Team member over GraphQL/WebSocket", async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredAgyToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), "agy-team-roundtrip-e2e-"),
      );
      createdWorkspaceRoots.add(workspaceRootPath);

      const teamInstructions = `
You are participating in a two-agent team roundtrip validation in a team with members "ping" and "pong".

Rules:
1. Follow direct user instructions exactly.
2. You must not explore the environment or run diagnostics.
3. Use the AutoByteus agent tools MCP server for teammate delivery; do not use provider-native subagent routing.
4. You may read the MCP tool schema if needed. Invoke call_mcp_tool for ServerName autobyteus_agent_tools and ToolName send_message_to exactly once with the requested arguments.
5. Do not execute shell, file-write, or unrelated tools.
6. If you receive a teammate message, do not call any tool; reply with exactly ACK.
7. Keep assistant text responses very short.
`;

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const pingAgentDefResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `agy-ping-${unique}`,
          role: "assistant",
          description:
            "AGY ping agent for live inter-agent roundtrip validation.",
          instructions: teamInstructions,
          toolNames: ["send_message_to"],
        },
      });
      const pongAgentDefResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `agy-pong-${unique}`,
          role: "assistant",
          description:
            "AGY pong agent for live inter-agent roundtrip validation.",
          instructions: teamInstructions,
          toolNames: ["send_message_to"],
        },
      });
      const pingAgentDefinitionId = pingAgentDefResult.createAgentDefinition.id;
      const pongAgentDefinitionId = pongAgentDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(pingAgentDefinitionId);
      createdAgentDefinitionIds.add(pongAgentDefinitionId);

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
          name: `agy-roundtrip-team-${unique}`,
          description: "Live agy inter-agent roundtrip validation team.",
          instructions:
            "Coordinate ping and pong to execute directed send_message_to hops.",
          coordinatorMemberName: "ping",
          nodes: [
            {
              memberName: "ping",
              ref: pingAgentDefinitionId,
              refScope: "SHARED",
            },
            {
              memberName: "pong",
              ref: pongAgentDefinitionId,
              refScope: "SHARED",
            },
          ],
        },
      });
      const teamDefinitionId =
        teamDefinitionResult.createAgentTeamDefinition.id;
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
        createAgentTeamRun: {
          success: boolean;
          message: string;
          teamRunId: string | null;
        };
      }>(createTeamRunMutation, {
        input: {
          teamDefinitionId,
          teamConfigs: [
            {
              teamAddress: "/",
              llmModelIdentifier: modelIdentifier,
              llmConfig: {},
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "antigravity_cli",
              workspaceRootPath,
            },
          ],
          memberConfigs: [
            {
              memberAddress: "/ping",
              agentDefinitionId: pingAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: {},
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "antigravity_cli",
              workspaceRootPath,
            },
            {
              memberAddress: "/pong",
              agentDefinitionId: pongAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: {},
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "antigravity_cli",
              workspaceRootPath,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun
        .teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const teamResumeQuery = `
        query TeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) {
            executionTree
          }
        }
      `;
      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(teamResumeQuery, { teamRunId });
      const members = flattenE2eConfiguredAgentExecutions(
        resumeResult.getTeamRunResumeConfig.executionTree,
      );
      const memberRunIdByName = new Map(
        members.map((member) => [member.memberName, member.agentRunId]),
      );
      expect(memberRunIdByName.get("ping")).toBeTruthy();
      expect(memberRunIdByName.get("pong")).toBeTruthy();

      const pingToken = `ROUNDTRIP_PING:${unique}`;
      const streamUrl = runtimeServerUrl;
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);
      const streamMessages: Array<{
        type: string;
        payload: Record<string, unknown>;
      }> = [];
      teamSocket.on("message", (raw: unknown) => {
        try {
          const parsed = JSON.parse(String(raw)) as {
            type?: unknown;
            payload?: unknown;
          };
          if (typeof parsed.type !== "string") {
            return;
          }
          const payload =
            parsed.payload &&
            typeof parsed.payload === "object" &&
            !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          streamMessages.push({
            type: parsed.type,
            payload,
          });
        } catch {
          // ignore malformed rows in test stream capture
        }
      });

      const sendRelayInstruction = async (input: {
        targetMemberRouteKey: "ping" | "pong";
        recipientName: "ping" | "pong";
        messageType: string;
        content: string;
      }): Promise<void> => {
        const argsJson = JSON.stringify({
          recipient_address: `/${input.recipientName}`,
          content: input.content,
          message_type: input.messageType,
        });
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: memberRunIdByName.get(input.targetMemberRouteKey) as string,
          content:
            "Use the AutoByteus agent tools MCP call_mcp_tool with ServerName autobyteus_agent_tools and ToolName send_message_to exactly once now with these exact tool arguments: " +
            `${argsJson}. You may read the MCP schema if needed; do not use unrelated tools.`,
        });
      };

      const waitForTeamStreamEvent = async (
        predicate: (message: {
          type: string;
          payload: Record<string, unknown>;
        }) => boolean,
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
          .map(
            (entry) =>
              `${entry.type}:${JSON.stringify(entry.payload).slice(0, 200)}`,
          )
          .join(" | ");
        const lifecyclePreview = streamMessages
          .filter((entry) =>
            [
              "SEGMENT_START",
              "TOOL_EXECUTION_STARTED",
              "TOOL_EXECUTION_SUCCEEDED",
              "TOOL_EXECUTION_FAILED",
              "TEAM_COMMUNICATION_MESSAGE",
              "MEMBER_INPUT_MESSAGE",
              "ASSISTANT_COMPLETE",
            ].includes(entry.type),
          )
          .map((entry) => `${entry.type}:${JSON.stringify(entry.payload)}`)
          .join(" | ");
        throw new Error(
          `Timed out waiting for team websocket event '${label}'. preview='${preview}'. lifecycle='${lifecyclePreview}'`,
        );
      };

      const waitForSendMessageLifecycleAndReceipt = async (input: {
        senderMemberName: "ping" | "pong";
        recipientMemberName: "ping" | "pong";
        content: string;
        startIndex: number;
      }): Promise<void> => {
        const senderRunId = memberRunIdByName.get(input.senderMemberName);
        const recipientRunId = memberRunIdByName.get(input.recipientMemberName);
        const isMatchingMcpCall = (message: { type: string; payload: Record<string, unknown> }): boolean => {
          if (message.type !== "TOOL_EXECUTION_STARTED" ||
              message.payload["agent_run_id"] !== senderRunId ||
              message.payload["tool_name"] !== "call_mcp_tool") return false;
          const parameters = message.payload["arguments"];
          if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) return false;
          const args = parameters as Record<string, unknown>;
          const toolArguments = args["Arguments"];
          if (!toolArguments || typeof toolArguments !== "object" || Array.isArray(toolArguments)) return false;
          const call = toolArguments as Record<string, unknown>;
          return args["ServerName"] === "autobyteus_agent_tools" &&
            args["ToolName"] === "send_message_to" &&
            call["recipient_address"] === `/${input.recipientMemberName}` &&
            call["content"] === input.content;
        };
        await waitForTeamStreamEvent(
          (message) => streamMessages.indexOf(message) >= input.startIndex && isMatchingMcpCall(message),
          `${input.senderMemberName} AGY call_mcp_tool send_message_to start`,
        );
        const started = streamMessages.find((message) =>
          streamMessages.indexOf(message) >= input.startIndex && isMatchingMcpCall(message));
        expect(started).toBeDefined();
        const invocationId = started?.payload["invocation_id"];
        expect(typeof invocationId).toBe("string");
        const isMatchingToolTerminal = (message: { type: string; payload: Record<string, unknown> }): boolean =>
          message.payload["agent_run_id"] === senderRunId &&
          message.payload["tool_name"] === "call_mcp_tool" &&
          message.payload["invocation_id"] === invocationId;
        const isReceipt = (message: { type: string; payload: Record<string, unknown> }): boolean =>
          isE2eTeamCommunicationMessage(message, {
            senderAgentRunId: senderRunId as string,
            recipientAgentRunId: recipientRunId as string,
            content: input.content,
          });
        await waitForTeamStreamEvent(
          (message) => streamMessages.indexOf(message) >= input.startIndex && isReceipt(message),
          `${input.recipientMemberName} real TEAM_COMMUNICATION_MESSAGE`,
        );
        const receipt = streamMessages.find((message) =>
          streamMessages.indexOf(message) >= input.startIndex && isReceipt(message));
        const receiptIndex = receipt ? streamMessages.indexOf(receipt) : -1;
        expect(receiptIndex).toBeGreaterThanOrEqual(input.startIndex);
        await waitForTeamStreamEvent(
          (message) => message.type === "TOOL_EXECUTION_SUCCEEDED" && isMatchingToolTerminal(message),
          `${input.senderMemberName} AGY call_mcp_tool success`,
        );
        await waitForTeamStreamEvent(
          (message) => streamMessages.indexOf(message) > receiptIndex &&
            message.type === "TURN_COMPLETED" && message.payload["agent_run_id"] === recipientRunId,
          `${input.recipientMemberName} response TURN_COMPLETED`,
        );
        expect(streamMessages.filter((message) => isMatchingMcpCall(message))).toHaveLength(1);
        expect(streamMessages.filter((message) => message.type === "TOOL_EXECUTION_SUCCEEDED" &&
          isMatchingToolTerminal(message))).toHaveLength(1);
        expect(streamMessages.filter((message) => message.type === "TOOL_EXECUTION_FAILED" &&
          isMatchingToolTerminal(message))).toHaveLength(0);
      };

      const activateMember = async (memberName: "ping" | "pong"): Promise<void> => {
        const agentRunId = memberRunIdByName.get(memberName);
        expect(agentRunId).toBeTruthy();
        const startIndex = streamMessages.length;
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: agentRunId as string,
          content: "Reply with exactly READY and nothing else.",
        });
        await waitForTeamStreamEvent(
          (message) =>
            streamMessages.indexOf(message) >= startIndex &&
            message.type === "TURN_COMPLETED" &&
            message.payload["agent_run_id"] === agentRunId,
          `${memberName} activation TURN_COMPLETED`,
        );
      };

      try {
        // Exact AgentRun targeting is supported only after the configured
        // recipient has a live runtime handle.
        await activateMember("ping");
        await activateMember("pong");
        const relayStartIndex = streamMessages.length;
        await sendRelayInstruction({
          targetMemberRouteKey: "ping",
          recipientName: "pong",
          content: `PING-TO-PONG ${pingToken}`,
          messageType: "roundtrip_ping",
        });
        await waitForSendMessageLifecycleAndReceipt({
          senderMemberName: "ping",
          recipientMemberName: "pong",
          content: `PING-TO-PONG ${pingToken}`,
          startIndex: relayStartIndex,
        });
        const waitForPersistedToken = async (memberName: "ping" | "pong"): Promise<void> => {
          const agentRunId = memberRunIdByName.get(memberName) as string;
          for (let attempt = 0; attempt < 120; attempt++) {
            const projection = await getTeamMemberRunViewProjectionService().getProjection(teamRunId, agentRunId);
            if (JSON.stringify(projection.conversation).includes(pingToken)) return;
            await wait(500);
          }
          throw new Error(`Missing persisted ${pingToken} in ${memberName} member projection`);
        };
        await waitForPersistedToken("ping");
        await waitForPersistedToken("pong");
      } finally {
        await closeSocket(teamSocket);
      }
    }, 300_000);
  });
