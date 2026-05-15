import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentFactory, AgentInputUserMessage } from "autobyteus-ts";
import { AgentStatus } from "autobyteus-ts/agent/status/status-enum.js";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import type { Message } from "autobyteus-ts/llm/utils/messages.js";
import { CompleteResponse, ChunkResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { SkillRegistry } from "autobyteus-ts/skills/registry.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AutoByteusAgentRunBackendFactory } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import type { CompactionAgentRunnerFactoryInput } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import { ServerCompactionAgentRunner } from "../../../../src/agent-execution/compaction/server-compaction-agent-runner.js";
import { CompactionAgentSettingsResolver } from "../../../../src/agent-execution/compaction/compaction-agent-settings-resolver.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const PARENT_AGENT_DEFINITION_ID = "parent-agent";
const COMPACTOR_AGENT_DEFINITION_ID = "autobyteus-memory-compactor";
const COMPACTION_OUTPUT = JSON.stringify({
  episodic_summary: "The parent run compacted prior seed turns.",
  critical_issues: [],
  unresolved_work: [],
  durable_facts: [
    {
      fact: "The user asked the parent run to remember the fallback behavior.",
    },
  ],
  user_preferences: [],
  important_artifacts: [],
});

type CompactionStatusPayload = {
  phase?: string;
  compaction_runtime_kind?: string | null;
  compaction_model_identifier?: string | null;
  compaction_run_id?: string | null;
  error_message?: string | null;
};

class RecordingMainLLM extends BaseLLM {
  readonly requests: Array<Array<Record<string, unknown>>> = [];

  constructor(
    model: LLMModel,
    config: LLMConfig,
    private readonly promptTokensByCall: number[],
  ) {
    super(model, config);
  }

  protected async _sendMessagesToLLM(messages: Message[]): Promise<CompleteResponse> {
    const callIndex = this.recordRequest(messages);
    return new CompleteResponse(this.buildResponsePayload(callIndex));
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    const callIndex = this.recordRequest(messages);
    yield new ChunkResponse({
      ...this.buildResponsePayload(callIndex),
      is_complete: true,
    });
  }

  private recordRequest(messages: Message[]): number {
    this.requests.push(messages.map((message) => message.toDict()));
    return this.requests.length;
  }

  private buildResponsePayload(callIndex: number): ConstructorParameters<typeof CompleteResponse>[0] {
    const promptTokens = this.promptTokensByCall[callIndex - 1] ?? 1;
    return {
      content: `parent-response-${callIndex}`,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: 1,
        total_tokens: promptTokens + 1,
      },
    };
  }
}

class FakeCompactorRun {
  readonly listeners = new Set<(event: unknown) => void>();
  postedMessage: AgentInputUserMessage | null = null;

  constructor(
    readonly runId: string,
    private readonly events: AgentRunEvent[] = [
      createCompactorEvent("visible-compaction-run-1", AgentRunEventType.SEGMENT_CONTENT, {
        id: "message-1",
        segment_type: "text",
        delta: COMPACTION_OUTPUT,
      }),
      createCompactorEvent("visible-compaction-run-1", AgentRunEventType.TURN_COMPLETED, {}, "IDLE"),
    ],
  ) {}

