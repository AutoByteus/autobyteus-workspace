import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { Message, MessageRole } from "autobyteus-ts/llm/utils/messages.js";
import { CompleteResponse, ChunkResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import type { TeamRunManifest } from "../../../src/run-history/domain/team-models.js";
import { getTeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { PromptService } from "../../../src/prompt-engineering/services/prompt-service.js";

const listTeamRunHistoryQuery = `
  query ListTeamRunHistory {
    listTeamRunHistory {
      teamRunId
      teamDefinitionId
      teamDefinitionName
      workspaceRootPath
      summary
      lastActivityAt
      lastKnownStatus
      deleteLifecycle
      isActive
      members {
        memberRouteKey
        memberName
        memberRunId
        workspaceRootPath
      }
    }
  }
`;

const getTeamRunResumeConfigQuery = `
  query GetTeamRunResumeConfig($teamRunId: String!) {
    getTeamRunResumeConfig(teamRunId: $teamRunId) {
      teamRunId
      isActive
      manifest
    }
  }
`;

const getTeamMemberRunProjectionQuery = `
  query GetTeamMemberRunProjection($teamRunId: String!, $memberRouteKey: String!) {
    getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
      agentRunId
      summary
      lastActivityAt
      conversation
    }
  }
`;

const deleteTeamRunHistoryMutation = `
  mutation DeleteTeamRunHistory($teamRunId: String!) {
    deleteTeamRunHistory(teamRunId: $teamRunId) {
      success
      message
    }
  }
`;

const sendMessageToTeamMutation = `
  mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
    sendMessageToTeam(input: $input) {
      success
      message
      teamRunId
    }
  }
`;

const createPromptMutation = `
  mutation CreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      id
      name
      category
    }
  }
`;

const createAgentDefinitionMutation = `
  mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
    createAgentDefinition(input: $input) {
      id
      name
    }
  }
`;

const createAgentTeamDefinitionMutation = `
  mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
    createAgentTeamDefinition(input: $input) {
      id
      name
    }
  }
`;

const createAgentTeamRunMutation = `
  mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
    createAgentTeamRun(input: $input) {
      success
      message
      teamRunId
    }
  }
`;

const terminateAgentTeamRunMutation = `
  mutation TerminateAgentTeamRun($id: String!) {
    terminateAgentTeamRun(id: $id) {
      success
      message
    }
  }
`;

const turnOneMarker = "remember-token-restore-e2e";
const turnTwoQuestion = "what did i ask before?";
const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen/qwen3-30b-a3b-2507";
const LMSTUDIO_MODEL_ENV_VAR = "LMSTUDIO_MODEL_ID";
let cachedLmstudioModelIdentifier: string | null = null;

class HistoryAwareDummyLLM extends BaseLLM {
  private buildContent(messages: Message[]): string {
    const userMessages = messages
      .filter((message) => message.role === MessageRole.USER)
      .map((message) => message.content ?? "");
    const sawTurnOneMarker = userMessages.some((content) => content.includes(turnOneMarker));
    const isTurnTwoQuestion = userMessages.some((content) => content.includes(turnTwoQuestion));

    if (isTurnTwoQuestion) {
      return sawTurnOneMarker ? "history_visible=true" : "history_visible=false";
    }
    return "acknowledged";
  }

  protected async _sendMessagesToLLM(messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: this.buildContent(messages) });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({
      content: this.buildContent(messages),
      is_complete: true,
    });
  }
}

const createDummyLLM = (): HistoryAwareDummyLLM => {
  const model = new LLMModel({
    name: "dummy-history-aware",
    value: "dummy-history-aware",
    canonicalName: "dummy-history-aware",
    provider: LLMProvider.OPENAI,
  });
  return new HistoryAwareDummyLLM(model, new LLMConfig({ systemMessage: "test-system" }));
};

const hasLmstudioConfig = (): boolean =>
  Boolean(process.env.LMSTUDIO_HOSTS || process.env[LMSTUDIO_MODEL_ENV_VAR]);

