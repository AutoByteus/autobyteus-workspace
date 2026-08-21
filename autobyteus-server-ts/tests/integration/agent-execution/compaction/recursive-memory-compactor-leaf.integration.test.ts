import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentFactory } from "autobyteus-ts";
import type { AgentContext } from "autobyteus-ts/agent/context/agent-context.js";
import {
  resolveCompactionTokenBudget,
  resolveLlmRequestCapacity,
} from "autobyteus-ts/agent/token-budget.js";
import { BaseLLM } from "autobyteus-ts/llm/base.js";
import { LLMModel } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { Message, MessageRole } from "autobyteus-ts/llm/utils/messages.js";
import { LLMConfig } from "autobyteus-ts/llm/utils/llm-config.js";
import { buildLlmTokenUsageObservation } from "autobyteus-ts/llm/utils/llm-token-usage-observation.js";
import { ChunkResponse, CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { AgentCompactionSummarizer } from "autobyteus-ts/memory/compaction/agent-compaction-summarizer.js";
import type { WorkingContextMessageUnit } from "autobyteus-ts/memory/compaction/working-context-message-unit.js";
import { FileCompactionLineageStore } from "autobyteus-ts/memory/store/file-compaction-lineage-store.js";
import { FileMemoryStore } from "autobyteus-ts/memory/store/file-store.js";
import { CompactionPolicy } from "autobyteus-ts/memory/policies/compaction-policy.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { AutoByteusAgentRunBackendFactory } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import { ServerCompactionAgentRunner } from "../../../../src/agent-execution/compaction/server-compaction-agent-runner.js";
import { AgentRun } from "../../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import {
  AgentRunEventType,
  isAgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunService } from "../../../../src/agent-execution/services/agent-run-service.js";
import { MEMORY_COMPACTOR_AGENT_DEFINITION_ID } from "../../../../src/built-in-agents/built-in-agent-registry.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const CAPTURED_CHILD_PROMPT_TOKENS = 176_655;
const CAPTURED_INPUT_BUDGET_TOKENS = 615_744;
const CAPTURED_TRIGGER_THRESHOLD_TOKENS = 123_148;

const validCompactionResponse = JSON.stringify({
  episodes: [{ summary: "The captured parent compaction completed without a recursive child." }],
  critical_issues: [],
  unresolved_work: [],
  durable_facts: [{ fact: "The Memory Compactor is a disabled one-shot leaf." }],
  user_preferences: [],
  important_artifacts: [],
});

class CapturedUsageChildLLM extends BaseLLM {
  readonly requests: Message[][] = [];

  constructor(readonly outputText: string) {
    super(
      new LLMModel({
        name: "captured-compactor-model",
        value: "captured-compactor-model",
        canonicalName: "captured-compactor-model",
        provider: LLMProvider.DEEPSEEK,
        activeContextTokens: 617_024,
        maxContextTokens: 617_024,
        maxOutputTokens: 1_024,
        defaultCompactionRatio: 0.2,
        defaultSafetyMarginTokens: 256,
      }),
      new LLMConfig({
        maxTokens: 1_024,
        compactionRatio: 0.2,
        safetyMarginTokens: 256,
      }),
    );
  }

  protected async _sendMessagesToLLM(messages: Message[]): Promise<CompleteResponse> {
    this.requests.push(messages);
    return new CompleteResponse({ content: this.outputText, usage: this.usage() });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requests.push(messages);
    yield new ChunkResponse({
      content: this.outputText,
      usage: this.usage(),
      is_complete: true,
    });
  }

  private usage() {
    return buildLlmTokenUsageObservation({
      inputTokens: CAPTURED_CHILD_PROMPT_TOKENS,
      outputTokens: 1_024,
      totalTokens: CAPTURED_CHILD_PROMPT_TOKENS + 1_024,
      rawUsage: null,
    });
  }
}

type ChildRunEvidence = {
  runId: string;
  memoryDir: string;
  eventTypes: AgentRunEventType[];
  compactionStatuses: Record<string, unknown>[];
  tokenUsages: Record<string, unknown>[];
  automaticCompactionKind: "disabled" | "enabled" | null;
  pendingCompaction: boolean | null;
  effectiveToolNames: string[];
};

class RecordingChildRunService {
  readonly evidence: ChildRunEvidence[] = [];
  private readonly activeRuns = new Map<string, AgentRun>();
  private nextRun = 0;

  constructor(
    private readonly backendFactory: AutoByteusAgentRunBackendFactory,
    private readonly memoryRoot: string,
  ) {}

