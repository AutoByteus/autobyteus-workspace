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
import { getAgentToolMcpSessionRegistry } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AGENT_TOOLS_MCP_SERVER_NAME } from "../../../src/agent-tools/mcp/agent-tool-mcp-session.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../src/agent-communication/services/send-message-to-tool-contract.js";
import { getCodexThreadManager } from "../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
  seedInternalServerBaseUrlFromListenAddress,
} from "../../../src/config/server-runtime-endpoints.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";

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

type AgentToolsMcpAppServerConfig = {
  url: string;
  http_headers: { Authorization: string };
  enabled_tools: string[];
  startup_timeout_sec: number;
};

type McpStartupObservation = {
  sequence: number;
  method: string;
  threadId: string | null;
  name: string | null;
  status: string | null;
  error: string | null;
  failureReason: string | null;
};

type McpServerStatusListResponse = {
  data?: Array<{
    name?: unknown;
    tools?: Record<string, unknown>;
    authStatus?: unknown;
  }>;
};

type McpServerToolCallResponse = {
  content?: Array<Record<string, unknown>>;
  isError?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asOptionalString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const resolveAgentToolsMcpConfig = (
  appServerConfig: Record<string, unknown> | null | undefined,
): AgentToolsMcpAppServerConfig => {
  const mcpServers = isRecord(appServerConfig?.mcp_servers)
    ? appServerConfig.mcp_servers
    : null;
  const config = isRecord(mcpServers?.[AGENT_TOOLS_MCP_SERVER_NAME])
    ? mcpServers[AGENT_TOOLS_MCP_SERVER_NAME]
    : null;
  const httpHeaders = isRecord(config?.http_headers)
    ? config.http_headers
    : null;
  if (
    !config ||
    typeof config.url !== "string" ||
    !httpHeaders ||
    typeof httpHeaders.Authorization !== "string" ||
    !Array.isArray(config.enabled_tools)
  ) {
    throw new Error("Standalone Codex run did not materialize a usable Agent Tools MCP config.");
  }
  return {
    url: config.url,
    http_headers: { Authorization: httpHeaders.Authorization },
    enabled_tools: config.enabled_tools.filter(
      (toolName): toolName is string => typeof toolName === "string",
    ),
    startup_timeout_sec:
      typeof config.startup_timeout_sec === "number"
        ? config.startup_timeout_sec
        : 0,
  };
};

const redactAgentToolsMcpConfig = (
  config: AgentToolsMcpAppServerConfig,
): Record<string, unknown> => {
  const url = new URL(config.url);
  const pathParts = url.pathname.split("/");
  pathParts[pathParts.length - 1] = "<redacted>";
  url.pathname = pathParts.join("/");
  url.search = "";
  url.hash = "";
  return {
    serverName: AGENT_TOOLS_MCP_SERVER_NAME,
    url: url.toString(),
    http_headers: { Authorization: "Bearer <redacted>" },
    enabled_tools: [...config.enabled_tools],
    startup_timeout_sec: config.startup_timeout_sec,
  };
};

const resolveSessionIdFromMcpUrl = (serverUrl: string): string => {
  const pathParts = new URL(serverUrl).pathname.split("/");
  const sessionId = decodeURIComponent(pathParts[pathParts.length - 1] ?? "");
  if (!sessionId) {
    throw new Error("Agent Tools MCP URL did not contain a session id.");
  }
  return sessionId;
};

const waitForAgentToolsMcpStartup = async (input: {
  observations: McpStartupObservation[];
  threadId: string;
  timeoutMs?: number;
}): Promise<McpStartupObservation> => {
  const deadline = Date.now() + (input.timeoutMs ?? 15_000);
  while (Date.now() < deadline) {
    const terminal = input.observations.find(
      (observation) =>
        observation.method === "mcpServer/startupStatus/updated" &&
        observation.threadId === input.threadId &&
        observation.name === AGENT_TOOLS_MCP_SERVER_NAME &&
        ["ready", "failed", "cancelled"].includes(observation.status ?? ""),
    );
    if (terminal) {
      return terminal;
    }
    await wait(100);
  }
  throw new Error(
    `Timed out waiting for same-thread ${AGENT_TOOLS_MCP_SERVER_NAME} startup status. ` +
      `observations=${JSON.stringify(input.observations)}`,
  );
};

const fetchAuthenticatedSessionToolNames = async (
  config: AgentToolsMcpAppServerConfig,
): Promise<string[]> => {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: config.http_headers.Authorization,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2025-03-26",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "live-002-tools-list",
      method: "tools/list",
      params: {},
    }),
  });
  const payload = (await response.json()) as unknown;
  if (!response.ok || !isRecord(payload) || !isRecord(payload.result)) {
    throw new Error(
      `Authenticated Agent Tools MCP tools/list failed: status=${response.status} payload=${JSON.stringify(payload)}`,
    );
  }
  const tools = Array.isArray(payload.result.tools) ? payload.result.tools : [];
  return tools
    .map((tool) => (isRecord(tool) ? asOptionalString(tool.name) : null))
    .filter((toolName): toolName is string => Boolean(toolName));
};

