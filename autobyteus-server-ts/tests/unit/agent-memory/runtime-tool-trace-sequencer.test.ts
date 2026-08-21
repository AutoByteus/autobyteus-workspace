import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeToolTraceSequencer } from "../../../src/agent-memory/services/runtime-tool-trace-sequencer.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-tool-trace-sequencer-"));
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

const createSequencer = (
  memoryDir: string,
  flushReasoningBoundary = vi.fn<(turnId: string, sourceEvent: string) => void>(),
) => {
  const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
  return {
    flushReasoningBoundary,
    sequencer: new RuntimeToolTraceSequencer({
      writer,
      toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
      flushReasoningBoundary,
    }),
  };
};

const readTraces = (memoryDir: string) => new RunMemoryFileStore(memoryDir).listTurnRawTracesOrdered();
const readTraceDicts = (memoryDir: string) => new RunMemoryFileStore(memoryDir).listRawTraceDicts();

describe("RuntimeToolTraceSequencer", () => {
  it("observes an unseen insufficient terminal before readiness and never relocates its boundary", async () => {
    const memoryDir = await mkTempDir();
    const { sequencer, flushReasoningBoundary } = createSequencer(memoryDir);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "search-1",
      turn_id: "turn-1",
      tool_name: "search_web",
      result: null,
    }), null)).toEqual({ resolvedTurnId: "turn-1" });
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(1);
    expect(flushReasoningBoundary).toHaveBeenCalledWith(
      "turn-1",
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    );
    expect(readTraces(memoryDir)).toHaveLength(0);

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "search-1",
      turn_id: "turn-1",
      result: null,
    }), "turn-1");
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(1);
    expect(readTraces(memoryDir)).toHaveLength(0);

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "search-1",
      turn_id: "turn-1",
      arguments: { query: "AutoByteus" },
      result: { query: "AutoByteus", status: "completed" },
    }), "turn-1");
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(1);
    expect(readTraces(memoryDir).map((trace) => trace.traceType)).toEqual([
      "tool_call",
      "tool_result",
    ]);
    expect(readTraces(memoryDir)[0]).toMatchObject({
      toolCallId: "search-1",
      toolName: "search_web",
      toolArgs: { query: "AutoByteus" },
    });

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "search-1",
      turn_id: "turn-1",
      arguments: { query: "AutoByteus" },
      result: { query: "AutoByteus", status: "completed" },
    }), "turn-1");
    expect(readTraces(memoryDir)).toHaveLength(2);
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("treats absent arguments as deferred and explicit empty arguments as ready", async () => {
    const memoryDir = await mkTempDir();
    const { sequencer, flushReasoningBoundary } = createSequencer(memoryDir);

    sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "deferred-1",
      turn_id: "turn-1",
      tool_name: "search_web",
    }), null);
    expect(readTraces(memoryDir)).toHaveLength(0);

    sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "empty-1",
      turn_id: "turn-1",
      tool_name: "no_arg_tool",
      arguments: {},
    }), "turn-1");
    expect(readTraceDicts(memoryDir)).toEqual([
      expect.objectContaining({
        trace_type: "tool_call",
        tool_call_id: "empty-1",
        tool_name: "no_arg_tool",
        tool_args: {},
      }),
    ]);
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(2);
  });

  it("ignores an identity-only call observation and places the boundary at the later named card", async () => {
    const memoryDir = await mkTempDir();
    const { sequencer, flushReasoningBoundary } = createSequencer(memoryDir);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "named-later",
      turn_id: "turn-1",
      arguments: { command: "pwd" },
    }), null)).toEqual({ resolvedTurnId: "turn-1" });
    expect(flushReasoningBoundary).not.toHaveBeenCalled();
    expect(readTraces(memoryDir)).toHaveLength(0);

    sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "named-later",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
    }), "turn-1");
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(1);
    expect(readTraces(memoryDir).map((trace) => trace.traceType)).toEqual(["tool_call"]);

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "named-later",
      turn_id: "turn-1",
      result: { stdout: "/tmp" },
    }), "turn-1");
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(1);
    expect(readTraces(memoryDir).map((trace) => trace.traceType)).toEqual([
      "tool_call",
      "tool_result",
    ]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("without a usable tool name"));
    warn.mockRestore();
  });

  it("leaves malformed terminals without observation, boundary, state, or writes", async () => {
    const memoryDir = await mkTempDir();
    const { sequencer, flushReasoningBoundary } = createSequencer(memoryDir);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      turn_id: "turn-1",
      tool_name: "search_web",
      arguments: { query: "missing id" },
      result: null,
    }), "turn-1")).toEqual({ resolvedTurnId: null });
    expect(sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "missing-name",
      turn_id: "turn-1",
      arguments: { query: "missing name" },
      result: null,
    }), "turn-1")).toEqual({ resolvedTurnId: "turn-1" });
    expect(flushReasoningBoundary).not.toHaveBeenCalled();
    expect(readTraces(memoryDir)).toHaveLength(0);

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "missing-name",
      turn_id: "turn-1",
      tool_name: "search_web",
      arguments: { query: "now complete" },
      result: null,
    }), "turn-1");
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(1);
    expect(readTraces(memoryDir)).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("without an invocation id"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("without a usable tool name"));
    warn.mockRestore();
  });

  it("flushes an unseen ready result-first terminal before strict call and argument-free result writes", async () => {
    const memoryDir = await mkTempDir();
    const { sequencer, flushReasoningBoundary } = createSequencer(memoryDir);

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "result-first",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
      result: { stdout: "/tmp" },
    }), null);

    expect(flushReasoningBoundary).toHaveBeenCalledTimes(1);
    const dicts = readTraceDicts(memoryDir);
    expect(dicts).toHaveLength(2);
    expect(dicts[0]).toMatchObject({
      trace_type: "tool_call",
      tool_call_id: "result-first",
      tool_name: "run_bash",
      tool_args: { command: "pwd" },
    });
    expect(dicts[1]).toMatchObject({
      trace_type: "tool_result",
      tool_call_id: "result-first",
      tool_name: "run_bash",
      tool_result: { stdout: "/tmp" },
      tool_error: null,
    });
    expect(dicts[1]).not.toHaveProperty("tool_args");
  });

  it("writes minimal failure and denial rows without moving an existing-card boundary", async () => {
    const memoryDir = await mkTempDir();
    const { sequencer, flushReasoningBoundary } = createSequencer(memoryDir);
    for (const invocationId of ["failed-1", "denied-1"]) {
      sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
        invocation_id: invocationId,
        turn_id: "turn-errors",
        tool_name: "run_bash",
        arguments: { command: invocationId },
      }), "turn-errors");
    }

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_FAILED, {
      invocation_id: "failed-1",
      turn_id: "turn-errors",
      tool_name: "run_bash",
      arguments: { command: "transformed" },
      result: { partial: true },
      error: "boom",
    }), "turn-errors");
    sequencer.recordTerminal(event(AgentRunEventType.TOOL_DENIED, {
      invocation_id: "denied-1",
      turn_id: "turn-errors",
      reason: "not approved",
    }), "turn-errors");

    expect(flushReasoningBoundary).toHaveBeenCalledTimes(2);
    const results = readTraceDicts(memoryDir).filter((trace) => trace.trace_type === "tool_result");
    expect(results).toEqual([
      expect.objectContaining({
        tool_call_id: "failed-1",
        tool_name: "run_bash",
        tool_result: { partial: true },
        tool_error: "boom",
      }),
      expect.objectContaining({
        tool_call_id: "denied-1",
        tool_name: "run_bash",
        tool_result: { status: "denied", reason: "not approved" },
        tool_error: "not approved",
      }),
    ]);
    expect(results.every((trace) => !("tool_args" in trace))).toBe(true);
  });

  it("rejects a conflicting terminal name without completing the lifecycle", async () => {
    const memoryDir = await mkTempDir();
    const { sequencer, flushReasoningBoundary } = createSequencer(memoryDir);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "mismatch-1",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "pwd" },
    }), "turn-1");

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "mismatch-1",
      turn_id: "turn-1",
      tool_name: "read_file",
      result: "wrong",
    }), "turn-1");

    expect(readTraces(memoryDir).map((trace) => trace.traceType)).toEqual(["tool_call"]);
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[RuntimeToolTraceSequencer] skipped terminal tool event 'mismatch-1' in turn 'turn-1' because observed tool name 'read_file' does not match expected tool name 'run_bash'.",
    );

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "mismatch-1",
      turn_id: "turn-1",
      result: "correct",
    }), "turn-1");
    expect(readTraces(memoryDir)).toEqual([
      expect.objectContaining({ traceType: "tool_call", toolName: "run_bash" }),
      expect.objectContaining({
        traceType: "tool_result",
        toolName: "run_bash",
        toolResult: "correct",
      }),
    ]);
    warn.mockRestore();
  });

  it("hydrates physical lifecycle state and suppresses duplicate call/result writes", async () => {
    const memoryDir = await mkTempDir();
    const first = createSequencer(memoryDir);
    first.sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "hydrated-1",
      turn_id: "turn-1",
      tool_name: "read_file",
      arguments: { path: "a" },
    }), null);

    const reconstructed = createSequencer(memoryDir);
    reconstructed.sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "hydrated-1",
      turn_id: "turn-1",
      result: "a",
    }), null);
    reconstructed.sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "hydrated-1",
      turn_id: "turn-1",
      result: "a",
    }), null);

    expect(reconstructed.flushReasoningBoundary).not.toHaveBeenCalled();
    expect(readTraces(memoryDir).map((trace) => trace.traceType)).toEqual([
      "tool_call",
      "tool_result",
    ]);
    expect(readTraces(memoryDir)[1]).toMatchObject({ toolName: "read_file" });

    const completedReconstruction = createSequencer(memoryDir);
    completedReconstruction.sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "hydrated-1",
      turn_id: "turn-1",
      result: "a",
    }), null);
    expect(completedReconstruction.flushReasoningBoundary).not.toHaveBeenCalled();
    expect(readTraces(memoryDir)).toHaveLength(2);
  });

  it("uses compound identity and rejects an ambiguous terminal without an explicit turn", async () => {
    const memoryDir = await mkTempDir();
    const { sequencer } = createSequencer(memoryDir);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const turnId of ["turn-a", "turn-b"]) {
      sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
        invocation_id: "reused",
        turn_id: turnId,
        tool_name: "run_bash",
        arguments: { command: turnId },
      }), turnId);
    }

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "reused",
      result: "ambiguous",
    }), "turn-b");
    expect(readTraces(memoryDir).filter((trace) => trace.traceType === "tool_result")).toHaveLength(0);

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "reused",
      turn_id: "turn-a",
      result: "explicit",
    }), "turn-b");
    expect(readTraces(memoryDir).find((trace) => trace.traceType === "tool_result")).toMatchObject({
      turnId: "turn-a",
      toolCallId: "reused",
      toolResult: "explicit",
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("matches multiple turn lifecycles"));
    warn.mockRestore();
  });

  it("interrupts only physical pending calls and discards observation-only state at turn cleanup", async () => {
    const memoryDir = await mkTempDir();
    const { sequencer, flushReasoningBoundary } = createSequencer(memoryDir);
    sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "deferred-1",
      turn_id: "turn-1",
      tool_name: "search_web",
    }), null);
    sequencer.recordCallObservation(event(AgentRunEventType.TOOL_EXECUTION_STARTED, {
      invocation_id: "physical-1",
      turn_id: "turn-1",
      tool_name: "run_bash",
      arguments: { command: "sleep 1" },
    }), "turn-1");

    const interrupted = event(AgentRunEventType.TURN_INTERRUPTED, {
      turn_id: "turn-1",
      reason: "user stopped",
    });
    sequencer.interruptTurn(interrupted, "turn-1");
    sequencer.interruptTurn(interrupted, "turn-1");
    sequencer.completeTurn("turn-1");

    expect(readTraces(memoryDir).map((trace) => [trace.traceType, trace.toolCallId])).toEqual([
      ["tool_call", "physical-1"],
      ["tool_result", "physical-1"],
    ]);
    expect(readTraces(memoryDir)[1]).toMatchObject({
      toolName: "run_bash",
      toolResult: null,
      toolError: "user stopped",
    });

    sequencer.recordTerminal(event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
      invocation_id: "deferred-1",
      turn_id: "turn-1",
      tool_name: "search_web",
      arguments: { query: "after cleanup" },
      result: null,
    }), null);
    expect(flushReasoningBoundary).toHaveBeenCalledTimes(3);
    expect(readTraces(memoryDir).map((trace) => trace.toolCallId)).toEqual([
      "physical-1",
      "physical-1",
      "deferred-1",
      "deferred-1",
    ]);
  });
});