  subscribeToEvents(listener: (event: unknown) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async postUserMessage(message: AgentInputUserMessage) {
    this.postedMessage = message;
    for (const event of this.events) {
      for (const listener of this.listeners) {
        listener(event);
      }
    }
    return { accepted: true, turnId: "compaction-turn-1" };
  }
}

const createCompactorEvent = (
  runId: string,
  eventType: AgentRunEventType,
  payload: Record<string, unknown> = {},
  statusHint: AgentRunEvent["statusHint"] = null,
): AgentRunEvent => ({
  eventType,
  runId,
  payload,
  statusHint,
});

const createMainModel = () =>
  new LLMModel({
    name: "runtime-compaction-parent-model",
    value: "runtime-compaction-parent-model",
    canonicalName: "runtime-compaction-parent-model",
    provider: LLMProvider.OPENAI,
    activeContextTokens: 150,
    maxContextTokens: 150,
    maxOutputTokens: 20,
  });

const createParentDefinition = () =>
  new AgentDefinition({
    id: PARENT_AGENT_DEFINITION_ID,
    name: "Parent Runtime Agent",
    role: "Tester",
    description: "Parent runtime that triggers memory compaction.",
    instructions: "Respond briefly.",
  });

const createCompactorDefinition = (
  defaultLaunchConfig: ConstructorParameters<typeof AgentDefinition>[0]["defaultLaunchConfig"],
) =>
  new AgentDefinition({
    id: COMPACTOR_AGENT_DEFINITION_ID,
    name: "Memory Compactor",
    role: "Summarizer",
    description: "Compacts parent memory.",
    instructions: "Return compaction JSON only.",
    defaultLaunchConfig,
  });

const createSettingsResolver = (
  defaultLaunchConfig: ConstructorParameters<typeof AgentDefinition>[0]["defaultLaunchConfig"],
) =>
  new CompactionAgentSettingsResolver(
    { getCompactionAgentDefinitionId: () => COMPACTOR_AGENT_DEFINITION_ID } as never,
    {
      getFreshAgentDefinitionById: vi.fn(async (definitionId: string) =>
        definitionId === COMPACTOR_AGENT_DEFINITION_ID
          ? createCompactorDefinition(defaultLaunchConfig)
          : null,
      ),
      getAgentDefinitionById: vi.fn(),
    } as never,
  );

const createAgentRunService = (run: FakeCompactorRun) => ({
  createAgentRun: vi.fn(async () => ({ runId: run.runId })),
  getAgentRun: vi.fn(() => run),
  recordRunActivity: vi.fn(async () => undefined),
  terminateAgentRun: vi.fn(async () => ({
    success: true,
    message: "terminated",
    route: "native",
    runtimeKind: RuntimeKind.AUTOBYTEUS,
  })),
});

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 10000,
  intervalMs = 50,
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

const collectCompactionStatuses = (events: unknown[]): CompactionStatusPayload[] =>
  events
    .filter((event): event is AgentRunEvent =>
      Boolean(event) &&
      typeof event === "object" &&
      (event as { eventType?: unknown }).eventType === AgentRunEventType.COMPACTION_STATUS,
    )
    .map((event) => event.payload as CompactionStatusPayload);

describe("compaction agent parent runtime/model fallback executable validation", () => {
  let memoryDir = "";
  let workspaceDir = "";
  let previousMemoryDir: string | undefined;
  let agentFactory: AgentFactory;

  beforeEach(async () => {
    previousMemoryDir = process.env.AUTOBYTEUS_MEMORY_DIR;
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "compaction-parent-fallback-memory-"));
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "compaction-parent-fallback-workspace-"));
    process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;
    SkillRegistry.getInstance().clear();
    agentFactory = new AgentFactory();
    await Promise.all(
      agentFactory.listActiveAgentIds().map((agentId) => agentFactory.removeAgent(agentId).catch(() => false)),
    );
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await Promise.all(
      agentFactory.listActiveAgentIds().map((agentId) => agentFactory.removeAgent(agentId).catch(() => false)),
    );
    SkillRegistry.getInstance().clear();
    vi.restoreAllMocks();
    await fs.rm(memoryDir, { recursive: true, force: true });
    await fs.rm(workspaceDir, { recursive: true, force: true });
    if (previousMemoryDir === undefined) {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    } else {
      process.env.AUTOBYTEUS_MEMORY_DIR = previousMemoryDir;
    }
  });

  it("runs parent-triggered memory compaction with an unconfigured selected compactor using the parent runtime and model", async () => {
    const visibleCompactorRun = new FakeCompactorRun("visible-compaction-run-1");
    const agentRunService = createAgentRunService(visibleCompactorRun);
    const parentLLM = new RecordingMainLLM(
      createMainModel(),
      new LLMConfig({
        systemMessage: "Parent compaction integration prompt",
        maxTokens: 20,
        compactionRatio: 0.5,
        safetyMarginTokens: 10,
      }),
      [20, 20, 20, 80, 20],
    );
    const compactionAgentRunnerFactory = vi.fn((input: CompactionAgentRunnerFactoryInput) =>
      new ServerCompactionAgentRunner({
        settingsResolver: createSettingsResolver(null),
        agentRunService: agentRunService as never,
        timeoutMs: 1000,
        workspaceRootPath: input.workspaceRootPath,
        parentLaunchFallback: {
          runtimeKind: input.runtimeKind,
          llmModelIdentifier: input.llmModelIdentifier,
          sourceAgentDefinitionId: input.agentDefinitionId,
        },
      }),
    );
    const backendFactory = new AutoByteusAgentRunBackendFactory({
      agentFactory: agentFactory as never,
      agentDefinitionService: {
        getFreshAgentDefinitionById: vi.fn(async () => createParentDefinition()),
        getAgentDefinitionById: vi.fn(),
      } as never,
      llmFactory: {
        createLLM: vi.fn(async () => parentLLM),
      } as never,
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "workspace-parent-fallback",
          getName: () => "Parent Fallback Workspace",
          getBasePath: () => workspaceDir,
        }),
      } as never,
      skillService: { getSkill: () => null } as never,
      compactionAgentRunnerFactory,
    });

    const backend = await backendFactory.createBackend(
      new AgentRunConfig({
        agentDefinitionId: PARENT_AGENT_DEFINITION_ID,
        llmModelIdentifier: "parent-model",
        autoExecuteTools: false,
        memoryDir: path.join(memoryDir, "agents", "parent-run-1"),
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      "parent-run-1",
    );
    const serverEvents: unknown[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => serverEvents.push(event));

    try {
      for (let turnIndex = 1; turnIndex <= 3; turnIndex += 1) {
        const result = await backend.postUserMessage(new AgentInputUserMessage(`Seed turn ${turnIndex}`));
        expect(result.accepted).toBe(true);
        await waitFor(() =>
          parentLLM.requests.length === turnIndex &&
          backend.getStatus() === AgentStatus.IDLE &&
          (backend.getContext().runtimeContext as any)?.state?.activeTurn === null,
        );
      }

      await backend.postUserMessage(new AgentInputUserMessage("Please remember the fallback behavior."));
      await waitFor(() =>
        parentLLM.requests.length === 4 &&
        (backend.getContext().runtimeContext as any)?.state?.memoryManager?.compactionRequired === true &&
        backend.getStatus() === AgentStatus.IDLE,
      );

      await backend.postUserMessage(new AgentInputUserMessage("Continue after compaction."));
      await waitFor(() =>
        parentLLM.requests.length === 5 &&
        (backend.getContext().runtimeContext as any)?.state?.memoryManager?.compactionRequired === false &&
        backend.getStatus() === AgentStatus.IDLE,
      );

      expect(compactionAgentRunnerFactory).toHaveBeenCalledWith({
        agentDefinitionId: PARENT_AGENT_DEFINITION_ID,
        workspaceRootPath: workspaceDir,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "parent-model",
      });
      expect(agentRunService.createAgentRun).toHaveBeenCalledWith(expect.objectContaining({
        agentDefinitionId: COMPACTOR_AGENT_DEFINITION_ID,
        workspaceRootPath: workspaceDir,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "parent-model",
        autoExecuteTools: false,
      }));
      expect(visibleCompactorRun.postedMessage).toMatchObject({
        metadata: expect.objectContaining({
          compaction_parent_agent_id: "parent-run-1",
          compaction_block_count: expect.any(Number),
          compaction_trace_count: expect.any(Number),
        }),
      });

      await waitFor(() => collectCompactionStatuses(serverEvents).some((event) => event.phase === "completed"));
      const statuses = collectCompactionStatuses(serverEvents);
      expect(statuses.map((event) => event.phase)).toEqual(expect.arrayContaining(["requested", "started", "completed"]));
      expect(statuses.find((event) => event.phase === "completed")).toMatchObject({
        compaction_runtime_kind: RuntimeKind.AUTOBYTEUS,
        compaction_model_identifier: "parent-model",
        compaction_run_id: "visible-compaction-run-1",
      });
    } finally {
      unsubscribe();
      await backend.terminate();
      await parentLLM.cleanup();
    }
  }, 30000);

  it("uses explicit selected compactor runtime and model over parent fallback when creating the visible compactor run", async () => {
    const visibleCompactorRun = new FakeCompactorRun("visible-compaction-run-2", [
      createCompactorEvent("visible-compaction-run-2", AgentRunEventType.SEGMENT_CONTENT, {
        id: "message-1",
        segment_type: "text",
        delta: COMPACTION_OUTPUT,
      }),
      createCompactorEvent("visible-compaction-run-2", AgentRunEventType.TURN_COMPLETED, {}, "IDLE"),
    ]);
    const agentRunService = createAgentRunService(visibleCompactorRun);
    const runner = new ServerCompactionAgentRunner({
      settingsResolver: createSettingsResolver({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        llmModelIdentifier: "explicit-compactor-model",
        llmConfig: { reasoning_effort: "low" },
      }),
      agentRunService: agentRunService as never,
      workspaceRootPath: workspaceDir,
      parentLaunchFallback: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "parent-model",
        sourceAgentDefinitionId: PARENT_AGENT_DEFINITION_ID,
      },
      timeoutMs: 1000,
    });

    const result = await runner.runCompactionTask({
      taskId: "explicit-override-task",
      prompt: "Compact with explicit model.",
      blockCount: 1,
      traceCount: 2,
    });

    expect(agentRunService.createAgentRun).toHaveBeenCalledWith(expect.objectContaining({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "explicit-compactor-model",
      llmConfig: { reasoning_effort: "low" },
    }));
    expect(result.metadata).toMatchObject({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      modelIdentifier: "explicit-compactor-model",
      compactionRunId: "visible-compaction-run-2",
    });
  });

  it("applies parent fallback field-by-field for partially configured selected compactor launch defaults", async () => {
    const visibleCompactorRun = new FakeCompactorRun("visible-compaction-run-3", [
      createCompactorEvent("visible-compaction-run-3", AgentRunEventType.SEGMENT_CONTENT, {
        id: "message-1",
        segment_type: "text",
        delta: COMPACTION_OUTPUT,
      }),
      createCompactorEvent("visible-compaction-run-3", AgentRunEventType.TURN_COMPLETED, {}, "IDLE"),
    ]);
    const agentRunService = createAgentRunService(visibleCompactorRun);
    const runner = new ServerCompactionAgentRunner({
      settingsResolver: createSettingsResolver({
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        llmModelIdentifier: null,
        llmConfig: null,
      }),
      agentRunService: agentRunService as never,
      workspaceRootPath: workspaceDir,
      parentLaunchFallback: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "parent-model",
        sourceAgentDefinitionId: PARENT_AGENT_DEFINITION_ID,
      },
      timeoutMs: 1000,
    });

    const result = await runner.runCompactionTask({
      taskId: "partial-fallback-task",
      prompt: "Compact with partial fallback.",
      blockCount: 2,
      traceCount: 3,
    });

    expect(agentRunService.createAgentRun).toHaveBeenCalledWith(expect.objectContaining({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      llmModelIdentifier: "parent-model",
      llmConfig: null,
    }));
    expect(result.metadata).toMatchObject({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      modelIdentifier: "parent-model",
      compactionRunId: "visible-compaction-run-3",
    });
  });

  it("fails before creating a visible compactor run when neither selected defaults nor parent fallback provide required fields", async () => {
    const visibleCompactorRun = new FakeCompactorRun("visible-compaction-run-4");
    const agentRunService = createAgentRunService(visibleCompactorRun);
    const runner = new ServerCompactionAgentRunner({
      settingsResolver: createSettingsResolver(null),
      agentRunService: agentRunService as never,
      workspaceRootPath: workspaceDir,
      parentLaunchFallback: {
        runtimeKind: null,
        llmModelIdentifier: "parent-model",
        sourceAgentDefinitionId: PARENT_AGENT_DEFINITION_ID,
      },
      timeoutMs: 1000,
    });

    await expect(
      runner.runCompactionTask({
        taskId: "missing-runtime-task",
        prompt: "This should fail before provider invocation.",
        blockCount: 1,
        traceCount: 1,
      }),
    ).rejects.toThrow(
      /missing a valid default runtime kind.*parent fallback context for agent 'parent-agent'.*runtime kind fallback/,
    );
    expect(agentRunService.createAgentRun).not.toHaveBeenCalled();
  });

  it("wraps visible compactor run failures with the final effective runtime and model metadata", async () => {
    const visibleCompactorRun = new FakeCompactorRun("visible-compaction-run-5", [
      createCompactorEvent(
        "visible-compaction-run-5",
        AgentRunEventType.ERROR,
        { message: "provider failed after visible run creation" },
        "ERROR",
      ),
    ]);
    const agentRunService = createAgentRunService(visibleCompactorRun);
    const runner = new ServerCompactionAgentRunner({
      settingsResolver: createSettingsResolver(null),
      agentRunService: agentRunService as never,
      workspaceRootPath: workspaceDir,
      parentLaunchFallback: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        llmModelIdentifier: "parent-model",
        sourceAgentDefinitionId: PARENT_AGENT_DEFINITION_ID,
      },
      timeoutMs: 1000,
    });

    await expect(
      runner.runCompactionTask({
        taskId: "failure-metadata-task",
        prompt: "This should fail with effective metadata.",
        blockCount: 1,
        traceCount: 1,
      }),
    ).rejects.toMatchObject({
      name: "CompactionAgentRunnerError",
      compactionMetadata: {
        compactionAgentDefinitionId: COMPACTOR_AGENT_DEFINITION_ID,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        modelIdentifier: "parent-model",
        compactionRunId: "visible-compaction-run-5",
        taskId: "failure-metadata-task",
      },
    });
  });
});
