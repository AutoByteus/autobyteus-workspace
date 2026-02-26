import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentRuntime } from '../../../../src/agent/runtime/agent-runtime.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import {
  AgentErrorEvent,
  AgentIdleEvent,
  AgentReadyEvent,
  AgentStoppedEvent,
  ApprovedToolInvocationEvent,
  BootstrapCompletedEvent,
  BootstrapStartedEvent,
  BootstrapStepCompletedEvent,
  BootstrapStepRequestedEvent,
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
import { ApprovedToolInvocationEventHandler } from '../../../../src/agent/handlers/approved-tool-invocation-event-handler.js';
import { BootstrapEventHandler } from '../../../../src/agent/handlers/bootstrap-event-handler.js';
import { LifecycleEventLogger } from '../../../../src/agent/handlers/lifecycle-event-logger.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
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
  registry.register(ApprovedToolInvocationEvent, new ApprovedToolInvocationEventHandler());

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
});
