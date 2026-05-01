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

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexRuntime = codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;
const originalCodexApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;

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
    targetMemberName?: string | null;
    contextFilePaths?: string[];
    imageUrls?: string[];
  },
): void => {
  socket.send(
    JSON.stringify({
      type: "SEND_MESSAGE",
      payload: {
        content: input.content,
        target_member_name: input.targetMemberName ?? null,
        context_file_paths: input.contextFilePaths ?? [],
        image_urls: input.imageUrls ?? [],
      },
    }),
  );
};

describeCodexRuntime("Codex team inter-agent roundtrip e2e (live transport)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    // Keep Codex shell/file tools on the approval path; send_message_to is now handled as a dynamic tool call.
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "codex-team-runtime-e2e-appdata-"));
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
    if (typeof originalCodexApprovalPolicy === "string") {
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = originalCodexApprovalPolicy;
    } else {
      delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
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

  const fetchPreferredCodexToolModelIdentifier = async (): Promise<string> => {
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
      runtimeKind: "codex_app_server",
    });

    const allModelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.length > 0),
    );
    if (allModelIdentifiers.length === 0) {
      throw new Error("No Codex runtime model was returned by availableLlmProvidersWithModels.");
    }

    const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
    if (override && allModelIdentifiers.includes(override)) {
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
      if (allModelIdentifiers.includes(preferred)) {
        return preferred;
      }
    }

    const codexModel = allModelIdentifiers.find((modelIdentifier) =>
      modelIdentifier.toLowerCase().includes("codex"),
    );
    return codexModel ?? allModelIdentifiers[0];
  };

  it(
    "routes live inter-agent send_message_to ping->pong->ping roundtrip in codex team runtime",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-team-roundtrip-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const teamInstructions = `
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
      const pingAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `codex-ping-${unique}`,
            role: "assistant",
            description: "Codex ping agent for live inter-agent roundtrip validation.",
            instructions: teamInstructions,
            toolNames: ["send_message_to"],
          },
        },
      );
      const pongAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `codex-pong-${unique}`,
            role: "assistant",
            description: "Codex pong agent for live inter-agent roundtrip validation.",
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
            name: `codex-roundtrip-team-${unique}`,
            description: "Live codex inter-agent roundtrip validation team.",
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
          memberConfigs: [
            {
              memberName: "ping",
              agentDefinitionId: pingAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              memberName: "pong",
              agentDefinitionId: pongAgentDefinitionId,
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
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const teamResumeQuery = `
        query TeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) {
            metadata
          }
        }
      `;
      const memoryViewQuery = `
        query TeamMemberMemory($teamRunId: String!, $memberRunId: String!) {
          getTeamMemberRunMemoryView(
            teamRunId: $teamRunId,
            memberRunId: $memberRunId,
            includeWorkingContext: false,
            includeEpisodic: false,
            includeSemantic: false,
            includeRawTraces: true,
            rawTraceLimit: 200
          ) {
            rawTraces {
              traceType
              sourceEvent
              toolName
              toolCallId
              toolArgs
              toolResult
              toolError
            }
          }
        }
      `;
      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: {
          metadata: {
            memberMetadata: Array<{ memberName: string; memberRunId: string }>;
          };
        };
      }>(teamResumeQuery, { teamRunId });
      const memberRunIdByName = new Map(
        resumeResult.getTeamRunResumeConfig.metadata.memberMetadata.map((member) => [
          member.memberName,
          member.memberRunId,
        ]),
      );
      expect(memberRunIdByName.get("ping")).toBeTruthy();
      expect(memberRunIdByName.get("pong")).toBeTruthy();

      const pingToken = `ROUNDTRIP_PING:${unique}`;
      const pongToken = `ROUNDTRIP_PONG:${unique}`;
      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
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
        sendTeamMessageOverSocket(teamSocket, {
          targetMemberName: input.targetMemberName,
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

      const waitForSendMessageMemoryTrace = async (input: {
        senderMemberName: "ping" | "pong";
        recipientMemberName: "ping" | "pong";
        content: string;
        invocationId: string;
      }): Promise<void> => {
        const memberRunId = memberRunIdByName.get(input.senderMemberName);
        expect(memberRunId).toBeTruthy();
        let lastRawTraces: Array<{
          traceType: string;
          sourceEvent: string | null;
          toolName: string | null;
          toolCallId: string | null;
          toolArgs: Record<string, unknown> | null;
          toolResult: unknown | null;
          toolError: string | null;
        }> = [];
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const memoryResult = await execGraphql<{
            getTeamMemberRunMemoryView: {
              rawTraces: Array<{
                traceType: string;
                sourceEvent: string | null;
                toolName: string | null;
                toolCallId: string | null;
                toolArgs: Record<string, unknown> | null;
                toolResult: unknown | null;
                toolError: string | null;
              }> | null;
            };
          }>(memoryViewQuery, { teamRunId, memberRunId });
          lastRawTraces = memoryResult.getTeamMemberRunMemoryView.rawTraces ?? [];
          const matchingToolCalls = lastRawTraces.filter(
            (trace) =>
              trace.traceType === "tool_call" &&
              trace.toolName === "send_message_to" &&
              trace.toolCallId === input.invocationId,
          );
          const matchingToolResults = lastRawTraces.filter(
            (trace) =>
              trace.traceType === "tool_result" &&
              trace.toolName === "send_message_to" &&
              trace.toolCallId === input.invocationId,
          );
          if (matchingToolCalls.length === 1 && matchingToolResults.length === 1) {
            expect(matchingToolCalls[0]?.sourceEvent).toBe("TOOL_EXECUTION_STARTED");
            expect(matchingToolCalls[0]?.toolArgs).toMatchObject({
              recipient_name: input.recipientMemberName,
              content: input.content,
            });
            expect(matchingToolResults[0]?.sourceEvent).toBe("TOOL_EXECUTION_SUCCEEDED");
            expect(matchingToolResults[0]?.toolError).toBeNull();
            expect(String(matchingToolResults[0]?.toolResult ?? "").trim().length).toBeGreaterThan(
              0,
            );
            return;
          }
          await wait(1_000);
        }
        throw new Error(
          `Timed out waiting for ${input.senderMemberName} send_message_to memory traces for invocation ${input.invocationId}. ` +
            `Observed traces: ${JSON.stringify(lastRawTraces)}`,
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
          if (message.payload.agent_name !== input.senderMemberName) {
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
          return args.recipient_name === input.recipientMemberName && args.content === input.content;
        };

        const isMatchingSendMessageLifecycle = (
          message: { type: string; payload: Record<string, unknown> },
          eventType: "TOOL_EXECUTION_STARTED" | "TOOL_EXECUTION_SUCCEEDED" | "TOOL_EXECUTION_FAILED",
          invocationId: string,
        ): boolean => {
          if (message.type !== eventType) {
            return false;
          }
          if (message.payload.agent_name !== input.senderMemberName) {
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

        const firstMatchingSegmentStart = streamMessages.find((message) =>
          isMatchingSendMessageSegmentStart(message),
        );
        const invocationId = firstMatchingSegmentStart?.payload.id;
        expect(typeof invocationId).toBe("string");

        await waitForTeamStreamEvent(
          (message) =>
            isMatchingSendMessageLifecycle(
              message,
              "TOOL_EXECUTION_STARTED",
              invocationId as string,
            ),
          `${input.senderMemberName} send_message_to TOOL_EXECUTION_STARTED`,
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
            isMatchingSendMessageLifecycle(
              message,
              "TOOL_EXECUTION_SUCCEEDED",
              invocationId as string,
            ),
          `${input.senderMemberName} send_message_to TOOL_EXECUTION_SUCCEEDED`,
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "SEGMENT_END" &&
            message.payload.agent_name === input.recipientMemberName,
          `${input.recipientMemberName} response SEGMENT_END`,
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

        await waitForSendMessageMemoryTrace({
          ...input,
          invocationId: invocationId as string,
        });
      };

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
    "creates a nested team definition and routes live Codex inter-agent messaging between leaf members",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-team-nested-e2e-"));
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
            name: `codex-parent-${unique}`,
            role: "assistant",
            description: "Codex nested parent coordinator.",
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
            name: `codex-specialist-${unique}`,
            role: "assistant",
            description: "Codex nested leaf specialist.",
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
      const subTeamDefinitionId = subTeamDefinitionResult.createAgentTeamDefinition.id;
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
          memberConfigs: [
            {
              memberName: "parent",
              agentDefinitionId: parentAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              memberName: "specialist",
              agentDefinitionId: specialistAgentDefinitionId,
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
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const relayToken = `NESTED-RELAY:${unique}`;
      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
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
          recipient_name: "specialist",
          content: `Nested relay ${relayToken}`,
          message_type: "nested_roundtrip",
        });
        sendTeamMessageOverSocket(teamSocket, {
          targetMemberName: "parent",
          content:
            "Call send_message_to exactly once now with these exact JSON arguments: " +
            `${argsJson}. Do not call any other tool.`,
        });

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "SEGMENT_START" &&
            message.payload.agent_name === "parent" &&
            message.payload.segment_type === "tool_call" &&
            typeof message.payload.metadata === "object" &&
            message.payload.metadata !== null &&
            !Array.isArray(message.payload.metadata) &&
            (message.payload.metadata as Record<string, unknown>).tool_name === "send_message_to",
          "parent send_message_to SEGMENT_START",
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "INTER_AGENT_MESSAGE" &&
            message.payload.agent_name === "specialist" &&
            message.payload.sender_agent_name === "parent" &&
            message.payload.recipient_role_name === "specialist" &&
            message.payload.content === `Nested relay ${relayToken}`,
          "specialist INTER_AGENT_MESSAGE receipt",
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "SEGMENT_END" &&
            message.payload.agent_name === "specialist",
          "specialist response SEGMENT_END",
        );
      } finally {
        teamSocket.close();
        await streamApp.close();
      }
    },
    180_000,
  );

  it(
    "streams recipient answer after send_message_to and surfaces reasoning when available in codex team runtime",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-team-reasoning-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const professorInstructions = `
