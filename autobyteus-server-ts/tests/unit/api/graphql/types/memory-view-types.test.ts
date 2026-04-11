import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  AgentMemoryView,
  MemoryMessage,
  MemoryTraceEvent,
} from "../../../../../src/api/graphql/types/memory-view.js";

describe("memory view graphql types", () => {
  it("supports assigning fields", () => {
    const message = new MemoryMessage();
    message.role = "user";
    message.content = "hello";

    const trace = new MemoryTraceEvent();
    trace.traceType = "user";
    trace.turnId = "t1";
    trace.seq = 1;
    trace.ts = 1;
    trace.toolCallId = "call-1";

    const view = new AgentMemoryView();
    view.runId = "agent-1";
    view.workingContext = [message];
    view.rawTraces = [trace];

    expect(view.runId).toBe("agent-1");
    expect(view.workingContext?.[0]?.role).toBe("user");
    expect(view.rawTraces?.[0]?.toolCallId).toBe("call-1");
  });
});
