import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runtimeCtor: vi.fn(),
  teamManagerCtor: vi.fn(),
  runtimeInstance: { multiplexer: {} as any } as any,
  teamManagerInstance: {} as any
}));

vi.mock('../../../../src/agent-team/runtime/agent-team-runtime.js', () => ({
  AgentTeamRuntime: function (context: any, registry: any) {
    mocks.runtimeCtor(context, registry);
    mocks.runtimeInstance.context = context;
    mocks.runtimeInstance.multiplexer = { marker: true };
    return mocks.runtimeInstance;
  }
}));

vi.mock('../../../../src/agent-team/context/team-manager.js', () => ({
  TeamManager: function (teamId: string, runtime: any, multiplexer: any) {
    mocks.teamManagerCtor(teamId, runtime, multiplexer);
    return mocks.teamManagerInstance;
  }
}));

import { AgentTeamFactory } from '../../../../src/agent-team/factory/agent-team-factory.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import { AgentTeam } from '../../../../src/agent-team/agent-team.js';
import { ProcessUserMessageEvent } from '../../../../src/agent-team/events/agent-team-events.js';
import { ProcessUserMessageEventHandler } from '../../../../src/agent-team/handlers/process-user-message-event-handler.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import type { LLMUserMessage } from '../../../../src/llm/user-message.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const makeTeamConfig = (): AgentTeamConfig => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  const coordinator = new AgentConfig('Coordinator', 'Coordinator', 'desc', llm);
  const coordinatorNode = new TeamNodeConfig({ nodeDefinition: coordinator });
  return new AgentTeamConfig({
    name: 'TestTeam',
    description: 'Test team description',
    nodes: [coordinatorNode],
    coordinatorNode: coordinatorNode
  });
};

const resetFactory = () => {
  (AgentTeamFactory as any).instance = undefined;
};

describe('AgentTeamFactory', () => {
  beforeEach(() => {
    resetFactory();
    mocks.runtimeCtor.mockReset();
    mocks.teamManagerCtor.mockReset();
  });

  afterEach(() => {
    resetFactory();
    vi.restoreAllMocks();
  });

  it('creates a default event handler registry', () => {
    const factory = new AgentTeamFactory();
    const registry = (factory as any).getDefaultEventHandlerRegistry();
    const handler = registry.getHandler(ProcessUserMessageEvent);
    expect(handler).toBeInstanceOf(ProcessUserMessageEventHandler);
  });

  it('assembles components correctly when creating a team', () => {
    const factory = new AgentTeamFactory();
    const config = makeTeamConfig();

    const team = factory.createTeam(config);

    expect(team).toBeInstanceOf(AgentTeam);
    const teamId = factory.listActiveTeamIds()[0];
    expect(teamId).toBeDefined();
    expect(factory.getTeam(teamId)).toBe(team);

    expect(mocks.runtimeCtor).toHaveBeenCalledOnce();
    const runtimeArgs = mocks.runtimeCtor.mock.calls[0];
    const contextArg = runtimeArgs[0];
    const registryArg = runtimeArgs[1];

    expect(contextArg.config).toBe(config);
    expect(registryArg).toBeTruthy();

    expect(mocks.teamManagerCtor).toHaveBeenCalledOnce();
    const teamManagerArgs = mocks.teamManagerCtor.mock.calls[0];
    expect(teamManagerArgs[1]).toBe(mocks.runtimeInstance);
    expect(teamManagerArgs[2]).toBe(mocks.runtimeInstance.multiplexer);

    expect(contextArg.state.teamManager).toBe(mocks.teamManagerInstance);
  });

  it('creates team with explicit id', () => {
    const factory = new AgentTeamFactory();
    const config = makeTeamConfig();

    const team = factory.createTeamWithId('team-explicit', config);

    expect(team).toBeInstanceOf(AgentTeam);
    expect(factory.getTeam('team-explicit')).toBe(team);
    expect(factory.listActiveTeamIds()).toContain('team-explicit');
  });

  it('rejects empty explicit team id', () => {
    const factory = new AgentTeamFactory();
    const config = makeTeamConfig();
    expect(() => factory.createTeamWithId('   ', config)).toThrow(
      'createTeamWithId requires a non-empty string teamId'
    );
  });
});
