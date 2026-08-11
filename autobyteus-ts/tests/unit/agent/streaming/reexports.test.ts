import { describe, it, expect } from 'vitest';
import { AssistantCompleteResponseData as ReexportAssistantCompleteResponseData } from '../../../../src/agent/streaming/stream-event-payloads.js';
import { AssistantCompleteResponseData as CoreAssistantCompleteResponseData } from '../../../../src/agent/streaming/events/stream-event-payloads.js';
import { StreamEvent as ReexportStreamEvent } from '../../../../src/agent/streaming/stream-events.js';
import { StreamEvent as CoreStreamEvent } from '../../../../src/agent/streaming/events/stream-events.js';
import {
  streamQueueItems as ReexportStreamQueueItems,
  SimpleQueue as ReexportSimpleQueue
} from '../../../../src/agent/streaming/queue-streamer.js';
import {
  streamQueueItems as CoreStreamQueueItems,
  SimpleQueue as CoreSimpleQueue
} from '../../../../src/agent/streaming/utils/queue-streamer.js';
import { AgentEventStream as ReexportAgentEventStream } from '../../../../src/agent/streaming/agent-event-stream.js';
import { AgentEventStream as CoreAgentEventStream } from '../../../../src/agent/streaming/streams/agent-event-stream.js';

describe('retained streaming re-exports', () => {
  it('re-exports stream event payloads and events', () => {
    expect(ReexportAssistantCompleteResponseData).toBe(CoreAssistantCompleteResponseData);
    expect(ReexportStreamEvent).toBe(CoreStreamEvent);
  });

  it('re-exports queue streamer helpers', () => {
    expect(ReexportStreamQueueItems).toBe(CoreStreamQueueItems);
    expect(ReexportSimpleQueue).toBe(CoreSimpleQueue);
  });

  it('re-exports agent event stream', () => {
    expect(ReexportAgentEventStream).toBe(CoreAgentEventStream);
  });
});
