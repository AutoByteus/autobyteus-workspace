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
import { TeamNodeNotFoundException, TeamNodeNotLocalException } from '../../../../src/agent-team/exceptions.js';
import { Agent } from '../../../../src/agent/agent.js';
import { AgentTeam } from '../../../../src/agent-team/agent-team.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { ToolExecutionApprovalEvent } from '../../../../src/agent/events/agent-events.js';
import {
  InterAgentMessageRequestEvent,
  ToolApprovalTeamEvent,
} from '../../../../src/agent-team/events/agent-team-events.js';
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
    stop: vi.fn(async () => undefined),
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

const makeLiveAgentInstance = (agentId: string) => {
  const submitEvent = vi.fn(async () => undefined);
  const runtime = {
    context: { agentId },
    submitEvent,
    isRunning: true,
    currentStatus: 'IDLE',
    start: vi.fn(),
    stop: vi.fn(async () => undefined)
  } as any;
  const agent = new Agent(runtime);
  return { agent, submitEvent };
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

  it('uses restoreAgent when teamRestore metadata is provided', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const restoredAgent = makeMockAgentInstance('ag_restore_001');
    const mockAgentFactory = {
      createAgent: vi.fn(),
      restoreAgent: vi.fn(() => restoredAgent)
    } as any;
    (manager as any).agentFactory = mockAgentFactory;

    const nodeName = 'test_agent';
    const premadeConfig = makeAgentConfig(nodeName);
    premadeConfig.initialCustomData = {
      teamRestore: {
        membersByRouteKey: {
          [nodeName]: {
            memberAgentId: 'ag_restore_001',
            memoryDir: '/tmp/team-memory'
          }
        }
      }
    };
    runtime.context.state.finalAgentConfigs[nodeName] = premadeConfig;
    runtime.context.getNodeConfigByName.mockReturnValue(new TeamNodeConfig({ nodeDefinition: premadeConfig }));

    const agent = await manager.ensureNodeIsReady(nodeName);

    expect(agent).toBe(restoredAgent);
    expect(mockAgentFactory.restoreAgent).toHaveBeenCalledWith(
      'ag_restore_001',
      premadeConfig,
      '/tmp/team-memory'
    );
    expect(mockAgentFactory.createAgent).not.toHaveBeenCalled();
    expect((manager as any).agentIdToNameMap.get('ag_restore_001')).toBe(nodeName);
    expect(restoredAgent.start).toHaveBeenCalledOnce();
  });

  it('falls back to createAgent when teamRestore metadata is malformed', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const mockAgent = makeMockAgentInstance('agent_123');
    const mockAgentFactory = {
      createAgent: vi.fn(() => mockAgent),
      restoreAgent: vi.fn()
    } as any;
    (manager as any).agentFactory = mockAgentFactory;

    const nodeName = 'test_agent';
    const premadeConfig = makeAgentConfig(nodeName);
    premadeConfig.initialCustomData = {
      teamRestore: {
        membersByRouteKey: {
          [nodeName]: {
            memoryDir: '/tmp/team-memory'
          }
        }
      }
    };
    runtime.context.state.finalAgentConfigs[nodeName] = premadeConfig;
    runtime.context.getNodeConfigByName.mockReturnValue(new TeamNodeConfig({ nodeDefinition: premadeConfig }));

    const agent = await manager.ensureNodeIsReady(nodeName);

    expect(agent).toBe(mockAgent);
    expect(mockAgentFactory.createAgent).toHaveBeenCalledWith(premadeConfig);
    expect(mockAgentFactory.restoreAgent).not.toHaveBeenCalled();
  });

  it('uses createAgentWithId when deterministic memberAgentId metadata is provided', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const deterministicAgent = makeMockAgentInstance('member_abcd1234');
    const mockAgentFactory = {
      createAgent: vi.fn(),
      createAgentWithId: vi.fn(() => deterministicAgent),
      restoreAgent: vi.fn()
    } as any;
    (manager as any).agentFactory = mockAgentFactory;

    const nodeName = 'coordinator';
    const premadeConfig = makeAgentConfig(nodeName);
    premadeConfig.initialCustomData = {
      teamMemberIdentity: {
        memberAgentId: 'member_abcd1234'
      }
    };
    runtime.context.state.finalAgentConfigs[nodeName] = premadeConfig;
    runtime.context.getNodeConfigByName.mockReturnValue(new TeamNodeConfig({ nodeDefinition: premadeConfig }));

    const agent = await manager.ensureNodeIsReady(nodeName);

    expect(agent).toBe(deterministicAgent);
    expect(mockAgentFactory.createAgentWithId).toHaveBeenCalledWith('member_abcd1234', premadeConfig);
    expect(mockAgentFactory.createAgent).not.toHaveBeenCalled();
    expect(mockAgentFactory.restoreAgent).not.toHaveBeenCalled();
  });

  it('ignores node-keyed memberAgentIdsByNodeName metadata for deterministic ids', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const createdAgent = makeMockAgentInstance('agent_123');
    const mockAgentFactory = {
      createAgent: vi.fn(() => createdAgent),
      createAgentWithId: vi.fn(),
      restoreAgent: vi.fn()
    } as any;
    (manager as any).agentFactory = mockAgentFactory;

    const nodeName = 'coordinator';
    const premadeConfig = makeAgentConfig(nodeName);
    premadeConfig.initialCustomData = {
      memberAgentIdsByNodeName: {
        coordinator: 'member_should_be_ignored'
      }
    };
    runtime.context.state.finalAgentConfigs[nodeName] = premadeConfig;
    runtime.context.getNodeConfigByName.mockReturnValue(new TeamNodeConfig({ nodeDefinition: premadeConfig }));

    const agent = await manager.ensureNodeIsReady(nodeName);

    expect(agent).toBe(createdAgent);
    expect(mockAgentFactory.createAgent).toHaveBeenCalledWith(premadeConfig);
    expect(mockAgentFactory.createAgentWithId).not.toHaveBeenCalled();
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

  it('does not enforce startup admission from home-node metadata in core runtime', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const mockAgent = makeMockAgentInstance('agent_123');
    const mockAgentFactory = { createAgent: vi.fn(() => mockAgent) } as any;
    (manager as any).agentFactory = mockAgentFactory;

    const nodeName = 'student';
    const premadeConfig = makeAgentConfig(nodeName);
    premadeConfig.initialCustomData = {
      teamMemberHomeNodeId: 'node-docker-8001'
    };
    runtime.context.state.finalAgentConfigs[nodeName] = premadeConfig;
    runtime.context.getNodeConfigByName.mockReturnValue(new TeamNodeConfig({ nodeDefinition: premadeConfig }));

    await expect(manager.ensureNodeIsReady(nodeName)).resolves.toBe(mockAgent);
    expect(mockAgentFactory.createAgent).toHaveBeenCalledWith(premadeConfig);
  });

  it('rejects non-local member startup when placement metadata marks member as non-local', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);

    const mockAgentFactory = {
      createAgent: vi.fn(),
      createAgentWithId: vi.fn(),
      restoreAgent: vi.fn()
    } as any;
    (manager as any).agentFactory = mockAgentFactory;

    const nodeName = 'professor';
    const premadeConfig = makeAgentConfig(nodeName);
    premadeConfig.initialCustomData = {
      teamMemberPlacement: {
        homeNodeId: 'node-host-8000',
        isLocalToCurrentNode: false
      }
    };
    runtime.context.state.finalAgentConfigs[nodeName] = premadeConfig;
    runtime.context.getNodeConfigByName.mockReturnValue(new TeamNodeConfig({ nodeDefinition: premadeConfig }));

    await expect(manager.ensureNodeIsReady(nodeName)).rejects.toBeInstanceOf(TeamNodeNotLocalException);
    expect(mockAgentFactory.createAgent).not.toHaveBeenCalled();
    expect(mockAgentFactory.createAgentWithId).not.toHaveBeenCalled();
    expect(mockAgentFactory.restoreAgent).not.toHaveBeenCalled();
  });

  it('routes inter-agent messages via routing port when configured', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);
    const event = new InterAgentMessageRequestEvent('sender', 'recipient', 'hello', 'TASK_ASSIGNMENT');
    const port = {
      dispatchInterAgentMessageRequest: vi.fn(async () => ({ accepted: true }))
    } as any;

    manager.setTeamRoutingPort(port);
    await manager.dispatchInterAgentMessage(event);

    expect(port.dispatchInterAgentMessageRequest).toHaveBeenCalledWith(event);
  });

  it('throws when routing port rejects message', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);
    const event = new InterAgentMessageRequestEvent('sender', 'recipient', 'hello', 'TASK_ASSIGNMENT');
    const port = {
      dispatchInterAgentMessageRequest: vi.fn(async () => ({ accepted: false, errorMessage: 'Rejected' }))
    } as any;

    manager.setTeamRoutingPort(port);
    await expect(manager.dispatchInterAgentMessage(event)).rejects.toThrow('Rejected');
  });

  it('uses default local routing adapter when no custom routing port is configured', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);
    const event = new InterAgentMessageRequestEvent('sender', 'recipient', 'hello', 'TASK_ASSIGNMENT');

    runtime.context.getNodeConfigByName.mockReturnValue(null);
    await expect(manager.dispatchInterAgentMessage(event)).rejects.toThrow(
      "Node 'recipient' not found in agent team 'test_team'."
    );
  });

  it('propagates default local routing errors from adapter rejection payload', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);
    const event = new InterAgentMessageRequestEvent('sender', 'recipient', 'hello', 'TASK_ASSIGNMENT');
    runtime.context.getNodeConfigByName.mockImplementation(() => {
      throw new Error('runtime unavailable');
    });

    await expect(manager.dispatchInterAgentMessage(event)).rejects.toThrow('runtime unavailable');
  });

  it('dispatches tool approval through default local routing adapter to live agent instances', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);
    const { agent, submitEvent } = makeLiveAgentInstance('agent_live_1');
    const event = new ToolApprovalTeamEvent('recipient', 'tool-approval-1', true, 'approved');

    (manager as any).nodesCache.set('recipient', agent);
    (manager as any).agentIdToNameMap.set('agent_live_1', 'recipient');

    await manager.dispatchToolApproval(event);

    expect(submitEvent).toHaveBeenCalledTimes(1);
    const submittedEvent = submitEvent.mock.calls[0][0];
    expect(submittedEvent).toBeInstanceOf(ToolExecutionApprovalEvent);
    expect(submittedEvent.toolInvocationId).toBe('tool-approval-1');
    expect(submittedEvent.isApproved).toBe(true);
    expect(submittedEvent.reason).toBe('approved');
  });

  it('shutdownManagedAgents removes managed agents from AgentFactory and clears caches', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);
    const agentOne = makeMockAgentInstance('member_a', true);
    const agentTwo = makeMockAgentInstance('member_b', false);

    const mockAgentFactory = {
      removeAgent: vi.fn(async () => true),
    } as any;
    (manager as any).agentFactory = mockAgentFactory;
    (manager as any).nodesCache.set('professor', agentOne);
    (manager as any).nodesCache.set('student', agentTwo);
    (manager as any).agentIdToNameMap.set('member_a', 'professor');
    (manager as any).agentIdToNameMap.set('member_b', 'student');

    const result = await manager.shutdownManagedAgents(10.0);

    expect(result).toBe(true);
    expect(mockAgentFactory.removeAgent).toHaveBeenCalledWith('member_a', 10.0);
    expect(mockAgentFactory.removeAgent).toHaveBeenCalledWith('member_b', 10.0);
    expect((manager as any).nodesCache.has('professor')).toBe(false);
    expect((manager as any).nodesCache.has('student')).toBe(false);
    expect((manager as any).agentIdToNameMap.has('member_a')).toBe(false);
    expect((manager as any).agentIdToNameMap.has('member_b')).toBe(false);
  });

  it('shutdownManagedAgents falls back to direct stop when an agent is missing from AgentFactory', async () => {
    const runtime = makeRuntime();
    const multiplexer = makeMultiplexer();
    const manager = new TeamManager('test_team', runtime, multiplexer as any);
    const agent = makeMockAgentInstance('member_missing', true);

    const mockAgentFactory = {
      removeAgent: vi.fn(async () => false),
    } as any;
    (manager as any).agentFactory = mockAgentFactory;
    (manager as any).nodesCache.set('professor', agent);
    (manager as any).agentIdToNameMap.set('member_missing', 'professor');

    const result = await manager.shutdownManagedAgents(10.0);

    expect(result).toBe(true);
    expect(mockAgentFactory.removeAgent).toHaveBeenCalledWith('member_missing', 10.0);
    expect(agent.stop).toHaveBeenCalledWith(10.0);
    expect((manager as any).nodesCache.has('professor')).toBe(false);
    expect((manager as any).agentIdToNameMap.has('member_missing')).toBe(false);
  });
});
