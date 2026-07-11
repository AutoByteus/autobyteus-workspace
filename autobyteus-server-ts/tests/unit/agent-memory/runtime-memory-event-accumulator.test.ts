import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { RunMemoryWriter } from "../../../src/agent-memory/store/run-memory-writer.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";

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

const readView = (memoryDir: string, includeArchive = false) =>
  new AgentMemoryService(new MemoryFileStore(path.dirname(memoryDir), { runRootSubdir: "" }))
    .getRunMemoryView(path.basename(memoryDir), {
      includeRawTraces: true,
      includeArchive,
      includeEpisodic: false,
      includeSemantic: false,
    });

const createAccumulator = (
  memoryDir: string,
  writer: RunMemoryWriter = new RunMemoryWriter({ memoryDir }),
) => new RuntimeMemoryEventAccumulator({
  runId: "run-1",
  writer,
  toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
});

describe("RuntimeMemoryEventAccumulator", () => {
  it("persists one trace for adjacent reasoning deltas and a new trace after a tool boundary", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-block:test:1",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "first",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-block:test:1",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "\n\nsecond",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-1",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-block:test:2",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "third",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_COMPLETED, { turnId: "turn-1" }));

    const reasoningTraces = (readView(memoryDir).rawTraces ?? [])
      .filter((trace) => trace.traceType === "reasoning");
    expect(reasoningTraces.map((trace) => trace.content)).toEqual([
      "first\n\nsecond",
      "third",
    ]);
  });

  it("tolerates lifecycle-before-command ordering and flushes text and reasoning on turn completion", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

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

  it("persists open reasoning before a following tool call without duplicating later flushes", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-reason-tool" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-tool",
      turn_id: "turn-reason-tool",
      segment_type: "reasoning",
      delta: "inspect before tool",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-after-reasoning",
      turn_id: "turn-reason-tool",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-tool",
      turn_id: "turn-reason-tool",
      segment_type: "reasoning",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_COMPLETED, { turnId: "turn-reason-tool" }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => [trace.traceType, trace.content, trace.toolCallId])).toEqual([
      ["reasoning", "inspect before tool", null],
      ["tool_call", "", "tool-after-reasoning"],
    ]);
    expect(traces.filter((trace) => trace.traceType === "reasoning")).toHaveLength(1);
  });

  it("persists open reasoning before an inferred tool call from a terminal tool result", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-reason-result" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-result",
      turn_id: "turn-reason-result",
      segment_type: "reasoning",
      delta: "tool result will imply a call",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "inferred-tool-after-reasoning",
      turn_id: "turn-reason-result",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
      result: { stdout: "/tmp" },
    }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => [trace.traceType, trace.content, trace.toolCallId])).toEqual([
      ["reasoning", "tool result will imply a call", null],
      ["tool_call", "", "inferred-tool-after-reasoning"],
      ["tool_result", "", "inferred-tool-after-reasoning"],
    ]);
    expect(traces[2]).toMatchObject({ toolResult: { stdout: "/tmp" }, toolError: null });
    expect(traces[2]?.toolName).toBeNull();
    expect(traces[2]?.toolArgs).toBeNull();
  });

  it("keeps reasoning open across a matching result and flushes one trace at the next tool", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1" }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-1",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "sleep 1" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-block:test:1",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "A",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "tool-1",
      turn_id: "turn-1",
      tool_name: "run_bash",
      result: { stdout: "done" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-block:test:1",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "\n\nB",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-2",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
    }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => [trace.traceType, trace.content, trace.toolCallId])).toEqual([
      ["tool_call", "", "tool-1"],
      ["tool_result", "", "tool-1"],
      ["reasoning", "A\n\nB", null],
      ["tool_call", "", "tool-2"],
    ]);
  });

  it("preserves post-card reasoning when authoritative call arguments arrive only at result", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-card",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "before card",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "search-1",
      turn_id: "turn-1",
      tool_name: "search_web",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-after-card",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "A",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "search-1",
      turn_id: "turn-1",
      tool_name: "search_web",
      arguments: { query: "AutoByteus" },
      result: { query: "AutoByteus", status: "completed" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-after-card",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "\n\nB",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-2",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
    }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => [trace.traceType, trace.content, trace.toolCallId])).toEqual([
      ["reasoning", "before card", null],
      ["tool_call", "", "search-1"],
      ["tool_result", "", "search-1"],
      ["reasoning", "A\n\nB", null],
      ["tool_call", "", "tool-2"],
    ]);
  });

  it.each([
    AgentRunEventType.TOOL_EXECUTION_FAILED,
    AgentRunEventType.TOOL_DENIED,
  ])("keeps reasoning open across matching %s updates", async (terminalEventType) => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    const reasoningPayload = (delta: string) => ({
      id: "reasoning-block:test:1",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta,
    });

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1" }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-1",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "false" },
    }));
    accumulator.recordRunEvent(event(
      AgentRunEventType.SEGMENT_CONTENT,
      reasoningPayload("A"),
    ));
    accumulator.recordRunEvent(event(terminalEventType, {
      invocation_id: "tool-1",
      turn_id: "turn-1",
      tool_name: "run_bash",
      error: "stopped",
      reason: "not approved",
    }));
    accumulator.recordRunEvent(event(
      AgentRunEventType.SEGMENT_CONTENT,
      reasoningPayload("\n\nB"),
    ));
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_COMPLETED, { turnId: "turn-1" }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => trace.traceType)).toEqual([
      "tool_call",
      "tool_result",
      "reasoning",
    ]);
    expect(traces[2]?.content).toBe("A\n\nB");
  });

  it("persists open reasoning before assistant text without requiring turn completion", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-reason-text" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-text",
      turn_id: "turn-reason-text",
      segment_type: "reasoning",
      delta: "think before answer",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "assistant-text-after-reasoning",
      turn_id: "turn-reason-text",
      segment_type: "text",
      delta: "visible answer",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "assistant-text-after-reasoning",
      turn_id: "turn-reason-text",
      segment_type: "text",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-text",
      turn_id: "turn-reason-text",
      segment_type: "reasoning",
    }));

    const view = readView(memoryDir);
    expect(view.rawTraces?.map((trace) => [trace.traceType, trace.content])).toEqual([
      ["reasoning", "think before answer"],
      ["assistant", "visible answer"],
    ]);
    expect(view.workingContext).toEqual([
      expect.objectContaining({
        role: "assistant",
        content: "visible answer",
        reasoning: "think before answer",
      }),
    ]);
  });

  it("persists open reasoning before assistant complete output", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-reason-complete" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-complete",
      turn_id: "turn-reason-complete",
      segment_type: "reasoning",
      delta: "think before final complete",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.ASSISTANT_COMPLETE, {
      turn_id: "turn-reason-complete",
      content: "final complete answer",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "reasoning-before-complete",
      turn_id: "turn-reason-complete",
      segment_type: "reasoning",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_COMPLETED, { turnId: "turn-reason-complete" }));

    const view = readView(memoryDir);
    expect(view.rawTraces?.map((trace) => [trace.traceType, trace.content])).toEqual([
      ["reasoning", "think before final complete"],
      ["assistant", "final complete answer"],
    ]);
    expect(view.rawTraces?.filter((trace) => trace.traceType === "reasoning")).toHaveLength(1);
    expect(view.workingContext).toEqual([
      expect.objectContaining({
        role: "assistant",
        content: "final complete answer",
        reasoning: "think before final complete",
      }),
    ]);
  });


  it("uses an active turn when accepted command notification arrives after lifecycle start", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

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
    const accumulator = createAccumulator(memoryDir);

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
    expect(traces[1]).toMatchObject({ toolCallId: "tool-1", toolResult: { stdout: "/tmp" }, toolError: null });
  });

  it("correlates a late no-turn terminal to its unique durable call before the active turn", async () => {
    const memoryDir = await mkTempDir();
    const first = createAccumulator(memoryDir);
    first.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-old" }));
    first.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "late-call", turn_id: "turn-old", tool_name: "read_file", arguments: { path: "old" },
    }));
    const accumulator = createAccumulator(memoryDir);
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-new" }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "late-call", result: "late result",
    }));

    const result = new RunMemoryFileStore(memoryDir).listRawTracesOrdered()
      .find((trace) => trace.traceType === "tool_result");
    expect(result).toMatchObject({
      turnId: "turn-old", toolCallId: "late-call", toolResult: "late result", toolError: null,
    });
  });

  it("requires an explicit turn for an ambiguous reused call id", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const turnId of ["turn-a", "turn-b"]) {
      accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: turnId }));
      accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
        invocation_id: "reused", turn_id: turnId, tool_name: "run_bash", arguments: { command: turnId },
      }));
    }
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "reused", result: "ambiguous",
    }));
    expect(new RunMemoryFileStore(memoryDir).listRawTracesOrdered()
      .filter((trace) => trace.traceType === "tool_result")).toHaveLength(0);

    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "reused", turn_id: "turn-a", result: "explicit",
    }));
    const results = new RunMemoryFileStore(memoryDir).listRawTracesOrdered()
      .filter((trace) => trace.traceType === "tool_result");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ turnId: "turn-a", toolCallId: "reused", toolResult: "explicit" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("matches multiple turn lifecycles"));
    warn.mockRestore();
  });

  it("waits for terminal data and persists a null-success completed call with physical outcome keys", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-web" }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "web-1", turn_id: "turn-web", tool_name: "search_web",
    }));
    expect(new RunMemoryFileStore(memoryDir).listRawTracesOrdered()).toHaveLength(0);

    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "web-1", turn_id: "turn-web", tool_name: "search_web",
      arguments: { query: "cats", action_type: "search" }, result: null,
    }));

    const dicts = new RunMemoryFileStore(memoryDir).listRawTraceDicts();
    expect(dicts).toHaveLength(2);
    expect(dicts[0]).toMatchObject({
      trace_type: "tool_call", tool_call_id: "web-1", tool_name: "search_web",
      tool_args: { query: "cats", action_type: "search" },
    });
    expect(dicts[1]).toMatchObject({
      trace_type: "tool_result", tool_call_id: "web-1", tool_result: null, tool_error: null,
    });
    expect(dicts[1]).not.toHaveProperty("tool_name");
    expect(dicts[1]).not.toHaveProperty("tool_args");
  });

  it("persists an explicit empty argument object at the early boundary", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-empty" }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "empty-1", turn_id: "turn-empty", tool_name: "no_arg_tool", arguments: {},
    }));

    expect(new RunMemoryFileStore(memoryDir).listRawTraceDicts()).toEqual([
      expect.objectContaining({
        trace_type: "tool_call", tool_call_id: "empty-1", tool_name: "no_arg_tool", tool_args: {},
      }),
    ]);
  });

  it("skips a terminal observation that cannot supply or resolve an authoritative call", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-missing" }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      turn_id: "turn-missing", tool_name: "search_web", arguments: { query: "no id" }, result: null,
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "missing-1", turn_id: "turn-missing", tool_name: "search_web",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "missing-1", turn_id: "turn-missing", tool_name: "search_web", result: null,
    }));

    expect(new RunMemoryFileStore(memoryDir).listRawTracesOrdered()).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("without an invocation id"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("authoritative call arguments were unavailable"));
    warn.mockRestore();
  });

  it("writes minimal failure and denial results without copying terminal arguments", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-errors" }));
    for (const invocationId of ["failed-1", "denied-1"]) {
      accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
        invocation_id: invocationId, turn_id: "turn-errors", tool_name: "run_bash",
        arguments: { command: invocationId },
      }));
    }
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_FAILED, {
      invocation_id: "failed-1", turn_id: "turn-errors", tool_name: "run_bash",
      arguments: { command: "transformed" }, result: { partial: true }, error: "boom",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_DENIED, {
      invocation_id: "denied-1", turn_id: "turn-errors", tool_name: "run_bash",
      arguments: { command: "transformed" }, reason: "not approved",
    }));

    const results = new RunMemoryFileStore(memoryDir).listRawTraceDicts()
      .filter((trace) => trace.trace_type === "tool_result");
    expect(results).toEqual([
      expect.objectContaining({ tool_call_id: "failed-1", tool_result: { partial: true }, tool_error: "boom" }),
      expect.objectContaining({
        tool_call_id: "denied-1",
        tool_result: { status: "denied", reason: "not approved" },
        tool_error: "not approved",
      }),
    ]);
    expect(results.every((trace) => !("tool_name" in trace) && !("tool_args" in trace))).toBe(true);
  });

  it("uses compound identities and makes per-tool plus turn interruption idempotent", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    for (const turnId of ["turn-a", "turn-b"]) {
      accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: turnId }));
      accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
        invocation_id: "same-call", turn_id: turnId, tool_name: "run_bash", arguments: { command: turnId },
      }));
      if (turnId === "turn-a") {
        accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
          invocation_id: "same-call", turn_id: turnId, tool_name: "run_bash", result: "done",
        }));
      } else {
        accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_INTERRUPTED, {
          invocation_id: "same-call", turn_id: turnId, reason: "user stopped",
        }));
        accumulator.recordRunEvent(event(AgentRunEventType.TURN_INTERRUPTED, {
          turn_id: turnId, reason: "user stopped",
        }));
      }
    }

    const traces = new RunMemoryFileStore(memoryDir).listRawTracesOrdered();
    expect(traces).toHaveLength(4);
    expect(traces.map((trace) => [trace.turnId, trace.toolCallId])).toEqual([
      ["turn-a", "same-call"], ["turn-a", "same-call"],
      ["turn-b", "same-call"], ["turn-b", "same-call"],
    ]);
    expect(traces[3]).toMatchObject({ toolResult: null, toolError: "user stopped" });
  });

  it("hydrates physical calls and results across reconstruction without duplicating either", async () => {
    const memoryDir = await mkTempDir();
    const first = createAccumulator(memoryDir);
    first.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-complete" }));
    first.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "done-1", turn_id: "turn-complete", tool_name: "read_file",
      arguments: { path: "a" }, result: "a",
    }));

    const reconstructed = createAccumulator(memoryDir);
    reconstructed.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "done-1", turn_id: "turn-complete", tool_name: "read_file",
      arguments: { path: "a" }, result: "a",
    }));
    reconstructed.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "lost-1", turn_id: "turn-lost", tool_name: "read_file", arguments: { path: "lost" },
    }));
    const store = new RunMemoryFileStore(memoryDir);
    const lostCall = store.listRawTracesOrdered().find((trace) => trace.toolCallId === "lost-1");
    expect(lostCall).toBeDefined();
    store.pruneRawTracesById([lostCall!.id]);
    const afterLoss = createAccumulator(memoryDir);
    afterLoss.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "lost-1", turn_id: "turn-lost", tool_name: "read_file", result: "lost",
    }));

    const traces = new RunMemoryFileStore(memoryDir).listRawTraceCorpusOrdered();
    expect(traces.map((trace) => trace.traceType)).toEqual([
      "tool_call", "tool_result", "tool_call", "tool_result",
    ]);
    expect(traces[3]).toMatchObject({ toolCallId: "lost-1", toolResult: "lost", toolError: null });
  });

  it("records tool traces once from lifecycle events when matching tool segments are present", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-tool-segment" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_START, {
      id: "tool-claude-1",
      turn_id: "turn-tool-segment",
      segment_type: "tool_call",
      metadata: {
        tool_name: "Bash",
        arguments: { command: "pwd" },
      },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-claude-1",
      turn_id: "turn-tool-segment",
      tool_name: "Bash",
      arguments: { command: "pwd" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "tool-claude-1",
      turn_id: "turn-tool-segment",
      segment_type: "tool_call",
      metadata: {
        tool_name: "Bash",
        arguments: { command: "pwd" },
        result: "workspace\n",
      },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "tool-claude-1",
      turn_id: "turn-tool-segment",
      tool_name: "Bash",
      arguments: { command: "pwd" },
      result: "workspace\n",
    }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => trace.traceType)).toEqual(["tool_call", "tool_result"]);
    expect(traces[0]).toMatchObject({
      sourceEvent: AgentRunEventType.TOOL_EXECUTION_STARTED,
      toolCallId: "tool-claude-1",
      toolName: "Bash",
      toolArgs: { command: "pwd" },
    });
    expect(traces[1]).toMatchObject({
      sourceEvent: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      toolResult: "workspace\n",
      toolError: null,
    });
  });

  it("preserves assistant-tool-assistant raw trace order from distinct text segment ids", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-text-tool-text" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "turn-text-tool-text:claude-text:msg-pre:0",
      turnId: "turn-text-tool-text",
      segment_type: "text",
      delta: "Before tool.",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "turn-text-tool-text:claude-text:msg-pre:0",
      turnId: "turn-text-tool-text",
      segment_type: "text",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-bash-text-order",
      turn_id: "turn-text-tool-text",
      tool_name: "Bash",
      arguments: { command: "pwd" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "tool-bash-text-order",
      turn_id: "turn-text-tool-text",
      tool_name: "Bash",
      arguments: { command: "pwd" },
      result: "/tmp/project",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "turn-text-tool-text:claude-text:msg-post:0",
      turnId: "turn-text-tool-text",
      segment_type: "text",
      delta: "After tool.",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "turn-text-tool-text:claude-text:msg-post:0",
      turnId: "turn-text-tool-text",
      segment_type: "text",
    }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => trace.traceType)).toEqual([
      "assistant",
      "tool_call",
      "tool_result",
      "assistant",
    ]);
    expect(traces[0]).toMatchObject({ content: "Before tool." });
    expect(traces[1]).toMatchObject({ toolName: "Bash", toolCallId: "tool-bash-text-order" });
    expect(traces[2]).toMatchObject({ toolName: null, toolResult: "/tmp/project", toolError: null });
    expect(traces[3]).toMatchObject({ content: "After tool." });
  });

  it("creates deterministic fallback turns when no turn id is active", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

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
    const accumulator = createAccumulator(memoryDir);

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
    expect(new RunMemoryFileStore(memoryDir).getRawTraceArchiveRevisionInfo()).toBeNull();
  });

  it("writes provider compaction markers and rotates settled active traces into segmented archives", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-compact" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-before-boundary",
      segment_type: "text",
      delta: "before boundary",
      timestamp: 1,
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "text-before-boundary",
      segment_type: "text",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.COMPACTION_STATUS, {
      kind: "provider_compaction_boundary",
      runtime_kind: "CODEX",
      provider: "codex",
      source_surface: "codex.thread_compacted",
      boundary_key: "codex:thread-1:compaction-1",
      provider_thread_id: "thread-1",
      provider_event_id: "compaction-1",
      provider_timestamp: 2,
      turn_id: "turn-compact",
      trigger: "auto",
      status: "compacted",
      pre_tokens: 120000,
      rotation_eligible: true,
      semantic_compaction: false,
    }));

    const store = new RunMemoryFileStore(memoryDir);
    const active = store.listRawTracesOrdered();
    expect(active.map((trace) => trace.traceType)).toEqual(["provider_compaction_boundary"]);
    expect(active[0]).toMatchObject({
      content: "Provider-owned context compaction boundary: codex/codex.thread_compacted",
      correlationId: "codex:thread-1:compaction-1",
    });

    const manifest = store.readRawTraceArchiveManifest();
    expect(manifest.segments).toHaveLength(1);
    expect(manifest.segments[0]).toMatchObject({
      boundary_type: "provider_compaction_boundary",
      boundary_key: "codex:thread-1:compaction-1",
      status: "complete",
      record_count: 1,
    });

    const fullView = readView(memoryDir, true);
    expect(fullView.rawTraces?.map((trace) => trace.traceType)).toEqual([
      "assistant",
      "provider_compaction_boundary",
    ]);
    expect(fullView.workingContext).toEqual([
      expect.objectContaining({ role: "assistant", content: "before boundary" }),
    ]);
  });

  it("dedupes replayed provider boundaries without dropping post-boundary active records", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    const boundaryPayload = {
      kind: "provider_compaction_boundary",
      runtime_kind: "CODEX",
      provider: "codex",
      source_surface: "codex.thread_compacted",
      boundary_key: "codex:thread-1:compaction-1",
      provider_thread_id: "thread-1",
      provider_event_id: "compaction-1",
      provider_timestamp: 2,
      turn_id: "turn-compact",
      rotation_eligible: true,
      semantic_compaction: false,
    };

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-compact" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-before-boundary",
      segment_type: "text",
      delta: "before boundary",
      timestamp: 1,
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "text-before-boundary",
      segment_type: "text",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.COMPACTION_STATUS, boundaryPayload));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-after-boundary",
      segment_type: "text",
      delta: "after boundary",
      timestamp: 3,
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "text-after-boundary",
      segment_type: "text",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.COMPACTION_STATUS, boundaryPayload));

    const store = new RunMemoryFileStore(memoryDir);
    expect(store.readRawTraceArchiveManifest().segments).toHaveLength(1);
    expect(store.listRawTracesOrdered().map((trace) => [trace.traceType, trace.content])).toEqual([
      ["provider_compaction_boundary", "Provider-owned context compaction boundary: codex/codex.thread_compacted"],
      ["assistant", "after boundary"],
    ]);

    const fullView = readView(memoryDir, true);
    expect(fullView.rawTraces?.map((trace) => [trace.traceType, trace.content])).toEqual([
      ["assistant", "before boundary"],
      ["provider_compaction_boundary", "Provider-owned context compaction boundary: codex/codex.thread_compacted"],
      ["assistant", "after boundary"],
    ]);
  });

  it("retries rotation from an existing provider boundary marker when no complete segment exists", async () => {
    const memoryDir = await mkTempDir();
    const boundaryKey = "codex:thread-1:marker-only";
    const initialWriter = new RunMemoryWriter({ memoryDir });
    const accumulator = createAccumulator(memoryDir, initialWriter);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-compact" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-before-marker",
      segment_type: "text",
      delta: "before marker",
      timestamp: 1,
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "text-before-marker",
      segment_type: "text",
    }));
    initialWriter.appendRawTrace({
      traceType: "provider_compaction_boundary",
      turnId: "turn-compact",
      content: "Provider-owned context compaction boundary: codex/codex.thread_compacted",
      sourceEvent: AgentRunEventType.COMPACTION_STATUS,
      ts: 2,
      correlationId: boundaryKey,
    });

    const replayAccumulator = createAccumulator(memoryDir);
    replayAccumulator.recordRunEvent(event(AgentRunEventType.COMPACTION_STATUS, {
      kind: "provider_compaction_boundary",
      runtime_kind: "CODEX",
      provider: "codex",
      source_surface: "codex.thread_compacted",
      boundary_key: boundaryKey,
      provider_thread_id: "thread-1",
      provider_event_id: "marker-only",
      provider_timestamp: 2,
      turn_id: "turn-compact",
      rotation_eligible: true,
      semantic_compaction: false,
    }));

    const store = new RunMemoryFileStore(memoryDir);
    expect(store.listRawTracesOrdered().map((trace) => [trace.traceType, trace.content])).toEqual([
      ["provider_compaction_boundary", "Provider-owned context compaction boundary: codex/codex.thread_compacted"],
    ]);
    expect(store.readRawTraceArchiveManifest().segments).toHaveLength(1);
    expect(store.readRawTraceArchiveManifest().segments[0]).toMatchObject({
      boundary_key: boundaryKey,
      status: "complete",
      record_count: 1,
    });

    const fullView = readView(memoryDir, true);
    expect(fullView.rawTraces?.map((trace) => [trace.traceType, trace.content])).toEqual([
      ["assistant", "before marker"],
      ["provider_compaction_boundary", "Provider-owned context compaction boundary: codex/codex.thread_compacted"],
    ]);
    expect(fullView.rawTraces?.filter((trace) => trace.traceType === "provider_compaction_boundary")).toHaveLength(1);
  });
});
