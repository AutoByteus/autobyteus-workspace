import { describe, expect, it } from "vitest";
import { MemoryViewConverter } from "../../../../../src/api/graphql/converters/memory-view-converter.js";
import type { AgentMemoryView } from "../../../../../src/agent-memory/domain/models.js";

describe("MemoryViewConverter", () => {
  it("maps domain view to graphql view", () => {
    const domain: AgentMemoryView = {
      runId: "agent-1",
      workingContext: [
        {
          role: "user",
          content: "hello",
          reasoning: null,
          toolPayload: null,
          ts: null,
        },
      ],
      episodic: [{ episode: "a" }],
      semantic: [{ fact: "b" }],
      conversation: [
        {
          kind: "message",
          role: "user",
          content: "hello",
          ts: 1,
        },
      ],
      rawTraces: [
        {
          traceType: "user",
          content: "hello",
          toolName: null,
          toolArgs: null,
          toolResult: null,
          toolError: null,
          media: null,
          turnId: "t1",
          seq: 1,
          ts: 1,
        },
      ],
      rawTraceFiles: [
        {
          fileName: "raw_traces.jsonl",
          kind: "active",
          recordCount: 2,
          segmentIndex: null,
          firstTimestamp: null,
          lastTimestamp: null,
        },
      ],
      selectedRawTraceFileName: "raw_traces.jsonl",
    };

    const gql = MemoryViewConverter.toGraphql(domain);
    expect(gql.runId).toBe("agent-1");
    expect(gql.workingContext?.[0]?.role).toBe("user");
    expect(gql.rawTraces?.[0]?.turnId).toBe("t1");
    expect(gql.rawTraceFiles?.[0]?.fileName).toBe("raw_traces.jsonl");
    expect(gql.selectedRawTraceFileName).toBe("raw_traces.jsonl");
  });
});
