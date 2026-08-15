import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { InterAgentMessage } from '../../../../src/agent/message/inter-agent-message.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message } from '../../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { buildLlmTokenUsageObservation } from '../../../../src/llm/utils/llm-token-usage-observation.js';
import { EventType } from '../../../../src/events/event-types.js';
import {
  CompactionAgentRunnerError,
  type CompactionAgentRunner,
  type CompactionAgentTask,
} from '../../../../src/memory/compaction/compaction-agent-runner.js';
import { createEnabledMemoryCompactionConfiguration } from '../../../../src/memory/compaction/memory-compaction-configuration.js';
import { CompactionPolicy } from '../../../../src/memory/policies/compaction-policy.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import { MEMORY_FILE_NAMES } from '../../../../src/memory/store/memory-file-names.js';
import {
  RAW_TRACES_ARCHIVE_DIR_NAME,
  RAW_TRACES_ARCHIVE_MANIFEST_FILE_NAME,
} from '../../../../src/memory/store/raw-trace-archive-manifest.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { resetAgentFactory, waitForCondition, waitForStatus } from './runtime-test-harness.js';
import { RawTraceItem } from '../../../../src/memory/models/raw-trace-item.js';
import { providerSafeCompactionText } from '../../../../src/memory/presentation/unicode-safe-text.js';

type CompactionEventPayload = {
  phase: string;
  turn_id?: string | null;
  compaction_operation_id?: string | null;
  requested_turn_id?: string | null;
  execution_turn_id?: string | null;
  compaction_strategy_id?: string | null;
  compaction_strategy_name?: string | null;
  compaction_agent_definition_id?: string | null;
  compaction_agent_name?: string | null;
  compaction_runtime_kind?: string | null;
  compaction_model_identifier?: string | null;
  compaction_task_id?: string | null;
  raw_trace_count?: number | null;
  semantic_fact_count?: number | null;
  error_message?: string | null;
};

const isCompactionEventPayload = (payload: unknown): payload is CompactionEventPayload =>
  Boolean(payload) &&
  typeof payload === 'object' &&
  typeof (payload as { phase?: unknown }).phase === 'string';
const promptSizedUserMessage = (label: string): string => `${label} ${'context '.repeat(500)}`;
const acceptedBoundaryEpisode = 'First turn summary '.padEnd(3_999, 'x') + '🛡️tail';

