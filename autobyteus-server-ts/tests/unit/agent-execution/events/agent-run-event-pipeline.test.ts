import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunEventPipeline } from "../../../../src/agent-execution/events/agent-run-event-pipeline.js";
import type { AgentRunEventProcessor } from "../../../../src/agent-execution/events/agent-run-event-processor.js";

const event = (eventType: AgentRunEventType, payload: Record<string, unknown> = {}): AgentRunEvent => ({
  eventType,
  runId: "run-pipeline",
  statusHint: null,
  payload,
});

describe("AgentRunEventPipeline", () => {
  it("runs processors in order and lets later processors see earlier derived events", async () => {
    const first: AgentRunEventProcessor = {
      process: vi.fn(() => [event(AgentRunEventType.TOOL_LOG, { log_entry: "derived-1" })]),
    };
    const second: AgentRunEventProcessor = {
      process: vi.fn((input) => {
        const sawFirstDerived = input.sourceEvents.some((row) => row.payload.log_entry === "derived-1");
        return sawFirstDerived
          ? [event(AgentRunEventType.TOOL_LOG, { log_entry: "derived-2" })]
          : [];
      }),
    };

    const pipeline = new AgentRunEventPipeline([first, second]);
    const result = await pipeline.process({
      runContext: { runId: "run-pipeline", config: { workspaceId: null }, runtimeContext: null } as any,
      events: [event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" })],
    });

    expect(result.map((row) => row.payload.log_entry ?? row.eventType)).toEqual([
      AgentRunEventType.TURN_STARTED,
      "derived-1",
      "derived-2",
    ]);
    expect(first.process).toHaveBeenCalledOnce();
    expect(second.process).toHaveBeenCalledOnce();
  });
});
