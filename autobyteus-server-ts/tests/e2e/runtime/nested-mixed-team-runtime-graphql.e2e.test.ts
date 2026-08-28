import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
} from "../../../src/config/server-runtime-endpoints.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import type {
  ConfiguredAgentExecutionDto,
  ConfiguredMemberExecutionDto,
  ConfiguredTeamExecutionDto,
  TeamRunExecutionTreeDto,
} from "@autobyteus/team-stream-contracts";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import {
  closeLiveRuntimeSecretVault,
  initializeLiveRuntimeSecretVaultFromEnvironment,
} from "../helpers/live-runtime-secret-vault-helpers.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen3.6-35b-a3b";
const codexBinaryReady =
  spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const claudeBinaryReady =
  spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;
const liveNestedMixedTestsEnabled =
  process.env.RUN_LMSTUDIO_E2E === "1" &&
  process.env.RUN_CODEX_E2E === "1" &&
  process.env.RUN_CLAUDE_E2E === "1";
const describeNestedMixedRuntime =
  codexBinaryReady && claudeBinaryReady && liveNestedMixedTestsEnabled
    ? describe
    : describe.skip;
const originalCodexApprovalPolicy =
  process.env.CODEX_APP_SERVER_APPROVAL_POLICY;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

const waitForMessageAfter = async (
  messages: WsMessage[],
  startIndex: number,
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 240_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.slice(startIndex).find(predicate);
    if (match) {
      return match;
    }
    await wait(500);
  }

  const preview = messages
    .slice(Math.max(0, messages.length - 35))
    .map(
      (message) =>
        `${message.type}:${JSON.stringify(message.payload).slice(0, 260)}`,
    )
    .join(" | ");
  throw new Error(
    `Timed out waiting for team websocket message '${label}'. preview='${preview}'`,
  );
};

