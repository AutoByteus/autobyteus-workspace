import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getCodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { SkillVersioningService } from "../../../src/skills/services/skill-versioning-service.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen/qwen3.5-35b-a3b";
const lmStudioRuntimeEnabled = process.env.RUN_LMSTUDIO_E2E === "1";
const codexBinaryReady = spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const claudeBinaryReady = spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const stableSkillWordPool = [
  "amber",
  "cedar",
  "harbor",
  "lantern",
  "meadow",
  "river",
  "signal",
  "violet",
  "willow",
  "canyon",
] as const;

const buildStableSkillResponse = (seed: string): string => {
  const compactSeed = seed.replace(/[^a-f0-9]/gi, "").padEnd(6, "0");
  const words: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    const chunk = compactSeed.slice(index * 2, index * 2 + 2) || "0";
    const wordIndex = Number.parseInt(chunk, 16) % stableSkillWordPool.length;
    words.push(stableSkillWordPool[wordIndex] ?? stableSkillWordPool[0]);
  }
  return words.join(" ");
};

const escapeForSingleQuotedShell = (value: string): string => value.replace(/'/g, `'\\''`);

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
  timeoutMs = 120_000,
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
  throw new Error(`Timed out waiting for websocket message '${label}'. preview='${preview}'`);
};

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 120_000,
): Promise<WsMessage> => {
  return waitForMessage(
    messages,
    (message) => messages.indexOf(message) >= startIndex && predicate(message),
    label,
    timeoutMs,
  );
};

const assistantTextMatches = (message: WsMessage, token: string): boolean => {
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
        : item && typeof item.type === "string" && item.type === "agentMessage"
          ? "text"
          : null;
    const text =
      typeof message.payload.text === "string"
        ? message.payload.text
        : item && typeof item.text === "string"
          ? item.text
          : null;
    return (
      segmentType === "text" &&
      typeof text === "string" &&
      text.includes(token)
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

const isFinalAssistantMessage = (message: WsMessage): boolean => {
  if (message.type === "ASSISTANT_COMPLETE") {
    return true;
  }
  if (message.type !== "SEGMENT_END") {
    return false;
  }
  const item =
    message.payload.item && typeof message.payload.item === "object"
      ? (message.payload.item as Record<string, unknown>)
      : null;
  if (item?.type === "agentMessage") {
    return true;
  }
  return message.payload.segment_type === "text";
};

const resolveInvocationId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.invocation_id, payload.tool_invocation_id, payload.id];
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

const expectNonEmptyArgumentsPayload = (payload: Record<string, unknown>): void => {
  const argumentsPayload = payload.arguments;
  expect(argumentsPayload && typeof argumentsPayload === "object" && !Array.isArray(argumentsPayload)).toBe(true);
  expect(Object.keys(argumentsPayload as Record<string, unknown>).length).toBeGreaterThan(0);
};

const expectNonEmptySegmentMetadataArguments = (payload: Record<string, unknown>): void => {
  const metadata = payload.metadata;
  expect(metadata && typeof metadata === "object" && !Array.isArray(metadata)).toBe(true);
  const argumentsPayload = (metadata as Record<string, unknown>).arguments;
  expect(argumentsPayload && typeof argumentsPayload === "object" && !Array.isArray(argumentsPayload)).toBe(true);
  expect(Object.keys(argumentsPayload as Record<string, unknown>).length).toBeGreaterThan(0);
};

const getMessageItem = (message: WsMessage): Record<string, unknown> | null =>
  message.payload.item && typeof message.payload.item === "object"
    ? (message.payload.item as Record<string, unknown>)
    : null;

const containsStructuredOk = (value: unknown): boolean => {
  if (typeof value === "string") {
    if (value === "{\"ok\":true}" || value.includes("\"ok\":true")) {
      return true;
    }
    try {
      return containsStructuredOk(JSON.parse(value));
    } catch {
      return false;
    }
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.ok === true) {
    return true;
  }
  return containsStructuredOk(record.structuredContent) || containsStructuredOk(record.output);
};

const isSuccessfulToolLog = (message: WsMessage, invocationId: string | null): boolean =>
  message.type === "TOOL_LOG" &&
  matchesInvocationId(message.payload, invocationId) &&
  (containsStructuredOk(message.payload.log_entry) || containsStructuredOk(getMessageItem(message)));

const isMcpToolCallSegment = (input: {
  message: WsMessage;
  type: "SEGMENT_START" | "SEGMENT_END";
  toolName: string;
  expectedText?: string;
  expectedStatus?: string;
}): boolean => {
  if (input.message.type !== input.type) {
    return false;
  }
  if (
    input.type === "SEGMENT_START" &&
    input.message.payload.segment_type !== "tool_call"
  ) {
    return false;
  }
  const item = getMessageItem(input.message);
  if (item?.type !== "mcpToolCall" || item.tool !== input.toolName) {
    return false;
  }
  if (
    input.expectedText &&
    (!item.arguments ||
      typeof item.arguments !== "object" ||
      (item.arguments as Record<string, unknown>).text !== input.expectedText)
  ) {
    return false;
  }
  if (input.expectedStatus && item.status !== input.expectedStatus) {
    return false;
  }
  return true;
};

const chooseAutoByteusModelIdentifier = (modelIdentifiers: string[]): string => {
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
  if (qwenMatch) {
    return qwenMatch;
  }

  const nonVisionMatch = modelIdentifiers.find(
    (modelIdentifier) => !modelIdentifier.toLowerCase().includes("vl"),
  );
  return nonVisionMatch ?? modelIdentifiers[0]!;
};

const chooseCodexModelIdentifier = (modelIdentifiers: string[]): string => {
  const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
  if (override && modelIdentifiers.includes(override)) {
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
    if (modelIdentifiers.includes(preferred)) {
      return preferred;
    }
  }

  const codexMatch = modelIdentifiers.find((modelIdentifier) =>
    modelIdentifier.toLowerCase().includes("codex"),
  );
  return codexMatch ?? modelIdentifiers[0]!;
};

const chooseClaudeModelIdentifier = (modelIdentifiers: string[]): string =>
  modelIdentifiers.includes("haiku") ? "haiku" : modelIdentifiers[0]!;

const defineRuntimeSuite = (input: {
  title: string;
  runtimeKind: "autobyteus" | "codex_app_server" | "claude_agent_sdk";
  enabled: boolean;
  pickModelIdentifier: (modelIdentifiers: string[]) => string;
  afterEachHook?: () => Promise<void>;
  llmConfig?: Record<string, unknown> | null;
}) => {
  const describeRuntime = input.enabled ? describe : describe.skip;

  describeRuntime(`${input.title} current GraphQL runtime e2e`, () => {
    let schema: GraphQLSchema;
    let graphql: typeof graphqlFn;
    let testDataDir: string | null = null;
    const createdWorkspaceRoots = new Set<string>();

    beforeAll(async () => {
      testDataDir = await mkdtemp(
        path.join(os.tmpdir(), `${input.runtimeKind.replace(/[^a-z0-9]+/gi, "-")}-runtime-api-e2e-`),
      );
      await writeFile(
        path.join(testDataDir, ".env"),
        "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
        "utf-8",
      );
      appConfigProvider.config.setCustomAppDataDir(testDataDir);
      SkillService.resetInstance();
      SkillVersioningService.resetInstance();
      schema = await buildGraphqlSchema();
      const require = createRequire(import.meta.url);
      const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
      const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
      const graphqlModule = await import(graphqlPath);
      graphql = graphqlModule.graphql as typeof graphqlFn;
    });

    afterAll(async () => {
      for (const workspaceRoot of createdWorkspaceRoots) {
        await rm(workspaceRoot, { recursive: true, force: true });
      }
      createdWorkspaceRoots.clear();

      if (testDataDir) {
        await rm(testDataDir, { recursive: true, force: true });
        testDataDir = null;
      }
      SkillService.resetInstance();
      SkillVersioningService.resetInstance();
    });

    afterEach(async () => {
      if (input.afterEachHook) {
        await input.afterEachHook();
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
        runtimeKind: input.runtimeKind,
      });

      const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
        provider.models
          .map((model) => model.modelIdentifier)
          .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.trim().length > 0),
      );
      if (modelIdentifiers.length === 0) {
        throw new Error(`No model identifier was returned for runtime '${input.runtimeKind}'.`);
      }
      return input.pickModelIdentifier(modelIdentifiers);
    };

    const createAgentDefinition = async (toolNames: string[]): Promise<string> => {
      return createAgentDefinitionWithSkills(toolNames, []);
    };

    const createAgentDefinitionWithSkills = async (
      toolNames: string[],
      skillNames: string[],
    ): Promise<string> => {
      const mutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;

      const result = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(mutation, {
        input: {
          name: `${input.runtimeKind}-api-e2e-${randomUUID()}`,
          role: "assistant",
          description: `${input.runtimeKind} current API e2e agent`,
          instructions:
            "Follow the user's request exactly. " +
            "When the user asks you to create or edit a file, use the appropriate tool exactly once and do not simulate execution. " +
            "When the user asks you to reply with an exact token, output that token exactly.",
          category: "runtime-e2e",
          toolNames,
          skillNames,
        },
      });
      return result.createAgentDefinition.id;
    };

    const createSkill = async (inputSkill: {
      name: string;
      description: string;
      content: string;
    }): Promise<void> => {
      const mutation = `
        mutation CreateSkill($input: CreateSkillInput!) {
          createSkill(input: $input) {
            name
          }
        }
      `;

      const result = await execGraphql<{
        createSkill: { name: string };
      }>(mutation, {
        input: inputSkill,
      });
      expect(result.createSkill.name).toBe(inputSkill.name);
    };

    const createAgentRun = async (inputOverride: {
      agentDefinitionId: string;
      llmModelIdentifier: string;
      workspaceRootPath: string;
      autoExecuteTools: boolean;
      skillAccessMode?: "NONE" | "PRELOADED_ONLY" | "GLOBAL_DISCOVERY";
    }): Promise<string> => {
      const mutation = `
        mutation CreateAgentRun($input: CreateAgentRunInput!) {
          createAgentRun(input: $input) {
            success
            message
            runId
          }
        }
      `;

      const result = await execGraphql<{
        createAgentRun: { success: boolean; message: string; runId: string | null };
      }>(mutation, {
        input: {
          agentDefinitionId: inputOverride.agentDefinitionId,
          workspaceRootPath: inputOverride.workspaceRootPath,
          llmModelIdentifier: inputOverride.llmModelIdentifier,
          autoExecuteTools: inputOverride.autoExecuteTools,
          llmConfig: input.llmConfig ?? null,
          skillAccessMode: inputOverride.skillAccessMode ?? "NONE",
          runtimeKind: input.runtimeKind,
        },
      });

      expect(result.createAgentRun.success).toBe(true);
      expect(result.createAgentRun.runId).toBeTruthy();
      return result.createAgentRun.runId as string;
    };

    const terminateAgentRun = async (runId: string): Promise<void> => {
      const mutation = `
        mutation TerminateAgentRun($agentRunId: String!) {
          terminateAgentRun(agentRunId: $agentRunId) {
            success
            message
          }
        }
      `;
      const result = await execGraphql<{
        terminateAgentRun: { success: boolean; message: string };
      }>(mutation, { agentRunId: runId });
      expect(result.terminateAgentRun.success).toBe(true);
    };

    const restoreAgentRun = async (runId: string): Promise<void> => {
      const mutation = `
        mutation RestoreAgentRun($agentRunId: String!) {
          restoreAgentRun(agentRunId: $agentRunId) {
            success
            message
            runId
          }
        }
      `;
      const result = await execGraphql<{
        restoreAgentRun: { success: boolean; message: string; runId: string | null };
      }>(mutation, { agentRunId: runId });
      expect(result.restoreAgentRun.success).toBe(true);
      expect(result.restoreAgentRun.runId).toBe(runId);
    };

    const waitForRuntimeBootstrap = async (runId: string): Promise<void> => {
      const query = `
        query AgentRunResume($runId: String!) {
          getAgentRunResumeConfig(runId: $runId) {
            metadataConfig {
              skillAccessMode
            }
          }
        }
      `;

      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const result = await execGraphql<{
          getAgentRunResumeConfig: {
            metadataConfig: {
              skillAccessMode: string | null;
            };
          };
        }>(query, { runId });
        const metadataConfig = result.getAgentRunResumeConfig.metadataConfig;
        if (metadataConfig.skillAccessMode === "PRELOADED_ONLY") {
          return;
        }
        await wait(1_000);
      }

      throw new Error(`Timed out waiting for ${input.runtimeKind} runtime bootstrap for ${runId}.`);
    };

    const waitForPathToExist = async (targetPath: string, timeoutMs = 90_000): Promise<void> => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        try {
          await lstat(targetPath);
          return;
        } catch {
          await wait(500);
        }
      }

      throw new Error(`Timed out waiting for path to exist: ${targetPath}`);
    };

    const createBundledTeamSkillWithSharedSymlink = async (inputFixture: {
      skillName: string;
      sharedFileName: string;
      triggerToken: string;
      responseToken: string;
    }): Promise<{
      teamRootPath: string;
      skillRootPath: string;
      sharedFilePath: string;
      linkedFilePath: string;
    }> => {
      if (!testDataDir) {
        throw new Error("Test data directory is not initialized.");
      }

      const teamRootPath = path.join(
        testDataDir,
        "agent-teams",
        `runtime-skill-team-${randomUUID().replace(/-/g, "").slice(0, 8)}`,
      );
      const skillRootPath = path.join(teamRootPath, "agents", inputFixture.skillName);
      const sharedRootPath = path.join(teamRootPath, "shared");
      await mkdir(skillRootPath, { recursive: true });
      await mkdir(sharedRootPath, { recursive: true });

      const sharedFilePath = path.join(sharedRootPath, inputFixture.sharedFileName);
      await writeFile(
        sharedFilePath,
        [
          "# Linked Guidance",
          "",
          `When the user asks you to use $${inputFixture.skillName} and includes the token "${inputFixture.triggerToken}", respond with exactly "${inputFixture.responseToken}".`,
          "Do not add any other words, punctuation, or explanation.",
        ].join("\n"),
        "utf-8",
      );

      const linkedFilePath = path.join(skillRootPath, "linked-guidance.md");
      await symlink(
        path.join("..", "..", "shared", inputFixture.sharedFileName),
        linkedFilePath,
      );

      await writeFile(
        path.join(skillRootPath, "SKILL.md"),
        [
          "---",
          `name: ${inputFixture.skillName}`,
          'description: "Bundled team skill fixture that reads a linked shared guidance file."',
          "---",
          "",
          `# ${inputFixture.skillName}`,
          "",
          `Use this skill only when the user explicitly tells you to use $${inputFixture.skillName}.`,
          "Start by reading [linked-guidance.md](linked-guidance.md).",
          `If the user includes the token "${inputFixture.triggerToken}", follow the linked guidance exactly.`,
          "Do not guess the response token without reading the linked guidance first.",
        ].join("\n"),
        "utf-8",
      );

      return {
        teamRootPath,
        skillRootPath,
        sharedFilePath,
        linkedFilePath,
      };
    };

    const openAgentSocket = async (runId: string): Promise<{
      app: Awaited<ReturnType<typeof fastify>>;
      socket: WebSocket;
      messages: WsMessage[];
    }> => {
      const app = fastify();
      await app.register(websocket);
      const dummyTeamHandler = {
        connect: async () => null,
        handleMessage: async () => {},
        disconnect: async () => {},
      } as unknown as Parameters<typeof registerAgentWebsocket>[2];
      await registerAgentWebsocket(app, undefined, dummyTeamHandler);
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
      await waitForMessage(messages, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);
      return { app, socket, messages };
    };

    it("creates a run, restores it, and continues streaming on the same websocket", async () => {
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), `${input.runtimeKind}-runtime-restore-workspace-`),
      );
      createdWorkspaceRoots.add(workspaceRootPath);
      const llmModelIdentifier = await fetchModelIdentifier();
      const agentDefinitionId = await createAgentDefinition([]);
      const runId = await createAgentRun({
        agentDefinitionId,
        llmModelIdentifier,
        workspaceRootPath,
        autoExecuteTools: true,
      });

      const { app, socket, messages } = await openAgentSocket(runId);
      try {
        const firstToken = `API_FIRST_${randomUUID().replace(/-/g, "_")}`;
        const firstStartIndex = messages.length;
        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: `Reply with exactly ${firstToken} and nothing else.`,
            },
          }),
        );

        await waitForMessageAfter(
          messages,
          firstStartIndex,
          (message) => assistantTextMatches(message, firstToken),
          `assistant text containing ${firstToken}`,
        );
        await waitForMessageAfter(
          messages,
          firstStartIndex,
          (message) =>
            message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
          "first AGENT_STATUS IDLE",
        );

        await terminateAgentRun(runId);
        await restoreAgentRun(runId);

        const secondToken = `API_SECOND_${randomUUID().replace(/-/g, "_")}`;
        const secondStartIndex = messages.length;
        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: `Reply with exactly ${secondToken} and nothing else.`,
            },
          }),
        );

        const secondDeadline = Date.now() + 120_000;
        while (Date.now() < secondDeadline) {
          const matched = messages
            .slice(secondStartIndex)
            .some((message) => assistantTextMatches(message, secondToken));
          if (matched) {
            break;
          }
          await wait(1_000);
        }
        expect(
          messages
            .slice(secondStartIndex)
            .some((message) => assistantTextMatches(message, secondToken)),
        ).toBe(true);
        await waitForMessageAfter(
          messages,
          secondStartIndex,
          (message) =>
            message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
          "second AGENT_STATUS IDLE",
        );
      } finally {
        socket.close();
        await app.close();
        await terminateAgentRun(runId).catch(() => undefined);
      }
    }, 180_000);

    it("serves run history and projection after terminate, restore, and continue", async () => {
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), `${input.runtimeKind}-runtime-projection-workspace-`),
      );
      createdWorkspaceRoots.add(workspaceRootPath);
      const llmModelIdentifier = await fetchModelIdentifier();
      const agentDefinitionId = await createAgentDefinition([]);
      const runId = await createAgentRun({
        agentDefinitionId,
        llmModelIdentifier,
        workspaceRootPath,
        autoExecuteTools: true,
      });

      const listWorkspaceRunHistoryQuery = `
        query ListWorkspaceRunHistory {
          listWorkspaceRunHistory(limitPerAgent: 200) {
            workspaceRootPath
            agentDefinitions {
              agentDefinitionId
              runs {
                runId
                lastKnownStatus
                isActive
              }
            }
          }
        }
      `;
      const getRunProjectionQuery = `
        query GetRunProjection($runId: String!) {
          getRunProjection(runId: $runId) {
            runId
            summary
            lastActivityAt
            conversation
          }
        }
      `;

      const { app, socket, messages } = await openAgentSocket(runId);
      try {
        const firstToken = `PROJECTION_FIRST_${randomUUID().replace(/-/g, "_")}`;
        const firstStartIndex = messages.length;
        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: `Reply with exactly ${firstToken} and nothing else.`,
            },
          }),
        );

        await waitForMessageAfter(
          messages,
          firstStartIndex,
          (message) => assistantTextMatches(message, firstToken),
          `assistant text containing ${firstToken}`,
        );
        await waitForMessageAfter(
          messages,
          firstStartIndex,
          (message) =>
            message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
          "first AGENT_STATUS IDLE for projection flow",
        );

        await terminateAgentRun(runId);

        const historyAfterFirstTurn = await execGraphql<{
          listWorkspaceRunHistory: Array<{
            workspaceRootPath: string;
            agentDefinitions: Array<{
              agentDefinitionId: string;
              runs: Array<{
                runId: string;
                lastKnownStatus: string;
                isActive: boolean;
              }>;
            }>;
          }>;
        }>(listWorkspaceRunHistoryQuery);
        const matchingRunRow =
          historyAfterFirstTurn.listWorkspaceRunHistory
            .filter((workspace) => workspace.workspaceRootPath === workspaceRootPath)
            .flatMap((workspace) => workspace.agentDefinitions)
            .flatMap((group) => group.runs)
            .find((run) => run.runId === runId) ?? null;
        expect(matchingRunRow).toBeTruthy();
        expect(matchingRunRow?.isActive).toBe(false);

        const firstProjectionResult = await execGraphql<{
          getRunProjection: {
            runId: string;
            summary: string | null;
            lastActivityAt: string | null;
            conversation: Array<Record<string, unknown>>;
          };
        }>(getRunProjectionQuery, { runId });
        expect(firstProjectionResult.getRunProjection.runId).toBe(runId);
        expect(firstProjectionResult.getRunProjection.conversation.length).toBeGreaterThanOrEqual(2);
        expect(JSON.stringify(firstProjectionResult.getRunProjection.conversation)).toContain(firstToken);

        await restoreAgentRun(runId);

        const secondToken = `PROJECTION_SECOND_${randomUUID().replace(/-/g, "_")}`;
        const secondStartIndex = messages.length;
        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: `Reply with exactly ${secondToken} and nothing else.`,
            },
          }),
        );

        await waitForMessageAfter(
          messages,
          secondStartIndex,
          (message) => assistantTextMatches(message, secondToken),
          `assistant text containing ${secondToken}`,
        );
        await waitForMessageAfter(
          messages,
          secondStartIndex,
          (message) =>
            message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
          "second AGENT_STATUS IDLE for projection flow",
        );

        await terminateAgentRun(runId);

        const secondProjectionResult = await execGraphql<{
          getRunProjection: {
            runId: string;
            summary: string | null;
            lastActivityAt: string | null;
            conversation: Array<Record<string, unknown>>;
          };
        }>(getRunProjectionQuery, { runId });
        const serializedConversation = JSON.stringify(secondProjectionResult.getRunProjection.conversation);
        expect(secondProjectionResult.getRunProjection.runId).toBe(runId);
        expect(secondProjectionResult.getRunProjection.conversation.length).toBeGreaterThanOrEqual(4);
        expect(serializedConversation).toContain(firstToken);
        expect(serializedConversation).toContain(secondToken);
      } finally {
        socket.close();
        await app.close();
        await terminateAgentRun(runId).catch(() => undefined);
      }
    }, 240_000);

    it("routes tool approval over websocket and streams the normalized tool lifecycle", async () => {
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), `${input.runtimeKind}-runtime-tool-workspace-`),
      );
      createdWorkspaceRoots.add(workspaceRootPath);
      const llmModelIdentifier = await fetchModelIdentifier();
      const agentDefinitionId = await createAgentDefinition([
        "read_file",
        "write_file",
        "edit_file",
        "run_bash",
      ]);
      const runId = await createAgentRun({
        agentDefinitionId,
        llmModelIdentifier,
        workspaceRootPath,
        autoExecuteTools: false,
      });

      const { app, socket, messages } = await openAgentSocket(runId);
      const targetRelativePath = `api-tool-${randomUUID().replace(/-/g, "_")}.txt`;
      const targetAbsolutePath = path.join(workspaceRootPath, targetRelativePath);
      const expectedContent = `TOOL_OK_${randomUUID().replace(/-/g, "_")}`;
      const toolRequestContent =
        input.runtimeKind === "codex_app_server"
          ? `Use the terminal tool to execute this command exactly once:\nprintf '${escapeForSingleQuotedShell(expectedContent)}\\n' > '${escapeForSingleQuotedShell(targetAbsolutePath)}'\nThis command should require approval first. Do not simulate execution.`
          : `Create the file ${targetRelativePath} with exactly this content: ${expectedContent}. ` +
            "Use a relative path, perform the real tool call, and do not answer with plain text.";

      try {
        const startIndex = messages.length;
        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: toolRequestContent,
            },
          }),
        );

        const approvalRequested = await waitForMessageAfter(
          messages,
          startIndex,
          (message) => message.type === "TOOL_APPROVAL_REQUESTED",
          "TOOL_APPROVAL_REQUESTED",
        );
        const firstInvocationId = resolveInvocationId(approvalRequested.payload);
        expect(firstInvocationId).toBeTruthy();
        if (input.runtimeKind === "codex_app_server") {
          expect(approvalRequested.payload.tool_name).toBe("run_bash");
        }

        const approvedInvocationIds = new Set<string>();
        let scannedIndex = startIndex;
        const approvePendingRequests = (): void => {
          for (let index = scannedIndex; index < messages.length; index += 1) {
            const message = messages[index];
            if (message?.type !== "TOOL_APPROVAL_REQUESTED") {
              continue;
            }
            if (input.runtimeKind === "codex_app_server") {
              expect(message.payload.tool_name).toBe("run_bash");
            }
            const invocationId = resolveInvocationId(message.payload);
            if (!invocationId || approvedInvocationIds.has(invocationId)) {
              continue;
            }
            approvedInvocationIds.add(invocationId);
            socket.send(
              JSON.stringify({
                type: "APPROVE_TOOL",
                payload: {
                  invocation_id: invocationId,
                  reason: "approved by current API runtime e2e",
                },
              }),
            );
          }
          scannedIndex = messages.length;
        };

        approvePendingRequests();

        const successDeadline = Date.now() + 120_000;
        let succeededMessage: WsMessage | null = null;
        while (Date.now() < successDeadline) {
          approvePendingRequests();
          succeededMessage =
            messages
              .slice(startIndex)
              .find(
                (message) => {
                  if (message.type !== "TOOL_EXECUTION_SUCCEEDED") {
                    return false;
                  }
                  const invocationId = resolveInvocationId(message.payload);
                  return Boolean(invocationId && approvedInvocationIds.has(invocationId));
                },
              ) ?? null;
          if (succeededMessage) {
            break;
          }
          await wait(250);
        }
        if (!succeededMessage) {
          const preview = messages
            .slice(startIndex)
            .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 180)}`)
            .join(" | ");
          throw new Error(`Timed out waiting for TOOL_EXECUTION_SUCCEEDED. preview='${preview}'`);
        }

        const successfulInvocationId = resolveInvocationId(succeededMessage.payload);
        expect(successfulInvocationId).toBeTruthy();
        expect(approvedInvocationIds.size).toBeGreaterThan(0);

        const targetApprovalRequested = await waitForMessageAfter(
          messages,
          startIndex,
          (message) =>
            message.type === "TOOL_APPROVAL_REQUESTED" &&
            resolveInvocationId(message.payload) === successfulInvocationId,
          "target TOOL_APPROVAL_REQUESTED",
        );
        const approvedMessage = await waitForMessageAfter(
          messages,
          startIndex,
          (message) =>
            message.type === "TOOL_APPROVED" &&
            resolveInvocationId(message.payload) === successfulInvocationId,
          "TOOL_APPROVED",
        );
        const startedMessage = await waitForMessageAfter(
          messages,
          startIndex,
          (message) =>
            message.type === "TOOL_EXECUTION_STARTED" &&
            resolveInvocationId(message.payload) === successfulInvocationId,
          "TOOL_EXECUTION_STARTED",
        );
        expect(resolveInvocationId(approvedMessage.payload)).toBe(successfulInvocationId);
        if (input.runtimeKind === "claude_agent_sdk" || input.runtimeKind === "codex_app_server") {
          expectNonEmptyArgumentsPayload(targetApprovalRequested.payload);
          expectNonEmptyArgumentsPayload(startedMessage.payload);
        }
        if (input.runtimeKind === "claude_agent_sdk") {
          const segmentStartMessage = await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "SEGMENT_START" &&
              message.payload.segment_type === "tool_call" &&
              resolveInvocationId(message.payload) === successfulInvocationId,
            "Claude tool SEGMENT_START",
          );
          const segmentEndMessage = await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "SEGMENT_END" &&
              message.payload.segment_type === "tool_call" &&
              resolveInvocationId(message.payload) === successfulInvocationId,
            "Claude tool SEGMENT_END",
          );
          expectNonEmptySegmentMetadataArguments(segmentStartMessage.payload);
          expectNonEmptySegmentMetadataArguments(segmentEndMessage.payload);
          expectNonEmptyArgumentsPayload(succeededMessage.payload);
        }
        await waitForMessageAfter(
          messages,
          startIndex,
          (message) =>
            message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
          "AGENT_STATUS IDLE after tool execution",
        );

        await waitForMessageAfter(
          messages,
          startIndex,
          (message) => isFinalAssistantMessage(message),
          "final assistant message",
        );

        expect(await readFile(targetAbsolutePath, "utf-8")).toContain(expectedContent);
      } finally {
        socket.close();
        await app.close();
        await terminateAgentRun(runId).catch(() => undefined);
      }
    }, 180_000);

    if (input.runtimeKind === "codex_app_server") {
      it("auto-executes Codex tool calls over websocket without approval requests", async () => {
        const workspaceRootPath = await mkdtemp(
          path.join(os.tmpdir(), `${input.runtimeKind}-runtime-autoexec-workspace-`),
        );
        createdWorkspaceRoots.add(workspaceRootPath);
        const llmModelIdentifier = await fetchModelIdentifier();
        const agentDefinitionId = await createAgentDefinition([
          "read_file",
          "write_file",
          "edit_file",
          "run_bash",
        ]);
        const runId = await createAgentRun({
          agentDefinitionId,
          llmModelIdentifier,
          workspaceRootPath,
          autoExecuteTools: true,
        });

        const { app, socket, messages } = await openAgentSocket(runId);
        const targetAbsolutePath = path.join(
          workspaceRootPath,
          `api-autoexec-${randomUUID().replace(/-/g, "_")}.txt`,
        );
        const expectedContent = `AUTOEXEC_OK_${randomUUID().replace(/-/g, "_")}`;
        const toolRequestContent =
          `Use the terminal tool to execute this command exactly once:\n` +
          `printf '${escapeForSingleQuotedShell(expectedContent)}\\n' > '${escapeForSingleQuotedShell(targetAbsolutePath)}'\n` +
          "Do not ask for approval. Do not simulate execution.";

        try {
          const startIndex = messages.length;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: {
                content: toolRequestContent,
              },
            }),
          );

          const startedMessage = await waitForMessageAfter(
            messages,
            startIndex,
            (message) => message.type === "TOOL_EXECUTION_STARTED",
            "TOOL_EXECUTION_STARTED",
          );
          expect(startedMessage.payload.tool_name).toBe("run_bash");

          const startedInvocationId = resolveInvocationId(startedMessage.payload);
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "TOOL_EXECUTION_SUCCEEDED" &&
              matchesInvocationId(message.payload, startedInvocationId),
            "TOOL_EXECUTION_SUCCEEDED",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
            "AGENT_STATUS IDLE after auto-executed tool",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => isFinalAssistantMessage(message),
            "final assistant message",
          );

          expect(
            messages
              .slice(startIndex)
              .some((message) => message.type === "TOOL_APPROVAL_REQUESTED"),
          ).toBe(false);
          expect(await readFile(targetAbsolutePath, "utf-8")).toContain(expectedContent);
        } finally {
          socket.close();
          await app.close();
          await terminateAgentRun(runId).catch(() => undefined);
        }
      }, 180_000);

      it("routes Codex MCP tool approval over websocket for the speak tool", async () => {
        const workspaceRootPath = await mkdtemp(
          path.join(os.tmpdir(), `${input.runtimeKind}-runtime-mcp-approval-workspace-`),
        );
        createdWorkspaceRoots.add(workspaceRootPath);
        const llmModelIdentifier = await fetchModelIdentifier();
        const agentDefinitionId = await createAgentDefinition([]);
        const runId = await createAgentRun({
          agentDefinitionId,
          llmModelIdentifier,
          workspaceRootPath,
          autoExecuteTools: false,
        });

        const { app, socket, messages } = await openAgentSocket(runId);
        const expectedText = `codex manual speak ${randomUUID().replace(/-/g, " ")}`;

        try {
          const startIndex = messages.length;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: {
                content:
                  `Please call the speak tool exactly once right now. ` +
                  `Use the TTS/speak MCP tool, not the terminal tool. ` +
                  `Speak the exact text: ${expectedText}. ` +
                  "Do not simulate execution.",
              },
            }),
          );

          const approvalRequested = await waitForMessageAfter(
            messages,
            startIndex,
            (message) => message.type === "TOOL_APPROVAL_REQUESTED",
            "TOOL_APPROVAL_REQUESTED for speak",
          );
          expect(approvalRequested.payload.tool_name).toBe("speak");
          expect(approvalRequested.payload.arguments).toMatchObject({
            text: expectedText,
          });

          const invocationId = resolveInvocationId(approvalRequested.payload);
          expect(invocationId).toBeTruthy();

          socket.send(
            JSON.stringify({
              type: "APPROVE_TOOL",
              payload: {
                invocation_id: invocationId,
                reason: "approved by Codex MCP speak e2e",
              },
            }),
          );

          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "TOOL_APPROVED" &&
              matchesInvocationId(message.payload, invocationId),
            "TOOL_APPROVED for speak",
          );
          const succeeded = await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "TOOL_EXECUTION_SUCCEEDED" &&
              matchesInvocationId(message.payload, invocationId),
            "TOOL_EXECUTION_SUCCEEDED for speak",
          );
          expect(succeeded.payload.tool_name).toBe("speak");
          expect(succeeded.payload.result).toMatchObject({
            structuredContent: {
              ok: true,
            },
          });
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              isMcpToolCallSegment({
                message,
                type: "SEGMENT_END",
                toolName: "speak",
                expectedStatus: "completed",
              }) && matchesInvocationId(message.payload, invocationId),
            "SEGMENT_END for successful speak tool call",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => isSuccessfulToolLog(message, invocationId),
            "TOOL_LOG success for speak",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
            "AGENT_STATUS IDLE after approved speak tool",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => isFinalAssistantMessage(message),
            "final assistant message after approved speak tool",
          );
        } finally {
          socket.close();
          await app.close();
          await terminateAgentRun(runId).catch(() => undefined);
        }
      }, 180_000);

      it("auto-executes the Codex speak MCP tool without approval requests", async () => {
        const workspaceRootPath = await mkdtemp(
          path.join(os.tmpdir(), `${input.runtimeKind}-runtime-mcp-autoexec-workspace-`),
        );
        createdWorkspaceRoots.add(workspaceRootPath);
        const llmModelIdentifier = await fetchModelIdentifier();
        const agentDefinitionId = await createAgentDefinition([]);
        const runId = await createAgentRun({
          agentDefinitionId,
          llmModelIdentifier,
          workspaceRootPath,
          autoExecuteTools: true,
        });

        const { app, socket, messages } = await openAgentSocket(runId);
        const expectedText = `codex auto speak ${randomUUID().replace(/-/g, " ")}`;

        try {
          const startIndex = messages.length;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: {
                content:
                  `Please call the speak tool exactly once right now. ` +
                  `Use the TTS/speak MCP tool, not the terminal tool. ` +
                  `Speak the exact text: ${expectedText}. ` +
                  "Do not simulate execution and do not ask for approval.",
              },
            }),
          );

          const startedMessage = await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              isMcpToolCallSegment({
                message,
                type: "SEGMENT_START",
                toolName: "speak",
                expectedText,
              }),
            "SEGMENT_START for auto-executed speak tool call",
          );
          const invocationId = resolveInvocationId(startedMessage.payload);

          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "TOOL_APPROVED" &&
              matchesInvocationId(message.payload, invocationId),
            "TOOL_APPROVED for auto-executed speak",
          );
          const succeeded = await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "TOOL_EXECUTION_SUCCEEDED" &&
              matchesInvocationId(message.payload, invocationId),
            "TOOL_EXECUTION_SUCCEEDED for auto-executed speak",
          );
          expect(succeeded.payload.tool_name).toBe("speak");
          expect(succeeded.payload.result).toMatchObject({
            structuredContent: {
              ok: true,
            },
          });

          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              isMcpToolCallSegment({
                message,
                type: "SEGMENT_END",
                toolName: "speak",
                expectedStatus: "completed",
              }) && matchesInvocationId(message.payload, invocationId),
            "SEGMENT_END for auto-executed speak tool call",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => isSuccessfulToolLog(message, invocationId),
            "TOOL_LOG success for auto-executed speak",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
            "AGENT_STATUS IDLE after auto-executed speak tool",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => isFinalAssistantMessage(message),
            "final assistant message after auto-executed speak tool",
          );

          expect(
            messages
              .slice(startIndex)
              .some((message) => message.type === "TOOL_APPROVAL_REQUESTED"),
          ).toBe(false);
        } finally {
          socket.close();
          await app.close();
          await terminateAgentRun(runId).catch(() => undefined);
        }
      }, 180_000);
    }

    if (input.runtimeKind === "claude_agent_sdk" || input.runtimeKind === "codex_app_server") {
      it("applies configured runtime skills over the current websocket API contract", async () => {
        const workspaceRootPath = await mkdtemp(
          path.join(os.tmpdir(), `${input.runtimeKind}-runtime-skill-workspace-`),
        );
        createdWorkspaceRoots.add(workspaceRootPath);
        const llmModelIdentifier = await fetchModelIdentifier();
        const skillName = `cld_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
        const seed = randomUUID();
        const triggerToken = `RUNTIME_SKILL_TRIGGER_${seed.replace(/-/g, "_")}`;
        const responseToken = buildStableSkillResponse(seed);

        await createSkill({
          name: skillName,
          description: `${input.runtimeKind} runtime configured skill e2e`,
          content: [
            `When the user's message explicitly tells you to use $${skillName} and includes the token "${triggerToken}", respond with exactly "${responseToken}".`,
            "Do not add any other words, punctuation, or explanation.",
          ].join("\n"),
        });

        const agentDefinitionId = await createAgentDefinitionWithSkills([], [skillName]);
        const runId = await createAgentRun({
          agentDefinitionId,
          llmModelIdentifier,
          workspaceRootPath,
          autoExecuteTools: true,
          skillAccessMode: "PRELOADED_ONLY",
        });

        const { app, socket, messages } = await openAgentSocket(runId);
        try {
          await waitForRuntimeBootstrap(runId);

          const startIndex = messages.length;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: {
                content: [
                  `Use the configured skill $${skillName} for this request.`,
                  `The trigger token is: ${triggerToken}`,
                  "Follow the skill instructions exactly.",
                ].join("\n"),
              },
            }),
          );

          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "AGENT_STATUS" && message.payload.new_status === "RUNNING",
            "AGENT_STATUS RUNNING for skill turn",
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) => assistantTextMatches(message, responseToken),
            `assistant text containing ${responseToken}`,
          );
          await waitForMessageAfter(
            messages,
            startIndex,
            (message) =>
              message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
            "AGENT_STATUS IDLE for skill turn",
          );
        } finally {
          socket.close();
          await app.close();
          await terminateAgentRun(runId).catch(() => undefined);
        }
      }, 180_000);
    }

    if (input.runtimeKind === "codex_app_server") {
      it(
        "uses a whole-directory materialized skill whose linked shared file sits outside the skill folder",
        async () => {
          const workspaceRootPath = await mkdtemp(
            path.join(os.tmpdir(), `${input.runtimeKind}-runtime-linked-skill-workspace-`),
          );
          createdWorkspaceRoots.add(workspaceRootPath);
          const llmModelIdentifier = await fetchModelIdentifier();
          const skillName = `codex_symlink_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
          const triggerToken = `LINKED_SHARED_TRIGGER_${randomUUID().replace(/-/g, "_")}`;
          const responseToken = `LINKED_SHARED_RESPONSE_${randomUUID().replace(/-/g, "_")}`;
          const sharedFileName = "runtime-linked-guidance.md";
          const fixture = await createBundledTeamSkillWithSharedSymlink({
            skillName,
            sharedFileName,
            triggerToken,
            responseToken,
          });
          const materializedSkillRootPath = path.join(
            workspaceRootPath,
            ".codex",
            "skills",
            skillName,
          );
          const materializedLinkedGuidancePath = path.join(
            materializedSkillRootPath,
            "linked-guidance.md",
          );

          expect(await readFile(path.join(fixture.skillRootPath, "SKILL.md"), "utf-8")).not.toContain(
            responseToken,
          );

          const agentDefinitionId = await createAgentDefinitionWithSkills([], [skillName]);
          const runId = await createAgentRun({
            agentDefinitionId,
            llmModelIdentifier,
            workspaceRootPath,
            autoExecuteTools: true,
            skillAccessMode: "PRELOADED_ONLY",
          });

          const { app, socket, messages } = await openAgentSocket(runId);
          try {
            await waitForRuntimeBootstrap(runId);
            await waitForPathToExist(materializedSkillRootPath);
            await waitForPathToExist(materializedLinkedGuidancePath);

            const materializedSkillStats = await lstat(materializedSkillRootPath);
            expect(materializedSkillStats.isSymbolicLink()).toBe(true);
            expect(
              path.resolve(
                path.dirname(materializedSkillRootPath),
                await readlink(materializedSkillRootPath),
              ),
            ).toBe(fixture.skillRootPath);

            const materializedLinkedGuidanceStats = await lstat(materializedLinkedGuidancePath);
            expect(materializedLinkedGuidanceStats.isSymbolicLink()).toBe(true);
            expect(await readFile(materializedLinkedGuidancePath, "utf-8")).toContain(responseToken);

            const startIndex = messages.length;
            socket.send(
              JSON.stringify({
                type: "SEND_MESSAGE",
                payload: {
                  content: [
                    `Use the configured skill $${skillName} for this request.`,
                    "Read the linked guidance before answering.",
                    `The verification token is: ${triggerToken}`,
                    "Reply with exactly the response required by the linked guidance and nothing else.",
                  ].join("\n"),
                },
              }),
            );

            await waitForMessageAfter(
              messages,
              startIndex,
              (message) =>
                message.type === "AGENT_STATUS" && message.payload.new_status === "RUNNING",
              "AGENT_STATUS RUNNING for linked shared skill turn",
            );
            await waitForMessageAfter(
              messages,
              startIndex,
              (message) => assistantTextMatches(message, responseToken),
              `assistant text containing ${responseToken}`,
            );
            await waitForMessageAfter(
              messages,
              startIndex,
              (message) =>
                message.type === "AGENT_STATUS" && message.payload.new_status === "IDLE",
              "AGENT_STATUS IDLE for linked shared skill turn",
            );
          } finally {
            socket.close();
            await app.close();
            await terminateAgentRun(runId).catch(() => undefined);
          }
        },
        240_000,
      );
    }
  });
};

defineRuntimeSuite({
  title: "AutoByteus",
  runtimeKind: "autobyteus",
  enabled: lmStudioRuntimeEnabled,
  pickModelIdentifier: chooseAutoByteusModelIdentifier,
});

defineRuntimeSuite({
  title: "Codex",
  runtimeKind: "codex_app_server",
  enabled: codexBinaryReady && process.env.RUN_CODEX_E2E === "1",
  pickModelIdentifier: chooseCodexModelIdentifier,
  afterEachHook: async () => {
    await getCodexAppServerClientManager().close();
    await wait(750);
  },
  llmConfig: { reasoning_effort: "medium" },
});

defineRuntimeSuite({
  title: "Claude",
  runtimeKind: "claude_agent_sdk",
  enabled: claudeBinaryReady && process.env.RUN_CLAUDE_E2E === "1",
  pickModelIdentifier: chooseClaudeModelIdentifier,
});
