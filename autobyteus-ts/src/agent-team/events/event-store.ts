import { randomUUID } from 'node:crypto';
import type { BaseAgentTeamEvent } from './agent-team-events.js';

export type EventEnvelope = {
  event_id: string;
  event_type: string;
  timestamp: number;
  team_id: string;
  event: BaseAgentTeamEvent;
  correlation_id?: string | null;
  caused_by_event_id?: string | null;
  sequence: number;
};

export class AgentTeamEventStore {
  private teamId: string;
  private events: EventEnvelope[] = [];
  private sequence = 0;

  constructor(teamId: string) {
    this.teamId = teamId;
    console.debug(`AgentTeamEventStore initialized for team '${teamId}'.`);
  }

  append(event: BaseAgentTeamEvent, correlationId?: string | null, causedByEventId?: string | null): EventEnvelope {
    const envelope: EventEnvelope = Object.freeze({
      event_id: randomUUID(),
      event_type: event.constructor.name,
      timestamp: Date.now() / 1000,
      team_id: this.teamId,
      event,
      correlation_id: correlationId ?? null,
      caused_by_event_id: causedByEventId ?? null,
      sequence: this.sequence
    });

    this.sequence += 1;
    this.events.push(envelope);
    console.debug(`Appended event '${envelope.event_type}' to store for team '${this.teamId}'.`);
    return envelope;
  }

  allEvents(): EventEnvelope[] {
    return [...this.events];
  }
}
