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
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen/qwen3.5-35b-a3b";
const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveMixedTestsEnabled =
  process.env.RUN_LMSTUDIO_E2E === "1" && process.env.RUN_CODEX_E2E === "1";
const describeMixedRuntime = codexBinaryReady && liveMixedTestsEnabled ? describe : describe.skip;
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

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type TeamMemberMetadata = {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  workspaceRootPath: string | null;
  platformAgentRunId: string | null;
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

const findMemberBinding = (
  members: TeamMemberMetadata[],
  memberName: string,
): TeamMemberMetadata => {
  const binding = members.find((member) => member.memberName === memberName) ?? null;
  expect(binding).toBeTruthy();
  return binding as TeamMemberMetadata;
};

describeMixedRuntime("Mixed AutoByteus+Codex GraphQL runtime e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "mixed-team-runtime-e2e-appdata-"));
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

  const fetchAutoByteusModelIdentifier = async (): Promise<string> => {
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
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });

    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.trim().length > 0),
    );
    if (modelIdentifiers.length === 0) {
      throw new Error("No AutoByteus model identifier was returned for mixed runtime e2e.");
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
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
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
    return codexModel ?? allModelIdentifiers[0]!;
  };

  const createAgentDefinition = async (input: {
    memberName: string;
    description: string;
  }): Promise<string> => {
    const mutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
        }
      }
    `;

    const instructions = `
You are participating in a live mixed-runtime team validation.

