import { EventEmitter } from '../../events/event-emitter.js';
import { EventType } from '../../events/event-types.js';
import { AgentTeamStatus } from '../status/agent-team-status.js';
import { StreamEvent } from '../../agent/streaming/stream-events.js';
import {
  AgentTeamStreamEvent,
  AgentEventRebroadcastPayload,
  AgentTeamStatusUpdateData,
  SubTeamEventRebroadcastPayload
} from './agent-team-stream-events.js';
import type { TaskPlanEventPayload } from './agent-team-stream-events.js';

export class AgentTeamExternalEventNotifier extends EventEmitter {
  teamId: string;
  runtimeRef: unknown;

  constructor(teamId: string, runtimeRef: unknown) {
    super();
    this.teamId = teamId;
    this.runtimeRef = runtimeRef;
    console.debug(`AgentTeamExternalEventNotifier initialized for team '${this.teamId}'.`);
  }

  private emitEvent(event: AgentTeamStreamEvent): void {
    this.emit(EventType.TEAM_STREAM_EVENT, { payload: event });
  }

  notifyStatusUpdated(
    new_status: AgentTeamStatus,
    old_status: AgentTeamStatus | null | undefined,
    extra_data?: Record<string, any> | null
  ): void {
    const payload: Record<string, any> = {
      new_status,
      old_status,
      error_message: extra_data?.error_message ?? undefined
    };

    const filtered_payload: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) {
        filtered_payload[key] = value;
      }
    }

    const event = new AgentTeamStreamEvent({
      team_id: this.teamId,
      event_source_type: 'TEAM',
      data: new AgentTeamStatusUpdateData(filtered_payload)
    });
    this.emitEvent(event);
  }

  publishAgentEvent(agentName: string, agentEvent: StreamEvent): void {
    const event = new AgentTeamStreamEvent({
      team_id: this.teamId,
      event_source_type: 'AGENT',
      data: new AgentEventRebroadcastPayload({ agent_name: agentName, agent_event: agentEvent })
    });
    this.emitEvent(event);
  }

  publishSubTeamEvent(subTeamNodeName: string, subTeamEvent: AgentTeamStreamEvent): void {
    const event = new AgentTeamStreamEvent({
      team_id: this.teamId,
      event_source_type: 'SUB_TEAM',
      data: new SubTeamEventRebroadcastPayload({ sub_team_node_name: subTeamNodeName, sub_team_event: subTeamEvent })
    });
    this.emitEvent(event);
  }

  handleAndPublishTaskPlanEvent(payload: TaskPlanEventPayload): void {
    const event = new AgentTeamStreamEvent({
      team_id: this.teamId,
      event_source_type: 'TASK_PLAN',
      data: payload
    });
    this.emitEvent(event);
  }
}
