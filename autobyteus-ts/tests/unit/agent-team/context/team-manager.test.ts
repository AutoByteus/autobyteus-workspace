import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  waitForAgent: vi.fn(async () => undefined),
  waitForTeam: vi.fn(async () => undefined),
  createTeam: vi.fn()
}));

vi.mock('../../../../src/agent/utils/wait-for-idle.js', () => ({
  waitForAgentToBeIdle: mocks.waitForAgent
}));

vi.mock('../../../../src/agent-team/utils/wait-for-idle.js', () => ({
  waitForTeamToBeIdle: mocks.waitForTeam
}));

(vi.mock as any)(
  '../../../../src/agent-team/factory/agent-team-factory.js',
  () => ({
    AgentTeamFactory: vi.fn().mockImplementation(function (this: any) {
      this.createTeam = mocks.createTeam;
    })
  }),
  { virtual: true }
);

import { TeamManager } from '../../../../src/agent-team/context/team-manager.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { TeamNodeNotFoundException } from '../../../../src/agent-team/exceptions.js';
import { Agent } from '../../../../src/agent/agent.js';
import { AgentTeam } from '../../../../src/agent-team/agent-team.js';
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

const makeAgentConfig = (name: string) => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  return new AgentConfig(name, name, `${name} desc`, llm);
};

const makeSubTeamConfig = (name: string) => {
  const coordinator = makeAgentConfig(`${name}_Coordinator`);
  const coordinatorNode = new TeamNodeConfig({ nodeDefinition: coordinator });
  return new AgentTeamConfig({
    name,
    description: `${name} desc`,
    nodes: [coordinatorNode],
    coordinatorNode: coordinatorNode
  });
};

const makeRuntime = () => {
  const context = {
    getNodeConfigByName: vi.fn(),
    state: {
      finalAgentConfigs: {} as Record<string, AgentConfig>
    }
  } as any;
  return { context, submitEvent: vi.fn(async () => undefined) } as any;
};

const makeMultiplexer = () => ({
  startBridgingAgentEvents: vi.fn(),
  startBridgingTeamEvents: vi.fn()
});

const makeMockAgentInstance = (agentId: string, running: boolean = false) => {
  const agent = Object.assign(Object.create(Agent.prototype), {
    agentId,
    start: vi.fn(),
    setRunning: (value: boolean) => {
      isRunning = value;
    }
  });
  let isRunning = running;
  Object.defineProperty(agent, 'isRunning', {
    get: () => isRunning,
    configurable: true
  });
  return agent;
};

const makeMockTeamInstance = (running: boolean = false) => {
  const team = Object.assign(Object.create(AgentTeam.prototype), {
    start: vi.fn(),
    setRunning: (value: boolean) => {
      isRunning = value;
    }
  });
  let isRunning = running;
  Object.defineProperty(team, 'isRunning', {
    get: () => isRunning,
    configurable: true
  });
  Object.defineProperty(team, 'name', {
    get: () => 'SubTeam',
    configurable: true
  });
  return team;
};

describe('TeamManager', () => {
  beforeEach(() => {
    mocks.waitForAgent.mockReset();
    mocks.waitForTeam.mockReset();
    mocks.createTeam.mockReset();
  });

  it('uses premade agent config and starts agent', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const mockAgent = makeMockAgentInstance('agent_123');
    const mockAgentFactory = { createAgent: vi.fn(() => mockAgent) } as any;
    (manager as any).agentFactory = mockAgentFactory;

    const nodeName = 'test_agent';
    const premadeConfig = makeAgentConfig(nodeName);
    runtime.context.state.finalAgentConfigs[nodeName] = premadeConfig;

    const nodeConfigWrapper = new TeamNodeConfig({ nodeDefinition: premadeConfig });
    runtime.context.getNodeConfigByName.mockReturnValue(nodeConfigWrapper);

    const agent = await manager.ensureNodeIsReady(nodeName);

    expect(agent).toBe(mockAgent);
    expect(runtime.context.getNodeConfigByName).toHaveBeenCalledWith(nodeName);
    expect(mockAgentFactory.createAgent).toHaveBeenCalledWith(premadeConfig);
    expect((manager as any).nodesCache.get(nodeName)).toBe(mockAgent);
    expect((manager as any).agentIdToNameMap.get(mockAgent.agentId)).toBe(nodeName);
    expect(multiplexer.startBridgingAgentEvents).toHaveBeenCalledWith(mockAgent, nodeName);
    expect(multiplexer.startBridgingTeamEvents).not.toHaveBeenCalled();
    expect(mockAgent.start).toHaveBeenCalledOnce();
    expect(mocks.waitForAgent).toHaveBeenCalledWith(mockAgent, 60.0);
  });

  it('creates and starts sub-team nodes', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const subTeamConfig = makeSubTeamConfig('test_sub_team');
    const nodeConfigWrapper = {
      isSubTeam: true,
      nodeDefinition: subTeamConfig
    } as any;
    runtime.context.getNodeConfigByName.mockReturnValue(nodeConfigWrapper);

    const mockSubTeam = makeMockTeamInstance();
    mocks.createTeam.mockReturnValue(mockSubTeam);

    const subTeam = await manager.ensureNodeIsReady('test_sub_team');

    expect(subTeam).toBe(mockSubTeam);
    expect(mocks.createTeam).toHaveBeenCalledWith(subTeamConfig);
    expect(multiplexer.startBridgingTeamEvents).toHaveBeenCalledWith(mockSubTeam, 'test_sub_team');
    expect(multiplexer.startBridgingAgentEvents).not.toHaveBeenCalled();
    expect(mockSubTeam.start).toHaveBeenCalledOnce();
    expect(mocks.waitForTeam).toHaveBeenCalledWith(mockSubTeam, 120.0);
  });

  it('returns cached running node', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const mockAgent = makeMockAgentInstance('cached_agent_id');
    (mockAgent as any).setRunning(true);
    (manager as any).nodesCache.set('cached_agent', mockAgent);

    const agent = await manager.ensureNodeIsReady('cached_agent');

    expect(agent).toBe(mockAgent);
    expect(mockAgent.start).not.toHaveBeenCalled();
    expect(mocks.waitForAgent).not.toHaveBeenCalled();
  });

  it('resolves agent_id to cached name', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const mockAgent = makeMockAgentInstance('agent_abc_123');
    (manager as any).agentIdToNameMap.set('agent_abc_123', 'my_agent');
    (manager as any).nodesCache.set('my_agent', mockAgent);

    const agent = await manager.ensureNodeIsReady('agent_abc_123');

    expect(agent).toBe(mockAgent);
    expect(runtime.context.getNodeConfigByName).not.toHaveBeenCalled();
  });

  it('throws TeamNodeNotFoundException for unknown nodes', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);
    runtime.context.getNodeConfigByName.mockReturnValue(null);

    await expect(manager.ensureNodeIsReady('unknown_agent')).rejects.toBeInstanceOf(TeamNodeNotFoundException);
  });

  it('throws when premade config missing', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const nodeConfigWrapper = new TeamNodeConfig({ nodeDefinition: makeAgentConfig('forgotten_agent') });
    runtime.context.getNodeConfigByName.mockReturnValue(nodeConfigWrapper);

    await expect(manager.ensureNodeIsReady('forgotten_agent')).rejects.toThrow(
      'No pre-prepared agent configuration found'
    );
  });
});