  async createAgentRun(input: {
    agentDefinitionId: string;
    llmModelIdentifier: string;
    autoExecuteTools: boolean;
    llmConfig: Record<string, unknown> | null;
    skillAccessMode: AgentRunConfig["skillAccessMode"];
    runtimeKind: RuntimeKind;
  }): Promise<{ runId: string }> {
    const runId = `memory_compactor_leaf_${++this.nextRun}`;
    const memoryDir = path.join(this.memoryRoot, runId);
    const backend = await this.backendFactory.createBackend(new AgentRunConfig({
      ...input,
      memoryDir,
    }), runId);
    const run = new AgentRun({ context: backend.getContext(), backend });
    const evidence: ChildRunEvidence = {
      runId,
      memoryDir,
      eventTypes: [],
      compactionStatuses: [],
      tokenUsages: [],
      automaticCompactionKind: null,
      pendingCompaction: null,
      effectiveToolNames: [],
    };
    run.subscribeToEvents((event) => {
      if (!isAgentRunEvent(event)) return;
      evidence.eventTypes.push(event.eventType);
      if (event.eventType === AgentRunEventType.COMPACTION_STATUS) {
        evidence.compactionStatuses.push(event.payload);
      }
      if (event.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED) {
        evidence.tokenUsages.push(event.payload);
      }
    });
    this.evidence.push(evidence);
    this.activeRuns.set(runId, run);
    return { runId };
  }

  getAgentRun(runId: string): AgentRun | null {
    return this.activeRuns.get(runId) ?? null;
  }

  async recordRunActivity(): Promise<void> {}

  async terminateAgentRun(runId: string): Promise<{ success: true }> {
    const run = this.activeRuns.get(runId);
    if (!run) return { success: true };
    const evidence = this.evidence.find((entry) => entry.runId === runId)!;
    const context = run.context.runtimeContext as AgentContext;
    const memoryManager = context.state.memoryManager;
    evidence.automaticCompactionKind = memoryManager
      ?.getAutomaticCompactionConfiguration().kind ?? null;
    evidence.pendingCompaction = memoryManager?.hasPendingCompaction() ?? null;
    evidence.effectiveToolNames = context.config.tools
      .map((tool) => tool.definition?.name)
      .filter((name): name is string => typeof name === "string");
    await run.terminate();
    this.activeRuns.delete(runId);
    return { success: true };
  }
}

const buildLargeParentUnits = (): WorkingContextMessageUnit[] =>
  Array.from({ length: 320 }, (_, index) => {
    const content = `Captured parent unit ${String(index + 1).padStart(4, "0")} `
      + "incident evidence ".repeat(92);
    return {
      id: `unit-${index + 1}`,
      kind: "message" as const,
      startIndex: index,
      endIndex: index,
      messages: [new Message(MessageRole.USER, { content })],
      rawTraceIds: [`raw-trace-${index + 1}`],
    };
  });

