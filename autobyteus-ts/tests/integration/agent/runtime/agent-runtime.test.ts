import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentRuntime } from '../../../../src/agent/runtime/agent-runtime.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { ToolExecutionApprovalEvent, ToolResultEvent, UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import { BaseLLM, type LLMInvocationOptions } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { EventType } from '../../../../src/events/event-types.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { MemoryStore } from '../../../../src/memory/store/base-store.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { BaseTool, type ToolExecutionOptions } from '../../../../src/tools/base-tool.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import type { ChunkResponse } from '../../../../src/llm/utils/response-types.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[],
    _kwargs: Record<string, unknown>,
    _options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield { content: 'ok', is_complete: true } as ChunkResponse;
  }
}

class ControllableLLM extends BaseLLM {
  calls: string[] = [];
  options: LLMInvocationOptions[] = [];
  requestMessages: Message[][] = [];
  private releaseFirstResponse: (() => void) | null = null;
  private readonly firstRequestStarted: Promise<void>;
  private resolveFirstRequestStarted!: () => void;

  constructor(model: LLMModel, config: LLMConfig) {
    super(model, config);
    this.firstRequestStarted = new Promise<void>((resolve) => {
      this.resolveFirstRequestStarted = resolve;
    });
  }

  async waitForFirstRequestStart(): Promise<void> {
    await this.firstRequestStarted;
  }

  unblockFirstResponse(): void {
    this.releaseFirstResponse?.();
  }

  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>,
    options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requestMessages.push(messages);
    const latestUserContent =
      messages
        .filter((message) => message.role === MessageRole.USER)
        .at(-1)?.content ?? '';
    const callIndex = this.calls.push(String(latestUserContent));
    this.options.push(options ?? {});
    if (callIndex === 1) {
      this.resolveFirstRequestStarted();
      await new Promise<void>((resolve) => {
        this.releaseFirstResponse = resolve;
      });
      this.releaseFirstResponse = null;
    }

    yield { content: `reply-${callIndex}`, is_complete: true } as ChunkResponse;
  }
}

class SegmentInterruptLLM extends BaseLLM {
  private releaseAfterFirstChunk: (() => void) | null = null;
  private readonly firstChunkYielded: Promise<void>;
  private resolveFirstChunkYielded!: () => void;

  constructor(model: LLMModel, config: LLMConfig) {
    super(model, config);
    this.firstChunkYielded = new Promise<void>((resolve) => {
      this.resolveFirstChunkYielded = resolve;
    });
  }

  async waitForFirstChunk(): Promise<void> {
    await this.firstChunkYielded;
  }

  unblock(): void {
    this.releaseAfterFirstChunk?.();
  }

  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[],
    _kwargs: Record<string, unknown>,
    _options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield { content: 'partial streamed text' } as ChunkResponse;
    this.resolveFirstChunkYielded();
    await new Promise<void>((resolve) => {
      this.releaseAfterFirstChunk = resolve;
    });
    this.releaseAfterFirstChunk = null;
    yield { content: 'should not settle before interrupt', is_complete: true } as ChunkResponse;
  }
}

class SegmentFailureLLM extends BaseLLM {
  requestMessages: Message[][] = [];

  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>,
    _options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requestMessages.push(messages);
    yield { content: 'partial streamed text' } as ChunkResponse;
    yield {
      content: '',
      tool_calls: [
        {
          index: 0,
          call_id: 'call_stream_failure',
          name: ApprovalTool.getName(),
          arguments_delta: '{"path":"/tmp/partial'
        }
      ]
    } as ChunkResponse;
    throw new Error('stream exploded');
  }
}

class ApprovalToolCallingLLM extends BaseLLM {
  requestMessages: Message[][] = [];
  options: LLMInvocationOptions[] = [];

  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>,
    options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requestMessages.push(messages);
    this.options.push(options ?? {});
    const callIndex = this.requestMessages.length;

    if (callIndex === 1) {
      yield {
        content: '',
        tool_calls: [{ index: 0, call_id: 'call_approval_1', name: ApprovalTool.getName() }]
      } as ChunkResponse;
      yield {
        content: '',
        is_complete: true,
        tool_calls: [{ index: 0, arguments_delta: '{"path":"/tmp/interrupted.txt"}' }]
      } as ChunkResponse;
      return;
    }

    yield { content: `reply-${callIndex}`, is_complete: true } as ChunkResponse;
  }
}

