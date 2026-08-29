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

const codexBinaryReady =
  spawnSync("codex", ["--version"], {
    stdio: "ignore",
  }).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexRuntime =
  codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;
const originalCodexApprovalPolicy =
  process.env.CODEX_APP_SERVER_APPROVAL_POLICY;

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
    socket.once("error", (error) => {
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

describeCodexRuntime(
  "Codex team inter-agent roundtrip e2e (live transport)",
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
      // Keep a restrictive saved approval policy in this fixture while relying on
      // autoExecuteTools=true to provide Codex high-trust access. Team routing safety
      // comes from thread-scoped Agent Tools MCP exposure for send_message_to, not
      // from downgrading Codex shell/file approvals for team members.
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
      testDataDir = await mkdtemp(
        path.join(os.tmpdir(), "codex-team-runtime-e2e-appdata-"),
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
      if (typeof originalCodexApprovalPolicy === "string") {
        process.env.CODEX_APP_SERVER_APPROVAL_POLICY =
          originalCodexApprovalPolicy;
      } else {
        delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
      }
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

    const fetchPreferredCodexToolModelIdentifier =
      async (requiredReasoningEffort?: string): Promise<string> => {
        const query = `
      query Models($runtimeKind: String) {
        providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
          llmModels {
            modelIdentifier
            configSchema
          }
        }
      }
    `;

        const result = await execGraphql<{
          providerModelCatalogSnapshots: Array<{
            llmModels: Array<{
              modelIdentifier: string;
              configSchema?: {
                parameters?: Array<{
                  name?: string;
                  enum_values?: unknown[];
                }>;
              } | null;
            }>;
          }>;
        }>(query, {
          runtimeKind: "codex_app_server",
        });

        const allModels = result.providerModelCatalogSnapshots.flatMap(
          (provider) =>
            provider.llmModels.filter(
              (model) => model.modelIdentifier.length > 0,
            ),
        );
        const eligibleModels = requiredReasoningEffort
          ? allModels.filter((model) =>
              model.configSchema?.parameters
                ?.find((parameter) => parameter.name === "reasoning_effort")
                ?.enum_values?.includes(requiredReasoningEffort),
            )
          : allModels;
        const eligibleModelIdentifiers = eligibleModels.map(
          (model) => model.modelIdentifier,
        );
        if (eligibleModelIdentifiers.length === 0) {
          throw new Error(
            requiredReasoningEffort
              ? `No Codex runtime model advertises reasoning effort '${requiredReasoningEffort}'.`
              : "No Codex runtime model was returned by providerModelCatalogSnapshots.",
          );
        }

        const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
        if (override && eligibleModelIdentifiers.includes(override)) {
          return override;
        }

        const preferredOrder = [
          "gpt-5.4-mini",
          "gpt-5.3-codex",
          "gpt-5.3-codex-spark",
          "gpt-5.2-codex",
          "gpt-5.1-codex-max",
          "gpt-5.1-codex-mini",
        ];
        for (const preferred of preferredOrder) {
          if (eligibleModelIdentifiers.includes(preferred)) {
            return preferred;
          }
        }

        const codexModel = eligibleModelIdentifiers.find((modelIdentifier) =>
          modelIdentifier.toLowerCase().includes("codex"),
        );
        return codexModel ?? eligibleModelIdentifiers[0]!;
      };

    it("preserves send_message_to ping->pong->ping invariants with ultra reasoning", async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier("ultra");
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), "codex-team-roundtrip-e2e-"),
      );
      createdWorkspaceRoots.add(workspaceRootPath);

      const teamInstructions = `
You are participating in a two-agent team roundtrip validation in a team with members "ping" and "pong".

Rules:
1. Follow direct user instructions exactly.
2. You must not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. Here send_message_to means the Agent Tools MCP server tool whose provider identifier is mcp__autobyteus_agent_tools__send_message_to. Never use Codex's built-in collaboration router.
5. If the user asks you to call the Agent Tools MCP send_message_to with explicit arguments, call it exactly once with those exact arguments and do not call any other tool.
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
          name: `codex-ping-${unique}`,
          role: "assistant",
          description:
            "Codex ping agent for live inter-agent roundtrip validation.",
          instructions: teamInstructions,
          toolNames: ["send_message_to"],
        },
      });
      const pongAgentDefResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `codex-pong-${unique}`,
          role: "assistant",
          description:
            "Codex pong agent for live inter-agent roundtrip validation.",
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
          name: `codex-roundtrip-team-${unique}`,
          description: "Live codex inter-agent roundtrip validation team.",
          instructions:
            "Coordinate ping and pong to execute directed send_message_to hops.",
          coordinatorMemberName: "ping",
          nodes: [
            {
              memberName: "ping",
              ref: pingAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
            {
              memberName: "pong",
              ref: pongAgentDefinitionId,
              refType: "AGENT",
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
              llmConfig: { reasoning_effort: "ultra" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
          ],
          memberConfigs: [
            {
              memberAddress: "/ping",
              agentDefinitionId: pingAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: { reasoning_effort: "ultra" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              memberAddress: "/pong",
              agentDefinitionId: pongAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: { reasoning_effort: "ultra" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
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
      const pongToken = `ROUNDTRIP_PONG:${unique}`;
      const streamUrl = runtimeServerUrl;
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);
      const streamMessages: Array<{
        type: string;
        payload: Record<string, unknown>;
      }> = [];
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
          target_agent_run_id: memberRunIdByName.get(input.recipientName),
          content: input.content,
          message_type: input.messageType,
        });
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: memberRunIdByName.get(input.targetMemberRouteKey) as string,
          content:
            "Call the Agent Tools MCP server tool mcp__autobyteus_agent_tools__send_message_to exactly once now with these exact JSON arguments: " +
            `${argsJson}. Do not call any other tool.`,
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
      }): Promise<void> => {
        const isMatchingSendMessageSegmentStart = (message: {
          type: string;
          payload: Record<string, unknown>;
        }): boolean => {
          if (message.type !== "SEGMENT_START") {
            return false;
          }
          if (
            message.payload.agent_run_id !==
            memberRunIdByName.get(input.senderMemberName)
          ) {
            return false;
          }
          if (message.payload.segment_type !== "tool_call") {
            return false;
          }
          const metadata =
            message.payload.metadata &&
            typeof message.payload.metadata === "object" &&
            !Array.isArray(message.payload.metadata)
              ? (message.payload.metadata as Record<string, unknown>)
              : {};
          if (metadata.tool_name !== "send_message_to") {
            return false;
          }
          const args =
            metadata.arguments &&
            typeof metadata.arguments === "object" &&
            !Array.isArray(metadata.arguments)
              ? (metadata.arguments as Record<string, unknown>)
              : {};
          return (
            args.target_agent_run_id ===
              memberRunIdByName.get(input.recipientMemberName) &&
            args.content === input.content
          );
        };

        const isMatchingSendMessageLifecycle = (
          message: { type: string; payload: Record<string, unknown> },
          eventType:
            | "TOOL_EXECUTION_STARTED"
            | "TOOL_EXECUTION_SUCCEEDED"
            | "TOOL_EXECUTION_FAILED",
          invocationId: string,
        ): boolean => {
          if (message.type !== eventType) {
            return false;
          }
          if (
            message.payload.agent_run_id !==
            memberRunIdByName.get(input.senderMemberName)
          ) {
            return false;
          }
          if (message.payload.invocation_id !== invocationId) {
            return false;
          }
          const toolName =
            typeof message.payload.tool_name === "string"
              ? message.payload.tool_name.toLowerCase()
              : "";
          return toolName === "send_message_to";
        };

        await waitForTeamStreamEvent(
          (message) => isMatchingSendMessageSegmentStart(message),
          `${input.senderMemberName} send_message_to SEGMENT_START`,
        );
        const matchingSegmentStart = streamMessages.find((message) =>
          isMatchingSendMessageSegmentStart(message),
        );
        const matchingSegmentStartIndex = matchingSegmentStart
          ? streamMessages.indexOf(matchingSegmentStart)
          : -1;
        expect(matchingSegmentStartIndex).toBeGreaterThanOrEqual(0);
        const invocationId = matchingSegmentStart?.payload.segment_id;
        expect(typeof invocationId).toBe("string");

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "TOOL_EXECUTION_STARTED" &&
            message.payload.agent_run_id ===
              memberRunIdByName.get(input.senderMemberName) &&
            message.payload.tool_name === "send_message_to" &&
            message.payload.invocation_id === invocationId,
          `${input.senderMemberName} send_message_to TOOL_EXECUTION_STARTED`,
        );

        const isMatchingCommunicationMessage = (message: {
          type: string;
          payload: Record<string, unknown>;
        }): boolean =>
          isE2eTeamCommunicationMessage(message, {
            senderAgentRunId: memberRunIdByName.get(
              input.senderMemberName,
            ) as string,
            recipientAgentRunId: memberRunIdByName.get(
              input.recipientMemberName,
            ) as string,
            content: input.content,
          });
        await waitForTeamStreamEvent(
          (message) =>
            streamMessages.indexOf(message) > matchingSegmentStartIndex &&
            isMatchingCommunicationMessage(message),
          `${input.recipientMemberName} TEAM_COMMUNICATION_MESSAGE`,
        );
        const communicationIndex = streamMessages.findIndex(
          (message, index) =>
            index > matchingSegmentStartIndex &&
            isMatchingCommunicationMessage(message),
        );
        expect(communicationIndex).toBeGreaterThanOrEqual(0);

        await waitForTeamStreamEvent(
          (message) =>
            isMatchingSendMessageLifecycle(
              message,
              "TOOL_EXECUTION_SUCCEEDED",
              invocationId as string,
            ),
          `${input.senderMemberName} send_message_to TOOL_EXECUTION_SUCCEEDED`,
        );

        await waitForTeamStreamEvent(
          (message) =>
            streamMessages.indexOf(message) > communicationIndex &&
            message.type === "TURN_COMPLETED" &&
            message.payload.agent_run_id ===
              memberRunIdByName.get(input.recipientMemberName),
          `${input.recipientMemberName} response TURN_COMPLETED`,
        );
        await waitForTeamStreamEvent(
          (message) =>
            streamMessages.indexOf(message) > communicationIndex &&
            message.type === "AGENT_STATUS" &&
            message.payload.agent_run_id ===
              memberRunIdByName.get(input.recipientMemberName) &&
            message.payload.status === "idle",
          `${input.recipientMemberName} response AGENT_STATUS idle`,
        );

        const matchingSegmentStarts = streamMessages.filter((message) =>
          isMatchingSendMessageSegmentStart(message),
        );
        expect(matchingSegmentStarts).toHaveLength(1);

        const sendMessageStartedEvents = streamMessages.filter((message) =>
          isMatchingSendMessageLifecycle(
            message,
            "TOOL_EXECUTION_STARTED",
            invocationId as string,
          ),
        );
        const sendMessageSucceededEvents = streamMessages.filter((message) =>
          isMatchingSendMessageLifecycle(
            message,
            "TOOL_EXECUTION_SUCCEEDED",
            invocationId as string,
          ),
        );
        const sendMessageFailedEvents = streamMessages.filter((message) =>
          isMatchingSendMessageLifecycle(
            message,
            "TOOL_EXECUTION_FAILED",
            invocationId as string,
          ),
        );
        expect(sendMessageStartedEvents).toHaveLength(1);
        expect(sendMessageSucceededEvents).toHaveLength(1);
        expect(sendMessageFailedEvents).toHaveLength(0);


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
            message.payload.agent_run_id === agentRunId,
          `${memberName} activation TURN_COMPLETED`,
        );
      };

      try {
        // Exact AgentRun targeting is supported only after the configured
        // recipient has a live runtime handle.
        await activateMember("ping");
        await activateMember("pong");
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
        });

        await sendRelayInstruction({
          targetMemberRouteKey: "pong",
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
        await closeSocket(teamSocket);
      }
    }, 300_000);

    it("creates a nested team definition and routes live Codex inter-agent messaging between leaf members", async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier("ultra");
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), "codex-team-nested-e2e-"),
      );
      createdWorkspaceRoots.add(workspaceRootPath);

      const rootInstructions = `
You are participating in a nested team-definition validation.

Rules:
1. Follow direct user instructions exactly.
2. Do not explore the environment.
3. The only tool you may execute is send_message_to.
4. Here send_message_to means the Agent Tools MCP server tool whose provider identifier is mcp__autobyteus_agent_tools__send_message_to. Never use Codex's built-in collaboration router.
5. If the user asks you to call the Agent Tools MCP send_message_to with explicit JSON arguments, call it exactly once with those exact arguments.
6. Keep assistant text responses short.
`;

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const parentAgentDefResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `codex-parent-${unique}`,
          role: "assistant",
          description: "Codex nested parent coordinator.",
          instructions: rootInstructions,
          toolNames: ["send_message_to"],
        },
      });
      const parentAgentDefinitionId =
        parentAgentDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(parentAgentDefinitionId);

      const specialistAgentDefResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `codex-specialist-${unique}`,
          role: "assistant",
          description: "Codex nested leaf specialist.",
          instructions:
            "Reply in one short sentence. If you receive a teammate message, acknowledge it briefly.",
        },
      });
      const specialistAgentDefinitionId =
        specialistAgentDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(specialistAgentDefinitionId);

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;
      const subTeamDefinitionResult = await execGraphql<{
        createAgentTeamDefinition: { id: string };
      }>(createTeamDefinitionMutation, {
        input: {
          name: `codex-subteam-${unique}`,
          description: "Nested Codex subteam definition.",
          instructions: "Handle delegated teammate requests.",
          coordinatorMemberName: "specialist",
          nodes: [
            {
              memberName: "specialist",
              ref: specialistAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
          ],
        },
      });
      const subTeamDefinitionId =
        subTeamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(subTeamDefinitionId);

      const rootTeamDefinitionResult = await execGraphql<{
        createAgentTeamDefinition: { id: string };
      }>(createTeamDefinitionMutation, {
        input: {
          name: `codex-nested-root-${unique}`,
          description: "Nested root Codex team definition.",
          instructions: "Coordinate the nested team.",
          coordinatorMemberName: "parent",
          nodes: [
            {
              memberName: "parent",
              ref: parentAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
            {
              memberName: "research_subteam",
              ref: subTeamDefinitionId,
              refType: "AGENT_TEAM",
              refScope: "SHARED",
            },
          ],
        },
      });
      const rootTeamDefinitionId =
        rootTeamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(rootTeamDefinitionId);

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
          teamDefinitionId: rootTeamDefinitionId,
          teamConfigs: [
            {
              teamAddress: "/",
              llmModelIdentifier: modelIdentifier,
              llmConfig: { reasoning_effort: "ultra" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              teamAddress: "/research_subteam",
              llmModelIdentifier: modelIdentifier,
              llmConfig: { reasoning_effort: "ultra" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
          ],
          memberConfigs: [
            {
              memberAddress: "/parent",
              agentDefinitionId: parentAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: { reasoning_effort: "ultra" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              memberAddress: "/research_subteam/specialist",
              agentDefinitionId: specialistAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: { reasoning_effort: "ultra" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
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

      const nestedResumeResult = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(
        `query TeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree }
        }`,
        { teamRunId },
      );
      const nestedMembers = flattenE2eConfiguredAgentExecutions(
        nestedResumeResult.getTeamRunResumeConfig.executionTree,
      );
      const nestedMemberRunIdByName = new Map(
        nestedMembers.map((member) => [member.memberName, member.agentRunId]),
      );
      const parentRunId = nestedMemberRunIdByName.get("parent");
      const specialistRunId = nestedMemberRunIdByName.get("specialist");
      const specialistAddress = nestedMembers.find(
        (member) => member.memberName === "specialist",
      )?.memberAddress;
      expect(parentRunId).toBeTruthy();
      expect(specialistRunId).toBeTruthy();
      expect(specialistAddress).toBe("/research_subteam/specialist");

      const relayToken = `NESTED-RELAY:${unique}`;
      const streamUrl = runtimeServerUrl;
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);
      const streamMessages: Array<{
        type: string;
        payload: Record<string, unknown>;
      }> = [];
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
        throw new Error(
          `Timed out waiting for team websocket event '${label}'. preview='${preview}'`,
        );
      };

      try {
        for (const [label, agentRunId] of [
          ["parent", parentRunId],
          ["specialist", specialistRunId],
        ] as const) {
          const startIndex = streamMessages.length;
          sendTeamMessageOverSocket(teamSocket, {
            agentRunId: agentRunId as string,
            content: "Reply with exactly READY and nothing else.",
          });
          await waitForTeamStreamEvent(
            (message) =>
              streamMessages.indexOf(message) >= startIndex &&
              message.type === "TURN_COMPLETED" &&
              message.payload.agent_run_id === agentRunId,
            `${label} activation TURN_COMPLETED`,
          );
        }
        const argsJson = JSON.stringify({
          recipient_address: specialistAddress,
          content: `Nested relay ${relayToken}`,
          message_type: "nested_roundtrip",
        });
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: parentRunId as string,
          content:
            "Call the Agent Tools MCP server tool mcp__autobyteus_agent_tools__send_message_to exactly once now with these exact JSON arguments: " +
            `${argsJson}. Do not call any other tool.`,
        });

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "SEGMENT_START" &&
            message.payload.agent_run_id === parentRunId &&
            message.payload.segment_type === "tool_call" &&
            typeof message.payload.metadata === "object" &&
            message.payload.metadata !== null &&
            !Array.isArray(message.payload.metadata) &&
            typeof (message.payload.metadata as Record<string, unknown>)
              .tool_name === "string" &&
            ((message.payload.metadata as Record<string, unknown>)
              .tool_name as string).endsWith("send_message_to"),
          "parent send_message_to SEGMENT_START",
        );

        await waitForTeamStreamEvent(
          (message) =>
            isE2eTeamCommunicationMessage(message, {
              senderAgentRunId: parentRunId as string,
              recipientAgentRunId: specialistRunId as string,
              content: `Nested relay ${relayToken}`,
            }),
          "specialist TEAM_COMMUNICATION_MESSAGE receipt",
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "SEGMENT_END" &&
            message.payload.agent_run_id === specialistRunId,
          "specialist response SEGMENT_END",
        );
      } finally {
        await closeSocket(teamSocket);
      }
    }, 180_000);

    it("streams recipient answer after send_message_to and surfaces reasoning when available in codex team runtime", async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), "codex-team-reasoning-e2e-"),
      );
      createdWorkspaceRoots.add(workspaceRootPath);

      const professorInstructions = `