describe("recursive Memory Compactor leaf integration", () => {
  afterEach(async () => {
    const factory = new AgentFactory();
    await Promise.all(factory.listActiveAgentIds().map((id) =>
      factory.removeAgent(id).catch(() => false)));
    vi.restoreAllMocks();
  });

  it("runs captured-pressure initial and correction children as disabled siblings with no descendants", async () => {
    const memoryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "memory-compactor-leaf-integration-"));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "memory-compactor-leaf-workspace-"));
    const childLlms: CapturedUsageChildLLM[] = [];
    const descendantRunner = { runCompactionTask: vi.fn(() => {
      throw new Error("A canonical Memory Compactor must not launch a descendant.");
    }) };
    const compactionAgentRunnerFactory = vi.fn(() => descendantRunner);
    const definition = new AgentDefinition({
      id: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
      name: "Memory Compactor",
      role: "Compaction specialist",
      description: "Compacts one target-agent history.",
      instructions: "Return the required structured memory object.",
      toolNames: [],
    });
    const agentFactory = new AgentFactory();
    const backendFactory = new AutoByteusAgentRunBackendFactory({
      agentFactory: agentFactory as any,
      agentDefinitionService: {
        getFreshAgentDefinitionById: async (id: string) => id === definition.id ? definition : null,
        getAgentDefinitionById: async (id: string) => id === definition.id ? definition : null,
      } as any,
      createLLM: async () => {
        const llm = new CapturedUsageChildLLM(
          childLlms.length === 0 ? "source-task commentary only" : validCompactionResponse,
        );
        childLlms.push(llm);
        return llm;
      },
      workspaceManager: {
        getWorkspaceById: () => null,
        getOrCreateTempWorkspace: async () => ({
          workspaceId: "memory-compactor-leaf-workspace",
          getName: () => "Memory Compactor Leaf Workspace",
          getBasePath: () => workspaceRoot,
        }),
      } as any,
      skillService: { getSkill: () => null } as any,
      compactionAgentRunnerFactory,
    });
    const childRunService = new RecordingChildRunService(backendFactory, memoryRoot);
    const runner = new ServerCompactionAgentRunner({
      agentRunService: childRunService as unknown as AgentRunService,
      launchResolver: {
        resolve: async () => ({
          agentDefinitionId: MEMORY_COMPACTOR_AGENT_DEFINITION_ID,
          agentName: "Memory Compactor",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          llmModelIdentifier: "captured-compactor-model",
          provider: "deepseek",
          llmConfig: {
            max_tokens: 1_024,
            compaction_ratio: 0.2,
            safety_margin_tokens: 256,
          },
        }),
      } as any,
      workspaceRootPath: workspaceRoot,
    });

    try {
      const units = buildLargeParentUnits();
      const summarizer = new AgentCompactionSummarizer({
        runner,
        parentAgentId: "captured-daily-assistant",
        taskIdFactory: (() => {
          const ids = ["captured-initial", "captured-correction"];
          return () => ids.shift() ?? "unexpected-task";
        })(),
      });

      const result = await summarizer.summarizeMessageUnits(units);

      expect(result.episodes).toEqual([
        { summary: "The captured parent compaction completed without a recursive child." },
      ]);
      expect(childRunService.evidence).toHaveLength(2);
      expect(childLlms).toHaveLength(2);
      expect(compactionAgentRunnerFactory).not.toHaveBeenCalled();
      expect(descendantRunner.runCompactionTask).not.toHaveBeenCalled();

      const capacity = resolveLlmRequestCapacity(childLlms[0]!.model, childLlms[0]!.config);
      expect(capacity?.inputBudget).toBe(CAPTURED_INPUT_BUDGET_TOKENS);
      expect(resolveCompactionTokenBudget(
        capacity!,
        childLlms[0]!.model,
        childLlms[0]!.config,
        new CompactionPolicy(),
      ).triggerThresholdTokens).toBe(CAPTURED_TRIGGER_THRESHOLD_TOKENS);
      expect(CAPTURED_CHILD_PROMPT_TOKENS).toBeGreaterThan(CAPTURED_TRIGGER_THRESHOLD_TOKENS);
      expect(CAPTURED_CHILD_PROMPT_TOKENS).toBeLessThan(CAPTURED_INPUT_BUDGET_TOKENS);

      for (const [index, evidence] of childRunService.evidence.entries()) {
        expect(evidence.automaticCompactionKind).toBe("disabled");
        expect(evidence.pendingCompaction).toBe(false);
        expect(evidence.effectiveToolNames).toEqual([]);
        expect(evidence.compactionStatuses).toEqual([]);
        expect(evidence.tokenUsages).toEqual([
          expect.objectContaining({
            latest_prompt_tokens: CAPTURED_CHILD_PROMPT_TOKENS,
            effective_context_window_tokens: 617_024,
          }),
        ]);

        const store = new FileMemoryStore(evidence.memoryDir, evidence.runId, {
          agentRootSubdir: "",
        });
        const userTraces = store.listTurnRawTraceCorpusOrdered()
          .filter(({ traceType }) => traceType === "user");
        expect(userTraces).toHaveLength(1);
        expect(userTraces[0]!.content.length).toBeGreaterThan(500_000);
        expect(userTraces[0]!.content.match(/START OF TARGET AGENT CONVERSATION HISTORY/gu))
          .toHaveLength(1);
        expect(userTraces[0]!.content.match(/END OF TARGET AGENT CONVERSATION HISTORY/gu))
          .toHaveLength(1);
        if (index === 1) {
          expect(userTraces[0]!.content).toContain(
            "failed host validation at the `json_object_extraction` stage",
          );
        }
        expect(store.readArchiveRawTraces()).toEqual([]);
        expect(new FileCompactionLineageStore(store.agentDir, {
          targetKind: "agent_run",
          runId: evidence.runId,
          memberId: null,
        }).list()).toEqual([]);
      }
    } finally {
      await Promise.all(agentFactory.listActiveAgentIds().map((id) =>
        agentFactory.removeAgent(id).catch(() => false)));
      await fs.rm(memoryRoot, { recursive: true, force: true });
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