class ExternalToolResultLLM extends BaseLLM {
  requestMessages: Message[][] = [];

  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>,
    _options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requestMessages.push(messages);
    const callIndex = this.requestMessages.length;

    if (callIndex === 1) {
      yield {
        content: '',
        tool_calls: [{ index: 0, call_id: 'call_external_result_1', name: ExternalResultTool.getName() }]
      } as ChunkResponse;
      yield {
        content: '',
        is_complete: true,
        tool_calls: [{ index: 0, arguments_delta: '{"job":"async","priority":"7"}' }]
      } as ChunkResponse;
      return;
    }

    yield { content: `reply-${callIndex}`, is_complete: true } as ChunkResponse;
  }
}

class OneShotToolCallLLM extends BaseLLM {
  requestMessages: Message[][] = [];

  constructor(
    model: LLMModel,
    config: LLMConfig,
    private readonly toolName: string,
    private readonly callId: string,
    private readonly argumentsJson: string
  ) {
    super(model, config);
  }

  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>,
    _options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requestMessages.push(messages);
    const callIndex = this.requestMessages.length;

    if (callIndex === 1) {
      yield {
        content: '',
        tool_calls: [{ index: 0, call_id: this.callId, name: this.toolName }]
      } as ChunkResponse;
      yield {
        content: '',
        is_complete: true,
        tool_calls: [{ index: 0, arguments_delta: this.argumentsJson }]
      } as ChunkResponse;
      return;
    }

    yield { content: `reply-${callIndex}`, is_complete: true } as ChunkResponse;
  }
}

class MultiToolInterruptLLM extends BaseLLM {
  requestMessages: Message[][] = [];

  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    messages: Message[],
    _kwargs: Record<string, unknown>,
    _options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requestMessages.push(messages);
    const callIndex = this.requestMessages.length;

    if (callIndex === 1) {
      yield {
        content: '',
        tool_calls: [
          { index: 0, call_id: 'call_safe_fact', name: SafeFactTool.getName() },
          { index: 1, call_id: 'call_blocking', name: BlockingTool.getName() }
        ]
      } as ChunkResponse;
      yield {
        content: '',
        is_complete: true,
        tool_calls: [
          { index: 0, arguments_delta: '{}' },
          { index: 1, arguments_delta: '{}' }
        ]
      } as ChunkResponse;
      return;
    }

    yield { content: `reply-${callIndex}`, is_complete: true } as ChunkResponse;
  }
}

class ApprovalTool extends BaseTool<AgentContext, Record<string, unknown>, string> {
  static getName(): string {
    return 'approval_tool';
  }

  static getDescription(): string {
    return 'Approval-gated test tool';
  }

  static getArgumentSchema() {
    return null;
  }

  protected async _execute(
    _context: AgentContext,
    _args?: Record<string, unknown>,
    _options?: ToolExecutionOptions
  ): Promise<string> {
    return 'should-not-run-without-approval';
  }
}

class SafeFactTool extends BaseTool<AgentContext, Record<string, unknown>, string> {
  executeCalls = 0;

  static getName(): string {
    return 'safe_fact_tool';
  }

  static getDescription(): string {
    return 'Returns a safe fact before a later tool blocks.';
  }

  static getArgumentSchema() {
    return null;
  }

  protected async _execute(
    _context: AgentContext,
    _args?: Record<string, unknown>,
    _options?: ToolExecutionOptions
  ): Promise<string> {
    this.executeCalls += 1;
    return 'SAFE_FACT';
  }
}

class BlockingTool extends BaseTool<AgentContext, Record<string, unknown>, string> {
  static getName(): string {
    return 'blocking_tool';
  }

  static getDescription(): string {
    return 'Blocks until the active turn is interrupted.';
  }

  static getArgumentSchema() {
    return null;
  }

  protected async _execute(
    _context: AgentContext,
    _args?: Record<string, unknown>,
    _options?: ToolExecutionOptions
  ): Promise<string> {
    await new Promise<void>(() => undefined);
    return 'SHOULD_NOT_COMPLETE';
  }
}

class ExternalResultTool extends BaseTool<AgentContext, Record<string, unknown>, string> {
  executeCalls = 0;

  static getName(): string {
    return 'external_result_tool';
  }

  static getDescription(): string {
    return 'External-result test tool';
  }

