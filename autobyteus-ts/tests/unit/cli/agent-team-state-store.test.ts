import { describe, it, expect } from 'vitest';
import type { AgentTeam } from '../../../src/agent-team/agent-team.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { StreamEvent, StreamEventType } from '../../../src/agent/streaming/events/stream-events.js';
import {
  AgentEventRebroadcastPayload,
  AgentTeamStatusUpdateData,
  SubTeamEventRebroadcastPayload,
  AgentTeamStreamEvent
} from '../../../src/agent-team/streaming/agent-team-stream-events.js';
import { AgentTeamStatus } from '../../../src/agent-team/status/agent-team-status.js';
import { TaskStatus } from '../../../src/task-management/base-task-plan.js';
import { TuiStateStore } from '../../../src/cli/agent-team/state-store.js';

const buildTeam = (): AgentTeam => {
  return {
    name: 'Alpha',
    role: 'Lead',
    runtime: {
      context: {
        config: {
          nodes: [
            { nodeDefinition: { name: 'AgentOne', role: 'Engineer' } },
            { nodeDefinition: { name: 'SubTeamA', role: 'Ops' } }
          ]
        }
      }
    }
  } as unknown as AgentTeam;
};

describe('TuiStateStore', () => {
  it('initializes tree with the root team', () => {
    const store = new TuiStateStore(buildTeam());
    expect(store.getTreeData()).toEqual({
      Alpha: {
        type: 'team',
        name: 'Alpha',
        role: 'Lead',
        children: {}
      }
    });
  });

  it('tracks agent status updates and adds agent nodes', () => {
    const store = new TuiStateStore(buildTeam());
    const agentEvent = new StreamEvent({
      event_type: StreamEventType.AGENT_STATUS_UPDATED,
      data: { new_status: AgentStatus.IDLE }
    });
    const payload = new AgentEventRebroadcastPayload({ agent_name: 'AgentOne', agent_event: agentEvent });
    const teamEvent = new AgentTeamStreamEvent({
      team_id: 'team_alpha',
      event_source_type: 'AGENT',
      data: payload
    });

    store.processEvent(teamEvent);

    const tree = store.getTreeData();
    expect(tree.Alpha.children.AgentOne).toBeDefined();
    expect(tree.Alpha.children.AgentOne.role).toBe('Engineer');
    expect(store.agentStatuses.AgentOne).toBe(AgentStatus.IDLE);
    expect(store.getHistoryForNode('AgentOne', 'agent')).toHaveLength(1);
  });

  it('tracks speaking agents based on assistant chunk events', () => {
    const store = new TuiStateStore(buildTeam());
    const chunkEvent = new StreamEvent({
      event_type: StreamEventType.ASSISTANT_CHUNK,
      data: { content: 'hi', is_complete: false }
    });
    const chunkPayload = new AgentEventRebroadcastPayload({ agent_name: 'AgentOne', agent_event: chunkEvent });
    store.processEvent(
      new AgentTeamStreamEvent({
        team_id: 'team_alpha',
        event_source_type: 'AGENT',
        data: chunkPayload
      })
    );

    expect(store.speakingAgents.AgentOne).toBe(true);

    const completeEvent = new StreamEvent({
      event_type: StreamEventType.ASSISTANT_COMPLETE_RESPONSE,
      data: { content: 'done' }
    });
    const completePayload = new AgentEventRebroadcastPayload({ agent_name: 'AgentOne', agent_event: completeEvent });
    store.processEvent(
      new AgentTeamStreamEvent({
        team_id: 'team_alpha',
        event_source_type: 'AGENT',
        data: completePayload
      })
    );

    expect(store.speakingAgents.AgentOne).toBe(false);
  });

  it('tracks task plan updates and sub-team status changes', () => {
    const store = new TuiStateStore(buildTeam());
    const tasksEvent = new AgentTeamStreamEvent({
      team_id: 'team_alpha',
      event_source_type: 'TASK_PLAN',
      data: {
        team_id: 'team_alpha',
        tasks: [
          {
            task_name: 'setup',
            task_id: 'task_1',
            assignee_name: 'AgentOne',
            description: 'Setup repo',
            dependencies: [],
            file_deliverables: []
          }
        ]
      }
    });
    store.processEvent(tasksEvent);

    const statusEvent = new AgentTeamStreamEvent({
      team_id: 'team_alpha',
      event_source_type: 'TASK_PLAN',
      data: {
        team_id: 'team_alpha',
        task_id: 'task_1',
        new_status: TaskStatus.COMPLETED,
        agent_name: 'AgentOne',
        deliverables: [
          {
            file_path: '/tmp/report.txt',
            summary: 'Done',
            author_agent_name: 'AgentOne',
            timestamp: new Date()
          }
        ]
      }
    });
    store.processEvent(statusEvent);

    expect(store.getTaskPlanTasks('Alpha')).toHaveLength(1);
    expect(store.getTaskPlanStatuses('Alpha')?.task_1).toBe(TaskStatus.COMPLETED);

    const subTeamInner = new AgentTeamStreamEvent({
      team_id: 'sub_team',
      event_source_type: 'TEAM',
      data: new AgentTeamStatusUpdateData({ new_status: AgentTeamStatus.IDLE })
    });
    const subPayload = new SubTeamEventRebroadcastPayload({
      sub_team_node_name: 'SubTeamA',
      sub_team_event: subTeamInner
    });
    const subEvent = new AgentTeamStreamEvent({
      team_id: 'team_alpha',
      event_source_type: 'SUB_TEAM',
      data: subPayload
    });

    store.processEvent(subEvent);

    const tree = store.getTreeData();
    expect(tree.Alpha.children.SubTeamA).toBeDefined();
    expect(store.teamStatuses.SubTeamA).toBe(AgentTeamStatus.IDLE);
  });
});