const mcpToolCallText = (response: McpServerToolCallResponse): string =>
  (response.content ?? [])
    .map((item) => (typeof item.text === "string" ? item.text : ""))
    .filter(Boolean)
    .join("\n");

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

    it("delivers through the real standalone Codex thread MCP to an active exact run id and rejects it after termination", async () => {
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
          "You are the sender identity for a deterministic standalone Agent Tools MCP routing E2E.",
          "The test invokes the configured send_message_to operation through this exact Codex App Server thread.",
          "Do not initiate unrelated work.",
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

      const senderAppServerClient =
        await getCodexAppServerClientManager().getClient(senderWorkspaceRoot);
      let evidenceSequence = 0;
      const mcpStartupObservations: McpStartupObservation[] = [];
      const unbindMcpStartupObserver = senderAppServerClient.onNotification(
        (message) => {
          if (
            message.method !== "mcpServer/startupStatus/updated" &&
            message.method !== "mcp/startupComplete"
          ) {
            return;
          }
          if (
            message.method === "mcpServer/startupStatus/updated" &&
            message.params.name !== AGENT_TOOLS_MCP_SERVER_NAME
          ) {
            return;
          }
          mcpStartupObservations.push({
            sequence: ++evidenceSequence,
            method: message.method,
            threadId: asOptionalString(message.params.threadId),
            name: asOptionalString(message.params.name),
            status: asOptionalString(message.params.status),
            error: asOptionalString(message.params.error),
            failureReason: asOptionalString(message.params.failureReason),
          });
        },
      );
      const senderRunId = await createAgentRun({
        agentDefinitionId: senderAgentDefinitionId,
        llmModelIdentifier: modelIdentifier,
        workspaceRootPath: senderWorkspaceRoot,
        toolAutoExecute: true,
      });
      const createAgentRunReturnedSequence = ++evidenceSequence;

      const senderThread = getCodexThreadManager().getThread(senderRunId);
      expect(senderThread, "same live sender Codex thread").toBeTruthy();
      expect(senderThread?.client, "same observed App Server client").toBe(
        senderAppServerClient,
      );
      const senderThreadId = senderThread?.threadId ?? "";
      expect(senderThreadId, "same live sender Codex thread id").toBeTruthy();

      const agentToolsMcpConfig = resolveAgentToolsMcpConfig(
        senderThread?.config.appServerConfig,
      );
      expect(agentToolsMcpConfig.enabled_tools).toContain(
        SEND_MESSAGE_TO_TOOL_NAME,
      );

      const sessionId = resolveSessionIdFromMcpUrl(agentToolsMcpConfig.url);
      const bearerToken = agentToolsMcpConfig.http_headers.Authorization.replace(
        /^Bearer\s+/i,
        "",
      );
      const resolvedSession = getAgentToolMcpSessionRegistry().resolveSession({
        sessionId,
        bearerToken,
      });
      expect(resolvedSession.ok, "same descriptor authenticates its session").toBe(
        true,
      );
      if (!resolvedSession.ok) {
        throw new Error(
          `Same-thread Agent Tools MCP session authentication failed: ${resolvedSession.reason}`,
        );
      }
      expect(resolvedSession.session.owner.runId).toBe(senderRunId);
      expect(resolvedSession.session.enabledTools).toContain(
        SEND_MESSAGE_TO_TOOL_NAME,
      );

      const authenticatedSessionToolNames =
        await fetchAuthenticatedSessionToolNames(agentToolsMcpConfig);
      const authenticatedToolsListSequence = ++evidenceSequence;
      expect(authenticatedSessionToolNames).toContain(SEND_MESSAGE_TO_TOOL_NAME);

      const terminalMcpStartup = await waitForAgentToolsMcpStartup({
        observations: mcpStartupObservations,
        threadId: senderThreadId,
      });
      if (terminalMcpStartup.status !== "ready") {
        throw new Error(
          `Same-thread Agent Tools MCP startup did not become ready: ${JSON.stringify(terminalMcpStartup)}`,
        );
      }

      const appServerMcpStatus =
        await senderAppServerClient.request<McpServerStatusListResponse>(
          "mcpServerStatus/list",
          { threadId: senderThreadId, detail: "full" },
        );
      const appServerStatusListSequence = ++evidenceSequence;
      const agentToolsAppServerStatus = (appServerMcpStatus.data ?? []).find(
        (status) => status.name === AGENT_TOOLS_MCP_SERVER_NAME,
      );
      expect(
        agentToolsAppServerStatus,
        "same-thread App Server Agent Tools MCP status",
      ).toBeTruthy();
      const appServerToolNames = Object.keys(
        agentToolsAppServerStatus?.tools ?? {},
      );
      expect(appServerToolNames).toContain(SEND_MESSAGE_TO_TOOL_NAME);
      unbindMcpStartupObserver();

      const targetConnection = await openAgentSocket(targetRunId);
      let targetTerminated = false;
      try {
        const directContent = `CODEx_DIRECT_ACTIVE_${unique}`;
        const sendArgs = {
          target_agent_run_id: targetRunId,
          content: directContent,
          message_type: "codex_standalone_global_direct_e2e",
        };
        const targetStartIndex = targetConnection.messages.length;
        const firstAppServerToolCallSequence = ++evidenceSequence;
        console.log(
          "[LIVE-002 same-thread Agent Tools MCP evidence]",
          JSON.stringify({
            senderRunId,
            senderThreadId,
            modelIdentifier,
            redactedDescriptorAndConfig:
              redactAgentToolsMcpConfig(agentToolsMcpConfig),
            authenticatedSession: {
              ownerRunId: resolvedSession.session.owner.runId,
              sessionId: "<redacted>",
              enabledTools: [...resolvedSession.session.enabledTools],
              toolsList: authenticatedSessionToolNames,
            },
            appServer: {
              startupObservations: mcpStartupObservations,
              statusList: {
                name: agentToolsAppServerStatus?.name ?? null,
                authStatus: agentToolsAppServerStatus?.authStatus ?? null,
                toolNames: appServerToolNames,
              },
            },
            ordering: {
              createAgentRunReturnedSequence,
              authenticatedToolsListSequence,
              readySequence: terminalMcpStartup.sequence,
              appServerStatusListSequence,
              firstAppServerToolCallSequence,
            },
          }),
        );
        const activeCallResponse =
          await senderAppServerClient.request<McpServerToolCallResponse>(
            "mcpServer/tool/call",
            {
              threadId: senderThreadId,
              server: AGENT_TOOLS_MCP_SERVER_NAME,
              tool: SEND_MESSAGE_TO_TOOL_NAME,
              arguments: sendArgs,
            },
          );
        expect(activeCallResponse.isError).not.toBe(true);

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

        expect(await terminateAgentRun(targetRunId)).toBe(true);
        targetTerminated = true;

        const inactiveContent = `CODEX_DIRECT_INACTIVE_${unique}`;
        const inactiveArgs = {
          target_agent_run_id: targetRunId,
          content: inactiveContent,
          message_type: "codex_standalone_global_direct_e2e",
        };
        const inactiveCallResponse =
          await senderAppServerClient.request<McpServerToolCallResponse>(
            "mcpServer/tool/call",
            {
              threadId: senderThreadId,
              server: AGENT_TOOLS_MCP_SERVER_NAME,
              tool: SEND_MESSAGE_TO_TOOL_NAME,
              arguments: inactiveArgs,
            },
          );
        expect(inactiveCallResponse.isError).toBe(true);
        expect(mcpToolCallText(inactiveCallResponse)).toContain(
          `Exact AgentRun target '${targetRunId}' is not active.`,
        );
        console.log(
          "[LIVE-002 same-thread Agent Tools MCP call results]",
          JSON.stringify({
            active: {
              isError: activeCallResponse.isError === true,
              text: mcpToolCallText(activeCallResponse),
            },
            inactive: {
              isError: inactiveCallResponse.isError === true,
              text: mcpToolCallText(inactiveCallResponse),
            },
          }),
        );
      } finally {
        await closeSocket(targetConnection.socket);
        await terminateAgentRun(senderRunId).catch(() => undefined);
        if (!targetTerminated) {
          await terminateAgentRun(targetRunId).catch(() => undefined);
        }
      }
    }, 300_000);
  },
);
