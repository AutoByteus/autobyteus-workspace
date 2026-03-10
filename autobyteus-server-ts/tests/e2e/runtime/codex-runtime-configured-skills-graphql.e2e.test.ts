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
import { getCodexAppServerProcessManager } from "../../../src/runtime-execution/codex-app-server/codex-app-server-process-manager.js";
import {
  asObject,
  buildStableSkillResponse,
  createConfiguredSkill,
  isRetryableCodexBootstrapFailure,
  removeDirWithRetry,
  tokenizeLiveModelText,
  wait,
  waitForSocketOpen,
  type WsTurnCapture,
} from "./codex-live-test-helpers.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexRuntime = codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;

describeCodexRuntime("Codex configured-skill GraphQL e2e (live transport)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "codex-skill-e2e-appdata-"));
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
    await getCodexAppServerProcessManager().close();
    if (testDataDir) {
      await removeDirWithRetry(testDataDir);
      testDataDir = null;
    }
  });

  afterEach(async () => {
    await getCodexAppServerProcessManager().close();
    await wait(750);
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

  const fetchPreferredCodexModelIdentifier = async (): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
          provider
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
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    );
    if (allModelIdentifiers.length === 0) {
      throw new Error("No Codex model identifier was returned for live configured-skill E2E.");
    }

    const override = process.env.CODEX_E2E_TOOL_MODEL?.trim();
    if (override && allModelIdentifiers.includes(override)) {
      return override;
    }

    const preferredOrder = [
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

  const createAgentDefinition = async (skillName: string): Promise<string> => {
    const mutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
        }
      }
    `;

    const uniqueSuffix = randomUUID().replace(/-/g, "_");
    const result = await execGraphql<{
      createAgentDefinition: { id: string };
    }>(mutation, {
      input: {
        name: `codex_skill_e2e_${uniqueSuffix}`,
        role: "assistant",
        description: "Codex configured skill e2e agent.",
        instructions: "Follow configured skills exactly.",
        category: "runtime-e2e",
        toolNames: [],
        skillNames: [skillName],
      },
    });
    return result.createAgentDefinition.id;
  };

  const waitForConfiguredSkillBootstrap = async (input: {
    runId: string;
    skillName: string;
  }): Promise<void> => {
    const query = `
      query Resume($runId: String!) {
        getRunResumeConfig(runId: $runId) {
          manifestConfig {
            skillAccessMode
            runtimeReference {
              threadId
              metadata
            }
          }
        }
      }
    `;

    const deadline = Date.now() + 90_000;
    let lastThreadId: string | null = null;
    let lastSkillAccessMode: string | null = null;
    let lastConfiguredSkillNames: unknown[] = [];

    while (Date.now() < deadline) {
      const result = await execGraphql<{
        getRunResumeConfig: {
          manifestConfig: {
            skillAccessMode: string | null;
            runtimeReference: {
              threadId: string | null;
              metadata?: Record<string, unknown> | null;
            };
          };
        };
      }>(query, { runId: input.runId });

      const manifestConfig = result.getRunResumeConfig.manifestConfig;
      lastSkillAccessMode = manifestConfig.skillAccessMode;
      const metadata = asObject(manifestConfig.runtimeReference.metadata);
      const configuredSkillNames = Array.isArray(metadata?.configuredSkillNames)
        ? metadata.configuredSkillNames
        : [];
      lastConfiguredSkillNames = configuredSkillNames;
      lastThreadId = manifestConfig.runtimeReference.threadId ?? null;

      if (
        manifestConfig.skillAccessMode === "PRELOADED_ONLY" &&
        configuredSkillNames.includes(input.skillName) &&
        Boolean(lastThreadId)
      ) {
        return;
      }

      await wait(1_500);
    }

    throw new Error(
      `Timed out waiting for Codex configured-skill bootstrap evidence. threadId=${String(lastThreadId)} skillAccessMode=${String(lastSkillAccessMode)} configuredSkills=${JSON.stringify(lastConfiguredSkillNames)}`,
    );
  };

  const waitForBootstrapAssistantProjection = async (runId: string): Promise<void> => {
    const query = `
      query Projection($runId: String!) {
        getRunProjection(runId: $runId) {
          conversation
        }
      }
    `;

    const deadline = Date.now() + 90_000;
    let lastConversationLength = 0;
    let lastAssistantCount = 0;

    while (Date.now() < deadline) {
      const result = await execGraphql<{
        getRunProjection: {
          conversation?: Array<Record<string, unknown>> | null;
        };
      }>(query, { runId });

      const conversation = Array.isArray(result.getRunProjection?.conversation)
        ? result.getRunProjection.conversation
        : [];
      lastConversationLength = conversation.length;
      lastAssistantCount = conversation.filter((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }
        return (entry as Record<string, unknown>).role === "assistant";
      }).length;

      if (lastAssistantCount > 0) {
        return;
      }

      await wait(1_500);
    }

    throw new Error(
      `Timed out waiting for Codex bootstrap assistant projection. conversationLength=${String(lastConversationLength)} assistantCount=${String(lastAssistantCount)}`,
    );
  };

  const captureConfiguredSkillResponse = async (input: {
    runId: string;
    prompt: string;
  }): Promise<WsTurnCapture> => {
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
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent/${input.runId}`);

    const rawMessages: WsMessage[] = [];
    const assistantOutputFragments: string[] = [];
    const errorCodes: string[] = [];
    let sawConnected = false;
    let sawRunningAfterPrompt = false;
    let sawIdleAfterPrompt = false;
    let promptSent = false;

    await waitForSocketOpen(socket);
    sawConnected = true;

    const finished = new Promise<WsTurnCapture>((resolve, reject) => {
      const fallbackSendTimer = setTimeout(() => {
        if (!promptSent) {
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: {
                content: input.prompt,
              },
            }),
          );
          promptSent = true;
        }
      }, 5_000);

      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting for Codex configured-skill websocket turn. running=${String(sawRunningAfterPrompt)} idle=${String(sawIdleAfterPrompt)} errors=${JSON.stringify(errorCodes)} messageTypes=${JSON.stringify(rawMessages.map((message) => message.type))}`,
          ),
        );
      }, 90_000);

      const maybeResolve = () => {
        if (!promptSent) {
          return;
        }
        if (sawRunningAfterPrompt && sawIdleAfterPrompt) {
          clearTimeout(fallbackSendTimer);
          clearTimeout(timeout);
          resolve({
            sawConnected,
            sawRunningAfterPrompt,
            sawIdleAfterPrompt,
            assistantOutputFragments,
            errorCodes,
            rawMessages,
          });
        }
      };

      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString()) as {
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

        rawMessages.push({
          type: parsed.type,
          payload,
        });

        if (parsed.type === "CONNECTED") {
          sawConnected = true;
          return;
        }

        if (parsed.type === "AGENT_STATUS") {
          const status = payload.new_status;
          if (status === "IDLE" && !promptSent) {
            socket.send(
              JSON.stringify({
                type: "SEND_MESSAGE",
                payload: {
                  content: input.prompt,
                },
              }),
            );
            promptSent = true;
            return;
          }
          if (promptSent && status === "RUNNING") {
            sawRunningAfterPrompt = true;
            return;
          }
          if (promptSent && status === "IDLE" && sawRunningAfterPrompt) {
            sawIdleAfterPrompt = true;
            maybeResolve();
          }
          return;
        }

        if (parsed.type === "SEGMENT_CONTENT") {
          if (!promptSent) {
            return;
          }
          if (payload.segment_type === "text" && typeof payload.delta === "string" && payload.delta.length > 0) {
            assistantOutputFragments.push(payload.delta);
          }
          return;
        }

        if (parsed.type === "SEGMENT_END") {
          if (!promptSent) {
            return;
          }
          if (payload.segment_type === "text" && typeof payload.text === "string" && payload.text.length > 0) {
            assistantOutputFragments.push(payload.text);
          }
          maybeResolve();
          return;
        }

        if (parsed.type === "ERROR") {
          const code = payload.code;
          if (typeof code === "string") {
            errorCodes.push(code);
          }
        }
      });

      socket.once("error", (error) => {
        clearTimeout(fallbackSendTimer);
        clearTimeout(timeout);
        reject(error);
      });
    });

    try {
      return await finished;
    } finally {
      socket.close();
      await app.close();
    }
  };

  it(
    "uses agent-configured skills in live codex runs",
    async () => {
      const modelIdentifier = await fetchPreferredCodexModelIdentifier();
      const uniqueSuffix = randomUUID().replace(/-/g, "_");
      const skillName = `codex_runtime_skill_${uniqueSuffix}`;
      const trigger = `CODEX_SKILL_TRIGGER_${uniqueSuffix}`;
      const response = buildStableSkillResponse(uniqueSuffix);
      const bootstrapPrompt = `Reply with exactly READY for bootstrap ${uniqueSuffix}.`;
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-skill-workspace-e2e-"));
      let runId: string | null = null;

      const continueMutation = `
        mutation ContinueRun($input: ContinueRunInput!) {
          continueRun(input: $input) {
            success
            message
            runId
          }
        }
      `;
      const terminateMutation = `
        mutation Terminate($id: String!) {
          terminateAgentRun(id: $id) {
            success
            message
          }
        }
      `;

      try {
        if (!testDataDir) {
          throw new Error("testDataDir is not initialized");
        }
        await createConfiguredSkill(testDataDir, skillName, trigger, response);
        const agentDefinitionId = await createAgentDefinition(skillName);

        const bootstrapDeadline = Date.now() + 90_000;
        let continueResult: {
          continueRun: {
            success: boolean;
            message: string;
            runId: string | null;
          };
        } | null = null;

        do {
          continueResult = await execGraphql<{
            continueRun: {
              success: boolean;
              message: string;
              runId: string | null;
            };
          }>(continueMutation, {
            input: {
              runtimeKind: "codex_app_server",
              agentDefinitionId,
              workspaceRootPath,
              llmModelIdentifier: modelIdentifier,
              userInput: {
                content: bootstrapPrompt,
              },
            },
          });

          if (
            continueResult.continueRun.success ||
            Date.now() >= bootstrapDeadline ||
            !isRetryableCodexBootstrapFailure(continueResult.continueRun.message)
          ) {
            break;
          }
          await wait(2_000);
        } while (Date.now() < bootstrapDeadline);

        expect(continueResult?.continueRun.success).toBe(true);
        expect(continueResult?.continueRun.runId).toBeTruthy();
        runId = continueResult?.continueRun.runId as string;

        await waitForConfiguredSkillBootstrap({
          runId,
          skillName,
        });
        await waitForBootstrapAssistantProjection(runId);

        const capture = await captureConfiguredSkillResponse({
          runId,
          prompt: trigger,
        });

        expect(capture.sawConnected).toBe(true);
        expect(capture.sawRunningAfterPrompt).toBe(true);
        expect(capture.sawIdleAfterPrompt).toBe(true);
        expect(capture.errorCodes).toEqual([]);
        expect(tokenizeLiveModelText(capture.assistantOutputFragments.join("")).sort()).toEqual(
          tokenizeLiveModelText(response).sort(),
        );
      } finally {
        if (runId) {
          try {
            await execGraphql<{
              terminateAgentRun: { success: boolean; message: string };
            }>(terminateMutation, { id: runId });
          } catch {
            // best-effort cleanup
          }
        }
        await rm(workspaceRootPath, { recursive: true, force: true });
      }
    },
    180_000,
  );
});
