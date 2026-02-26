import { randomUUID } from 'node:crypto';
import type { BaseEvent } from './agent-events.js';

export class EventEnvelope {
  event_id: string;
  event_type: string;
  timestamp: number;
  agent_id: string;
  event: BaseEvent;
  correlation_id?: string;
  caused_by_event_id?: string;
  sequence: number;

  constructor(
    event_id: string,
    event_type: string,
    timestamp: number,
    agent_id: string,
    event: BaseEvent,
    correlation_id?: string,
    caused_by_event_id?: string,
    sequence: number = 0
  ) {
    this.event_id = event_id;
    this.event_type = event_type;
    this.timestamp = timestamp;
    this.agent_id = agent_id;
    this.event = event;
    this.correlation_id = correlation_id;
    this.caused_by_event_id = caused_by_event_id;
    this.sequence = sequence;
  }
}

export class AgentEventStore {
  private agent_id: string;
  private events: EventEnvelope[] = [];
  private sequence = 0;

  constructor(agent_id: string) {
    this.agent_id = agent_id;
  }

  append(
    event: BaseEvent,
    correlation_id?: string,
    caused_by_event_id?: string
  ): EventEnvelope {
    const envelope = new EventEnvelope(
      randomUUID(),
      event.constructor.name,
      Date.now() / 1000,
      this.agent_id,
      event,
      correlation_id,
      caused_by_event_id,
      this.sequence
    );
    this.sequence += 1;
    this.events.push(envelope);
    return envelope;
  }

  allEvents(): EventEnvelope[] {
    return [...this.events];
  }
}
