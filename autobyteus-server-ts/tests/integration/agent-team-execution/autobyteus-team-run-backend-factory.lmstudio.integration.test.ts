import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentFactory, AgentInputUserMessage, AgentTeamFactory } from "autobyteus-ts";
import { waitForTeamToBeIdle } from "autobyteus-ts/agent-team/utils/wait-for-idle.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { AutoByteusTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const DEFAULT_LMSTUDIO_TEXT_MODEL = "qwen/qwen3.5-35b-a3b";
const LMSTUDIO_MODEL_ENV_VAR = "LMSTUDIO_MODEL_ID";
const FLOW_TEST_TIMEOUT_MS = Number(process.env.LMSTUDIO_FLOW_TEST_TIMEOUT_MS || 240_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.LMSTUDIO_EVENT_WAIT_TIMEOUT_MS || 120_000);
const FILE_WAIT_TIMEOUT_MS = Number(process.env.LMSTUDIO_FILE_WAIT_TIMEOUT_MS || 120_000);
const runLiveIntegration = process.env.RUN_LMSTUDIO_E2E === "1" ? describe : describe.skip;

let cachedLmstudioModelIdentifier: string | null = null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
  intervalMs = 100,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await delay(intervalMs);
  }
  throw new Error(`Condition not met within ${timeoutMs}ms.`);
};

const waitForFile = async (
  filePath: string,
  timeoutMs = FILE_WAIT_TIMEOUT_MS,
  intervalMs = 100,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

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
    models.find(
      (model) =>
        model.active_context_tokens !== null &&
        model.active_context_tokens !== undefined &&
        model.model_identifier.includes(targetTextModel),
    ) ??
    models.find(
      (model) =>
        model.active_context_tokens !== null &&
        model.active_context_tokens !== undefined &&
        !model.model_identifier.toLowerCase().includes("vl"),
    ) ??
    models.find((model) => model.model_identifier.includes(targetTextModel)) ??
    models.find((model) => !model.model_identifier.toLowerCase().includes("vl")) ??
    models[0];

  cachedLmstudioModelIdentifier = selected.model_identifier;
  return cachedLmstudioModelIdentifier;
};

const createToolRequiredLlmFactory = () =>
  ({
    createLLM: async (modelIdentifier: string, config?: unknown) => {
      const llm = await LLMFactory.createLLM(modelIdentifier, config as any);
      const originalStream = llm.streamUserMessage.bind(llm);
      (llm as any).streamUserMessage = async function* (
        userMessage: unknown,
        kwargs: Record<string, unknown> = {},
      ) {
        yield* originalStream(userMessage as any, {
          ...kwargs,
          tool_choice: "required",
        });
      };
      return llm;
    },
  }) as any;

const buildMemberConfig = (input: {
  memberName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  workspaceId: string;
}): TeamMemberRunConfig => ({
  ...input,
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.NONE,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
});

