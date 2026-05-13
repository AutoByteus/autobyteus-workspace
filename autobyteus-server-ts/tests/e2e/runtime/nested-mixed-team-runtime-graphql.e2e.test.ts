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
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen/qwen3.5-35b-a3b";
const codexBinaryReady = spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const claudeBinaryReady = spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;
const liveNestedMixedTestsEnabled =
  process.env.RUN_LMSTUDIO_E2E === "1" &&
  process.env.RUN_CODEX_E2E === "1" &&
  process.env.RUN_CLAUDE_E2E === "1";
const describeNestedMixedRuntime =
  codexBinaryReady && claudeBinaryReady && liveNestedMixedTestsEnabled ? describe : describe.skip;
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

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type MetadataMember = {
  memberKind: "agent" | "agent_team";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: string | null;
  platformAgentRunId?: string | null;
  teamRunId?: string | null;
  memberTree?: MetadataMember[];
};

type TeamRunMetadataPayload = {
  teamRunId: string;
  memberTree: MetadataMember[];
};

const parseWsMessage = (raw: WebSocket.RawData): WsMessage | null => {
  try {
    const parsed = JSON.parse(raw.toString()) as { type?: unknown; payload?: unknown };
    if (typeof parsed.type !== "string") {
      return null;
    }
    const payload =
      parsed.payload && typeof parsed.payload === "object" && !Array.isArray(parsed.payload)
        ? (parsed.payload as Record<string, unknown>)
        : {};
    return { type: parsed.type, payload };
  } catch {
    return null;
  }
};

const samePath = (value: unknown, expected: string[]): boolean =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every((entry, index) => entry === expected[index]);

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
    .map((message) => `${message.type}:${JSON.stringify(message.payload).slice(0, 260)}`)
    .join(" | ");
  throw new Error(`Timed out waiting for team websocket message '${label}'. preview='${preview}'`);
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

const assistantTextMatches = (
  message: WsMessage,
  input: { memberName: string; sourcePath: string[]; token: string },
): boolean =>
  message.payload.agent_name === input.memberName &&
  samePath(message.payload.source_path, input.sourcePath) &&
  messageTextContains(message, input.token);

const sendTeamMessageOverSocket = (
  socket: WebSocket,
  input: {
    content: string;
    targetMemberName?: string | null;
    targetMemberPath?: string[] | null;
  },
): void => {
  socket.send(
    JSON.stringify({
      type: "SEND_MESSAGE",
      payload: {
        content: input.content,
        ...(input.targetMemberPath ? { target_member_path: input.targetMemberPath } : {}),
        target_member_name: input.targetMemberName ?? null,
        context_file_paths: [],
        image_urls: [],
      },
    }),
  );
};

const findMember = (
  members: MetadataMember[],
  memberName: string,
): MetadataMember => {
  const member = members.find((candidate) => candidate.memberName === memberName) ?? null;
  expect(member).toBeTruthy();
  return member as MetadataMember;
};

const collectLeafMembers = (members: MetadataMember[]): MetadataMember[] => {
  const leafMembers: MetadataMember[] = [];
  for (const member of members) {
    if (member.memberKind === "agent") {
      leafMembers.push(member);
    } else {
      leafMembers.push(...collectLeafMembers(member.memberTree ?? []));
    }
  }
  return leafMembers;
};