  static getArgumentSchema() {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'job',
      type: ParameterType.STRING,
      description: 'External job name',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'priority',
      type: ParameterType.INTEGER,
      description: 'External job priority',
      required: false
    }));
    return schema;
  }

  protected getToolResultExecutionMode(): 'external_result' {
    return 'external_result';
  }

  protected async _execute(
    _context: AgentContext,
    _args?: Record<string, unknown>,
    _options?: ToolExecutionOptions
  ): Promise<string> {
    this.executeCalls += 1;
    return 'should-not-run-in-process';
  }
}

class FailingModeExternalResultTool extends ExternalResultTool {
  static getName(): string {
    return 'failing_mode_external_result_tool';
  }

  static getDescription(): string {
    return 'External-result test tool with failing mode resolver';
  }

  protected getToolResultExecutionMode(): 'external_result' {
    throw new Error('mode resolver failed');
  }
}

class InMemoryStore extends MemoryStore {
  private items: any[] = [];

  add(items: Iterable<any>): void {
    for (const item of items) {
      this.items.push(item);
    }
  }

  list(memoryType: MemoryType, limit?: number): any[] {
    const filtered = this.items.filter((item) => item?.memoryType === memoryType);
    return typeof limit === 'number' ? filtered.slice(-limit) : filtered;
  }

  listRawTracesOrdered(limit?: number): any[] {
    return this.list(MemoryType.RAW_TRACE, limit);
  }

