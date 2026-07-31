import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { CodexThreadEventConverter } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";

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
  writer: ExternalRuntimeMemoryWriter = new ExternalRuntimeMemoryWriter({ memoryDir }),
) => new RuntimeMemoryEventAccumulator({
  runId: "run-1",
  writer,
  toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
});

describe("RuntimeMemoryEventAccumulator", () => {
  it("persists converter-owned reasoning closure exactly once before the next tool", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    const converter = new CodexThreadEventConverter("run-1");
    const convertAndRecord = (method: string, params: Record<string, unknown>) => {
      const events = converter.convert({ method, params });
      events.forEach((runEvent) => accumulator.recordRunEvent(runEvent));
      return events;
    };

    convertAndRecord(CodexThreadEventName.TURN_STARTED, { turnId: "turn-1" });
    convertAndRecord(CodexThreadEventName.ITEM_STARTED, {
      turnId: "turn-1",
      item: { type: "commandExecution", id: "tool-1", command: "sleep 1" },
    });
    convertAndRecord(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: "turn-1",
      item: { type: "reasoning", id: "reason-a", summary: [{ text: "A" }] },
    });
    convertAndRecord(CodexThreadEventName.ITEM_COMPLETED, {
      turnId: "turn-1",
      item: { type: "commandExecution", id: "tool-1", command: "sleep 1", status: "completed" },
    });
    convertAndRecord(CodexThreadEventName.ITEM_REASONING_COMPLETED, {
      turnId: "turn-1",
      item: { type: "reasoning", id: "reason-b", summary: [{ text: "B" }] },
    });
    const nextToolEvents = convertAndRecord(CodexThreadEventName.ITEM_STARTED, {
      turnId: "turn-1",
      item: { type: "commandExecution", id: "tool-2", command: "pwd" },
    });
    const turnEvents = convertAndRecord(CodexThreadEventName.TURN_COMPLETED, {
      turnId: "turn-1",
    });

    expect(nextToolEvents.map((runEvent) => runEvent.eventType)).toEqual([
      AgentRunEventType.SEGMENT_END,
      AgentRunEventType.TOOL_EXECUTION_STARTED,
    ]);
    expect(turnEvents.filter((runEvent) => runEvent.eventType === AgentRunEventType.SEGMENT_END))
      .toEqual([]);
    const view = readView(memoryDir);
    expect(view.rawTraces?.map((trace) => [trace.traceType, trace.content, trace.toolCallId]))
      .toEqual([
        ["tool_call", "", "tool-1"],
        ["tool_result", "", "tool-1"],
        ["reasoning", "A\n\nB", null],
        ["tool_call", "", "tool-2"],
      ]);
    expect(view.rawTraces?.filter((trace) => trace.traceType === "reasoning")).toHaveLength(1);
    expect(view.workingContext).toBeNull();
  });

  it("projects adjacent missing-turn reasoning content and end onto one fallback turn", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    const converter = new CodexThreadEventConverter("run-1");

    const events = converter.convert({
      method: CodexThreadEventName.ITEM_REASONING_COMPLETED,
      params: {
        item: { type: "reasoning", id: "reason-orphan", summary: [{ text: "orphan reasoning" }] },
      },
    });
    events.forEach((runEvent) => accumulator.recordRunEvent(runEvent));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "text-after-orphan-reasoning",
      segment_type: "text",
      delta: "fallback answer",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_END, {
      id: "text-after-orphan-reasoning",
      segment_type: "text",
    }));

    expect(events.map((runEvent) => runEvent.eventType)).toEqual([
      AgentRunEventType.SEGMENT_CONTENT,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(events.map((runEvent) => runEvent.payload.turn_id)).toEqual([undefined, null]);
    const view = readView(memoryDir);
    expect(view.rawTraces).toEqual([
      expect.objectContaining({ traceType: "reasoning", turnId: "fallback-turn-1", content: "orphan reasoning" }),
      expect.objectContaining({ traceType: "assistant", turnId: "fallback-turn-1", content: "fallback answer" }),
    ]);
    expect(view.workingContext).toBeNull();
  });

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
    expect(view.workingContext).toBeNull();
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
    expect(traces[2]).toMatchObject({
      toolName: "run_bash",
      toolResult: { stdout: "/tmp" },
      toolError: null,
    });
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

  it("keeps the first boundary for an unseen insufficient terminal when readiness arrives later", async () => {
    const memoryDir = await mkTempDir();
    const accumulator = createAccumulator(memoryDir);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    accumulator.recordRunEvent(event(AgentRunEventType.TURN_STARTED, { turnId: "turn-1" }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-before-terminal-card",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "A",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "search-result-first",
      turn_id: "turn-1",
      tool_name: "search_web",
      result: null,
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.SEGMENT_CONTENT, {
      id: "reasoning-after-terminal-card",
      turn_id: "turn-1",
      segment_type: "reasoning",
      delta: "B",
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "search-result-first",
      turn_id: "turn-1",
      arguments: { query: "AutoByteus" },
      result: { query: "AutoByteus", status: "completed" },
    }));
    accumulator.recordRunEvent(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "tool-2",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
    }));

    const traces = readView(memoryDir).rawTraces ?? [];
    expect(traces.map((trace) => [trace.traceType, trace.content, trace.toolCallId])).toEqual([
      ["reasoning", "A", null],
      ["tool_call", "", "search-result-first"],
      ["tool_result", "", "search-result-first"],
      ["reasoning", "B", null],
      ["tool_call", "", "tool-2"],
    ]);
    warn.mockRestore();
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
    expect(view.workingContext).toBeNull();
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
    expect(view.workingContext).toBeNull();
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
    expect(traces[2]).toMatchObject({ toolName: "Bash", toolResult: "/tmp/project", toolError: null });
    expect(traces[2]?.toolArgs).toBeNull();
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
    expect(fullView.workingContext).toBeNull();
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
    const initialWriter = new ExternalRuntimeMemoryWriter({ memoryDir });
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
