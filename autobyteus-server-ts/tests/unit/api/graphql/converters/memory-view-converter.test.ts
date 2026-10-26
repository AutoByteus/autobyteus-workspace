import { describe, expect, it } from "vitest";
import { MemoryViewConverter } from "../../../../../src/api/graphql/converters/memory-view-converter.js";
import type { AgentMemoryView } from "../../../../../src/agent-memory/domain/models.js";

describe("MemoryViewConverter", () => {
  it("maps domain view to graphql view", () => {
    const domain: AgentMemoryView = {
      runId: "agent-1",
      rawTraces: [
        {
          scope: "turn",
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
        {
          scope: "run",
          id: "raw-system-id",
          traceType: "system_instruction",
          sourceEvent: "SYSTEM_INSTRUCTIONS_SUPPLIED",
          content: " exact prompt ",
          turnId: null,
          seq: null,
          ts: 2,
        },
      ],
      rawTraceFiles: [
        {
          fileName: "raw_traces_active.jsonl",
          kind: "active",
          recordCount: 2,
          segmentIndex: null,
          firstTimestamp: null,
          lastTimestamp: null,
        },
      ],
      selectedRawTraceFileName: "raw_traces_active.jsonl",
    };

    const gql = MemoryViewConverter.toGraphql(domain);
    expect(gql.runId).toBe("agent-1");
    expect(gql.rawTraces?.[0]?.turnId).toBe("t1");
    expect(gql.rawTraces?.[1]).toEqual(expect.objectContaining({
      scope: "run",
      id: "raw-system-id",
      turnId: null,
      seq: null,
      content: " exact prompt ",
    }));
    expect(gql.rawTraceFiles?.[0]?.fileName).toBe("raw_traces_active.jsonl");
    expect(gql.selectedRawTraceFileName).toBe("raw_traces_active.jsonl");
  });
});