  pruneRawTracesById(traceIdsToRemove: Iterable<string>): void {
    const ids = new Set(Array.from(traceIdsToRemove));
    this.items = this.items.filter((item) => item?.memoryType !== MemoryType.RAW_TRACE || !ids.has(item.id));
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForStatus = async (
  context: AgentContext,
  predicate: (status: AgentStatus) => boolean,
  timeoutMs = 8000,
  intervalMs = 25
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate(context.currentStatus)) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

const waitForCondition = async (
  predicate: () => boolean,
  timeoutMs = 8000,
  intervalMs = 25
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

const resetFactory = () => {
  (AgentFactory as any).instance = undefined;
};

const makeModel = () => new LLMModel({
  name: 'dummy',
  value: 'dummy',
  canonicalName: 'dummy',
  provider: LLMProvider.OPENAI
});

const createDummyConfig = () => {
  const llm = new DummyLLM(makeModel(), new LLMConfig());
  return new AgentConfig('RuntimeTestAgent', 'Tester', 'Runtime integration test agent', llm);
};

const attachMemory = (state: AgentRuntimeState) => {
  state.memoryManager = new MemoryManager({ store: new InMemoryStore() });
};

describe('Agent runtime integration', () => {
  let previousParser: string | undefined;

  beforeEach(() => {
    previousParser = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  afterEach(() => {
    if (previousParser === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = previousParser;
    }
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  it('starts and stops AgentRuntime cleanly without legacy handler registry wiring', async () => {
    const config = createDummyConfig();
    const agentId = `runtime_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = config.llmInstance;
    state.toolInstances = {};
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);

    try {
      expect(runtime.isRunning).toBe(false);
      runtime.start();

      const ready = await waitForStatus(
        context,
        (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR
      );
      expect(ready).toBe(true);
      expect(context.currentStatus).toBe(AgentStatus.IDLE);

      await runtime.stop(5);
      const stopped = await waitForStatus(
        context,
        (status) => status === AgentStatus.SHUTDOWN_COMPLETE || status === AgentStatus.ERROR,
        5000
      );
      expect(stopped).toBe(true);
      expect(context.currentStatus).toBe(AgentStatus.SHUTDOWN_COMPLETE);
      expect(runtime.isRunning).toBe(false);
    } finally {
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await config.llmInstance.cleanup();
    }
  }, 20000);

  it('Agent facade delegates start/stop to runtime', async () => {
    const config = createDummyConfig();
    const factory = new AgentFactory();
    const agent = factory.createAgent(config);

    try {
      expect(agent.isRunning).toBe(false);
      agent.start();

      const ready = await waitForStatus(
        agent.context,
        (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR
      );
      expect(ready).toBe(true);
      expect(agent.context.currentStatus).toBe(AgentStatus.IDLE);
      expect(agent.isRunning).toBe(true);

      await agent.stop(5);
      const stopped = await waitForStatus(
        agent.context,
        (status) => status === AgentStatus.SHUTDOWN_COMPLETE || status === AgentStatus.ERROR,
        5000
      );
      expect(stopped).toBe(true);
      expect(agent.context.currentStatus).toBe(AgentStatus.SHUTDOWN_COMPLETE);
      expect(agent.isRunning).toBe(false);
    } finally {
      if (agent.isRunning) {
        await agent.stop(2);
      }
      await config.llmInstance.cleanup();
    }
  }, 20000);

  it('keeps a later external user message queued while one AgentTurnRunner is active', async () => {
    const llm = new ControllableLLM(makeModel(), new LLMConfig());
    const config = new AgentConfig(
      'RuntimeQueueGuardAgent',
      'Tester',
      'Runtime queue ordering test agent',
      llm
    );
    const agentId = `runtime_queue_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = llm;
    state.toolInstances = {};
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);
    const turnLifecycle: Array<{ type: EventType; turnId: string }> = [];

    context.statusManager?.notifier?.subscribe(EventType.AGENT_TURN_STARTED, (payload) => {
      turnLifecycle.push({ type: EventType.AGENT_TURN_STARTED, turnId: String((payload as any).turn_id) });
    });
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TURN_COMPLETED, (payload) => {
      turnLifecycle.push({ type: EventType.AGENT_TURN_COMPLETED, turnId: String((payload as any).turn_id) });
    });

    try {
      runtime.start();
      const ready = await waitForStatus(
        context,
        (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR
      );
      expect(ready).toBe(true);
      expect(context.currentStatus).toBe(AgentStatus.IDLE);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('first message')));
      await llm.waitForFirstRequestStart();

      const firstTurnId = context.state.activeTurn?.turnId ?? null;
      expect(firstTurnId).toBeTruthy();
      expect(llm.calls).toHaveLength(1);
      expect(llm.options[0]?.signal).toBeInstanceOf(AbortSignal);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('second message')));
      await delay(100);

      expect(llm.calls).toHaveLength(1);
      expect(context.state.activeTurn?.turnId).toBe(firstTurnId);
      expect(turnLifecycle.filter((event) => event.type === EventType.AGENT_TURN_STARTED)).toHaveLength(1);

      llm.unblockFirstResponse();

      const secondCallStarted = await waitForCondition(() => llm.calls.length === 2);
      expect(secondCallStarted).toBe(true);
      expect(llm.calls).toHaveLength(2);

      const idleAgain = await waitForCondition(
        () => context.currentStatus === AgentStatus.IDLE && context.state.activeTurn === null
      );
      expect(idleAgain).toBe(true);

      const startedTurns = turnLifecycle
        .filter((event) => event.type === EventType.AGENT_TURN_STARTED)
        .map((event) => event.turnId);
      const completedTurns = turnLifecycle
        .filter((event) => event.type === EventType.AGENT_TURN_COMPLETED)
        .map((event) => event.turnId);

      expect(startedTurns).toHaveLength(2);
      expect(completedTurns).toEqual(startedTurns);
      expect(new Set(startedTurns).size).toBe(2);
    } finally {
      llm.unblockFirstResponse();
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await llm.cleanup();
    }
  }, 20000);

  it('interrupts an in-flight LLM turn without stopping the runtime', async () => {
    const llm = new ControllableLLM(makeModel(), new LLMConfig());
    const config = new AgentConfig('RuntimeInterruptAgent', 'Tester', 'Interrupt test agent', llm);
    const agentId = `runtime_interrupt_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = llm;
    state.toolInstances = {};
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);
    const interruptedTurns: string[] = [];
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TURN_INTERRUPTED, (payload) => {
      interruptedTurns.push(String((payload as any).turn_id));
    });

    try {
      runtime.start();
      const ready = await waitForStatus(context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR);
      expect(ready).toBe(true);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('please wait')));
      await llm.waitForFirstRequestStart();
      const activeTurnId = context.state.activeTurn?.turnId;
      expect(activeTurnId).toBeTruthy();

      const interruptResult = await runtime.interrupt({ turnId: activeTurnId, reason: 'user_interrupt', timeoutMs: 1000 });
      expect(interruptResult.accepted).toBe(true);
      expect(interruptResult.status).toBe('accepted');
      expect(interruptResult.turnId).toBe(activeTurnId);
      expect(context.currentStatus).toBe(AgentStatus.IDLE);
      expect(context.state.activeTurn).toBeNull();
      expect(runtime.isRunning).toBe(true);
      expect(interruptedTurns).toContain(activeTurnId);

      llm.unblockFirstResponse();

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('next message')));
      const nextCallStarted = await waitForCondition(() => llm.calls.length === 2);
      expect(nextCallStarted).toBe(true);
      expect(llm.requestMessages[1].some((message) => message.content === 'please wait')).toBe(true);
      expect(llm.requestMessages[1].some((message) =>
        typeof message.content === 'string' &&
        message.content.includes(`turn '${activeTurnId}' was interrupted`) &&
        message.content.includes('user_interrupt')
      )).toBe(true);
      expect(llm.requestMessages[1].some((message) => message.content === 'next message')).toBe(true);
    } finally {
      llm.unblockFirstResponse();
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await llm.cleanup();
    }
  }, 20000);

  it('closes active streamed response segment as interrupted when LLM turn is interrupted', async () => {
    const llm = new SegmentInterruptLLM(makeModel(), new LLMConfig());
    const config = new AgentConfig('RuntimeSegmentInterruptAgent', 'Tester', 'Segment interrupt test agent', llm);
    const agentId = `runtime_segment_interrupt_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = llm;
    state.toolInstances = {};
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);
    const segmentEvents: any[] = [];
    context.statusManager?.notifier?.subscribe(EventType.AGENT_DATA_SEGMENT_EVENT, (payload) => {
      segmentEvents.push(payload);
    });

    try {
      runtime.start();
      const ready = await waitForStatus(context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR);
      expect(ready).toBe(true);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('stream then interrupt')));
      await llm.waitForFirstChunk();
      const activeTurnId = context.state.activeTurn?.turnId;
      expect(activeTurnId).toBeTruthy();

      const interruptResult = await runtime.interrupt({
        turnId: activeTurnId,
        reason: 'user_interrupt',
        timeoutMs: 1000
      });

      expect(interruptResult.accepted).toBe(true);
      const interruptedEnd = segmentEvents.find((event) =>
        event?.type === 'SEGMENT_END' &&
        event?.turn_id === activeTurnId &&
        event?.payload?.interrupted === true
      );
      expect(interruptedEnd).toBeDefined();
      expect(interruptedEnd.payload.reason).toBe('user_interrupt');
    } finally {
      llm.unblock();
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await llm.cleanup();
    }
  }, 20000);

