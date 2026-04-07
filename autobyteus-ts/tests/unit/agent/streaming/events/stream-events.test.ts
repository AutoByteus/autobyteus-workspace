import { describe, it, expect } from 'vitest';
import { StreamEvent, StreamEventType } from '../../../../../src/agent/streaming/events/stream-events.js';
import {
  AssistantChunkData,
  TurnLifecycleData
} from '../../../../../src/agent/streaming/events/stream-event-payloads.js';

describe('StreamEvent', () => {
  it('coerces payload to the expected class', () => {
    const event = new StreamEvent({
      event_type: StreamEventType.ASSISTANT_CHUNK,
      data: { content: 'Hello', is_complete: false }
    });

    expect(event.event_type).toBe(StreamEventType.ASSISTANT_CHUNK);
    expect(event.data).toBeInstanceOf(AssistantChunkData);
    const payload = event.data as AssistantChunkData;
    expect(payload.content).toBe('Hello');
    expect(payload.is_complete).toBe(false);
  });

  it('throws on unknown event type strings', () => {
    expect(
      () =>
        new StreamEvent({
          event_type: 'unknown_event_type',
          data: { content: 'Hello', is_complete: false }
        })
    ).toThrow(/Invalid event_type string/);
  });

  it('coerces turn lifecycle payloads to TurnLifecycleData', () => {
    const event = new StreamEvent({
      event_type: StreamEventType.TURN_COMPLETED,
      data: { turn_id: 'turn-1' }
    });

    expect(event.event_type).toBe(StreamEventType.TURN_COMPLETED);
    expect(event.data).toBeInstanceOf(TurnLifecycleData);
    expect((event.data as TurnLifecycleData).turn_id).toBe('turn-1');
  });
});
