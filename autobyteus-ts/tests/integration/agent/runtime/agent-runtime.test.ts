import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentRuntime } from '../../../../src/agent/runtime/agent-runtime.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import {
  AgentErrorEvent,
  AgentIdleEvent,
  AgentReadyEvent,
  AgentStoppedEvent,
  BootstrapCompletedEvent,
  BootstrapStartedEvent,
  BootstrapStepCompletedEvent,
  BootstrapStepRequestedEvent,
  ExecuteToolInvocationEvent,
  GenericEvent,
  InterAgentMessageReceivedEvent,
  LLMCompleteResponseReceivedEvent,
  LLMUserMessageReadyEvent,
  PendingToolInvocationEvent,
  ShutdownRequestedEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../../../../src/agent/events/agent-events.js';
import { EventHandlerRegistry } from '../../../../src/agent/handlers/event-handler-registry.js';
import { UserInputMessageEventHandler } from '../../../../src/agent/handlers/user-input-message-event-handler.js';
import { InterAgentMessageReceivedEventHandler } from '../../../../src/agent/handlers/inter-agent-message-event-handler.js';
import { LLMCompleteResponseReceivedEventHandler } from '../../../../src/agent/handlers/llm-complete-response-received-event-handler.js';
import { ToolInvocationRequestEventHandler } from '../../../../src/agent/handlers/tool-invocation-request-event-handler.js';
import { ToolResultEventHandler } from '../../../../src/agent/handlers/tool-result-event-handler.js';
import { GenericEventHandler } from '../../../../src/agent/handlers/generic-event-handler.js';
import { ToolExecutionApprovalEventHandler } from '../../../../src/agent/handlers/tool-execution-approval-event-handler.js';
import { LLMUserMessageReadyEventHandler } from '../../../../src/agent/handlers/llm-user-message-ready-event-handler.js';
import { BootstrapEventHandler } from '../../../../src/agent/handlers/bootstrap-event-handler.js';
import { LifecycleEventLogger } from '../../../../src/agent/handlers/lifecycle-event-logger.js';
import { ToolInvocationExecutionEventHandler } from '../../../../src/agent/handlers/tool-invocation-execution-event-handler.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { EventType } from '../../../../src/events/event-types.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { MemoryStore } from '../../../../src/memory/store/base-store.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import type { LLMUserMessage } from '../../../../src/llm/user-message.js';
import type { ChunkResponse } from '../../../../src/llm/utils/response-types.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield { content: 'ok', is_complete: true } as ChunkResponse;
  }
}

class ControllableLLM extends BaseLLM {
  calls: string[] = [];
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

  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    userMessage: LLMUserMessage
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    const callIndex = this.calls.push(String(userMessage.content ?? ''));
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

class InMemoryStore extends MemoryStore {
  private items: any[] = [];

  add(items: Iterable<any>): void {
    for (const item of items) {
      this.items.push(item);
    }
  }

  list(memoryType: MemoryType, limit?: number): any[] {
    const filtered = this.items.filter((item) => item?.memoryType === memoryType);
    if (typeof limit === 'number') {
      return filtered.slice(-limit);
    }
    return filtered;
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

const createDummyConfig = () => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  return new AgentConfig('RuntimeTestAgent', 'Tester', 'Runtime integration test agent', llm);
};

const createDefaultEventHandlerRegistry = (): EventHandlerRegistry => {
  const registry = new EventHandlerRegistry();
  registry.register(UserMessageReceivedEvent, new UserInputMessageEventHandler());
  registry.register(InterAgentMessageReceivedEvent, new InterAgentMessageReceivedEventHandler());
  registry.register(LLMCompleteResponseReceivedEvent, new LLMCompleteResponseReceivedEventHandler());
  registry.register(PendingToolInvocationEvent, new ToolInvocationRequestEventHandler());
  registry.register(ToolResultEvent, new ToolResultEventHandler());
  registry.register(GenericEvent, new GenericEventHandler());
  registry.register(ToolExecutionApprovalEvent, new ToolExecutionApprovalEventHandler());
  registry.register(LLMUserMessageReadyEvent, new LLMUserMessageReadyEventHandler());
  registry.register(ExecuteToolInvocationEvent, new ToolInvocationExecutionEventHandler());

  const bootstrapHandler = new BootstrapEventHandler();
  registry.register(BootstrapStartedEvent, bootstrapHandler);
  registry.register(BootstrapStepRequestedEvent, bootstrapHandler);
  registry.register(BootstrapStepCompletedEvent, bootstrapHandler);
  registry.register(BootstrapCompletedEvent, bootstrapHandler);

  const lifecycleLogger = new LifecycleEventLogger();
  registry.register(AgentReadyEvent, lifecycleLogger);
  registry.register(AgentStoppedEvent, lifecycleLogger);
  registry.register(AgentIdleEvent, lifecycleLogger);
  registry.register(ShutdownRequestedEvent, lifecycleLogger);
  registry.register(AgentErrorEvent, lifecycleLogger);
  return registry;
};

describe('Agent runtime integration', () => {
  beforeEach(() => {
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  afterEach(() => {
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  it('starts and stops AgentRuntime cleanly', async () => {
    const config = createDummyConfig();
    const agentId = `runtime_${Date.now()}`;

    const state = new AgentRuntimeState(agentId, null, null);
    state.llmInstance = config.llmInstance;
    state.toolInstances = {};

    const context = new AgentContext(agentId, config, state);
    const registry = createDefaultEventHandlerRegistry();

    const runtime = new AgentRuntime(context, registry);

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

  it('keeps a later real user message queued behind the active turn until the first continuation finishes', async () => {
    const model = new LLMModel({
      name: 'dummy',
      value: 'dummy',
      canonicalName: 'dummy',
      provider: LLMProvider.OPENAI
    });
    const llm = new ControllableLLM(model, new LLMConfig());
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
    state.memoryManager = new MemoryManager({ store: new InMemoryStore() });

    const context = new AgentContext(agentId, config, state);
    const registry = createDefaultEventHandlerRegistry();
    const runtime = new AgentRuntime(context, registry);
    const turnLifecycle: Array<{ type: EventType; turnId: string }> = [];

    context.statusManager?.notifier?.subscribe(EventType.AGENT_TURN_STARTED, (payload) => {
      turnLifecycle.push({
        type: EventType.AGENT_TURN_STARTED,
        turnId: String(payload.turn_id)
      });
    });
    context.statusManager?.notifier?.subscribe(EventType.AGENT_TURN_COMPLETED, (payload) => {
      turnLifecycle.push({
        type: EventType.AGENT_TURN_COMPLETED,
        turnId: String(payload.turn_id)
      });
    });

    try {
      runtime.start();
      const ready = await waitForStatus(
        context,
        (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR
      );
      expect(ready).toBe(true);
      expect(context.currentStatus).toBe(AgentStatus.IDLE);

      await runtime.submitEvent(
        new UserMessageReceivedEvent(new AgentInputUserMessage('first message'))
      );
      await llm.waitForFirstRequestStart();

      const firstTurnId = context.state.activeTurn?.turnId ?? null;
      expect(firstTurnId).toBeTruthy();
      expect(llm.calls).toHaveLength(1);

      await runtime.submitEvent(
        new UserMessageReceivedEvent(new AgentInputUserMessage('second message'))
      );
      await delay(100);

      expect(llm.calls).toHaveLength(1);
      expect(context.state.activeTurn?.turnId).toBe(firstTurnId);
      expect(
        turnLifecycle.filter((event) => event.type === EventType.AGENT_TURN_STARTED)
      ).toHaveLength(1);

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
});
