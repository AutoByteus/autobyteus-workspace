import { describe, it, expect, vi } from 'vitest';
import { AgentTeamEventStream } from '../../../../src/agent-team/streaming/agent-team-event-stream.js';
import { AgentTeamStreamEvent } from '../../../../src/agent-team/streaming/agent-team-stream-events.js';
import { AgentTeamStatusUpdateData, AgentEventRebroadcastPayload } from '../../../../src/agent-team/streaming/agent-team-stream-events.js';
import { EventType } from '../../../../src/events/event-types.js';
import { AgentTeamStatus } from '../../../../src/agent-team/status/agent-team-status.js';
import { EventEmitter } from '../../../../src/events/event-emitter.js';
import { StreamEvent, StreamEventType } from '../../../../src/agent/streaming/stream-events.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';

const makeTeam = () => {
  const notifier = new EventEmitter();
  const team = { teamId: 'team-stream-test', notifier } as any;
  return { team, notifier };
};

describe('AgentTeamEventStream', () => {
  it('subscribes on initialization', () => {
    const { team, notifier } = makeTeam();
    const subscribeSpy = vi.spyOn(notifier, 'subscribe');
    const stream = new AgentTeamEventStream(team);

    expect(subscribeSpy).toHaveBeenCalledWith(EventType.TEAM_STREAM_EVENT, (stream as any).handleEvent);
  });

  it('queues only matching team events', () => {
    const { team } = makeTeam();
    const stream = new AgentTeamEventStream(team);

    const correct_event = new AgentTeamStreamEvent({
      team_id: stream.teamId,
      event_source_type: 'TEAM',
      data: new AgentTeamStatusUpdateData({ new_status: AgentTeamStatus.IDLE })
    });
    const wrong_event = new AgentTeamStreamEvent({
      team_id: 'other-team',
      event_source_type: 'TEAM',
      data: new AgentTeamStatusUpdateData({ new_status: AgentTeamStatus.IDLE })
    });

    (stream as any).handleEvent(correct_event);
    (stream as any).handleEvent(wrong_event);

    const queue = (stream as any).internalQueue;
    expect(queue.getNowait()).toBe(correct_event);
  });

  it('streams events and closes', async () => {
    const { team, notifier } = makeTeam();
    const stream = new AgentTeamEventStream(team);

    const event1 = new AgentTeamStreamEvent({
      team_id: stream.teamId,
      event_source_type: 'TEAM',
      data: new AgentTeamStatusUpdateData({ new_status: AgentTeamStatus.IDLE })
    });
    const agent_event = new StreamEvent({
      agent_id: 'agent-1',
      event_type: StreamEventType.AGENT_STATUS_UPDATED,
      data: { new_status: AgentStatus.IDLE }
    });
    const event2 = new AgentTeamStreamEvent({
      team_id: stream.teamId,
      event_source_type: 'AGENT',
      data: new AgentEventRebroadcastPayload({ agent_name: 'a', agent_event })
    });

    const produceEvents = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      notifier.emit(EventType.TEAM_STREAM_EVENT, { payload: event1 });
      await new Promise((resolve) => setTimeout(resolve, 10));
      notifier.emit(EventType.TEAM_STREAM_EVENT, { payload: event2 });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await stream.close();
    };

    const producer = produceEvents();
    const results: AgentTeamStreamEvent[] = [];
    for await (const event of stream.allEvents()) {
      results.push(event);
    }

    await producer;
    expect(results).toEqual([event1, event2]);
  });
});
