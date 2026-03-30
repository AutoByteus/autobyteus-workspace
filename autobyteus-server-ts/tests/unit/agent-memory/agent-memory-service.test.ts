import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8");
};

const writeJsonl = (filePath: string, payloads: unknown[]) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, payloads.map((p) => JSON.stringify(p)).join("\n"), "utf-8");
};

describe("AgentMemoryService", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("returns working context, episodic, semantic, and conversation", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "agent-123";
    const agentDir = path.join(tempDir, "agents", runId);

    writeJson(path.join(agentDir, "working_context_snapshot.json"), {
      messages: [
        {
          role: "user",
          content: "hello",
          reasoning_content: "why",
          tool_payload: { value: 1 },
        },
      ],
    });
    writeJsonl(path.join(agentDir, "episodic.jsonl"), [{ episode: "a" }]);
    writeJsonl(path.join(agentDir, "semantic.jsonl"), [{ fact: "b" }]);
    writeJsonl(path.join(agentDir, "raw_traces.jsonl"), [
      { trace_type: "user", content: "hello", ts: 1, turn_id: "t1", seq: 1 },
      {
        trace_type: "tool_call",
        tool_call_id: "1",
        tool_name: "search",
        tool_args: { q: "x" },
        ts: 2,
        turn_id: "t1",
        seq: 2,
      },
      {
        trace_type: "tool_result",
        tool_call_id: "1",
        tool_result: { ok: true },
        ts: 3,
        turn_id: "t1",
        seq: 3,
      },
    ]);

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeWorkingContext: true,
      includeEpisodic: true,
      includeSemantic: true,
      includeConversation: true,
      includeRawTraces: false,
    });

    expect(view.workingContext?.[0]?.role).toBe("user");
    expect(view.episodic?.[0]?.episode).toBe("a");
    expect(view.semantic?.[0]?.fact).toBe("b");
    expect(view.conversation?.length).toBe(2);
    expect(view.rawTraces).toBeNull();
  });

  it("applies raw trace and conversation limits", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "agent-456";
    const agentDir = path.join(tempDir, "agents", runId);

    writeJsonl(path.join(agentDir, "raw_traces.jsonl"), [
      { trace_type: "user", content: "one", ts: 1, turn_id: "t1", seq: 1 },
      { trace_type: "assistant", content: "two", ts: 2, turn_id: "t1", seq: 2 },
    ]);

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeConversation: true,
      includeRawTraces: true,
      rawTraceLimit: 1,
      conversationLimit: 1,
    });

    expect(view.rawTraces?.length).toBe(1);
    expect(view.conversation?.length).toBe(1);
    expect(view.rawTraces?.[0]?.content).toBe("two");
  });

  it("respects include flags", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-service-"));
    const runId = "agent-789";
    const agentDir = path.join(tempDir, "agents", runId);

    writeJsonl(path.join(agentDir, "raw_traces.jsonl"), [
      { trace_type: "user", content: "hello", ts: 1, turn_id: "t1", seq: 1 },
    ]);

    const service = new AgentMemoryService(new MemoryFileStore(tempDir));
    const view = service.getRunMemoryView(runId, {
      includeWorkingContext: false,
      includeEpisodic: false,
      includeSemantic: false,
      includeConversation: false,
      includeRawTraces: true,
    });

    expect(view.workingContext).toBeNull();
    expect(view.episodic).toBeNull();
    expect(view.semantic).toBeNull();
    expect(view.conversation).toBeNull();
    expect(view.rawTraces?.length).toBe(1);
  });
});
