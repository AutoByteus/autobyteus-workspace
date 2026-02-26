import { describe, it, expect } from 'vitest';
import { AgentTeamStatusDeriver } from '../../../../src/agent-team/status/status-deriver.js';
import { AgentTeamStatus } from '../../../../src/agent-team/status/agent-team-status.js';
import {
  AgentTeamBootstrapStartedEvent,
  AgentTeamReadyEvent,
  AgentTeamIdleEvent,
  AgentTeamShutdownRequestedEvent,
  AgentTeamStoppedEvent,
  AgentTeamErrorEvent,
  ProcessUserMessageEvent
} from '../../../../src/agent-team/events/agent-team-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';

describe('AgentTeamStatusDeriver', () => {
  it('handles bootstrap and ready transitions', () => {
    const deriver = new AgentTeamStatusDeriver(AgentTeamStatus.UNINITIALIZED);

    let [oldStatus, newStatus] = deriver.apply(new AgentTeamBootstrapStartedEvent());
    expect(oldStatus).toBe(AgentTeamStatus.UNINITIALIZED);
    expect(newStatus).toBe(AgentTeamStatus.BOOTSTRAPPING);

    [oldStatus, newStatus] = deriver.apply(new AgentTeamReadyEvent());
    expect(oldStatus).toBe(AgentTeamStatus.BOOTSTRAPPING);
    expect(newStatus).toBe(AgentTeamStatus.IDLE);

    [oldStatus, newStatus] = deriver.apply(new AgentTeamIdleEvent());
    expect(oldStatus).toBe(AgentTeamStatus.IDLE);
    expect(newStatus).toBe(AgentTeamStatus.IDLE);
  });

  it('transitions operational events to processing', () => {
    const deriver = new AgentTeamStatusDeriver(AgentTeamStatus.IDLE);
    const event = new ProcessUserMessageEvent(
      new AgentInputUserMessage('hi'),
      'Coordinator'
    );

    const [oldStatus, newStatus] = deriver.apply(event);
    expect(oldStatus).toBe(AgentTeamStatus.IDLE);
    expect(newStatus).toBe(AgentTeamStatus.PROCESSING);
  });

  it('handles shutdown and error transitions', () => {
    let deriver = new AgentTeamStatusDeriver(AgentTeamStatus.IDLE);
    let [, newStatus] = deriver.apply(new AgentTeamShutdownRequestedEvent());
    expect(newStatus).toBe(AgentTeamStatus.SHUTTING_DOWN);

    deriver = new AgentTeamStatusDeriver(AgentTeamStatus.ERROR);
    [, newStatus] = deriver.apply(new AgentTeamShutdownRequestedEvent());
    expect(newStatus).toBe(AgentTeamStatus.ERROR);

    deriver = new AgentTeamStatusDeriver(AgentTeamStatus.IDLE);
    [, newStatus] = deriver.apply(new AgentTeamStoppedEvent());
    expect(newStatus).toBe(AgentTeamStatus.SHUTDOWN_COMPLETE);

    deriver = new AgentTeamStatusDeriver(AgentTeamStatus.ERROR);
    [, newStatus] = deriver.apply(new AgentTeamStoppedEvent());
    expect(newStatus).toBe(AgentTeamStatus.ERROR);

    [, newStatus] = deriver.apply(new AgentTeamErrorEvent('boom'));
    expect(newStatus).toBe(AgentTeamStatus.ERROR);
  });
});
