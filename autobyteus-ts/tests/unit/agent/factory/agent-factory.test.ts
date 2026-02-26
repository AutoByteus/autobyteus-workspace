import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentRuntime } from '../../../../src/agent/runtime/agent-runtime.js';
import { Agent } from '../../../../src/agent/agent.js';
import { EventHandlerRegistry } from '../../../../src/agent/handlers/event-handler-registry.js';
import { UserInputMessageEventHandler } from '../../../../src/agent/handlers/user-input-message-event-handler.js';
import { LifecycleEventLogger } from '../../../../src/agent/handlers/lifecycle-event-logger.js';
import { UserMessageReceivedEvent, AgentReadyEvent, AgentErrorEvent, AgentStoppedEvent } from '../../../../src/agent/events/agent-events.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import type { LLMUserMessage } from '../../../../src/llm/user-message.js';
import type { CompleteResponse as CompleteResponseType, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponseType> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield { content: 'ok', is_complete: true } as ChunkResponse;
  }
}

class DummyTool extends BaseTool {
  static getName(): string {
    return 'factory_tool';
  }

  static getDescription(): string {
    return 'Factory test tool';
  }

  static getArgumentSchema() {
    return null;
  }

  protected async _execute(): Promise<any> {
    return 'ok';
  }
}

const makeConfig = () => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  return new AgentConfig('FactoryTestAgent', 'factory-tester', 'Test agent for factory', llm, null, [new DummyTool()]);
};

const resetFactory = () => {
  (AgentFactory as any).instance = undefined;
};

describe('AgentFactory', () => {
  beforeEach(() => {
    resetFactory();
  });

  afterEach(() => {
    resetFactory();
    vi.restoreAllMocks();
  });

  it('initializes without legacy dependencies', () => {
    const factory = new AgentFactory();
    expect(factory).toBeInstanceOf(AgentFactory);
    expect((factory as any).llm_factory).toBeUndefined();
    expect((factory as any).tool_registry).toBeUndefined();
  });

  it('builds the default event handler registry', () => {
    const factory = new AgentFactory();
    const registry = (factory as any).getDefaultEventHandlerRegistry();
    expect(registry).toBeInstanceOf(EventHandlerRegistry);

    const handler = registry.getHandler(UserMessageReceivedEvent);
    expect(handler).toBeInstanceOf(UserInputMessageEventHandler);

    const lifecycleLogger = registry.getHandler(AgentReadyEvent);
    expect(lifecycleLogger).toBeInstanceOf(LifecycleEventLogger);
    expect(registry.getHandler(AgentStoppedEvent)).toBe(lifecycleLogger);
    expect(registry.getHandler(AgentErrorEvent)).toBe(lifecycleLogger);
  });

  it('creates agents and stores them', () => {
    const factory = new AgentFactory();
    const config = makeConfig();

    const runtimeStub = Object.create(AgentRuntime.prototype) as AgentRuntime;
    runtimeStub.context = { agentId: '' } as any;

    const createRuntimeSpy = vi
      .spyOn(factory as any, 'createRuntimeWithId')
      .mockImplementation((...args: any[]) => {
        const agentId = String(args[0] ?? '');
        runtimeStub.context.agentId = agentId;
        return runtimeStub;
      });

    const agent = factory.createAgent(config);

    expect(agent).toBeInstanceOf(Agent);
    expect(agent.agentId.startsWith(`${config.name}_${config.role}`)).toBe(true);
    expect(createRuntimeSpy).toHaveBeenCalledWith(agent.agentId, config);
    expect(factory.getAgent(agent.agentId)).toBe(agent);
    expect(factory.listActiveAgentIds()).toContain(agent.agentId);
  });

  it('rejects invalid config types', () => {
    const factory = new AgentFactory();
    expect(() => factory.createAgent('not a config' as any)).toThrow('Expected AgentConfig instance');
  });

  it('prepares tool instances by name', () => {
    const factory = new AgentFactory();
    const config = makeConfig();

    const toolInstances = (factory as any).prepareToolInstances('test-id', config) as Record<string, BaseTool>;
    expect(toolInstances.factory_tool).toBeInstanceOf(DummyTool);
  });

  it('warns and overwrites duplicate tool names', () => {
    const factory = new AgentFactory();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const config = makeConfig();
    config.tools = [new DummyTool(), new DummyTool()];

    const toolInstances = (factory as any).prepareToolInstances('test-id', config) as Record<string, BaseTool>;
    expect(warnSpy).toHaveBeenCalled();
    expect(toolInstances.factory_tool).toBeInstanceOf(DummyTool);
  });

  it('populates runtime state with LLM and tools', () => {
    const factory = new AgentFactory();
    const config = makeConfig();

    const runtime = (factory as any).createRuntimeWithId('test-runtime-agent', config) as AgentRuntime;
    expect(runtime).toBeInstanceOf(AgentRuntime);
    expect(runtime.context.state.llmInstance).toBe(config.llmInstance);
    expect(runtime.context.state.toolInstances?.factory_tool).toBe(config.tools[0]);
  });

  it('restores agents with existing id', () => {
    const factory = new AgentFactory();
    const config = makeConfig();

    const runtimeStub = Object.create(AgentRuntime.prototype) as AgentRuntime;
    runtimeStub.context = { agentId: '' } as any;

    const createRuntimeSpy = vi
      .spyOn(factory as any, 'createRuntimeWithId')
      .mockImplementation((...args: any[]) => {
        const agentId = String(args[0] ?? '');
        runtimeStub.context.agentId = agentId;
        return runtimeStub;
      });

    const agent = factory.restoreAgent('restored-agent', config, '/tmp/memory');
    expect(agent.agentId).toBe('restored-agent');
    const callArgs = createRuntimeSpy.mock.calls[0] ?? [];
    expect(callArgs[0]).toBe('restored-agent');
    expect(callArgs[1]).toBe(config);
    expect(callArgs[2]).toBe('/tmp/memory');
    expect(callArgs[3]).not.toBeNull();
  });
});
