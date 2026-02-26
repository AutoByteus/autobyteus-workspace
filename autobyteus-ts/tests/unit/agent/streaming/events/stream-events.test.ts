import { describe, it, expect } from 'vitest';
import { StreamEvent, StreamEventType } from '../../../../../src/agent/streaming/events/stream-events.js';
import { AssistantChunkData } from '../../../../../src/agent/streaming/events/stream-event-payloads.js';

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
});
