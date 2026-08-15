import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  closeLiveRuntimeSecretVault,
  initializeLiveRuntimeSecretVaultFromEnvironment,
} from "../helpers/live-runtime-secret-vault-helpers.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { flattenE2eTeamMemberMetadata } from "../helpers/team-run-metadata-helpers.js";
import { isE2eTeamCommunicationMessage } from "../helpers/team-communication-message-helpers.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen3.6-35b-a3b";
const describeAutoByteusTeamRuntime =
  process.env.RUN_LMSTUDIO_E2E === "1" ? describe : describe.skip;

const buildRequiredToolChoiceLlmConfig = (
  modelIdentifier: string,
): Record<string, unknown> => {
  const config: Record<string, unknown> = {
    temperature: 0,
    tool_choice: "required",
  };
  if (modelIdentifier.toLowerCase().includes("deepseek-v4")) {
    config.extra_params = { thinking_type: "disabled" };
  }
  return config;
};

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
  timeoutMs = 180_000,
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
  throw new Error(`Timed out waiting for team websocket message '${label}'. preview='${preview}'`);
};

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 180_000,
): Promise<WsMessage> => {
  return waitForMessage(
    messages,
    (message) => messages.indexOf(message) >= startIndex && predicate(message),
    label,
    timeoutMs,
  );
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

const assistantTextMatches = (message: WsMessage, memberName: string, token: string): boolean => {
  if (message.payload.agent_name !== memberName) {
    return false;
  }

  if (message.type === "SEGMENT_CONTENT") {
    return (
      message.payload.segment_type === "text" &&
      typeof message.payload.delta === "string" &&
      message.payload.delta.includes(token)
    );
  }

  if (message.type === "SEGMENT_END") {
    return (
      message.payload.segment_type === "text" &&
      typeof message.payload.text === "string" &&
      message.payload.text.includes(token)
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

describeAutoByteusTeamRuntime("AutoByteus team current GraphQL runtime e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "autobyteus-team-runtime-api-e2e-"));
    await writeFile(
      path.join(testDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    await initializeLiveRuntimeSecretVaultFromEnvironment();
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
      await closeLiveRuntimeSecretVault();
      await rm(testDataDir, { recursive: true, force: true });
      testDataDir = null;
    }
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
      runtimeKind: "autobyteus",
    });

    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models
        .map((model) => model.modelIdentifier)
        .filter((modelIdentifier): modelIdentifier is string => modelIdentifier.trim().length > 0),
    );
    if (modelIdentifiers.length === 0) {
      throw new Error("No AutoByteus model identifier was returned for team API E2E.");
    }

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
    return qwenMatch ?? modelIdentifiers[0]!;
  };

  const createAgentDefinition = async (
    memberName: string,
    overrides: {
      instructions?: string;
      toolNames?: string[];
    } = {},
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
        name: `autobyteus-team-${memberName}-${randomUUID()}`,
        role: "assistant",
        description: "AutoByteus team API e2e agent",
        instructions:
          overrides.instructions ??
          "Follow the user's request exactly. " +
            "If asked to create a file, use the write_file tool exactly once. " +
            "If asked to reply with an exact token, output that token exactly.",
        category: "runtime-e2e",
        toolNames: overrides.toolNames ?? ["write_file"],
      },
    });
    return result.createAgentDefinition.id;
  };

  const createSingleWorkerTeamRun = async (input: {
    llmModelIdentifier: string;
    workspaceRootPath: string;
    autoExecuteTools: boolean;
  }): Promise<string> => {
    const workerAgentDefinitionId = await createAgentDefinition("worker");
    const createTeamDefinitionMutation = `
      mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
        }
      }
    `;

    const teamDefinitionResult = await execGraphql<{
      createAgentTeamDefinition: { id: string };
    }>(createTeamDefinitionMutation, {
      input: {
        name: `autobyteus-team-runtime-${randomUUID()}`,
        description: "AutoByteus team API e2e team",
        instructions: "Coordinate the worker when needed.",
        coordinatorMemberName: "worker",
        nodes: [
          {
            memberName: "worker",
            ref: workerAgentDefinitionId,
            refType: "AGENT",
            refScope: "SHARED",
          },
        ],
      },
    });

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
        teamDefinitionId: teamDefinitionResult.createAgentTeamDefinition.id,
        memberConfigs: [
          {
            memberName: "worker",
            agentDefinitionId: workerAgentDefinitionId,
            llmModelIdentifier: input.llmModelIdentifier,
            autoExecuteTools: input.autoExecuteTools,
            skillAccessMode: "NONE",
            runtimeKind: "autobyteus",
            workspaceRootPath: input.workspaceRootPath,
          },
        ],
      },
    });

    expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
    expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
    return createTeamRunResult.createAgentTeamRun.teamRunId as string;
  };

  const openTeamSocket = async (teamRunId: string): Promise<{
    app: Awaited<ReturnType<typeof fastify>>;
    socket: WebSocket;
    messages: WsMessage[];
  }> => {
    const app = fastify();
    await app.register(websocket);
    await registerAgentWebsocket(app);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const url = new URL(address);
    const socket = new WebSocket(`ws://${url.hostname}:${url.port}/ws/agent-team/${teamRunId}`);
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

  it("routes send_message_to between real AutoByteus team members and projects reference files", async () => {
    const llmModelIdentifier = await fetchModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "autobyteus-team-send-message-workspace-"));
    createdWorkspaceRoots.add(workspaceRootPath);

    const unique = randomUUID().replace(/-/g, "_");
    const referenceFilePath = path.join(workspaceRootPath, `handoff-${unique}.md`);
    await writeFile(referenceFilePath, `# handoff\n\nAUTO_SEND_MESSAGE_REF_${unique}\n`, "utf-8");
    const deliveryContent = `Please reply with exactly AUTO_SEND_MESSAGE_REPLY_${unique} and nothing else.`;
    const replyToken = `AUTO_SEND_MESSAGE_REPLY_${unique}`;
    const memberInstructions =
      "You are participating in live all-AutoByteus team communication validation. " +
      "If the user asks you to call send_message_to with exact JSON arguments, call send_message_to exactly once with those exact arguments and do not call any other tool. " +
      "If a teammate asks you to reply with an exact token, output that token exactly and do not call tools.";

    const coordinatorAgentDefinitionId = await createAgentDefinition("coordinator", {
      instructions: memberInstructions,
      toolNames: ["send_message_to"],
    });
    const reviewerAgentDefinitionId = await createAgentDefinition("reviewer", {
      instructions: memberInstructions,
      toolNames: ["send_message_to"],
    });

    const teamDefinitionResult = await execGraphql<{
      createAgentTeamDefinition: { id: string };
    }>(
      `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          name: `autobyteus-send-message-team-${randomUUID()}`,
          description: "All-AutoByteus server-owned send_message_to API e2e team",
          instructions: "Validate direct team member communication.",
          coordinatorMemberName: "coordinator",
          nodes: [
            {
              memberName: "coordinator",
              ref: coordinatorAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
            {
              memberName: "reviewer",
              ref: reviewerAgentDefinitionId,
              refType: "AGENT",
              refScope: "SHARED",
            },
          ],
        },
      },
    );

    const createTeamRunResult = await execGraphql<{
      createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
    }>(
      `
        mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
          createAgentTeamRun(input: $input) {
            success
            message
            teamRunId
          }
        }
      `,
      {
        input: {
          teamDefinitionId: teamDefinitionResult.createAgentTeamDefinition.id,
          memberConfigs: [
            {
              memberName: "coordinator",
              agentDefinitionId: coordinatorAgentDefinitionId,
              llmModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "autobyteus",
              workspaceRootPath,
              llmConfig: buildRequiredToolChoiceLlmConfig(llmModelIdentifier),
            },
            {
              memberName: "reviewer",
              agentDefinitionId: reviewerAgentDefinitionId,
              llmModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: "autobyteus",
              workspaceRootPath,
              llmConfig: {
                temperature: 0,
              },
            },
          ],
        },
      },
    );

    expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
    const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
    expect(teamRunId).toBeTruthy();

    const { app, socket, messages } = await openTeamSocket(teamRunId);
    const terminateMutation = `
      mutation TerminateAgentTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) {
          success
          message
        }
      }
    `;

    try {
      const toolArgs = {
        recipient_name: "./reviewer",
        content: deliveryContent,
        message_type: "all_autobyteus_reference_file_validation",
        reference_files: [referenceFilePath],
      };
      const startIndex = messages.length;
      sendE2eSendMessageCommand(socket, {
        target_member_route_key: "coordinator",
        content:
          `Call send_message_to exactly once now with these exact JSON arguments: ${JSON.stringify(toolArgs)}. ` +
          "Do not call any other tool and do not answer with plain text.",
      });

      await waitForMessageAfter(
        messages,
        startIndex,
        (message) =>
          message.type === "TOOL_EXECUTION_SUCCEEDED" &&
          message.payload.agent_name === "coordinator" &&
          message.payload.tool_name === "send_message_to",
        "coordinator send_message_to TOOL_EXECUTION_SUCCEEDED",
        240_000,
      );

      await waitForMessageAfter(
        messages,
        startIndex,
        (message) =>
          isE2eTeamCommunicationMessage(message, {
            senderMemberName: "coordinator",
            recipientMemberName: "reviewer",
            content: deliveryContent,
          }) &&
          message.payload.messageType === "all_autobyteus_reference_file_validation" &&
          Array.isArray(message.payload.referenceFiles) &&
          message.payload.referenceFiles.some((entry) => {
            return (
              entry &&
              typeof entry === "object" &&
              !Array.isArray(entry) &&
              (entry as Record<string, unknown>).path === referenceFilePath
            );
          }),
        "Team Communication message with reference-file projection",
        120_000,
      );

      await waitForMessageAfter(
        messages,
        startIndex,
        (message) => assistantTextMatches(message, "reviewer", replyToken),
        `reviewer assistant text containing ${replyToken}`,
        240_000,
      );
    } finally {
      socket.close();
      await app.close();
      await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId }).catch(() => undefined);
    }
  }, 300_000);

  it("creates a real team, approves a tool call, restores it, and continues on the same websocket", async () => {
    const llmModelIdentifier = await fetchModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "autobyteus-team-runtime-workspace-"));
    createdWorkspaceRoots.add(workspaceRootPath);

    const workerAgentDefinitionId = await createAgentDefinition("worker", { toolNames: [] });
    const reviewerAgentDefinitionId = await createAgentDefinition("reviewer", { toolNames: [] });

    const createTeamDefinitionMutation = `
      mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
        }
      }
    `;

    const teamDefinitionResult = await execGraphql<{
      createAgentTeamDefinition: { id: string };
    }>(createTeamDefinitionMutation, {
      input: {
        name: `autobyteus-team-runtime-${randomUUID()}`,
        description: "AutoByteus team API e2e team",
        instructions: "Coordinate the worker and reviewer when needed.",
        coordinatorMemberName: "worker",
        nodes: [
          {
            memberName: "worker",
            ref: workerAgentDefinitionId,
            refType: "AGENT",
            refScope: "SHARED",
          },
          {
            memberName: "reviewer",
            ref: reviewerAgentDefinitionId,
            refType: "AGENT",
            refScope: "SHARED",
          },
        ],
      },
    });
    const teamDefinitionId = teamDefinitionResult.createAgentTeamDefinition.id;

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
            memberName: "worker",
            agentDefinitionId: workerAgentDefinitionId,
            llmModelIdentifier,
            autoExecuteTools: false,
            skillAccessMode: "NONE",
            runtimeKind: "autobyteus",
            workspaceRootPath,
          },
          {
            memberName: "reviewer",
            agentDefinitionId: reviewerAgentDefinitionId,
            llmModelIdentifier,
            autoExecuteTools: false,
            skillAccessMode: "NONE",
            runtimeKind: "autobyteus",
            workspaceRootPath,
          },
        ],
      },
    });

    expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
    expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
    const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;

    const streamApp = fastify();
    await streamApp.register(websocket);
    await registerAgentWebsocket(streamApp);
    const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
    const streamUrl = new URL(streamAddress);
    const teamSocket = new WebSocket(
      `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
    );
    const streamMessages: WsMessage[] = [];
    teamSocket.on("message", (raw) => {
      const parsed = parseWsMessage(raw);
      if (parsed) {
        streamMessages.push(parsed);
      }
    });
    await waitForSocketOpen(teamSocket);
    await waitForMessage(streamMessages, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);

    const targetRelativePath = `team-api-${randomUUID().replace(/-/g, "_")}.txt`;
    const targetAbsolutePath = path.join(workspaceRootPath, targetRelativePath);
    const expectedContent = `TEAM_TOOL_OK_${randomUUID().replace(/-/g, "_")}`;
    const toolStartIndex = streamMessages.length;

    try {
      sendE2eSendMessageCommand(teamSocket, {
            target_member_route_key: "worker",
            content:
              `Create the file ${targetRelativePath} with exactly this content: ${expectedContent}. ` +
              `Use the relative path with base_dir set to ${workspaceRootPath}, perform the real tool call, then verify the created file with run_bash using cat ${targetAbsolutePath} before completing. Do not answer with plain text.`,
          });

      const approvalRequested = await waitForMessageAfter(
        streamMessages,
        toolStartIndex,
        (message) =>
          message.type === "TOOL_APPROVAL_REQUESTED" && message.payload.agent_name === "worker",
        "worker TOOL_APPROVAL_REQUESTED",
      );
      expect(approvalRequested.payload.tool_name).toBe("write_file");
      expect(approvalRequested.payload.arguments).toMatchObject({
        path: targetRelativePath,
        base_dir: workspaceRootPath,
        content: expectedContent,
      });
      const invocationId = resolveInvocationId(approvalRequested.payload);
      expect(invocationId).toBeTruthy();

      teamSocket.send(
        JSON.stringify({
          type: "APPROVE_TOOL",
          payload: {
            target_member_route_key: "worker",
            invocation_id: invocationId,
            reason: "approved by team API e2e",
          },
        }),
      );

      await waitForMessageAfter(
        streamMessages,
        toolStartIndex,
        (message) =>
          message.type === "TOOL_APPROVED" && message.payload.agent_name === "worker",
        "worker TOOL_APPROVED",
      );
      const toolSucceeded = await waitForMessageAfter(
        streamMessages,
        toolStartIndex,
        (message) =>
          message.type === "TOOL_EXECUTION_SUCCEEDED" &&
          message.payload.agent_name === "worker",
        "worker TOOL_EXECUTION_SUCCEEDED",
      );
      const toolSucceededIndex = streamMessages.indexOf(toolSucceeded);
      const verificationApproval = await waitForMessageAfter(
        streamMessages,
        toolSucceededIndex + 1,
        (message) =>
          message.type === "TOOL_APPROVAL_REQUESTED" && message.payload.agent_name === "worker",
        "worker second TOOL_APPROVAL_REQUESTED for file verification",
      );
      expect(verificationApproval.payload.tool_name).toBe("run_bash");
      expect(verificationApproval.payload.arguments).toMatchObject({
        command: expect.any(String),
      });
      const verificationCommand = (verificationApproval.payload.arguments as { command: string }).command;
      expect(verificationCommand.trimStart()).toMatch(/^cat(?:\s|$)/);
      expect(verificationCommand).toContain(targetAbsolutePath);

      const verificationInvocationId = resolveInvocationId(verificationApproval.payload);
      expect(verificationInvocationId).toBeTruthy();
      teamSocket.send(
        JSON.stringify({
          type: "APPROVE_TOOL",
          payload: {
            target_member_route_key: "worker",
            invocation_id: verificationInvocationId,
            reason: "approved expected file verification by team API e2e",
          },
        }),
      );

      await waitForMessageAfter(
        streamMessages,
        toolSucceededIndex + 1,
        (message) =>
          message.type === "TOOL_APPROVED" &&
          message.payload.agent_name === "worker" &&
          resolveInvocationId(message.payload) === verificationInvocationId,
        "worker verification TOOL_APPROVED",
      );
      const verificationSucceeded = await waitForMessageAfter(
        streamMessages,
        toolSucceededIndex + 1,
        (message) =>
          message.type === "TOOL_EXECUTION_SUCCEEDED" &&
          message.payload.agent_name === "worker" &&
          resolveInvocationId(message.payload) === verificationInvocationId,
        "worker verification TOOL_EXECUTION_SUCCEEDED",
      );
      const verificationSucceededIndex = streamMessages.indexOf(verificationSucceeded);
      await waitForMessageAfter(
        streamMessages,
        verificationSucceededIndex + 1,
        (message) => {
          if (message.type === "TOOL_APPROVAL_REQUESTED" && message.payload.agent_name === "worker") {
            throw new Error(
              `Unexpected additional worker tool approval after expected verification: ${JSON.stringify(message.payload)}`,
            );
          }
          return message.type === "ASSISTANT_COMPLETE" && message.payload.agent_name === "worker";
        },
        "worker ASSISTANT_COMPLETE after expected verification",
      );
      await waitForMessageAfter(
        streamMessages,
        toolStartIndex,
        (message) =>
          message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.status === "idle",
        "worker AGENT_STATUS IDLE",
      );

      expect(await readFile(targetAbsolutePath, "utf-8")).toContain(expectedContent);

      const terminateMutation = `
        mutation TerminateAgentTeamRun($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `;
      const terminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

      const restoreMutation = `
        mutation RestoreAgentTeamRun($teamRunId: String!) {
          restoreAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
            teamRunId
          }
        }
      `;
      const restoreResult = await execGraphql<{
        restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(restoreMutation, { teamRunId });
      expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
      expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);

      const restoreToken = `TEAM_RESTORE_${randomUUID().replace(/-/g, "_")}`;
      const restoreStartIndex = streamMessages.length;
      sendE2eSendMessageCommand(teamSocket, {
            target_member_route_key: "worker",
            content: `Reply with exactly ${restoreToken} and nothing else.`,
          });

      await waitForMessageAfter(
        streamMessages,
        restoreStartIndex,
        (message) => assistantTextMatches(message, "worker", restoreToken),
        `worker assistant text containing ${restoreToken}`,
      );
      await waitForMessageAfter(
        streamMessages,
        restoreStartIndex,
        (message) =>
          message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.status === "idle",
        "worker AGENT_STATUS IDLE after restore",
      );
    } finally {
      teamSocket.close();
      await streamApp.close();

      const terminateMutation = `
        mutation TerminateAgentTeamRun($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `;
      await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId }).catch(() => undefined);
    }
  }, 240_000);

  it("interrupts a live AutoByteus team pending tool approval and accepts a targeted follow-up message on the same websocket", async () => {
    const llmModelIdentifier = await fetchModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "autobyteus-team-interrupt-workspace-"));
    createdWorkspaceRoots.add(workspaceRootPath);
    const teamRunId = await createSingleWorkerTeamRun({
      llmModelIdentifier,
      workspaceRootPath,
      autoExecuteTools: false,
    });

    const { app, socket, messages } = await openTeamSocket(teamRunId);
    const terminateMutation = `
      mutation TerminateAgentTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) {
          success
          message
        }
      }
    `;

    try {
      const targetRelativePath = `team-interrupt-${randomUUID().replace(/-/g, "_")}.txt`;
      const targetAbsolutePath = path.join(workspaceRootPath, targetRelativePath);
      const expectedContent = `TEAM_INTERRUPT_SHOULD_NOT_WRITE_${randomUUID().replace(/-/g, "_")}`;
      const interruptStartIndex = messages.length;

      sendE2eSendMessageCommand(socket, {
            target_member_route_key: "worker",
            content:
              `Create the file ${targetRelativePath} with exactly this content: ${expectedContent}. ` +
              "Use the write_file tool exactly once, perform the real tool call, and do not answer with plain text.",
          });

      const approvalRequested = await waitForMessageAfter(
        messages,
        interruptStartIndex,
        (message) =>
          message.type === "TOOL_APPROVAL_REQUESTED" && message.payload.agent_name === "worker",
        "worker TOOL_APPROVAL_REQUESTED before interrupt",
      );
      const invocationId = resolveInvocationId(approvalRequested.payload);
      expect(invocationId).toBeTruthy();
      const workerRunId =
        typeof approvalRequested.payload.agent_id === "string" &&
        approvalRequested.payload.agent_id.trim().length > 0
          ? approvalRequested.payload.agent_id.trim()
          : undefined;

      socket.send(
        JSON.stringify({
          type: "INTERRUPT_GENERATION",
          payload: {
            command_id: "client_interrupt_autobyteus_team_worker",
            target_member_route_key: "worker",
            ...(workerRunId ? { target_member_run_id: workerRunId } : {}),
          },
        }),
      );

      await waitForMessageAfter(
        messages,
        interruptStartIndex,
        (message) =>
          message.type === "AGENT_COMMAND_ACK" &&
          message.payload.command_id === "client_interrupt_autobyteus_team_worker" &&
          message.payload.state === "accepted",
        "worker accepted interrupt command acknowledgement",
      );

      await waitForMessageAfter(
        messages,
        interruptStartIndex,
        (message) =>
          message.type === "TOOL_EXECUTION_INTERRUPTED" &&
          message.payload.agent_name === "worker" &&
          resolveInvocationId(message.payload) === invocationId,
        "worker TOOL_EXECUTION_INTERRUPTED after interrupt",
      );
      await waitForMessageAfter(
        messages,
        interruptStartIndex,
        (message) => message.type === "TURN_INTERRUPTED" && message.payload.agent_name === "worker",
        "worker TURN_INTERRUPTED after interrupt",
      );
      await waitForMessageAfter(
        messages,
        interruptStartIndex,
        (message) =>
          message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.status === "idle",
        "worker AGENT_STATUS IDLE after interrupt",
      );
      await expect(readFile(targetAbsolutePath, "utf-8")).rejects.toMatchObject({
        code: "ENOENT",
      });

      const followUpToken = `TEAM_INTERRUPT_FOLLOWUP_${randomUUID().replace(/-/g, "_")}`;
      const followUpStartIndex = messages.length;
      sendE2eSendMessageCommand(socket, {
            target_member_route_key: "worker",
            content: `Reply with exactly ${followUpToken} and nothing else.`,
          });

      await waitForMessageAfter(
        messages,
        followUpStartIndex,
        (message) => assistantTextMatches(message, "worker", followUpToken),
        `worker assistant text containing ${followUpToken} after interrupt`,
      );
      await waitForMessageAfter(
        messages,
        followUpStartIndex,
        (message) =>
          message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.status === "idle",
        "worker AGENT_STATUS IDLE after interrupt follow-up",
      );
    } finally {
      socket.close();
      await app.close();
      await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId }).catch(() => undefined);
    }
  }, 240_000);

  it("terminates a live AutoByteus team pending tool approval, restores it, and accepts a targeted follow-up message on the same websocket", async () => {
    const llmModelIdentifier = await fetchModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "autobyteus-team-active-terminate-workspace-"));
    createdWorkspaceRoots.add(workspaceRootPath);
    const teamRunId = await createSingleWorkerTeamRun({
      llmModelIdentifier,
      workspaceRootPath,
      autoExecuteTools: false,
    });

    const { app, socket, messages } = await openTeamSocket(teamRunId);
    const terminateMutation = `
      mutation TerminateAgentTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) {
          success
          message
        }
      }
    `;
    const restoreMutation = `
      mutation RestoreAgentTeamRun($teamRunId: String!) {
        restoreAgentTeamRun(teamRunId: $teamRunId) {
          success
          message
          teamRunId
        }
      }
    `;

    try {
      const targetRelativePath = `team-terminate-${randomUUID().replace(/-/g, "_")}.txt`;
      const targetAbsolutePath = path.join(workspaceRootPath, targetRelativePath);
      const expectedContent = `TEAM_TERMINATE_SHOULD_NOT_WRITE_${randomUUID().replace(/-/g, "_")}`;
      const terminateStartIndex = messages.length;

      sendE2eSendMessageCommand(socket, {
            target_member_route_key: "worker",
            content:
              `Create the file ${targetRelativePath} with exactly this content: ${expectedContent}. ` +
              "Use the write_file tool exactly once, perform the real tool call, and do not answer with plain text.",
          });

      await waitForMessageAfter(
        messages,
        terminateStartIndex,
        (message) =>
          message.type === "TOOL_APPROVAL_REQUESTED" && message.payload.agent_name === "worker",
        "worker TOOL_APPROVAL_REQUESTED before active terminate",
      );

      const terminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(terminateResult.terminateAgentTeamRun.success).toBe(true);
      await expect(readFile(targetAbsolutePath, "utf-8")).rejects.toMatchObject({
        code: "ENOENT",
      });

      const restoreResult = await execGraphql<{
        restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(restoreMutation, { teamRunId });
      expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
      expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);

      const followUpToken = `TEAM_TERMINATE_FOLLOWUP_${randomUUID().replace(/-/g, "_")}`;
      const followUpStartIndex = messages.length;
      sendE2eSendMessageCommand(socket, {
            target_member_route_key: "worker",
            content: `Reply with exactly ${followUpToken} and nothing else.`,
          });

      await waitForMessageAfter(
        messages,
        followUpStartIndex,
        (message) => assistantTextMatches(message, "worker", followUpToken),
        `worker assistant text containing ${followUpToken} after active terminate restore`,
      );
      await waitForMessageAfter(
        messages,
        followUpStartIndex,
        (message) =>
          message.type === "AGENT_STATUS" &&
          message.payload.agent_name === "worker" &&
          message.payload.status === "idle",
        "worker AGENT_STATUS IDLE after active terminate restore follow-up",
      );
    } finally {
      socket.close();
      await app.close();
      await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId }).catch(() => undefined);
    }
  }, 240_000);

  it("serves every team member projection after terminate, restore, and continue", async () => {
    const llmModelIdentifier = await fetchModelIdentifier();
    const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "autobyteus-team-projection-workspace-"));
    createdWorkspaceRoots.add(workspaceRootPath);

    const coordinatorAgentDefinitionId = await createAgentDefinition("coordinator");
    const reviewerAgentDefinitionId = await createAgentDefinition("reviewer");

    const createTeamDefinitionMutation = `
      mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
        }
      }
    `;
    const teamDefinitionResult = await execGraphql<{
      createAgentTeamDefinition: { id: string };
    }>(createTeamDefinitionMutation, {
      input: {
        name: `autobyteus-team-projection-${randomUUID()}`,
        description: "AutoByteus team projection API e2e team",
        instructions: "Reply concisely.",
        coordinatorMemberName: "coordinator",
        nodes: [
          {
            memberName: "coordinator",
            ref: coordinatorAgentDefinitionId,
            refType: "AGENT",
            refScope: "SHARED",
          },
          {
            memberName: "reviewer",
            ref: reviewerAgentDefinitionId,
            refType: "AGENT",
            refScope: "SHARED",
          },
        ],
      },
    });
    const teamDefinitionId = teamDefinitionResult.createAgentTeamDefinition.id;

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
            memberName: "coordinator",
            agentDefinitionId: coordinatorAgentDefinitionId,
            llmModelIdentifier,
            autoExecuteTools: true,
            skillAccessMode: "NONE",
            runtimeKind: "autobyteus",
            workspaceRootPath,
          },
          {
            memberName: "reviewer",
            agentDefinitionId: reviewerAgentDefinitionId,
            llmModelIdentifier,
            autoExecuteTools: true,
            skillAccessMode: "NONE",
            runtimeKind: "autobyteus",
            workspaceRootPath,
          },
        ],
      },
    });
    expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
    const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;

    const teamResumeQuery = `
      query TeamResume($teamRunId: String!) {
        getTeamRunResumeConfig(teamRunId: $teamRunId) {
          metadata
        }
      }
    `;
    const projectionQuery = `
      query TeamMemberProjection($teamRunId: String!, $memberRouteKey: String!) {
        getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
          agentRunId
          summary
          lastActivityAt
          conversation
        }
      }
    `;
    const terminateMutation = `
      mutation TerminateAgentTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) {
          success
          message
        }
      }
    `;
    const restoreMutation = `
      mutation RestoreAgentTeamRun($teamRunId: String!) {
        restoreAgentTeamRun(teamRunId: $teamRunId) {
          success
          message
          teamRunId
        }
      }
    `;

    const streamApp = fastify();
    await streamApp.register(websocket);
    await registerAgentWebsocket(streamApp);
    const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
    const streamUrl = new URL(streamAddress);
    const teamSocket = new WebSocket(
      `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
    );
    const streamMessages: WsMessage[] = [];
    teamSocket.on("message", (raw) => {
      const parsed = parseWsMessage(raw);
      if (parsed) {
        streamMessages.push(parsed);
      }
    });
    await waitForSocketOpen(teamSocket);
    await waitForMessage(streamMessages, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);

    type TeamMemberProjection = {
      agentRunId: string;
      summary: string | null;
      lastActivityAt: string | null;
      conversation: Array<Record<string, unknown>>;
    };

    const resumeResult = await execGraphql<{
      getTeamRunResumeConfig: { metadata: Record<string, unknown> };
    }>(teamResumeQuery, { teamRunId });
    const memberBindings = flattenE2eTeamMemberMetadata(resumeResult.getTeamRunResumeConfig.metadata);
    const coordinatorBinding = memberBindings.find((member) => member.memberName === "coordinator");
    const reviewerBinding = memberBindings.find((member) => member.memberName === "reviewer");
    expect(coordinatorBinding).toBeTruthy();
    expect(reviewerBinding).toBeTruthy();
    if (!coordinatorBinding || !reviewerBinding) {
      throw new Error("Expected both AutoByteus team member bindings to be present.");
    }

    const members = [
      {
        memberName: "coordinator",
        binding: coordinatorBinding,
        firstToken: `TEAM_PROJECTION_COORDINATOR_FIRST_${randomUUID().replace(/-/g, "_")}`,
        secondToken: `TEAM_PROJECTION_COORDINATOR_SECOND_${randomUUID().replace(/-/g, "_")}`,
      },
      {
        memberName: "reviewer",
        binding: reviewerBinding,
        firstToken: `TEAM_PROJECTION_REVIEWER_FIRST_${randomUUID().replace(/-/g, "_")}`,
        secondToken: `TEAM_PROJECTION_REVIEWER_SECOND_${randomUUID().replace(/-/g, "_")}`,
      },
    ];

    const fetchProjection = async (memberRouteKey: string): Promise<TeamMemberProjection> => {
      const result = await execGraphql<{
        getTeamMemberRunProjection: TeamMemberProjection;
      }>(projectionQuery, { teamRunId, memberRouteKey });
      return result.getTeamMemberRunProjection;
    };

    const waitForProjectionTokens = async (
      memberRouteKey: string,
      requiredTokens: string[],
    ): Promise<TeamMemberProjection> => {
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        const projection = await fetchProjection(memberRouteKey);
        const serializedConversation = JSON.stringify(projection.conversation);
        if (requiredTokens.every((token) => serializedConversation.includes(token))) {
          return projection;
        }
        await wait(2_000);
      }
      throw new Error(
        `Timed out waiting for AutoByteus projection tokens: ${requiredTokens.join(", ")}`,
      );
    };

    const expectTerminatedProjection = async (
      member: (typeof members)[number],
      requiredTokens: string[],
    ): Promise<void> => {
      const projection = await fetchProjection(member.binding.memberRouteKey);
      if (member.binding.memberRunId) {
        expect(projection.agentRunId).toBe(member.binding.memberRunId);
      } else {
        expect(projection.agentRunId).toBeTruthy();
      }
      const serializedConversation = JSON.stringify(projection.conversation);
      for (const token of requiredTokens) {
        expect(serializedConversation).toContain(token);
      }
    };

    try {
      for (const member of members) {
        const startIndex = streamMessages.length;
        sendE2eSendMessageCommand(teamSocket, {
          content: `Reply with exactly ${member.firstToken} and nothing else.`,
          target_member_route_key: member.binding.memberRouteKey,
        });

        await waitForMessageAfter(
          streamMessages,
          startIndex,
          (message) => assistantTextMatches(message, member.memberName, member.firstToken),
          `${member.memberName} assistant text containing ${member.firstToken}`,
        );
        await waitForMessageAfter(
          streamMessages,
          startIndex,
          (message) =>
            message.type === "AGENT_STATUS" &&
            message.payload.agent_name === member.memberName &&
            message.payload.status === "idle",
          `${member.memberName} AGENT_STATUS IDLE for first projection turn`,
        );
        await waitForProjectionTokens(member.binding.memberRouteKey, [member.firstToken]);
      }

      const firstTerminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(firstTerminateResult.terminateAgentTeamRun.success).toBe(true);

      for (const member of members) {
        await expectTerminatedProjection(member, [member.firstToken]);
      }

      const restoreResult = await execGraphql<{
        restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(restoreMutation, { teamRunId });
      expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
      expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);

      for (const member of members) {
        const startIndex = streamMessages.length;
        sendE2eSendMessageCommand(teamSocket, {
          content: `Reply with exactly ${member.secondToken} and nothing else.`,
          target_member_route_key: member.binding.memberRouteKey,
        });

        await waitForMessageAfter(
          streamMessages,
          startIndex,
          (message) => assistantTextMatches(message, member.memberName, member.secondToken),
          `${member.memberName} assistant text containing ${member.secondToken}`,
        );
        await waitForMessageAfter(
          streamMessages,
          startIndex,
          (message) =>
            message.type === "AGENT_STATUS" &&
            message.payload.agent_name === member.memberName &&
            message.payload.status === "idle",
          `${member.memberName} AGENT_STATUS IDLE for second projection turn`,
        );
        await waitForProjectionTokens(member.binding.memberRouteKey, [member.firstToken, member.secondToken]);
      }

      const secondTerminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(secondTerminateResult.terminateAgentTeamRun.success).toBe(true);

      for (const member of members) {
        await expectTerminatedProjection(member, [member.firstToken, member.secondToken]);
      }
    } finally {
      teamSocket.close();
      await streamApp.close();
      await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId }).catch(() => undefined);
    }
  }, 300_000);
});
