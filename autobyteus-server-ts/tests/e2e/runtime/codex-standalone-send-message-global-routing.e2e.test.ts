import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { registerAgentToolsMcpRoutes } from "../../../src/agent-tools/mcp/agent-tools-mcp-routes.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
  seedInternalServerBaseUrlFromListenAddress,
} from "../../../src/config/server-runtime-endpoints.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

const codexBinaryReady =
  spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const describeCodexStandaloneDirect =
  codexBinaryReady && process.env.RUN_CODEX_E2E === "1"
    ? describe
    : describe.skip;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
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
  timeoutMs = 180_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.find(
      (message) =>
        messages.indexOf(message) >= startIndex && predicate(message),
    );
    if (match) {
      return match;
    }
    await wait(500);
  }

  const preview = messages
    .slice(-30)
    .map(
      (message) =>
        `${message.type}:${JSON.stringify(message.payload).slice(0, 220)}`,
    )
    .join(" | ");
  throw new Error(
    `Timed out waiting for websocket message '${label}'. preview='${preview}'`,
  );
};

const resolveInvocationId = (
  payload: Record<string, unknown>,
): string | null => {
  const candidates = [
    payload.invocation_id,
    payload.tool_invocation_id,
    payload.id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
};

const matchesInvocationId = (
  payload: Record<string, unknown>,
  invocationId: string | null,
): boolean => {
  if (!invocationId) {
    return true;
  }
  const resolved = resolveInvocationId(payload);
  return resolved === null || resolved === invocationId;
};

const isSendMessageToolSegmentStart = (
  message: WsMessage,
  expected: { targetAgentRunId: string; content: string },
): boolean => {
  if (
    message.type !== "SEGMENT_START" ||
    message.payload.segment_type !== "tool_call"
  ) {
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
    args.target_agent_run_id === expected.targetAgentRunId &&
    args.content === expected.content
  );
};

const pickCodexModelIdentifier = (modelIdentifiers: string[]): string => {
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
};

describeCodexStandaloneDirect(
  "Codex standalone send_message_to global direct routing e2e",
  () => {
    let schema: GraphQLSchema;
    let graphql: typeof graphqlFn;
    let testDataDir: string | null = null;
    let runtimeServerApp: FastifyInstance | null = null;
    let runtimeServerUrl: URL;
    let originalInternalServerBaseUrl: string | undefined;
    const createdWorkspaceRoots = new Set<string>();

    beforeAll(async () => {
      originalInternalServerBaseUrl =
        process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
      testDataDir = await mkdtemp(
        path.join(os.tmpdir(), "codex-standalone-send-message-e2e-"),
      );
      await writeFile(
        path.join(testDataDir, ".env"),
        "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
        "utf-8",
      );
      appConfigProvider.config.setCustomAppDataDir(testDataDir);
      schema = await buildGraphqlSchema();
      const require = createRequire(import.meta.url);
      const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
      const graphqlPath = require.resolve("graphql", {
        paths: [typeGraphqlRoot],
      });
      const graphqlModule = await import(graphqlPath);
      graphql = graphqlModule.graphql as typeof graphqlFn;

      runtimeServerApp = fastify();
      await registerAgentToolsMcpRoutes(runtimeServerApp);
      await runtimeServerApp.register(websocket);
      await registerAgentWebsocket(runtimeServerApp);
      const address = await runtimeServerApp.listen({
        port: 0,
        host: "127.0.0.1",
      });
      seedInternalServerBaseUrlFromListenAddress({
        requestedHost: "127.0.0.1",
        listenAddress: runtimeServerApp.server.address(),
      });
      runtimeServerUrl = new URL(address);
    });

    afterAll(async () => {
      await getCodexAppServerClientManager().close();
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
      for (const workspaceRoot of createdWorkspaceRoots) {
        await rm(workspaceRoot, { recursive: true, force: true });
      }
      createdWorkspaceRoots.clear();
      if (testDataDir) {
        await rm(testDataDir, { recursive: true, force: true });
        testDataDir = null;
      }
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

    const fetchModelIdentifier = async (): Promise<string> => {
      const result = await execGraphql<{
        availableLlmProvidersWithModels: Array<{
          models: Array<{ modelIdentifier: string }>;
        }>;
      }>(
        `
        query Models($runtimeKind: String) {
          availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
            models {
              modelIdentifier
            }
          }
        }
      `,
        { runtimeKind: "codex_app_server" },
      );

      const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap(
        (provider) =>
          provider.models
            .map((model) => model.modelIdentifier)
            .filter(
              (modelIdentifier): modelIdentifier is string =>
                modelIdentifier.trim().length > 0,
            ),
      );
      if (modelIdentifiers.length === 0) {
        throw new Error(
          "No model identifier was returned for Codex standalone send_message_to e2e.",
        );
      }
      return pickCodexModelIdentifier(modelIdentifiers);
    };

    const createAgentDefinition = async (input: {
      namePrefix: string;
      instructions: string;
      toolNames: string[];
    }): Promise<string> => {
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
            name: `${input.namePrefix}-${randomUUID()}`,
            role: "assistant",
            description:
              "Codex standalone send_message_to global routing e2e agent.",
            instructions: input.instructions,
            category: "runtime-e2e",
            toolNames: input.toolNames,
          },
        },
      );
      return result.createAgentDefinition.id;
    };

    const createAgentRun = async (input: {
      agentDefinitionId: string;
      llmModelIdentifier: string;
      workspaceRootPath: string;
      toolAutoExecute: boolean;
    }): Promise<string> => {
      const result = await execGraphql<{
        createAgentRun: {
          success: boolean;
          message: string;
          runId: string | null;
        };
      }>(
        `
        mutation CreateAgentRun($input: CreateAgentRunInput!) {
          createAgentRun(input: $input) {
            success
            message
            runId
          }
        }
      `,
        {
          input: {
            agentDefinitionId: input.agentDefinitionId,
            workspaceRootPath: input.workspaceRootPath,
            llmModelIdentifier: input.llmModelIdentifier,
            autoExecuteTools: input.toolAutoExecute,
            llmConfig: { reasoning_effort: "medium" },
            skillAccessMode: "NONE",
            runtimeKind: "codex_app_server",
          },
        },
      );
      expect(result.createAgentRun.success, result.createAgentRun.message).toBe(
        true,
      );
      expect(result.createAgentRun.runId).toBeTruthy();
      return result.createAgentRun.runId as string;
    };

    const terminateAgentRun = async (runId: string): Promise<boolean> => {
      const result = await execGraphql<{
        terminateAgentRun: { success: boolean; message: string };
      }>(
        `
        mutation TerminateAgentRun($agentRunId: String!) {
          terminateAgentRun(agentRunId: $agentRunId) {
            success
            message
          }
        }
      `,
        { agentRunId: runId },
      );
      return result.terminateAgentRun.success;
    };

    const openAgentSocket = async (
      runId: string,
    ): Promise<{
      socket: WebSocket;
      messages: WsMessage[];
    }> => {
      const url = runtimeServerUrl;
      const socket = new WebSocket(
        `ws://${url.hostname}:${url.port}/ws/agent/${runId}`,
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
      return { socket, messages };
    };

    it("delivers from a real standalone Codex sender to an active standalone target by exact run id and rejects the same id after target termination", async () => {
      const unique = randomUUID().replace(/-/g, "_");
      const modelIdentifier = await fetchModelIdentifier();
      const senderWorkspaceRoot = await mkdtemp(
        path.join(os.tmpdir(), "codex-direct-sender-"),
      );
      const targetWorkspaceRoot = await mkdtemp(
        path.join(os.tmpdir(), "codex-direct-target-"),
      );
      createdWorkspaceRoots.add(senderWorkspaceRoot);
      createdWorkspaceRoots.add(targetWorkspaceRoot);

      const senderAgentDefinitionId = await createAgentDefinition({
        namePrefix: "codex-direct-sender",
        toolNames: ["send_message_to"],
        instructions: [
          "You are a deterministic send_message_to E2E sender.",
          "The only tool you may call is send_message_to.",
          "If the user asks you to call send_message_to with exact JSON arguments, call send_message_to exactly once with exactly those arguments and do not call any other tool.",
          "Do not invent recipient names or target ids. Do not answer in plain text before the tool call.",
        ].join("\n"),
      });
      const targetAgentDefinitionId = await createAgentDefinition({
        namePrefix: "codex-direct-target",
        toolNames: [],
        instructions:
          "You are a passive target for direct message routing E2E. Acknowledge direct messages briefly.",
      });

      const targetRunId = await createAgentRun({
        agentDefinitionId: targetAgentDefinitionId,
        llmModelIdentifier: modelIdentifier,
        workspaceRootPath: targetWorkspaceRoot,
        toolAutoExecute: true,
      });
      const senderRunId = await createAgentRun({
        agentDefinitionId: senderAgentDefinitionId,
        llmModelIdentifier: modelIdentifier,
        workspaceRootPath: senderWorkspaceRoot,
        toolAutoExecute: true,
      });

      const targetConnection = await openAgentSocket(targetRunId);
      const senderConnection = await openAgentSocket(senderRunId);
      let targetTerminated = false;
      try {
        const directContent = `CODEx_DIRECT_ACTIVE_${unique}`;
        const sendArgs = {
          target_agent_run_id: targetRunId,
          content: directContent,
          message_type: "codex_standalone_global_direct_e2e",
        };
        const senderStartIndex = senderConnection.messages.length;
        const targetStartIndex = targetConnection.messages.length;
        sendE2eSendMessageCommand(senderConnection.socket, {
          content:
            `Call send_message_to exactly once now with these exact JSON arguments: ${JSON.stringify(sendArgs)}. ` +
            "Do not call any other tool and do not answer in plain text before the tool call.",
        });

        const segmentStart = await waitForMessageAfter(
          senderConnection.messages,
          senderStartIndex,
          (message) =>
            isSendMessageToolSegmentStart(message, {
              targetAgentRunId: targetRunId,
              content: directContent,
            }),
          "sender send_message_to SEGMENT_START",
        );
        const invocationId = resolveInvocationId(segmentStart.payload);
        expect(typeof invocationId).toBe("string");

        await waitForMessageAfter(
          senderConnection.messages,
          senderStartIndex,
          (message) =>
            message.type === "TOOL_EXECUTION_STARTED" &&
            message.payload.tool_name === "send_message_to" &&
            matchesInvocationId(message.payload, invocationId),
          "sender send_message_to TOOL_EXECUTION_STARTED",
        );

        await waitForMessageAfter(
          senderConnection.messages,
          senderStartIndex,
          (message) =>
            message.type === "TOOL_EXECUTION_SUCCEEDED" &&
            message.payload.tool_name === "send_message_to" &&
            matchesInvocationId(message.payload, invocationId),
          "sender send_message_to TOOL_EXECUTION_SUCCEEDED",
        );

        const directEvent = await waitForMessageAfter(
          targetConnection.messages,
          targetStartIndex,
          (message) =>
            message.type === "INTER_AGENT_MESSAGE" &&
            message.payload.sender_agent_id === senderRunId &&
            message.payload.receiver_run_id === targetRunId &&
            message.payload.content === directContent &&
            message.payload.message_type ===
              "codex_standalone_global_direct_e2e",
          "target direct INTER_AGENT_MESSAGE",
        );
        expect(directEvent.payload).not.toHaveProperty("team_run_id");
        expect(directEvent.payload).not.toHaveProperty("teamRunId");
        expect(directEvent.payload).not.toHaveProperty(
          "reference_file_entries",
        );
        expect(
          targetConnection.messages
            .slice(targetStartIndex)
            .some((message) => message.type === "TEAM_COMMUNICATION_MESSAGE"),
        ).toBe(false);

        await waitForMessageAfter(
          senderConnection.messages,
          senderStartIndex,
          (message) =>
            message.type === "AGENT_STATUS" &&
            message.payload.status === "idle",
          "sender idle after active direct send",
        );

        expect(await terminateAgentRun(targetRunId)).toBe(true);
        targetTerminated = true;

        const inactiveContent = `CODEX_DIRECT_INACTIVE_${unique}`;
        const inactiveArgs = {
          target_agent_run_id: targetRunId,
          content: inactiveContent,
          message_type: "codex_standalone_global_direct_e2e",
        };
        const inactiveStartIndex = senderConnection.messages.length;
        sendE2eSendMessageCommand(senderConnection.socket, {
          content:
            `Call send_message_to exactly once now with these exact JSON arguments: ${JSON.stringify(inactiveArgs)}. ` +
            "Do not call any other tool and do not answer in plain text before the tool call.",
        });

        const inactiveSegmentStart = await waitForMessageAfter(
          senderConnection.messages,
          inactiveStartIndex,
          (message) =>
            isSendMessageToolSegmentStart(message, {
              targetAgentRunId: targetRunId,
              content: inactiveContent,
            }),
          "sender inactive send_message_to SEGMENT_START",
        );
        const inactiveInvocationId = resolveInvocationId(
          inactiveSegmentStart.payload,
        );
        expect(typeof inactiveInvocationId).toBe("string");

        const failed = await waitForMessageAfter(
          senderConnection.messages,
          inactiveStartIndex,
          (message) =>
            message.type === "TOOL_EXECUTION_FAILED" &&
            message.payload.tool_name === "send_message_to" &&
            matchesInvocationId(message.payload, inactiveInvocationId),
          "sender send_message_to TOOL_EXECUTION_FAILED for inactive target",
        );
        expect(String(failed.payload.error ?? "")).toContain(
          `Exact AgentRun target '${targetRunId}' is not active.`,
        );
      } finally {
        await closeSocket(senderConnection.socket);
        await closeSocket(targetConnection.socket);
        await terminateAgentRun(senderRunId).catch(() => undefined);
        if (!targetTerminated) {
          await terminateAgentRun(targetRunId).catch(() => undefined);
        }
      }
    }, 300_000);
  },
);
