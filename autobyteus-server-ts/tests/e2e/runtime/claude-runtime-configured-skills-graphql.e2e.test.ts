import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

const claudeBinaryReady = spawnSync("claude", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeClaudeRuntime = claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const removeDirWithRetry = async (targetPath: string): Promise<void> => {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt >= 5) {
        throw error;
      }
      await wait(250 * attempt);
    }
  }
};

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type WsTurnCapture = {
  sawConnected: boolean;
  sawRunningAfterPrompt: boolean;
  sawIdleAfterPrompt: boolean;
  assistantOutputFragments: string[];
  errorCodes: string[];
  rawMessages: WsMessage[];
};

describeClaudeRuntime("Claude configured-skill GraphQL e2e (live transport)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "claude-skill-e2e-appdata-"));
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
    if (testDataDir) {
      await removeDirWithRetry(testDataDir);
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

  const fetchClaudeModelIdentifier = async (): Promise<string> => {
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
      runtimeKind: "claude_agent_sdk",
    });

    const modelIdentifier = result.availableLlmProvidersWithModels
      .flatMap((provider) => provider.models)
      .map((model) => model.modelIdentifier)
      .find((value) => typeof value === "string" && value.trim().length > 0);
    if (!modelIdentifier) {
      throw new Error("No Claude model identifier was returned for live configured-skill E2E.");
    }
    return modelIdentifier;
  };

  const createConfiguredSkill = async (skillName: string, trigger: string, response: string): Promise<void> => {
    if (!testDataDir) {
      throw new Error("testDataDir is not initialized");
    }
    const skillRoot = path.join(testDataDir, "skills", skillName);
    await mkdir(skillRoot, { recursive: true });
    await writeFile(
      path.join(skillRoot, "SKILL.md"),
      [
        "---",
        `name: ${skillName}`,
        "description: Live Claude configured skill E2E probe.",
        "---",
        "",
        `When the user's message is exactly "${trigger}", respond with exactly "${response}".`,
        "Do not add any other words or punctuation.",
      ].join("\n"),
      "utf-8",
    );
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
        name: `claude_skill_e2e_${uniqueSuffix}`,
        role: "assistant",
        description: "Claude configured skill e2e agent.",
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
      query Bootstrap($runId: String!) {
        getRunResumeConfig(runId: $runId) {
          manifestConfig {
            skillAccessMode
            runtimeReference {
              sessionId
              metadata
            }
          }
        }
      }
    `;

    const deadline = Date.now() + 30_000;
    let lastSkillAccessMode: string | null = null;
    let lastSessionId: string | null = null;
    let lastConfiguredSkillNames: unknown[] = [];
    while (Date.now() < deadline) {
      const result = await execGraphql<{
        getRunResumeConfig: {
          manifestConfig: {
            skillAccessMode: string | null;
            runtimeReference: {
              sessionId: string | null;
              metadata?: Record<string, unknown> | null;
            };
          };
        };
      }>(query, { runId: input.runId });

      lastSkillAccessMode = result.getRunResumeConfig.manifestConfig.skillAccessMode;
      lastSessionId = result.getRunResumeConfig.manifestConfig.runtimeReference.sessionId;
      const metadata = asObject(result.getRunResumeConfig.manifestConfig.runtimeReference.metadata);
      const configuredSkillNames = Array.isArray(metadata?.configuredSkillNames)
        ? metadata.configuredSkillNames
        : [];
      lastConfiguredSkillNames = configuredSkillNames;

      if (
        result.getRunResumeConfig.manifestConfig.skillAccessMode === "PRELOADED_ONLY" &&
        configuredSkillNames.includes(input.skillName) &&
        Boolean(result.getRunResumeConfig.manifestConfig.runtimeReference.sessionId)
      ) {
        return;
      }

      await wait(1_500);
    }

    throw new Error(
      `Timed out waiting for Claude configured-skill bootstrap evidence. runId=${input.runId} skill=${input.skillName} skillAccessMode=${String(lastSkillAccessMode)} sessionId=${String(lastSessionId)} configuredSkills=${JSON.stringify(lastConfiguredSkillNames)}`,
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
      const sendPrompt = () => {
        if (promptSent) {
          return;
        }
        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: input.prompt,
            },
          }),
        );
        promptSent = true;
      };

      const fallbackSendTimer = setTimeout(() => {
        sendPrompt();
      }, 5_000);

      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting for Claude configured-skill websocket turn. running=${String(sawRunningAfterPrompt)} idle=${String(sawIdleAfterPrompt)} errors=${JSON.stringify(errorCodes)} messageTypes=${JSON.stringify(rawMessages.map((message) => message.type))}`,
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
        try {
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
              sendPrompt();
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
            const segmentType = payload.segment_type;
            const delta = payload.delta;
            if (segmentType === "text" && typeof delta === "string" && delta.length > 0) {
              assistantOutputFragments.push(delta);
            }
            return;
          }

          if (parsed.type === "SEGMENT_END") {
            if (!promptSent) {
              return;
            }
            if (typeof payload.text === "string" && payload.text.length > 0) {
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
        } catch {
          // ignore malformed websocket messages in e2e capture
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
    "uses agent-configured skills in live claude runs",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const uniqueSuffix = randomUUID().replace(/-/g, "_");
      const skillName = `claude_runtime_skill_${uniqueSuffix}`;
      const trigger = `CLAUDE_SKILL_TRIGGER_${uniqueSuffix}`;
      const response = `CLAUDE_SKILL_RESPONSE_${uniqueSuffix}`;
      const bootstrapPrompt = `Reply with exactly READY for bootstrap ${uniqueSuffix}.`;
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-skill-workspace-e2e-"));
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
        await createConfiguredSkill(skillName, trigger, response);
        const agentDefinitionId = await createAgentDefinition(skillName);

        const continueResult = await execGraphql<{
          continueRun: {
            success: boolean;
            message: string;
            runId: string | null;
          };
        }>(continueMutation, {
          input: {
            runtimeKind: "claude_agent_sdk",
            agentDefinitionId,
            workspaceRootPath,
            llmModelIdentifier: modelIdentifier,
            userInput: {
              content: bootstrapPrompt,
            },
          },
        });

        expect(continueResult.continueRun.success).toBe(true);
        expect(continueResult.continueRun.runId).toBeTruthy();
        runId = continueResult.continueRun.runId as string;

        await waitForConfiguredSkillBootstrap({
          runId,
          skillName,
        });

        const capture = await captureConfiguredSkillResponse({
          runId,
          prompt: trigger,
        });

        expect(capture.sawConnected).toBe(true);
        expect(capture.sawRunningAfterPrompt).toBe(true);
        expect(capture.sawIdleAfterPrompt).toBe(true);
        expect(capture.errorCodes).not.toContain("CLAUDE_RUNTIME_TURN_FAILED");
        expect(capture.assistantOutputFragments.join("")).toContain(response);
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
    150_000,
  );
});