const resolveLmstudioModelIdentifier = async (): Promise<string | null> => {
  if (cachedLmstudioModelIdentifier) {
    return cachedLmstudioModelIdentifier;
  }

  const manualModelId = process.env[LMSTUDIO_MODEL_ENV_VAR];
  if (manualModelId) {
    cachedLmstudioModelIdentifier = manualModelId;
    return manualModelId;
  }

  await LLMFactory.reinitialize();
  const models = await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO);
  if (!models.length) {
    return null;
  }

  const targetTextModel = process.env.LMSTUDIO_TARGET_TEXT_MODEL ?? DEFAULT_LMSTUDIO_TEXT_MODEL;
  const selected =
    models.find((model) => model.model_identifier.includes(targetTextModel)) ??
    models.find((model) => !model.model_identifier.toLowerCase().includes("vl")) ??
    models[0];

  cachedLmstudioModelIdentifier = selected.model_identifier;
  return cachedLmstudioModelIdentifier;
};

const runLmstudioIt = hasLmstudioConfig() ? it : it.skip;

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 15000,
  intervalMs = 100,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms.`);
};

describe("Team run history GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const seededTeamIds = new Set<string>();
  const createdPromptIds = new Set<string>();
  const createdAgentDefinitionIds = new Set<string>();
  const createdTeamDefinitionIds = new Set<string>();

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    const teamRunHistoryService = getTeamRunHistoryService();
    const memoryDir = appConfigProvider.config.getMemoryDir();

    for (const teamRunId of seededTeamIds) {
      await teamRunHistoryService.deleteTeamRunHistory(teamRunId);
      await fs.rm(path.join(memoryDir, "agent_teams", teamRunId), {
        recursive: true,
        force: true,
      });
    }
    seededTeamIds.clear();

    const agentTeamDefinitionService = AgentTeamDefinitionService.getInstance();
    for (const teamDefinitionId of createdTeamDefinitionIds) {
      try {
        await agentTeamDefinitionService.deleteDefinition(teamDefinitionId);
      } catch {
        // Ignore cleanup failures caused by already-deleted records.
      }
    }
    createdTeamDefinitionIds.clear();

    const agentDefinitionService = AgentDefinitionService.getInstance();
    for (const agentDefinitionId of createdAgentDefinitionIds) {
      try {
        await agentDefinitionService.deleteAgentDefinition(agentDefinitionId);
      } catch {
        // Ignore cleanup failures caused by already-deleted records.
      }
    }
    createdAgentDefinitionIds.clear();

    const promptService = PromptService.getInstance();
    for (const promptId of createdPromptIds) {
      try {
        await promptService.deletePrompt(promptId);
      } catch {
        // Ignore cleanup failures caused by already-deleted records.
      }
    }
    createdPromptIds.clear();
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

  const seedTeamRunHistory = async (): Promise<{
    teamRunId: string;
    memberRouteKey: string;
    memberRunId: string;
  }> => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const teamRunId = `team_history_e2e_${unique}`;
    const memberRouteKey = "super_agent";
    const memberRunId = `member_e2e_${unique}`;
    const workspaceRootPath = path.join(os.tmpdir(), `autobyteus-team-history-${unique}`);
    await fs.mkdir(workspaceRootPath, { recursive: true });

    const manifest: TeamRunManifest = {
      teamRunId,
      teamDefinitionId: `team_definition_${unique}`,
      teamDefinitionName: `Team ${unique}`,
      workspaceRootPath,
      coordinatorMemberRouteKey: memberRouteKey,
      runVersion: 1,
      createdAt: "2026-02-15T00:00:00.000Z",
      updatedAt: "2026-02-15T00:00:00.000Z",
      memberBindings: [
        {
          memberRouteKey,
          memberName: "super_agent",
          memberRunId,
          agentDefinitionId: `agent_definition_${unique}`,
          llmModelIdentifier: "e2e-model",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath,
        },
      ],
    };

    await getTeamRunHistoryService().upsertTeamRunHistoryRow({
      teamRunId: teamRunId,
      manifest,
      summary: "team run seeded summary",
      lastKnownStatus: "IDLE",
      lastActivityAt: "2026-02-15T00:00:00.000Z",
    });

    seededTeamIds.add(teamRunId);

    return {
      teamRunId,
      memberRouteKey,
      memberRunId,
    };
  };

  it("lists team run history, returns resume config/projection, and deletes history", async () => {
    const { teamRunId, memberRouteKey, memberRunId } = await seedTeamRunHistory();

    const listResult = await execGraphql<{
      listTeamRunHistory: Array<{
        teamRunId: string;
        summary: string;
        lastKnownStatus: string;
        deleteLifecycle: string;
        isActive: boolean;
        members: Array<{ memberRouteKey: string; memberRunId: string }>;
      }>;
    }>(listTeamRunHistoryQuery);

    const row = listResult.listTeamRunHistory.find((item) => item.teamRunId === teamRunId);
    expect(row).toBeTruthy();
    expect(row?.summary).toBe("team run seeded summary");
    expect(row?.lastKnownStatus).toBe("IDLE");
    expect(row?.deleteLifecycle).toBe("READY");
    expect(row?.isActive).toBe(false);
    expect(row?.members[0]?.memberRouteKey).toBe(memberRouteKey);
    expect(row?.members[0]?.memberRunId).toBe(memberRunId);

    const resumeResult = await execGraphql<{
      getTeamRunResumeConfig: {
        teamRunId: string;
        isActive: boolean;
        manifest: {
          teamRunId: string;
          teamDefinitionId: string;
          workspaceRootPath: string;
        };
      };
    }>(getTeamRunResumeConfigQuery, { teamRunId });

    expect(resumeResult.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
    expect(resumeResult.getTeamRunResumeConfig.isActive).toBe(false);
    expect(resumeResult.getTeamRunResumeConfig.manifest.teamRunId).toBe(teamRunId);

    const projectionResult = await execGraphql<{
      getTeamMemberRunProjection: {
        agentRunId: string;
        conversation: Array<Record<string, unknown>>;
      };
    }>(getTeamMemberRunProjectionQuery, {
      teamRunId,
      memberRouteKey,
    });

    expect(projectionResult.getTeamMemberRunProjection.agentRunId).toBe(memberRunId);
    expect(Array.isArray(projectionResult.getTeamMemberRunProjection.conversation)).toBe(true);

    const deleteResult = await execGraphql<{
      deleteTeamRunHistory: { success: boolean; message: string };
    }>(deleteTeamRunHistoryMutation, { teamRunId });

    expect(deleteResult.deleteTeamRunHistory.success).toBe(true);
    expect(deleteResult.deleteTeamRunHistory.message).toContain(teamRunId);

    seededTeamIds.delete(teamRunId);
  });

  it("continues an offline team run for an existing teamRunId", async () => {
    const { teamRunId } = await seedTeamRunHistory();

    const manager = AgentTeamRunManager.getInstance();
    let active = false;
    const postMessage = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(manager, "getTeamRun").mockImplementation((id: string) => {
      if (id !== teamRunId || !active) {
        return null;
      }
      return {
        teamRunId,
        postMessage,
      } as any;
    });

    vi.spyOn(manager, "createTeamRunWithId").mockImplementation(async (id: string) => {
      if (id === teamRunId) {
        active = true;
      }
      return id;
    });

    const result = await execGraphql<{
      sendMessageToTeam: {
        success: boolean;
        message: string;
        teamRunId: string | null;
      };
    }>(sendMessageToTeamMutation, {
      input: {
        teamRunId,
        targetMemberName: "super_agent",
        userInput: {
          content: "hello continuation",
          contextFiles: [],
        },
      },
    });

    expect(result.sendMessageToTeam.success).toBe(true);
    expect(result.sendMessageToTeam.teamRunId).toBe(teamRunId);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(expect.any(Object), "super_agent");
  });

  it("persists team member memory and restores it after terminate/continue", async () => {
    vi.spyOn(LLMFactory, "createLLM").mockImplementation(async () => createDummyLLM());
    vi.spyOn(LLMFactory, "getProvider").mockResolvedValue(LLMProvider.OPENAI);

    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const promptName = `team_history_prompt_${unique}`;
    const promptCategory = `team_history_category_${unique}`;
    const workspaceRootPath = path.join(os.tmpdir(), `team-history-workspace-${unique}`);
    await fs.mkdir(workspaceRootPath, { recursive: true });

    const promptResult = await execGraphql<{
      createPrompt: { id: string };
    }>(createPromptMutation, {
      input: {
        name: promptName,
        category: promptCategory,
        promptContent: "You are a concise assistant.",
      },
    });
    createdPromptIds.add(promptResult.createPrompt.id);

    const agentDefinitionResult = await execGraphql<{
      createAgentDefinition: { id: string };
    }>(createAgentDefinitionMutation, {
      input: {
        name: `history-agent-${unique}`,
        role: "assistant",
        description: "History restore test agent",
        systemPromptCategory: promptCategory,
        systemPromptName: promptName,
      },
    });
    const agentDefinitionId = agentDefinitionResult.createAgentDefinition.id;
    createdAgentDefinitionIds.add(agentDefinitionId);

    const teamDefinitionResult = await execGraphql<{
      createAgentTeamDefinition: { id: string };
    }>(createAgentTeamDefinitionMutation, {
      input: {
        name: `history-team-${unique}`,
        description: "History restore team",
        coordinatorMemberName: "professor",
        nodes: [
          {
            memberName: "professor",
            referenceId: agentDefinitionId,
            referenceType: "AGENT",
          },
        ],
      },
    });
    const teamDefinitionId = teamDefinitionResult.createAgentTeamDefinition.id;
    createdTeamDefinitionIds.add(teamDefinitionId);

    const createTeamResult = await execGraphql<{
      createAgentTeamRun: {
        success: boolean;
        teamRunId: string | null;
        message: string;
      };
    }>(createAgentTeamRunMutation, {
      input: {
        teamDefinitionId,
        memberConfigs: [
          {
            memberName: "professor",
            agentDefinitionId,
            llmModelIdentifier: "dummy-history-aware-model",
            autoExecuteTools: false,
            workspaceRootPath,
          },
        ],
      },
    });
    expect(createTeamResult.createAgentTeamRun.success).toBe(true);
    expect(createTeamResult.createAgentTeamRun.teamRunId).toBeTruthy();
    const teamRunId = createTeamResult.createAgentTeamRun.teamRunId as string;
    seededTeamIds.add(teamRunId);

    const firstSendResult = await execGraphql<{
      sendMessageToTeam: { success: boolean; teamRunId: string | null; message: string };
    }>(sendMessageToTeamMutation, {
      input: {
        teamRunId,
        targetMemberName: "professor",
        userInput: {
          content: `please remember ${turnOneMarker}`,
          contextFiles: [],
        },
      },
    });
    expect(firstSendResult.sendMessageToTeam.success).toBe(true);
    expect(firstSendResult.sendMessageToTeam.teamRunId).toBe(teamRunId);

    const resumeResult = await execGraphql<{
      getTeamRunResumeConfig: {
        teamRunId: string;
        manifest: {
          memberBindings: Array<{
            memberName: string;
            memberRouteKey: string;
            memberRunId: string;
          }>;
        };
      };
    }>(getTeamRunResumeConfigQuery, { teamRunId });

    const binding = resumeResult.getTeamRunResumeConfig.manifest.memberBindings.find(
      (candidate) => candidate.memberName === "professor",
    );
    expect(binding).toBeTruthy();
    const memberRouteKey = binding?.memberRouteKey ?? "professor";
    const memberRunId = binding?.memberRunId as string;

    const memoryDir = appConfigProvider.config.getMemoryDir();
    const rawTraceFile = path.join(memoryDir, "agents", memberRunId, "raw_traces.jsonl");
    const snapshotFile = path.join(
      memoryDir,
      "agents",
      memberRunId,
      "working_context_snapshot.json",
    );

    await waitFor(async () => {
      try {
        const rawTrace = await fs.readFile(rawTraceFile, "utf-8");
        return rawTrace.includes(turnOneMarker);
      } catch {
        return false;
      }
    });

    await waitFor(async () => {
      try {
        await fs.access(snapshotFile);
        return true;
      } catch {
        return false;
      }
    });

    const terminateResult = await execGraphql<{
      terminateAgentTeamRun: { success: boolean; message: string };
    }>(terminateAgentTeamRunMutation, { id: teamRunId });
    expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

    const continueResult = await execGraphql<{
      sendMessageToTeam: { success: boolean; teamRunId: string | null; message: string };
    }>(sendMessageToTeamMutation, {
      input: {
        teamRunId,
        targetMemberName: memberRouteKey,
        userInput: {
          content: turnTwoQuestion,
          contextFiles: [],
        },
      },
    });
    expect(continueResult.sendMessageToTeam.success).toBe(true);
    expect(continueResult.sendMessageToTeam.teamRunId).toBe(teamRunId);

    let projection: {
      summary: string | null;
      conversation: Array<{ role?: string; content?: string | null }>;
    } | null = null;

    await waitFor(async () => {
      const projectionResult = await execGraphql<{
        getTeamMemberRunProjection: {
          summary: string | null;
          conversation: Array<{ role?: string; content?: string | null }>;
        };
      }>(getTeamMemberRunProjectionQuery, {
        teamRunId,
        memberRouteKey,
      });
      projection = projectionResult.getTeamMemberRunProjection;
      return projection.conversation.some((entry) =>
        String(entry.content ?? "").includes("history_visible=true"),
      );
    });

    expect(projection).toBeTruthy();
    expect(projection?.conversation.some((entry) => String(entry.content ?? "").includes(turnOneMarker))).toBe(true);
    expect(projection?.conversation.some((entry) => String(entry.content ?? "").includes("history_visible=true"))).toBe(true);
    expect(projection?.summary).toContain(turnOneMarker);
  });

  it("restores targeted professor member in a multi-member team after terminate/continue", async () => {
    vi.spyOn(LLMFactory, "createLLM").mockImplementation(async () => createDummyLLM());
    vi.spyOn(LLMFactory, "getProvider").mockResolvedValue(LLMProvider.OPENAI);

    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const promptName = `team_history_prompt_multi_${unique}`;
    const promptCategory = `team_history_category_multi_${unique}`;
    const workspaceRootPath = path.join(os.tmpdir(), `team-history-multi-workspace-${unique}`);
    await fs.mkdir(workspaceRootPath, { recursive: true });

    const promptResult = await execGraphql<{
      createPrompt: { id: string };
    }>(createPromptMutation, {
      input: {
        name: promptName,
        category: promptCategory,
        promptContent: "You are a concise assistant.",
      },
    });
    createdPromptIds.add(promptResult.createPrompt.id);

    const professorDefinitionResult = await execGraphql<{
      createAgentDefinition: { id: string };
    }>(createAgentDefinitionMutation, {
      input: {
        name: `history-professor-${unique}`,
        role: "assistant",
        description: "History restore test professor agent",
        systemPromptCategory: promptCategory,
        systemPromptName: promptName,
      },
    });
    const professorDefinitionId = professorDefinitionResult.createAgentDefinition.id;
    createdAgentDefinitionIds.add(professorDefinitionId);

    const studentDefinitionResult = await execGraphql<{
      createAgentDefinition: { id: string };
    }>(createAgentDefinitionMutation, {
      input: {
        name: `history-student-${unique}`,
        role: "assistant",
        description: "History restore test student agent",
        systemPromptCategory: promptCategory,
        systemPromptName: promptName,
      },
    });
    const studentDefinitionId = studentDefinitionResult.createAgentDefinition.id;
    createdAgentDefinitionIds.add(studentDefinitionId);

    const teamDefinitionResult = await execGraphql<{
      createAgentTeamDefinition: { id: string };
    }>(createAgentTeamDefinitionMutation, {
      input: {
        name: `history-team-multi-${unique}`,
        description: "History restore multi-member team",
        coordinatorMemberName: "professor",
        nodes: [
          {
            memberName: "professor",
            referenceId: professorDefinitionId,
            referenceType: "AGENT",
          },
          {
            memberName: "student",
            referenceId: studentDefinitionId,
            referenceType: "AGENT",
          },
        ],
      },
    });
    const teamDefinitionId = teamDefinitionResult.createAgentTeamDefinition.id;
    createdTeamDefinitionIds.add(teamDefinitionId);

    const createTeamResult = await execGraphql<{
      createAgentTeamRun: {
        success: boolean;
        teamRunId: string | null;
      };
    }>(createAgentTeamRunMutation, {
      input: {
        teamDefinitionId,
        memberConfigs: [
          {
            memberName: "professor",
            agentDefinitionId: professorDefinitionId,
            llmModelIdentifier: "dummy-history-aware-model",
            autoExecuteTools: false,
            workspaceRootPath,
          },
          {
            memberName: "student",
            agentDefinitionId: studentDefinitionId,
            llmModelIdentifier: "dummy-history-aware-model",
            autoExecuteTools: false,
            workspaceRootPath,
          },
        ],
      },
    });
    expect(createTeamResult.createAgentTeamRun.success).toBe(true);
    expect(createTeamResult.createAgentTeamRun.teamRunId).toBeTruthy();
    const teamRunId = createTeamResult.createAgentTeamRun.teamRunId as string;
    seededTeamIds.add(teamRunId);

    const firstSendResult = await execGraphql<{
      sendMessageToTeam: { success: boolean; teamRunId: string | null };
    }>(sendMessageToTeamMutation, {
      input: {
        teamRunId,
        targetMemberName: "professor",
        userInput: {
          content: `please remember ${turnOneMarker}`,
          contextFiles: [],
        },
      },
    });
    expect(firstSendResult.sendMessageToTeam.success).toBe(true);
    expect(firstSendResult.sendMessageToTeam.teamRunId).toBe(teamRunId);

    const resumeResult = await execGraphql<{
      getTeamRunResumeConfig: {
        manifest: {
          memberBindings: Array<{
            memberName: string;
            memberRouteKey: string;
          }>;
        };
      };
    }>(getTeamRunResumeConfigQuery, { teamRunId });

    const professorRouteKey =
      resumeResult.getTeamRunResumeConfig.manifest.memberBindings.find(
        (candidate) => candidate.memberName === "professor",
      )?.memberRouteKey ?? "professor";

    await waitFor(async () => {
      const projectionResult = await execGraphql<{
        getTeamMemberRunProjection: {
          conversation: Array<{ role?: string; content?: string | null }>;
        };
      }>(getTeamMemberRunProjectionQuery, {
        teamRunId,
        memberRouteKey: professorRouteKey,
      });
      return projectionResult.getTeamMemberRunProjection.conversation.some((entry) =>
        String(entry.content ?? "").includes(turnOneMarker),
      );
    });

    const terminateResult = await execGraphql<{
      terminateAgentTeamRun: { success: boolean };
    }>(terminateAgentTeamRunMutation, { id: teamRunId });
    expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

    const continueResult = await execGraphql<{
      sendMessageToTeam: { success: boolean; teamRunId: string | null };
    }>(sendMessageToTeamMutation, {
      input: {
        teamRunId,
        targetMemberName: professorRouteKey,
        userInput: {
          content: turnTwoQuestion,
          contextFiles: [],
        },
      },
    });
    expect(continueResult.sendMessageToTeam.success).toBe(true);
    expect(continueResult.sendMessageToTeam.teamRunId).toBe(teamRunId);

    let professorProjection: {
      summary: string | null;
      conversation: Array<{ role?: string; content?: string | null }>;
    } | null = null;

    await waitFor(async () => {
      const projectionResult = await execGraphql<{
        getTeamMemberRunProjection: {
          summary: string | null;
          conversation: Array<{ role?: string; content?: string | null }>;
        };
      }>(getTeamMemberRunProjectionQuery, {
        teamRunId,
        memberRouteKey: professorRouteKey,
      });
      professorProjection = projectionResult.getTeamMemberRunProjection;
      return professorProjection.conversation.some((entry) =>
        String(entry.content ?? "").includes("history_visible=true"),
      );
    });

    expect(professorProjection).toBeTruthy();
    expect(
      professorProjection?.conversation.some((entry) =>
        String(entry.content ?? "").includes(turnOneMarker),
      ),
    ).toBe(true);
    expect(
      professorProjection?.conversation.some((entry) =>
        String(entry.content ?? "").includes("history_visible=true"),
      ),
    ).toBe(true);
    expect(professorProjection?.summary).toContain(turnOneMarker);
  }, 20000);

  runLmstudioIt(
    "continues a terminated team with real LM Studio provider and restores recall context (no mocks)",
    async () => {
      const modelIdentifier = await resolveLmstudioModelIdentifier();
      expect(modelIdentifier).toBeTruthy();
      if (!modelIdentifier) {
        return;
      }

      const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const memoryToken = `restore-token-${unique}`;
      const recallPrompt = "What exact token did I ask you to remember earlier? Reply with only that token.";
      const promptName = `team_history_prompt_lmstudio_${unique}`;
      const promptCategory = `team_history_category_lmstudio_${unique}`;
      const workspaceRootPath = path.join(os.tmpdir(), `team-history-lmstudio-workspace-${unique}`);
      await fs.mkdir(workspaceRootPath, { recursive: true });

      const promptResult = await execGraphql<{
        createPrompt: { id: string };
      }>(createPromptMutation, {
        input: {
          name: promptName,
          category: promptCategory,
          promptContent: "You are a concise assistant. Follow user instructions exactly.",
        },
      });
      createdPromptIds.add(promptResult.createPrompt.id);

      const agentDefinitionResult = await execGraphql<{
        createAgentDefinition: { id: string };
      }>(createAgentDefinitionMutation, {
        input: {
          name: `history-lmstudio-agent-${unique}`,
          role: "assistant",
          description: "Real LM Studio continuation restore agent",
          systemPromptCategory: promptCategory,
          systemPromptName: promptName,
        },
      });
      const agentDefinitionId = agentDefinitionResult.createAgentDefinition.id;
      createdAgentDefinitionIds.add(agentDefinitionId);

      const teamDefinitionResult = await execGraphql<{
        createAgentTeamDefinition: { id: string };
      }>(createAgentTeamDefinitionMutation, {
        input: {
          name: `history-team-lmstudio-${unique}`,
          description: "Real LM Studio continuation restore team",
          coordinatorMemberName: "professor",
          nodes: [
            {
              memberName: "professor",
              referenceId: agentDefinitionId,
              referenceType: "AGENT",
            },
          ],
        },
      });
      const teamDefinitionId = teamDefinitionResult.createAgentTeamDefinition.id;
      createdTeamDefinitionIds.add(teamDefinitionId);

      const createTeamResult = await execGraphql<{
        createAgentTeamRun: {
          success: boolean;
          teamRunId: string | null;
        };
      }>(createAgentTeamRunMutation, {
        input: {
          teamDefinitionId,
          memberConfigs: [
            {
              memberName: "professor",
              agentDefinitionId,
              llmModelIdentifier: modelIdentifier,
              autoExecuteTools: false,
              llmConfig: { temperature: 0 },
              workspaceRootPath,
            },
          ],
        },
      });
      expect(createTeamResult.createAgentTeamRun.success).toBe(true);
      expect(createTeamResult.createAgentTeamRun.teamRunId).toBeTruthy();
      const teamRunId = createTeamResult.createAgentTeamRun.teamRunId as string;
      seededTeamIds.add(teamRunId);

      const firstSendResult = await execGraphql<{
        sendMessageToTeam: { success: boolean; teamRunId: string | null };
      }>(sendMessageToTeamMutation, {
        input: {
          teamRunId,
          targetMemberName: "professor",
          userInput: {
            content: `Remember this exact token for later: ${memoryToken}. Respond now with only OK.`,
            contextFiles: [],
          },
        },
      });
      expect(firstSendResult.sendMessageToTeam.success).toBe(true);
      expect(firstSendResult.sendMessageToTeam.teamRunId).toBe(teamRunId);

      const resumeResult = await execGraphql<{
        getTeamRunResumeConfig: {
          manifest: {
            memberBindings: Array<{
              memberName: string;
              memberRouteKey: string;
              memberRunId: string;
            }>;
          };
        };
      }>(getTeamRunResumeConfigQuery, { teamRunId });

      const binding = resumeResult.getTeamRunResumeConfig.manifest.memberBindings.find(
        (candidate) => candidate.memberName === "professor",
      );
      expect(binding).toBeTruthy();
      const professorRouteKey = binding?.memberRouteKey ?? "professor";
      const memberRunId = binding?.memberRunId as string;

      const memoryDir = appConfigProvider.config.getMemoryDir();
      const rawTraceFile = path.join(memoryDir, "agents", memberRunId, "raw_traces.jsonl");
      const snapshotFile = path.join(
        memoryDir,
        "agents",
        memberRunId,
        "working_context_snapshot.json",
      );

      await waitFor(async () => {
        try {
          const rawTrace = await fs.readFile(rawTraceFile, "utf-8");
          return rawTrace.includes(memoryToken);
        } catch {
          return false;
        }
      }, 60000);

      await waitFor(async () => {
        try {
          await fs.access(snapshotFile);
          return true;
        } catch {
          return false;
        }
      }, 60000);

      let baselineTokenMentions = 0;
      await waitFor(async () => {
        const projectionResult = await execGraphql<{
          getTeamMemberRunProjection: {
            conversation: Array<{ content?: string | null }>;
          };
        }>(getTeamMemberRunProjectionQuery, {
          teamRunId,
          memberRouteKey: professorRouteKey,
        });
        const conversation = projectionResult.getTeamMemberRunProjection.conversation;
        baselineTokenMentions = conversation.filter((entry) =>
          String(entry.content ?? "").includes(memoryToken),
        ).length;
        return conversation.length > 0;
      }, 60000);

      const terminateResult = await execGraphql<{
        terminateAgentTeamRun: { success: boolean };
      }>(terminateAgentTeamRunMutation, { id: teamRunId });
      expect(terminateResult.terminateAgentTeamRun.success).toBe(true);

      const continueResult = await execGraphql<{
        sendMessageToTeam: { success: boolean; teamRunId: string | null };
      }>(sendMessageToTeamMutation, {
        input: {
          teamRunId,
          targetMemberName: professorRouteKey,
          userInput: {
            content: recallPrompt,
            contextFiles: [],
          },
        },
      });
      expect(continueResult.sendMessageToTeam.success).toBe(true);
      expect(continueResult.sendMessageToTeam.teamRunId).toBe(teamRunId);

      let projectionAfterContinue: {
        conversation: Array<{ content?: string | null }>;
      } | null = null;

      await waitFor(async () => {
        const projectionResult = await execGraphql<{
          getTeamMemberRunProjection: {
            conversation: Array<{ content?: string | null }>;
          };
        }>(getTeamMemberRunProjectionQuery, {
          teamRunId,
          memberRouteKey: professorRouteKey,
        });
        projectionAfterContinue = projectionResult.getTeamMemberRunProjection;
        const contents = projectionAfterContinue.conversation.map((entry) => String(entry.content ?? ""));
        const tokenMentions = contents.filter((content) => content.includes(memoryToken)).length;
        const recallPromptSeen = contents.some((content) => content.includes(recallPrompt));
        return recallPromptSeen && tokenMentions > baselineTokenMentions;
      }, 90000, 500);

      expect(projectionAfterContinue).toBeTruthy();
      const contents = projectionAfterContinue!.conversation.map((entry) => String(entry.content ?? ""));
      const tokenMentions = contents.filter((content) => content.includes(memoryToken)).length;
      expect(contents.some((content) => content.includes(recallPrompt))).toBe(true);
      expect(tokenMentions).toBeGreaterThan(baselineTokenMentions);

      await waitFor(async () => {
        const listResult = await execGraphql<{
          listTeamRunHistory: Array<{
            teamRunId: string;
            isActive: boolean;
            lastKnownStatus: string;
          }>;
        }>(listTeamRunHistoryQuery);
        const row = listResult.listTeamRunHistory.find((candidate) => candidate.teamRunId === teamRunId);
        return Boolean(row?.isActive && row.lastKnownStatus === "ACTIVE");
      }, 20000, 250);
    },
    150000,
  );
});