  it('closes active streamed text and tool segments as failed when LLM stream throws', async () => {
    const llm = new SegmentFailureLLM(makeModel(), new LLMConfig());
    const approvalTool = new ApprovalTool();
    const config = new AgentConfig(
      'RuntimeSegmentFailureAgent',
      'Tester',
      'Segment failure test agent',
      llm,
      null,
      [approvalTool],
      false
    );
    const agentId = `runtime_segment_failure_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = llm;
    state.toolInstances = { [ApprovalTool.getName()]: approvalTool };
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);
    const segmentEvents: any[] = [];
    const approvalRequests: any[] = [];
    context.statusManager?.notifier?.subscribe(EventType.AGENT_DATA_SEGMENT_EVENT, (payload) => {
      segmentEvents.push(payload);
    });
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TOOL_APPROVAL_REQUESTED, (payload) => {
      approvalRequests.push(payload);
    });

    try {
      runtime.start();
      const ready = await waitForStatus(context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR);
      expect(ready).toBe(true);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('stream then fail')));
      const turnSettled = await waitForCondition(
        () => context.state.activeTurn === null && llm.requestMessages.length === 1
      );
      expect(turnSettled).toBe(true);

      const failedTextEnd = segmentEvents.find((event) =>
        event?.type === 'SEGMENT_END' &&
        event?.payload?.failed === true &&
        typeof event?.payload?.error === 'string' &&
        event.payload.error.includes('stream exploded') &&
        segmentEvents.some((startEvent) =>
          startEvent?.type === 'SEGMENT_START' &&
          startEvent?.segment_id === event.segment_id &&
          startEvent?.segment_type === 'text'
        )
      );
      expect(failedTextEnd).toBeDefined();

      const failedToolEnd = segmentEvents.find((event) =>
        event?.type === 'SEGMENT_END' &&
        event?.segment_id === 'call_stream_failure' &&
        event?.payload?.failed === true
      );
      expect(failedToolEnd).toBeDefined();
      expect(failedToolEnd.payload.error).toContain('stream exploded');
      expect(failedToolEnd.payload.interrupted).toBeUndefined();
      expect(failedToolEnd.payload.metadata).toMatchObject({
        tool_name: ApprovalTool.getName()
      });
      expect(approvalRequests).toHaveLength(0);
      expect(context.state.pendingToolApprovals).toEqual({});
      expect(context.currentStatus).not.toBe(AgentStatus.AWAITING_TOOL_APPROVAL);
    } finally {
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await llm.cleanup();
    }
  }, 20000);

  it('interrupts pending tool approval with a terminal tool lifecycle and memory-owned provider-safe context', async () => {
    const llm = new ApprovalToolCallingLLM(makeModel(), new LLMConfig());
    const approvalTool = new ApprovalTool();
    const config = new AgentConfig(
      'RuntimeApprovalInterruptAgent',
      'Tester',
      'Pending approval interrupt test agent',
      llm,
      null,
      [approvalTool],
      false
    );
    const agentId = `runtime_approval_interrupt_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = llm;
    state.toolInstances = { [ApprovalTool.getName()]: approvalTool };
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);
    const approvalRequests: any[] = [];
    const interruptedTools: any[] = [];

    context.statusManager?.notifier?.subscribe(EventType.AGENT_TOOL_APPROVAL_REQUESTED, (payload) => {
      approvalRequests.push(payload);
    });
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_INTERRUPTED, (payload) => {
      interruptedTools.push(payload);
    });