describeNestedMixedRuntime("Nested mixed team runtime GraphQL e2e (live Codex + Claude + AutoByteus)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string | null = null;
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();
  const createdTeamRunIds = new Set<string>();
  const createdWorkspaceRoots = new Set<string>();

  beforeAll(async () => {
    process.env.CODEX_APP_SERVER_APPROVAL_POLICY = "untrusted";
    testDataDir = await mkdtemp(path.join(os.tmpdir(), "nested-mixed-team-e2e-appdata-"));
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
    const exec = async <T>(query: string, variables?: Record<string, unknown>): Promise<T | null> => {
      const result = await graphql({ schema, source: query, variableValues: variables });
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

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const fetchAutoByteusModelIdentifier = async (): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
          models { modelIdentifier }
        }
      }
    `;
    const result = await execGraphql<{
      availableLlmProvidersWithModels: Array<{ models: Array<{ modelIdentifier: string }> }>;
    }>(query, { runtimeKind: RuntimeKind.AUTOBYTEUS });
    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models.map((model) => model.modelIdentifier).filter(Boolean),
    );
    if (modelIdentifiers.length === 0) {
      throw new Error("No AutoByteus/LMStudio model identifier was returned.");
    }
    const exactOverride = process.env.LMSTUDIO_MODEL_ID?.trim();
    if (exactOverride && modelIdentifiers.includes(exactOverride)) {
      return exactOverride;
    }
    const preferredFragment = process.env.LMSTUDIO_TARGET_TEXT_MODEL ?? DEFAULT_LMSTUDIO_TEXT_MODEL;
    return (
      modelIdentifiers.find((modelIdentifier) => modelIdentifier.includes(preferredFragment)) ??
      modelIdentifiers.find((modelIdentifier) => modelIdentifier.toLowerCase().includes("qwen")) ??
      modelIdentifiers[0]!
    );
  };

  const fetchPreferredCodexModelIdentifier = async (): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
          models { modelIdentifier }
        }
      }
    `;
    const result = await execGraphql<{
      availableLlmProvidersWithModels: Array<{ models: Array<{ modelIdentifier: string }> }>;
    }>(query, { runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models.map((model) => model.modelIdentifier).filter(Boolean),
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
    return modelIdentifiers.find((modelIdentifier) => modelIdentifier.includes("codex")) ?? modelIdentifiers[0]!;
  };

  const fetchPreferredClaudeModelIdentifier = async (): Promise<string> => {
    const query = `
      query Models($runtimeKind: String) {
        availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
          models { modelIdentifier }
        }
      }
    `;
    const result = await execGraphql<{
      availableLlmProvidersWithModels: Array<{ models: Array<{ modelIdentifier: string }> }>;
    }>(query, { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK });
    const modelIdentifiers = result.availableLlmProvidersWithModels.flatMap((provider) =>
      provider.models.map((model) => model.modelIdentifier).filter(Boolean),
    );
    if (modelIdentifiers.length === 0) {
      throw new Error("No Claude runtime model identifier was returned.");
    }
    return modelIdentifiers.includes("haiku") ? "haiku" : modelIdentifiers[0]!;
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
    const result = await execGraphql<{ createAgentDefinition: { id: string } }>(mutation, {
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

  const fetchMetadata = async (teamRunId: string): Promise<TeamRunMetadataPayload> => {
    const query = `
      query TeamResume($teamRunId: String!) {
        getTeamRunResumeConfig(teamRunId: $teamRunId) {
          teamRunId
          isActive
          metadata
        }
      }
    `;
    const result = await execGraphql<{
      getTeamRunResumeConfig: { teamRunId: string; isActive: boolean; metadata: TeamRunMetadataPayload };
    }>(query, { teamRunId });
    expect(result.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
    return result.getTeamRunResumeConfig.metadata;
  };

  const openTeamSocket = async (teamRunId: string): Promise<{
    streamApp: ReturnType<typeof fastify>;
    socket: WebSocket;
    messages: WsMessage[];
  }> => {
    const streamApp = fastify();
    await streamApp.register(websocket);
    await registerAgentWebsocket(streamApp);
    const streamAddress = await streamApp.listen({ port: 0, host: "127.0.0.1" });
    const streamUrl = new URL(streamAddress);
    const socket = new WebSocket(`ws://${streamUrl.hostname}:${streamUrl.port}/ws/agent-team/${teamRunId}`);
    const messages: WsMessage[] = [];
    socket.on("message", (raw) => {
      const parsed = parseWsMessage(raw);
      if (parsed) {
        messages.push(parsed);
      }
    });
    await waitForSocketOpen(socket);
    await waitForMessageAfter(messages, 0, (message) => message.type === "CONNECTED", "CONNECTED", 15_000);
    return { streamApp, socket, messages };
  };

  it(
    "launches a real nested mixed team, routes parent/subteam/child messages across AutoByteus, Codex, and Claude, preserves recursive metadata, and restores",
    async () => {
      const unique = randomUUID().replace(/-/g, "_");
      const autoByteusModelIdentifier = await fetchAutoByteusModelIdentifier();
      const codexModelIdentifier = await fetchPreferredCodexModelIdentifier();
      const claudeModelIdentifier = await fetchPreferredClaudeModelIdentifier();
      const workspaceRootPath = await mkdtemp(path.join(os.tmpdir(), "nested-mixed-team-workspace-"));
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
        description: "AutoByteus parent coordinator for live nested mixed-team validation.",
        instructions: commonInstructions,
      });
      const reviewLeadAgentId = await createAgentDefinition({
        name: `nested-review-lead-${unique}`,
        description: "Codex child coordinator for live nested mixed-team validation.",
        instructions: commonInstructions,
      });
      const qaSpecialistAgentId = await createAgentDefinition({
        name: `nested-qa-specialist-${unique}`,
        description: "Claude child teammate for live nested mixed-team validation.",
        instructions: commonInstructions,
      });

      const createTeamDefinitionMutation = `
        mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) { id }
        }
      `;
      const childTeamDefinitionResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `nested-build-squad-${unique}`,
            description: "Nested child squad with Codex coordinator and Claude QA specialist.",
            instructions: "Review lead coordinates with QA specialist for nested team validation only.",
            coordinatorMemberName: "review_lead",
            nodes: [
              { memberName: "review_lead", ref: reviewLeadAgentId, refType: "AGENT", refScope: "SHARED" },
              { memberName: "qa_specialist", ref: qaSpecialistAgentId, refType: "AGENT", refScope: "SHARED" },
            ],
          },
        },
      );
      const childTeamDefinitionId = childTeamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(childTeamDefinitionId);

      const parentTeamDefinitionResult = await execGraphql<{ createAgentTeamDefinition: { id: string } }>(
        createTeamDefinitionMutation,
        {
          input: {
            name: `nested-parent-delivery-team-${unique}`,
            description: "Parent team with AutoByteus coordinator and nested build squad.",
            instructions: "Program manager delegates work to the nested build squad.",
            coordinatorMemberName: "program_manager",
            nodes: [
              { memberName: "program_manager", ref: programManagerAgentId, refType: "AGENT", refScope: "SHARED" },
              { memberName: "BuildSquad", ref: childTeamDefinitionId, refType: "AGENT_TEAM" },
            ],
          },
        },
      );
      const parentTeamDefinitionId = parentTeamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(parentTeamDefinitionId);

      const createTeamRunMutation = `
        mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
          createAgentTeamRun(input: $input) { success message teamRunId }
        }
      `;
      const createTeamRunResult = await execGraphql<{
        createAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(createTeamRunMutation, {
        input: {
          teamDefinitionId: parentTeamDefinitionId,
          memberConfigs: [
            {
              memberName: "program_manager",
              memberRouteKey: "program_manager",
              agentDefinitionId: programManagerAgentId,
              llmModelIdentifier: autoByteusModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              workspaceRootPath,
            },
            {
              memberName: "review_lead",
              memberRouteKey: "BuildSquad/review_lead",
              agentDefinitionId: reviewLeadAgentId,
              llmModelIdentifier: codexModelIdentifier,
              autoExecuteTools: true,
              skillAccessMode: "NONE",
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              workspaceRootPath,
            },
            {
              memberName: "qa_specialist",
              memberRouteKey: "BuildSquad/qa_specialist",
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
      const teamRunId = createTeamRunResult.createAgentTeamRun.teamRunId as string;
      createdTeamRunIds.add(teamRunId);

      const activeParentRun = AgentTeamRunManager.getInstance().getTeamRun(teamRunId);
      expect(activeParentRun?.teamBackendKind).toBe(TeamBackendKind.MIXED);
      expect(activeParentRun?.config?.memberTree.map((member) => member.memberName)).toEqual([
        "program_manager",
        "BuildSquad",
      ]);

      const parentToSubteamToken = `NESTED_PARENT_TO_SUBTEAM_${unique}`;
      const childToClaudeToken = `NESTED_CODEX_TO_CLAUDE_${unique}`;
      const postRestoreToken = `NESTED_RESTORED_SUBTEAM_${unique}`;

      const firstConnection = await openTeamSocket(teamRunId);
      try {
        const parentDelegationStartIndex = firstConnection.messages.length;
        const parentDelegationArgs = JSON.stringify({
          recipient_name: "review_lead",
          content: `Reply with exactly ${parentToSubteamToken} and nothing else.`,
          message_type: "nested_parent_to_subteam",
        });
        sendTeamMessageOverSocket(firstConnection.socket, {
          targetMemberName: "program_manager",
          content: `Call send_message_to exactly once now with these exact JSON arguments: ${parentDelegationArgs}. Do not call any other tool.`,
        });

        await waitForMessageAfter(
          firstConnection.messages,
          parentDelegationStartIndex,
          (message) =>
            message.type === "TEAM_COMMUNICATION_MESSAGE" &&
            samePath(message.payload.source_path, ["program_manager"]) &&
            message.payload.senderMemberKind === "agent" &&
            message.payload.senderMemberName === "program_manager" &&
            samePath(message.payload.senderMemberPath, ["program_manager"]) &&
            message.payload.senderMemberRouteKey === "program_manager" &&
            message.payload.receiverMemberKind === "agent" &&
            message.payload.receiverMemberName === "review_lead" &&
            samePath(message.payload.receiverMemberPath, ["BuildSquad", "review_lead"]) &&
            message.payload.receiverMemberRouteKey === "BuildSquad/review_lead" &&
            typeof message.payload.receiverRepresentedSubTeam === "object" &&
            !Array.isArray(message.payload.receiverRepresentedSubTeam) &&
            (message.payload.receiverRepresentedSubTeam as Record<string, unknown>).memberName === "BuildSquad" &&
            (message.payload.receiverRepresentedSubTeam as Record<string, unknown>).memberRouteKey === "BuildSquad" &&
            message.payload.receiver === undefined &&
            message.payload.content === `Reply with exactly ${parentToSubteamToken} and nothing else.`,
          "parent communication event to represented child receiver",
        );

        await waitForMessageAfter(
          firstConnection.messages,
          parentDelegationStartIndex,
          (message) =>
            assistantTextMatches(message, {
              memberName: "review_lead",
              sourcePath: ["BuildSquad", "review_lead"],
              token: parentToSubteamToken,
            }),
          "child coordinator response bridged to parent stream",
        );

        const childDelegationStartIndex = firstConnection.messages.length;
        const childDelegationArgs = JSON.stringify({
          recipient_name: "qa_specialist",
          content: `Reply with exactly ${childToClaudeToken} and nothing else.`,
          message_type: "nested_child_codex_to_claude",
        });
        sendTeamMessageOverSocket(firstConnection.socket, {
          targetMemberName: "BuildSquad",
          content: `Call send_message_to exactly once now with these exact JSON arguments: ${childDelegationArgs}. Do not call any other tool.`,
        });

        await waitForMessageAfter(
          firstConnection.messages,
          childDelegationStartIndex,
          (message) =>
            message.type === "TOOL_EXECUTION_SUCCEEDED" &&
            message.payload.agent_name === "review_lead" &&
            samePath(message.payload.source_path, ["BuildSquad", "review_lead"]) &&
            message.payload.tool_name === "send_message_to",
          "child coordinator send_message_to tool execution",
        );

        await waitForMessageAfter(
          firstConnection.messages,
          childDelegationStartIndex,
          (message) =>
            assistantTextMatches(message, {
              memberName: "qa_specialist",
              sourcePath: ["BuildSquad", "qa_specialist"],
              token: childToClaudeToken,
            }),
          "Claude child teammate response bridged to parent stream",
        );
      } finally {
        firstConnection.socket.close();
        await firstConnection.streamApp.close();
      }

      await wait(2_500);
      const metadataBeforeTerminate = await fetchMetadata(teamRunId);
      const parentMember = findMember(metadataBeforeTerminate.memberTree, "program_manager");
      const subTeamMember = findMember(metadataBeforeTerminate.memberTree, "BuildSquad");
      expect(parentMember.memberKind).toBe("agent");
      expect(parentMember.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
      expect(parentMember.platformAgentRunId).toBeTruthy();
      expect(subTeamMember.memberKind).toBe("agent_team");
      expect(subTeamMember.teamRunId).toBeTruthy();
      const childTeamRunId = subTeamMember.teamRunId as string;
      const reviewLeadBefore = findMember(subTeamMember.memberTree ?? [], "review_lead");
      const qaSpecialistBefore = findMember(subTeamMember.memberTree ?? [], "qa_specialist");
      expect(reviewLeadBefore.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
      expect(qaSpecialistBefore.runtimeKind).toBe(RuntimeKind.CLAUDE_AGENT_SDK);
      expect(reviewLeadBefore.platformAgentRunId).toBeTruthy();
      expect(qaSpecialistBefore.platformAgentRunId).toBeTruthy();

      const activeTeamRuns = AgentTeamRunManager.getInstance().listActiveRuns();
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
      const listedTeamRunIds = workspaceHistory.listWorkspaceRunHistory.flatMap((workspace) =>
        workspace.teamDefinitions.flatMap((teamDefinition) =>
          teamDefinition.runs.map((run) => run.teamRunId),
        ),
      );
      expect(listedTeamRunIds).toContain(teamRunId);
      expect(listedTeamRunIds).not.toContain(childTeamRunId);

      const leafRunIdsBeforeTerminate = collectLeafMembers(metadataBeforeTerminate.memberTree).map(
        (member) => member.memberRunId,
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
      expect(AgentTeamRunManager.getInstance().listActiveRuns()).not.toContain(teamRunId);
      expect(AgentTeamRunManager.getInstance().listActiveRuns()).not.toContain(childTeamRunId);
      const activeAgentRunIdsAfterTerminate = AgentRunManager.getInstance().listActiveRuns();
      for (const leafRunId of leafRunIdsBeforeTerminate) {
        expect(activeAgentRunIdsAfterTerminate).not.toContain(leafRunId);
      }

      const restoreMutation = `
        mutation RestoreAgentTeamRun($teamRunId: String!) {
          restoreAgentTeamRun(teamRunId: $teamRunId) { success message teamRunId }
        }
      `;
      const restoreResult = await execGraphql<{
        restoreAgentTeamRun: { success: boolean; message: string; teamRunId: string | null };
      }>(restoreMutation, { teamRunId });
      expect(restoreResult.restoreAgentTeamRun.success).toBe(true);
      expect(restoreResult.restoreAgentTeamRun.teamRunId).toBe(teamRunId);
      const activeTeamRunsAfterRestore = AgentTeamRunManager.getInstance().listActiveRuns();
      expect(activeTeamRunsAfterRestore).toContain(teamRunId);
      expect(activeTeamRunsAfterRestore).not.toContain(childTeamRunId);

      const restoredConnection = await openTeamSocket(teamRunId);
      try {
        const postRestoreStartIndex = restoredConnection.messages.length;
        sendTeamMessageOverSocket(restoredConnection.socket, {
          targetMemberName: "BuildSquad",
          content: `Reply with exactly ${postRestoreToken} and nothing else.`,
        });
        await waitForMessageAfter(
          restoredConnection.messages,
          postRestoreStartIndex,
          (message) =>
            assistantTextMatches(message, {
              memberName: "review_lead",
              sourcePath: ["BuildSquad", "review_lead"],
              token: postRestoreToken,
            }),
          "restored child coordinator response bridged to parent stream",
        );
      } finally {
        restoredConnection.socket.close();
        await restoredConnection.streamApp.close();
      }

      await wait(2_500);
      const metadataAfterRestore = await fetchMetadata(teamRunId);
      const restoredSubTeam = findMember(metadataAfterRestore.memberTree, "BuildSquad");
      expect(restoredSubTeam.teamRunId).toBe(childTeamRunId);
      const restoredReviewLead = findMember(restoredSubTeam.memberTree ?? [], "review_lead");
      const restoredQaSpecialist = findMember(restoredSubTeam.memberTree ?? [], "qa_specialist");
      expect(restoredReviewLead.platformAgentRunId).toBe(reviewLeadBefore.platformAgentRunId);
      expect(restoredQaSpecialist.platformAgentRunId).toBe(qaSpecialistBefore.platformAgentRunId);

      const finalTerminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(terminateMutation, { teamRunId });
      expect(finalTerminateResult.terminateAgentTeamRun.success).toBe(true);
    },
    720_000,
  );
});
