import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  AgentMemoryView,
  MemoryConversationEntry,
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

    const entry = new MemoryConversationEntry();
    entry.kind = "message";

    const view = new AgentMemoryView();
    view.agentId = "agent-1";
    view.workingContext = [message];
    view.conversation = [entry];
    view.rawTraces = [trace];

    expect(view.agentId).toBe("agent-1");
    expect(view.workingContext?.[0]?.role).toBe("user");
  });
});
