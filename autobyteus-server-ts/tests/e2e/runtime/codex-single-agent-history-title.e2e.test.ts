import "reflect-metadata";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";

const codexBinaryReady = spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexRuntime = codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type RunHistoryRow = {
  runId: string;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: string;
  isActive: boolean;
};

type RunProjection = {
  summary?: string | null;
  conversation: Array<Record<string, unknown>>;
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const parseWsMessage = (raw: WebSocket.RawData): WsMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString()) as {
      type?: unknown;
      payload?: unknown;
    };
    if (typeof parsed.type !== "string") {
      return null;
    }
    return {
      type: parsed.type,
      payload:
        parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
          ? (parsed.payload as Record<string, unknown>)
          : {},
    };
  } catch {
    return null;
  }
};

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

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 120_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) {
      return match;
    }
    await wait(250);
  }

  const preview = messages
    .slice(Math.max(0, startIndex - 5))
    .slice(-30)
    .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 180)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for websocket message '${label}'. preview='${preview}'`);
};

const assistantTextContains = (message: WsMessage, token: string): boolean => {
  if (message.type === "SEGMENT_CONTENT") {
    return (
      message.payload.segment_type === "text" &&
      typeof message.payload.delta === "string" &&
      message.payload.delta.includes(token)
    );
  }

  if (message.type === "SEGMENT_END") {
    const item =
      message.payload.item && typeof message.payload.item === "object"
        ? (message.payload.item as Record<string, unknown>)
        : null;
    const segmentType =
      typeof message.payload.segment_type === "string"
        ? message.payload.segment_type
        : item && item.type === "agentMessage"
          ? "text"
          : null;
    const text =
      typeof message.payload.text === "string"
        ? message.payload.text
        : item && typeof item.text === "string"
          ? item.text
          : null;
    return segmentType === "text" && typeof text === "string" && text.includes(token);
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

const isIdleStatus = (message: WsMessage): boolean =>
  message.type === "AGENT_STATUS" && message.payload.status === "idle";

describeCodexRuntime("Codex single-agent run history title e2e (live runtime)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdAgentDefinitionIds = new Set<string>();
  const createdRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    testDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-history-title-e2e-appdata-"));
    await fs.writeFile(
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

  afterEach(async () => {
    for (const runId of createdRunIds) {
      await execGraphql<{
        terminateAgentRun: { success: boolean };
      }>(
        `
          mutation TerminateAgentRun($agentRunId: String!) {
            terminateAgentRun(agentRunId: $agentRunId) {
              success
            }
          }
        `,
        { agentRunId: runId },
      ).catch(() => undefined);
    }
    createdRunIds.clear();

    for (const id of createdAgentDefinitionIds) {
      await execGraphql<{
        deleteAgentDefinition: { success: boolean };
      }>(
        `
          mutation DeleteAgentDefinition($id: String!) {
            deleteAgentDefinition(id: $id) {
              success
            }
          }
        `,
        { id },
      ).catch(() => undefined);
    }
    createdAgentDefinitionIds.clear();

    for (const root of createdWorkspaceRoots) {
      await fs.rm(root, { recursive: true, force: true });
    }
    createdWorkspaceRoots.clear();

    await getCodexAppServerClientManager().close();
    await wait(750);
  });

  afterAll(async () => {
    if (testDataDir) {
      await fs.rm(testDataDir, { recursive: true, force: true });
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

  const fetchCodexModelIdentifier = async (): Promise<string> => {
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

    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.trim().length > 0),
    );
    const override = process.env.CODEX_HISTORY_TITLE_E2E_MODEL?.trim();
    if (override && modelIdentifiers.includes(override)) {
      return override;
    }
    const preferred = [
      process.env.CODEX_E2E_TOOL_MODEL?.trim(),
      "gpt-5.4-mini",
      "gpt-5.3-codex-spark",
      "gpt-5.3-codex",
    ]
      .filter((value): value is string => Boolean(value))
      .find((value) => modelIdentifiers.includes(value));
    const fallback = modelIdentifiers.find((value) => value.toLowerCase().includes("codex"));
    const selected = preferred ?? fallback ?? modelIdentifiers[0];
    if (!selected) {
      throw new Error("No Codex model identifier was returned by availableLlmProvidersWithModels.");
    }
    return selected;
  };

  const createAgentDefinition = async (): Promise<string> => {
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
          name: `codex-history-title-${randomUUID()}`,
          role: "assistant",
          description: "Live Codex single-agent history title validation agent.",
          instructions:
            "Reply to exact-token prompts with exactly the requested token and no other text. Do not use tools.",
          category: "runtime-e2e",
          toolNames: [],
          skillNames: [],
        },
      },
    );
    createdAgentDefinitionIds.add(result.createAgentDefinition.id);
    return result.createAgentDefinition.id;
  };

  const createAgentRun = async (input: {
    agentDefinitionId: string;
    llmModelIdentifier: string;
    workspaceRootPath: string;
  }): Promise<string> => {
    const result = await execGraphql<{
      createAgentRun: { success: boolean; message: string; runId: string | null };
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
          autoExecuteTools: false,
          llmConfig: { reasoning_effort: "low" },
          skillAccessMode: "NONE",
          runtimeKind: "codex_app_server",
        },
      },
    );
    expect(result.createAgentRun.success).toBe(true);
    expect(result.createAgentRun.runId).toBeTruthy();
    const runId = result.createAgentRun.runId as string;
    createdRunIds.add(runId);
    return runId;
  };

  const openAgentSocket = async (runId: string): Promise<{
    app: Awaited<ReturnType<typeof fastify>>;
    socket: WebSocket;
    messages: WsMessage[];
  }> => {
    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(app);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${runId}`);
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
    return { app, socket, messages };
  };

  const sendMessageAndWaitForCodexTurn = async (
    socket: WebSocket,
    messages: WsMessage[],
    content: string,
    expectedResponseToken: string,
  ): Promise<void> => {
    const startIndex = messages.length;
    socket.send(
      JSON.stringify({
        type: "SEND_MESSAGE",
        payload: { content },
      }),
    );
    await waitForMessageAfter(
      messages,
      startIndex,
      (message) => assistantTextContains(message, expectedResponseToken),
      `assistant response containing ${expectedResponseToken}`,
      120_000,
    );
    await waitForMessageAfter(
      messages,
      startIndex,
      isIdleStatus,
      "AGENT_STATUS IDLE",
      120_000,
    );
  };

  const findHistoryRow = async (runId: string): Promise<RunHistoryRow> => {
    const result = await execGraphql<{
      listWorkspaceRunHistory: Array<{
        workspaceRootPath: string;
        agentDefinitions: Array<{
          runs: RunHistoryRow[];
        }>;
      }>;
    }>(
      `
        query WorkspaceHistory($limitPerAgent: Int!) {
          listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
            workspaceRootPath
            agentDefinitions {
              runs {
                runId
                summary
                lastActivityAt
                lastKnownStatus
                isActive
              }
            }
          }
        }
      `,
      { limitPerAgent: 10 },
    );
    const row = result.listWorkspaceRunHistory
      .flatMap((workspace) => workspace.agentDefinitions)
      .flatMap((agent) => agent.runs)
      .find((candidate) => candidate.runId === runId);
    expect(row).toBeTruthy();
    return row as RunHistoryRow;
  };

  const waitForProjectionWithUserMessages = async (
    runId: string,
    expectedMessages: string[],
  ): Promise<RunProjection> => {
    const deadline = Date.now() + 60_000;
    let latest: RunProjection | null = null;
    while (Date.now() < deadline) {
      const result = await execGraphql<{ getRunProjection: RunProjection }>(
        `
          query RunProjection($runId: String!) {
            getRunProjection(runId: $runId) {
              summary
              conversation
            }
          }
        `,
        { runId },
      );
      latest = result.getRunProjection;
      const userContents = latest.conversation
        .filter((entry) => entry.role === "user")
        .map((entry) => String(entry.content ?? ""));
      if (
        latest.summary === expectedMessages[0] &&
        expectedMessages.every((message) => userContents.includes(message))
      ) {
        return latest;
      }
      await wait(500);
    }
    throw new Error(
      `Timed out waiting for projection to include user messages. Latest projection: ${JSON.stringify(latest)}`,
    );
  };

  const overwriteIndexSummary = async (
    runId: string,
    summary: string,
  ): Promise<string> => {
    if (!testDataDir) {
      throw new Error("Test data directory is not initialized.");
    }
    const indexPath = path.join(testDataDir, "memory", "run_history_index.json");
    const index = JSON.parse(await fs.readFile(indexPath, "utf-8")) as {
      rows?: Array<Record<string, unknown>>;
    };
    const row = index.rows?.find((candidate) => candidate.runId === runId);
    expect(row).toBeTruthy();
    row!.summary = summary;
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
    return indexPath;
  };

  const readIndexSummary = async (runId: string): Promise<string | null> => {
    if (!testDataDir) {
      throw new Error("Test data directory is not initialized.");
    }
    const indexPath = path.join(testDataDir, "memory", "run_history_index.json");
    const index = JSON.parse(await fs.readFile(indexPath, "utf-8")) as {
      rows?: Array<Record<string, unknown>>;
    };
    const row = index.rows?.find((candidate) => candidate.runId === runId);
    return typeof row?.summary === "string" ? row.summary : null;
  };

  it(
    "keeps the initial user message as the GraphQL history title after Codex follow-up messages and active-row repair",
    async () => {
      const workspaceRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "codex-history-title-workspace-"));
      createdWorkspaceRoots.add(workspaceRootPath);
      const modelIdentifier = await fetchCodexModelIdentifier();
      const agentDefinitionId = await createAgentDefinition();
      const runId = await createAgentRun({
        agentDefinitionId,
        llmModelIdentifier: modelIdentifier,
        workspaceRootPath,
      });

      const { app, socket, messages } = await openAgentSocket(runId);
      try {
        const firstResponseToken = `HISTORY_TITLE_FIRST_${randomUUID().replace(/-/g, "_")}`;
        const secondResponseToken = `HISTORY_TITLE_SECOND_${randomUUID().replace(/-/g, "_")}`;
        const firstUserMessage = `Reply with exactly ${firstResponseToken} and nothing else.`;
        const followUpUserMessage = `Reply with exactly ${secondResponseToken} and nothing else.`;

        await sendMessageAndWaitForCodexTurn(
          socket,
          messages,
          firstUserMessage,
          firstResponseToken,
        );
        const firstHistoryRow = await findHistoryRow(runId);
        expect(firstHistoryRow).toEqual(expect.objectContaining({
          summary: firstUserMessage,
          isActive: true,
          lastKnownStatus: "ACTIVE",
        }));

        await sendMessageAndWaitForCodexTurn(
          socket,
          messages,
          followUpUserMessage,
          secondResponseToken,
        );
        const followUpHistoryRow = await findHistoryRow(runId);
        expect(followUpHistoryRow.summary).toBe(firstUserMessage);
        expect(followUpHistoryRow.summary).not.toBe(followUpUserMessage);
        expect(followUpHistoryRow.isActive).toBe(true);
        expect(followUpHistoryRow.lastKnownStatus).toBe("ACTIVE");
        expect(followUpHistoryRow.lastActivityAt >= firstHistoryRow.lastActivityAt).toBe(true);
        expect(await readIndexSummary(runId)).toBe(firstUserMessage);

        await waitForProjectionWithUserMessages(runId, [
          firstUserMessage,
          followUpUserMessage,
        ]);

        await overwriteIndexSummary(runId, followUpUserMessage);
        expect(await readIndexSummary(runId)).toBe(followUpUserMessage);

        const repairedHistoryRow = await findHistoryRow(runId);
        expect(repairedHistoryRow.summary).toBe(firstUserMessage);
        expect(repairedHistoryRow.summary).not.toBe(followUpUserMessage);
        expect(await readIndexSummary(runId)).toBe(firstUserMessage);
      } finally {
        socket.close();
        await app.close();
      }
    },
    240_000,
  );
});
