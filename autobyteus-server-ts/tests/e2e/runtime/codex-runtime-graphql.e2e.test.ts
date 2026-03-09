import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getMediaStorageService } from "../../../src/services/media-storage-service.js";
import { getCodexAppServerProcessManager } from "../../../src/runtime-execution/codex-app-server/codex-app-server-process-manager.js";
import { getCodexThreadHistoryReader } from "../../../src/runtime-execution/codex-app-server/codex-thread-history-reader.js";

const waitForSocketOpen = (socket: WebSocket, timeoutMs = 10000): Promise<void> =>
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

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isRetryableCodexBootstrapFailure = (message: string | null | undefined): boolean => {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("code_runtime_command_failed") ||
    normalized.includes("codex_runtime_command_failed") ||
    normalized.includes("startup-ready state") ||
    normalized.includes("did not reach startup-ready state") ||
    normalized.includes("runtime command failed")
  );
};

const escapeForSingleQuotedShell = (value: string): string => value.replace(/'/g, `'\\''`);

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;

const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexRuntime = codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;
const runtimeE2eDir = path.dirname(fileURLToPath(import.meta.url));
const imageInputFixturePath = path.join(runtimeE2eDir, "fixtures", "codex-image-input-fixture.png");

describeCodexRuntime("Codex runtime GraphQL e2e (live transport)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "codex-runtime-e2e-appdata-"));
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
      await rm(testDataDir, { recursive: true, force: true });
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

  const fetchCodexModelIdentifier = async (): Promise<string> => {
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
        provider: string;
        models: Array<{ modelIdentifier: string }>;
      }>;
    }>(query, {
      runtimeKind: "codex_app_server",
    });

    for (const provider of result.availableLlmProvidersWithModels) {
      const model = provider.models[0];
      if (model?.modelIdentifier) {
        return model.modelIdentifier;
      }
    }
    throw new Error("No Codex runtime model was returned by availableLlmProvidersWithModels.");
  };

  const fetchPreferredCodexToolModelIdentifier = async (): Promise<string> => {
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
        provider: string;
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

  it("lists codex runtime models from app-server transport", async () => {
    const query = `
      query Models($runtimeKind: String) {
        availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
          provider
          models {
            modelIdentifier
            name
          }
        }
      }
    `;

    const result = await execGraphql<{
      availableLlmProvidersWithModels: Array<{
        provider: string;
        models: Array<{ modelIdentifier: string; name: string }>;
      }>;
    }>(query, {
      runtimeKind: "codex_app_server",
    });

    const modelCount = result.availableLlmProvidersWithModels.reduce(
      (total, provider) => total + provider.models.length,
      0,
    );
    expect(modelCount).toBeGreaterThan(0);
  });

  it("creates and continues a codex runtime run through GraphQL", async () => {
    const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();

    const sendMutation = `
      mutation SendAgentUserInput($input: SendAgentUserInputInput!) {
        sendAgentUserInput(input: $input) {
          success
          message
          agentRunId
        }
      }
    `;

    const sendResult = await execGraphql<{
      sendAgentUserInput: {
        success: boolean;
        message: string;
        agentRunId: string | null;
      };
    }>(sendMutation, {
      input: {
        runtimeKind: "codex_app_server",
        agentDefinitionId: "codex-e2e-agent-def",
        llmModelIdentifier: modelIdentifier,
        userInput: {
          content: "Reply with the single word READY.",
        },
      },
    });

    expect(sendResult.sendAgentUserInput.success).toBe(true);
    expect(sendResult.sendAgentUserInput.agentRunId).toBeTruthy();

    const terminateMutation = `
      mutation Terminate($id: String!) {
        terminateAgentRun(id: $id) {
          success
          message
        }
      }
    `;
    const terminateResult = await execGraphql<{
      terminateAgentRun: { success: boolean; message: string };
    }>(terminateMutation, {
      id: sendResult.sendAgentUserInput.agentRunId,
    });
    expect(terminateResult.terminateAgentRun.success).toBe(true);
  });

  it(
    "accepts image contextFiles from URL and absolute path and records both in Codex thread history",
    async () => {
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const mediaStorageService = getMediaStorageService();
      const relativeMediaPathFromUrl = `ingested_context/${randomUUID()}.png`;
      const expectedLocalImagePathFromUrl = path.resolve(
        path.join(mediaStorageService.getMediaRoot(), relativeMediaPathFromUrl),
      );
      await copyFile(imageInputFixturePath, expectedLocalImagePathFromUrl);
      const ingestedImageUrl = `http://localhost:8000/rest/files/${relativeMediaPathFromUrl}`;

      const relativeMediaPathFromPath = `ingested_context/${randomUUID()}.png`;
      const expectedLocalImagePathFromPath = path.resolve(
        path.join(mediaStorageService.getMediaRoot(), relativeMediaPathFromPath),
      );
      await copyFile(imageInputFixturePath, expectedLocalImagePathFromPath);

      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-image-input-e2e-"));
      const promptToken = `codex_image_input_${randomUUID().replace(/-/g, "_")}`;
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
      const resumeQuery = `
        query Resume($runId: String!) {
          getRunResumeConfig(runId: $runId) {
            runId
            manifestConfig {
              workspaceRootPath
              runtimeReference {
                threadId
              }
            }
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

      const asObject = (value: unknown): Record<string, unknown> | null =>
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : null;
      const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
      const asString = (value: unknown): string | null =>
        typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
      const toAbsoluteLocalPath = (value: string | null): string | null => {
        if (!value) {
          return null;
        }
        if (value.startsWith("file://")) {
          try {
            return path.resolve(fileURLToPath(value));
          } catch {
            return null;
          }
        }
        return path.resolve(value);
      };
      const extractTurns = (payload: Record<string, unknown>): Array<Record<string, unknown>> => {
        const thread = asObject(payload.thread);
        return asArray(thread?.turns ?? payload.turns)
          .map((turn) => asObject(turn))
          .filter((turn): turn is Record<string, unknown> => Boolean(turn));
      };
      const collectStrings = (value: unknown, depth = 0): string[] => {
        if (depth > 8 || value === null || value === undefined) {
          return [];
        }
        if (typeof value === "string") {
          const normalized = value.trim();
          return normalized ? [normalized] : [];
        }
        if (Array.isArray(value)) {
          return value.flatMap((item) => collectStrings(item, depth + 1));
        }
        const objectValue = asObject(value);
        if (!objectValue) {
          return [];
        }
        return Object.values(objectValue).flatMap((item) => collectStrings(item, depth + 1));
      };
      const hasImageReference = (
        allStrings: string[],
        options: { url?: string; relativePath: string; absolutePath: string },
      ): boolean =>
        allStrings.some((value) => {
          if (options.url && value === options.url) {
            return true;
          }
          if (value.includes(options.relativePath)) {
            return true;
          }
          return toAbsoluteLocalPath(asString(value)) === options.absolutePath;
        });
      const turnIncludesPromptAndBothImageReferences = (turn: Record<string, unknown>): boolean => {
        const allStrings = collectStrings(turn);
        const hasPromptToken = allStrings.some((value) => value.includes(promptToken));
        if (!hasPromptToken) {
          return false;
        }
        const hasUrlImageReference = hasImageReference(allStrings, {
          url: ingestedImageUrl,
          relativePath: relativeMediaPathFromUrl,
          absolutePath: expectedLocalImagePathFromUrl,
        });
        const hasPathImageReference = hasImageReference(allStrings, {
          relativePath: relativeMediaPathFromPath,
          absolutePath: expectedLocalImagePathFromPath,
        });
        return hasUrlImageReference && hasPathImageReference;
      };

      try {
        const continueResult = await execGraphql<{
          continueRun: {
            success: boolean;
            message: string;
            runId: string | null;
          };
        }>(continueMutation, {
          input: {
            runtimeKind: "codex_app_server",
            agentDefinitionId: "codex-e2e-agent-def",
            workspaceRootPath,
            llmModelIdentifier: modelIdentifier,
            userInput: {
              content: `Reply with READY. ${promptToken}`,
              contextFiles: [
                { path: ingestedImageUrl, type: "IMAGE" },
                { path: expectedLocalImagePathFromPath, type: "IMAGE" },
              ],
            },
          },
        });
        expect(continueResult.continueRun.success).toBe(true);
        expect(continueResult.continueRun.runId).toBeTruthy();
        runId = continueResult.continueRun.runId;

        const historyReader = getCodexThreadHistoryReader();
        const deadline = Date.now() + 60_000;
        let observedThreadId: string | null = null;
        let observedImageInputInThread = false;
        let observedTurnCount = 0;
        const debugStringSamples: string[] = [];

        while (Date.now() < deadline) {
          const resumeResult = await execGraphql<{
            getRunResumeConfig: {
              runId: string;
              manifestConfig: {
                workspaceRootPath: string;
                runtimeReference: {
                  threadId: string | null;
                };
              };
            };
          }>(resumeQuery, { runId });
          observedThreadId =
            resumeResult.getRunResumeConfig?.manifestConfig?.runtimeReference?.threadId ?? null;
          const runWorkspacePath =
            resumeResult.getRunResumeConfig?.manifestConfig?.workspaceRootPath ?? workspaceRootPath;

          if (observedThreadId) {
            const threadPayload = await historyReader.readThread(observedThreadId, runWorkspacePath);
            if (threadPayload) {
              const turns = extractTurns(threadPayload);
              observedTurnCount = turns.length;
              for (const turn of turns) {
                if (debugStringSamples.length >= 20) {
                  break;
                }
                for (const value of collectStrings(turn)) {
                  if (debugStringSamples.length >= 20) {
                    break;
                  }
                  if (!debugStringSamples.includes(value)) {
                    debugStringSamples.push(value);
                  }
                }
              }
              observedImageInputInThread = turns.some((turn) =>
                turnIncludesPromptAndBothImageReferences(turn),
              );
              if (observedImageInputInThread) {
                break;
              }
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 1_500));
        }

        expect(observedThreadId).toBeTruthy();
        if (!observedImageInputInThread) {
          throw new Error(
            `Did not observe both URL+path image inputs in thread history. turns=${String(observedTurnCount)} samples=${JSON.stringify(debugStringSamples)}`,
          );
        }
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
        await rm(expectedLocalImagePathFromUrl, { force: true });
        await rm(expectedLocalImagePathFromPath, { force: true });
        await rm(workspaceRootPath, { recursive: true, force: true });
      }
    },
    90000,
  );

  it(
    "restores a terminated codex run in the same workspace after continueRun",
    async () => {
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-continue-workspace-e2e-"));
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
    const resumeQuery = `
      query Resume($runId: String!) {
        getRunResumeConfig(runId: $runId) {
          runId
          isActive
          manifestConfig {
            runtimeKind
            workspaceRootPath
          }
        }
      }
    `;

      try {
        let createResult: {
          continueRun: {
            success: boolean;
            message: string;
            runId: string | null;
          };
        } | null = null;
        const createDeadline = Date.now() + 60_000;
        do {
          createResult = await execGraphql<{
            continueRun: {
              success: boolean;
              message: string;
              runId: string | null;
            };
          }>(continueMutation, {
            input: {
              runtimeKind: "codex_app_server",
              agentDefinitionId: "codex-e2e-agent-def",
              workspaceRootPath,
              llmModelIdentifier: modelIdentifier,
              userInput: {
                content: "Reply with READY.",
              },
            },
          });
          if (
            createResult.continueRun.success ||
            Date.now() >= createDeadline ||
            !isRetryableCodexBootstrapFailure(createResult.continueRun.message)
          ) {
            break;
          }
          await wait(2_000);
        } while (Date.now() < createDeadline);
        expect(createResult?.continueRun.success).toBe(true);
        expect(createResult?.continueRun.runId).toBeTruthy();
        runId = createResult?.continueRun.runId ?? null;

        const beforeTerminate = await execGraphql<{
          getRunResumeConfig: {
            runId: string;
            isActive: boolean;
            manifestConfig: {
              runtimeKind: string;
              workspaceRootPath: string;
            };
          };
        }>(resumeQuery, { runId });
        expect(beforeTerminate.getRunResumeConfig.runId).toBe(runId);
        expect(beforeTerminate.getRunResumeConfig.manifestConfig.runtimeKind).toBe("codex_app_server");
        expect(beforeTerminate.getRunResumeConfig.manifestConfig.workspaceRootPath).toBe(workspaceRootPath);

        const terminateResult = await execGraphql<{
          terminateAgentRun: { success: boolean; message: string };
        }>(terminateMutation, { id: runId });
        expect(terminateResult.terminateAgentRun.success).toBe(true);

        let continueResult: {
          continueRun: {
            success: boolean;
            message: string;
            runId: string | null;
          };
        } | null = null;
        const restoreDeadline = Date.now() + 60_000;
        do {
          continueResult = await execGraphql<{
            continueRun: {
              success: boolean;
              message: string;
              runId: string | null;
            };
          }>(continueMutation, {
            input: {
              runId,
              userInput: {
                content: "Reply with READY again.",
              },
            },
          });
          if (
            continueResult.continueRun.success ||
            Date.now() >= restoreDeadline ||
            !isRetryableCodexBootstrapFailure(continueResult.continueRun.message)
          ) {
            break;
          }
          await wait(2_000);
        } while (Date.now() < restoreDeadline);
        expect(continueResult?.continueRun.success).toBe(true);
        expect(continueResult?.continueRun.runId).toBe(runId);

        const afterContinue = await execGraphql<{
          getRunResumeConfig: {
            runId: string;
            isActive: boolean;
            manifestConfig: {
              runtimeKind: string;
              workspaceRootPath: string;
            };
          };
        }>(resumeQuery, { runId });
        expect(afterContinue.getRunResumeConfig.runId).toBe(runId);
        expect(afterContinue.getRunResumeConfig.manifestConfig.runtimeKind).toBe("codex_app_server");
        expect(afterContinue.getRunResumeConfig.manifestConfig.workspaceRootPath).toBe(workspaceRootPath);
      } finally {
        if (runId) {
          try {
            await execGraphql<{
              terminateAgentRun: { success: boolean };
            }>(terminateMutation, { id: runId });
          } catch {
            // best-effort cleanup
          }
        }
        await rm(workspaceRootPath, { recursive: true, force: true });
      }
    },
    90_000,
  );

  it(
    "preserves workspace mapping for codex runs created with workspaceId across send->terminate->continue",
    async () => {
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-workspaceid-continue-e2e-"));
      let runId: string | null = null;

      const createWorkspaceMutation = `
        mutation CreateWorkspace($input: CreateWorkspaceInput!) {
          createWorkspace(input: $input) {
            workspaceId
          }
        }
      `;
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
      const resumeQuery = `
        query Resume($runId: String!) {
          getRunResumeConfig(runId: $runId) {
            runId
            isActive
            manifestConfig {
              runtimeKind
              workspaceRootPath
            }
          }
        }
      `;
      const listRunHistoryQuery = `
        query ListRunHistory {
          listRunHistory(limitPerAgent: 200) {
            workspaceRootPath
            agents {
              runs {
                runId
              }
            }
          }
        }
      `;

      try {
        const createWorkspaceResult = await execGraphql<{
          createWorkspace: { workspaceId: string };
        }>(createWorkspaceMutation, {
          input: {
            rootPath: workspaceRootPath,
          },
        });
        const workspaceId = createWorkspaceResult.createWorkspace.workspaceId;
        expect(workspaceId).toBeTruthy();

        const createResult = await execGraphql<{
          continueRun: {
            success: boolean;
            message: string;
            runId: string | null;
          };
        }>(continueMutation, {
          input: {
            runtimeKind: "codex_app_server",
            agentDefinitionId: "codex-e2e-agent-def",
            workspaceId,
            llmModelIdentifier: modelIdentifier,
            userInput: {
              content: "Reply with READY.",
            },
          },
        });
        expect(createResult.continueRun.success).toBe(true);
        expect(createResult.continueRun.runId).toBeTruthy();
        runId = createResult.continueRun.runId;

        const beforeTerminateResume = await execGraphql<{
          getRunResumeConfig: {
            runId: string;
            isActive: boolean;
            manifestConfig: {
              runtimeKind: string;
              workspaceRootPath: string;
            };
          };
        }>(resumeQuery, { runId });
        expect(beforeTerminateResume.getRunResumeConfig.runId).toBe(runId);
        expect(beforeTerminateResume.getRunResumeConfig.manifestConfig.runtimeKind).toBe(
          "codex_app_server",
        );
        expect(beforeTerminateResume.getRunResumeConfig.manifestConfig.workspaceRootPath).toBe(
          workspaceRootPath,
        );

        const terminateResult = await execGraphql<{
          terminateAgentRun: { success: boolean; message: string };
        }>(terminateMutation, { id: runId });
        expect(terminateResult.terminateAgentRun.success).toBe(true);

        const historyDeadline = Date.now() + 120_000;
        let groupedInSelectedWorkspace = false;
        while (Date.now() < historyDeadline) {
          const historyResult = await execGraphql<{
            listRunHistory: Array<{
              workspaceRootPath: string;
              agents: Array<{ runs: Array<{ runId: string }> }>;
            }>;
          }>(listRunHistoryQuery);
          groupedInSelectedWorkspace = historyResult.listRunHistory.some(
            (workspaceGroup) =>
              workspaceGroup.workspaceRootPath === workspaceRootPath &&
              workspaceGroup.agents.some((agentGroup) =>
                agentGroup.runs.some((run) => run.runId === runId),
              ),
          );
          if (groupedInSelectedWorkspace) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 2_000));
        }
        expect(groupedInSelectedWorkspace).toBe(true);

        const continueResult = await execGraphql<{
          continueRun: {
            success: boolean;
            message: string;
            runId: string | null;
          };
        }>(continueMutation, {
          input: {
            runId,
            userInput: {
              content: "Reply with READY again.",
            },
          },
        });
        expect(continueResult.continueRun.success).toBe(true);
        expect(continueResult.continueRun.runId).toBe(runId);

        const resumeResult = await execGraphql<{
          getRunResumeConfig: {
            runId: string;
            isActive: boolean;
            manifestConfig: {
              runtimeKind: string;
              workspaceRootPath: string;
            };
          };
        }>(resumeQuery, { runId });
        expect(resumeResult.getRunResumeConfig.runId).toBe(runId);
        expect(resumeResult.getRunResumeConfig.manifestConfig.runtimeKind).toBe("codex_app_server");
        expect(resumeResult.getRunResumeConfig.manifestConfig.workspaceRootPath).toBe(workspaceRootPath);
      } finally {
        if (runId) {
          try {
            await execGraphql<{
              terminateAgentRun: { success: boolean };
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

  it(
    "returns non-empty run projection conversation for completed codex runs",
    async () => {
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();

      const continueMutation = `
        mutation ContinueRun($input: ContinueRunInput!) {
          continueRun(input: $input) {
            success
            message
            runId
          }
        }
      `;
      const projectionQuery = `
        query GetRunProjection($runId: String!) {
          getRunProjection(runId: $runId) {
            runId
            conversation
          }
          getRunResumeConfig(runId: $runId) {
            manifestConfig {
              runtimeReference {
                threadId
              }
            }
          }
        }
      `;
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-history-projection-e2e-"));

      let continueResult: {
        continueRun: {
          success: boolean;
          message: string;
          runId: string | null;
        };
      } | null = null;
      const bootstrapDeadline = Date.now() + 90_000;
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
            agentDefinitionId: "codex-e2e-agent-def",
            workspaceRootPath,
            llmModelIdentifier: modelIdentifier,
            userInput: {
              content: "Reply with one short sentence about Fibonacci numbers.",
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
      const runId = continueResult?.continueRun.runId as string;

      try {
        const deadline = Date.now() + 90_000;
        let projectionConversation: Array<Record<string, unknown>> = [];
        let threadId: string | null = null;

        while (Date.now() < deadline) {
          const projection = await execGraphql<{
            getRunProjection: {
              runId: string;
              conversation: Array<Record<string, unknown>>;
            };
            getRunResumeConfig: {
              manifestConfig: {
                runtimeReference: {
                  threadId: string | null;
                };
              };
            };
          }>(projectionQuery, { runId });

          projectionConversation = projection.getRunProjection.conversation ?? [];
          threadId = projection.getRunResumeConfig?.manifestConfig?.runtimeReference?.threadId ?? null;
          if (projectionConversation.length > 0) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1_500));
        }

        expect(threadId).toBeTruthy();
        expect(projectionConversation.length).toBeGreaterThan(0);
        expect(
          projectionConversation.some(
            (entry) =>
              entry &&
              typeof entry === "object" &&
              (entry as Record<string, unknown>).kind === "message" &&
              ((entry as Record<string, unknown>).role === "user" ||
                (entry as Record<string, unknown>).role === "assistant"),
          ),
        ).toBe(true);
      } finally {
        const terminateMutation = `
          mutation Terminate($id: String!) {
            terminateAgentRun(id: $id) {
              success
              message
            }
          }
        `;
        await execGraphql<{
          terminateAgentRun: { success: boolean; message: string };
        }>(terminateMutation, { id: runId });
        await rm(workspaceRootPath, { recursive: true, force: true });
      }
    },
    130000,
  );

  it(
    "streams real codex tool lifecycle events over websocket (auto-approves in test)",
    async () => {
    const previousApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
    const previousSandbox = process.env.CODEX_APP_SERVER_SANDBOX;
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "never";
    process.env.CODEX_APP_SERVER_SANDBOX = "workspace-write";

    const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();

    const sendMutation = `
      mutation SendAgentUserInput($input: SendAgentUserInputInput!) {
        sendAgentUserInput(input: $input) {
          success
          message
          agentRunId
        }
      }
    `;

    const warmupResult = await execGraphql<{
      sendAgentUserInput: {
        success: boolean;
        message: string;
        agentRunId: string | null;
      };
    }>(sendMutation, {
      input: {
        runtimeKind: "codex_app_server",
        agentDefinitionId: "codex-e2e-agent-def",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        userInput: {
          content: "Reply with READY.",
        },
      },
    });

    expect(warmupResult.sendAgentUserInput.success).toBe(true);
    expect(warmupResult.sendAgentUserInput.agentRunId).toBeTruthy();
    const runId = warmupResult.sendAgentUserInput.agentRunId as string;
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "codex-tool-lifecycle-e2e-"));
    const sourcePath = path.join(tempDir, "source.txt");
    const destinationPath = path.join(tempDir, "destination.txt");
    const expectedToken = `CODEX_TOOL_LIFECYCLE_E2E_${randomUUID()}`;
    await writeFile(sourcePath, `${expectedToken}\n`, "utf8");

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

    const seenEventTypes = new Set<string>();
    const seenSegmentTypes = new Set<string>();
    const seenToolNames = new Set<string>();
    const seenInvocationIds = new Set<string>();
    let sawConnected = false;
    let sentLifecyclePrompt = false;
    let sawToolStart = false;
    let sawToolTerminal = false;
    let sawToolLog = false;
    let promptAttemptCount = 0;
    const maxPromptAttempts = 4;

    const finished = new Promise<void>((resolve, reject) => {
      const copyCommand = `cat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'`;
      const buildLifecyclePrompt = (attempt: number): string => {
        if (attempt === 1) {
          return `Use the terminal tool to execute this command exactly once:\n${copyCommand}\nDo not simulate execution. After the command completes, respond with DONE.`;
        }
        return `Retry attempt ${attempt}: use the terminal tool to execute this exact command now and do not answer without executing it.\n${copyCommand}`;
      };
      let repromptTimer: ReturnType<typeof setTimeout> | null = null;
      const clearRepromptTimer = () => {
        if (repromptTimer) {
          clearTimeout(repromptTimer);
          repromptTimer = null;
        }
      };
      const sendLifecyclePrompt = () => {
        if (promptAttemptCount >= maxPromptAttempts) {
          return;
        }
        promptAttemptCount += 1;
        sentLifecyclePrompt = true;
        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: { content: buildLifecyclePrompt(promptAttemptCount) },
          }),
        );
        clearRepromptTimer();
        repromptTimer = setTimeout(() => {
          if (!sawToolStart && promptAttemptCount < maxPromptAttempts) {
            sendLifecyclePrompt();
          }
        }, 15_000);
      };

      const fallbackSendTimer = setTimeout(() => {
        if (!sentLifecyclePrompt) {
          sendLifecyclePrompt();
        }
      }, 5000);
      const timeout = setTimeout(() => {
        reject(
          new Error(
              `Timed out waiting for tool lifecycle events. promptSent=${String(sentLifecyclePrompt)}. Seen types: ${Array.from(seenEventTypes).join(", ")}. Segment types: ${Array.from(seenSegmentTypes).join(", ")}`,
            ),
          );
        }, 90000);

      socket.on("message", (raw) => {
        const message = JSON.parse(raw.toString()) as {
          type: string;
          payload?: Record<string, unknown>;
        };
        seenEventTypes.add(message.type);
        const segmentType =
          typeof message.payload?.segment_type === "string" ? message.payload.segment_type : null;
        if (segmentType) {
          seenSegmentTypes.add(segmentType);
        }

        if (message.type === "CONNECTED") {
          sawConnected = true;
          return;
        }

        if (message.type === "AGENT_STATUS") {
          const status = message.payload?.new_status;
          if (status === "IDLE" && !sentLifecyclePrompt) {
            sendLifecyclePrompt();
            return;
          }
          if (
            status === "IDLE" &&
            sentLifecyclePrompt &&
            !sawToolStart &&
            promptAttemptCount < maxPromptAttempts
          ) {
            sendLifecyclePrompt();
          }
          return;
        }

        if (message.type === "TOOL_APPROVAL_REQUESTED") {
          const invocationId =
            (message.payload?.invocation_id as string | undefined) ??
            (message.payload?.tool_invocation_id as string | undefined);
          if (invocationId) {
            seenInvocationIds.add(invocationId);
            socket.send(
              JSON.stringify({
                type: "APPROVE_TOOL",
                payload: { invocation_id: invocationId, reason: "e2e-auto-approve" },
              }),
            );
          }
          return;
        }

        if (message.type === "TOOL_EXECUTION_STARTED") {
          sawToolStart = true;
          const invocationId = message.payload?.invocation_id as string | undefined;
          const toolName = message.payload?.tool_name as string | undefined;
          if (invocationId) {
            seenInvocationIds.add(invocationId);
          }
          if (toolName) {
            seenToolNames.add(toolName);
          }
          return;
        }

        if (message.type === "TOOL_LOG") {
          sawToolLog = true;
          const invocationId = message.payload?.tool_invocation_id as string | undefined;
          const toolName = message.payload?.tool_name as string | undefined;
          if (invocationId) {
            seenInvocationIds.add(invocationId);
          }
          if (toolName) {
            seenToolNames.add(toolName);
          }
          return;
        }

        if (
          message.type === "SEGMENT_START" &&
          (segmentType === "run_bash" || segmentType === "edit_file")
        ) {
          sawToolStart = true;
          const invocationId = message.payload?.id as string | undefined;
          if (invocationId) {
            seenInvocationIds.add(invocationId);
          }
          seenToolNames.add(segmentType);
          return;
        }

        if (
          message.type === "SEGMENT_CONTENT" &&
          (segmentType === "run_bash" || segmentType === "edit_file")
        ) {
          sawToolLog = true;
          const invocationId = message.payload?.id as string | undefined;
          if (invocationId) {
            seenInvocationIds.add(invocationId);
          }
          seenToolNames.add(segmentType);
          return;
        }

        if (message.type === "SEGMENT_END") {
          const invocationId = message.payload?.id as string | undefined;
          const matchesKnownToolInvocation =
            typeof invocationId === "string" && seenInvocationIds.has(invocationId);
          if (
            segmentType === "run_bash" ||
            segmentType === "edit_file" ||
            matchesKnownToolInvocation
          ) {
            sawToolTerminal = true;
            if (invocationId) {
              seenInvocationIds.add(invocationId);
            }
            if (segmentType === "run_bash" || segmentType === "edit_file") {
              seenToolNames.add(segmentType);
            }
          }
        }

        if (
          message.type === "TOOL_EXECUTION_SUCCEEDED" ||
          message.type === "TOOL_EXECUTION_FAILED" ||
          message.type === "TOOL_DENIED"
        ) {
          sawToolTerminal = true;
          const invocationId = message.payload?.invocation_id as string | undefined;
          const toolName = message.payload?.tool_name as string | undefined;
          if (invocationId) {
            seenInvocationIds.add(invocationId);
          }
          if (toolName) {
            seenToolNames.add(toolName);
          }
        }

        if (sentLifecyclePrompt && sawConnected && sawToolStart && sawToolTerminal) {
          clearTimeout(fallbackSendTimer);
          clearTimeout(timeout);
          clearRepromptTimer();
          resolve();
        }
      });

      socket.once("error", (error) => {
        clearTimeout(fallbackSendTimer);
        clearTimeout(timeout);
        clearRepromptTimer();
        reject(error);
      });
    });

    await waitForSocketOpen(socket);
    sawConnected = true;

    try {
      await finished;
      const copiedContent = await readFile(destinationPath, "utf8");
      expect(copiedContent.trim()).toBe(expectedToken);
      expect(sawConnected).toBe(true);
      expect(sawToolStart).toBe(true);
      expect(sawToolTerminal).toBe(true);
      expect(seenInvocationIds.size).toBeGreaterThan(0);
      expect(
        seenToolNames.size > 0 || seenSegmentTypes.has("run_bash") || seenSegmentTypes.has("edit_file"),
      ).toBe(true);
      // TOOL_LOG is optional depending on transport/tool behavior, but usually present for command execution.
      expect(
        sawToolLog ||
          seenSegmentTypes.has("run_bash") ||
          seenEventTypes.has("TOOL_EXECUTION_SUCCEEDED") ||
          seenEventTypes.has("TOOL_EXECUTION_FAILED"),
      ).toBe(true);
    } finally {
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = previousApprovalPolicy;
      process.env.CODEX_APP_SERVER_SANDBOX = previousSandbox;
      socket.close();
      await app.close();
      await rm(tempDir, { recursive: true, force: true });
      const terminateMutation = `
        mutation Terminate($id: String!) {
          terminateAgentRun(id: $id) {
            success
            message
          }
        }
      `;
      await execGraphql<{
        terminateAgentRun: { success: boolean; message: string };
      }>(terminateMutation, { id: runId });
    }
    },
    120000,
  );

  it(
    "streams codex edit_file metadata with non-empty path and patch over websocket",
    async () => {
      const previousApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
      const previousSandbox = process.env.CODEX_APP_SERVER_SANDBOX;
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "never";
      process.env.CODEX_APP_SERVER_SANDBOX = "workspace-write";

      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const fileToken = `codex_edit_file_${randomUUID().replace(/-/g, "_")}.py`;

      const sendMutation = `
        mutation SendAgentUserInput($input: SendAgentUserInputInput!) {
          sendAgentUserInput(input: $input) {
            success
            message
            agentRunId
          }
        }
      `;

      const warmupResult = await execGraphql<{
        sendAgentUserInput: {
          success: boolean;
          message: string;
          agentRunId: string | null;
        };
      }>(sendMutation, {
        input: {
          runtimeKind: "codex_app_server",
          agentDefinitionId: "codex-e2e-agent-def",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: true,
          userInput: {
            content: "Reply with READY.",
          },
        },
      });

      expect(warmupResult.sendAgentUserInput.success).toBe(true);
      expect(warmupResult.sendAgentUserInput.agentRunId).toBeTruthy();
      const runId = warmupResult.sendAgentUserInput.agentRunId as string;

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

      const seenEventTypes = new Set<string>();
      const seenSegmentSnapshots: Array<Record<string, unknown>> = [];
      let sentPrompt = false;
      let sawEditFilePath = false;
      let sawEditFilePatch = false;
      let promptAttemptCount = 0;
      const maxPromptAttempts = 5;

      const finished = new Promise<void>((resolve, reject) => {
        const prompt = `Use the edit_file tool (do not use run_bash) to create a Python file named ${fileToken} in the current workspace. The file must define fibonacci(n) and print fibonacci(10). Actually write the file, then respond DONE.`;
        let resolved = false;
        let repromptTimer: ReturnType<typeof setTimeout> | null = null;
        const clearRepromptTimer = () => {
          if (repromptTimer) {
            clearTimeout(repromptTimer);
            repromptTimer = null;
          }
        };
        const sendPrompt = () => {
          if (promptAttemptCount >= maxPromptAttempts) {
            return;
          }
          promptAttemptCount += 1;
          sentPrompt = true;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: { content: prompt },
            }),
          );
          clearRepromptTimer();
          repromptTimer = setTimeout(() => {
            if (!sawEditFilePath && !sawEditFilePatch && promptAttemptCount < maxPromptAttempts) {
              sendPrompt();
            }
          }, 20_000);
        };

        const fallbackSendTimer = setTimeout(() => {
          if (!sentPrompt) {
            sendPrompt();
          }
        }, 5000);
        const timeout = setTimeout(() => {
          clearRepromptTimer();
          reject(
            new Error(
              `Timed out waiting for edit_file metadata. promptSent=${String(sentPrompt)} pathSeen=${String(sawEditFilePath)} patchSeen=${String(sawEditFilePatch)} seenTypes=${Array.from(seenEventTypes).join(", ")} segmentSnapshots=${JSON.stringify(seenSegmentSnapshots)}`,
            ),
          );
        }, 110000);
        const resolveWhenReady = () => {
          if (resolved || !sawEditFilePath || !sawEditFilePatch) {
            return;
          }
          resolved = true;
          clearTimeout(fallbackSendTimer);
          clearTimeout(timeout);
          clearRepromptTimer();
          resolve();
        };

        socket.on("message", (raw) => {
          const message = JSON.parse(raw.toString()) as {
            type: string;
            payload?: Record<string, unknown>;
          };
          seenEventTypes.add(message.type);

          if (message.type === "AGENT_STATUS") {
            const status = message.payload?.new_status;
            if (status === "IDLE" && !sentPrompt) {
              sendPrompt();
              return;
            }
            if (status === "IDLE" && sentPrompt) {
              resolveWhenReady();
              if (!sawEditFilePath && !sawEditFilePatch && promptAttemptCount < maxPromptAttempts) {
                sendPrompt();
              }
            }
            return;
          }

          if (message.type !== "SEGMENT_START" && message.type !== "SEGMENT_END") {
            return;
          }

          const segmentType =
            typeof message.payload?.segment_type === "string" ? message.payload.segment_type : null;
          const metadata =
            message.payload?.metadata && typeof message.payload.metadata === "object"
              ? (message.payload.metadata as Record<string, unknown>)
              : null;
          const payloadPath =
            typeof message.payload?.path === "string" ? (message.payload.path as string).trim() : "";
          const payloadPatch =
            typeof message.payload?.patch === "string"
              ? (message.payload.patch as string).trim()
              : typeof message.payload?.diff === "string"
                ? (message.payload.diff as string).trim()
                : "";

          if (seenSegmentSnapshots.length < 20) {
            seenSegmentSnapshots.push({
              type: message.type,
              segmentType,
              id: typeof message.payload?.id === "string" ? message.payload.id : null,
              runtimeEventMethod:
                typeof message.payload?.runtime_event_method === "string"
                  ? message.payload.runtime_event_method
                  : null,
              payloadPath: payloadPath.length > 0 ? payloadPath : null,
              payloadPatchPreview: payloadPatch.length > 0 ? payloadPatch.slice(0, 80) : null,
              metadataToolName:
                typeof metadata?.tool_name === "string" ? metadata.tool_name : null,
              metadataPath:
                typeof metadata?.path === "string" ? (metadata.path as string).trim() : null,
              metadataPatchPreview:
                typeof metadata?.patch === "string" ? (metadata.patch as string).trim().slice(0, 80) : null,
            });
          }

          const hasEditMarker =
            segmentType === "edit_file" ||
            (typeof metadata?.tool_name === "string" && metadata.tool_name === "edit_file");
          if (!hasEditMarker || !metadata) {
            return;
          }

          const pathValue =
            typeof metadata.path === "string"
              ? metadata.path.trim()
              : payloadPath;
          const patchValue =
            typeof metadata.patch === "string"
              ? metadata.patch.trim()
              : payloadPatch;
          if (pathValue.length > 0) {
            sawEditFilePath = true;
          }
          if (patchValue.length > 0) {
            sawEditFilePatch = true;
          }
          if (sawEditFilePath || sawEditFilePatch) {
            clearRepromptTimer();
          }
          resolveWhenReady();
        });

        socket.once("error", (error) => {
          clearTimeout(fallbackSendTimer);
          clearTimeout(timeout);
          clearRepromptTimer();
          reject(error);
        });
      });

      await waitForSocketOpen(socket);

      try {
        await finished;
        expect(sawEditFilePath).toBe(true);
        expect(sawEditFilePatch).toBe(true);
      } finally {
        process.env.CODEX_APP_SERVER_APPROVAL_POLICY = previousApprovalPolicy;
        process.env.CODEX_APP_SERVER_SANDBOX = previousSandbox;
        socket.close();
        await app.close();
        const terminateMutation = `
          mutation Terminate($id: String!) {
            terminateAgentRun(id: $id) {
              success
              message
            }
          }
        `;
        await execGraphql<{
          terminateAgentRun: { success: boolean; message: string };
        }>(terminateMutation, { id: runId });
      }
    },
    60000,
  );

  it(
    "streams codex run_bash metadata with non-empty command over websocket",
    async () => {
      const previousApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
      const previousSandbox = process.env.CODEX_APP_SERVER_SANDBOX;
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "never";
      process.env.CODEX_APP_SERVER_SANDBOX = "workspace-write";

      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const outputToken = `run_bash_meta_${randomUUID().replace(/-/g, "_")}.txt`;

      const sendMutation = `
        mutation SendAgentUserInput($input: SendAgentUserInputInput!) {
          sendAgentUserInput(input: $input) {
            success
            message
            agentRunId
          }
        }
      `;

      const warmupResult = await execGraphql<{
        sendAgentUserInput: {
          success: boolean;
          message: string;
          agentRunId: string | null;
        };
      }>(sendMutation, {
        input: {
          runtimeKind: "codex_app_server",
          agentDefinitionId: "codex-e2e-agent-def",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: true,
          userInput: {
            content: "Reply with READY.",
          },
        },
      });

      expect(warmupResult.sendAgentUserInput.success).toBe(true);
      expect(warmupResult.sendAgentUserInput.agentRunId).toBeTruthy();
      const runId = warmupResult.sendAgentUserInput.agentRunId as string;

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

      const seenEventTypes = new Set<string>();
      const seenSegmentSnapshots: Array<Record<string, unknown>> = [];
      let sentPrompt = false;
      let sawRunBashCommand = false;
      let promptAttemptCount = 0;
      const maxPromptAttempts = 3;

      const finished = new Promise<void>((resolve, reject) => {
        const buildPrompt = (attempt: number): string => {
          if (attempt === 1) {
            return `Use the terminal tool exactly once to run this command: printf '${outputToken}\\n' > '${outputToken}' && cat '${outputToken}'. Do not use edit_file. Do not simulate execution.`;
          }
          return `Retry attempt ${attempt}: use the terminal tool now and run exactly this command once: printf '${outputToken}\\n' > '${outputToken}' && cat '${outputToken}'. Do not answer without executing it.`;
        };
        let repromptTimer: ReturnType<typeof setTimeout> | null = null;
        const clearRepromptTimer = () => {
          if (repromptTimer) {
            clearTimeout(repromptTimer);
            repromptTimer = null;
          }
        };
        const sendPrompt = () => {
          if (promptAttemptCount >= maxPromptAttempts) {
            return;
          }
          promptAttemptCount += 1;
          sentPrompt = true;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: { content: buildPrompt(promptAttemptCount) },
            }),
          );
          clearRepromptTimer();
          repromptTimer = setTimeout(() => {
            if (!sawRunBashCommand && promptAttemptCount < maxPromptAttempts) {
              sendPrompt();
            }
          }, 12_000);
        };

        const fallbackSendTimer = setTimeout(() => {
          if (!sentPrompt) {
            sendPrompt();
          }
        }, 5000);
        const timeout = setTimeout(() => {
          clearRepromptTimer();
          reject(
            new Error(
              `Timed out waiting for run_bash metadata command. promptSent=${String(sentPrompt)} promptAttempts=${String(promptAttemptCount)} commandSeen=${String(sawRunBashCommand)} seenTypes=${Array.from(seenEventTypes).join(", ")} segmentSnapshots=${JSON.stringify(seenSegmentSnapshots)}`,
            ),
          );
        }, 90000);

        socket.on("message", (raw) => {
          const message = JSON.parse(raw.toString()) as {
            type: string;
            payload?: Record<string, unknown>;
          };
          seenEventTypes.add(message.type);

          if (message.type === "AGENT_STATUS") {
            const status = message.payload?.new_status;
            if (status === "IDLE" && !sentPrompt) {
              sendPrompt();
              return;
            }
            if (status === "IDLE" && sentPrompt && sawRunBashCommand) {
              clearTimeout(fallbackSendTimer);
              clearTimeout(timeout);
              clearRepromptTimer();
              resolve();
              return;
            }
            if (status === "IDLE" && sentPrompt && !sawRunBashCommand && promptAttemptCount < maxPromptAttempts) {
              sendPrompt();
            }
            return;
          }

          if (message.type !== "SEGMENT_START" && message.type !== "SEGMENT_END") {
            return;
          }

          const segmentType =
            typeof message.payload?.segment_type === "string" ? message.payload.segment_type : null;
          const metadata =
            message.payload?.metadata && typeof message.payload.metadata === "object"
              ? (message.payload.metadata as Record<string, unknown>)
              : null;
          const payloadCommand =
            typeof message.payload?.command === "string" ? (message.payload.command as string).trim() : "";
          const metadataCommand =
            typeof metadata?.command === "string" ? (metadata.command as string).trim() : "";

          if (seenSegmentSnapshots.length < 20) {
            seenSegmentSnapshots.push({
              type: message.type,
              segmentType,
              id: typeof message.payload?.id === "string" ? message.payload.id : null,
              runtimeEventMethod:
                typeof message.payload?.runtime_event_method === "string"
                  ? message.payload.runtime_event_method
                  : null,
              payloadCommand: payloadCommand.length > 0 ? payloadCommand : null,
              metadataToolName:
                typeof metadata?.tool_name === "string" ? metadata.tool_name : null,
              metadataCommand: metadataCommand.length > 0 ? metadataCommand : null,
            });
          }

          const hasRunBashMarker =
            segmentType === "run_bash" ||
            (typeof metadata?.tool_name === "string" && metadata.tool_name === "run_bash");
          if (!hasRunBashMarker) {
            return;
          }

          if (metadataCommand.length > 0 || payloadCommand.length > 0) {
            sawRunBashCommand = true;
            clearRepromptTimer();
          }
        });

        socket.once("error", (error) => {
          clearTimeout(fallbackSendTimer);
          clearTimeout(timeout);
          clearRepromptTimer();
          reject(error);
        });
      });

      await waitForSocketOpen(socket);

      try {
        await finished;
        expect(sawRunBashCommand).toBe(true);
      } finally {
        process.env.CODEX_APP_SERVER_APPROVAL_POLICY = previousApprovalPolicy;
        process.env.CODEX_APP_SERVER_SANDBOX = previousSandbox;
        socket.close();
        await app.close();
        const terminateMutation = `
          mutation Terminate($id: String!) {
            terminateAgentRun(id: $id) {
              success
              message
            }
          }
        `;
        await execGraphql<{
          terminateAgentRun: { success: boolean; message: string };
        }>(terminateMutation, { id: runId });
      }
    },
    105000,
  );

  it(
    "streams codex generate_image tool_call metadata with non-empty arguments over websocket",
    async () => {
      const previousApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
      const previousSandbox = process.env.CODEX_APP_SERVER_SANDBOX;
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "never";
      process.env.CODEX_APP_SERVER_SANDBOX = "workspace-write";

      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const imageToken = `generate_image_meta_${randomUUID().replace(/-/g, "_")}`;
      const outputFilePath = `/tmp/${imageToken}.png`;

      const sendMutation = `
        mutation SendAgentUserInput($input: SendAgentUserInputInput!) {
          sendAgentUserInput(input: $input) {
            success
            message
            agentRunId
          }
        }
      `;

      const warmupResult = await execGraphql<{
        sendAgentUserInput: {
          success: boolean;
          message: string;
          agentRunId: string | null;
        };
      }>(sendMutation, {
        input: {
          runtimeKind: "codex_app_server",
          agentDefinitionId: "codex-e2e-agent-def",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: true,
          userInput: {
            content: "Reply with READY.",
          },
        },
      });

      expect(warmupResult.sendAgentUserInput.success).toBe(true);
      expect(warmupResult.sendAgentUserInput.agentRunId).toBeTruthy();
      const runId = warmupResult.sendAgentUserInput.agentRunId as string;

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

      const seenEventTypes = new Set<string>();
      const seenSegmentSnapshots: Array<Record<string, unknown>> = [];
      let sentPrompt = false;
      let sawGenerateImageArguments = false;
      let promptAttemptCount = 0;
      const maxPromptAttempts = 6;

      const finished = new Promise<void>((resolve, reject) => {
        const buildPrompt = (attempt: number): string => {
          if (attempt === 1) {
            return `Call the generate_image tool exactly once using these exact JSON arguments: {"prompt":"cute sea animal ${imageToken}","output_file_path":"${outputFilePath}"}. Do not call run_bash or edit_file. Do not simulate tool output.`;
          }
          return `Retry attempt ${attempt}: you must call generate_image now with exact JSON arguments {"prompt":"cute sea animal ${imageToken}","output_file_path":"${outputFilePath}"} and nothing else.`;
        };
        let resolved = false;
        let repromptTimer: ReturnType<typeof setTimeout> | null = null;
        const clearRepromptTimer = () => {
          if (repromptTimer) {
            clearTimeout(repromptTimer);
            repromptTimer = null;
          }
        };

        const resolveIfComplete = () => {
          if (!resolved && sawGenerateImageArguments) {
            resolved = true;
            clearTimeout(fallbackSendTimer);
            clearTimeout(timeout);
            clearRepromptTimer();
            resolve();
          }
        };

        const sendPrompt = () => {
          if (promptAttemptCount >= maxPromptAttempts) {
            return;
          }
          promptAttemptCount += 1;
          sentPrompt = true;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: { content: buildPrompt(promptAttemptCount) },
            }),
          );
          clearRepromptTimer();
          repromptTimer = setTimeout(() => {
            if (!sawGenerateImageArguments && promptAttemptCount < maxPromptAttempts) {
              sendPrompt();
            }
          }, 15_000);
        };

        const fallbackSendTimer = setTimeout(() => {
          if (!sentPrompt) {
            sendPrompt();
          }
        }, 5000);
        const timeout = setTimeout(() => {
          clearRepromptTimer();
          reject(
            new Error(
              `Timed out waiting for generate_image metadata arguments. promptSent=${String(sentPrompt)} promptAttempts=${String(promptAttemptCount)} argumentsSeen=${String(sawGenerateImageArguments)} seenTypes=${Array.from(seenEventTypes).join(", ")} segmentSnapshots=${JSON.stringify(seenSegmentSnapshots)}`,
            ),
          );
        }, 100000);

        socket.on("message", (raw) => {
          const message = JSON.parse(raw.toString()) as {
            type: string;
            payload?: Record<string, unknown>;
          };
          seenEventTypes.add(message.type);

          if (message.type === "AGENT_STATUS") {
            const status = message.payload?.new_status;
            if (status === "IDLE" && !sentPrompt) {
              sendPrompt();
              return;
            }
            if (status === "IDLE" && sentPrompt && sawGenerateImageArguments) {
              resolveIfComplete();
              return;
            }
            if (
              status === "IDLE" &&
              sentPrompt &&
              !sawGenerateImageArguments &&
              promptAttemptCount < maxPromptAttempts
            ) {
              sendPrompt();
            }
            return;
          }

          const segmentType =
            typeof message.payload?.segment_type === "string" ? message.payload.segment_type : null;
          const metadata =
            message.payload?.metadata && typeof message.payload.metadata === "object"
              ? (message.payload.metadata as Record<string, unknown>)
              : null;
          const metadataToolName =
            typeof metadata?.tool_name === "string" ? String(metadata.tool_name) : "";
          const payloadArguments =
            message.payload?.arguments && typeof message.payload.arguments === "object"
              ? (message.payload.arguments as Record<string, unknown>)
              : null;
          const metadataArguments =
            metadata?.arguments && typeof metadata.arguments === "object"
              ? (metadata.arguments as Record<string, unknown>)
              : null;
          const rawRuntimePayload =
            message.payload?.payload && typeof message.payload.payload === "object"
              ? (message.payload.payload as Record<string, unknown>)
              : null;
          const rawMsg =
            rawRuntimePayload?.msg && typeof rawRuntimePayload.msg === "object"
              ? (rawRuntimePayload.msg as Record<string, unknown>)
              : null;
          const rawInvocation =
            rawMsg?.invocation && typeof rawMsg.invocation === "object"
              ? (rawMsg.invocation as Record<string, unknown>)
              : null;
          const rawInvocationArguments =
            rawInvocation?.arguments && typeof rawInvocation.arguments === "object"
              ? (rawInvocation.arguments as Record<string, unknown>)
              : null;
          const rawInvocationToolName =
            typeof rawInvocation?.tool === "string" ? String(rawInvocation.tool) : "";
          const candidateArguments = metadataArguments ?? payloadArguments ?? rawInvocationArguments;
          const promptArg =
            candidateArguments && typeof candidateArguments.prompt === "string"
              ? String(candidateArguments.prompt)
              : null;
          const outputPathArg =
            candidateArguments && typeof candidateArguments.output_file_path === "string"
              ? String(candidateArguments.output_file_path)
              : null;

          seenSegmentSnapshots.push({
            messageType: message.type,
            segmentType,
            metadataToolName: metadataToolName || rawInvocationToolName || null,
            hasMetadataArguments: Boolean(metadataArguments),
            hasRawInvocationArguments: Boolean(rawInvocationArguments),
            promptArgPreview: promptArg?.slice(0, 64) ?? null,
            outputPathArg: outputPathArg ?? null,
          });

          const isGenerateImageTool =
            metadataToolName === "generate_image" ||
            metadataToolName.endsWith(".generate_image") ||
            rawInvocationToolName === "generate_image" ||
            rawInvocationToolName.endsWith(".generate_image");
          if (!isGenerateImageTool) {
            return;
          }

          if (
            promptArg &&
            promptArg.includes(imageToken) &&
            outputPathArg &&
            outputPathArg.length > 0
          ) {
            sawGenerateImageArguments = true;
            clearRepromptTimer();
            resolveIfComplete();
          }
        });

        socket.once("error", (error) => {
          clearTimeout(fallbackSendTimer);
          clearTimeout(timeout);
          clearRepromptTimer();
          reject(error);
        });
      });

      await waitForSocketOpen(socket);

      try {
        await finished;
        expect(sawGenerateImageArguments).toBe(true);
      } finally {
        process.env.CODEX_APP_SERVER_APPROVAL_POLICY = previousApprovalPolicy;
        process.env.CODEX_APP_SERVER_SANDBOX = previousSandbox;
        socket.close();
        await app.close();
        const terminateMutation = `
          mutation Terminate($id: String!) {
            terminateAgentRun(id: $id) {
              success
              message
            }
          }
        `;
        await execGraphql<{
          terminateAgentRun: { success: boolean; message: string };
        }>(terminateMutation, { id: runId });
      }
    },
    140000,
  );

  it(
    "streams codex tool approval requested and approved lifecycle over websocket",
    async () => {
      const previousApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
      const previousSandbox = process.env.CODEX_APP_SERVER_SANDBOX;
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "on-request";
      process.env.CODEX_APP_SERVER_SANDBOX = "workspace-write";

      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();

      const sendMutation = `
        mutation SendAgentUserInput($input: SendAgentUserInputInput!) {
          sendAgentUserInput(input: $input) {
            success
            message
            agentRunId
          }
        }
      `;

      const warmupResult = await execGraphql<{
        sendAgentUserInput: {
          success: boolean;
          message: string;
          agentRunId: string | null;
        };
      }>(sendMutation, {
        input: {
          runtimeKind: "codex_app_server",
          agentDefinitionId: "codex-e2e-agent-def",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: false,
          userInput: {
            content: "Reply with READY.",
          },
        },
      });

      expect(warmupResult.sendAgentUserInput.success).toBe(true);
      expect(warmupResult.sendAgentUserInput.agentRunId).toBeTruthy();
      const runId = warmupResult.sendAgentUserInput.agentRunId as string;
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "codex-tool-approval-e2e-"));
      const sourcePath = path.join(tempDir, "source.txt");
      const destinationPath = path.join(tempDir, "destination.txt");
      const expectedToken = `CODEX_TOOL_APPROVAL_E2E_${randomUUID()}`;
      await writeFile(sourcePath, `${expectedToken}\n`, "utf8");

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

      const seenEventTypes = new Set<string>();
      const seenSegmentTypes = new Set<string>();
      const seenToolNames = new Set<string>();
      const seenInvocationIds = new Set<string>();
      let sawConnected = false;
      let sentApprovalPrompt = false;
      let sawApprovalRequested = false;
      let sentApprovalDecision = false;
      let sawToolApproved = false;
      let sawToolStart = false;
      let sawToolTerminal = false;
      let sawToolDenied = false;
      let promptAttemptCount = 0;
      const maxPromptAttempts = 4;

      const finished = new Promise<void>((resolve, reject) => {
        const copyCommand = `cat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'`;
        const buildApprovalPrompt = (attempt: number): string => {
          if (attempt === 1) {
            return `Use the terminal tool to execute this command exactly once:\n${copyCommand}\nThis command should require approval first. Do not simulate execution.`;
          }
          return `Retry attempt ${attempt}: request approval for this exact terminal command and do not answer without requesting approval first.\n${copyCommand}`;
        };
        let repromptTimer: ReturnType<typeof setTimeout> | null = null;
        const clearRepromptTimer = () => {
          if (repromptTimer) {
            clearTimeout(repromptTimer);
            repromptTimer = null;
          }
        };
        const sendApprovalPrompt = () => {
          if (promptAttemptCount >= maxPromptAttempts) {
            return;
          }
          promptAttemptCount += 1;
          sentApprovalPrompt = true;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: { content: buildApprovalPrompt(promptAttemptCount) },
            }),
          );
          clearRepromptTimer();
          repromptTimer = setTimeout(() => {
            if (!sawApprovalRequested && promptAttemptCount < maxPromptAttempts) {
              sendApprovalPrompt();
            }
          }, 15_000);
        };

        const fallbackSendTimer = setTimeout(() => {
          if (!sentApprovalPrompt) {
            sendApprovalPrompt();
          }
        }, 5000);
        const timeout = setTimeout(() => {
          reject(
            new Error(
              `Timed out waiting for approval lifecycle. promptSent=${String(sentApprovalPrompt)} approvalRequested=${String(sawApprovalRequested)} approvalSent=${String(sentApprovalDecision)}. Seen types: ${Array.from(seenEventTypes).join(", ")}. Segment types: ${Array.from(seenSegmentTypes).join(", ")}`,
            ),
          );
        }, 90000);

        socket.on("message", (raw) => {
          const message = JSON.parse(raw.toString()) as {
            type: string;
            payload?: Record<string, unknown>;
          };
          seenEventTypes.add(message.type);
          const segmentType =
            typeof message.payload?.segment_type === "string" ? message.payload.segment_type : null;
          if (segmentType) {
            seenSegmentTypes.add(segmentType);
          }

          if (message.type === "CONNECTED") {
            sawConnected = true;
            return;
          }

          if (message.type === "AGENT_STATUS") {
            const status = message.payload?.new_status;
            if (status === "IDLE" && !sentApprovalPrompt) {
              sendApprovalPrompt();
              return;
            }
            if (
              status === "IDLE" &&
              sentApprovalPrompt &&
              !sawApprovalRequested &&
              promptAttemptCount < maxPromptAttempts
            ) {
              sendApprovalPrompt();
            }
            return;
          }

          if (message.type === "TOOL_APPROVAL_REQUESTED") {
            sawApprovalRequested = true;
            clearRepromptTimer();
            const invocationId =
              (message.payload?.invocation_id as string | undefined) ??
              (message.payload?.tool_invocation_id as string | undefined);
            const toolName = message.payload?.tool_name as string | undefined;
            if (invocationId) {
              seenInvocationIds.add(invocationId);
              sentApprovalDecision = true;
              socket.send(
                JSON.stringify({
                  type: "APPROVE_TOOL",
                  payload: { invocation_id: invocationId, reason: "e2e-manual-approval" },
                }),
              );
            }
            if (toolName) {
              seenToolNames.add(toolName);
            }
            return;
          }

          if (message.type === "TOOL_APPROVED") {
            sawToolApproved = true;
            const invocationId = message.payload?.invocation_id as string | undefined;
            const toolName = message.payload?.tool_name as string | undefined;
            if (invocationId) {
              seenInvocationIds.add(invocationId);
            }
            if (toolName) {
              seenToolNames.add(toolName);
            }
            return;
          }

          if (message.type === "TOOL_EXECUTION_STARTED") {
            sawToolStart = true;
            const invocationId = message.payload?.invocation_id as string | undefined;
            const toolName = message.payload?.tool_name as string | undefined;
            if (invocationId) {
              seenInvocationIds.add(invocationId);
            }
            if (toolName) {
              seenToolNames.add(toolName);
            }
            return;
          }

          if (
            message.type === "SEGMENT_START" &&
            (segmentType === "run_bash" || segmentType === "edit_file")
          ) {
            sawToolStart = true;
            const invocationId = message.payload?.id as string | undefined;
            if (invocationId) {
              seenInvocationIds.add(invocationId);
            }
            seenToolNames.add(segmentType);
            return;
          }

          if (message.type === "SEGMENT_END") {
            const invocationId = message.payload?.id as string | undefined;
            const matchesKnownToolInvocation =
              typeof invocationId === "string" && seenInvocationIds.has(invocationId);
            if (
              segmentType === "run_bash" ||
              segmentType === "edit_file" ||
              matchesKnownToolInvocation
            ) {
              sawToolTerminal = true;
              if (invocationId) {
                seenInvocationIds.add(invocationId);
              }
              if (segmentType === "run_bash" || segmentType === "edit_file") {
                seenToolNames.add(segmentType);
              }
            }
          }

          if (
            message.type === "TOOL_EXECUTION_SUCCEEDED" ||
            message.type === "TOOL_EXECUTION_FAILED" ||
            message.type === "TOOL_DENIED"
          ) {
            sawToolTerminal = true;
            if (message.type === "TOOL_DENIED") {
              sawToolDenied = true;
            }
            const invocationId = message.payload?.invocation_id as string | undefined;
            const toolName = message.payload?.tool_name as string | undefined;
            if (invocationId) {
              seenInvocationIds.add(invocationId);
            }
            if (toolName) {
              seenToolNames.add(toolName);
            }
          }

          if (
            sentApprovalPrompt &&
            sawConnected &&
            sawApprovalRequested &&
            sentApprovalDecision &&
            sawToolStart &&
            sawToolTerminal
          ) {
            clearTimeout(fallbackSendTimer);
            clearTimeout(timeout);
            clearRepromptTimer();
            resolve();
          }
        });

        socket.once("error", (error) => {
          clearTimeout(fallbackSendTimer);
          clearTimeout(timeout);
          clearRepromptTimer();
          reject(error);
        });
      });

      await waitForSocketOpen(socket);
      sawConnected = true;

      try {
        await finished;
        const copiedContent = await readFile(destinationPath, "utf8");
        expect(copiedContent.trim()).toBe(expectedToken);
        expect(sawConnected).toBe(true);
        expect(sawApprovalRequested).toBe(true);
        expect(sentApprovalDecision).toBe(true);
        expect(sawToolStart).toBe(true);
        expect(sawToolTerminal).toBe(true);
        expect(sawToolDenied).toBe(false);
        expect(
          sawToolApproved || (sentApprovalDecision && sawToolStart && sawToolTerminal && !sawToolDenied),
        ).toBe(true);
        expect(seenInvocationIds.size).toBeGreaterThan(0);
        expect(
          seenToolNames.size > 0 || seenSegmentTypes.has("run_bash") || seenSegmentTypes.has("edit_file"),
        ).toBe(true);
      } finally {
        process.env.CODEX_APP_SERVER_APPROVAL_POLICY = previousApprovalPolicy;
        process.env.CODEX_APP_SERVER_SANDBOX = previousSandbox;
        socket.close();
        await app.close();
        await rm(tempDir, { recursive: true, force: true });
        const terminateMutation = `
          mutation Terminate($id: String!) {
            terminateAgentRun(id: $id) {
              success
              message
            }
          }
        `;
        await execGraphql<{
          terminateAgentRun: { success: boolean; message: string };
        }>(terminateMutation, { id: runId });
      }
    },
    120000,
  );

  it(
    "streams codex tool approval requested and denied lifecycle over websocket",
    async () => {
      const previousApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
      const previousSandbox = process.env.CODEX_APP_SERVER_SANDBOX;
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "on-request";
      process.env.CODEX_APP_SERVER_SANDBOX = "workspace-write";

      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();

      const sendMutation = `
        mutation SendAgentUserInput($input: SendAgentUserInputInput!) {
          sendAgentUserInput(input: $input) {
            success
            message
            agentRunId
          }
        }
      `;

      const warmupResult = await execGraphql<{
        sendAgentUserInput: {
          success: boolean;
          message: string;
          agentRunId: string | null;
        };
      }>(sendMutation, {
        input: {
          runtimeKind: "codex_app_server",
          agentDefinitionId: "codex-e2e-agent-def",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: false,
          userInput: {
            content: "Reply with READY.",
          },
        },
      });

      expect(warmupResult.sendAgentUserInput.success).toBe(true);
      expect(warmupResult.sendAgentUserInput.agentRunId).toBeTruthy();
      const runId = warmupResult.sendAgentUserInput.agentRunId as string;
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "codex-tool-deny-e2e-"));
      const sourcePath = path.join(tempDir, "source.txt");
      const destinationPath = path.join(tempDir, "destination.txt");
      const expectedToken = `CODEX_TOOL_DENY_E2E_${randomUUID()}`;
      await writeFile(sourcePath, `${expectedToken}\n`, "utf8");

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

      const seenEventTypes = new Set<string>();
      const seenSegmentTypes = new Set<string>();
      const seenInvocationIds = new Set<string>();
      let sawConnected = false;
      let sentDenyPrompt = false;
      let sawApprovalRequested = false;
      let sentDenyDecision = false;
      let sawToolDenied = false;
      let sawToolStart = false;
      let sawPostDenyAssistantOutput = false;
      let promptAttemptCount = 0;
      const maxPromptAttempts = 3;

      const finished = new Promise<void>((resolve, reject) => {
        const copyCommand = `cat '${escapeForSingleQuotedShell(sourcePath)}' > '${escapeForSingleQuotedShell(destinationPath)}'`;
        const buildDenyPrompt = (attempt: number): string => {
          if (attempt === 1) {
            return `Use the terminal tool to execute this command exactly once:\n${copyCommand}\nThis command should require approval first. Do not simulate execution.`;
          }
          return `Retry attempt ${attempt}: request terminal approval for this exact command and do not answer without requesting approval first:\n${copyCommand}`;
        };
        let repromptTimer: ReturnType<typeof setTimeout> | null = null;
        const clearRepromptTimer = () => {
          if (repromptTimer) {
            clearTimeout(repromptTimer);
            repromptTimer = null;
          }
        };
        const sendDenyPrompt = () => {
          if (promptAttemptCount >= maxPromptAttempts) {
            return;
          }
          promptAttemptCount += 1;
          sentDenyPrompt = true;
          socket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: { content: buildDenyPrompt(promptAttemptCount) },
            }),
          );
          clearRepromptTimer();
          repromptTimer = setTimeout(() => {
            if (!sawApprovalRequested && promptAttemptCount < maxPromptAttempts) {
              sendDenyPrompt();
            }
          }, 15_000);
        };

        const fallbackSendTimer = setTimeout(() => {
          if (!sentDenyPrompt) {
            sendDenyPrompt();
          }
        }, 5000);
        const timeout = setTimeout(() => {
          clearRepromptTimer();
          reject(
            new Error(
              `Timed out waiting for deny lifecycle. promptSent=${String(sentDenyPrompt)} promptAttempts=${String(promptAttemptCount)} approvalRequested=${String(sawApprovalRequested)} denySent=${String(sentDenyDecision)} denied=${String(sawToolDenied)}. Seen types: ${Array.from(seenEventTypes).join(", ")}. Segment types: ${Array.from(seenSegmentTypes).join(", ")}`,
            ),
          );
        }, 90000);

        socket.on("message", (raw) => {
          const message = JSON.parse(raw.toString()) as {
            type: string;
            payload?: Record<string, unknown>;
          };
          seenEventTypes.add(message.type);
          const segmentType =
            typeof message.payload?.segment_type === "string" ? message.payload.segment_type : null;
          if (segmentType) {
            seenSegmentTypes.add(segmentType);
          }

          if (message.type === "CONNECTED") {
            sawConnected = true;
            return;
          }

          if (message.type === "AGENT_STATUS") {
            const status = message.payload?.new_status;
            if (status === "IDLE" && !sentDenyPrompt) {
              sendDenyPrompt();
              return;
            }
            if (status === "IDLE" && sentDenyPrompt && !sawApprovalRequested && promptAttemptCount < maxPromptAttempts) {
              sendDenyPrompt();
            }
            return;
          }

          if (message.type === "TOOL_APPROVAL_REQUESTED") {
            sawApprovalRequested = true;
            clearRepromptTimer();
            const invocationId =
              (message.payload?.invocation_id as string | undefined) ??
              (message.payload?.tool_invocation_id as string | undefined);
            if (invocationId) {
              seenInvocationIds.add(invocationId);
              sentDenyDecision = true;
              socket.send(
                JSON.stringify({
                  type: "DENY_TOOL",
                  payload: { invocation_id: invocationId, reason: "e2e-manual-deny" },
                }),
              );
            }
            return;
          }

          if (message.type === "TOOL_DENIED") {
            sawToolDenied = true;
            const invocationId = message.payload?.invocation_id as string | undefined;
            if (invocationId) {
              seenInvocationIds.add(invocationId);
            }
            return;
          }

          if (
            message.type === "TOOL_EXECUTION_STARTED" ||
            (message.type === "SEGMENT_START" &&
              (segmentType === "run_bash" || segmentType === "edit_file"))
          ) {
            sawToolStart = true;
          }

          if (
            sentDenyDecision &&
            (message.type === "SEGMENT_CONTENT" || message.type === "SEGMENT_END") &&
            (segmentType === "text" || segmentType === "reasoning")
          ) {
            sawPostDenyAssistantOutput = true;
          }

          if (
            sentDenyPrompt &&
            sawConnected &&
            sawApprovalRequested &&
            sentDenyDecision &&
            (sawToolDenied || sawPostDenyAssistantOutput)
          ) {
            clearTimeout(fallbackSendTimer);
            clearTimeout(timeout);
            clearRepromptTimer();
            resolve();
          }
        });

        socket.once("error", (error) => {
          clearTimeout(fallbackSendTimer);
          clearTimeout(timeout);
          clearRepromptTimer();
          reject(error);
        });
      });

      await waitForSocketOpen(socket);
      sawConnected = true;

      try {
        await finished;
        expect(sawConnected).toBe(true);
        expect(sawApprovalRequested).toBe(true);
        expect(sentDenyDecision).toBe(true);
        expect(sawToolDenied || sawPostDenyAssistantOutput).toBe(true);
        expect(seenInvocationIds.size).toBeGreaterThan(0);
        expect(sawToolStart).toBe(false);
        await expect(readFile(destinationPath, "utf8")).rejects.toBeTruthy();
      } finally {
        process.env.CODEX_APP_SERVER_APPROVAL_POLICY = previousApprovalPolicy;
        process.env.CODEX_APP_SERVER_SANDBOX = previousSandbox;
        socket.close();
        await app.close();
        await rm(tempDir, { recursive: true, force: true });
        const terminateMutation = `
          mutation Terminate($id: String!) {
            terminateAgentRun(id: $id) {
              success
              message
            }
          }
        `;
        await execGraphql<{
          terminateAgentRun: { success: boolean; message: string };
        }>(terminateMutation, { id: runId });
      }
    },
    105000,
  );
});
