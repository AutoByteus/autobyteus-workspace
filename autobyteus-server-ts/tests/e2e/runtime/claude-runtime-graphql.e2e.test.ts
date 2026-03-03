import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
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

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type WsTurnCapture = {
  sawConnected: boolean;
  sawRunningAfterPrompt: boolean;
  sawIdleAfterPrompt: boolean;
  textDeltas: string[];
  assistantOutputFragments: string[];
  segmentEndMethods: string[];
  errorCodes: string[];
  rawMessages: WsMessage[];
};

describeClaudeRuntime("Claude runtime GraphQL e2e (live transport)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "claude-runtime-e2e-appdata-"));
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

  const fetchClaudeModelIdentifiers = async (): Promise<string[]> => {
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
      runtimeKind: "claude_agent_sdk",
    });

    return result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.length > 0),
    );
  };

  const fetchClaudeModelIdentifier = async (): Promise<string> => {
    const modelIdentifiers = await fetchClaudeModelIdentifiers();
    if (modelIdentifiers.length === 0) {
      throw new Error("No Claude runtime model was returned by availableLlmProvidersWithModels.");
    }
    return modelIdentifiers[0];
  };

  const createClaudeRun = async (input: {
    modelIdentifier: string;
    prompt: string;
    workspaceRootPath?: string;
  }): Promise<string> => {
    const mutation = `
      mutation ContinueRun($input: ContinueRunInput!) {
        continueRun(input: $input) {
          success
          message
          runId
        }
      }
    `;

    const result = await execGraphql<{
      continueRun: {
        success: boolean;
        message: string;
        runId: string | null;
      };
    }>(mutation, {
      input: {
        runtimeKind: "claude_agent_sdk",
        agentDefinitionId: "claude-e2e-agent-def",
        llmModelIdentifier: input.modelIdentifier,
        workspaceRootPath: input.workspaceRootPath,
        userInput: {
          content: input.prompt,
        },
      },
    });

    expect(result.continueRun.success).toBe(true);
    expect(result.continueRun.runId).toBeTruthy();
    return result.continueRun.runId as string;
  };

  const terminateRun = async (runId: string): Promise<void> => {
    const mutation = `
      mutation Terminate($id: String!) {
        terminateAgentRun(id: $id) {
          success
          message
        }
      }
    `;
    await execGraphql<{
      terminateAgentRun: { success: boolean; message: string };
    }>(mutation, { id: runId });
  };

  const captureSingleWebsocketTurn = async (input: {
    runId: string;
    prompt: string;
    preClientMessages?: Array<Record<string, unknown>>;
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
    const textDeltas: string[] = [];
    const assistantOutputFragments: string[] = [];
    const segmentEndMethods: string[] = [];
    const errorCodes: string[] = [];

    let sawConnected = false;
    let sawRunningAfterPrompt = false;
    let sawIdleAfterPrompt = false;
    let promptSent = false;

    const registerMessage = (raw: WebSocket.RawData): void => {
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
          if (promptSent && status === "RUNNING") {
            sawRunningAfterPrompt = true;
            return;
          }
          if (promptSent && status === "IDLE" && sawRunningAfterPrompt) {
            sawIdleAfterPrompt = true;
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
            textDeltas.push(delta);
            assistantOutputFragments.push(delta);
          }
          return;
        }

        if (parsed.type === "SEGMENT_END") {
          if (!promptSent) {
            return;
          }
          const runtimeMethod = payload.runtime_event_method;
          if (typeof runtimeMethod === "string") {
            segmentEndMethods.push(runtimeMethod);
          }
          if (typeof payload.text === "string" && payload.text.length > 0) {
            assistantOutputFragments.push(payload.text);
          }
          return;
        }

        if (parsed.type === "ERROR") {
          const code = payload.code;
          if (typeof code === "string") {
            errorCodes.push(code);
          }
        }
      } catch {
        // ignore malformed messages in e2e capture
      }
    };

    await waitForSocketOpen(socket);
    sawConnected = true;

    const finished = new Promise<WsTurnCapture>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Timed out waiting for websocket turn completion. running=${String(sawRunningAfterPrompt)} idle=${String(sawIdleAfterPrompt)} textDeltas=${String(textDeltas.length)} errors=${errorCodes.join(",")}`,
          ),
        );
      }, 90_000);

      const maybeResolve = () => {
        if (!promptSent) {
          return;
        }
        if (sawRunningAfterPrompt && sawIdleAfterPrompt) {
          clearTimeout(timeout);
          resolve({
            sawConnected,
            sawRunningAfterPrompt,
            sawIdleAfterPrompt,
            textDeltas,
            assistantOutputFragments,
            segmentEndMethods,
            errorCodes,
            rawMessages,
          });
        }
      };

      socket.on("message", (raw) => {
        registerMessage(raw);
        maybeResolve();
      });

      socket.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      const sendPrompt = async () => {
        const preMessages = input.preClientMessages ?? [];
        for (const message of preMessages) {
          socket.send(JSON.stringify(message));
          await wait(50);
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

      void sendPrompt();
    });

    try {
      return await finished;
    } finally {
      socket.close();
      await app.close();
    }
  };

  it("lists Claude runtime models from live SDK metadata", async () => {
    const modelIdentifiers = await fetchClaudeModelIdentifiers();
    expect(modelIdentifiers.length).toBeGreaterThan(0);
    expect(modelIdentifiers).toContain("default");
    expect(modelIdentifiers).not.toContain("claude-sonnet-4-5");
  });

  it("creates and terminates a Claude runtime run through GraphQL", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();

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
        runtimeKind: "claude_agent_sdk",
        agentDefinitionId: "claude-e2e-agent-def",
        llmModelIdentifier: modelIdentifier,
        userInput: {
          content: "Reply with exactly READY.",
        },
      },
    });

    expect(sendResult.sendAgentUserInput.success).toBe(true);
    expect(sendResult.sendAgentUserInput.agentRunId).toBeTruthy();

    await terminateRun(sendResult.sendAgentUserInput.agentRunId as string);
  }, 120_000);

  it("restores a terminated Claude run in the same workspace after continueRun", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-continue-workspace-e2e-"));
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
            runtimeKind
            workspaceRootPath
            runtimeReference {
              sessionId
            }
          }
        }
      }
    `;

    try {
      const createResult = await execGraphql<{
        continueRun: {
          success: boolean;
          message: string;
          runId: string | null;
        };
      }>(continueMutation, {
        input: {
          runtimeKind: "claude_agent_sdk",
          agentDefinitionId: "claude-e2e-agent-def",
          workspaceRootPath,
          llmModelIdentifier: modelIdentifier,
          userInput: {
            content: "Reply with READY.",
          },
        },
      });
      expect(createResult.continueRun.success).toBe(true);
      expect(createResult.continueRun.runId).toBeTruthy();
      runId = createResult.continueRun.runId;

      const beforeTerminate = await execGraphql<{
        getRunResumeConfig: {
          runId: string;
          manifestConfig: {
            runtimeKind: string;
            workspaceRootPath: string;
            runtimeReference: {
              sessionId: string | null;
            };
          };
        };
      }>(resumeQuery, { runId });
      expect(beforeTerminate.getRunResumeConfig.runId).toBe(runId);
      expect(beforeTerminate.getRunResumeConfig.manifestConfig.runtimeKind).toBe("claude_agent_sdk");
      expect(beforeTerminate.getRunResumeConfig.manifestConfig.workspaceRootPath).toBe(workspaceRootPath);
      expect(beforeTerminate.getRunResumeConfig.manifestConfig.runtimeReference.sessionId).toBeTruthy();

      await terminateRun(runId as string);

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
    } finally {
      if (runId) {
        try {
          await terminateRun(runId);
        } catch {
          // best-effort cleanup
        }
      }
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  }, 120_000);

  it(
    "preserves workspace mapping for Claude runs created with workspaceId across send->terminate->continue",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-workspaceid-continue-e2e-"));
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
      const resumeQuery = `
        query Resume($runId: String!) {
          getRunResumeConfig(runId: $runId) {
            runId
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
        const workspaceResult = await execGraphql<{
          createWorkspace: { workspaceId: string };
        }>(createWorkspaceMutation, {
          input: {
            rootPath: workspaceRootPath,
          },
        });
        const workspaceId = workspaceResult.createWorkspace.workspaceId;
        expect(workspaceId).toBeTruthy();

        const createResult = await execGraphql<{
          continueRun: {
            success: boolean;
            message: string;
            runId: string | null;
          };
        }>(continueMutation, {
          input: {
            runtimeKind: "claude_agent_sdk",
            agentDefinitionId: "claude-e2e-agent-def",
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
            manifestConfig: {
              runtimeKind: string;
              workspaceRootPath: string;
            };
          };
        }>(resumeQuery, { runId });
        expect(beforeTerminateResume.getRunResumeConfig.manifestConfig.runtimeKind).toBe(
          "claude_agent_sdk",
        );
        expect(beforeTerminateResume.getRunResumeConfig.manifestConfig.workspaceRootPath).toBe(
          workspaceRootPath,
        );

        const deadline = Date.now() + 120_000;
        let groupedInSelectedWorkspace = false;
        while (Date.now() < deadline) {
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
          await wait(2_000);
        }
        expect(groupedInSelectedWorkspace).toBe(true);

        await terminateRun(runId as string);

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

        const afterContinueResume = await execGraphql<{
          getRunResumeConfig: {
            runId: string;
            manifestConfig: {
              runtimeKind: string;
              workspaceRootPath: string;
            };
          };
        }>(resumeQuery, { runId });
        expect(afterContinueResume.getRunResumeConfig.manifestConfig.runtimeKind).toBe(
          "claude_agent_sdk",
        );
        expect(afterContinueResume.getRunResumeConfig.manifestConfig.workspaceRootPath).toBe(
          workspaceRootPath,
        );
      } finally {
        if (runId) {
          try {
            await terminateRun(runId);
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
    "executes Claude tool commands inside the selected workspace across terminate->continue",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-workspace-cwd-e2e-"));
      const canonicalWorkspaceRootPath = await realpath(workspaceRootPath).catch(() => workspaceRootPath);
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

      const probeWorkspaceCwd = async (targetRunId: string, phase: string): Promise<string> => {
        const attemptOutputs: string[] = [];

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const probePrompt = [
            "Call run_bash exactly once with this command: pwd",
            "Do not answer without running the tool.",
            "Return only the command output with no extra words.",
            `Probe attempt ${attempt}.`,
          ].join("\n");

          const probeTurn = await captureSingleWebsocketTurn({
            runId: targetRunId,
            prompt: probePrompt,
          });
          expect(probeTurn.errorCodes).toEqual([]);

          const probeOutput = probeTurn.assistantOutputFragments.join("\n");
          attemptOutputs.push(probeOutput);

          const matchesWorkspace =
            probeOutput.includes(workspaceRootPath) ||
            probeOutput.includes(canonicalWorkspaceRootPath);
          if (matchesWorkspace) {
            return probeOutput;
          }
        }

        throw new Error(
          `Workspace probe output did not include expected cwd (${phase}). outputs=${JSON.stringify(
            attemptOutputs,
          )} workspace=${workspaceRootPath} canonical=${canonicalWorkspaceRootPath}`,
        );
      };

      try {
        const createResult = await execGraphql<{
          continueRun: {
            success: boolean;
            message: string;
            runId: string | null;
          };
        }>(continueMutation, {
          input: {
            runtimeKind: "claude_agent_sdk",
            agentDefinitionId: "claude-e2e-agent-def",
            workspaceRootPath,
            llmModelIdentifier: modelIdentifier,
            userInput: {
              content: "Reply with READY.",
            },
          },
        });
        expect(createResult.continueRun.success).toBe(true);
        expect(createResult.continueRun.runId).toBeTruthy();
        runId = createResult.continueRun.runId;

        await probeWorkspaceCwd(runId as string, "before-continue");

        await terminateRun(runId as string);

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

        await probeWorkspaceCwd(runId as string, "after-continue");
      } finally {
        if (runId) {
          try {
            await terminateRun(runId);
          } catch {
            // best-effort cleanup
          }
        }
        await rm(workspaceRootPath, { recursive: true, force: true });
      }
    },
    180_000,
  );

  it("returns non-empty run projection conversation for completed Claude runs", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-history-projection-e2e-"));
    let runId: string | null = null;

    const projectionQuery = `
      query Projection($runId: String!) {
        getRunProjection(runId: $runId) {
          runId
          conversation
        }
        getRunResumeConfig(runId: $runId) {
          manifestConfig {
            runtimeReference {
              sessionId
            }
          }
        }
      }
    `;

    try {
      runId = await createClaudeRun({
        modelIdentifier,
        workspaceRootPath,
        prompt: "Reply with one short sentence about prime numbers.",
      });

      const deadline = Date.now() + 45_000;
      let projectionConversation: Array<Record<string, unknown>> = [];
      let sessionId: string | null = null;

      while (Date.now() < deadline) {
        const projection = await execGraphql<{
          getRunProjection: {
            runId: string;
            conversation: Array<Record<string, unknown>>;
          };
          getRunResumeConfig: {
            manifestConfig: {
              runtimeReference: {
                sessionId: string | null;
              };
            };
          };
        }>(projectionQuery, { runId });

        projectionConversation = projection.getRunProjection.conversation ?? [];
        sessionId = projection.getRunResumeConfig.manifestConfig.runtimeReference.sessionId;
        if (projectionConversation.length > 0) {
          break;
        }
        await wait(1_500);
      }

      expect(sessionId).toBeTruthy();
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
      if (runId) {
        try {
          await terminateRun(runId);
        } catch {
          // best-effort cleanup
        }
      }
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  }, 120_000);

  it("retains two streamed turns in Claude run projection after terminate", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-two-turn-history-e2e-"));
    const turnOneMarker = `claude-history-turn-one-${randomUUID()}`;
    const turnTwoMarker = `claude-history-turn-two-${randomUUID()}`;
    let runId: string | null = null;

    const projectionQuery = `
      query Projection($runId: String!) {
        getRunProjection(runId: $runId) {
          runId
          conversation
        }
      }
    `;

    try {
      runId = await createClaudeRun({
        modelIdentifier,
        workspaceRootPath,
        prompt: "Reply with READY for bootstrap turn.",
      });

      // Ensure the bootstrap turn has completed before sending websocket turns.
      const bootstrapDeadline = Date.now() + 45_000;
      let bootstrapConversation: Array<Record<string, unknown>> = [];
      while (Date.now() < bootstrapDeadline) {
        const projection = await execGraphql<{
          getRunProjection: {
            runId: string;
            conversation: Array<Record<string, unknown>>;
          };
        }>(projectionQuery, { runId });
        bootstrapConversation = projection.getRunProjection.conversation ?? [];
        const hasAssistantMessage = bootstrapConversation.some((entry) => {
          if (!entry || typeof entry !== "object") {
            return false;
          }
          const role = (entry as Record<string, unknown>).role;
          return role === "assistant";
        });
        if (hasAssistantMessage) {
          break;
        }
        await wait(1_500);
      }
      expect(bootstrapConversation.length).toBeGreaterThan(0);

      const turnOneCapture = await captureSingleWebsocketTurn({
        runId,
        prompt: `Reply with EXACT token ${turnOneMarker}.`,
      });
      expect(turnOneCapture.sawRunningAfterPrompt).toBe(true);
      expect(turnOneCapture.sawIdleAfterPrompt).toBe(true);
      expect(turnOneCapture.errorCodes).not.toContain("CLAUDE_RUNTIME_TURN_FAILED");
      expect(turnOneCapture.assistantOutputFragments.join("").trim().length).toBeGreaterThan(0);

      const turnTwoCapture = await captureSingleWebsocketTurn({
        runId,
        prompt: `Reply with EXACT token ${turnTwoMarker}.`,
      });
      expect(turnTwoCapture.sawRunningAfterPrompt).toBe(true);
      expect(turnTwoCapture.sawIdleAfterPrompt).toBe(true);
      expect(turnTwoCapture.errorCodes).not.toContain("CLAUDE_RUNTIME_TURN_FAILED");
      expect(turnTwoCapture.assistantOutputFragments.join("").trim().length).toBeGreaterThan(0);

      await terminateRun(runId);

      const projectionDeadline = Date.now() + 45_000;
      let projectionConversation: Array<Record<string, unknown>> = [];
      let serializedConversation = "";

      while (Date.now() < projectionDeadline) {
        const projection = await execGraphql<{
          getRunProjection: {
            runId: string;
            conversation: Array<Record<string, unknown>>;
          };
        }>(projectionQuery, { runId });

        projectionConversation = projection.getRunProjection.conversation ?? [];
        serializedConversation = projectionConversation.map((entry) => JSON.stringify(entry)).join("\n");

        if (
          serializedConversation.includes(turnOneMarker) &&
          serializedConversation.includes(turnTwoMarker)
        ) {
          break;
        }
        await wait(1_500);
      }

      expect(projectionConversation.length).toBeGreaterThan(0);
      expect(serializedConversation).toContain(turnOneMarker);
      expect(serializedConversation).toContain(turnTwoMarker);

      const userEntriesWithMarkers = projectionConversation.filter((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }
        const role = (entry as Record<string, unknown>).role;
        const serialized = JSON.stringify(entry);
        return role === "user" && (serialized.includes(turnOneMarker) || serialized.includes(turnTwoMarker));
      });
      expect(userEntriesWithMarkers.length).toBeGreaterThanOrEqual(2);
    } finally {
      if (runId) {
        try {
          await terminateRun(runId);
        } catch {
          // best-effort cleanup
        }
      }
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  }, 180_000);

  it("retains two-turn history and grows it after continue", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-history-continue-e2e-"));
    let runId: string | null = null;

    const projectionQuery = `
      query Projection($runId: String!) {
        getRunProjection(runId: $runId) {
          runId
          conversation
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

    const roleCounts = (conversation: Array<Record<string, unknown>>): { user: number; assistant: number } => {
      let user = 0;
      let assistant = 0;
      for (const entry of conversation) {
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const role = (entry as Record<string, unknown>).role;
        if (role === "user") {
          user += 1;
          continue;
        }
        if (role === "assistant") {
          assistant += 1;
        }
      }
      return { user, assistant };
    };

    const waitForMinimumRoleCounts = async (
      minimumUserCount: number,
      minimumAssistantCount: number,
      timeoutMs = 60_000,
    ): Promise<{ user: number; assistant: number }> => {
      const deadline = Date.now() + timeoutMs;
      let lastUserCount = 0;
      let lastAssistantCount = 0;

      while (Date.now() < deadline) {
        if (!runId) {
          throw new Error("Run ID is required before polling run projection.");
        }
        const projection = await execGraphql<{
          getRunProjection: {
            runId: string;
            conversation: Array<Record<string, unknown>>;
          };
        }>(projectionQuery, { runId });
        const counts = roleCounts(projection.getRunProjection.conversation ?? []);
        lastUserCount = counts.user;
        lastAssistantCount = counts.assistant;
        if (lastUserCount >= minimumUserCount && lastAssistantCount >= minimumAssistantCount) {
          return counts;
        }
        await wait(1_500);
      }

      throw new Error(
        `Timed out waiting for run projection counts. expected user>=${minimumUserCount},assistant>=${minimumAssistantCount}; got user=${lastUserCount},assistant=${lastAssistantCount}`,
      );
    };

    try {
      runId = await createClaudeRun({
        modelIdentifier,
        workspaceRootPath,
        prompt: "Reply with READY for bootstrap turn.",
      });
      await waitForMinimumRoleCounts(1, 0, 45_000);

      const turnOneContinueResult = await execGraphql<{
        continueRun: {
          success: boolean;
          message: string;
          runId: string | null;
        };
      }>(continueMutation, {
        input: {
          runId,
          userInput: {
            content: "Reply with READY for history turn one.",
          },
        },
      });
      expect(turnOneContinueResult.continueRun.success).toBe(true);
      expect(turnOneContinueResult.continueRun.runId).toBe(runId);
      await waitForMinimumRoleCounts(2, 1, 60_000);

      const turnTwoContinueResult = await execGraphql<{
        continueRun: {
          success: boolean;
          message: string;
          runId: string | null;
        };
      }>(continueMutation, {
        input: {
          runId,
          userInput: {
            content: "Reply with READY for history turn two.",
          },
        },
      });
      expect(turnTwoContinueResult.continueRun.success).toBe(true);
      expect(turnTwoContinueResult.continueRun.runId).toBe(runId);

      const beforeTerminateCounts = await waitForMinimumRoleCounts(3, 2, 60_000);
      await terminateRun(runId);

      const beforeUserCount = beforeTerminateCounts.user;
      const beforeAssistantCount = beforeTerminateCounts.assistant;
      const beforeTotalCount = beforeUserCount + beforeAssistantCount;
      expect(beforeTotalCount).toBeGreaterThanOrEqual(5);

      const postTerminateCounts = await waitForMinimumRoleCounts(beforeUserCount, beforeAssistantCount, 45_000);
      const postTerminateTotalCount = postTerminateCounts.user + postTerminateCounts.assistant;
      expect(postTerminateCounts.user).toBeGreaterThanOrEqual(3);
      expect(postTerminateCounts.assistant).toBeGreaterThanOrEqual(2);
      expect(postTerminateTotalCount).toBeGreaterThanOrEqual(4);

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
            content: "Reply with READY from continueRun mutation.",
          },
        },
      });
      expect(continueResult.continueRun.success).toBe(true);
      expect(continueResult.continueRun.runId).toBe(runId);

      const afterContinueCounts = await waitForMinimumRoleCounts(beforeUserCount + 1, beforeAssistantCount, 60_000);

      expect(afterContinueCounts.user).toBeGreaterThanOrEqual(beforeUserCount + 1);
      expect(afterContinueCounts.assistant).toBeGreaterThanOrEqual(beforeAssistantCount);
      expect(afterContinueCounts.user + afterContinueCounts.assistant).toBeGreaterThanOrEqual(beforeTotalCount + 1);

      await terminateRun(runId);

      const finalCounts = await waitForMinimumRoleCounts(
        afterContinueCounts.user,
        afterContinueCounts.assistant,
        45_000,
      );

      expect(finalCounts.user).toBeGreaterThanOrEqual(afterContinueCounts.user);
      expect(finalCounts.assistant).toBeGreaterThanOrEqual(afterContinueCounts.assistant);
    } finally {
      if (runId) {
        try {
          await terminateRun(runId);
        } catch {
          // best-effort cleanup
        }
      }
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  }, 240_000);

  it("streams Claude AGENT_STATUS transitions over websocket for a live turn", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    let runId: string | null = null;

    try {
      runId = await createClaudeRun({
        modelIdentifier,
        prompt: "Reply with READY.",
      });

      const capture = await captureSingleWebsocketTurn({
        runId,
        prompt: "Reply with READY again.",
      });

      expect(capture.sawConnected).toBe(true);
      expect(capture.sawRunningAfterPrompt).toBe(true);
      expect(capture.sawIdleAfterPrompt).toBe(true);
    } finally {
      if (runId) {
        await terminateRun(runId);
      }
    }
  }, 120_000);

  it("streams Claude turn lifecycle over websocket without runtime failure", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    let runId: string | null = null;

    try {
      runId = await createClaudeRun({
        modelIdentifier,
        prompt: "Reply with READY.",
      });

      const capture = await captureSingleWebsocketTurn({
        runId,
        prompt: "Reply with exactly READY.",
      });

      expect(capture.rawMessages.length).toBeGreaterThan(0);
      expect(capture.errorCodes).not.toContain("CLAUDE_RUNTIME_TURN_FAILED");
      const assistantText = capture.assistantOutputFragments.join("").trim();
      expect(assistantText.length).toBeGreaterThan(0);
      expect(assistantText.toUpperCase()).toContain("READY");
    } finally {
      if (runId) {
        await terminateRun(runId);
      }
    }
  }, 120_000);

  it("maps Claude turn completion to AGENT_STATUS idle runtime event", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    let runId: string | null = null;

    try {
      runId = await createClaudeRun({
        modelIdentifier,
        prompt: "Reply with READY.",
      });

      const capture = await captureSingleWebsocketTurn({
        runId,
        prompt: "Reply with exactly READY.",
      });

      expect(
        capture.rawMessages.some(
          (message) =>
            message.type === "AGENT_STATUS" &&
            message.payload.new_status === "IDLE" &&
            message.payload.runtime_event_method === "turn/completed",
        ),
      ).toBe(true);
    } finally {
      if (runId) {
        await terminateRun(runId);
      }
    }
  }, 120_000);

  it("keeps Claude websocket session healthy after unsupported APPROVE_TOOL client message", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    let runId: string | null = null;

    try {
      runId = await createClaudeRun({
        modelIdentifier,
        prompt: "Reply with READY.",
      });

      const capture = await captureSingleWebsocketTurn({
        runId,
        preClientMessages: [
          {
            type: "APPROVE_TOOL",
            payload: {
              invocation_id: `claude-unsupported-approval-${randomUUID()}`,
              reason: "e2e-unsupported-approval",
            },
          },
        ],
        prompt: "Reply with READY after unsupported approval message.",
      });

      expect(capture.sawRunningAfterPrompt).toBe(true);
      expect(capture.sawIdleAfterPrompt).toBe(true);
      expect(capture.errorCodes).not.toContain("CLAUDE_RUNTIME_TURN_FAILED");
    } finally {
      if (runId) {
        await terminateRun(runId);
      }
    }
  }, 120_000);

  it("keeps Claude websocket session healthy after unsupported DENY_TOOL client message", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    let runId: string | null = null;

    try {
      runId = await createClaudeRun({
        modelIdentifier,
        prompt: "Reply with READY.",
      });

      const capture = await captureSingleWebsocketTurn({
        runId,
        preClientMessages: [
          {
            type: "DENY_TOOL",
            payload: {
              invocation_id: `claude-unsupported-deny-${randomUUID()}`,
              reason: "e2e-unsupported-deny",
            },
          },
        ],
        prompt: "Reply with READY after unsupported denial message.",
      });

      expect(capture.sawRunningAfterPrompt).toBe(true);
      expect(capture.sawIdleAfterPrompt).toBe(true);
      expect(capture.errorCodes).not.toContain("CLAUDE_RUNTIME_TURN_FAILED");
    } finally {
      if (runId) {
        await terminateRun(runId);
      }
    }
  }, 120_000);

  it("continues Claude runs after websocket turns with same runId and non-empty sessionId", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-websocket-continue-e2e-"));
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
            runtimeReference {
              sessionId
            }
          }
        }
      }
    `;

    try {
      runId = await createClaudeRun({
        modelIdentifier,
        workspaceRootPath,
        prompt: "Reply with READY.",
      });

      const capture = await captureSingleWebsocketTurn({
        runId,
        prompt: "Reply with READY from websocket turn.",
      });
      expect(capture.errorCodes).not.toContain("CLAUDE_RUNTIME_TURN_FAILED");
      const beforeContinueOutput = capture.assistantOutputFragments.join("").trim();
      expect(beforeContinueOutput.length).toBeGreaterThan(0);
      expect(beforeContinueOutput.toUpperCase()).toContain("READY");

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
            content: "Reply with READY from continueRun.",
          },
        },
      });

      expect(continueResult.continueRun.success).toBe(true);
      expect(continueResult.continueRun.runId).toBe(runId);

      const postContinueCapture = await captureSingleWebsocketTurn({
        runId,
        prompt: "Reply with READY after continueRun.",
      });
      expect(postContinueCapture.errorCodes).not.toContain("CLAUDE_RUNTIME_TURN_FAILED");
      const afterContinueOutput = postContinueCapture.assistantOutputFragments.join("").trim();
      expect(afterContinueOutput.length).toBeGreaterThan(0);
      expect(afterContinueOutput.toUpperCase()).toContain("READY");

      const resumeResult = await execGraphql<{
        getRunResumeConfig: {
          runId: string;
          manifestConfig: {
            runtimeReference: {
              sessionId: string | null;
            };
          };
        };
      }>(resumeQuery, { runId });

      expect(resumeResult.getRunResumeConfig.runId).toBe(runId);
      expect(resumeResult.getRunResumeConfig.manifestConfig.runtimeReference.sessionId).toBeTruthy();
    } finally {
      if (runId) {
        await terminateRun(runId);
      }
      await rm(workspaceRootPath, { recursive: true, force: true });
    }
  }, 120_000);
});
