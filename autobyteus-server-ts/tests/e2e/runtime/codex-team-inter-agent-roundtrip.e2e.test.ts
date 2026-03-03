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

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveCodexTestsEnabled = process.env.RUN_CODEX_E2E === "1";
const describeCodexRuntime = codexBinaryReady && liveCodexTestsEnabled ? describe : describe.skip;
const originalCodexApprovalPolicy = process.env.CODEX_APP_SERVER_APPROVAL_POLICY;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

describeCodexRuntime("Codex team inter-agent roundtrip e2e (live transport)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdPromptIds = new Set<string>();
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    // Force command approvals so send_message_to is intercepted by the codex inter-agent relay handler.
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "codex-team-runtime-e2e-appdata-"));
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
    if (typeof originalCodexApprovalPolicy === "string") {
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = originalCodexApprovalPolicy;
    } else {
      delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
    }
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

  it(
    "routes live inter-agent send_message_to ping->pong->ping roundtrip in codex team runtime",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-team-roundtrip-e2e-"));
      createdWorkspaceRoots.add(workspaceRootPath);

      const createPromptMutation = `
        mutation CreatePrompt($input: CreatePromptInput!) {
          createPrompt(input: $input) {
            id
          }
        }
      `;
      const promptName = `codex_team_roundtrip_prompt_${unique}`;
      const promptCategory = `codex_team_roundtrip_category_${unique}`;
      const promptContent = `
You are participating in a two-agent team roundtrip validation in a team with members "ping" and "pong".

Rules:
1. Follow direct user instructions exactly.
2. You must not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. If the user asks you to call send_message_to with explicit arguments, call send_message_to exactly once with those exact arguments and do not call any other tool.
5. Keep assistant text responses very short.
`;

      const promptResult = await execGraphql<{ createPrompt: { id: string } }>(createPromptMutation, {
        input: {
          name: promptName,
          category: promptCategory,
          promptContent,
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
      const pingAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `codex-ping-${unique}`,
            role: "assistant",
            description: "Codex ping agent for live inter-agent roundtrip validation.",
            systemPromptCategory: promptCategory,
            systemPromptName: promptName,
          },
        },
      );
      const pongAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `codex-pong-${unique}`,
            role: "assistant",
            description: "Codex pong agent for live inter-agent roundtrip validation.",
            systemPromptCategory: promptCategory,
            systemPromptName: promptName,
          },
        },
      );
      const pingAgentDefinitionId = pingAgentDefResult.createAgentDefinition.id;
      const pongAgentDefinitionId = pongAgentDefResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(pingAgentDefinitionId);
      createdAgentDefinitionIds.add(pongAgentDefinitionId);

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
            name: `codex-roundtrip-team-${unique}`,
            description: "Live codex inter-agent roundtrip validation team.",
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
              memberName: "ping",
              agentDefinitionId: pingAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
            {
              memberName: "pong",
              agentDefinitionId: pongAgentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: true,
              runtimeKind: "codex_app_server",
              workspaceRootPath,
            },
          ],
        },
      });

      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const pingToken = `ROUNDTRIP_PING:${unique}`;
      const pongToken = `ROUNDTRIP_PONG:${unique}`;
      const streamApp = fastify();
      await streamApp.register(websocket);
      await registerAgentWebsocket(streamApp);
      const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
      const streamUrl = new URL(streamAddress);
      const teamSocket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
      );
      await waitForSocketOpen(teamSocket);
      const streamMessages: Array<{ type: string; payload: Record<string, unknown> }> = [];
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
          streamMessages.push({
            type: parsed.type,
            payload,
          });
        } catch {
          // ignore malformed rows in test stream capture
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
      const sendRelayInstruction = async (input: {
        targetMemberName: "ping" | "pong";
        recipientName: "ping" | "pong";
        messageType: string;
        content: string;
      }): Promise<void> => {
        const argsJson = JSON.stringify({
          recipient_name: input.recipientName,
          content: input.content,
          message_type: input.messageType,
        });
        const result = await execGraphql<{
          sendMessageToTeam: { success: boolean; message: string; teamRunId: string | null };
        }>(sendMessageToTeamMutation, {
          input: {
            teamRunId,
            targetMemberName: input.targetMemberName,
            userInput: {
              content:
                "Call send_message_to exactly once now with these exact JSON arguments: " +
                `${argsJson}. Do not call any other tool.`,
              contextFiles: [],
            },
          },
        });
        expect(result.sendMessageToTeam.success).toBe(true);
      };

      const waitForTeamStreamEvent = async (
        predicate: (message: { type: string; payload: Record<string, unknown> }) => boolean,
        label: string,
      ): Promise<void> => {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          if (streamMessages.some(predicate)) {
            return;
          }
          await wait(500);
        }
        const preview = streamMessages
          .slice(-20)
          .map((entry) => `${entry.type}:${JSON.stringify(entry.payload).slice(0, 200)}`)
          .join(" | ");
        throw new Error(`Timed out waiting for team websocket event '${label}'. preview='${preview}'`);
      };

      const waitForSendMessageLifecycleAndReceipt = async (input: {
        senderMemberName: "ping" | "pong";
        recipientMemberName: "ping" | "pong";
        content: string;
      }): Promise<void> => {
        const isMatchingSendMessageSegmentStart = (message: {
          type: string;
          payload: Record<string, unknown>;
        }): boolean => {
          if (message.type !== "SEGMENT_START") {
            return false;
          }
          if (message.payload.agent_name !== input.senderMemberName) {
            return false;
          }
          if (message.payload.segment_type !== "tool_call") {
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
          return args.recipient_name === input.recipientMemberName && args.content === input.content;
        };

        await waitForTeamStreamEvent(
          (message) => isMatchingSendMessageSegmentStart(message),
          `${input.senderMemberName} send_message_to SEGMENT_START`,
        );

        await waitForTeamStreamEvent(
          (message) =>
            message.type === "INTER_AGENT_MESSAGE" &&
            message.payload.agent_name === input.recipientMemberName &&
            typeof message.payload.sender_agent_id === "string" &&
            (message.payload.sender_agent_id as string).trim().length > 0 &&
            message.payload.sender_agent_name === input.senderMemberName &&
            message.payload.recipient_role_name === input.recipientMemberName &&
            message.payload.content === input.content,
          `${input.recipientMemberName} INTER_AGENT_MESSAGE`,
        );

        const matchingSegmentStarts = streamMessages.filter((message) =>
          isMatchingSendMessageSegmentStart(message),
        );
        expect(matchingSegmentStarts).toHaveLength(1);

        const sendMessageLifecycleNoise = streamMessages.filter((message) => {
          if (
            ![
              "TOOL_APPROVAL_REQUESTED",
              "TOOL_APPROVED",
              "TOOL_DENIED",
              "TOOL_EXECUTION_STARTED",
              "TOOL_EXECUTION_SUCCEEDED",
              "TOOL_EXECUTION_FAILED",
            ].includes(message.type)
          ) {
            return false;
          }
          if (message.payload.agent_name !== input.senderMemberName) {
            return false;
          }
          const toolName =
            typeof message.payload.tool_name === "string" ? message.payload.tool_name.toLowerCase() : "";
          return toolName === "send_message_to";
        });
        expect(sendMessageLifecycleNoise).toHaveLength(0);
      };

      try {
        await sendRelayInstruction({
          targetMemberName: "ping",
          recipientName: "pong",
          content: `PING-TO-PONG ${pingToken}`,
          messageType: "roundtrip_ping",
        });
        await waitForSendMessageLifecycleAndReceipt({
          senderMemberName: "ping",
          recipientMemberName: "pong",
          content: `PING-TO-PONG ${pingToken}`,
        });

        await sendRelayInstruction({
          targetMemberName: "pong",
          recipientName: "ping",
          content: `PONG-TO-PING ${pongToken}`,
          messageType: "roundtrip_pong",
        });
        await waitForSendMessageLifecycleAndReceipt({
          senderMemberName: "pong",
          recipientMemberName: "ping",
          content: `PONG-TO-PING ${pongToken}`,
        });
      } finally {
        teamSocket.close();
        await streamApp.close();
      }
    },
    180_000,
  );

  it(
    "preserves workspace mapping across create->send->terminate->continue for codex team runs created with workspaceId",
    async () => {
      const unique = randomUUID();
      const modelIdentifier = await fetchPreferredCodexToolModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "codex-team-workspaceid-e2e-"));
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
      const promptName = `codex_team_workspace_prompt_${unique}`;
      const promptCategory = `codex_team_workspace_category_${unique}`;
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
      const professorAgentDefResult = await execGraphql<{ createAgentDefinition: { id: string } }>(
        createAgentDefinitionMutation,
        {
          input: {
            name: `codex-professor-${unique}`,
            role: "assistant",
            description: "Codex team workspace lifecycle professor agent.",
            systemPromptCategory: promptCategory,
            systemPromptName: promptName,
          },
        },
      );
      const professorAgentDefinitionId = professorAgentDefResult.createAgentDefinition.id;
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
            name: `codex-workspace-team-${unique}`,
            description: "Codex workspace lifecycle validation team.",
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
              runtimeKind: "codex_app_server",
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