Rules:
1. Follow direct user instructions exactly.
2. Do not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. If the user asks you to call send_message_to with explicit JSON arguments, call send_message_to exactly once with those exact arguments and do not call any other tool.
5. If you receive a teammate message that asks for an exact token, reply in plain assistant text with that exact token and nothing else.
6. Do not use send_message_to unless the current direct user instruction explicitly provides JSON arguments for it.
7. Otherwise keep assistant text responses very short.
`;

    const result = await execGraphql<{
      createAgentDefinition: { id: string };
    }>(mutation, {
      input: {
        name: `mixed-${input.memberName}-${randomUUID()}`,
        role: "assistant",
        description: input.description,
        instructions,
        category: "runtime-e2e",
        toolNames: ["send_message_to"],
      },
    });

    createdAgentDefinitionIds.add(result.createAgentDefinition.id);
    return result.createAgentDefinition.id;
  };

  const openTeamSocket = async (teamRunId: string): Promise<{
    streamApp: ReturnType<typeof fastify>;
    socket: WebSocket;
    messages: WsMessage[];
  }> => {
    const streamApp = fastify();
    await streamApp.register(websocket);
    await registerAgentWebsocket(streamApp);
    const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
    const streamUrl = new URL(streamAddress);
    const socket = new WebSocket(`ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      const parsed = parseWsMessage(raw);
      if (parsed) {
        messages.push(parsed);
      }
    });
    await waitForSocketOpen(socket);
    await waitForMessage(messages, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);
    return {
      streamApp,
      socket,
      messages,
    };
  };

  const waitForInterAgentDeliveryTurn = async (input: {
    messages: WsMessage[];
    startIndex: number;
    senderMemberName: string;
    recipientMemberName: string;
    content: string;
  }): Promise<void> => {
    await waitForMessageAfter(
      input.messages,
      input.startIndex,
      (message) => {
        if (message.payload.agent_name !== input.senderMemberName) {
          return false;
        }

        if (
          message.type === "SEGMENT_START" &&
          message.payload.segment_type === "tool_call" &&
          message.payload.metadata &&
          typeof message.payload.metadata === "object" &&
          !Array.isArray(message.payload.metadata)
        ) {
          const metadata = message.payload.metadata as Record<string, unknown>;
          if (metadata.tool_name !== "send_message_to") {
            return false;
          }
          const args =
            metadata.arguments &&
            typeof metadata.arguments === "object" &&
            !Array.isArray(metadata.arguments)
              ? (metadata.arguments as Record<string, unknown>)
              : null;
          return (
            args?.recipient_name === input.recipientMemberName &&
            args.content === input.content
          );
        }

        return (
          message.type === "TOOL_EXECUTION_SUCCEEDED" &&
          message.payload.tool_name === "send_message_to"
        );
      },
      `${input.senderMemberName} send_message_to execution`,
    );

    await waitForMessageAfter(
      input.messages,
      input.startIndex,
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
  };

  const fetchResumeMetadata = async (teamRunId: string): Promise<TeamMemberMetadata[]> => {
    const teamResumeQuery = `
      query TeamResume($teamRunId: String!) {
        getTeamRunResumeConfig(teamRunId: $teamRunId) {
          teamRunId
          isActive
          metadata
        }
      }
    `;

    const result = await execGraphql<{
      getTeamRunResumeConfig: {
        teamRunId: string;
        isActive: boolean;
        metadata: {
          memberMetadata: TeamMemberMetadata[];
        };
      };
    }>(teamResumeQuery, { teamRunId });

    expect(result.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
    return result.getTeamRunResumeConfig.metadata.memberMetadata;
  };

  const waitForProjectionTokens = async (input: {
    teamRunId: string;
    memberRouteKey: string;
    requiredTokens: string[];
  }): Promise<{
    agentRunId: string;
    summary: string | null;
    lastActivityAt: string | null;
    conversation: Array<Record<string, unknown>>;
  }> => {
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

    let projection:
      | {
          agentRunId: string;
          summary: string | null;
          lastActivityAt: string | null;
          conversation: Array<Record<string, unknown>>;
        }
      | null = null;
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const result = await execGraphql<{
        getTeamMemberRunProjection: {
          agentRunId: string;
          summary: string | null;
          lastActivityAt: string | null;
          conversation: Array<Record<string, unknown>>;
        };
      }>(projectionQuery, {
        teamRunId: input.teamRunId,
        memberRouteKey: input.memberRouteKey,
      });
      projection = result.getTeamMemberRunProjection;
      const serializedConversation = JSON.stringify(projection.conversation);
      if (input.requiredTokens.every((token) => serializedConversation.includes(token))) {
        return projection;
      }
      await wait(2_000);
    }

    throw new Error(
      `Timed out waiting for projection tokens for route '${input.memberRouteKey}'.`,
    );
  };

  it(
    "creates a live mixed-runtime team, proves cross-runtime delivery in both directions, restores, and continues with the persisted runtime/model/workspace configuration",
    async () => {
      const unique = randomUUID();
      const autoByteusModelIdentifier = await fetchAutoByteusModelIdentifier();
      const codexModelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      expect(autoByteusModelIdentifier).not.toBe(codexModelIdentifier);

      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "mixed-team-runtime-workspace-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const coordinatorAgentDefinitionId = await createAgentDefinition({
        memberName: "coordinator",
        description: "Live mixed-runtime AutoByteus coordinator.",
      });
      const specialistAgentDefinitionId = await createAgentDefinition({
        memberName: "specialist",
        description: "Live mixed-runtime Codex specialist.",
      });

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
          name: `mixed-runtime-team-${unique}`,
          description: "Live mixed AutoByteus+Codex runtime validation team.",
          instructions: "Coordinate the team to execute directed teammate messaging only.",
          coordinatorMemberName: "coordinator",
          nodes: [
            {
              memberName: "coordinator",
              ref: coordinatorAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
            {
              memberName: "specialist",
              ref: specialistAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
          ],
        },
      });
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
              memberName: "coordinator",
              agentDefinitionId: coordinatorAgentDefinitionId,
              llmModelIdentifier: autoByteusModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              workspaceRootPath,
            },
            {
              memberName: "specialist",
              agentDefinitionId: specialistAgentDefinitionId,
              llmModelIdentifier: codexModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              workspaceRootPath,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const preRestoreAutoToCodexReplyToken = `MIXED_A2C_BEFORE_${unique}`;
      const preRestoreCodexToAutoReplyToken = `MIXED_C2A_BEFORE_${unique}`;
      const postRestoreAutoToCodexReplyToken = `MIXED_A2C_AFTER_${unique}`;
      const postRestoreCodexToAutoReplyToken = `MIXED_C2A_AFTER_${unique}`;

      const autoToCodexInstruction = (replyToken: string, messageType: string): string => {
        const argsJson = JSON.stringify({
          recipient_name: "specialist",
          content: `Reply with exactly ${replyToken} and nothing else.`,
          message_type: messageType,
        });
        return `Call send_message_to exactly once now with these exact JSON arguments: ${argsJson}. Do not call any other tool.`;
      };

      const codexToAutoInstruction = (replyToken: string, messageType: string): string => {
        const argsJson = JSON.stringify({
          recipient_name: "coordinator",
          content: `Reply with exactly ${replyToken} and nothing else.`,
          message_type: messageType,
        });
        return `Call send_message_to exactly once now with these exact JSON arguments: ${argsJson}. Do not call any other tool.`;
      };

      const firstConnection = await openTeamSocket(teamRunId);
      try {
        const autoToCodexStartIndex = firstConnection.messages.length;
        sendTeamMessageOverSocket(firstConnection.socket, {
          targetMemberName: "coordinator",
          content: autoToCodexInstruction(preRestoreAutoToCodexReplyToken, "mixed_a2c_before_restore"),
        });
        await waitForInterAgentDeliveryTurn({
          messages: firstConnection.messages,
          startIndex: autoToCodexStartIndex,
          senderMemberName: "coordinator",
          recipientMemberName: "specialist",
          content: `Reply with exactly ${preRestoreAutoToCodexReplyToken} and nothing else.`,
        });

        const codexToAutoStartIndex = firstConnection.messages.length;
        sendTeamMessageOverSocket(firstConnection.socket, {
          targetMemberName: "specialist",
          content: codexToAutoInstruction(preRestoreCodexToAutoReplyToken, "mixed_c2a_before_restore"),
        });
        await waitForInterAgentDeliveryTurn({
          messages: firstConnection.messages,
          startIndex: codexToAutoStartIndex,
          senderMemberName: "specialist",
          recipientMemberName: "coordinator",
          content: `Reply with exactly ${preRestoreCodexToAutoReplyToken} and nothing else.`,
        });
      } finally {
        firstConnection.socket.close();
        await firstConnection.streamApp.close();
      }

      const terminateMutation = `
        mutation TerminateAgentTeamRun($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `;
      const firstTerminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(firstTerminateResult.terminateAgentTeamRun.success).toBe(true);

      const storedBeforeRestore = await fetchResumeMetadata(teamRunId);
      expect(storedBeforeRestore).toHaveLength(2);

      const coordinatorBeforeRestore = findMemberBinding(storedBeforeRestore, "coordinator");
      const specialistBeforeRestore = findMemberBinding(storedBeforeRestore, "specialist");
      expect(coordinatorBeforeRestore.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
      expect(specialistBeforeRestore.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
      expect(coordinatorBeforeRestore.llmModelIdentifier).toBe(autoByteusModelIdentifier);
      expect(specialistBeforeRestore.llmModelIdentifier).toBe(codexModelIdentifier);
      expect(coordinatorBeforeRestore.workspaceRootPath).toBe(workspaceRootPath);
      expect(specialistBeforeRestore.workspaceRootPath).toBe(workspaceRootPath);
      expect(coordinatorBeforeRestore.platformAgentRunId).toBeTruthy();
      expect(specialistBeforeRestore.platformAgentRunId).toBeTruthy();

      const coordinatorProjectionBeforeRestore = await waitForProjectionTokens({
        teamRunId,
        memberRouteKey: coordinatorBeforeRestore.memberRouteKey,
        requiredTokens: [preRestoreCodexToAutoReplyToken],
      });
      expect(coordinatorProjectionBeforeRestore.agentRunId).toBe(coordinatorBeforeRestore.memberRunId);
      expect(JSON.stringify(coordinatorProjectionBeforeRestore.conversation)).toContain(
        preRestoreCodexToAutoReplyToken,
      );

      const specialistProjectionBeforeRestore = await waitForProjectionTokens({
        teamRunId,
        memberRouteKey: specialistBeforeRestore.memberRouteKey,
        requiredTokens: [preRestoreAutoToCodexReplyToken],
      });
      expect(specialistProjectionBeforeRestore.agentRunId).toBe(specialistBeforeRestore.memberRunId);
      expect(JSON.stringify(specialistProjectionBeforeRestore.conversation)).toContain(
        preRestoreAutoToCodexReplyToken,
      );

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

      const secondConnection = await openTeamSocket(teamRunId);
      try {
        const autoToCodexAfterRestoreStartIndex = secondConnection.messages.length;
        sendTeamMessageOverSocket(secondConnection.socket, {
          targetMemberName: "coordinator",
          content: autoToCodexInstruction(postRestoreAutoToCodexReplyToken, "mixed_a2c_after_restore"),
        });
        await waitForInterAgentDeliveryTurn({
          messages: secondConnection.messages,
          startIndex: autoToCodexAfterRestoreStartIndex,
          senderMemberName: "coordinator",
          recipientMemberName: "specialist",
          content: `Reply with exactly ${postRestoreAutoToCodexReplyToken} and nothing else.`,
        });

        const codexToAutoAfterRestoreStartIndex = secondConnection.messages.length;
        sendTeamMessageOverSocket(secondConnection.socket, {
          targetMemberName: "specialist",
          content: codexToAutoInstruction(postRestoreCodexToAutoReplyToken, "mixed_c2a_after_restore"),
        });
        await waitForInterAgentDeliveryTurn({
          messages: secondConnection.messages,
          startIndex: codexToAutoAfterRestoreStartIndex,
          senderMemberName: "specialist",
          recipientMemberName: "coordinator",
          content: `Reply with exactly ${postRestoreCodexToAutoReplyToken} and nothing else.`,
        });
      } finally {
        secondConnection.socket.close();
        await secondConnection.streamApp.close();
      }

      const secondTerminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(secondTerminateResult.terminateAgentTeamRun.success).toBe(true);

      const storedAfterRestore = await fetchResumeMetadata(teamRunId);
      const coordinatorAfterRestore = findMemberBinding(storedAfterRestore, "coordinator");
      const specialistAfterRestore = findMemberBinding(storedAfterRestore, "specialist");
      expect(coordinatorAfterRestore.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
      expect(specialistAfterRestore.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
      expect(coordinatorAfterRestore.llmModelIdentifier).toBe(autoByteusModelIdentifier);
      expect(specialistAfterRestore.llmModelIdentifier).toBe(codexModelIdentifier);
      expect(coordinatorAfterRestore.workspaceRootPath).toBe(workspaceRootPath);
      expect(specialistAfterRestore.workspaceRootPath).toBe(workspaceRootPath);
      expect(coordinatorAfterRestore.memberRouteKey).toBe(coordinatorBeforeRestore.memberRouteKey);
      expect(specialistAfterRestore.memberRouteKey).toBe(specialistBeforeRestore.memberRouteKey);
      expect(specialistAfterRestore.platformAgentRunId).toBe(specialistBeforeRestore.platformAgentRunId);

      const coordinatorProjectionAfterRestore = await waitForProjectionTokens({
        teamRunId,
        memberRouteKey: coordinatorAfterRestore.memberRouteKey,
        requiredTokens: [preRestoreCodexToAutoReplyToken, postRestoreCodexToAutoReplyToken],
      });
      const coordinatorSerializedConversation = JSON.stringify(
        coordinatorProjectionAfterRestore.conversation,
      );
      expect(coordinatorSerializedConversation).toContain(preRestoreCodexToAutoReplyToken);
      expect(coordinatorSerializedConversation).toContain(postRestoreCodexToAutoReplyToken);

      const specialistProjectionAfterRestore = await waitForProjectionTokens({
        teamRunId,
        memberRouteKey: specialistAfterRestore.memberRouteKey,
        requiredTokens: [preRestoreAutoToCodexReplyToken, postRestoreAutoToCodexReplyToken],
      });
      const specialistSerializedConversation = JSON.stringify(
        specialistProjectionAfterRestore.conversation,
      );
      expect(specialistSerializedConversation).toContain(preRestoreAutoToCodexReplyToken);
      expect(specialistSerializedConversation).toContain(postRestoreAutoToCodexReplyToken);
    },
    420_000,
  );
});
