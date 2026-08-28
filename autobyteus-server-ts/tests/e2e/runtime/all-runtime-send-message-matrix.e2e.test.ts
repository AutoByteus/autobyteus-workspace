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
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { isE2eTeamCommunicationMessage } from "../helpers/team-communication-message-helpers.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import {
  E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT,
} from "../helpers/team-run-graphql-documents.js";
import {
  closeLiveRuntimeSecretVault,
  initializeLiveRuntimeSecretVaultFromEnvironment,
} from "../helpers/live-runtime-secret-vault-helpers.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen3.6-35b-a3b";
const codexBinaryReady =
  spawnSync("codex", ["--version"], {
    stdio: "ignore",
  }).status === 0;
const claudeBinaryReady =
  spawnSync("claude", ["--version"], {
    stdio: "ignore",
  }).status === 0;
const liveAllRuntimeTestsEnabled =
  process.env.RUN_LMSTUDIO_E2E === "1" &&
  process.env.RUN_CODEX_E2E === "1" &&
  process.env.RUN_CLAUDE_E2E === "1";
const describeAllRuntimeMatrix =
  codexBinaryReady && claudeBinaryReady && liveAllRuntimeTestsEnabled
    ? describe
    : describe.skip;
const originalCodexApprovalPolicy =
  process.env.CODEX_APP_SERVER_APPROVAL_POLICY;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type TeamMemberExecution = {
  memberAddress: string;
  memberName: string;
  agentRunId: string;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  workspaceRootPath: string | null;
  platformAgentRunId: string | null;
};

type MatrixMemberName = "auto" | "codex" | "claude";

type MatrixRow = {
  id: string;
  senderMemberName: MatrixMemberName;
  senderRuntimeKind: RuntimeKind;
  recipientMemberName: MatrixMemberName;
  recipientRuntimeKind: RuntimeKind;
  replyToken: string;
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
      parsed.payload &&
      typeof parsed.payload === "object" &&
      !Array.isArray(parsed.payload)
        ? (parsed.payload as Record<string, unknown>)
        : {};
    return { type: parsed.type, payload };
  } catch {
    return null;
  }
};

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

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 240_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) {
      return match;
    }
    await wait(500);
  }

  const preview = messages
    .slice(Math.max(0, messages.length - 40))
    .map(
      (message) =>
        `${message.type}:${JSON.stringify(message.payload).slice(0, 260)}`,
    )
    .join(" | ");
  throw new Error(
    `Timed out waiting for team websocket event '${label}'. preview='${preview}'`,
  );
};

const sendTeamMessageOverSocket = (
  socket: WebSocket,
  input: {
    content: string;
    agentRunId: string;
  },
): void => {
  sendE2eSendMessageCommand(socket, {
    content: input.content,
    agent_run_id: input.agentRunId,
    context_file_paths: [],
    image_urls: [],
  });
};

const resolveInvocationId = (
  payload: Record<string, unknown>,
): string | null => {
  for (const candidate of [
    payload.invocation_id,
    payload.tool_invocation_id,
    payload.id,
  ]) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
};

const sameInvocation = (
  payload: Record<string, unknown>,
  invocationId: string | null,
): boolean => {
  if (!invocationId) {
    return true;
  }
  const observed = resolveInvocationId(payload);
  return observed === null || observed === invocationId;
};

const extractObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const extractToolArgs = (
  payload: Record<string, unknown>,
): Record<string, unknown> | null => {
  const metadata = extractObject(payload.metadata);
  const metadataArgs = extractObject(metadata?.arguments);
  if (metadataArgs) {
    return metadataArgs;
  }
  return extractObject(payload.arguments);
};

const payloadToolName = (payload: Record<string, unknown>): string | null => {
  const metadata = extractObject(payload.metadata);
  if (typeof payload.tool_name === "string") {
    return payload.tool_name;
  }
  if (typeof metadata?.tool_name === "string") {
    return metadata.tool_name;
  }
  return null;
};

const isCanonicalSendMessageTool = (
  payload: Record<string, unknown>,
): boolean => payloadToolName(payload)?.toLowerCase() === "send_message_to";

const hasExpectedSendMessageArgs = (
  payload: Record<string, unknown>,
  input: { recipientAddress: string; content: string },
): boolean => {
  const args = extractToolArgs(payload);
  return (
    args?.recipient_address === input.recipientAddress &&
    args.content === input.content
  );
};

