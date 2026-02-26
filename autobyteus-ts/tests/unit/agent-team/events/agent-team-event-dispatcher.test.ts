import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentTeamEventDispatcher } from '../../../../src/agent-team/events/agent-team-event-dispatcher.js';
import {
  BaseAgentTeamEvent,
  ProcessUserMessageEvent,
  AgentTeamIdleEvent,
  AgentTeamErrorEvent
} from '../../../../src/agent-team/events/agent-team-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { AgentTeamContext } from '../../../../src/agent-team/context/agent-team-context.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { AgentTeamRuntimeState } from '../../../../src/agent-team/context/agent-team-runtime-state.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import { AgentTeamStatus } from '../../../../src/agent-team/status/agent-team-status.js';

const makeContext = (): AgentTeamContext => {
  const node = new TeamNodeConfig({ nodeDefinition: { name: 'Coordinator' } });
  const config = new AgentTeamConfig({
    name: 'Team',
    description: 'desc',
    nodes: [node],
    coordinatorNode: node
  });
  const state = new AgentTeamRuntimeState({ teamId: 'team-1', currentStatus: AgentTeamStatus.IDLE });
  state.inputEventQueues = {
    enqueueInternalSystemEvent: vi.fn(async () => undefined)
  } as any;
  return new AgentTeamContext('team-1', config, state);
};

describe('AgentTeamEventDispatcher', () => {
  let agentTeamContext: AgentTeamContext;

  beforeEach(() => {
    agentTeamContext = makeContext();
  });

  it('logs warning when no handler registered', async () => {
    const registry = { getHandler: () => undefined } as any;
    const dispatcher = new AgentTeamEventDispatcher(registry);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await dispatcher.dispatch(new BaseAgentTeamEvent(), agentTeamContext);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('dispatches operational event and enqueues idle', async () => {
    const handler = { handle: vi.fn(async () => undefined) };
    const registry = { getHandler: () => handler } as any;
    const dispatcher = new AgentTeamEventDispatcher(registry);

    const event = new ProcessUserMessageEvent(
      new AgentInputUserMessage('hi'),
      'Coordinator'
    );

    await dispatcher.dispatch(event, agentTeamContext);

    expect(handler.handle).toHaveBeenCalledWith(event, agentTeamContext);
    const enqueue = agentTeamContext.state.inputEventQueues?.enqueueInternalSystemEvent as any;
    expect(enqueue).toHaveBeenCalledTimes(1);
    const enqueuedEvent = enqueue.mock.calls[0][0];
    expect(enqueuedEvent).toBeInstanceOf(AgentTeamIdleEvent);
  });

  it('enqueues error event when handler throws', async () => {
    const handler = { handle: vi.fn(async () => { throw new Error('boom'); }) };
    const registry = { getHandler: () => handler } as any;
    const dispatcher = new AgentTeamEventDispatcher(registry);

    await dispatcher.dispatch(new BaseAgentTeamEvent(), agentTeamContext);

    const enqueue = agentTeamContext.state.inputEventQueues?.enqueueInternalSystemEvent as any;
    expect(enqueue).toHaveBeenCalledTimes(1);
    const enqueuedEvent = enqueue.mock.calls[0][0];
    expect(enqueuedEvent).toBeInstanceOf(AgentTeamErrorEvent);
  });
});
