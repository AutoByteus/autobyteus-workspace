import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InterAgentMessageRequestEventHandler } from '../../../../src/agent-team/handlers/inter-agent-message-request-event-handler.js';
import { InterAgentMessageRequestEvent, AgentTeamErrorEvent } from '../../../../src/agent-team/events/agent-team-events.js';
import { AgentTeamContext } from '../../../../src/agent-team/context/agent-team-context.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { AgentTeamRuntimeState } from '../../../../src/agent-team/context/agent-team-runtime-state.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import { AgentTeamStatus } from '../../../../src/agent-team/status/agent-team-status.js';
import { InterAgentMessage } from '../../../../src/agent/message/inter-agent-message.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';

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

describe('InterAgentMessageRequestEventHandler', () => {
  let handler: InterAgentMessageRequestEventHandler;
  let agentTeamContext: AgentTeamContext;
  let event: InterAgentMessageRequestEvent;

  beforeEach(() => {
    handler = new InterAgentMessageRequestEventHandler();
    agentTeamContext = makeContext();
    event = new InterAgentMessageRequestEvent(
      'sender_agent_id_123',
      'Recipient',
      'Do the thing',
      'TASK_ASSIGNMENT'
    );
  });

  it('posts inter-agent message to recipient agent', async () => {
    const mockAgent = {
      agentId: 'agent-1',
      context: { config: { role: 'RecipientRole' } },
      postInterAgentMessage: vi.fn(async () => undefined)
    };
    agentTeamContext.state.teamManager = {
      ensureNodeIsReady: vi.fn(async () => mockAgent)
    } as any;

    await handler.handle(event, agentTeamContext);

    expect(agentTeamContext.state.teamManager?.ensureNodeIsReady).toHaveBeenCalledWith('Recipient');
    expect(mockAgent.postInterAgentMessage).toHaveBeenCalledTimes(1);
    const postedMessage = (mockAgent.postInterAgentMessage as any).mock.calls[0][0];
    expect(postedMessage).toBeInstanceOf(InterAgentMessage);
    expect(postedMessage.content).toBe(event.content);
    expect(postedMessage.senderAgentId).toBe(event.senderAgentId);
    const enqueue = agentTeamContext.state.inputEventQueues?.enqueueInternalSystemEvent as any;
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('posts user message to sub-team recipient', async () => {
    const mockSubTeam = {
      postMessage: vi.fn(async () => undefined)
    };
    agentTeamContext.state.teamManager = {
      ensureNodeIsReady: vi.fn(async () => mockSubTeam)
    } as any;

    await handler.handle(event, agentTeamContext);

    expect(agentTeamContext.state.teamManager?.ensureNodeIsReady).toHaveBeenCalledWith('Recipient');
    expect(mockSubTeam.postMessage).toHaveBeenCalledTimes(1);
    const postedMessage = (mockSubTeam.postMessage as any).mock.calls[0][0];
    expect(postedMessage).toBeInstanceOf(AgentInputUserMessage);
    expect(postedMessage.content).toBe(event.content);
  });

  it('enqueues error when recipient not found or failed to start', async () => {
    agentTeamContext.state.teamManager = {
      ensureNodeIsReady: vi.fn(async () => { throw new Error('Test Failure'); })
    } as any;

    await handler.handle(event, agentTeamContext);

    const enqueue = agentTeamContext.state.inputEventQueues?.enqueueInternalSystemEvent as any;
    expect(enqueue).toHaveBeenCalledTimes(1);
    const enqueuedEvent = enqueue.mock.calls[0][0];
    expect(enqueuedEvent).toBeInstanceOf(AgentTeamErrorEvent);
  });
});