You are the professor member in a two-agent team with members "professor" and "student".

Rules:
1. Follow direct user instructions exactly.
2. You must not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. Here send_message_to means the Agent Tools MCP server tool whose provider identifier is mcp__autobyteus_agent_tools__send_message_to. Never use Codex's built-in collaboration router.
5. If the user asks you to call the Agent Tools MCP send_message_to with explicit JSON arguments, call it exactly once with those exact arguments and do not call any other tool.
6. Keep assistant text responses empty unless the user explicitly asks for them.
`;
      const studentInstructions = `
You are the student member in a two-agent team with members "professor" and "student".

Rules:
1. Never call tools.
2. When you receive a reasoning task from the professor, think carefully and answer directly in one concise sentence.
3. Do not ask clarifying questions.
`;

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `codex-professor-${unique}`,
          role: "assistant",
          description:
            "Codex professor agent for recipient reasoning streaming validation.",
          instructions: professorInstructions,
          toolNames: ["send_message_to"],
        },
      });
      const studentResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `codex-student-${unique}`,
          role: "assistant",
          description:
            "Codex student agent for recipient reasoning streaming validation.",
          instructions: studentInstructions,
        },
      });
      const professorAgentDefinitionId =
        professorResult.createAgentDefinition.id;
      const studentAgentDefinitionId = studentResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(professorAgentDefinitionId);
      createdAgentDefinitionIds.add(studentAgentDefinitionId);

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
          name: `codex-reasoning-team-${unique}`,
          description:
            "Codex team for recipient reasoning streaming verification.",
          instructions:
            "Professor delegates a reasoning task to student; student answers directly.",
          coordinatorMemberName: "professor",
          nodes: [
            {
              memberName: "professor",
              ref: professorAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
            {
              memberName: "student",
              ref: studentAgentDefinitionId,
              refType: "AGENT",
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
              llmConfig: { reasoning_effort: "high" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
          ],
          memberConfigs: [
            {
              memberAddress: "/professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: { reasoning_effort: "high" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              memberAddress: "/student",
              agentDefinitionId: studentAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: { reasoning_effort: "high" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
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

      const reasoningResumeResult = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(
        `query TeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree }
        }`,
        { teamRunId },
      );
      const reasoningMembers = flattenE2eConfiguredAgentExecutions(
        reasoningResumeResult.getTeamRunResumeConfig.executionTree,
      );
      const reasoningMemberRunIdByName = new Map(
        reasoningMembers.map((member) => [member.memberName, member.agentRunId]),
      );
      const professorRunId = reasoningMemberRunIdByName.get("professor");
      const studentRunId = reasoningMemberRunIdByName.get("student");
      expect(professorRunId).toBeTruthy();
      expect(studentRunId).toBeTruthy();

      const streamUrl = runtimeServerUrl;
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);

      const streamMessages: Array<{
        type: string;
        payload: Record<string, unknown>;
      }> = [];
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
            parsed.payload &&
            typeof parsed.payload === "object" &&
            !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          streamMessages.push({ type: parsed.type, payload });
        } catch {
          // ignore malformed rows in test stream capture
        }
      });

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
        throw new Error(
          `Timed out waiting for team websocket event '${label}'. preview='${preview}'`,
        );
      };

      const reasoningPrompt =
        "Solve this carefully before replying: " +
        "1. Find the next number in the sequence 2, 6, 12, 20, 30. " +
        "2. Rearrange the letters in LISTEN into another common English word. " +
        "Reply with exactly one short sentence containing both answers.";
      const argsJson = JSON.stringify({
        target_agent_run_id: studentRunId,
        content: reasoningPrompt,
        message_type: "reasoning_check",
      });

      try {
        for (const [label, agentRunId] of [
          ["professor", professorRunId],
          ["student", studentRunId],
        ] as const) {
          const activationStartIndex = streamMessages.length;
          sendTeamMessageOverSocket(teamSocket, {
            agentRunId: agentRunId as string,
            content: "Reply with exactly READY and nothing else.",
          });
          await waitForTeamStreamEvent(
            (message) =>
              streamMessages.indexOf(message) >= activationStartIndex &&
              message.type === "TURN_COMPLETED" &&
              message.payload.agent_run_id === agentRunId,
            `${label} activation TURN_COMPLETED`,
          );
        }
        const startIndex = streamMessages.length;
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: professorRunId as string,
          content:
            "Call the Agent Tools MCP server tool mcp__autobyteus_agent_tools__send_message_to exactly once now with these exact JSON arguments: " +
            `${argsJson}. Do not call any other tool.`,
        });

        await waitForTeamStreamEvent(
          (message) =>
            streamMessages.indexOf(message) >= startIndex &&
            message.type === "SEGMENT_END" &&
            message.payload.agent_run_id === studentRunId,
          "student text SEGMENT_END",
        );
        await wait(1_500);

        const relevantMessages = streamMessages.slice(startIndex);
        const reasoningChunks = relevantMessages.filter(
          (message) =>
            message.type === "SEGMENT_CONTENT" &&
            message.payload.agent_run_id === studentRunId &&
            message.payload.segment_type === "reasoning" &&
            typeof message.payload.delta === "string" &&
            message.payload.delta.trim().length > 0,
        );
        const textChunks = relevantMessages.filter(
          (message) =>
            message.type === "SEGMENT_CONTENT" &&
            message.payload.agent_run_id === studentRunId &&
            message.payload.segment_type === "text" &&
            typeof message.payload.delta === "string" &&
            message.payload.delta.trim().length > 0,
        );

        expect(textChunks.length).toBeGreaterThan(0);
        expect(reasoningChunks.length).toBeGreaterThanOrEqual(0);
      } finally {
        await closeSocket(teamSocket);
      }
    }, 180_000);

    it("preserves workspace mapping across create->send->terminate->continue for codex team runs created with workspaceRootPath", async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), "codex-team-workspaceid-e2e-"),
      );
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

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorAgentDefResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `codex-professor-${unique}`,
          role: "assistant",
          description: "Codex team workspace lifecycle professor agent.",
          instructions: "Reply concisely in one sentence.",
        },
      });
      const professorAgentDefinitionId =
        professorAgentDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(professorAgentDefinitionId);

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
          name: `codex-workspace-team-${unique}`,
          description: "Codex workspace lifecycle validation team.",
          instructions: "Coordinate workspace lifecycle checks.",
          coordinatorMemberName: "professor",
          nodes: [
            {
              memberName: "professor",
              ref: professorAgentDefinitionId,
              refType: "AGENT",
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
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
          ],
          memberConfigs: [
            {
              memberAddress: "/professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
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

      const terminateTeamRunMutation = `
        mutation TerminateAgentTeamRun($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `;
      const restoreTeamRunMutation = `
        mutation RestoreAgentTeamRun($teamRunId: String!) {
          restoreAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
            teamRunId
          }
        }
      `;
      const listWorkspaceRunHistoryQuery = `
        query ListWorkspaceRunHistory {
          listWorkspaceRunHistory(limitPerAgent: 200) {
            workspaceRootPath
            teamDefinitions {
              runs {
                teamRunId
                workspaceRootPath
                members {
                  displayName
                  workspaceRootPath
                }
              }
            }
          }
        }
      `;
      const teamResumeQuery = `
        query TeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) {
            teamRunId
            isActive
            executionTree
          }
        }
      `;

      const initialResumeResult = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(teamResumeQuery, { teamRunId });
      const professorRunId = flattenE2eConfiguredAgentExecutions(
        initialResumeResult.getTeamRunResumeConfig.executionTree,
      ).find((member) => member.memberName === "professor")?.agentRunId;
      expect(professorRunId).toBeTruthy();

      const streamUrl = runtimeServerUrl;
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);
      const streamMessages: Array<{
        type: string;
        payload: Record<string, unknown>;
      }> = [];
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

      sendTeamMessageOverSocket(teamSocket, {
        agentRunId: professorRunId as string,
        content: "Reply with READY.",
      });

      const initialTurnDeadline = Date.now() + 120_000;
      while (
        Date.now() < initialTurnDeadline &&
        !streamMessages.some(
          (message) =>
            message.type === "TURN_COMPLETED" &&
            message.payload.agent_run_id === professorRunId,
        )
      ) {
        await wait(500);
      }
      expect(
        streamMessages.some(
          (message) =>
            message.type === "TURN_COMPLETED" &&
            message.payload.agent_run_id === professorRunId,
        ),
      ).toBe(true);

      const deadline = Date.now() + 120_000;
      let matchedRow: {
        teamRunId: string;
        workspaceRootPath: string | null;
        members: Array<{
          displayName: string;
          workspaceRootPath: string | null;
        }>;
      } | null = null;
      while (Date.now() < deadline) {
        const listResult = await execGraphql<{
          listWorkspaceRunHistory: Array<{
            workspaceRootPath: string;
            teamDefinitions: Array<{
              runs: Array<{
                teamRunId: string;
                workspaceRootPath: string | null;
                members: Array<{
                  displayName: string;
                  workspaceRootPath: string | null;
                }>;
              }>;
            }>;
          }>;
        }>(listWorkspaceRunHistoryQuery);
        matchedRow =
          listResult.listWorkspaceRunHistory
            .flatMap((workspace) => workspace.teamDefinitions)
            .flatMap((definition) => definition.runs)
            .find((row) => row.teamRunId === teamRunId) ?? null;
        if (
          matchedRow &&
          matchedRow.workspaceRootPath === workspaceRootPath &&
          matchedRow.members.every(
            (member) => member.workspaceRootPath === workspaceRootPath,
          )
        ) {
          break;
        }
        await wait(2_000);
      }

      expect(matchedRow).toBeTruthy();
      expect(matchedRow?.workspaceRootPath).toBe(workspaceRootPath);
      expect(
        matchedRow?.members.every(
          (member) => member.workspaceRootPath === workspaceRootPath,
        ),
      ).toBe(true);

      const terminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateTeamRunMutation, { teamRunId });
      expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

      const restoreResult = await execGraphql<{
        restoreAgentTeamRun: {
          success: boolean;
          message: string;
          teamRunId: string | null;
        };
      }>(restoreTeamRunMutation, { teamRunId });
      expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
      expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);

      const streamCountBeforeContinue = streamMessages.length;
      sendTeamMessageOverSocket(teamSocket, {
        agentRunId: professorRunId as string,
        content: "Reply with READY again.",
      });

      const restoreDeadline = Date.now() + 120_000;
      while (Date.now() < restoreDeadline) {
        const followUpSeen = streamMessages
          .slice(streamCountBeforeContinue)
          .some(
            (message) =>
              message.type === "TURN_COMPLETED" &&
              message.payload.agent_run_id === professorRunId,
          );
        if (followUpSeen) {
          break;
        }
        await wait(1_000);
      }
      expect(
        streamMessages
          .slice(streamCountBeforeContinue)
          .some(
            (message) =>
              message.type === "TURN_COMPLETED" &&
              message.payload.agent_run_id === professorRunId,
          ),
      ).toBe(true);

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: {
          teamRunId: string;
          isActive: boolean;
          executionTree: Record<string, unknown>;
        };
      }>(teamResumeQuery, { teamRunId });

      expect(resumeResult.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
      expect(
        flattenE2eConfiguredAgentExecutions(
          resumeResult.getTeamRunResumeConfig.executionTree,
        ).every((binding) => binding.workspaceRootPath === workspaceRootPath),
      ).toBe(true);

      await closeSocket(teamSocket);
    }, 180_000);

    it("serves every team member projection after terminate, restore, and continue in codex team runtime", async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), "codex-team-projection-e2e-"),
      );
      createdWorkspaceRoots.add(workspaceRootPath);

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `codex-projection-professor-${unique}`,
          role: "assistant",
          description:
            "Coordinator member for Codex projection stability validation.",
          instructions:
            "Reply with exactly the requested token and nothing else.",
        },
      });
      const studentResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `codex-projection-student-${unique}`,
          role: "assistant",
          description:
            "Secondary member for Codex projection stability validation.",
          instructions:
            "Reply with exactly the requested token and nothing else.",
        },
      });
      const professorAgentDefinitionId =
        professorResult.createAgentDefinition.id;
      const studentAgentDefinitionId = studentResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(professorAgentDefinitionId);
      createdAgentDefinitionIds.add(studentAgentDefinitionId);

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
          name: `codex-projection-team-${unique}`,
          description: "Codex team projection stability validation.",
          instructions:
            "Route incoming user requests to the requested target member.",
          coordinatorMemberName: "professor",
          nodes: [
            {
              memberName: "professor",
              ref: professorAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
            {
              memberName: "student",
              ref: studentAgentDefinitionId,
              refType: "AGENT",
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
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
          ],
          memberConfigs: [
            {
              memberAddress: "/professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              memberAddress: "/student",
              agentDefinitionId: studentAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
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

      const streamUrl = runtimeServerUrl;
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      const streamMessages: Array<{
        type: string;
        payload: Record<string, unknown>;
      }> = [];
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
            parsed.payload &&
            typeof parsed.payload === "object" &&
            !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          streamMessages.push({ type: parsed.type, payload });
        } catch {
          // ignore malformed rows in test stream capture
        }
      });
      await waitForSocketOpen(teamSocket);

      const teamResumeQuery = `
        query TeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) {
            executionTree
          }
        }
      `;
      const terminateTeamRunMutation = `
        mutation TerminateAgentTeamRun($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `;
      const restoreTeamRunMutation = `
        mutation RestoreAgentTeamRun($teamRunId: String!) {
          restoreAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
            teamRunId
          }
        }
      `;

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(teamResumeQuery, { teamRunId });
      const memberBindings = flattenE2eConfiguredAgentExecutions(
        resumeResult.getTeamRunResumeConfig.executionTree,
      );
      const professorBinding = memberBindings.find(
        (binding) => binding.memberName === "professor",
      );
      const studentBinding = memberBindings.find(
        (binding) => binding.memberName === "student",
      );
      expect(professorBinding).toBeTruthy();
      expect(studentBinding).toBeTruthy();
      if (!professorBinding || !studentBinding) {
        throw new Error(
          "Expected both Codex team member bindings to be present.",
        );
      }

      type TeamMemberProjection = {
        agentRunId: string;
        summary?: string | null;
        lastActivityAt?: string | null;
        conversation: Array<Record<string, unknown>>;
      };

      const members = [
        {
          memberName: "professor",
          binding: professorBinding,
          firstToken: `CODEX_TEAM_PROJECTION_PROFESSOR_FIRST_${unique}`,
          secondToken: `CODEX_TEAM_PROJECTION_PROFESSOR_SECOND_${unique}`,
        },
        {
          memberName: "student",
          binding: studentBinding,
          firstToken: `CODEX_TEAM_PROJECTION_STUDENT_FIRST_${unique}`,
          secondToken: `CODEX_TEAM_PROJECTION_STUDENT_SECOND_${unique}`,
        },
      ];

      const fetchProjection = async (
        agentRunId: string,
      ): Promise<TeamMemberProjection> => {
        return getTeamMemberRunViewProjectionService().getProjection(
          teamRunId,
          agentRunId,
        );
      };

      const waitForProjectionTokens = async (
        agentRunId: string,
        requiredTokens: string[],
      ): Promise<TeamMemberProjection> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const projection = await fetchProjection(agentRunId);
          const serializedConversation = JSON.stringify(
            projection.conversation,
          );
          if (
            requiredTokens.every((token) =>
              serializedConversation.includes(token),
            )
          ) {
            return projection;
          }
          await wait(2_000);
        }
        throw new Error(
          `Timed out waiting for Codex projection tokens: ${requiredTokens.join(", ")}`,
        );
      };

      const expectTerminatedProjection = async (
        member: (typeof members)[number],
        requiredTokens: string[],
      ): Promise<void> => {
        expect(member.binding.agentRunId).toBeTruthy();
        const projection = await fetchProjection(member.binding.agentRunId as string);
        if (member.binding.agentRunId) {
          expect(projection.agentRunId).toBe(member.binding.agentRunId);
        } else {
          expect(projection.agentRunId).toBeTruthy();
        }
        const serializedConversation = JSON.stringify(projection.conversation);
        for (const token of requiredTokens) {
          expect(serializedConversation).toContain(token);
        }
      };

      const waitForAssistantToken = async (
        agentRunId: string,
        memberName: string,
        token: string,
        startIndex: number,
      ): Promise<void> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const seen = streamMessages
            .slice(startIndex)
            .some(
              (message) =>
                message.type === "TURN_COMPLETED" &&
                message.payload.agent_run_id === agentRunId,
            );
          if (seen) {
            return;
          }
          await wait(500);
        }
        const preview = streamMessages
          .slice(Math.max(0, streamMessages.length - 30))
          .map(
            (message) =>
              `${message.type}:${JSON.stringify(message.payload).slice(0, 220)}`,
          )
          .join(" | ");
        throw new Error(
          `Timed out waiting for Codex ${memberName} turn completion for prompt token ${token}. preview='${preview}'`,
        );
      };

      try {
        for (const member of members) {
          const startIndex = streamMessages.length;
          expect(member.binding.agentRunId).toBeTruthy();
          sendTeamMessageOverSocket(teamSocket, {
            agentRunId: member.binding.agentRunId as string,
            content: `Reply with exactly ${member.firstToken} and nothing else.`,
          });
          await waitForAssistantToken(
            member.binding.agentRunId,
            member.memberName,
            member.firstToken,
            startIndex,
          );
          await waitForProjectionTokens(member.binding.agentRunId as string, [
            member.firstToken,
          ]);
        }

        const firstTerminateResult = await execGraphql<{
          terminateAgentTeamRun: { success: boolean; message: string };
        }>(terminateTeamRunMutation, { teamRunId });
        expect(firstTerminateResult.terminateAgentTeamRun.success).toBe(true);

        for (const member of members) {
          await expectTerminatedProjection(member, [member.firstToken]);
        }

        const restoreResult = await execGraphql<{
          restoreAgentTeamRun: {
            success: boolean;
            message: string;
            teamRunId: string | null;
          };
        }>(restoreTeamRunMutation, { teamRunId });
        expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
        expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);

        for (const member of members) {
          const startIndex = streamMessages.length;
          expect(member.binding.agentRunId).toBeTruthy();
          sendTeamMessageOverSocket(teamSocket, {
            agentRunId: member.binding.agentRunId as string,
            content: `Reply with exactly ${member.secondToken} and nothing else.`,
          });
          await waitForAssistantToken(
            member.binding.agentRunId,
            member.memberName,
            member.secondToken,
            startIndex,
          );
          await waitForProjectionTokens(member.binding.agentRunId as string, [
            member.firstToken,
            member.secondToken,
          ]);
        }

        const secondTerminateResult = await execGraphql<{
          terminateAgentTeamRun: { success: boolean; message: string };
        }>(terminateTeamRunMutation, { teamRunId });
        expect(secondTerminateResult.terminateAgentTeamRun.success).toBe(true);

        for (const member of members) {
          await expectTerminatedProjection(member, [
            member.firstToken,
            member.secondToken,
          ]);
        }
      } finally {
        await closeSocket(teamSocket);
      }
    }, 300_000);
  },
);
