import { EventEmitter } from '../../events/event-emitter.js';
import { EventType } from '../../events/event-types.js';
import { AgentTeamStreamEvent } from './agent-team-stream-events.js';
import { SimpleQueue, streamQueueItems } from '../../agent/streaming/utils/queue-streamer.js';

const ATS_INTERNAL_SENTINEL = {};

export type AgentTeamLike = {
  teamId: string;
  notifier?: EventEmitter | null;
};

export class AgentTeamEventStream {
  teamId: string;
  private internalQueue: SimpleQueue<AgentTeamStreamEvent | object>;
  private notifier: EventEmitter | null;

  constructor(team: AgentTeamLike) {
    if (!team || typeof team !== 'object' || typeof team.teamId !== 'string') {
      throw new TypeError(`AgentTeamEventStream requires a Team-like instance, got ${typeof team}.`);
    }

    this.teamId = team.teamId;
    this.internalQueue = new SimpleQueue<AgentTeamStreamEvent | object>();
    this.notifier = team.notifier ?? null;

    if (!this.notifier) {
      console.error(`AgentTeamEventStream for '${this.teamId}': Notifier not available. No events will be streamed.`);
      return;
    }

    this.notifier.subscribe(EventType.TEAM_STREAM_EVENT, this.handleEvent);
  }

  private handleEvent = (payload?: any): void => {
    const event =
      payload && typeof payload === 'object' && 'payload' in payload ? (payload as { payload?: unknown }).payload : payload;
    if (event instanceof AgentTeamStreamEvent && event.team_id === this.teamId) {
      this.internalQueue.put(event);
    }
  };

  async close(): Promise<void> {
    if (this.notifier) {
      this.notifier.unsubscribe(EventType.TEAM_STREAM_EVENT, this.handleEvent);
    }
    this.internalQueue.put(ATS_INTERNAL_SENTINEL);
  }

  async *allEvents(): AsyncGenerator<AgentTeamStreamEvent, void, unknown> {
    for await (const event of streamQueueItems(
      this.internalQueue,
      ATS_INTERNAL_SENTINEL,
      `team_${this.teamId}_stream`
    )) {
      yield event as AgentTeamStreamEvent;
    }
  }
}