You are the professor member in a two-agent team with members "professor" and "student".

Rules:
1. Follow direct user instructions exactly.
2. You must not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. If the user asks you to call send_message_to with explicit JSON arguments, call send_message_to exactly once with those exact arguments and do not call any other tool.
5. Keep assistant text responses empty unless the user explicitly asks for them.
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
      const professorResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `codex-professor-${unique}`,
            role: "assistant",
            description: "Codex professor agent for recipient reasoning streaming validation.",
            instructions: professorInstructions,
            toolNames: ["send_message_to"],
          },
        },
      );
      const studentResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `codex-student-${unique}`,
            role: "assistant",
            description: "Codex student agent for recipient reasoning streaming validation.",
            instructions: studentInstructions,
          },
        },
      );
      const professorAgentDefinitionId = professorResult.createAgentDefinition.id;
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
      const teamDefinitionResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `codex-reasoning-team-${unique}`,
            description: "Codex team for recipient reasoning streaming verification.",
            instructions: "Professor delegates a reasoning task to student; student answers directly.",
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
          memberConfigs: [
            {
              memberName: "professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              llmConfig: { reasoning_effort: "high" },
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              memberName: "student",
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
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);

      const streamMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];
      teamSocket.on("message", (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as { type?: unknown; payload?: unknown };
          if (typeof parsed.type !== "string") {
            return;
          }
          const payload =
            parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
              ? (parsed.payload as Record<string, unknown>)
              : {};
          streamMessages.push({ type: parsed.type, payload });
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

      const reasoningPrompt =
        "Solve this carefully before replying: " +
        "1. Find the next number in the sequence 2, 6, 12, 20, 30. " +
        "2. Rearrange the letters in LISTEN into another common English word. " +
        "Reply with exactly one short sentence containing both answers.";
      const argsJson = JSON.stringify({
        recipient_name: "student",
        content: reasoningPrompt,
        message_type: "reasoning_check",
      });

      try {
        const startIndex = streamMessages.length;
        sendTeamMessageOverSocket(teamSocket, {
          targetMemberName: "professor",
          content:
            "Call send_message_to exactly once now with these exact JSON arguments: " +
            `${argsJson}. Do not call any other tool.`,
        });

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "SEGMENT_END" &&
            message.payload.agent_name === "student",
          "student text SEGMENT_END",
        );
        await wait(1_500);

        const relevantMessages = streamMessages.slice(startIndex);
        const reasoningChunks = relevantMessages.filter(
          (message) =>
            message.type === "SEGMENT_CONTENT" &&
            message.payload.agent_name === "student" &&
            message.payload.segment_type === "reasoning" &&
            typeof message.payload.delta === "string" &&
            message.payload.delta.trim().length > 0,
        );
        const textChunks = relevantMessages.filter(
          (message) =>
            message.type === "SEGMENT_CONTENT" &&
            message.payload.agent_name === "student" &&
            message.payload.segment_type === "text" &&
            typeof message.payload.delta === "string" &&
            message.payload.delta.trim().length > 0,
        );

        expect(textChunks.length).toBeGreaterThan(0);
        expect(reasoningChunks.length).toBeGreaterThanOrEqual(0);
      } finally {
        teamSocket.close();
        await streamApp.close();
      }
    },
    180_000,
  );

  it(
    "preserves workspace mapping across create->send->terminate->continue for codex team runs created with workspaceId",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-team-workspaceid-e2e-"));
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
            name: `codex-professor-${unique}`,
            role: "assistant",
            description: "Codex team workspace lifecycle professor agent.",
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
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceId,
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
                  memberName
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
            metadata
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
        content: "Reply with READY.",
      });

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
          listWorkspaceRunHistory: Array<{
            workspaceRootPath: string;
            teamDefinitions: Array<{
              runs: Array<{
                teamRunId: string;
                workspaceRootPath: string | null;
                members: Array<{ memberName: string; workspaceRootPath: string | null }>;
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
        content: "Reply with READY again.",
      });

      while (Date.now() < deadline) {
        const followUpSeen = streamMessages.slice(streamCountBeforeContinue).some(
          (message) =>
            (message.type === "SEGMENT_END" || message.type === "ASSISTANT_COMPLETE") &&
            message.payload.agent_name === "professor",
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
            message.payload.agent_name === "professor",
        ),
      ).toBe(true);

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: {
          teamRunId: string;
          isActive: boolean;
          metadata: {
            workspaceRootPath: string | null;
            memberMetadata: Array<{ memberName: string; workspaceRootPath: string | null }>;
          };
        };
      }>(teamResumeQuery, { teamRunId });

      expect(resumeResult.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
      expect(
        resumeResult.getTeamRunResumeConfig.metadata.memberMetadata.every(
          (binding) => binding.workspaceRootPath === workspaceRootPath,
        ),
      ).toBe(true);

      teamSocket.close();
      await streamApp.close();
    },
    180_000,
  );

  it(
    "keeps untouched secondary member projection empty while coordinator projection remains queryable in codex team runtime",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-team-projection-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `codex-projection-professor-${unique}`,
            role: "assistant",
            description: "Coordinator member for Codex projection stability validation.",
            instructions: "Reply with exactly ACK professor.",
          },
        },
      );
      const studentResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `codex-projection-student-${unique}`,
            role: "assistant",
            description: "Unused secondary member for Codex projection stability validation.",
            instructions: "Stay idle unless directly addressed.",
          },
        },
      );
      const professorAgentDefinitionId = professorResult.createAgentDefinition.id;
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
      const teamDefinitionResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `codex-projection-team-${unique}`,
            description: "Codex team projection stability validation.",
            instructions: "Route incoming user requests to the professor coordinator by default.",
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
          memberConfigs: [
            {
              memberName: "professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              memberName: "student",
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
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);

      sendTeamMessageOverSocket(teamSocket, {
        targetMemberName: "professor",
        content: "Reply with exactly ACK professor.",
      });

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

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: {
          metadata: {
            memberMetadata: Array<{ memberName: string; memberRouteKey: string; memberRunId: string }>;
          };
        };
      }>(teamResumeQuery, { teamRunId });
      const professorRouteKey =
        resumeResult.getTeamRunResumeConfig.metadata.memberMetadata.find(
          (binding) => binding.memberName === "professor",
        )?.memberRouteKey ?? "professor";
      const studentBinding =
        resumeResult.getTeamRunResumeConfig.metadata.memberMetadata.find(
          (binding) => binding.memberName === "student",
        ) ?? null;

      expect(studentBinding).toBeTruthy();

      let professorProjection:
        | {
            agentRunId: string;
            conversation: Array<{ content?: string | null }>;
          }
        | null = null;
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        const projectionResult = await execGraphql<{
          getTeamMemberRunProjection: {
            agentRunId: string;
            conversation: Array<{ content?: string | null }>;
          };
        }>(projectionQuery, {
          teamRunId,
          memberRouteKey: professorRouteKey,
        });
        professorProjection = projectionResult.getTeamMemberRunProjection;
        if (
          professorProjection.conversation.some((entry) =>
            String(entry.content ?? "").includes("ACK professor"),
          )
        ) {
          break;
        }
        await wait(2_000);
      }

      expect(professorProjection).toBeTruthy();
      expect(
        professorProjection?.conversation.some((entry) =>
          String(entry.content ?? "").includes("ACK professor"),
        ),
      ).toBe(true);

      const studentProjectionResult = await execGraphql<{
        getTeamMemberRunProjection: {
          agentRunId: string;
          summary: string | null;
          lastActivityAt: string | null;
          conversation: Array<Record<string, unknown>>;
        };
      }>(projectionQuery, {
        teamRunId,
        memberRouteKey: studentBinding?.memberRouteKey ?? "student",
      });

      expect(studentProjectionResult.getTeamMemberRunProjection.agentRunId).toBe(
        studentBinding?.memberRunId,
      );
      expect(studentProjectionResult.getTeamMemberRunProjection.summary).toBeNull();
      expect(studentProjectionResult.getTeamMemberRunProjection.lastActivityAt).toBeNull();
      expect(studentProjectionResult.getTeamMemberRunProjection.conversation).toEqual([]);

      teamSocket.close();
      await streamApp.close();
    },
    180_000,
  );
});
