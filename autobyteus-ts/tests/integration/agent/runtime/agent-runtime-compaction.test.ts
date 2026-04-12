import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMFactory } from '../../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message } from '../../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { EventType } from '../../../../src/events/event-types.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { resetAgentFactory, waitForCondition, waitForStatus } from './runtime-test-harness.js';
import { RawTraceItem } from '../../../../src/memory/models/raw-trace-item.js';

type CompactionEventPayload = {
  phase: string;
  compaction_model_identifier?: string | null;
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

  protected async _sendMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>
  ): Promise<CompleteResponse> {
    const callIndex = this.recordRequest(messages);
    return new CompleteResponse(this.buildResponsePayload(callIndex));
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>
  ): AsyncGenerator<ChunkResponse, void, unknown> {
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

class StubCompactionLLM extends BaseLLM {
  constructor(
    model: LLMModel,
    config: LLMConfig,
    private readonly requestSink: Array<Array<Record<string, unknown>>>,
    private readonly responseContent: string
  ) {
    super(model, config);
  }

  protected async _sendMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>
  ): Promise<CompleteResponse> {
    this.requestSink.push(messages.map((message) => message.toDict()));
    return new CompleteResponse({ content: this.responseContent });
  }

  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> {
    throw new Error('StubCompactionLLM streaming should not be used in compaction tests.');
  }
}

const ORIGINAL_ENV = {
  modelIdentifier: process.env.AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER,
  triggerRatio: process.env.AUTOBYTEUS_COMPACTION_TRIGGER_RATIO,
  activeContextOverride: process.env.AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE,
  debugLogs: process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS
};

const restoreCompactionEnv = (): void => {
  if (ORIGINAL_ENV.modelIdentifier === undefined) {
    delete process.env.AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER;
  } else {
    process.env.AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER = ORIGINAL_ENV.modelIdentifier;
  }

  if (ORIGINAL_ENV.triggerRatio === undefined) {
    delete process.env.AUTOBYTEUS_COMPACTION_TRIGGER_RATIO;
  } else {
    process.env.AUTOBYTEUS_COMPACTION_TRIGGER_RATIO = ORIGINAL_ENV.triggerRatio;
  }

  if (ORIGINAL_ENV.activeContextOverride === undefined) {
    delete process.env.AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE;
  } else {
    process.env.AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE = ORIGINAL_ENV.activeContextOverride;
  }

  if (ORIGINAL_ENV.debugLogs === undefined) {
    delete process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS;
  } else {
    process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS = ORIGINAL_ENV.debugLogs;
  }
};

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

const createCompactionModel = (modelIdentifier: string) =>
  new LLMModel({
    name: modelIdentifier,
    value: modelIdentifier,
    canonicalName: modelIdentifier,
    provider: LLMProvider.OPENAI
  });