const messageTextContains = (message: WsMessage, token: string): boolean => {
  if (message.type === "SEGMENT_CONTENT") {
    return (
      typeof message.payload.delta === "string" &&
      message.payload.delta.includes(token)
    );
  }

  if (message.type === "SEGMENT_END") {
    const item = extractObject(message.payload.item);
    const text =
      typeof message.payload.text === "string"
        ? message.payload.text
        : typeof item?.text === "string"
          ? item.text
          : null;
    return typeof text === "string" && text.includes(token);
  }

  if (message.type === "ASSISTANT_COMPLETE") {
    const item = extractObject(message.payload.item);
    const text =
      typeof message.payload.text === "string"
        ? message.payload.text
        : typeof item?.text === "string"
          ? item.text
          : typeof message.payload.content === "string"
            ? message.payload.content
            : typeof message.payload.result === "string"
              ? message.payload.result
              : null;
    return typeof text === "string" && text.includes(token);
  }

  return false;
};

const assistantTextMatches = (
  message: WsMessage,
  agentRunId: string,
  token: string,
): boolean => {
  if (message.payload.agent_run_id !== agentRunId) {
    return false;
  }
  return messageTextContains(message, token);
};

const assertNoProviderOrSecretLeaks = (messages: WsMessage[]): void => {
  const serialized = JSON.stringify(messages);
  for (const forbidden of [
    "autobyteus_agent_tools",
    "mcp__autobyteus_agent_tools__send_message_to",
    "Authorization",
    "Bearer",
    "http_headers",
  ]) {
    expect(serialized).not.toContain(forbidden);
  }
};

