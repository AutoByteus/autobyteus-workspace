import { randomUUID } from 'node:crypto';
import { BaseTaskPlanEventSchema } from '../../task-management/events.js';
import {
  AgentTeamStatusUpdateData,
  AgentEventRebroadcastPayload,
  SubTeamEventRebroadcastPayload,
  type TaskPlanEventPayload
} from './agent-team-stream-event-payloads.js';

export {
  AgentTeamStatusUpdateData,
  AgentEventRebroadcastPayload,
  SubTeamEventRebroadcastPayload,
  type TaskPlanEventPayload
} from './agent-team-stream-event-payloads.js';

export type AgentTeamStreamEventSourceType = 'TEAM' | 'AGENT' | 'SUB_TEAM' | 'TASK_PLAN';

export type TeamSpecificPayload = AgentTeamStatusUpdateData;

export type AgentTeamStreamDataPayload =
  | TeamSpecificPayload
  | AgentEventRebroadcastPayload
  | SubTeamEventRebroadcastPayload
  | TaskPlanEventPayload;

const isTaskPlanPayload = (data: unknown): boolean => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return BaseTaskPlanEventSchema.safeParse(data).success;
};

export class AgentTeamStreamEvent {
  event_id: string;
  timestamp: Date;
  team_id: string;
  event_source_type: AgentTeamStreamEventSourceType;
  data: AgentTeamStreamDataPayload;

  constructor(options: {
    event_id?: string;
    timestamp?: Date;
    team_id: string;
    event_source_type: AgentTeamStreamEventSourceType;
    data: AgentTeamStreamDataPayload;
  }) {
    this.event_id = options.event_id ?? randomUUID();
    this.timestamp = options.timestamp ?? new Date();
    this.team_id = options.team_id;
    this.event_source_type = options.event_source_type;
    this.data = options.data;

    this.validate_payload();
  }

  private validate_payload(): void {
    const isAgentEvent = this.event_source_type === 'AGENT';
    const isAgentPayload = this.data instanceof AgentEventRebroadcastPayload;

    const isSubTeamEvent = this.event_source_type === 'SUB_TEAM';
    const isSubTeamPayload = this.data instanceof SubTeamEventRebroadcastPayload;

    const isTeamEvent = this.event_source_type === 'TEAM';
    const isTeamPayload = this.data instanceof AgentTeamStatusUpdateData;

    const isTaskPlanEvent = this.event_source_type === 'TASK_PLAN';
    const hasTaskPlanPayload = isTaskPlanPayload(this.data);

    if (isAgentEvent && !isAgentPayload) {
      throw new Error("event_source_type is 'AGENT' but data is not an AgentEventRebroadcastPayload");
    }

    if (isSubTeamEvent && !isSubTeamPayload) {
      throw new Error("event_source_type is 'SUB_TEAM' but data is not a SubTeamEventRebroadcastPayload");
    }

    if (isTeamEvent && !isTeamPayload) {
      throw new Error("event_source_type is 'TEAM' but data is not a valid team-specific payload");
    }

    if (isTaskPlanEvent && !hasTaskPlanPayload) {
      throw new Error("event_source_type is 'TASK_PLAN' but data is not a BaseTaskPlanEvent instance");
    }
  }
}
