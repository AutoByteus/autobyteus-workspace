import { describe, it, expect } from 'vitest';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { StreamEvent, StreamEventType } from '../../../../src/agent/streaming/stream-events.js';
import {
  AgentTeamStreamEvent,
  AgentEventRebroadcastPayload,
  AgentTeamStatusUpdateData,
  SubTeamEventRebroadcastPayload
} from '../../../../src/agent-team/streaming/agent-team-stream-events.js';
import { AgentTeamStatus } from '../../../../src/agent-team/status/agent-team-status.js';

const makeAgentStreamEvent = (): StreamEvent =>
  new StreamEvent({
    agent_id: 'agent-1',
    event_type: StreamEventType.AGENT_STATUS_UPDATED,
    data: { new_status: AgentStatus.IDLE }
  });

describe('AgentTeamStreamEvent', () => {
  it('creates TEAM-sourced event', () => {
    const data = new AgentTeamStatusUpdateData({
      new_status: AgentTeamStatus.IDLE,
      old_status: AgentTeamStatus.PROCESSING
    });

    const event = new AgentTeamStreamEvent({
      team_id: 'team-1',
      event_source_type: 'TEAM',
      data
    });

    expect(event.data).toBeInstanceOf(AgentTeamStatusUpdateData);
    expect((event.data as AgentTeamStatusUpdateData).new_status).toBe(AgentTeamStatus.IDLE);
  });

  it('creates AGENT-sourced event', () => {
    const data = new AgentEventRebroadcastPayload({
      agent_name: 'Coordinator',
      agent_event: makeAgentStreamEvent()
    });

    const event = new AgentTeamStreamEvent({
      team_id: 'team-1',
      event_source_type: 'AGENT',
      data
    });

    expect(event.data).toBeInstanceOf(AgentEventRebroadcastPayload);
    expect((event.data as AgentEventRebroadcastPayload).agent_name).toBe('Coordinator');
    expect((event.data as AgentEventRebroadcastPayload).agent_event.agent_id).toBe('agent-1');
  });

  it('creates SUB_TEAM-sourced event', () => {
    const mock_sub_team_event = new AgentTeamStreamEvent({
      team_id: 'sub-team-2',
      event_source_type: 'TEAM',
      data: new AgentTeamStatusUpdateData({ new_status: AgentTeamStatus.IDLE })
    });

    const data = new SubTeamEventRebroadcastPayload({
      sub_team_node_name: 'ResearchTeam',
      sub_team_event: mock_sub_team_event
    });

    const event = new AgentTeamStreamEvent({
      team_id: 'team-1',
      event_source_type: 'SUB_TEAM',
      data
    });

    expect(event.data).toBeInstanceOf(SubTeamEventRebroadcastPayload);
    expect((event.data as SubTeamEventRebroadcastPayload).sub_team_node_name).toBe('ResearchTeam');
    expect((event.data as SubTeamEventRebroadcastPayload).sub_team_event).toBeInstanceOf(AgentTeamStreamEvent);
  });

  it('throws on mismatched payloads', () => {
    expect(() =>
      new AgentTeamStreamEvent({
        team_id: 'team-1',
        event_source_type: 'TEAM',
        data: { agent_name: 'test', agent_event: {} } as any
      })
    ).toThrow();

    expect(() =>
      new AgentTeamStreamEvent({
        team_id: 'team-1',
        event_source_type: 'AGENT',
        data: { new_status: 'idle' } as any
      })
    ).toThrow();

    expect(() =>
      new AgentTeamStreamEvent({
        team_id: 'team-1',
        event_source_type: 'SUB_TEAM',
        data: { agent_name: 'test', agent_event: {} } as any
      })
    ).toThrow();
  });
});
