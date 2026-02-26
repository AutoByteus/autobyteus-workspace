import { describe, it, expect } from 'vitest';
import { AgentEventStream } from '../../../../../src/agent/streaming/streams/agent-event-stream.js';
import { AgentExternalEventNotifier } from '../../../../../src/agent/events/notifiers.js';
import { StreamEvent, StreamEventType } from '../../../../../src/agent/streaming/events/stream-events.js';
import {
  AssistantChunkData,
  AssistantCompleteResponseData,
  ErrorEventData,
  AgentStatusUpdateData
} from '../../../../../src/agent/streaming/events/stream-event-payloads.js';
import { ChunkResponse, CompleteResponse } from '../../../../../src/llm/utils/response-types.js';
import { AgentStatus } from '../../../../../src/agent/status/status-enum.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const collectStreamResults = async <T>(
  stream: AsyncIterable<T>,
  streamer: AgentEventStream,
  closeAfter = 20
): Promise<T[]> => {
  const results: T[] = [];
  const closer = setTimeout(() => {
    void streamer.close();
  }, closeAfter);
  for await (const item of stream) {
    results.push(item);
  }
  clearTimeout(closer);
  return results;
};

const makeStreamer = (agentId = 'stream_test_agent_001') => {
  const notifier = new AgentExternalEventNotifier(agentId);
  const agent = {
    agentId,
    context: {
      statusManager: { notifier }
    }
  };
  return { notifier, streamer: new AgentEventStream(agent) };
};

describe('AgentEventStream', () => {
  it('streams assistant chunks', async () => {
    const { notifier, streamer } = makeStreamer();
    const chunk1 = new ChunkResponse({ content: 'Hello ' });
    const chunk2 = new ChunkResponse({ content: 'World' });

    const consumer = collectStreamResults(streamer.streamAssistantChunks(), streamer, 40);
    const producer = (async () => {
      await delay(5);
      notifier.notifyAgentDataAssistantChunk(chunk1);
      notifier.notifyAgentDataAssistantChunk(chunk2);
    })();

    const [results] = await Promise.all([consumer, producer]);
    expect(results.map((r) => r.content)).toEqual(['Hello ', 'World']);
  });

  it('streams assistant final responses', async () => {
    const { notifier, streamer } = makeStreamer();
    const finalMsg = new CompleteResponse({ content: 'This is the final message.' });

    const consumer = collectStreamResults(streamer.streamAssistantFinalResponse(), streamer, 40);
    const producer = (async () => {
      await delay(5);
      notifier.notifyAgentDataAssistantCompleteResponse(finalMsg);
    })();

    const [results] = await Promise.all([consumer, producer]);
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe(finalMsg.content);
  });

  it('allEvents receives status changes', async () => {
    const agentId = 'stream_test_agent_001';
    const { notifier, streamer } = makeStreamer(agentId);

    const consumer = collectStreamResults(streamer.allEvents(), streamer, 40);
    const producer = (async () => {
      await delay(5);
      notifier.notifyStatusUpdated(AgentStatus.IDLE, AgentStatus.BOOTSTRAPPING);
    })();

    const [results] = await Promise.all([consumer, producer]);
    expect(results).toHaveLength(1);
    const event = results[0] as StreamEvent;
    expect(event.agent_id).toBe(agentId);
    expect(event.event_type).toBe(StreamEventType.AGENT_STATUS_UPDATED);
    expect(event.data).toBeInstanceOf(AgentStatusUpdateData);
    const payload = event.data as AgentStatusUpdateData;
    expect(payload.new_status).toBe(AgentStatus.IDLE);
    expect(payload.old_status).toBe(AgentStatus.BOOTSTRAPPING);
  });

  it('allEvents receives assistant chunk', async () => {
    const { notifier, streamer } = makeStreamer();
    const chunk = new ChunkResponse({ content: 'test chunk' });

    const consumer = collectStreamResults(streamer.allEvents(), streamer, 40);
    const producer = (async () => {
      await delay(5);
      notifier.notifyAgentDataAssistantChunk(chunk);
    })();

    const [results] = await Promise.all([consumer, producer]);
    expect(results).toHaveLength(1);
    const event = results[0] as StreamEvent;
    expect(event.event_type).toBe(StreamEventType.ASSISTANT_CHUNK);
    expect(event.data).toBeInstanceOf(AssistantChunkData);
    expect((event.data as AssistantChunkData).content).toBe('test chunk');
  });

  it('allEvents receives complete response', async () => {
    const { notifier, streamer } = makeStreamer();
    const finalMsg = new CompleteResponse({ content: 'Final response content.' });

    const consumer = collectStreamResults(streamer.allEvents(), streamer, 40);
    const producer = (async () => {
      await delay(5);
      notifier.notifyAgentDataAssistantCompleteResponse(finalMsg);
    })();

    const [results] = await Promise.all([consumer, producer]);
    expect(results).toHaveLength(1);
    const event = results[0] as StreamEvent;
    expect(event.event_type).toBe(StreamEventType.ASSISTANT_COMPLETE_RESPONSE);
    expect(event.data).toBeInstanceOf(AssistantCompleteResponseData);
    expect((event.data as AssistantCompleteResponseData).content).toBe('Final response content.');
  });

  it('allEvents receives error event', async () => {
    const { notifier, streamer } = makeStreamer();

    const consumer = collectStreamResults(streamer.allEvents(), streamer, 40);
    const producer = (async () => {
      await delay(5);
      notifier.notifyAgentErrorOutputGeneration('TEST_SOURCE', 'A test error occurred.', 'Detailed traceback.');
    })();

    const [results] = await Promise.all([consumer, producer]);
    expect(results).toHaveLength(1);
    const event = results[0] as StreamEvent;
    expect(event.event_type).toBe(StreamEventType.ERROR_EVENT);
    expect(event.data).toBeInstanceOf(ErrorEventData);
    const payload = event.data as ErrorEventData;
    expect(payload.code).toBe('TEST_SOURCE');
    expect(payload.message).toBe('A test error occurred.');
    expect(payload.details).toBe('Detailed traceback.');
  });

  it('allEvents receives mixed events in order', async () => {
    const { notifier, streamer } = makeStreamer();
    const chunk = new ChunkResponse({ content: 'c1' });
    const finalMsg = new CompleteResponse({ content: 'final' });

    const consumer = collectStreamResults(streamer.allEvents(), streamer, 80);
    const producer = (async () => {
      await delay(5);
      notifier.notifyStatusUpdated(AgentStatus.IDLE, AgentStatus.BOOTSTRAPPING);
      await delay(5);
      notifier.notifyAgentDataAssistantChunk(chunk);
      await delay(5);
      notifier.notifyAgentDataAssistantCompleteResponse(finalMsg);
    })();

    const [results] = await Promise.all([consumer, producer]);
    expect(results).toHaveLength(3);
    expect(results[0].event_type).toBe(StreamEventType.AGENT_STATUS_UPDATED);
    expect(results[1].event_type).toBe(StreamEventType.ASSISTANT_CHUNK);
    expect(results[2].event_type).toBe(StreamEventType.ASSISTANT_COMPLETE_RESPONSE);
  });
});
