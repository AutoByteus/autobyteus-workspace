import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  AgentMemoryView,
  MemoryMessage,
  MemoryTraceEvent,
  RawTraceFileSummary,
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

    const file = new RawTraceFileSummary();
    file.fileName = "raw_traces_active.jsonl";
    file.kind = "active";
    file.recordCount = 1;

    const view = new AgentMemoryView();
    view.runId = "agent-1";
    view.workingContext = [message];
    view.rawTraces = [trace];
    view.rawTraceFiles = [file];
    view.selectedRawTraceFileName = "raw_traces_active.jsonl";

    expect(view.runId).toBe("agent-1");
    expect(view.workingContext?.[0]?.role).toBe("user");
    expect(view.rawTraces?.[0]?.toolCallId).toBe("call-1");
    expect(view.rawTraceFiles?.[0]?.recordCount).toBe(1);
    expect(view.selectedRawTraceFileName).toBe("raw_traces_active.jsonl");
  });
});
