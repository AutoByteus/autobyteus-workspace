import { describe, it, expect } from 'vitest';
import {
  BaseAgentTeamEvent,
  LifecycleAgentTeamEvent,
  OperationalAgentTeamEvent,
  AgentTeamErrorEvent,
  InterAgentMessageRequestEvent
} from '../../../../src/agent-team/events/agent-team-events.js';

describe('Agent team events', () => {
  it('constructs InterAgentMessageRequestEvent with expected fields', () => {
    const event = new InterAgentMessageRequestEvent(
      'sender_agent_id',
      'RecipientAgent',
      'hello',
      'task_assignment'
    );

    expect(event.senderAgentId).toBe('sender_agent_id');
    expect(event.recipientName).toBe('RecipientAgent');
    expect(event.content).toBe('hello');
    expect(event.messageType).toBe('task_assignment');
    expect(event).toBeInstanceOf(OperationalAgentTeamEvent);
    expect(event).toBeInstanceOf(BaseAgentTeamEvent);
  });

  it('constructs AgentTeamErrorEvent with optional details', () => {
    const event = new AgentTeamErrorEvent('boom', 'stack');
    expect(event.errorMessage).toBe('boom');
    expect(event.exceptionDetails).toBe('stack');
    expect(event).toBeInstanceOf(LifecycleAgentTeamEvent);
    expect(event).toBeInstanceOf(BaseAgentTeamEvent);
  });
});
