import { AgentTeamStatus } from '../status/agent-team-status.js';
import { StreamEvent } from '../../agent/streaming/stream-events.js';
import type { TasksCreatedEvent, TaskStatusUpdatedEvent } from '../../task-management/events.js';

const assertRequiredKeys = (data: Record<string, unknown>, keys: string[], name: string): void => {
  const missing = keys.filter((key) => !(key in data));
  if (missing.length) {
    throw new Error(`${name} missing required fields: ${missing.join(', ')}`);
  }
};

export class BaseTeamSpecificPayload {
  [key: string]: unknown;

  constructor(data: Record<string, unknown> = {}) {
    Object.assign(this, data);
  }
}

export class AgentTeamStatusUpdateData extends BaseTeamSpecificPayload {
  new_status: AgentTeamStatus;
  old_status?: AgentTeamStatus;
  error_message?: string;

  constructor(data: Record<string, unknown>) {
    assertRequiredKeys(data, ['new_status'], 'AgentTeamStatusUpdateData');
    super(data);
    this.new_status = data.new_status as AgentTeamStatus;
    this.old_status = data.old_status as AgentTeamStatus | undefined;
    this.error_message = data.error_message ? String(data.error_message) : undefined;
  }
}

export class AgentEventRebroadcastPayload {
  agent_name: string;
  agent_event: StreamEvent;

  constructor(data: Record<string, unknown>) {
    assertRequiredKeys(data, ['agent_name', 'agent_event'], 'AgentEventRebroadcastPayload');
    this.agent_name = String(data.agent_name ?? '');
    this.agent_event = data.agent_event as StreamEvent;
  }
}

export class SubTeamEventRebroadcastPayload {
  sub_team_node_name: string;
  sub_team_event: unknown;

  constructor(data: Record<string, unknown>) {
    assertRequiredKeys(data, ['sub_team_node_name', 'sub_team_event'], 'SubTeamEventRebroadcastPayload');
    this.sub_team_node_name = String(data.sub_team_node_name ?? '');
    this.sub_team_event = data.sub_team_event;
  }
}

export type TaskPlanEventPayload = TasksCreatedEvent | TaskStatusUpdatedEvent;