describe('Agent runtime compaction integration', () => {
  const originalCreateLLM = LLMFactory.createLLM;

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
    restoreCompactionEnv();
    (LLMFactory as any).createLLM = originalCreateLLM;
    vi.restoreAllMocks();
  });

  it('uses default AgentFactory wiring to compact memory before the next LLM leg', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-compaction-'));
    const compactionModelIdentifier = 'runtime-compaction-model';
    const compactionRequests: Array<Array<Record<string, unknown>>> = [];

    process.env.AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER = compactionModelIdentifier;
    delete process.env.AUTOBYTEUS_COMPACTION_TRIGGER_RATIO;
    delete process.env.AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE;
    delete process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS;

    (LLMFactory as any).createLLM = async (
      modelIdentifier: string,
      llmConfig?: LLMConfig
    ) => {
      if (modelIdentifier !== compactionModelIdentifier) {
        return originalCreateLLM.call(LLMFactory, modelIdentifier, llmConfig);
      }

      return new StubCompactionLLM(
        createCompactionModel(compactionModelIdentifier),
        llmConfig ?? new LLMConfig(),
        compactionRequests,
        JSON.stringify({
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
        })
      );
    };

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

    const config = new AgentConfig(
      'RuntimeCompactionAgent',
      'Tester',
      'Runtime compaction integration test agent',
      mainLLM
    );
    config.memoryDir = tempDir;

    const factory = new AgentFactory();
    const agent = factory.createAgent(config);
    const compactionEvents: CompactionEventPayload[] = [];

    try {
      agent.start();
      const ready = await waitForStatus(
        agent.context,
        (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR
      );
      expect(ready).toBe(true);
      expect(agent.currentStatus).toBe(AgentStatus.IDLE);

      const notifier = agent.context.statusManager?.notifier;
      const onCompactionStatus = (payload?: unknown) => {
        if (isCompactionEventPayload(payload)) {
          compactionEvents.push(payload);
        }
      };
      notifier?.subscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);

      for (let turnIndex = 1; turnIndex <= 3; turnIndex += 1) {
        await agent.postUserMessage(new AgentInputUserMessage(`Seed turn ${turnIndex}`));

        const seededTurnSettled = await waitForCondition(
          () =>
            mainLLM.requests.length === turnIndex &&
            agent.context.state.memoryManager?.compactionRequired === false &&
            agent.currentStatus === AgentStatus.IDLE &&
            agent.context.state.activeTurn === null,
          10000
        );
        expect(seededTurnSettled).toBe(true);
      }

      await agent.postUserMessage(new AgentInputUserMessage('Please remember the first turn.'));

      const triggerTurnSettled = await waitForCondition(
        () =>
          mainLLM.requests.length === 4 &&
          agent.context.state.memoryManager?.compactionRequired === true &&
          agent.currentStatus === AgentStatus.IDLE &&
          agent.context.state.activeTurn === null,
        10000
      );
      expect(triggerTurnSettled).toBe(true);
      expect(compactionEvents.map((event) => event.phase)).toEqual(['requested']);
      expect(compactionEvents[0]?.compaction_model_identifier).toBe(compactionModelIdentifier);

      const memoryManager = agent.context.state.memoryManager;
      expect(memoryManager).not.toBeNull();
      const epochBeforeCompaction = memoryManager?.workingContextSnapshot.epochId ?? 0;

      await agent.postUserMessage(new AgentInputUserMessage('What should you do next?'));

      const compactionTurnSettled = await waitForCondition(
        () =>
          mainLLM.requests.length === 5 &&
          agent.context.state.memoryManager?.compactionRequired === false &&
          agent.currentStatus === AgentStatus.IDLE &&
          agent.context.state.activeTurn === null,
        10000
      );
      expect(compactionTurnSettled).toBe(true);

      const notifierEvents = compactionEvents.map((event) => event.phase);
      expect(notifierEvents).toEqual(['requested', 'started', 'completed']);
      expect(compactionEvents[1]?.compaction_model_identifier).toBe(compactionModelIdentifier);
      expect(compactionEvents[2]).toMatchObject({
        phase: 'completed',
        compaction_model_identifier: compactionModelIdentifier
      });
      expect(compactionEvents[2]?.raw_trace_count).toBeGreaterThan(0);
      expect(compactionEvents[2]?.semantic_fact_count).toBe(1);

      expect(compactionRequests).toHaveLength(1);
      expect(compactionRequests[0]?.[0]?.role).toBe('system');
      expect(compactionRequests[0]?.[1]?.role).toBe('user');
      expect(compactionRequests[0]?.[1]?.content).toContain('[SETTLED_BLOCKS]');
      expect(compactionRequests[0]?.[1]?.content).toContain('Seed turn 1');
      expect(compactionRequests[0]?.[1]?.content).toContain('Seed turn 2');
      expect(compactionRequests[0]?.[1]?.content).toContain('Please remember the first turn.');
      expect(compactionRequests[0]?.[1]?.content).not.toContain('What should you do next?');

      expect(memoryManager?.workingContextSnapshot.epochId).toBeGreaterThan(epochBeforeCompaction);

      const store = memoryManager?.store as FileMemoryStore;
      expect(store.list(MemoryType.EPISODIC).length).toBe(1);
      expect(store.list(MemoryType.SEMANTIC).length).toBe(1);
      expect(store.readArchiveRawTraces().length).toBeGreaterThan(0);

      const remainingRawTraces = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      const rawTraceTurnIds = new Set(remainingRawTraces.map((item) => item.turnId));
      expect(rawTraceTurnIds.size).toBe(1);
      expect(remainingRawTraces.some((item) => item.content.includes('What should you do next?'))).toBe(true);
      expect(remainingRawTraces.some((item) => item.content.includes('Seed turn 1'))).toBe(false);

      const fifthRequest = mainLLM.requests[4] ?? [];
      expect(fifthRequest[0]?.role).toBe('system');
      const memorySummaryMessage = fifthRequest.find(
        (message) =>
          message.role === 'user' &&
          typeof message.content === 'string' &&
          message.content.includes('[MEMORY:EPISODIC]')
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

  it('keeps compaction pending and blocks the next provider dispatch when compaction fails', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-compaction-fail-'));
    const compactionModelIdentifier = 'runtime-compaction-model-fail';
    const compactionRequests: Array<Array<Record<string, unknown>>> = [];

    process.env.AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER = compactionModelIdentifier;
    delete process.env.AUTOBYTEUS_COMPACTION_TRIGGER_RATIO;
    delete process.env.AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE;
    delete process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS;

    (LLMFactory as any).createLLM = async (
      modelIdentifier: string,
      llmConfig?: LLMConfig
    ) => {
      if (modelIdentifier !== compactionModelIdentifier) {
        return originalCreateLLM.call(LLMFactory, modelIdentifier, llmConfig);
      }

      return new StubCompactionLLM(
        createCompactionModel(compactionModelIdentifier),
        llmConfig ?? new LLMConfig(),
        compactionRequests,
        'not valid json'
      );
    };

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

    const config = new AgentConfig(
      'RuntimeCompactionFailureAgent',
      'Tester',
      'Runtime compaction failure integration test agent',
      mainLLM
    );
    config.memoryDir = tempDir;

    const factory = new AgentFactory();
    const agent = factory.createAgent(config);
    const compactionEvents: CompactionEventPayload[] = [];

    try {
      agent.start();
      const ready = await waitForStatus(
        agent.context,
        (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR
      );
      expect(ready).toBe(true);
      expect(agent.currentStatus).toBe(AgentStatus.IDLE);

      const notifier = agent.context.statusManager?.notifier;
      const onCompactionStatus = (payload?: unknown) => {
        if (isCompactionEventPayload(payload)) {
          compactionEvents.push(payload);
        }
      };
      notifier?.subscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompactionStatus);

      for (let turnIndex = 1; turnIndex <= 3; turnIndex += 1) {
        await agent.postUserMessage(new AgentInputUserMessage(`Seed turn ${turnIndex}`));

        const seededTurnSettled = await waitForCondition(
          () =>
            mainLLM.requests.length === turnIndex &&
            agent.context.state.memoryManager?.compactionRequired === false &&
            agent.currentStatus === AgentStatus.IDLE &&
            agent.context.state.activeTurn === null,
          10000
        );
        expect(seededTurnSettled).toBe(true);
      }

      await agent.postUserMessage(new AgentInputUserMessage('Please remember this failing turn.'));

      const triggerTurnSettled = await waitForCondition(
        () =>
          mainLLM.requests.length === 4 &&
          agent.context.state.memoryManager?.compactionRequired === true &&
          agent.currentStatus === AgentStatus.IDLE &&
          agent.context.state.activeTurn === null,
        10000
      );
      expect(triggerTurnSettled).toBe(true);

      const memoryManager = agent.context.state.memoryManager;
      expect(memoryManager).not.toBeNull();
      const store = memoryManager?.store as FileMemoryStore;

      await agent.postUserMessage(new AgentInputUserMessage('Try to continue anyway.'));

      const failureSettled = await waitForCondition(
        () =>
          compactionEvents.some((event) => event.phase === 'failed') &&
          mainLLM.requests.length === 4 &&
          agent.currentStatus === AgentStatus.IDLE &&
          agent.context.state.activeTurn === null,
        10000
      );
      expect(failureSettled).toBe(true);

      expect(mainLLM.requests).toHaveLength(4);
      expect(compactionRequests).toHaveLength(1);
      expect(compactionEvents.map((event) => event.phase)).toEqual(['requested', 'started', 'failed']);
      expect(compactionEvents[2]?.compaction_model_identifier).toBe(compactionModelIdentifier);
      expect(compactionEvents[2]?.error_message).toContain('Memory compaction failed before dispatch');
      expect(memoryManager?.compactionRequired).toBe(true);
      expect(store.list(MemoryType.EPISODIC)).toHaveLength(0);
      expect(store.readArchiveRawTraces()).toHaveLength(0);

      const rawTraceTurnIds = new Set(
        (store.list(MemoryType.RAW_TRACE) as RawTraceItem[]).map((item) => item.turnId)
      );
      expect(rawTraceTurnIds.size).toBeGreaterThanOrEqual(5);

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