    try {
      runtime.start();
      const ready = await waitForStatus(context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR);
      expect(ready).toBe(true);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('needs approval')));
      const approvalRequested = await waitForCondition(
        () => approvalRequests.length === 1 && Boolean(context.state.pendingToolApprovals.call_approval_1)
      );
      expect(approvalRequested).toBe(true);
      expect(llm.requestMessages).toHaveLength(1);
      expect(context.memoryManager?.getWorkingContextMessages().some((message) => message.tool_payload)).toBe(true);

      const activeTurnId = context.state.activeTurn?.turnId;
      expect(activeTurnId).toBeTruthy();

      const interruptResult = await runtime.interrupt({
        turnId: activeTurnId,
        reason: 'user_interrupt',
        timeoutMs: 1000
      });
      expect(interruptResult.accepted).toBe(true);
      expect(context.currentStatus).toBe(AgentStatus.IDLE);
      expect(context.state.pendingToolApprovals).toEqual({});
      expect(interruptedTools).toHaveLength(1);
      expect(interruptedTools[0]).toMatchObject({
        invocation_id: 'call_approval_1',
        tool_name: ApprovalTool.getName(),
        turn_id: activeTurnId,
        reason: 'user_interrupt',
        interrupted: true
      });

      const finalizedMessages = context.memoryManager?.getWorkingContextMessages() ?? [];
      expect(finalizedMessages.some((message) => message.content === 'needs approval')).toBe(true);
      expect(finalizedMessages.some((message) =>
        typeof message.content === 'string' &&
        message.content.includes(`turn '${activeTurnId}' was interrupted`) &&
        message.content.includes('user_interrupt')
      )).toBe(true);
      expect(finalizedMessages.some((message) => message.tool_payload)).toBe(false);

      const lateApproval = await runtime.postToolApprovalEvent(
        new ToolExecutionApprovalEvent('call_approval_1', true)
      );
      await delay(50);
      expect(lateApproval.accepted).toBe(false);
      expect(llm.requestMessages).toHaveLength(1);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('after interrupt')));
      const nextCallStarted = await waitForCondition(() => llm.requestMessages.length === 2);
      expect(nextCallStarted).toBe(true);

      const nextMessages = llm.requestMessages[1];
      expect(nextMessages.some((message) => message.content === 'after interrupt')).toBe(true);
      expect(nextMessages.some((message) => message.content === 'needs approval')).toBe(true);
      expect(nextMessages.some((message) =>
        typeof message.content === 'string' &&
        message.content.includes(`turn '${activeTurnId}' was interrupted`) &&
        message.content.includes('user_interrupt')
      )).toBe(true);
      expect(nextMessages.some((message) => message.tool_payload)).toBe(false);
    } finally {
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await llm.cleanup();
    }
  }, 20000);

  it('retains completed tool result facts when a later tool in the batch is interrupted', async () => {
    const llm = new MultiToolInterruptLLM(makeModel(), new LLMConfig());
    const safeTool = new SafeFactTool();
    const blockingTool = new BlockingTool();
    const config = new AgentConfig(
      'RuntimePartialToolInterruptAgent',
      'Tester',
      'Partial tool interrupt retention test agent',
      llm,
      null,
      [safeTool, blockingTool],
      true
    );
    const agentId = `runtime_partial_tool_interrupt_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = llm;
    state.toolInstances = {
      [SafeFactTool.getName()]: safeTool,
      [BlockingTool.getName()]: blockingTool
    };
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);
    const startedTools: any[] = [];
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_STARTED, (payload) => {
      startedTools.push(payload);
    });

    try {
      runtime.start();
      const ready = await waitForStatus(context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR);
      expect(ready).toBe(true);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('run two tools')));
      const blockingStarted = await waitForCondition(
        () => safeTool.executeCalls === 1 &&
          startedTools.some((payload) => payload?.invocation_id === 'call_blocking')
      );
      expect(blockingStarted).toBe(true);

      const activeTurnId = context.state.activeTurn?.turnId;
      expect(activeTurnId).toBeTruthy();
      const interruptResult = await runtime.interrupt({
        turnId: activeTurnId,
        reason: 'user_interrupt',
        timeoutMs: 1000
      });
      expect(interruptResult.accepted).toBe(true);
      expect(context.currentStatus).toBe(AgentStatus.IDLE);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('after tool interrupt')));
      const nextCallStarted = await waitForCondition(() => llm.requestMessages.length === 2);
      expect(nextCallStarted).toBe(true);

      const nextMessages = llm.requestMessages[1];
      expect(nextMessages.some((message) => message.content === 'run two tools')).toBe(true);
      expect(nextMessages.some((message) =>
        typeof message.content === 'string' &&
        message.content.includes('SAFE_FACT') &&
        message.content.includes(SafeFactTool.getName())
      )).toBe(true);
      expect(nextMessages.some((message) =>
        typeof message.content === 'string' &&
        message.content.includes(`turn '${activeTurnId}' was interrupted`) &&
        message.content.includes('user_interrupt')
      )).toBe(true);
      expect(nextMessages.some((message) => message.tool_payload)).toBe(false);
      expect(nextMessages.some((message) => message.content === 'after tool interrupt')).toBe(true);
    } finally {
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await llm.cleanup();
    }
  }, 20000);

  it('routes an external async tool result through inbox dispatch into ToolPhase continuation', async () => {
    const llm = new ExternalToolResultLLM(makeModel(), new LLMConfig());
    const externalTool = new ExternalResultTool();
    const config = new AgentConfig(
      'RuntimeExternalToolResultAgent',
      'Tester',
      'External tool result routing test agent',
      llm,
      null,
      [externalTool],
      true
    );
    const agentId = `runtime_external_tool_result_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = llm;
    state.toolInstances = { [ExternalResultTool.getName()]: externalTool };
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);
    const startedTools: any[] = [];
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_STARTED, (payload) => {
      startedTools.push(payload);
    });

    try {
      runtime.start();
      const ready = await waitForStatus(context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR);
      expect(ready).toBe(true);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('needs external result')));
      const resultWaiterReady = await waitForCondition(
        () => Boolean(context.state.activeTurn?.toolInputPort.hasToolResultWaiter('call_external_result_1'))
      );
      expect(resultWaiterReady).toBe(true);
      expect(externalTool.executeCalls).toBe(0);
      expect(startedTools).toHaveLength(1);
      expect(startedTools[0]).toMatchObject({
        invocation_id: 'call_external_result_1',
        tool_name: ExternalResultTool.getName(),
        arguments: { job: 'async', priority: 7 }
      });

      const postResult = await runtime.postToolResultEvent(
        new ToolResultEvent(ExternalResultTool.getName(), 'external-ok', 'call_external_result_1')
      );

      expect(postResult).toMatchObject({
        accepted: true,
        code: 'posted',
        invocationId: 'call_external_result_1'
      });

      const continuationReachedLlm = await waitForCondition(() => llm.requestMessages.length === 2);
      expect(continuationReachedLlm).toBe(true);
      const continuationMessages = llm.requestMessages[1];
      expect(continuationMessages.filter((message) => message.role === MessageRole.USER).map((message) => message.content)).toEqual([
        'needs external result'
      ]);
      const continuationToolPayload = continuationMessages
        .filter((message) => message.role === MessageRole.TOOL)
        .at(-1)?.tool_payload as any;
      expect(continuationToolPayload).toMatchObject({
        toolCallId: 'call_external_result_1',
        toolName: ExternalResultTool.getName(),
        toolResult: 'external-ok',
        toolError: null
      });
      expect(externalTool.executeCalls).toBe(0);

      const settled = await waitForCondition(
        () => context.currentStatus === AgentStatus.IDLE && context.state.activeTurn === null
      );
      expect(settled).toBe(true);
    } finally {
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await llm.cleanup();
    }
  }, 20000);

  it('fails an external-result tool before publishing started when preflight rejects invalid args', async () => {
    const llm = new OneShotToolCallLLM(
      makeModel(),
      new LLMConfig(),
      ExternalResultTool.getName(),
      'call_external_result_invalid_args',
      '{"priority":"3"}'
    );
    const externalTool = new ExternalResultTool();
    const config = new AgentConfig(
      'RuntimeExternalToolPreflightAgent',
      'Tester',
      'External tool preflight test agent',
      llm,
      null,
      [externalTool],
      true
    );
    const agentId = `runtime_external_tool_preflight_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = llm;
    state.toolInstances = { [ExternalResultTool.getName()]: externalTool };
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);
    const startedTools: any[] = [];
    const failedTools: any[] = [];
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_STARTED, (payload) => {
      startedTools.push(payload);
    });
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, (payload) => {
      failedTools.push(payload);
    });

    try {
      runtime.start();
      const ready = await waitForStatus(context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR);
      expect(ready).toBe(true);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('invalid external result args')));
      const continuationReachedLlm = await waitForCondition(() => llm.requestMessages.length === 2);
      expect(continuationReachedLlm).toBe(true);

      expect(startedTools).toHaveLength(0);
      expect(externalTool.executeCalls).toBe(0);
      expect(context.state.activeTurn?.toolInputPort.hasToolResultWaiter('call_external_result_invalid_args')).not.toBe(true);
      expect(failedTools).toHaveLength(1);
      expect(failedTools[0]).toMatchObject({
        invocation_id: 'call_external_result_invalid_args',
        tool_name: ExternalResultTool.getName()
      });
      expect(String(failedTools[0].error)).toContain('Invalid arguments');
      expect(String(failedTools[0].error)).toContain("Required parameter 'job' is missing");

      const continuationMessages = llm.requestMessages[1];
      expect(continuationMessages.filter((message) => message.role === MessageRole.USER).map((message) => message.content)).toEqual([
        'invalid external result args'
      ]);
      const continuationToolPayload = continuationMessages
        .filter((message) => message.role === MessageRole.TOOL)
        .at(-1)?.tool_payload as any;
      expect(continuationToolPayload).toMatchObject({
        toolCallId: 'call_external_result_invalid_args',
        toolName: ExternalResultTool.getName()
      });
      expect(String(continuationToolPayload.toolError)).toContain('Invalid arguments');
      expect(String(continuationToolPayload.toolError)).toContain("Required parameter 'job' is missing");
    } finally {
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await llm.cleanup();
    }
  }, 20000);

  it('fails an external-result tool before publishing started when mode resolution throws', async () => {
    const llm = new OneShotToolCallLLM(
      makeModel(),
      new LLMConfig(),
      FailingModeExternalResultTool.getName(),
      'call_external_result_mode_failure',
      '{"job":"async"}'
    );
    const externalTool = new FailingModeExternalResultTool();
    const config = new AgentConfig(
      'RuntimeExternalToolModeFailureAgent',
      'Tester',
      'External tool mode failure test agent',
      llm,
      null,
      [externalTool],
      true
    );
    const agentId = `runtime_external_tool_mode_failure_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = llm;
    state.toolInstances = { [FailingModeExternalResultTool.getName()]: externalTool };
    attachMemory(state);

    const context = new AgentContext(agentId, config, state);
    const runtime = new AgentRuntime(context);
    const startedTools: any[] = [];
    const failedTools: any[] = [];
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_STARTED, (payload) => {
      startedTools.push(payload);
    });
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, (payload) => {
      failedTools.push(payload);
    });

    try {
      runtime.start();
      const ready = await waitForStatus(context, (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR);
      expect(ready).toBe(true);

      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('mode resolver failure')));
      const continuationReachedLlm = await waitForCondition(() => llm.requestMessages.length === 2);
      expect(continuationReachedLlm).toBe(true);

      expect(startedTools).toHaveLength(0);
      expect(externalTool.executeCalls).toBe(0);
      expect(context.state.activeTurn?.toolInputPort.hasToolResultWaiter('call_external_result_mode_failure')).not.toBe(true);
      expect(failedTools).toHaveLength(1);
      expect(failedTools[0]).toMatchObject({
        invocation_id: 'call_external_result_mode_failure',
        tool_name: FailingModeExternalResultTool.getName()
      });
      expect(String(failedTools[0].error)).toContain('mode resolver failed');
    } finally {
      if (runtime.isRunning) {
        await runtime.stop(2);
      }
      await llm.cleanup();
    }
  }, 20000);
});