const snapshotCanonicalCompactionFiles = (agentDir: string): Record<string, string | null> => {
  const snapshot: Record<string, string | null> = {};
  for (const fileName of [
    MEMORY_FILE_NAMES.episodic,
    MEMORY_FILE_NAMES.semantic,
    MEMORY_FILE_NAMES.compactionLineage,
    MEMORY_FILE_NAMES.workingContextSnapshot,
    RAW_TRACES_ARCHIVE_MANIFEST_FILE_NAME,
  ]) {
    const filePath = path.join(agentDir, fileName);
    snapshot[fileName] = fs.existsSync(filePath)
      ? fs.readFileSync(filePath).toString('base64')
      : null;
  }
  const archiveDir = path.join(agentDir, RAW_TRACES_ARCHIVE_DIR_NAME);
  if (fs.existsSync(archiveDir)) {
    for (const entry of fs.readdirSync(archiveDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      snapshot[path.join(RAW_TRACES_ARCHIVE_DIR_NAME, entry.name)] = fs
        .readFileSync(path.join(archiveDir, entry.name))
        .toString('base64');
    }
  }
  return snapshot;
};

class RecordingMainLLM extends BaseLLM {
  readonly requests: Array<Array<Record<string, unknown>>> = [];

  constructor(
    model: LLMModel,
    config: LLMConfig,
    private readonly promptTokensByCall: Array<number | null>
  ) {
    super(model, config);
  }

  protected async _sendMessagesToLLM(messages: Message[]): Promise<CompleteResponse> {
    const callIndex = this.recordRequest(messages);
    return new CompleteResponse(this.buildResponsePayload(callIndex));
  }

  protected async *_streamMessagesToLLM(messages: Message[]): AsyncGenerator<ChunkResponse, void, unknown> {
    const callIndex = this.recordRequest(messages);
    yield new ChunkResponse({
      ...this.buildResponsePayload(callIndex),
      is_complete: true
    });
  }

  private recordRequest(messages: Message[]): number {
    this.requests.push(messages.map((message) => message.toDict()));
    return this.requests.length;
  }

  private buildResponsePayload(callIndex: number): ConstructorParameters<typeof ChunkResponse>[0] {
    const promptTokens = callIndex - 1 < this.promptTokensByCall.length
      ? this.promptTokensByCall[callIndex - 1]!
      : 1;
    return {
      content: `assistant-turn-${callIndex}`,
      usage: buildLlmTokenUsageObservation({
        inputTokens: promptTokens,
        outputTokens: 1,
        totalTokens: promptTokens === null ? null : promptTokens + 1,
        rawUsage: null,
      }),
    };
  }
}

class RecordingCompactionAgentRunner implements CompactionAgentRunner {
  readonly tasks: CompactionAgentTask[] = [];

  constructor(private readonly outputText: string | Array<string | Error>) {}

  async runCompactionTask(task: CompactionAgentTask) {
    this.tasks.push(task);
    const outputText = Array.isArray(this.outputText)
      ? this.outputText[this.tasks.length - 1] ?? this.outputText.at(-1)!
      : this.outputText;
    if (outputText instanceof Error) throw outputText;
    return {
      outputText,
      metadata: {
        compactionAgentDefinitionId: 'memory-compactor',
        compactionAgentName: 'Memory Compactor',
        runtimeKind: 'codex_app_server',
        modelIdentifier: 'gpt-5.4-codex',
        provider: 'openai',
        compactionRunId: `compaction-run-${this.tasks.length}`,
        taskId: task.taskId,
      },
    };
  }
}

const createMainModel = (activeContextTokens = 5_000) =>
  new LLMModel({
    name: 'runtime-compaction-main-model',
    value: 'runtime-compaction-main-model',
    canonicalName: 'runtime-compaction-main-model',
    provider: LLMProvider.OPENAI,
    activeContextTokens,
    maxContextTokens: activeContextTokens,
    maxOutputTokens: 200
  });

const createConfig = (tempDir: string, mainLLM: RecordingMainLLM, runner: CompactionAgentRunner): AgentConfig => {
  const config = new AgentConfig(
    'RuntimeCompactionAgent',
    'Tester',
    'Runtime compaction integration test agent',
    mainLLM
  );
  config.memoryDir = tempDir;
  config.memoryCompaction = createEnabledMemoryCompactionConfiguration(
    new CompactionPolicy(),
    runner,
  );
  return config;
};

describe('Agent runtime compaction integration', () => {
  beforeEach(() => {
    SkillRegistry.getInstance().clear();
    resetAgentFactory();
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    SkillRegistry.getInstance().clear();
    resetAgentFactory();
    vi.restoreAllMocks();
  });

  it('uses the injected compaction agent runner to compact memory before the next LLM leg', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-compaction-'));
    const originalCompactionDebugLogs = process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS;
    process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS = 'true';
    const compactionRunner = new RecordingCompactionAgentRunner([
      'source-task commentary without a compaction object',
      JSON.stringify({
        episodes: [{ summary: acceptedBoundaryEpisode }],
        critical_issues: [],
        unresolved_work: [],
        durable_facts: [
          {
            fact: 'The user asked the agent to remember the first turn.'
          }
        ],
        user_preferences: [],
        important_artifacts: []
      }),
    ]);
    const mainLLM = new RecordingMainLLM(
      createMainModel(15_000),
      new LLMConfig({
        systemMessage: 'Runtime compaction system prompt',
        maxTokens: 200,
        compactionRatio: 0.2,
        safetyMarginTokens: 10
      }),
      [200, 200, 200, 3_000, null, 3_000, 200]
    );
    const agent = new AgentFactory().createAgent(createConfig(tempDir, mainLLM, compactionRunner));
    const compactionEvents: CompactionEventPayload[] = [];

    try {
      agent.start();
      expect(await waitForStatus(agent.context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR)).toBe(true);

      const notifier = agent.context.statusManager?.notifier;
      const onCompactionStatus = (payload?: unknown) => {
        if (isCompactionEventPayload(payload)) {
          compactionEvents.push(payload);
        }
      };
      notifier?.subscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);

      for (let turnIndex = 1; turnIndex <= 3; turnIndex += 1) {
        await agent.postUserMessage(new AgentInputUserMessage(
          promptSizedUserMessage(`Seed turn ${turnIndex}`),
        ));
        expect(await waitForCondition(
          () => mainLLM.requests.length === turnIndex && agent.currentStatus === AgentStatus.IDLE && agent.context.state.activeTurn === null,
          10000
        )).toBe(true);
      }

      const memoryManager = agent.context.state.memoryManager;
      const messagesBeforeCompaction = memoryManager?.getWorkingContextMessages().map((message) => message.toDict());
      await agent.postUserMessage(new AgentInputUserMessage('Please remember the first turn.'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 4
          && compactionEvents.some((event) => event.phase === 'completed' || event.phase === 'failed')
          && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);
      expect(
        compactionEvents.some((event) => event.phase === 'failed'),
        compactionEvents.find((event) => event.phase === 'failed')?.error_message,
      ).toBe(false);
      expect(compactionEvents.map((event) => event.phase)).toEqual(['requested', 'started', 'completed']);

      const requestedOperationId = compactionEvents[0]?.compaction_operation_id;
      expect(typeof requestedOperationId).toBe('string');
      expect(memoryManager?.getPendingCompactionRequest()).toBeNull();
      expect(compactionEvents[0]).toMatchObject({
        requested_turn_id: compactionEvents[0]?.turn_id,
        execution_turn_id: null,
      });

      await agent.postUserMessage(new AgentInputUserMessage('Observe a missing prompt-token total.'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 5
          && agent.context.state.memoryManager?.hasPendingCompaction() === false
          && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);
      expect(console.info).toHaveBeenCalledWith(
        'compaction_budget_skipped_no_usage',
        expect.objectContaining({
          reason: 'missing_prompt_tokens',
          quality_flags: expect.arrayContaining(['input_tokens_missing']),
        }),
      );
      expect(compactionRunner.tasks).toHaveLength(2);
      expect(compactionEvents.map((event) => event.phase)).toEqual(['requested', 'started', 'completed']);

      await agent.postUserMessage(new AgentInputUserMessage('Observe the first numeric total still above the trigger.'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 6 && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        'compaction_post_success_usage_not_below_trigger',
        expect.objectContaining({
          reason: 'post_success_usage_not_below_trigger',
          observed_prompt_tokens: 3_000,
        }),
      );
      expect(compactionRunner.tasks).toHaveLength(2);
      expect(compactionEvents.map((event) => event.phase)).toEqual(['requested', 'started', 'completed']);

      await agent.postUserMessage(new AgentInputUserMessage('Observe a later numeric total below the trigger.'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 7 && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);

      const evaluatedBudgets = vi.mocked(console.info).mock.calls
        .filter(([event]) => event === 'compaction_budget_evaluated')
        .map(([, payload]) => payload as Record<string, unknown>);
      const requestedBudget = evaluatedBudgets.find(({ threshold_episode_decision }) =>
        threshold_episode_decision === 'requested');
      expect(requestedBudget).toEqual(expect.objectContaining({
        prompt_tokens: 3_000,
        compaction_ratio: 0.2,
        threshold_episode_decision: 'requested',
      }));
      expect(requestedBudget?.post_compaction_target_tokens as number)
        .toBeLessThan(requestedBudget?.trigger_threshold_tokens as number);
      expect(evaluatedBudgets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          prompt_tokens: 3_000,
          threshold_episode_decision: 'suppressed',
        }),
        expect.objectContaining({
          prompt_tokens: 200,
          threshold_episode_decision: 'reset',
        }),
      ]));

      expect(compactionEvents.map((event) => event.compaction_operation_id)).toEqual([
        requestedOperationId,
        requestedOperationId,
        requestedOperationId,
      ]);
      expect(compactionEvents[1]).toMatchObject({
        requested_turn_id: compactionEvents[0]?.turn_id,
        execution_turn_id: compactionEvents[1]?.turn_id,
      });
      expect(compactionEvents[2]).toMatchObject({
        phase: 'completed',
        requested_turn_id: compactionEvents[0]?.turn_id,
        execution_turn_id: compactionEvents[1]?.turn_id,
        compaction_agent_definition_id: 'memory-compactor',
        compaction_agent_name: 'Memory Compactor',
        compaction_runtime_kind: 'codex_app_server',
        compaction_model_identifier: 'gpt-5.4-codex',
        compaction_run_id: 'compaction-run-2',
        compaction_strategy_id: 'structured-json',
        compaction_strategy_name: 'Structured JSON',
      });
      expect(compactionEvents[2]?.raw_trace_count).toBeGreaterThan(0);
      expect(compactionEvents[2]?.semantic_fact_count).toBe(1);
      expect(memoryManager?.getPendingCompactionRequest()).toBeNull();

      expect(compactionRunner.tasks).toHaveLength(2);
      expect(compactionRunner.tasks[0]?.prompt.match(/<target_agent_conversation_history>/g)).toHaveLength(1);
      expect(compactionRunner.tasks[0]?.prompt.match(/<\/target_agent_conversation_history>/g)).toHaveLength(1);
      expect(compactionRunner.tasks[0]?.prompt).not.toContain('[CONVERSATION_HISTORY_TO_SUMMARIZE]');
      expect(compactionRunner.tasks[0]?.prompt).toContain('Seed turn 1');
      expect(compactionRunner.tasks[0]?.prompt).toContain('Seed turn 2');
      expect(compactionRunner.tasks[0]?.prompt).not.toContain('Please remember the first turn.');
      expect(compactionRunner.tasks[0]?.prompt).not.toContain('What should you do next?');
      expect(compactionRunner.tasks[1]?.prompt).toContain(
        'failed host validation at the `json_object_extraction` stage',
      );
      expect(compactionRunner.tasks[1]?.prompt.endsWith(compactionRunner.tasks[0]!.prompt))
        .toBe(true);
      expect(providerSafeCompactionText.isProviderSafeText(compactionRunner.tasks[0]!.prompt))
        .toBe(true);
      expect(providerSafeCompactionText.isProviderSafeText(compactionRunner.tasks[1]!.prompt))
        .toBe(true);
      expect(compactionRunner.tasks[0]?.prompt).not.toContain('\uFFFD');
      expect(compactionRunner.tasks[1]?.prompt).not.toContain('\uFFFD');

      expect(memoryManager?.getWorkingContextMessages().map((message) => message.toDict()))
        .not.toEqual(messagesBeforeCompaction);
      const store = memoryManager?.store as FileMemoryStore;
      expect(store.list(MemoryType.EPISODIC).length).toBe(1);
      expect(store.list(MemoryType.SEMANTIC).length).toBe(1);
      expect(store.readArchiveRawTraces().length).toBeGreaterThan(0);

      const remainingRawTraces = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(remainingRawTraces.some((item) =>
        item.content.includes('Observe a missing prompt-token total.'))).toBe(true);
      expect(remainingRawTraces.some((item) => item.content.includes('Seed turn 1'))).toBe(false);

      const fifthRequest = mainLLM.requests[4] ?? [];
      const memorySummaryMessage = fifthRequest.find(
        (message) => message.role === 'user' && typeof message.content === 'string' && message.content.includes('Earlier progress:')
      );
      expect(memorySummaryMessage?.content).toContain('First turn summary');
      expect(memorySummaryMessage?.content).not.toContain('🛡');
      expect(memorySummaryMessage?.content).not.toContain('\uFFFD');
      expect(providerSafeCompactionText.isProviderSafeText(memorySummaryMessage?.content ?? ''))
        .toBe(true);
      for (const message of fifthRequest) {
        if (typeof message.content === 'string') {
          expect(providerSafeCompactionText.isProviderSafeText(message.content)).toBe(true);
        }
      }
      expect(fifthRequest.at(-1)?.content).toBe('Observe a missing prompt-token total.');

      notifier?.unsubscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);
    } finally {
      if (agent.isRunning) {
        await agent.stop(2);
      }
      await mainLLM.cleanup();
      fs.rmSync(tempDir, { recursive: true, force: true });
      if (originalCompactionDebugLogs === undefined) {
        delete process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS;
      } else {
        process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS = originalCompactionDebugLogs;
      }
    }
  }, 30000);

  it('fails before a child launch and blocks the USER retry dispatch when the final prompt invariant fails', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-compaction-input-failure-'));
    const compactionRunner = new RecordingCompactionAgentRunner(JSON.stringify({
      episodes: [{ summary: 'This output must never be requested.' }],
      critical_issues: [],
      unresolved_work: [],
      durable_facts: [],
      user_preferences: [],
      important_artifacts: [],
    }));
    const mainLLM = new RecordingMainLLM(
      createMainModel(),
      new LLMConfig({
        systemMessage: 'Runtime compaction system prompt',
        maxTokens: 200,
        compactionRatio: 0.5,
        safetyMarginTokens: 10,
      }),
      [200, 200, 200, 3_000],
    );
    const agent = new AgentFactory().createAgent(createConfig(tempDir, mainLLM, compactionRunner));
    const compactionEvents: CompactionEventPayload[] = [];

    try {
      agent.start();
      expect(await waitForStatus(
        agent.context,
        (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR,
      )).toBe(true);
      const notifier = agent.context.statusManager?.notifier;
      const onCompactionStatus = (payload?: unknown) => {
        if (isCompactionEventPayload(payload)) compactionEvents.push(payload);
      };
      notifier?.subscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);

      for (let turnIndex = 1; turnIndex <= 3; turnIndex += 1) {
        await agent.postUserMessage(new AgentInputUserMessage(
          promptSizedUserMessage(`Input-failure seed ${turnIndex}`),
        ));
        expect(await waitForCondition(
          () => mainLLM.requests.length === turnIndex && agent.currentStatus === AgentStatus.IDLE,
          10000,
        )).toBe(true);
      }

      const originalIsProviderSafeText = providerSafeCompactionText.isProviderSafeText
        .bind(providerSafeCompactionText);
      vi.spyOn(providerSafeCompactionText, 'isProviderSafeText').mockImplementation((value) =>
        value.includes('Here is the conversation history of the target agent')
          ? false
          : originalIsProviderSafeText(value));
      await agent.postUserMessage(new AgentInputUserMessage('Trigger local input construction failure.'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 4
          && compactionEvents.filter(({ phase }) => phase === 'failed').length === 1
          && agent.context.state.memoryManager?.isCompactionAwaitingUserRetry() === true
          && agent.currentStatus === AgentStatus.IDLE,
        10000,
      )).toBe(true);

      expect(compactionRunner.tasks).toHaveLength(0);
      expect(compactionEvents.map(({ phase }) => phase))
        .toEqual(['requested', 'started', 'failed']);
      expect(compactionEvents.at(-1)?.error_message).toContain('[input_construction_failure]');
      const store = agent.context.state.memoryManager?.store as FileMemoryStore;
      expect(store.list(MemoryType.EPISODIC)).toHaveLength(0);
      expect(store.list(MemoryType.SEMANTIC)).toHaveLength(0);
      expect(store.readArchiveRawTraces()).toHaveLength(0);
      const canonicalAfterInitialFailure = snapshotCanonicalCompactionFiles(store.agentDir);

      await agent.postUserMessage(new AgentInputUserMessage(
        'continue-after-input-construction-failure',
      ));
      expect(await waitForCondition(
        () => compactionEvents.filter(({ phase }) => phase === 'failed').length === 2
          && agent.context.state.memoryManager?.isCompactionAwaitingUserRetry() === true
          && agent.currentStatus === AgentStatus.IDLE,
        10000,
      )).toBe(true);

      expect(mainLLM.requests).toHaveLength(4);
      expect(compactionRunner.tasks).toHaveLength(0);
      expect(compactionEvents.map(({ phase }) => phase))
        .toEqual(['requested', 'started', 'failed', 'started', 'failed']);
      expect(compactionEvents.at(-1)?.error_message).toContain('[input_construction_failure]');
      expect(snapshotCanonicalCompactionFiles(store.agentDir)).toEqual(canonicalAfterInitialFailure);
      expect(store.list(MemoryType.EPISODIC)).toHaveLength(0);
      expect(store.list(MemoryType.SEMANTIC)).toHaveLength(0);
      expect(store.readArchiveRawTraces()).toHaveLength(0);

      notifier?.unsubscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);
    } finally {
      vi.restoreAllMocks();
      if (agent.isRunning) await agent.stop(2);
      await mainLLM.cleanup();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);

  it('fails closed on a typed runner error and admits one USER retry ahead of retained non-user starts', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-compaction-runner-retry-'));
    const compactionRunner = new RecordingCompactionAgentRunner([
      new CompactionAgentRunnerError(
        'error_completion',
        'provider request failed before a usable assistant response',
        {
          compactionRunId: 'compaction-run-failed-1',
          taskId: 'compaction-task-failed-1',
          modelIdentifier: 'compactor-model',
          provider: 'test-provider',
        },
      ),
      JSON.stringify({
        episodes: [{ summary: 'Recovered through the user-authorized retry.' }],
        critical_issues: [],
        unresolved_work: [],
        durable_facts: [],
        user_preferences: [],
        important_artifacts: [],
      }),
    ]);
    const mainLLM = new RecordingMainLLM(
      createMainModel(),
      new LLMConfig({
        systemMessage: 'Runtime compaction system prompt',
        maxTokens: 200,
        compactionRatio: 0.5,
        safetyMarginTokens: 10,
      }),
      [200, 200, 200, 3_000, 200, 200, 200, 200],
    );
    const agent = new AgentFactory().createAgent(createConfig(tempDir, mainLLM, compactionRunner));
    const compactionEvents: CompactionEventPayload[] = [];

    try {
      agent.start();
      expect(await waitForStatus(
        agent.context,
        (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR,
      )).toBe(true);
      const notifier = agent.context.statusManager?.notifier;
      const onCompactionStatus = (payload?: unknown) => {
        if (isCompactionEventPayload(payload)) compactionEvents.push(payload);
      };
      notifier?.subscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);

      for (let turnIndex = 1; turnIndex <= 3; turnIndex += 1) {
        await agent.postUserMessage(new AgentInputUserMessage(
          promptSizedUserMessage(`Runner-failure seed ${turnIndex}`),
        ));
        expect(await waitForCondition(
          () => mainLLM.requests.length === turnIndex && agent.currentStatus === AgentStatus.IDLE,
          10000,
        )).toBe(true);
      }

      await agent.postUserMessage(new AgentInputUserMessage('Trigger the runner failure.'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 4
          && compactionRunner.tasks.length === 1
          && agent.context.state.memoryManager?.isCompactionAwaitingUserRetry() === true
          && compactionEvents.some(({ phase }) => phase === 'failed')
          && agent.currentStatus === AgentStatus.IDLE,
        10000,
      )).toBe(true);
      expect(compactionEvents.map(({ phase }) => phase)).toEqual(['requested', 'started', 'failed']);
      expect(compactionEvents[2]).toMatchObject({
        compaction_run_id: 'compaction-run-failed-1',
        compaction_task_id: 'compaction-task-failed-1',
      });
      expect(compactionEvents[2]?.error_message).toContain(
        'provider request failed before a usable assistant response',
      );
      const store = agent.context.state.memoryManager?.store as FileMemoryStore;
      expect(store.list(MemoryType.EPISODIC)).toHaveLength(0);
      expect(store.list(MemoryType.SEMANTIC)).toHaveLength(0);
      expect(store.readArchiveRawTraces()).toHaveLength(0);

      await agent.postInterAgentMessage(new InterAgentMessage(
        'RuntimeCompactionAgent',
        agent.agentId,
        'retained-direct-agent-a',
        'handoff',
        'source-agent-a',
      ));
      await agent.postUserMessage(new AgentInputUserMessage(
        'retained-agent-carrier-b',
        SenderType.AGENT,
      ));
      await agent.postUserMessage(new AgentInputUserMessage(
        'retained-system-s',
        SenderType.SYSTEM,
      ));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mainLLM.requests).toHaveLength(4);
      expect(compactionRunner.tasks).toHaveLength(1);
      expect(compactionEvents.filter(({ phase }) => phase === 'failed')).toHaveLength(1);

      await agent.postUserMessage(new AgentInputUserMessage('continue-after-runner-failure'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 8
          && compactionRunner.tasks.length === 2
          && agent.context.state.memoryManager?.hasPendingCompaction() === false
          && agent.currentStatus === AgentStatus.IDLE,
        15000,
      )).toBe(true);

      expect(compactionEvents.map(({ phase }) => phase))
        .toEqual(['requested', 'started', 'failed', 'started', 'completed']);
      expect(compactionEvents.filter(({ phase }) => phase === 'failed')).toHaveLength(1);
      expect(compactionRunner.tasks).toHaveLength(2);
      expect(store.list(MemoryType.EPISODIC)).toHaveLength(1);
      expect(store.readArchiveRawTraces().length).toBeGreaterThan(0);

      const dispatchedAfterRecovery = mainLLM.requests.slice(4)
        .map((request) => JSON.stringify(request));
      expect(dispatchedAfterRecovery).toHaveLength(4);
      expect(dispatchedAfterRecovery[0]).toContain('continue-after-runner-failure');
      expect(dispatchedAfterRecovery[1]).toContain('retained-direct-agent-a');
      expect(dispatchedAfterRecovery[2]).toContain('retained-agent-carrier-b');
      expect(dispatchedAfterRecovery[3]).toContain('retained-system-s');

      notifier?.unsubscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);
    } finally {
      if (agent.isRunning) await agent.stop(2);
      await mainLLM.cleanup();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);

  it('keeps compaction pending and blocks the next provider dispatch when compaction agent output is invalid', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-compaction-fail-'));
    const compactionRunner = new RecordingCompactionAgentRunner('not valid json');
    const mainLLM = new RecordingMainLLM(
      createMainModel(),
      new LLMConfig({
        systemMessage: 'Runtime compaction system prompt',
        maxTokens: 200,
        compactionRatio: 0.5,
        safetyMarginTokens: 10
      }),
      [200, 200, 200, 3_000]
    );
    const agent = new AgentFactory().createAgent(createConfig(tempDir, mainLLM, compactionRunner));
    const compactionEvents: CompactionEventPayload[] = [];
    const snapshotCanonicalState = () => {
      const manager = agent.context.state.memoryManager!;
      const store = manager.store as FileMemoryStore;
      return {
        workingContext: manager.getWorkingContextMessages().map((message) => message.toDict()),
        episodes: store.list(MemoryType.EPISODIC).map((item) => item.toDict()),
        semantics: store.list(MemoryType.SEMANTIC).map((item) => item.toDict()),
        archivedRawTraces: store.readArchiveRawTraces(),
        canonicalFiles: snapshotCanonicalCompactionFiles(store.agentDir),
      };
    };
    let startedAttemptBaseline: ReturnType<typeof snapshotCanonicalState> | null = null;

    try {
      agent.start();
      expect(await waitForStatus(agent.context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR)).toBe(true);
      const notifier = agent.context.statusManager?.notifier;
      const onCompactionStatus = (payload?: unknown) => {
        if (isCompactionEventPayload(payload)) {
          compactionEvents.push(payload);
          if (payload.phase === 'started') {
            startedAttemptBaseline = snapshotCanonicalState();
          }
        }
      };
      notifier?.subscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);

      for (let turnIndex = 1; turnIndex <= 3; turnIndex += 1) {
        await agent.postUserMessage(new AgentInputUserMessage(
          promptSizedUserMessage(`Seed turn ${turnIndex}`),
        ));
        expect(await waitForCondition(
          () => mainLLM.requests.length === turnIndex && agent.currentStatus === AgentStatus.IDLE && agent.context.state.activeTurn === null,
          10000
        )).toBe(true);
      }

      await agent.postUserMessage(new AgentInputUserMessage('Please remember this failing turn.'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 4
          && agent.context.state.memoryManager?.isCompactionAwaitingUserRetry() === true
          && compactionEvents.some((event) => event.phase === 'failed')
          && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);

      const store = agent.context.state.memoryManager?.store as FileMemoryStore;
      expect(startedAttemptBaseline).not.toBeNull();
      expect(snapshotCanonicalState()).toEqual(startedAttemptBaseline);
      expect(agent.context.state.memoryManager?.getPendingCompactionGate().kind)
        .toBe('awaiting_user_retry');
      await agent.postUserMessage(new AgentInputUserMessage('Try to continue anyway.'));

      expect(await waitForCondition(
        () => compactionEvents.filter((event) => event.phase === 'failed').length === 2
          && compactionRunner.tasks.length === 4
          && mainLLM.requests.length === 4
          && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);

      expect(mainLLM.requests).toHaveLength(4);
      expect(compactionRunner.tasks).toHaveLength(4);
      expect(compactionEvents.map((event) => event.phase)).toEqual([
        'requested', 'started', 'failed', 'started', 'failed',
      ]);
      const failedOperationId = compactionEvents[0]?.compaction_operation_id;
      expect(typeof failedOperationId).toBe('string');
      expect(compactionEvents.every((event) => event.compaction_operation_id === failedOperationId)).toBe(true);
      expect(compactionEvents[1]).toMatchObject({
        requested_turn_id: compactionEvents[0]?.turn_id,
        execution_turn_id: compactionEvents[1]?.turn_id,
      });
      expect(compactionEvents[2]).toMatchObject({
        requested_turn_id: compactionEvents[0]?.turn_id,
        execution_turn_id: compactionEvents[1]?.turn_id,
        compaction_agent_definition_id: 'memory-compactor',
        compaction_model_identifier: 'gpt-5.4-codex',
        compaction_run_id: 'compaction-run-2',
      });
      expect(compactionEvents[2]?.error_message).toContain('Memory compaction failed before dispatch');
      expect(compactionEvents[2]?.error_message).toContain('compactionRunId=compaction-run-1');
      expect(compactionEvents[2]?.error_message).toContain('compactionRunId=compaction-run-2');
      expect(agent.context.state.memoryManager?.isCompactionAwaitingUserRetry()).toBe(true);
      expect(agent.context.state.memoryManager?.getPendingCompactionRequest()?.operationId).toBe(failedOperationId);
      expect(store.list(MemoryType.EPISODIC)).toHaveLength(0);
      expect(store.list(MemoryType.SEMANTIC)).toHaveLength(0);
      expect(store.readArchiveRawTraces()).toHaveLength(0);
      expect(startedAttemptBaseline).not.toBeNull();
      expect(snapshotCanonicalState()).toEqual(startedAttemptBaseline);

      notifier?.unsubscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);
    } finally {
      if (agent.isRunning) {
        await agent.stop(2);
      }
      await mainLLM.cleanup();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});