runLiveIntegration("AutoByteusTeamRunBackendFactory live LM Studio integration", () => {
  let previousMemoryDir: string | undefined;
  let previousParserEnv: string | undefined;
  let memoryDir = "";
  let workspaceRootDir = "";
  let teamFactory: AgentTeamFactory;
  let agentFactory: AgentFactory;
  let backendFactory: AutoByteusTeamRunBackendFactory;

  beforeEach(async () => {
    previousMemoryDir = process.env.AUTOBYTEUS_MEMORY_DIR;
    previousParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = "api_tool_call";

    memoryDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "autobyteus-live-team-memory-"));
    workspaceRootDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), "autobyteus-live-team-workspaces-"),
    );
    process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;

    agentFactory = new AgentFactory();
    await Promise.all(
      agentFactory.listActiveAgentIds().map((id) => agentFactory.removeAgent(id).catch(() => false)),
    );

    teamFactory = new AgentTeamFactory();
    await Promise.all(
      teamFactory.listActiveTeamIds().map((id) => teamFactory.removeTeam(id).catch(() => false)),
    );

    backendFactory = new AutoByteusTeamRunBackendFactory({
      teamFactory: teamFactory as any,
      teamDefinitionService: {
        getFreshDefinitionById: async (definitionId: string) => {
          if (definitionId === "flat-team") {
            return new AgentTeamDefinition({
              id: "flat-team",
              name: "FlatLiveTeam",
              description: "Flat live AutoByteus team integration test",
              instructions: "Coordinate members.",
              nodes: [
                new TeamMember({
                  memberName: "Coordinator",
                  ref: "coord-def",
                  refType: "agent",
                }),
                new TeamMember({
                  memberName: "Worker",
                  ref: "worker-def",
                  refType: "agent",
                }),
              ],
              coordinatorMemberName: "Coordinator",
            });
          }
          if (definitionId === "nested-root-team") {
            return new AgentTeamDefinition({
              id: "nested-root-team",
              name: "NestedRootTeam",
              description: "Root team for nested live AutoByteus integration test",
              instructions: "Coordinate sub-team work.",
              nodes: [
                new TeamMember({
                  memberName: "ParentCoordinator",
                  ref: "parent-coord-def",
                  refType: "agent",
                }),
                new TeamMember({
                  memberName: "ResearchSubTeam",
                  ref: "nested-sub-team",
                  refType: "agent_team",
                }),
              ],
              coordinatorMemberName: "ParentCoordinator",
            });
          }
          if (definitionId === "nested-sub-team") {
            return new AgentTeamDefinition({
              id: "nested-sub-team",
              name: "NestedSubTeam",
              description: "Sub-team for nested live AutoByteus integration test",
              instructions: "Handle the assigned task.",
              nodes: [
                new TeamMember({
                  memberName: "SubCoordinator",
                  ref: "sub-coord-def",
                  refType: "agent",
                }),
              ],
              coordinatorMemberName: "SubCoordinator",
            });
          }
          return null;
        },
      } as any,
      agentDefinitionService: {
        getFreshAgentDefinitionById: async (definitionId: string) => {
          const instruction =
            "When the user asks you to write a file, call the write_file tool exactly once. " +
            "Use the provided relative path and exact file content. Do not answer with plain text.";
          if (definitionId === "coord-def") {
            return new AgentDefinition({
              id: "coord-def",
              name: "FlatCoordinator",
              role: "Coordinator",
              description: "Flat team coordinator",
              instructions: instruction,
              toolNames: ["write_file"],
            });
          }
          if (definitionId === "worker-def") {
            return new AgentDefinition({
              id: "worker-def",
              name: "FlatWorker",
              role: "Worker",
              description: "Flat team worker",
              instructions: instruction,
              toolNames: ["write_file"],
            });
          }
          if (definitionId === "parent-coord-def") {
            return new AgentDefinition({
              id: "parent-coord-def",
              name: "ParentCoordinator",
              role: "Coordinator",
              description: "Parent team coordinator",
              instructions: instruction,
              toolNames: ["write_file"],
            });
          }
          if (definitionId === "sub-coord-def") {
            return new AgentDefinition({
              id: "sub-coord-def",
              name: "SubCoordinator",
              role: "Coordinator",
              description: "Sub-team coordinator",
              instructions: instruction,
              toolNames: ["write_file"],
            });
          }
          return null;
        },
      } as any,
      llmFactory: createToolRequiredLlmFactory(),
      workspaceManager: {
        getWorkspaceById: (workspaceId: string) => {
          const basePath = path.join(workspaceRootDir, workspaceId);
          return {
            workspaceId,
            getName: () => workspaceId,
            getBasePath: () => basePath,
          };
        },
      } as any,
      skillService: {
        getSkill: () => null,
      } as any,
    });

    await fsPromises.mkdir(path.join(workspaceRootDir, "ws-flat-coordinator"), { recursive: true });
    await fsPromises.mkdir(path.join(workspaceRootDir, "ws-flat-worker"), { recursive: true });
    await fsPromises.mkdir(path.join(workspaceRootDir, "ws-parent-coordinator"), { recursive: true });
    await fsPromises.mkdir(path.join(workspaceRootDir, "ws-sub-coordinator"), { recursive: true });
  });

  afterEach(async () => {
    await Promise.all(
      teamFactory.listActiveTeamIds().map((id) => teamFactory.removeTeam(id).catch(() => false)),
    );
    await Promise.all(
      agentFactory.listActiveAgentIds().map((id) => agentFactory.removeAgent(id).catch(() => false)),
    );

    await fsPromises.rm(memoryDir, { recursive: true, force: true });
    await fsPromises.rm(workspaceRootDir, { recursive: true, force: true });

    if (previousMemoryDir === undefined) {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    } else {
      process.env.AUTOBYTEUS_MEMORY_DIR = previousMemoryDir;
    }

    if (previousParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = previousParserEnv;
    }
  }, FLOW_TEST_TIMEOUT_MS);

  it(
    "creates a real flat team and rebroadcasts real member events through the backend",
    async () => {
      const modelIdentifier = await resolveLmstudioModelIdentifier();
      expect(modelIdentifier).toBeTruthy();

      const backend = await backendFactory.createBackend(
        new TeamRunConfig({
          teamDefinitionId: "flat-team",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          memberConfigs: [
            buildMemberConfig({
              memberName: "Coordinator",
              agentDefinitionId: "coord-def",
              llmModelIdentifier: modelIdentifier as string,
              workspaceId: "ws-flat-coordinator",
            }),
            buildMemberConfig({
              memberName: "Worker",
              agentDefinitionId: "worker-def",
              llmModelIdentifier: modelIdentifier as string,
              workspaceId: "ws-flat-worker",
            }),
          ],
        }),
      );

      const observed: TeamRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => observed.push(event));

      try {
        const relativePath = "worker-live-output.txt";
        const content = "Flat team output.";
        const sendResult = await backend.postMessage(
          new AgentInputUserMessage(
            `Write the exact content "${content}" to the relative path "${relativePath}". ` +
              "Do not answer with plain text.",
          ),
          "Worker",
        );
        expect(sendResult.accepted).toBe(true);

        const filePath = path.join(workspaceRootDir, "ws-flat-worker", relativePath);
        expect(await waitForFile(filePath)).toBe(true);
        const team = backendFactory.getTeam(backend.runId);
        expect(team).toBeTruthy();
        await waitForTeamToBeIdle(team as any, 120.0);

        await waitFor(
          () =>
            observed.some(
              (event) =>
                event.eventSourceType === TeamRunEventSourceType.AGENT &&
                event.subTeamNodeName == null &&
                (event.data as { memberName?: string }).memberName === "Worker",
            ),
          EVENT_WAIT_TIMEOUT_MS,
        );
        await waitFor(
          () =>
            observed.some(
              (event) =>
                event.eventSourceType === TeamRunEventSourceType.AGENT &&
                event.subTeamNodeName == null &&
                (event.data as { memberName?: string; agentEvent?: { eventType?: string } })
                  .memberName === "Worker" &&
                (event.data as { agentEvent?: { eventType?: string } }).agentEvent?.eventType ===
                  AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
            ),
          EVENT_WAIT_TIMEOUT_MS,
        );

        expect(
          observed.some(
            (event) =>
              event.eventSourceType === TeamRunEventSourceType.AGENT &&
              event.subTeamNodeName == null &&
              (event.data as { memberName?: string; agentEvent?: { eventType?: string; payload?: Record<string, unknown> } })
                .memberName === "Worker" &&
              (event.data as { agentEvent?: { eventType?: string } }).agentEvent?.eventType ===
                AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          ),
        ).toBe(true);
      } finally {
        unsubscribe();
        await backend.terminate().catch(() => ({ accepted: false }));
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "creates a real nested team and rebroadcasts real sub-team events through the backend",
    async () => {
      const modelIdentifier = await resolveLmstudioModelIdentifier();
      expect(modelIdentifier).toBeTruthy();

      const backend = await backendFactory.createBackend(
        new TeamRunConfig({
          teamDefinitionId: "nested-root-team",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          memberConfigs: [
            buildMemberConfig({
              memberName: "ParentCoordinator",
              agentDefinitionId: "parent-coord-def",
              llmModelIdentifier: modelIdentifier as string,
              workspaceId: "ws-parent-coordinator",
            }),
            buildMemberConfig({
              memberName: "SubCoordinator",
              agentDefinitionId: "sub-coord-def",
              llmModelIdentifier: modelIdentifier as string,
              workspaceId: "ws-sub-coordinator",
            }),
          ],
        }),
      );

      const observed: TeamRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => observed.push(event));

      try {
        const relativePath = "subteam-live-output.txt";
        const content = "Nested sub-team output.";
        const sendResult = await backend.postMessage(
          new AgentInputUserMessage(
            `Write the exact content "${content}" to the relative path "${relativePath}". ` +
              "Do not answer with plain text.",
          ),
          "ResearchSubTeam",
        );
        expect(sendResult.accepted).toBe(true);

        const filePath = path.join(workspaceRootDir, "ws-sub-coordinator", relativePath);
        expect(await waitForFile(filePath)).toBe(true);
        const team = backendFactory.getTeam(backend.runId);
        expect(team).toBeTruthy();
        await waitForTeamToBeIdle(team as any, 120.0);

        await waitFor(
          () =>
            observed.some(
              (event) =>
                event.eventSourceType === TeamRunEventSourceType.AGENT &&
                event.subTeamNodeName === "ResearchSubTeam",
            ),
          EVENT_WAIT_TIMEOUT_MS,
        );
        await waitFor(
          () =>
            observed.some(
              (event) =>
                event.eventSourceType === TeamRunEventSourceType.AGENT &&
                event.subTeamNodeName === "ResearchSubTeam" &&
                (event.data as { agentEvent?: { eventType?: string } }).agentEvent?.eventType ===
                  AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
            ),
          EVENT_WAIT_TIMEOUT_MS,
        );

        expect(
          observed.some(
            (event) =>
              event.eventSourceType === TeamRunEventSourceType.AGENT &&
              event.subTeamNodeName === "ResearchSubTeam" &&
              (event.data as { memberName?: string }).memberName === "SubCoordinator",
          ),
        ).toBe(true);
        expect(
          observed.some(
            (event) =>
              event.eventSourceType === TeamRunEventSourceType.AGENT &&
              event.subTeamNodeName === "ResearchSubTeam" &&
              (event.data as { agentEvent?: { eventType?: string } }).agentEvent?.eventType ===
                AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          ),
        ).toBe(true);
      } finally {
        unsubscribe();
        await backend.terminate().catch(() => ({ accepted: false }));
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );
});