describeAllRuntimeMatrix(
  "All active runtime send_message_to communication matrix e2e",
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
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
      testDataDir = await mkdtemp(
        path.join(os.tmpdir(), "all-runtime-send-message-matrix-e2e-"),
      );
      await writeFile(
        path.join(testDataDir, ".env"),
        "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
        "utf-8",
      );
      appConfigProvider.config.setCustomAppDataDir(testDataDir);
      await initializeLiveRuntimeSecretVaultFromEnvironment();
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
      await closeLiveRuntimeSecretVault();
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

    const fetchRuntimeModelIdentifier = async (
      runtimeKind: RuntimeKind,
    ): Promise<string> => {
      const result = await execGraphql<{
        providerModelCatalogSnapshots: Array<{
          llmModels: Array<{ modelIdentifier: string }>;
        }>;
      }>(
        `
          query Models($runtimeKind: String) {
            providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
              llmModels {
                modelIdentifier
              }
            }
          }
        `,
        { runtimeKind },
      );

      const modelIdentifiers = result.providerModelCatalogSnapshots.flatMap(
        (provider) =>
          provider.llmModels
            .map((model) => model.modelIdentifier)
            .filter(
              (modelIdentifier): modelIdentifier is string =>
                modelIdentifier.trim().length > 0,
            ),
      );
      if (modelIdentifiers.length === 0) {
        throw new Error(`No ${runtimeKind} model identifier was returned.`);
      }

      if (runtimeKind === RuntimeKind.AUTOBYTEUS) {
        const exactOverride = process.env.LMSTUDIO_MODEL_ID?.trim();
        if (exactOverride && modelIdentifiers.includes(exactOverride)) {
          return exactOverride;
        }
        const preferredFragment =
          process.env.LMSTUDIO_TARGET_TEXT_MODEL ?? DEFAULT_LMSTUDIO_TEXT_MODEL;
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
      }

      if (runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
        const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
        if (override && modelIdentifiers.includes(override)) {
          return override;
        }
        for (const preferred of [
          "gpt-5.4-mini",
          "gpt-5.3-codex",
          "gpt-5.3-codex-spark",
          "gpt-5.2-codex",
          "gpt-5.1-codex-max",
          "gpt-5.1-codex-mini",
        ]) {
          if (modelIdentifiers.includes(preferred)) {
            return preferred;
          }
        }
        const codexMatch = modelIdentifiers.find((modelIdentifier) =>
          modelIdentifier.toLowerCase().includes("codex"),
        );
        return codexMatch ?? modelIdentifiers[0]!;
      }

      return modelIdentifiers.includes("haiku")
        ? "haiku"
        : modelIdentifiers[0]!;
    };

    const createAgentDefinition = async (input: {
      memberName: MatrixMemberName;
      runtimeKind: RuntimeKind;
    }): Promise<string> => {
      const codexMcpToolRule =
        input.runtimeKind === RuntimeKind.CODEX_APP_SERVER
          ? " For this Codex member, send_message_to means the Agent Tools MCP tool " +
            "mcp__autobyteus_agent_tools__send_message_to; never use Codex's native collaboration router."
          : "";
      const result = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(
        `
          mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
            createAgentDefinition(input: $input) {
              id
            }
          }
        `,
        {
          input: {
            name: `matrix-${input.memberName}-${randomUUID()}`,
            role: "assistant",
            description: `All-runtime matrix ${input.memberName} member (${input.runtimeKind}).`,
            instructions: `
You are member "${input.memberName}" in a live all-runtime send_message_to matrix with members "auto", "codex", and "claude".

Rules:
1. Follow direct user instructions exactly.
2. Do not explore the environment, run diagnostics, or call any tool other than send_message_to.${codexMcpToolRule}
3. If the direct user asks you to call send_message_to with explicit JSON arguments, call send_message_to exactly once with those exact arguments.
4. If you receive a teammate message asking for an exact token, reply in plain assistant text with that exact token and nothing else.
5. Do not call send_message_to unless the current direct user instruction explicitly provides JSON arguments for it.
6. Otherwise keep assistant text responses very short.
`,
            category: "runtime-e2e",
            toolNames: ["send_message_to"],
          },
        },
      );
      createdAgentDefinitionIds.add(result.createAgentDefinition.id);
      return result.createAgentDefinition.id;
    };

    const executeMatrixRow = async (input: {
      row: MatrixRow;
      socket: WebSocket;
      messages: WsMessage[];
      agentRunIdByName: Map<string, string>;
      memberAddressByName: Map<string, string>;
      teamRunId: string;
    }): Promise<void> => {
      const content = `Reply with exactly ${input.row.replyToken} and nothing else.`;
      const startIndex = input.messages.length;
      const senderAgentRunId = input.agentRunIdByName.get(
        input.row.senderMemberName,
      );
      const recipientAgentRunId = input.agentRunIdByName.get(
        input.row.recipientMemberName,
      );
      const recipientAddress = input.memberAddressByName.get(
        input.row.recipientMemberName,
      );
      expect(senderAgentRunId).toBeTruthy();
      expect(recipientAgentRunId).toBeTruthy();
      expect(recipientAddress).toBeTruthy();
      const argsJson = JSON.stringify({
        recipient_address: recipientAddress,
        content,
        message_type: `matrix_${input.row.id}`,
      });
      const requestedToolName =
        input.row.senderRuntimeKind === RuntimeKind.CODEX_APP_SERVER
          ? "mcp__autobyteus_agent_tools__send_message_to"
          : "send_message_to";

      sendTeamMessageOverSocket(input.socket, {
        agentRunId: senderAgentRunId as string,
        content:
          `Call ${requestedToolName} exactly once now with these exact JSON arguments: ` +
          `${argsJson}. Do not call any other tool.`,
      });

      const startEvent = await waitForMessageAfter(
        input.messages,
        startIndex,
        (message) => {
          if (message.payload.agent_run_id !== senderAgentRunId) {
            return false;
          }
          if (
            message.type === "SEGMENT_START" &&
            message.payload.segment_type === "tool_call" &&
            isCanonicalSendMessageTool(message.payload) &&
            hasExpectedSendMessageArgs(message.payload, {
              recipientAddress: recipientAddress as string,
              content,
            })
          ) {
            return true;
          }
          return (
            message.type === "TOOL_EXECUTION_STARTED" &&
            isCanonicalSendMessageTool(message.payload) &&
            hasExpectedSendMessageArgs(message.payload, {
              recipientAddress: recipientAddress as string,
              content,
            })
          );
        },
        `${input.row.id} ${input.row.senderMemberName} send_message_to start`,
      );
      const invocationId = resolveInvocationId(startEvent.payload);

      if (input.row.senderRuntimeKind !== RuntimeKind.AUTOBYTEUS) {
        await waitForMessageAfter(
          input.messages,
          startIndex,
          (message) =>
            message.type === "TOOL_EXECUTION_STARTED" &&
            message.payload.agent_run_id === senderAgentRunId &&
            isCanonicalSendMessageTool(message.payload) &&
            sameInvocation(message.payload, invocationId),
          `${input.row.id} route-backed TOOL_EXECUTION_STARTED`,
        );
      }

      await waitForMessageAfter(
        input.messages,
        startIndex,
        (message) =>
          isE2eTeamCommunicationMessage(message, {
            senderAgentRunId: senderAgentRunId as string,
            recipientAgentRunId: recipientAgentRunId as string,
            content,
          }) ||
          (message.type === "MEMBER_INPUT_MESSAGE" &&
            message.payload.recipient_agent_run_id === recipientAgentRunId &&
            message.payload.content === content),
        `${input.row.id} ${input.row.recipientMemberName} delivery projection`,
      );

      await waitForMessageAfter(
        input.messages,
        startIndex,
        (message) =>
          message.type === "TOOL_EXECUTION_SUCCEEDED" &&
          message.payload.agent_run_id === senderAgentRunId &&
          isCanonicalSendMessageTool(message.payload) &&
          sameInvocation(message.payload, invocationId),
        `${input.row.id} ${input.row.senderMemberName} send_message_to success`,
      );

      await waitForMessageAfter(
        input.messages,
        startIndex,
        (message) =>
          assistantTextMatches(
            message,
            recipientAgentRunId as string,
            input.row.replyToken,
          ),
        `${input.row.id} ${input.row.recipientMemberName} accepted input and replied`,
      );

      const rowMessages = input.messages.slice(startIndex);
      assertNoProviderOrSecretLeaks(rowMessages);

      if (input.row.senderRuntimeKind !== RuntimeKind.AUTOBYTEUS) {

      }
    };

    it("routes send_message_to across every directed mixed-runtime pair in a top-level AutoByteus+Codex+Claude team", async () => {
      const unique = randomUUID();
      const autoByteusModelIdentifier = await fetchRuntimeModelIdentifier(
        RuntimeKind.AUTOBYTEUS,
      );
      const codexModelIdentifier = await fetchRuntimeModelIdentifier(
        RuntimeKind.CODEX_APP_SERVER,
      );
      const claudeModelIdentifier = await fetchRuntimeModelIdentifier(
        RuntimeKind.CLAUDE_AGENT_SDK,
      );
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), "all-runtime-matrix-workspace-"),
      );
      createdWorkspaceRoots.add(workspaceRootPath);

      const autoAgentDefinitionId = await createAgentDefinition({
        memberName: "auto",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      });
      const codexAgentDefinitionId = await createAgentDefinition({
        memberName: "codex",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      });
      const claudeAgentDefinitionId = await createAgentDefinition({
        memberName: "claude",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      });

      const teamDefinitionResult = await execGraphql<{
        createAgentTeamDefinition: { id: string };
      }>(
        `
            mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
              createAgentTeamDefinition(input: $input) {
                id
              }
            }
          `,
        {
          input: {
            name: `all-runtime-send-message-matrix-${unique}`,
            description:
              "Top-level AutoByteus, Codex, and Claude directed communication matrix.",
            instructions:
              "Execute only directly requested send_message_to matrix hops.",
            coordinatorMemberName: "auto",
            nodes: [
              {
                memberName: "auto",
                ref: autoAgentDefinitionId,
                refType: "AGENT",
                refScope: "SHARED",
              },
              {
                memberName: "codex",
                ref: codexAgentDefinitionId,
                refType: "AGENT",
                refScope: "SHARED",
              },
              {
                memberName: "claude",
                ref: claudeAgentDefinitionId,
                refType: "AGENT",
                refScope: "SHARED",
              },
            ],
          },
        },
      );
      const teamDefinitionId =
        teamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(teamDefinitionId);

      const createTeamRunResult = await execGraphql<{
        createAgentTeamRun: {
          success: boolean;
          message: string;
          teamRunId: string | null;
        };
      }>(
        `
            mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
              createAgentTeamRun(input: $input) {
                success
                message
                teamRunId
              }
            }
          `,
        {
          input: {
            teamDefinitionId,
            teamConfigs: [{
              teamAddress: "/",
              llmModelIdentifier: autoByteusModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              workspaceRootPath,
            }],
            memberConfigs: [
              {
                memberAddress: "/auto",
                agentDefinitionId: autoAgentDefinitionId,
                llmModelIdentifier: autoByteusModelIdentifier,
                autoExecuteTools: true,
                skillAccessMode: "NONE",
                runtimeKind: RuntimeKind.AUTOBYTEUS,
                workspaceRootPath,
              },
              {
                memberAddress: "/codex",
                agentDefinitionId: codexAgentDefinitionId,
                llmModelIdentifier: codexModelIdentifier,
                autoExecuteTools: true,
                skillAccessMode: "NONE",
                runtimeKind: RuntimeKind.CODEX_APP_SERVER,
                workspaceRootPath,
              },
              {
                memberAddress: "/claude",
                agentDefinitionId: claudeAgentDefinitionId,
                llmModelIdentifier: claudeModelIdentifier,
                autoExecuteTools: true,
                skillAccessMode: "NONE",
                runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
                workspaceRootPath,
              },
            ],
          },
        },
      );
      expect(
        createTeamRunResult.createAgentTeamRun.success,
        createTeamRunResult.createAgentTeamRun.message,
      ).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun
        .teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: { executionTree: Record<string, unknown> };
      }>(
        E2E_TEAM_RUN_RESUME_CONFIG_DOCUMENT,
        { teamRunId },
      );
      const members = flattenE2eConfiguredAgentExecutions(
        resumeResult.getTeamRunResumeConfig.executionTree,
      ) as TeamMemberExecution[];
      const memberByName = new Map(
        members.map((member) => [member.memberName, member]),
      );
      expect(memberByName.get("auto")?.runtimeKind).toBe(
        RuntimeKind.AUTOBYTEUS,
      );
      expect(memberByName.get("codex")?.runtimeKind).toBe(
        RuntimeKind.CODEX_APP_SERVER,
      );
      expect(memberByName.get("claude")?.runtimeKind).toBe(
        RuntimeKind.CLAUDE_AGENT_SDK,
      );
      expect(memberByName.get("auto")?.agentRunId).toBeTruthy();
      expect(memberByName.get("codex")?.agentRunId).toBeTruthy();
      expect(memberByName.get("claude")?.agentRunId).toBeTruthy();
      const agentRunIdByName = new Map(
        members.map((member) => [member.memberName, member.agentRunId]),
      );
      const memberAddressByName = new Map(
        members.map((member) => [member.memberName, member.memberAddress]),
      );

      const socket = new WebSocket(
        `ws://${runtimeServerUrl.hostname}:${runtimeServerUrl.port}/ws/agent-team/${teamRunId}`,
      );
      const messages: WsMessage[] = [];
      socket.on("message", (raw) => {
        const parsed = parseWsMessage(raw);
        if (parsed) {
          messages.push(parsed);
        }
      });
      await waitForSocketOpen(socket);
      await waitForMessageAfter(
        messages,
        0,
        (message) => message.type === "CONNECTED",
        "CONNECTED",
        15_000,
      );

      const matrixRows: MatrixRow[] = [
        {
          id: "auto_to_claude",
          senderMemberName: "auto",
          senderRuntimeKind: RuntimeKind.AUTOBYTEUS,
          recipientMemberName: "claude",
          recipientRuntimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          replyToken: `MATRIX_AUTO_TO_CLAUDE_${unique}`,
        },
        {
          id: "claude_to_auto",
          senderMemberName: "claude",
          senderRuntimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          recipientMemberName: "auto",
          recipientRuntimeKind: RuntimeKind.AUTOBYTEUS,
          replyToken: `MATRIX_CLAUDE_TO_AUTO_${unique}`,
        },
        {
          id: "codex_to_claude",
          senderMemberName: "codex",
          senderRuntimeKind: RuntimeKind.CODEX_APP_SERVER,
          recipientMemberName: "claude",
          recipientRuntimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          replyToken: `MATRIX_CODEX_TO_CLAUDE_${unique}`,
        },
        {
          id: "claude_to_codex",
          senderMemberName: "claude",
          senderRuntimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          recipientMemberName: "codex",
          recipientRuntimeKind: RuntimeKind.CODEX_APP_SERVER,
          replyToken: `MATRIX_CLAUDE_TO_CODEX_${unique}`,
        },
        {
          id: "auto_to_codex",
          senderMemberName: "auto",
          senderRuntimeKind: RuntimeKind.AUTOBYTEUS,
          recipientMemberName: "codex",
          recipientRuntimeKind: RuntimeKind.CODEX_APP_SERVER,
          replyToken: `MATRIX_AUTO_TO_CODEX_${unique}`,
        },
        {
          id: "codex_to_auto",
          senderMemberName: "codex",
          senderRuntimeKind: RuntimeKind.CODEX_APP_SERVER,
          recipientMemberName: "auto",
          recipientRuntimeKind: RuntimeKind.AUTOBYTEUS,
          replyToken: `MATRIX_CODEX_TO_AUTO_${unique}`,
        },
      ];

      try {
        for (const row of matrixRows) {
          expect(row.senderRuntimeKind).not.toBe(row.recipientRuntimeKind);
          await executeMatrixRow({
            row,
            socket,
            messages,
            agentRunIdByName,
            memberAddressByName,
            teamRunId,
          });
        }
      } finally {
        await closeSocket(socket);
      }
    }, 720_000);
  },
);
