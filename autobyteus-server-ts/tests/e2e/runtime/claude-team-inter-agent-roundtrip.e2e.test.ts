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
import {
  E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT,
} from "../helpers/team-run-graphql-documents.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

const claudeBinaryReady = spawnSync("claude", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeClaudeRuntime =
  claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;

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

const sendInterruptGenerationOverSocket = (
  socket: WebSocket,
  input: {
    agentRunId: string;
  },
): void => {
  socket.send(
    JSON.stringify({
      type: "INTERRUPT_GENERATION",
      payload: {
        command_id: `client_interrupt_${input.agentRunId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        agent_run_id: input.agentRunId,
      },
    }),
  );
};

type TeamStreamMessage = { type: string; payload: Record<string, unknown> };

const captureTeamStreamMessage = (
  messages: TeamStreamMessage[],
  raw: WebSocket.RawData,
): void => {
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
    messages.push({
      type: parsed.type,
      payload,
    });
  } catch {
    // ignore malformed rows in test stream capture
  }
};

const waitForTeamStreamMessageAfter = async (
  messages: TeamStreamMessage[],
  startIndex: number,
  predicate: (message: TeamStreamMessage) => boolean,
  label: string,
  timeoutMs = 120_000,
): Promise<TeamStreamMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const matching = messages.slice(startIndex).find(predicate);
    if (matching) {
      return matching;
    }
    await wait(500);
  }
  const preview = messages
    .slice(Math.max(0, messages.length - 30))
    .map((entry) => `${entry.type}:${JSON.stringify(entry.payload).slice(0, 220)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for team websocket event '${label}'. preview='${preview}'`);
};

describeClaudeRuntime("Claude team inter-agent roundtrip e2e (live transport)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  let runtimeServerApp: FastifyInstance | null = null;
  let runtimeServerUrl: URL;
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();
  let originalInternalServerBaseUrl: string | undefined;

  beforeAll(async () => {
    originalInternalServerBaseUrl = process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "claude-team-runtime-e2e-appdata-"));
    await writeFile(
      path.join(testDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
    const started = await startStudioE2eRuntimeServer();
    runtimeServerApp = started.fastify;
    runtimeServerUrl = started.mainUrl;
    schema = await buildGraphqlSchema();
  });

  afterAll(async () => {
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
    if (originalInternalServerBaseUrl) {
      process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] = originalInternalServerBaseUrl;
    } else {
      delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
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

  const startClaudeRuntimeTestServer = async (): Promise<{
    streamApp: FastifyInstance;
    streamUrl: URL;
  }> => {
    if (!runtimeServerApp) {
      throw new Error("Claude runtime test server is not available.");
    }
    return {
      streamApp: runtimeServerApp,
      streamUrl: runtimeServerUrl,
    };
  };

  const fetchPreferredClaudeToolModelIdentifier = async (): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
          llmModels {
            modelIdentifier
          }
        }
      }
    `;

    const result = await execGraphql<{
      providerModelCatalogSnapshots: Array<{
        llmModels: Array<{ modelIdentifier: string }>;
      }>;
    }>(query, {
      runtimeKind: "claude_agent_sdk",
    });

    const allModelIdentifiers = result.providerModelCatalogSnapshots.flatMap((provider) =>
      provider.llmModels
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.length > 0),
    );
    if (allModelIdentifiers.length === 0) {
      throw new Error("No Claude runtime model was returned by providerModelCatalogSnapshots.");
    }
    return allModelIdentifiers.includes("haiku") ? "haiku" : allModelIdentifiers[0]!;
  };

  it(
    "routes live inter-agent send_message_to ping->pong->ping roundtrip in claude team runtime",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredClaudeToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-roundtrip-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const teamInstructions = `
You are participating in a two-agent team roundtrip validation in a team with members "ping" and "pong".

Rules:
1. Follow direct user instructions exactly.
2. You must not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. If the user asks you to call send_message_to with explicit arguments, call send_message_to exactly once with those exact arguments and do not call any other tool.
5. If a message does not include explicit send_message_to arguments, do not call any tool. Reply with one very short plain-text acknowledgment only.
6. Keep assistant text responses very short.
`;

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const pingAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-ping-${unique}`,
            role: "assistant",
            description: "Claude ping agent for live inter-agent roundtrip validation.",
            instructions: teamInstructions,
            toolNames: ["send_message_to"],
          },
        },
      );
      const pongAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-pong-${unique}`,
            role: "assistant",
            description: "Claude pong agent for live inter-agent roundtrip validation.",
            instructions: teamInstructions,
            toolNames: ["send_message_to"],
          },
        },
      );
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
      const teamDefinitionResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `claude-roundtrip-team-${unique}`,
            description: "Live claude inter-agent roundtrip validation team.",
            instructions: "Coordinate ping and pong to execute directed send_message_to hops.",
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
          teamConfigs: [{
            teamAddress: "/",
            llmModelIdentifier: modelIdentifier,
            autoExecuteTools: true,
            skillAccessMode: "NONE",
            runtimeKind: "claude_agent_sdk",
            workspaceRootPath,
          }],
          memberConfigs: [
            {
              memberAddress: "/ping",
              agentDefinitionId: pingAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
            {
              memberAddress: "/pong",
              agentDefinitionId: pongAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
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

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId });
      const members = flattenE2eConfiguredAgentExecutions(
        resumeResult.getTeamRunResumeConfig.executionTree,
      );
      const memberRunIdByName = new Map(
        members.map((member) => [
          member.memberName,
          member.agentRunId,
        ]),
      );
      const memberAddressByName = new Map(
        members.map((member) => [member.memberName, member.memberAddress]),
      );
      expect(memberRunIdByName.get("ping")).toBeTruthy();
      expect(memberRunIdByName.get("pong")).toBeTruthy();

      const pingToken = `ROUNDTRIP_PING:${unique}`;
      const pongToken = `ROUNDTRIP_PONG:${unique}`;
      const { streamUrl } = await startClaudeRuntimeTestServer();
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
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
          // ignore malformed rows in test stream capture
        }
      });

      const sendRelayInstruction = async (input: {
        senderMemberName: "ping" | "pong";
        recipientName: "ping" | "pong";
        messageType: string;
        content: string;
      }): Promise<void> => {
        const recipientAddress = memberAddressByName.get(input.recipientName);
        expect(recipientAddress).toBeTruthy();
        const argsJson = JSON.stringify({
          recipient_address: recipientAddress,
          content: input.content,
          message_type: input.messageType,
        });
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: memberRunIdByName.get(input.senderMemberName) as string,
          content:
            "Call send_message_to exactly once now with these exact JSON arguments: " +
            `${argsJson}. Do not call any other tool.`,
        });
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
            args.recipient_address ===
              memberAddressByName.get(input.recipientMemberName) &&
            args.content === input.content
          );
        };

        const isMatchingSendMessageLifecycle = (
          message: { type: string; payload: Record<string, unknown> },
          eventType: "TOOL_EXECUTION_STARTED" | "TOOL_EXECUTION_SUCCEEDED" | "TOOL_EXECUTION_FAILED",
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
        const invocationId = matchingSegmentStart?.payload.segment_id;
        expect(typeof invocationId).toBe("string");

        await waitForTeamStreamMessageAfter(
          streamMessages,
          0,
          (message) =>
            message.type === "TOOL_EXECUTION_STARTED" &&
            message.payload.agent_run_id ===
              memberRunIdByName.get(input.senderMemberName) &&
            message.payload.tool_name === "send_message_to" &&
            message.payload.invocation_id === invocationId,
          `${input.senderMemberName} send_message_to TOOL_EXECUTION_STARTED`,
        );

        await waitForTeamStreamEvent(
          (message) =>
            isE2eTeamCommunicationMessage(message, {
              senderAgentRunId: memberRunIdByName.get(
                input.senderMemberName,
              ) as string,
              recipientAgentRunId: memberRunIdByName.get(
                input.recipientMemberName,
              ) as string,
              content: input.content,
            }),
          `${input.recipientMemberName} TEAM_COMMUNICATION_MESSAGE`,
        );

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
            message.type === "TURN_COMPLETED" &&
            message.payload.agent_run_id ===
              memberRunIdByName.get(input.recipientMemberName),
          `${input.recipientMemberName} response TURN_COMPLETED`,
        );
        await waitForTeamStreamEvent(
          (message) =>
            message.type === "AGENT_STATUS" &&
            message.payload.agent_run_id ===
              memberRunIdByName.get(input.recipientMemberName) &&
            message.payload.status === "idle",
          `${input.recipientMemberName} AGENT_STATUS IDLE after delivery`,
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

        expect(sendMessageStartedEvents[0]?.payload.arguments).toMatchObject({
          recipient_address: memberAddressByName.get(input.recipientMemberName),
          content: input.content,
        });
        expect(sendMessageSucceededEvents[0]?.payload.arguments).toMatchObject({
          recipient_address: memberAddressByName.get(input.recipientMemberName),
          content: input.content,
        });
        const serializedResult = sendMessageSucceededEvents[0]?.payload.result;
        expect(typeof serializedResult).toBe("string");
        expect(JSON.parse(serializedResult as string)).toMatchObject({
          accepted: true,
          code: "DELIVERED",
          message: expect.stringContaining(
            `Delivered message to ${memberAddressByName.get(input.recipientMemberName)}`,
          ),
        });

        const rawProviderSendMessageEvents = streamMessages.filter((message) => {
          const metadata =
            message.payload.metadata &&
            typeof message.payload.metadata === "object" &&
            !Array.isArray(message.payload.metadata)
              ? (message.payload.metadata as Record<string, unknown>)
              : {};
          const payloadToolName =
            typeof message.payload.tool_name === "string" ? message.payload.tool_name : null;
          const metadataToolName =
            typeof metadata.tool_name === "string" ? metadata.tool_name : null;
          const toolName = payloadToolName ?? metadataToolName ?? "";
          return [
            "mcp__autobyteus_agent_tools__send_message_to",
          ].includes(toolName.toLowerCase());
        });
        expect(rawProviderSendMessageEvents).toHaveLength(0);


      };

      try {
        await sendRelayInstruction({
          senderMemberName: "ping",
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
          senderMemberName: "pong",
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
      }
    },
    180_000,
  );

  it(
    "interrupts a pending Claude team turn and accepts a follow-up on the same websocket",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredClaudeToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-interrupt-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const workerAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-interrupt-worker-${unique}`,
            role: "assistant",
            description: "Claude worker for interrupt and follow-up validation.",
            instructions: `
You are validating interruption behavior.

Rules:
1. Follow the user's instruction exactly.
2. If asked to create a file, call the write_file tool exactly once and do not simulate it in text.
3. If asked to reply with a token, do not call tools; reply with exactly that token and nothing else.
4. Keep all non-tool text minimal.
`,
            toolNames: ["write_file"],
          },
        },
      );
      const workerAgentDefinitionId = workerAgentDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(workerAgentDefinitionId);

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
            name: `claude-interrupt-team-${unique}`,
            description: "Live Claude team interrupt/follow-up validation team.",
            instructions: "Route direct user requests to the worker member.",
            coordinatorMemberName: "worker",
            nodes: [
              {
                memberName: "worker",
                ref: workerAgentDefinitionId,
                refType: "AGENT",
                refScope: "SHARED",
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
          teamConfigs: [{
            teamAddress: "/",
            llmModelIdentifier: modelIdentifier,
            autoExecuteTools: false,
            skillAccessMode: "NONE",
            runtimeKind: "claude_agent_sdk",
            workspaceRootPath,
          }],
          memberConfigs: [
            {
              memberAddress: "/worker",
              agentDefinitionId: workerAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: false,
              skillAccessMode: "NONE",
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

      const workerResume = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId });
      const workerRunId = flattenE2eConfiguredAgentExecutions(
        workerResume.getTeamRunResumeConfig.executionTree,
      ).find((member) => member.memberName === "worker")?.agentRunId;
      expect(workerRunId).toBeTruthy();

      const { streamUrl } = await startClaudeRuntimeTestServer();
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);
      const streamMessages: TeamStreamMessage[] = [];
      teamSocket.on("message", (raw) => {
        captureTeamStreamMessage(streamMessages, raw);
      });

      const approvalTargetRelativePath = `interrupt-${randomUUID().replace(/-/g, "_")}.txt`;
      const approvalContent = `INTERRUPT_TOOL_CONTENT_${randomUUID().replace(/-/g, "_")}`;
      const followUpToken = `CLAUDE_INTERRUPT_FOLLOWUP_${randomUUID().replace(/-/g, "_")}`;
      const hasWorkerTokenResponse = (messages: TeamStreamMessage[]): boolean =>
        messages.some(
          (message) =>
            ["SEGMENT_CONTENT", "SEGMENT_END", "ASSISTANT_COMPLETE"].includes(message.type) &&
            message.payload.agent_run_id === workerRunId &&
            JSON.stringify(message.payload).includes(followUpToken),
        );
      const isForbiddenRuntimeFailure = (message: TeamStreamMessage): boolean => {
        const serializedPayload = JSON.stringify(message.payload);
        return (
          message.type === "ERROR" ||
          serializedPayload.includes("spawn EBADF") ||
          serializedPayload.includes("CLAUDE_RUNTIME_TURN_FAILED")
        );
      };

      try {
        const toolTurnStartIndex = streamMessages.length;
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: workerRunId as string,
          content:
            `Create the file ${approvalTargetRelativePath} with exactly this content: ${approvalContent}. ` +
            "Use the write_file tool exactly once, use a relative path, and do not answer with plain text.",
        });

        const approvalRequested = await waitForTeamStreamMessageAfter(
          streamMessages,
          toolTurnStartIndex,
          (message) =>
            message.type === "TOOL_APPROVAL_REQUESTED" &&
            message.payload.agent_run_id === workerRunId,
          "worker TOOL_APPROVAL_REQUESTED before interrupt",
        );
        expect(approvalRequested.payload.agent_run_id).toBe(workerRunId);

        const interruptStartIndex = streamMessages.length;
        sendInterruptGenerationOverSocket(teamSocket, {
          agentRunId: workerRunId as string,
        });

        await waitForTeamStreamMessageAfter(
          streamMessages,
          interruptStartIndex,
          (message) =>
            message.type === "TURN_INTERRUPTED" &&
            message.payload.agent_run_id === workerRunId,
          "worker interrupted TURN_INTERRUPTED projection",
        );
        await waitForTeamStreamMessageAfter(
          streamMessages,
          interruptStartIndex,
          (message) =>
            message.type === "AGENT_STATUS" &&
            message.payload.agent_run_id === workerRunId &&
            message.payload.status === "idle",
          "worker AGENT_STATUS IDLE after interrupt",
        );

        const interruptedWindow = streamMessages.slice(interruptStartIndex);
        expect(
          interruptedWindow.some(
            (message) =>
              message.type === "ASSISTANT_COMPLETE" &&
              message.payload.agent_run_id === workerRunId,
          ),
        ).toBe(false);

        const followUpStartIndex = streamMessages.length;
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: workerRunId as string,
          content: `Reply with exactly ${followUpToken} and nothing else. Do not use tools.`,
        });

        await waitForTeamStreamMessageAfter(
          streamMessages,
          followUpStartIndex,
          (message) =>
            message.type === "TURN_STARTED" &&
            message.payload.agent_run_id === workerRunId,
          "worker follow-up TURN_STARTED",
        );
        const followUpDeadline = Date.now() + 120_000;
        while (Date.now() < followUpDeadline) {
          if (hasWorkerTokenResponse(streamMessages.slice(followUpStartIndex))) {
            break;
          }
          await wait(1_000);
        }
        expect(hasWorkerTokenResponse(streamMessages.slice(followUpStartIndex))).toBe(true);
        await waitForTeamStreamMessageAfter(
          streamMessages,
          followUpStartIndex,
          (message) =>
            message.type === "AGENT_STATUS" &&
            message.payload.agent_run_id === workerRunId &&
            message.payload.status === "idle",
          "worker AGENT_STATUS IDLE after follow-up",
        );

        const forbiddenFailuresAfterInterrupt =
          streamMessages.slice(interruptStartIndex).filter(isForbiddenRuntimeFailure);
        expect(forbiddenFailuresAfterInterrupt).toHaveLength(0);
      } finally {
        teamSocket.close();
      }
    },
    240_000,
  );

  it(
    "creates a nested team definition and routes live Claude inter-agent messaging between leaf members",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredClaudeToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-nested-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const rootInstructions = `
You are participating in a nested team-definition validation.

Rules:
1. Follow direct user instructions exactly.
2. Do not explore the environment.
3. The only tool you may execute is send_message_to.
4. If the user asks you to call send_message_to with explicit JSON arguments, call it exactly once with those exact arguments.
5. Keep assistant text responses short.
`;

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const parentAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-parent-${unique}`,
            role: "assistant",
            description: "Claude nested parent coordinator.",
            instructions: rootInstructions,
            toolNames: ["send_message_to"],
          },
        },
      );
      const parentAgentDefinitionId = parentAgentDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(parentAgentDefinitionId);

      const specialistAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-specialist-${unique}`,
            role: "assistant",
            description: "Claude nested leaf specialist.",
            instructions:
              "Reply in one short sentence. If you receive a teammate message, acknowledge it briefly.",
          },
        },
      );
      const specialistAgentDefinitionId = specialistAgentDefResult.createAgentDefinition.id;
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
          name: `claude-subteam-${unique}`,
          description: "Nested Claude subteam definition.",
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
      const subTeamDefinitionId = subTeamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(subTeamDefinitionId);

      const rootTeamDefinitionResult = await execGraphql<{
        createAgentTeamDefinition: { id: string };
      }>(createTeamDefinitionMutation, {
        input: {
          name: `claude-nested-root-${unique}`,
          description: "Nested root Claude team definition.",
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
      const rootTeamDefinitionId = rootTeamDefinitionResult.createAgentTeamDefinition.id;
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
        createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(createTeamRunMutation, {
        input: {
          teamDefinitionId: rootTeamDefinitionId,
          teamConfigs: [
            {
              teamAddress: "/",
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
            {
              teamAddress: "/research_subteam",
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
          ],
          memberConfigs: [
            {
              memberAddress: "/parent",
              agentDefinitionId: parentAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
            {
              memberAddress: "/research_subteam/specialist",
              agentDefinitionId: specialistAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
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

      const relayToken = `NESTED-RELAY:${unique}`;
      const nestedResume = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId });
      const nestedExecutions = flattenE2eConfiguredAgentExecutions(
        nestedResume.getTeamRunResumeConfig.executionTree,
      );
      const nestedRunIdByName = new Map(
        nestedExecutions.map((member) => [member.memberName, member.agentRunId]),
      );
      const nestedAddressByName = new Map(
        nestedExecutions.map((member) => [member.memberName, member.memberAddress]),
      );
      const parentRunId = nestedRunIdByName.get("parent");
      const specialistRunId = nestedRunIdByName.get("specialist");
      const specialistAddress = nestedAddressByName.get("specialist");
      expect(parentRunId).toBeTruthy();
      expect(specialistRunId).toBeTruthy();
      expect(specialistAddress).toBeTruthy();
      const { streamUrl } = await startClaudeRuntimeTestServer();
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
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
          // ignore malformed rows in test stream capture
        }
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
        const argsJson = JSON.stringify({
          recipient_address: specialistAddress,
          content: `Nested relay ${relayToken}`,
          message_type: "nested_roundtrip",
        });
        sendTeamMessageOverSocket(teamSocket, {
          agentRunId: parentRunId as string,
          content:
            "Call send_message_to exactly once now with these exact JSON arguments: " +
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
            (message.payload.metadata as Record<string, unknown>).tool_name === "send_message_to",
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
        teamSocket.close();
      }
    },
    180_000,
  );

  it(
    "preserves workspace mapping across create->terminate->restore->continue for claude team runs created with workspaceId",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredClaudeToolModelIdentifier();
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

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-professor-${unique}`,
            role: "assistant",
            description: "Claude team workspace lifecycle professor agent.",
            instructions: "Reply concisely in one sentence.",
          },
        },
      );
      const professorAgentDefinitionId = professorAgentDefResult.createAgentDefinition.id;
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
                refScope: "SHARED",
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
          teamConfigs: [{
            teamAddress: "/",
            llmModelIdentifier: modelIdentifier,
            autoExecuteTools: true,
            skillAccessMode: "NONE",
            runtimeKind: "claude_agent_sdk",
            workspaceRootPath,
          }],
          memberConfigs: [
            {
              memberAddress: "/professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
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
      const workspaceResume = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId });
      const professorRunId = flattenE2eConfiguredAgentExecutions(
        workspaceResume.getTeamRunResumeConfig.executionTree,
      ).find((member) => member.memberName === "professor")?.agentRunId;
      expect(professorRunId).toBeTruthy();

      const { streamUrl } = await startClaudeRuntimeTestServer();
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
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
          // ignore malformed rows in test stream capture
        }
      });

      sendTeamMessageOverSocket(teamSocket, {
        agentRunId: professorRunId as string,
        content: "Reply with READY.",
      });

      const deadline = Date.now() + 120_000;
      let matchedRow:
        | {
            teamRunId: string;
            workspaceRootPath: string | null;
            members: Array<{ displayName: string; workspaceRootPath: string | null }>;
          }
        | null = null;
      while (Date.now() < deadline) {
        const listResult = await execGraphql<{
          listWorkspaceRunHistory: Array<{
            workspaceRootPath: string;
            teamDefinitions: Array<{
              runs: Array<{
                teamRunId: string;
                workspaceRootPath: string | null;
                members: Array<{ displayName: string; workspaceRootPath: string | null }>;
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
      }>(terminateTeamRunMutation, { teamRunId });
      expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

      const restoreResult = await execGraphql<{
        restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(restoreTeamRunMutation, { teamRunId });
      expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
      expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);

      const streamCountBeforeContinue = streamMessages.length;
      sendTeamMessageOverSocket(teamSocket, {
        agentRunId: professorRunId as string,
        content: "Reply with READY again.",
      });

      while (Date.now() < deadline) {
        const followUpSeen = streamMessages.slice(streamCountBeforeContinue).some(
          (message) =>
            (message.type === "SEGMENT_END" || message.type === "ASSISTANT_COMPLETE") &&
            message.payload.agent_run_id === professorRunId,
        );
        if (followUpSeen) {
          break;
        }
        await wait(1_000);
      }
      expect(
        streamMessages.slice(streamCountBeforeContinue).some(
          (message) =>
            (message.type === "SEGMENT_END" || message.type === "ASSISTANT_COMPLETE") &&
            message.payload.agent_run_id === professorRunId,
        ),
      ).toBe(true);

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: {
          teamRunId: string;
          isActive: boolean;
          executionTree: Record<string, unknown>;
        };
      }>(E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId });

      expect(resumeResult.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
      expect(
        flattenE2eConfiguredAgentExecutions(resumeResult.getTeamRunResumeConfig.executionTree).every(
          (binding) => binding.workspaceRootPath === workspaceRootPath,
        ),
      ).toBe(true);

      teamSocket.close();
    },
    180_000,
  );

  it(
    "serves every team member projection after terminate, restore, and continue in claude team runtime",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredClaudeToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-projection-e2e-"));
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

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-projection-professor-${unique}`,
            role: "assistant",
            description: "Claude team projection professor agent.",
            instructions: "Reply with exactly the requested token and nothing else.",
          },
        },
      );
      const studentAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-projection-student-${unique}`,
            role: "assistant",
            description: "Claude team projection student agent.",
            instructions: "Reply with exactly the requested token and nothing else.",
          },
        },
      );
      const professorAgentDefinitionId = professorAgentDefResult.createAgentDefinition.id;
      const studentAgentDefinitionId = studentAgentDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(professorAgentDefinitionId);
      createdAgentDefinitionIds.add(studentAgentDefinitionId);

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
            name: `claude-projection-team-${unique}`,
            description: "Claude team projection validation team.",
            instructions: "Route incoming user requests to the requested target member.",
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
          teamConfigs: [{
            teamAddress: "/",
            llmModelIdentifier: modelIdentifier,
            autoExecuteTools: true,
            skillAccessMode: "NONE",
            runtimeKind: "claude_agent_sdk",
            workspaceRootPath,
          }],
          memberConfigs: [
            {
              memberAddress: "/professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
            {
              memberAddress: "/student",
              agentDefinitionId: studentAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
          ],
        },
      });
      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
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

      const { streamUrl } = await startClaudeRuntimeTestServer();
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      const streamMessages: TeamStreamMessage[] = [];
      teamSocket.on("message", (raw) => captureTeamStreamMessage(streamMessages, raw));
      await waitForSocketOpen(teamSocket);

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT, { teamRunId });
      const memberBindings = flattenE2eConfiguredAgentExecutions(
        resumeResult.getTeamRunResumeConfig.executionTree,
      );
      const professorBinding = memberBindings.find((binding) => binding.memberName === "professor");
      const studentBinding = memberBindings.find((binding) => binding.memberName === "student");
      expect(professorBinding).toBeTruthy();
      expect(studentBinding).toBeTruthy();
      if (!professorBinding || !studentBinding) {
        throw new Error("Expected both Claude team member bindings to be present.");
      }

      type TeamMemberProjection = {
        agentRunId: string;
        summary: string | null;
        lastActivityAt: string | null;
        conversation: Array<Record<string, unknown>>;
      };

      const members = [
        {
          memberName: "professor",
          binding: professorBinding,
          firstToken: `CLAUDE_TEAM_PROJECTION_PROFESSOR_FIRST_${randomUUID().replace(/-/g, "_")}`,
          secondToken: `CLAUDE_TEAM_PROJECTION_PROFESSOR_SECOND_${randomUUID().replace(/-/g, "_")}`,
        },
        {
          memberName: "student",
          binding: studentBinding,
          firstToken: `CLAUDE_TEAM_PROJECTION_STUDENT_FIRST_${randomUUID().replace(/-/g, "_")}`,
          secondToken: `CLAUDE_TEAM_PROJECTION_STUDENT_SECOND_${randomUUID().replace(/-/g, "_")}`,
        },
      ];

      const fetchProjection = async (agentRunId: string): Promise<TeamMemberProjection> => {
        return getTeamMemberRunViewProjectionService().getProjection(teamRunId, agentRunId);
      };

      const waitForProjectionTokens = async (
        agentRunId: string,
        requiredTokens: string[],
      ): Promise<TeamMemberProjection> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const projection = await fetchProjection(agentRunId);
          const serializedConversation = JSON.stringify(projection.conversation);
          if (requiredTokens.every((token) => serializedConversation.includes(token))) {
            return projection;
          }
          await wait(2_000);
        }
        throw new Error(
          `Timed out waiting for Claude projection tokens: ${requiredTokens.join(", ")}`,
        );
      };

      const expectTerminatedProjection = async (
        member: (typeof members)[number],
        requiredTokens: string[],
      ): Promise<void> => {
        const projection = await fetchProjection(member.binding.agentRunId);
        expect(projection.agentRunId).toBe(member.binding.agentRunId);
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
        await waitForTeamStreamMessageAfter(
          streamMessages,
          startIndex,
          (message) =>
            ["SEGMENT_CONTENT", "SEGMENT_END", "ASSISTANT_COMPLETE"].includes(message.type) &&
            message.payload.agent_run_id === agentRunId &&
            JSON.stringify(message.payload).includes(token),
          `${memberName} assistant token ${token}`,
          120_000,
        );
      };

      try {
        for (const member of members) {
          const startIndex = streamMessages.length;
          sendTeamMessageOverSocket(teamSocket, {
            agentRunId: member.binding.agentRunId,
            content: `Reply with exactly ${member.firstToken} and nothing else.`,
          });
          await waitForAssistantToken(
            member.binding.agentRunId,
            member.memberName,
            member.firstToken,
            startIndex,
          );
          await waitForProjectionTokens(member.binding.agentRunId, [member.firstToken]);
        }

        const firstTerminateResult = await execGraphql<{
          terminateAgentTeamRun: { success: boolean; message: string };
        }>(terminateTeamRunMutation, { teamRunId });
        expect(firstTerminateResult.terminateAgentTeamRun.success).toBe(true);

        for (const member of members) {
          await expectTerminatedProjection(member, [member.firstToken]);
        }

        const restoreResult = await execGraphql<{
          restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
        }>(restoreTeamRunMutation, { teamRunId });
        expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
        expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);

        for (const member of members) {
          const startIndex = streamMessages.length;
          sendTeamMessageOverSocket(teamSocket, {
            agentRunId: member.binding.agentRunId,
            content: `Reply with exactly ${member.secondToken} and nothing else.`,
          });
          await waitForAssistantToken(
            member.binding.agentRunId,
            member.memberName,
            member.secondToken,
            startIndex,
          );
          await waitForProjectionTokens(member.binding.agentRunId, [member.firstToken, member.secondToken]);
        }

        const secondTerminateResult = await execGraphql<{
          terminateAgentTeamRun: { success: boolean; message: string };
        }>(terminateTeamRunMutation, { teamRunId });
        expect(secondTerminateResult.terminateAgentTeamRun.success).toBe(true);

        for (const member of members) {
          await expectTerminatedProjection(member, [member.firstToken, member.secondToken]);
        }
      } finally {
        teamSocket.close();
        await execGraphql<{
          terminateAgentTeamRun: { success: boolean; message: string };
        }>(terminateTeamRunMutation, { teamRunId }).catch(() => undefined);
      }
    },
    300_000,
  );
});
