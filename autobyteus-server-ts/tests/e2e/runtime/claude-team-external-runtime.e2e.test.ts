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

describeClaudeRuntime("Claude team external-member runtime e2e (live transport)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdPromptIds = new Set<string>();
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "claude-team-runtime-e2e-appdata-"));
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
    const exec = async <T>(query: string, variables?: Record<string, unknown>): Promise<T | null> => {
      const result = await graphql({
        schema,
        source: query,
        variableValues: variables,
      });
      return result.errors?.length ? null : (result.data as T);
    };

    const terminateTeamRunMutation = `
      mutation TerminateAgentTeamRun($id: String!) {
        terminateAgentTeamRun(id: $id) {
          success
        }
      }
    `;
    for (const teamRunId of createdTeamRunIds) {
      await exec(terminateTeamRunMutation, { id: teamRunId });
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

    const deletePromptMutation = `
      mutation DeletePrompt($id: String!) {
        deletePrompt(id: $id) {
          id
        }
      }
    `;
    for (const id of createdPromptIds) {
      await exec(deletePromptMutation, { id });
    }
    createdPromptIds.clear();

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

  const fetchClaudeModelIdentifier = async (): Promise<string> => {
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

    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.length > 0),
    );
    if (modelIdentifiers.length === 0) {
      throw new Error("No Claude runtime model was returned by availableLlmProvidersWithModels.");
    }
    return modelIdentifiers[0];
  };

  it(
    "routes targeted member messages in Claude team runtime and emits member-tagged websocket events",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-routing-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const createPromptMutation = `
        mutation CreatePrompt($input: CreatePromptInput!) {
          createPrompt(input: $input) {
            id
          }
        }
      `;
      const promptName = `claude_team_prompt_${unique}`;
      const promptCategory = `claude_team_category_${unique}`;
      const promptResult = await execGraphql<{ createPrompt: { id: string } }>(createPromptMutation, {
        input: {
          name: promptName,
          category: promptCategory,
          promptContent: "Reply with one concise sentence that follows user instructions.",
        },
      });
      createdPromptIds.add(promptResult.createPrompt.id);

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const pingDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-ping-${unique}`,
            role: "assistant",
            description: "Claude ping agent for targeted routing validation.",
            systemPromptCategory: promptCategory,
            systemPromptName: promptName,
          },
        },
      );
      const pongDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-pong-${unique}`,
            role: "assistant",
            description: "Claude pong agent for targeted routing validation.",
            systemPromptCategory: promptCategory,
            systemPromptName: promptName,
          },
        },
      );
      const pingAgentDefinitionId = pingDefResult.createAgentDefinition.id;
      const pongAgentDefinitionId = pongDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(pingAgentDefinitionId);
      createdAgentDefinitionIds.add(pongAgentDefinitionId);

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;
      const teamDefResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `claude-team-${unique}`,
            description: "Claude external-member runtime targeted routing validation team.",
            coordinatorMemberName: "ping",
            nodes: [
              {
                memberName: "ping",
                referenceId: pingAgentDefinitionId,
                referenceType: "AGENT",
              },
              {
                memberName: "pong",
                referenceId: pongAgentDefinitionId,
                referenceType: "AGENT",
              },
            ],
          },
        },
      );
      const teamDefinitionId = teamDefResult.createAgentTeamDefinition.id;
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
              memberName: "ping",
              agentDefinitionId: pingAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
            {
              memberName: "pong",
              agentDefinitionId: pongAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "claude_agent_sdk",
              workspaceRootPath,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
      const teamSocket = new WebSocket(`ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`);
      await waitForSocketOpen(teamSocket);

      const teamMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];
      teamSocket.on("message", (raw) => {
        try {
          const parsed = JSON.parse(String(raw)) as {
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
          teamMessages.push({
            type: parsed.type,
            payload,
          });
        } catch {
          // ignore malformed rows in stream capture
        }
      });

      const sendMessageToTeamMutation = `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;

      const waitForMemberLifecycle = async (memberName: "ping" | "pong"): Promise<void> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const sawRunning = teamMessages.some(
            (message) =>
              message.type === "AGENT_STATUS" &&
              message.payload.agent_name === memberName &&
              message.payload.new_status === "RUNNING",
          );
          const sawIdle = teamMessages.some(
            (message) =>
              message.type === "AGENT_STATUS" &&
              message.payload.agent_name === memberName &&
              message.payload.new_status === "IDLE",
          );

          if (sawRunning && sawIdle) {
            return;
          }
          await wait(500);
        }
        throw new Error(`Timed out waiting for member '${memberName}' running+idle events.`);
      };

      const collectMemberAssistantOutput = (memberName: "ping" | "pong"): string =>
        teamMessages
          .filter(
            (message) =>
              (message.type === "SEGMENT_CONTENT" || message.type === "SEGMENT_END") &&
              message.payload.agent_name === memberName,
          )
          .map((message) => {
            const delta = message.payload.delta;
            if (typeof delta === "string") {
              return delta;
            }
            const text = message.payload.text;
            if (typeof text === "string") {
              return text;
            }
            return "";
          })
          .join("");

      try {
        const pingSendResult = await execGraphql<{
          sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: "ping",
            userInput: {
              content: `Reply with exactly READY-PING-${unique}.`,
              contextFiles: [],
            },
          },
        });
        expect(pingSendResult.sendMessageToTeam.success).toBe(true);
        await waitForMemberLifecycle("ping");
        const pingOutput = collectMemberAssistantOutput("ping").trim();
        expect(pingOutput.length).toBeGreaterThan(0);
        expect(pingOutput.toUpperCase()).toContain(`READY-PING-${unique}`.toUpperCase());

        const pongSendResult = await execGraphql<{
          sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: "pong",
            userInput: {
              content: `Reply with exactly READY-PONG-${unique}.`,
              contextFiles: [],
            },
          },
        });
        expect(pongSendResult.sendMessageToTeam.success).toBe(true);
        await waitForMemberLifecycle("pong");
        const pongOutput = collectMemberAssistantOutput("pong").trim();
        expect(pongOutput.length).toBeGreaterThan(0);
        expect(pongOutput.toUpperCase()).toContain(`READY-PONG-${unique}`.toUpperCase());

        const interAgentMessages = teamMessages.filter((message) => message.type === "INTER_AGENT_MESSAGE");
        expect(interAgentMessages.length).toBe(0);
      } finally {
        teamSocket.close();
        await streamApp.close();
      }
    },
    180_000,
  );

  it(
    "preserves workspace mapping across create->send->terminate->continue for Claude team runs created with workspaceId",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "claude-team-workspaceid-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const createWorkspaceMutation = `
        mutation CreateWorkspace($input: CreateWorkspaceInput!) {
          createWorkspace(input: $input) {
            workspaceId
          }
        }
      `;
      const createWorkspaceResult = await execGraphql<{
        createWorkspace: { workspaceId: string };
      }>(createWorkspaceMutation, {
        input: {
          rootPath: workspaceRootPath,
        },
      });
      const workspaceId = createWorkspaceResult.createWorkspace.workspaceId;
      expect(workspaceId).toBeTruthy();

      const createPromptMutation = `
        mutation CreatePrompt($input: CreatePromptInput!) {
          createPrompt(input: $input) {
            id
          }
        }
      `;
      const promptName = `claude_team_workspace_prompt_${unique}`;
      const promptCategory = `claude_team_workspace_category_${unique}`;
      const promptResult = await execGraphql<{ createPrompt: { id: string } }>(createPromptMutation, {
        input: {
          name: promptName,
          category: promptCategory,
          promptContent: "Reply concisely in one sentence.",
        },
      });
      createdPromptIds.add(promptResult.createPrompt.id);

      const createAgentDefinitionMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
          }
        }
      `;
      const professorDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `claude-professor-${unique}`,
            role: "assistant",
            description: "Claude team workspace lifecycle professor agent.",
            systemPromptCategory: promptCategory,
            systemPromptName: promptName,
          },
        },
      );
      const professorAgentDefinitionId = professorDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(professorAgentDefinitionId);

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `;
      const teamDefinitionResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `claude-workspace-team-${unique}`,
            description: "Claude workspace lifecycle validation team.",
            coordinatorMemberName: "professor",
            nodes: [
              {
                memberName: "professor",
                referenceId: professorAgentDefinitionId,
                referenceType: "AGENT",
              },
            ],
          },
        },
      );
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
              memberName: "professor",
              agentDefinitionId: professorAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "claude_agent_sdk",
              workspaceId,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const sendMessageToTeamMutation = `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;
      const terminateTeamRunMutation = `
        mutation TerminateAgentTeamRun($id: String!) {
          terminateAgentTeamRun(id: $id) {
            success
            message
          }
        }
      `;
      const listTeamRunHistoryQuery = `
        query ListTeamRunHistory {
          listTeamRunHistory {
            teamRunId
            workspaceRootPath
            members {
              memberName
              workspaceRootPath
            }
          }
        }
      `;
      const teamResumeQuery = `
        query TeamResume($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) {
            teamRunId
            isActive
            manifest
          }
        }
      `;

      const firstSendResult = await execGraphql<{
        sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
      }>(sendMessageToTeamMutation, {
        input: {
          teamRunId,
          targetMemberName: "professor",
          userInput: {
            content: "Reply with READY.",
            contextFiles: [],
          },
        },
      });
      expect(firstSendResult.sendMessageToTeam.success).toBe(true);
      expect(firstSendResult.sendMessageToTeam.teamRunId).toBe(teamRunId);

      const deadline = Date.now() + 120_000;
      let matchedRow:
        | {
            teamRunId: string;
            workspaceRootPath: string | null;
            members: Array<{ memberName: string; workspaceRootPath: string | null }>;
          }
        | null = null;
      while (Date.now() < deadline) {
        const listResult = await execGraphql<{
          listTeamRunHistory: Array<{
            teamRunId: string;
            workspaceRootPath: string | null;
            members: Array<{ memberName: string; workspaceRootPath: string | null }>;
          }>;
        }>(listTeamRunHistoryQuery);
        matchedRow = listResult.listTeamRunHistory.find((row) => row.teamRunId === teamRunId) ?? null;
        if (
          matchedRow &&
          matchedRow.workspaceRootPath === workspaceRootPath &&
          matchedRow.members.every((member) => member.workspaceRootPath === workspaceRootPath)
        ) {
          break;
        }
        await wait(2_000);
      }

      expect(matchedRow).toBeTruthy();
      expect(matchedRow?.workspaceRootPath).toBe(workspaceRootPath);
      expect(matchedRow?.members.every((member) => member.workspaceRootPath === workspaceRootPath)).toBe(
        true,
      );

      const terminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateTeamRunMutation, { id: teamRunId });
      expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

      const continueResult = await execGraphql<{
        sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
      }>(sendMessageToTeamMutation, {
        input: {
          teamRunId,
          targetMemberName: "professor",
          userInput: {
            content: "Reply with READY again.",
            contextFiles: [],
          },
        },
      });
      expect(continueResult.sendMessageToTeam.success).toBe(true);
      expect(continueResult.sendMessageToTeam.teamRunId).toBe(teamRunId);

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: {
          teamRunId: string;
          isActive: boolean;
          manifest: {
            workspaceRootPath: string | null;
            memberBindings: Array<{ memberName: string; workspaceRootPath: string | null }>;
          };
        };
      }>(teamResumeQuery, { teamRunId });

      expect(resumeResult.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
      expect(resumeResult.getTeamRunResumeConfig.manifest.workspaceRootPath).toBe(workspaceRootPath);
      expect(
        resumeResult.getTeamRunResumeConfig.manifest.memberBindings.every(
          (binding) => binding.workspaceRootPath === workspaceRootPath,
        ),
      ).toBe(true);
    },
    180_000,
  );
});
