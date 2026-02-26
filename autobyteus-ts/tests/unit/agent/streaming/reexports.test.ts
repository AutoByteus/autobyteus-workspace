import { describe, it, expect } from 'vitest';
import { AssistantChunkData as ReexportAssistantChunkData } from '../../../../src/agent/streaming/stream-event-payloads.js';
import { AssistantChunkData as CoreAssistantChunkData } from '../../../../src/agent/streaming/events/stream-event-payloads.js';
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
import { ApiToolCallStreamingResponseHandler as ReexportApiToolCallStreamingResponseHandler } from '../../../../src/agent/streaming/api-tool-call-streaming-response-handler.js';
import { ApiToolCallStreamingResponseHandler as CoreApiToolCallStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';

describe('streaming compatibility re-exports', () => {
  it('re-exports stream event payloads and events', () => {
    expect(ReexportAssistantChunkData).toBe(CoreAssistantChunkData);
    expect(ReexportStreamEvent).toBe(CoreStreamEvent);
  });

  it('re-exports queue streamer helpers', () => {
    expect(ReexportStreamQueueItems).toBe(CoreStreamQueueItems);
    expect(ReexportSimpleQueue).toBe(CoreSimpleQueue);
  });

  it('re-exports agent event stream and handler', () => {
    expect(ReexportAgentEventStream).toBe(CoreAgentEventStream);
    expect(ReexportApiToolCallStreamingResponseHandler).toBe(CoreApiToolCallStreamingResponseHandler);
  });
});
