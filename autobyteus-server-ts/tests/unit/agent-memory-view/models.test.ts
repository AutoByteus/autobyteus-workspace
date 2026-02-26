import { describe, expect, it } from "vitest";
import type {
  AgentMemoryView,
  MemorySnapshotPage,
  MemorySnapshotSummary,
} from "../../../src/agent-memory-view/domain/models.js";

describe("agent-memory-view models", () => {
  it("allows construction of memory snapshot shapes", () => {
    const summary: MemorySnapshotSummary = {
      agentId: "agent-1",
      lastUpdatedAt: null,
      hasWorkingContext: true,
      hasEpisodic: false,
      hasSemantic: true,
      hasRawTraces: false,
      hasRawArchive: false,
    };

    const page: MemorySnapshotPage = {
      entries: [summary],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    };

    expect(page.entries[0]?.agentId).toBe("agent-1");
    expect(page.total).toBe(1);
  });

  it("allows construction of agent memory view shapes", () => {
    const view: AgentMemoryView = {
      agentId: "agent-1",
      workingContext: [
        {
          role: "user",
          content: "hello",
          reasoning: null,
          toolPayload: null,
          ts: null,
        },
      ],
      episodic: [{ summary: "episode" }],
      semantic: [{ fact: "fact" }],
      conversation: [{ kind: "message", role: "user", content: "hello", ts: 1 }],
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
    };

    expect(view.agentId).toBe("agent-1");
    expect(view.workingContext?.length).toBe(1);
  });
});
