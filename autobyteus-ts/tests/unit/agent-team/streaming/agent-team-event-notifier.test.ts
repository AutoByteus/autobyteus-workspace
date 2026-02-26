import { describe, it, expect, vi } from 'vitest';
import { AgentTeamExternalEventNotifier } from '../../../../src/agent-team/streaming/agent-team-event-notifier.js';
import {
  AgentTeamStreamEvent,
  AgentEventRebroadcastPayload,
  AgentTeamStatusUpdateData,
  SubTeamEventRebroadcastPayload
} from '../../../../src/agent-team/streaming/agent-team-stream-events.js';
import { EventType } from '../../../../src/events/event-types.js';
import { AgentTeamStatus } from '../../../../src/agent-team/status/agent-team-status.js';
import { StreamEvent, StreamEventType } from '../../../../src/agent/streaming/stream-events.js';

const makeNotifier = (): AgentTeamExternalEventNotifier => {
  return new AgentTeamExternalEventNotifier('team-123', {} as any);
};

describe('AgentTeamExternalEventNotifier', () => {
  it('emits status update events', () => {
    const notifier = makeNotifier();
    const emitSpy = vi.spyOn(notifier, 'emit');

    notifier.notifyStatusUpdated(
      AgentTeamStatus.IDLE,
      AgentTeamStatus.BOOTSTRAPPING,
      { error_message: 'An error' }
    );

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const [eventType, kwargs] = emitSpy.mock.calls[0];
    expect(eventType).toBe(EventType.TEAM_STREAM_EVENT);
    const emittedEvent = (kwargs as any).payload as AgentTeamStreamEvent;
    expect(emittedEvent).toBeInstanceOf(AgentTeamStreamEvent);
    expect(emittedEvent.team_id).toBe('team-123');
    expect(emittedEvent.event_source_type).toBe('TEAM');

    const data = emittedEvent.data as AgentTeamStatusUpdateData;
    expect(data).toBeInstanceOf(AgentTeamStatusUpdateData);
    expect(data.new_status).toBe(AgentTeamStatus.IDLE);
    expect(data.old_status).toBe(AgentTeamStatus.BOOTSTRAPPING);
    expect(data.error_message).toBe('An error');
  });

  it('emits agent rebroadcast events', () => {
    const notifier = makeNotifier();
    const emitSpy = vi.spyOn(notifier, 'emit');

    const mock_agent_event = new StreamEvent({
      agent_id: 'agent-abc',
      event_type: StreamEventType.ASSISTANT_CHUNK,
      data: { content: 'chunk text', is_complete: false }
    });

    notifier.publishAgentEvent('Researcher', mock_agent_event);

    const [eventType, kwargs] = emitSpy.mock.calls[0];
    expect(eventType).toBe(EventType.TEAM_STREAM_EVENT);
    const emittedEvent = (kwargs as any).payload as AgentTeamStreamEvent;
    expect(emittedEvent.event_source_type).toBe('AGENT');

    const data = emittedEvent.data as AgentEventRebroadcastPayload;
    expect(data).toBeInstanceOf(AgentEventRebroadcastPayload);
    expect(data.agent_name).toBe('Researcher');
    expect(data.agent_event).toBe(mock_agent_event);
  });

  it('emits sub-team rebroadcast events', () => {
    const notifier = makeNotifier();
    const emitSpy = vi.spyOn(notifier, 'emit');

    const mock_sub_team_event = new AgentTeamStreamEvent({
      team_id: 'sub-team-456',
      event_source_type: 'TEAM',
      data: new AgentTeamStatusUpdateData({ new_status: AgentTeamStatus.IDLE })
    });

    notifier.publishSubTeamEvent('ResearchTeam', mock_sub_team_event);

    const [eventType, kwargs] = emitSpy.mock.calls[0];
    expect(eventType).toBe(EventType.TEAM_STREAM_EVENT);
    const emittedEvent = (kwargs as any).payload as AgentTeamStreamEvent;
    expect(emittedEvent.event_source_type).toBe('SUB_TEAM');

    const data = emittedEvent.data as SubTeamEventRebroadcastPayload;
    expect(data).toBeInstanceOf(SubTeamEventRebroadcastPayload);
    expect(data.sub_team_node_name).toBe('ResearchTeam');
    expect(data.sub_team_event).toBe(mock_sub_team_event);
  });
});
