import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message } from '../../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { buildLlmTokenUsageObservation } from '../../../../src/llm/utils/llm-token-usage-observation.js';
import { EventType } from '../../../../src/events/event-types.js';
import type { CompactionAgentRunner, CompactionAgentTask } from '../../../../src/memory/compaction/compaction-agent-runner.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { resetAgentFactory, waitForCondition, waitForStatus } from './runtime-test-harness.js';
import { RawTraceItem } from '../../../../src/memory/models/raw-trace-item.js';

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

class RecordingMainLLM extends BaseLLM {
  readonly requests: Array<Array<Record<string, unknown>>> = [];

  constructor(
    model: LLMModel,
    config: LLMConfig,
    private readonly promptTokensByCall: number[]
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
    const promptTokens = this.promptTokensByCall[callIndex - 1] ?? 1;
    return {
      content: `assistant-turn-${callIndex}`,
      usage: buildLlmTokenUsageObservation({
        inputTokens: promptTokens,
        outputTokens: 1,
        totalTokens: promptTokens + 1,
        rawUsage: null,
      }),
    };
  }
}

class RecordingCompactionAgentRunner implements CompactionAgentRunner {
  readonly tasks: CompactionAgentTask[] = [];

  constructor(private readonly outputText: string | string[]) {}

  async runCompactionTask(task: CompactionAgentTask) {
    this.tasks.push(task);
    const outputText = Array.isArray(this.outputText)
      ? this.outputText[this.tasks.length - 1] ?? this.outputText.at(-1)!
      : this.outputText;
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

const createMainModel = () =>
  new LLMModel({
    name: 'runtime-compaction-main-model',
    value: 'runtime-compaction-main-model',
    canonicalName: 'runtime-compaction-main-model',
    provider: LLMProvider.OPENAI,
    activeContextTokens: 150,
    maxContextTokens: 150,
    maxOutputTokens: 20
  });

const createConfig = (tempDir: string, mainLLM: RecordingMainLLM, runner: CompactionAgentRunner): AgentConfig => {
  const config = new AgentConfig(
    'RuntimeCompactionAgent',
    'Tester',
    'Runtime compaction integration test agent',
    mainLLM
  );
  config.memoryDir = tempDir;
  config.compactionAgentRunner = runner;
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
    const compactionRunner = new RecordingCompactionAgentRunner([
      'source-task commentary without a compaction object',
      JSON.stringify({
        episodes: [{ summary: 'First turn summary' }],
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
      createMainModel(),
      new LLMConfig({
        systemMessage: 'Runtime compaction system prompt',
        maxTokens: 20,
        compactionRatio: 0.5,
        safetyMarginTokens: 10
      }),
      [20, 20, 20, 80, 20]
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
        await agent.postUserMessage(new AgentInputUserMessage(`Seed turn ${turnIndex}`));
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

      await agent.postUserMessage(new AgentInputUserMessage('What should you do next?'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 5
          && agent.context.state.memoryManager?.compactionRequired === false
          && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);

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

      expect(memoryManager?.getWorkingContextMessages().map((message) => message.toDict()))
        .not.toEqual(messagesBeforeCompaction);
      const store = memoryManager?.store as FileMemoryStore;
      expect(store.list(MemoryType.EPISODIC).length).toBe(1);
      expect(store.list(MemoryType.SEMANTIC).length).toBe(1);
      expect(store.readArchiveRawTraces().length).toBeGreaterThan(0);

      const remainingRawTraces = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(remainingRawTraces.some((item) => item.content.includes('What should you do next?'))).toBe(true);
      expect(remainingRawTraces.some((item) => item.content.includes('Seed turn 1'))).toBe(false);

      const fifthRequest = mainLLM.requests[4] ?? [];
      const memorySummaryMessage = fifthRequest.find(
        (message) => message.role === 'user' && typeof message.content === 'string' && message.content.includes('Earlier progress:')
      );
      expect(memorySummaryMessage?.content).toContain('First turn summary');
      expect(fifthRequest.at(-1)?.content).toBe('What should you do next?');

      notifier?.unsubscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);
    } finally {
      if (agent.isRunning) {
        await agent.stop(2);
      }
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
        maxTokens: 20,
        compactionRatio: 0.5,
        safetyMarginTokens: 10
      }),
      [20, 20, 20, 80]
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
        await agent.postUserMessage(new AgentInputUserMessage(`Seed turn ${turnIndex}`));
        expect(await waitForCondition(
          () => mainLLM.requests.length === turnIndex && agent.currentStatus === AgentStatus.IDLE && agent.context.state.activeTurn === null,
          10000
        )).toBe(true);
      }

      await agent.postUserMessage(new AgentInputUserMessage('Please remember this failing turn.'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 4
          && agent.context.state.memoryManager?.compactionRequired === true
          && compactionEvents.some((event) => event.phase === 'failed')
          && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);

      const store = agent.context.state.memoryManager?.store as FileMemoryStore;
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
      expect(agent.context.state.memoryManager?.compactionRequired).toBe(true);
      expect(agent.context.state.memoryManager?.getPendingCompactionRequest()?.operationId).toBe(failedOperationId);
      expect(store.list(MemoryType.EPISODIC)).toHaveLength(0);
      expect(store.readArchiveRawTraces()).toHaveLength(0);

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
