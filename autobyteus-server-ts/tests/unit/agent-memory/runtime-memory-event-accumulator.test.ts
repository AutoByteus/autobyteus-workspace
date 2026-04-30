import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { RunMemoryWriter } from "../../../src/agent-memory/store/run-memory-writer.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-memory-accumulator-"));
  tempDirs.add(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent => ({
  eventType,
  runId: "run-1",
  payload,
  statusHint: null,
});

const readView = (memoryDir: string) =>
  new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
    .getRunMemoryView(path.basename(memoryDir), {
      includeRawTraces: true,
      includeEpisodic: false,
      includeSemantic: false,
    });

describe("RuntimeMemoryEventAccumulator", () => {
  it("tolerates lifecycle-before-command ordering and flushes text and reasoning on turn completion", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId: "run-1",
      writer: new RunMemoryWriter({ memoryDir }),
    });

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-1",
      segment_type: "reasoning",
      delta: "because ",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-1",
      segment_type: "text",
      delta: "hello",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_COMPLETED, { turnId: "turn-1" }));

    const view = readView(memoryDir);
    expect(view.rawTraces?.map((trace) => [trace.traceType, trace.content, trace.turnId])).toEqual([
      ["reasoning", "because ", "turn-1"],
      ["assistant", "hello", "turn-1"],
    ]);
    expect(view.workingContext).toEqual([
      expect.objectContaining({ role: "assistant", content: "hello", reasoning: "because " }),
    ]);
  });


  it("uses an active turn when accepted command notification arrives after lifecycle start", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId: "run-1",
      writer: new RunMemoryWriter({ memoryDir }),
    });

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-claude" }));
    accumulator.recordAcceptedUserMessage({
      runId: "run-1",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      config: new AgentRunConfig({
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "claude",
        autoExecuteTools: false,
        memoryDir,
        skillAccessMode: SkillAccessMode.NONE,
      }),
      platformAgentRunId: "session-1",
      message: new AgentInputUserMessage("hello after lifecycle"),
      result: { accepted: true, turnId: null },
      acceptedAt: new Date(1000),
    });

    expect(readView(memoryDir).rawTraces?.[0]).toMatchObject({
      traceType: "user",
      turnId: "turn-claude",
      content: "hello after lifecycle",
    });
  });

  it("uses active-turn fallback for tool events without turn ids and de-duplicates calls", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId: "run-1",
      writer: new RunMemoryWriter({ memoryDir }),
    });

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-2" }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_APPROVAL_REQUESTED, {
      invocation_id: "tool-1",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-1",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "tool-1",
      tool_name: "run_bash",
      result: { stdout: "/tmp" },
    }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => trace.traceType)).toEqual(["tool_call", "tool_result"]);
    expect(traces.every((trace) => trace.turnId === "turn-2")).toBe(true);
    expect(traces[0]).toMatchObject({ toolCallId: "tool-1", toolName: "run_bash" });
    expect(traces[1]).toMatchObject({ toolCallId: "tool-1", toolResult: { stdout: "/tmp" } });
  });

  it("creates deterministic fallback turns when no turn id is active", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId: "run-1",
      writer: new RunMemoryWriter({ memoryDir }),
    });

    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-1",
      segment_type: "text",
      delta: "orphan text",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, { id: "text-1" }));

    expect(readView(memoryDir).rawTraces?.[0]).toMatchObject({
      traceType: "assistant",
      turnId: "fallback-turn-1",
      content: "orphan text",
    });
  });

  it("ignores provider compaction/status payloads without local raw-trace pruning", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId: "run-1",
      writer: new RunMemoryWriter({ memoryDir }),
    });

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-compact" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-1",
      segment_type: "text",
      delta: "durable text",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, { id: "text-1" }));
    accumulator.recordRunEvent(event(AgentRunEventType.COMPACTION_STATUS, {
      status: "compacting",
      compact_boundary: "provider-internal",
      event_name: "thread/compacted",
      response_item: { type: "compaction", encrypted_content: "opaque-provider-state" },
      model_auto_compact_token_limit: 120_000,
      token_usage: { input_tokens: 1000 },
      candidate_trace_ids: ["rt-not-local"],
    }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces).toHaveLength(1);
    expect(traces[0]).toMatchObject({ traceType: "assistant", content: "durable text" });
    await expect(fs.access(path.join(memoryDir, RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME))).rejects.toThrow();
  });
});
