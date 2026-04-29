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
import { EventType } from '../../../../src/events/event-types.js';
import type { CompactionAgentRunner, CompactionAgentTask } from '../../../../src/memory/compaction/compaction-agent-runner.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { resetAgentFactory, waitForCondition, waitForStatus } from './runtime-test-harness.js';
import { RawTraceItem } from '../../../../src/memory/models/raw-trace-item.js';

type CompactionEventPayload = {
  phase: string;
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
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: 1,
        total_tokens: promptTokens + 1
      }
    };
  }
}

class RecordingCompactionAgentRunner implements CompactionAgentRunner {
  readonly tasks: CompactionAgentTask[] = [];

  constructor(private readonly outputText: string) {}

  async runCompactionTask(task: CompactionAgentTask) {
    this.tasks.push(task);
    return {
      outputText: this.outputText,
      metadata: {
        compactionAgentDefinitionId: 'memory-compactor',
        compactionAgentName: 'Memory Compactor',
        runtimeKind: 'codex_app_server',
        modelIdentifier: 'gpt-5.4-codex',
        compactionRunId: 'compaction-run-1',
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
    const compactionRunner = new RecordingCompactionAgentRunner(JSON.stringify({
      episodic_summary: 'First turn summary',
      critical_issues: [],
      unresolved_work: [],
      durable_facts: [
        {
          fact: 'The user asked the agent to remember the first turn.',
          tags: ['memory']
        }
      ],
      user_preferences: [],
      important_artifacts: []
    }));
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

      await agent.postUserMessage(new AgentInputUserMessage('Please remember the first turn.'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 4 && agent.context.state.memoryManager?.compactionRequired === true && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);
      expect(compactionEvents.map((event) => event.phase)).toEqual(['requested']);

      const memoryManager = agent.context.state.memoryManager;
      const epochBeforeCompaction = memoryManager?.workingContextSnapshot.epochId ?? 0;

      await agent.postUserMessage(new AgentInputUserMessage('What should you do next?'));
      expect(await waitForCondition(
        () => mainLLM.requests.length === 5 && agent.context.state.memoryManager?.compactionRequired === false && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);

      expect(compactionEvents.map((event) => event.phase)).toEqual(['requested', 'started', 'completed']);
      expect(compactionEvents[2]).toMatchObject({
        phase: 'completed',
        compaction_agent_definition_id: 'memory-compactor',
        compaction_agent_name: 'Memory Compactor',
        compaction_runtime_kind: 'codex_app_server',
        compaction_model_identifier: 'gpt-5.4-codex',
        compaction_run_id: 'compaction-run-1',
      });
      expect(compactionEvents[2]?.raw_trace_count).toBeGreaterThan(0);
      expect(compactionEvents[2]?.semantic_fact_count).toBe(1);

      expect(compactionRunner.tasks).toHaveLength(1);
      expect(compactionRunner.tasks[0]?.prompt).toContain('[SETTLED_BLOCKS]');
      expect(compactionRunner.tasks[0]?.prompt).toContain('Seed turn 1');
      expect(compactionRunner.tasks[0]?.prompt).toContain('Seed turn 2');
      expect(compactionRunner.tasks[0]?.prompt).toContain('Please remember the first turn.');
      expect(compactionRunner.tasks[0]?.prompt).not.toContain('What should you do next?');

      expect(memoryManager?.workingContextSnapshot.epochId).toBeGreaterThan(epochBeforeCompaction);
      const store = memoryManager?.store as FileMemoryStore;
      expect(store.list(MemoryType.EPISODIC).length).toBe(1);
      expect(store.list(MemoryType.SEMANTIC).length).toBe(1);
      expect(store.readArchiveRawTraces().length).toBeGreaterThan(0);

      const remainingRawTraces = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(remainingRawTraces.some((item) => item.content.includes('What should you do next?'))).toBe(true);
      expect(remainingRawTraces.some((item) => item.content.includes('Seed turn 1'))).toBe(false);

      const fifthRequest = mainLLM.requests[4] ?? [];
      const memorySummaryMessage = fifthRequest.find(
        (message) => message.role === 'user' && typeof message.content === 'string' && message.content.includes('[MEMORY:EPISODIC]')
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
        () => mainLLM.requests.length === 4 && agent.context.state.memoryManager?.compactionRequired === true && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);

      const store = agent.context.state.memoryManager?.store as FileMemoryStore;
      await agent.postUserMessage(new AgentInputUserMessage('Try to continue anyway.'));

      expect(await waitForCondition(
        () => compactionEvents.some((event) => event.phase === 'failed') && mainLLM.requests.length === 4 && agent.currentStatus === AgentStatus.IDLE,
        10000
      )).toBe(true);

      expect(mainLLM.requests).toHaveLength(4);
      expect(compactionRunner.tasks).toHaveLength(1);
      expect(compactionEvents.map((event) => event.phase)).toEqual(['requested', 'started', 'failed']);
      expect(compactionEvents[2]).toMatchObject({
        compaction_agent_definition_id: 'memory-compactor',
        compaction_model_identifier: 'gpt-5.4-codex',
        compaction_run_id: 'compaction-run-1',
      });
      expect(compactionEvents[2]?.error_message).toContain('Memory compaction failed before dispatch');
      expect(agent.context.state.memoryManager?.compactionRequired).toBe(true);
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
