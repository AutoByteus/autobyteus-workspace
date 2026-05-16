import { describe, expect, it } from "vitest";
import { AgentExternalEventNotifier } from "../../../../src/agent/events/notifiers.js";
import { ApiToolCallStreamingResponseHandler } from "../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js";
import { AgentEventStream } from "../../../../src/agent/streaming/streams/agent-event-stream.js";
import { StreamEvent, StreamEventType } from "../../../../src/agent/streaming/events/stream-events.js";
import { ChunkResponse } from "../../../../src/llm/utils/response-types.js";

const TURN_ID = "turn-kimi-tool-id-boundary";

const collectEvents = async (stream: AgentEventStream): Promise<StreamEvent[]> => {
  const events: StreamEvent[] = [];
  for await (const event of stream.allEvents()) {
    events.push(event);
  }
  return events;
};

describe("Kimi-shaped tool-call id stream boundary", () => {
  it("preserves distinct run_bash numeric invocation ids through handler, notifier, and event stream", async () => {
    const notifier = new AgentExternalEventNotifier("agent-kimi-boundary");
    const stream = new AgentEventStream({
      agentId: "agent-kimi-boundary",
      context: { statusManager: { notifier } },
    });
    const eventsPromise = collectEvents(stream);
    const invocationIds = ["run_bash:0", "run_bash:1", "run_bash:2"];

    const handler = new ApiToolCallStreamingResponseHandler({
      turnId: TURN_ID,
      onSegmentEvent: (event) => {
        notifier.notifyAgentSegmentEvent(event.toDict());
      },
      onToolInvocation: (invocation) => {
        notifier.notifyAgentToolExecutionStarted({
          invocation_id: invocation.id,
          tool_name: invocation.name,
          turn_id: TURN_ID,
          arguments: invocation.arguments,
        });
      },
    });

    for (const [index, invocationId] of invocationIds.entries()) {
      handler.feed(new ChunkResponse({
        content: "",
        tool_calls: [{
          index,
          call_id: invocationId,
          name: "run_bash",
          arguments_delta: JSON.stringify({ command: `echo ${index}` }),
        }],
      }));
    }
    handler.finalize();
    await stream.close();

    const events = await eventsPromise;
    const segmentIds = events
      .filter((event) => event.event_type === StreamEventType.SEGMENT_EVENT)
      .map((event) => (event.data as any).segment_id);
    const startedInvocationIds = events
      .filter((event) => event.event_type === StreamEventType.TOOL_EXECUTION_STARTED)
      .map((event) => (event.data as any).invocation_id);

    expect(handler.getAllInvocations().map((invocation) => invocation.id)).toEqual(invocationIds);
    for (const invocationId of invocationIds) {
      expect(segmentIds.filter((id) => id === invocationId)).toHaveLength(3);
    }
    expect(startedInvocationIds).toEqual(invocationIds);
  });
});