const messageTextContains = (message: WsMessage, token: string): boolean => {
  if (message.type === "SEGMENT_CONTENT") {
    return (
      message.payload.segment_type === "text" &&
      typeof message.payload.delta === "string" &&
      message.payload.delta.includes(token)
    );
  }
  if (message.type === "SEGMENT_END") {
    const item =
      message.payload.item &&
      typeof message.payload.item === "object" &&
      !Array.isArray(message.payload.item)
        ? (message.payload.item as Record<string, unknown>)
        : null;
    const text =
      typeof message.payload.text === "string"
        ? message.payload.text
        : typeof item?.text === "string"
          ? item.text
          : null;
    return text !== null && text.includes(token);
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

const waitForAssistantTextAfter = async (
  messages: WsMessage[],
  startIndex: number,
  input: { agentRunId: string; token: string; label: string },
  timeoutMs = 240_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const agentMessages = messages.slice(startIndex).filter(
      (message) => message.payload.agent_run_id === input.agentRunId,
    );
    if (agentMessages.some((message) => messageTextContains(message, input.token))) {
      return;
    }
    const streamedText = agentMessages
      .filter(
        (message) =>
          message.type === "SEGMENT_CONTENT" &&
          message.payload.segment_type === "text" &&
          typeof message.payload.delta === "string",
      )
      .map((message) => message.payload.delta as string)
      .join("");
    if (streamedText.includes(input.token)) return;
    await wait(500);
  }
  throw new Error(
    `Timed out waiting for team websocket assistant text '${input.label}' from '${input.agentRunId}'.`,
  );
};

const sendTeamMessageOverSocket = (
  socket: WebSocket,
  input: {
    content: string;
    agentRunId: string;
  },
): void => {
  sendE2eSendMessageCommand(socket, {
    content: input.content,
    agent_run_id: input.agentRunId,
    context_file_paths: [],
    image_urls: [],
  });
};

const findConfiguredMember = (
  members: readonly ConfiguredMemberExecutionDto[],
  address: string,
): ConfiguredMemberExecutionDto => {
  for (const member of members) {
    if (member.address === address) return member;
    if (member.kind === "configured_team") {
      const nested = findConfiguredMemberOrNull(member.members, address);
      if (nested) return nested;
    }
  }
  throw new Error(`Configured member '${address}' was not found.`);
};

const findConfiguredMemberOrNull = (
  members: readonly ConfiguredMemberExecutionDto[],
  address: string,
): ConfiguredMemberExecutionDto | null => {
  for (const member of members) {
    if (member.address === address) return member;
    if (member.kind === "configured_team") {
      const nested = findConfiguredMemberOrNull(member.members, address);
      if (nested) return nested;
    }
  }
  return null;
};

const requireConfiguredAgent = (
  tree: TeamRunExecutionTreeDto,
  address: string,
): ConfiguredAgentExecutionDto => {
  const member = findConfiguredMember(tree.root_team.members, address);
  expect(member.kind).toBe("configured_agent");
  return member as ConfiguredAgentExecutionDto;
};

const requireConfiguredTeam = (
  tree: TeamRunExecutionTreeDto,
  address: string,
): ConfiguredTeamExecutionDto => {
  const member = findConfiguredMember(tree.root_team.members, address);
  expect(member.kind).toBe("configured_team");
  return member as ConfiguredTeamExecutionDto;
};

const collectConfiguredAgentRunIds = (
  members: readonly ConfiguredMemberExecutionDto[],
): string[] => {
  const agentRunIds: string[] = [];
  for (const member of members) {
    if (member.kind === "configured_agent") agentRunIds.push(member.agent_run_id);
    else agentRunIds.push(...collectConfiguredAgentRunIds(member.members));
  }
  return agentRunIds;
};

const communicationRecord = (
  message: WsMessage,
): Record<string, unknown> | null => {
  const value = message.payload.message;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
};

describeNestedMixedRuntime(
  "Nested mixed team runtime GraphQL e2e (live Codex + Claude + AutoByteus)",
  () => {
    let schema: GraphQLSchema;
    let graphql: typeof graphqlFn;
    let testDataDir: string | null = null;
    let runtimeServerApp: FastifyInstance | null = null;
    let runtimeServerUrl: URL;
    let originalInternalServerBaseUrl: string | undefined;
    const createdAgentDefinitionIds = new Set<string>();
    const createdTeamDefinitionIds = new Set<string>();
    const createdTeamRunIds = new Set<string>();
    const createdWorkspaceRoots = new Set<string>();

    beforeAll(async () => {
      originalInternalServerBaseUrl =
        process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
      process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
      testDataDir = await mkdtemp(
        path.join(os.tmpdir(), "nested-mixed-team-e2e-appdata-"),
      );
      await writeFile(
        path.join(testDataDir, ".env"),
        "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
        "utf-8",
      );
      appConfigProvider.config.setCustomAppDataDir(testDataDir);
      await initializeLiveRuntimeSecretVaultFromEnvironment();
      const require = createRequire(import.meta.url);
      const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
      const graphqlPath = require.resolve("graphql", {
        paths: [typeGraphqlRoot],
      });
      const graphqlModule = await import(graphqlPath);
      graphql = graphqlModule.graphql as typeof graphqlFn;

      const started = await startStudioE2eRuntimeServer();
      runtimeServerApp = started.fastify;
      runtimeServerUrl = started.mainUrl;
      schema = await buildGraphqlSchema();
    });

    afterAll(async () => {
      if (typeof originalCodexApprovalPolicy === "string") {
        process.env.CODEX_APP_SERVER_APPROVAL_POLICY =
          originalCodexApprovalPolicy;
      } else {
        delete process.env.CODEX_APP_SERVER_APPROVAL_POLICY;
      }
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
      await closeLiveRuntimeSecretVault();
      for (const root of createdWorkspaceRoots) {
        await rm(root, { recursive: true, force: true });
      }
      createdWorkspaceRoots.clear();
      if (testDataDir) {
        await rm(testDataDir, { recursive: true, force: true });
        testDataDir = null;
      }
    });

    afterEach(async () => {
      const exec = async <T>(
        query: string,
        variables?: Record<string, unknown>,
      ): Promise<T | null> => {
        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
        });
        return result.errors?.length ? null : (result.data as T);
      };

      const terminateTeamRunMutation = `
      mutation TerminateAgentTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) {
          success
        }
      }
    `;
      for (const teamRunId of createdTeamRunIds) {
        await exec(terminateTeamRunMutation, { teamRunId });
      }
      createdTeamRunIds.clear();

      const deleteTeamDefinitionMutation = `
      mutation DeleteAgentTeamDefinition($id: String!) {
        deleteAgentTeamDefinition(id: $id) {
          success
        }
      }
    `;
      for (const id of Array.from(createdTeamDefinitionIds).reverse()) {
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

      for (const root of createdWorkspaceRoots) {
        await rm(root, { recursive: true, force: true });
      }
      createdWorkspaceRoots.clear();
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

    const fetchAutoByteusModelIdentifier = async (): Promise<string> => {
      const query = `
      query Models($runtimeKind: String) {
        providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
          llmModels { modelIdentifier }
        }
      }
    `;
      const result = await execGraphql<{
        providerModelCatalogSnapshots: Array<{
          llmModels: Array<{ modelIdentifier: string }>;
        }>;
      }>(query, { runtimeKind: RuntimeKind.AUTOBYTEUS });
      const modelIdentifiers = result.providerModelCatalogSnapshots.flatMap(
        (provider) =>
          provider.llmModels.map((model) => model.modelIdentifier).filter(Boolean),
      );
      if (modelIdentifiers.length === 0) {
        throw new Error(
          "No AutoByteus/LMStudio model identifier was returned.",
        );
      }
      const exactOverride = process.env.LMSTUDIO_MODEL_ID?.trim();
      if (exactOverride && modelIdentifiers.includes(exactOverride)) {
        return exactOverride;
      }
      const preferredFragment =
        process.env.LMSTUDIO_TARGET_TEXT_MODEL ?? DEFAULT_LMSTUDIO_TEXT_MODEL;
      return (
        modelIdentifiers.find((modelIdentifier) =>
          modelIdentifier.includes(preferredFragment),
        ) ??
        modelIdentifiers.find((modelIdentifier) =>
          modelIdentifier.toLowerCase().includes("qwen"),
        ) ??
        modelIdentifiers[0]!
      );
    };

    const fetchPreferredCodexModelIdentifier = async (): Promise<string> => {
      const query = `
      query Models($runtimeKind: String) {
        providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
          llmModels { modelIdentifier }
        }
      }
    `;
      const result = await execGraphql<{
        providerModelCatalogSnapshots: Array<{
          llmModels: Array<{ modelIdentifier: string }>;
        }>;
      }>(query, { runtimeKind: RuntimeKind.CODEX_APP_SERVER });
      const modelIdentifiers = result.providerModelCatalogSnapshots.flatMap(
        (provider) =>
          provider.llmModels.map((model) => model.modelIdentifier).filter(Boolean),
      );
      if (modelIdentifiers.length === 0) {
        throw new Error("No Codex runtime model identifier was returned.");
      }
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
      return (
        modelIdentifiers.find((modelIdentifier) =>
          modelIdentifier.includes("codex"),
        ) ?? modelIdentifiers[0]!
      );
    };

    const fetchPreferredClaudeModelIdentifier = async (): Promise<string> => {
      const query = `
      query Models($runtimeKind: String) {
        providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
          llmModels { modelIdentifier }
        }
      }
    `;
      const result = await execGraphql<{
        providerModelCatalogSnapshots: Array<{
          llmModels: Array<{ modelIdentifier: string }>;
        }>;
      }>(query, { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK });
      const modelIdentifiers = result.providerModelCatalogSnapshots.flatMap(
        (provider) =>
          provider.llmModels.map((model) => model.modelIdentifier).filter(Boolean),
      );
      if (modelIdentifiers.length === 0) {
        throw new Error("No Claude runtime model identifier was returned.");
      }
      return modelIdentifiers.includes("haiku")
        ? "haiku"
        : modelIdentifiers[0]!;
    };

    const createAgentDefinition = async (input: {
      name: string;
      description: string;
      instructions: string;
    }): Promise<string> => {
      const mutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) { id }
      }
    `;
      const result = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(mutation, {
        input: {
          name: input.name,
          role: "assistant",
          description: input.description,
          instructions: input.instructions,
          category: "runtime-e2e",
          toolNames: ["send_message_to"],
        },
      });
      createdAgentDefinitionIds.add(result.createAgentDefinition.id);
      return result.createAgentDefinition.id;
    };

    const fetchExecutionTree = async (
      teamRunId: string,
    ): Promise<TeamRunExecutionTreeDto> => {
      const query = `
      query TeamResume($teamRunId: String!) {
        getTeamRunResumeConfig(teamRunId: $teamRunId) {
          teamRunId
          isActive
          executionTree
        }
      }
    `;
      const result = await execGraphql<{
        getTeamRunResumeConfig: {
          teamRunId: string;
          isActive: boolean;
          executionTree: TeamRunExecutionTreeDto;
        };
      }>(query, { teamRunId });
      expect(result.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
      expect(result.getTeamRunResumeConfig.isActive).toBe(true);
      return result.getTeamRunResumeConfig.executionTree;
    };

    const openTeamSocket = async (
      teamRunId: string,
    ): Promise<{
      socket: WebSocket;
      messages: WsMessage[];
    }> => {
      const streamUrl = runtimeServerUrl;
      const socket = new WebSocket(
        `ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`,
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

    it("launches a real nested mixed team, routes parent/subteam/child messages across AutoByteus, Codex, and Claude, preserves recursive metadata, and restores", async () => {
      const unique = randomUUID().replace(/-/g, "_");
      const autoByteusModelIdentifier = await fetchAutoByteusModelIdentifier();
      const codexModelIdentifier = await fetchPreferredCodexModelIdentifier();
      const claudeModelIdentifier = await fetchPreferredClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(
        path.join(os.tmpdir(), "nested-mixed-team-workspace-"),
      );
      createdWorkspaceRoots.add(workspaceRootPath);

      const commonInstructions = `
You are participating in a live nested mixed-runtime team validation.

Rules:
1. Follow direct user instructions exactly.
2. Do not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. If the user asks you to call send_message_to with explicit JSON arguments, call send_message_to exactly once with those exact arguments and do not call any other tool.
5. If you receive a teammate message that asks for an exact token, reply in plain assistant text with that exact token and nothing else.
6. Do not use send_message_to unless the current direct user instruction explicitly provides JSON arguments for it.
7. Otherwise keep assistant text responses very short.
`;

      const programManagerAgentId = await createAgentDefinition({
        name: `nested-program-manager-${unique}`,
        description:
          "AutoByteus parent coordinator for live nested mixed-team validation.",
        instructions: commonInstructions,
      });
      const reviewLeadAgentId = await createAgentDefinition({
        name: `nested-review-lead-${unique}`,
        description:
          "Codex child coordinator for live nested mixed-team validation.",
        instructions: commonInstructions,
      });
      const qaSpecialistAgentId = await createAgentDefinition({
        name: `nested-qa-specialist-${unique}`,
        description:
          "Claude child teammate for live nested mixed-team validation.",
        instructions: commonInstructions,
      });

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) { id }
        }
      `;
      const childTeamDefinitionResult = await execGraphql<{
        createAgentTeamDefinition: { id: string };
      }>(createTeamDefinitionMutation, {
        input: {
          name: `nested-build-squad-${unique}`,
          description:
            "Nested child squad with Codex coordinator and Claude QA specialist.",
          instructions:
            "Review lead coordinates with QA specialist for nested team validation only.",
          coordinatorMemberName: "review_lead",
          nodes: [
            {
              memberName: "review_lead",
              ref: reviewLeadAgentId,
              refType: "AGENT",
              refScope: "SHARED",
            },
            {
              memberName: "qa_specialist",
              ref: qaSpecialistAgentId,
              refType: "AGENT",
              refScope: "SHARED",
            },
          ],
        },
      });
      const childTeamDefinitionId =
        childTeamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(childTeamDefinitionId);

      const parentTeamDefinitionResult = await execGraphql<{
        createAgentTeamDefinition: { id: string };
      }>(createTeamDefinitionMutation, {
        input: {
          name: `nested-parent-delivery-team-${unique}`,
          description:
            "Parent team with AutoByteus coordinator and nested build squad.",
          instructions:
            "Program manager delegates work to the nested build squad.",
          coordinatorMemberName: "program_manager",
          nodes: [
            {
              memberName: "program_manager",
              ref: programManagerAgentId,
              refType: "AGENT",
              refScope: "SHARED",
            },
            {
              memberName: "BuildSquad",
              ref: childTeamDefinitionId,
              refType: "AGENT_TEAM",
              refScope: "SHARED",
            },
          ],
        },
      });
      const parentTeamDefinitionId =
        parentTeamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(parentTeamDefinitionId);

      const createTeamRunMutation = `
        mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
          createAgentTeamRun(input: $input) { success message teamRunId }
        }
      `;
      const createTeamRunResult = await execGraphql<{
        createAgentTeamRun: {
          success: boolean;
          message: string;
          teamRunId: string | null;
        };
      }>(createTeamRunMutation, {
        input: {
          teamDefinitionId: parentTeamDefinitionId,
          teamConfigs: [
            {
              teamAddress: "/",
              llmModelIdentifier: autoByteusModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              workspaceRootPath,
            },
            {
              teamAddress: "/BuildSquad",
              llmModelIdentifier: codexModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              workspaceRootPath,
            },
          ],
          memberConfigs: [
            {
              memberAddress: "/program_manager",
              agentDefinitionId: programManagerAgentId,
              llmModelIdentifier: autoByteusModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              workspaceRootPath,
            },
            {
              memberAddress: "/BuildSquad/review_lead",
              agentDefinitionId: reviewLeadAgentId,
              llmModelIdentifier: codexModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              workspaceRootPath,
            },
            {
              memberAddress: "/BuildSquad/qa_specialist",
              agentDefinitionId: qaSpecialistAgentId,
              llmModelIdentifier: claudeModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
              workspaceRootPath,
            },
          ],
        },
      });
      expect(createTeamRunResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamRunResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamRunResult.createAgentTeamRun
        .teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const activeParentRun =
        AgentTeamRunManager.getInstance().getActiveTeamRun(teamRunId);
      expect(activeParentRun?.teamRunId).toBe(teamRunId);
      expect(activeParentRun?.isActive()).toBe(true);

      const initialExecutionTree = await fetchExecutionTree(teamRunId);
      const initialProgramManager = requireConfiguredAgent(
        initialExecutionTree,
        "/program_manager",
      );
      const initialReviewLead = requireConfiguredAgent(
        initialExecutionTree,
        "/BuildSquad/review_lead",
      );
      const initialQaSpecialist = requireConfiguredAgent(
        initialExecutionTree,
        "/BuildSquad/qa_specialist",
      );

      const parentToSubteamToken = `NESTED_PARENT_TO_SUBTEAM_${unique}`;
      const childToClaudeToken = `NESTED_CODEX_TO_CLAUDE_${unique}`;
      const postRestoreToken = `NESTED_RESTORED_SUBTEAM_${unique}`;

      const firstConnection = await openTeamSocket(teamRunId);
      try {
        const parentDelegationStartIndex = firstConnection.messages.length;
        const parentDelegationArgs = JSON.stringify({
          recipient_address: "/BuildSquad/review_lead",
          content: `Reply with exactly ${parentToSubteamToken} and nothing else.`,
          message_type: "nested_parent_to_subteam",
        });
        sendTeamMessageOverSocket(firstConnection.socket, {
          agentRunId: initialProgramManager.agent_run_id,
          content: `Call send_message_to exactly once now with these exact JSON arguments: ${parentDelegationArgs}. Do not call any other tool.`,
        });

        await waitForMessageAfter(
          firstConnection.messages,
          parentDelegationStartIndex,
          (message) => {
            if (message.type !== "TEAM_COMMUNICATION_MESSAGE") return false;
            const record = communicationRecord(message);
            return record?.sender_agent_run_id === initialProgramManager.agent_run_id &&
              record.receiver_agent_run_id === initialReviewLead.agent_run_id &&
              record.content === `Reply with exactly ${parentToSubteamToken} and nothing else.`;
          },
          "parent communication event to represented child receiver",
        );

        await waitForAssistantTextAfter(
          firstConnection.messages,
          parentDelegationStartIndex,
          {
            agentRunId: initialReviewLead.agent_run_id,
            token: parentToSubteamToken,
            label: "child coordinator response bridged to parent stream",
          },
        );

        const childDelegationStartIndex = firstConnection.messages.length;
        sendTeamMessageOverSocket(firstConnection.socket, {
          agentRunId: initialQaSpecialist.agent_run_id,
          content: `Reply with exactly ${childToClaudeToken} and nothing else.`,
        });

        await waitForAssistantTextAfter(
          firstConnection.messages,
          childDelegationStartIndex,
          {
            agentRunId: initialQaSpecialist.agent_run_id,
            token: childToClaudeToken,
            label: "Claude child teammate response bridged to parent stream",
          },
        );
      } finally {
        await closeSocket(firstConnection.socket);
      }

      await wait(2_500);
      const executionTreeBeforeTerminate = await fetchExecutionTree(teamRunId);
      const parentMember = requireConfiguredAgent(
        executionTreeBeforeTerminate,
        "/program_manager",
      );
      const subTeamMember = requireConfiguredTeam(
        executionTreeBeforeTerminate,
        "/BuildSquad",
      );
      expect(parentMember.launch_configuration.runtime_kind).toBe("AUTOBYTEUS");
      expect(parentMember.platform_agent_run_id).toBeNull();
      const childTeamRunId = subTeamMember.team_run_id;
      expect(childTeamRunId).toBeTruthy();
      const reviewLeadBefore = requireConfiguredAgent(
        executionTreeBeforeTerminate,
        "/BuildSquad/review_lead",
      );
      const qaSpecialistBefore = requireConfiguredAgent(
        executionTreeBeforeTerminate,
        "/BuildSquad/qa_specialist",
      );
      expect(reviewLeadBefore.launch_configuration.runtime_kind).toBe("CODEX");
      expect(qaSpecialistBefore.launch_configuration.runtime_kind).toBe("CLAUDE");
      expect(reviewLeadBefore.platform_agent_run_id).toBeTruthy();
      expect(qaSpecialistBefore.platform_agent_run_id).toBeTruthy();

      const activeTeamRuns =
        AgentTeamRunManager.getInstance().listActiveTeamRunIds();
      expect(activeTeamRuns).toContain(teamRunId);
      expect(activeTeamRuns).not.toContain(childTeamRunId);

      const workspaceHistory = await execGraphql<{
        listWorkspaceRunHistory: Array<{
          teamDefinitions: Array<{ runs: Array<{ teamRunId: string }> }>;
        }>;
      }>(
        `
          query WorkspaceRunHistory($limitPerAgent: Int!) {
            listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
              teamDefinitions { runs { teamRunId } }
            }
          }
        `,
        { limitPerAgent: 20 },
      );
      const listedTeamRunIds = workspaceHistory.listWorkspaceRunHistory.flatMap(
        (workspace) =>
          workspace.teamDefinitions.flatMap((teamDefinition) =>
            teamDefinition.runs.map((run) => run.teamRunId),
          ),
      );
      expect(listedTeamRunIds).toContain(teamRunId);
      expect(listedTeamRunIds).not.toContain(childTeamRunId);

      const leafRunIdsBeforeTerminate = collectConfiguredAgentRunIds(
        executionTreeBeforeTerminate.root_team.members,
      );
      const terminateMutation = `
        mutation TerminateAgentTeamRun($teamRunId: String!) {
          terminateAgentTeamRun(teamRunId: $teamRunId) { success message }
        }
      `;
      const terminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(terminateResult.terminateAgentTeamRun.success).toBe(true);
      const managedTeamRunsAfterTerminate =
        AgentTeamRunManager.getInstance().listManagedTeamRunIds();
      expect(managedTeamRunsAfterTerminate).not.toContain(teamRunId);
      expect(managedTeamRunsAfterTerminate).not.toContain(childTeamRunId);
      const activeAgentRunIdsAfterTerminate =
        AgentRunManager.getInstance().listActiveRuns();
      for (const leafRunId of leafRunIdsBeforeTerminate) {
        expect(activeAgentRunIdsAfterTerminate).not.toContain(leafRunId);
      }

      const restoreMutation = `
        mutation RestoreAgentTeamRun($teamRunId: String!) {
          restoreAgentTeamRun(teamRunId: $teamRunId) { success message teamRunId }
        }
      `;
      const restoreResult = await execGraphql<{
        restoreAgentTeamRun: {
          success: boolean;
          message: string;
          teamRunId: string | null;
        };
      }>(restoreMutation, { teamRunId });
      expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
      expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);
      const activeTeamRunsAfterRestore =
        AgentTeamRunManager.getInstance().listActiveTeamRunIds();
      expect(activeTeamRunsAfterRestore).toContain(teamRunId);
      expect(activeTeamRunsAfterRestore).not.toContain(childTeamRunId);

      const restoredExecutionTree = await fetchExecutionTree(teamRunId);
      const restoredReviewLead = requireConfiguredAgent(
        restoredExecutionTree,
        "/BuildSquad/review_lead",
      );
      const restoredConnection = await openTeamSocket(teamRunId);
      try {
        const postRestoreStartIndex = restoredConnection.messages.length;
        sendTeamMessageOverSocket(restoredConnection.socket, {
          agentRunId: restoredReviewLead.agent_run_id,
          content: `Reply with exactly ${postRestoreToken} and nothing else.`,
        });
        await waitForAssistantTextAfter(
          restoredConnection.messages,
          postRestoreStartIndex,
          {
            agentRunId: restoredReviewLead.agent_run_id,
            token: postRestoreToken,
            label: "restored child coordinator response bridged to parent stream",
          },
        );
      } finally {
        await closeSocket(restoredConnection.socket);
      }

      await wait(2_500);
      const executionTreeAfterRestore = await fetchExecutionTree(teamRunId);
      const restoredSubTeam = requireConfiguredTeam(
        executionTreeAfterRestore,
        "/BuildSquad",
      );
      expect(restoredSubTeam.team_run_id).toBe(childTeamRunId);
      const restoredReviewLeadAfterMessage = requireConfiguredAgent(
        executionTreeAfterRestore,
        "/BuildSquad/review_lead",
      );
      const restoredQaSpecialistAfterMessage = requireConfiguredAgent(
        executionTreeAfterRestore,
        "/BuildSquad/qa_specialist",
      );
      expect(restoredReviewLeadAfterMessage.platform_agent_run_id).toBe(
        reviewLeadBefore.platform_agent_run_id,
      );
      expect(restoredQaSpecialistAfterMessage.platform_agent_run_id).toBe(
        qaSpecialistBefore.platform_agent_run_id,
      );

      const finalTerminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(finalTerminateResult.terminateAgentTeamRun.success).toBe(true);
    }, 720_000);
  },
);
