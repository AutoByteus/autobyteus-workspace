import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const readAgyNativeToolArguments = vi.hoisted(() => vi.fn());
vi.mock("../../../../../src/agent-execution/backends/antigravity/stream/agy-native-tool-arguments-reader.js", () => ({ readAgyNativeToolArguments }));
vi.mock("../../../../../src/agent-execution/backends/antigravity/stream/agy-step-output-reader.js", () => ({ readAgyNativeImagePath: vi.fn() }));
vi.mock("../../../../../src/agent-execution/backends/antigravity/stream/agy-task-exit-message-reader.js", () => ({
  scanAgyTaskExitMessages: () => ({ settledFiles: [], exits: [], problem: null }),
}));
import { AgentRun } from "../../../../../src/agent-execution/domain/agent-run.js";
import { AgyAgentRunBackend } from "../../../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";

const conversationId = "cb90a226-a23b-49cd-bc64-0128b9dcfa00";
const full = { TargetFile: "/owned.txt", CodeContent: "exact\n🙂", Overwrite: false };
const step = (index: number, state = "ACTIVE", name = "write_to_file", parameters: unknown = { TargetFile: "/owned.txt" }): AgyStreamMessage => ({
  event: "step_update", step_update: { conversation_id: conversationId, step_index: index, step_type: "tool", state,
    tool_name: name, tool_info: { parameters, output: "unchanged provider result" } },
});
const result = (): AgyStreamMessage => ({ event: "result", result: { conversation_id: conversationId, status: "SUCCESS" } });
class FakeProcess {
  private listener: (message: AgyStreamMessage) => void = () => undefined;
  private closed: () => void = () => undefined;
  readonly stop = vi.fn(async () => {});
  subscribe(listener: typeof this.listener) { this.listener = listener; }
  onClose(listener: typeof this.closed) { this.closed = listener; }
  async sendUserMessage() {}
  emit(message: AgyStreamMessage) { this.listener(message); }
  close() { this.closed(); }
}
const backends: AgyAgentRunBackend[] = [];
const setup = () => {
  const process = new FakeProcess();
  const backend = new AgyAgentRunBackend({ runId: "native-run", config: {
    runtimeKind: "antigravity_cli", llmModelIdentifier: "gemini",
  }, runtimeContext: { conversationId } } as never, process as never);
  backends.push(backend);
  const events: AgentRunEvent[] = [];
  backend.subscribeToSourceEventBatches(async (batch) => { events.push(...batch); });
  return { backend, process, events };
};
const start = (backend: AgyAgentRunBackend) => backend.dispatchUserInput({ kind: "start_turn", message: { content: "owned input" } } as never);
const waitFor = async (condition: () => boolean) => {
  for (let i = 0; i < 100; i++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("condition not reached");
};
const pendingLookup = () => {
  let resolve: (args: Record<string, unknown> | null) => void = () => undefined;
  readAgyNativeToolArguments.mockImplementation(() => new Promise((done) => { resolve = done; }));
  return { resolve: (args: Record<string, unknown> | null) => resolve(args) };
};
beforeEach(() => { readAgyNativeToolArguments.mockReset(); readAgyNativeToolArguments.mockResolvedValue(full); });
afterEach(async () => { await Promise.all(backends.splice(0).map((backend) => backend.terminate())); });

describe("ordered native first-input capture in AGY backend", () => {
  it("awaits the bound lookup before STARTED, preserves queued terminal/result order, and reads only once", async () => {
    const pending = pendingLookup();
    const run = setup(); const accepted = await start(run.backend);
    run.process.emit(step(2)); run.process.emit(step(2, "DONE")); run.process.emit(result());
    await waitFor(() => readAgyNativeToolArguments.mock.calls.length === 1);
    expect(run.events.map((event) => event.eventType)).toEqual([AgentRunEventType.TURN_STARTED]);
    expect(readAgyNativeToolArguments.mock.calls[0]?.slice(0, 2)).toEqual([conversationId,
      { stepIndex: 2, toolName: "write_to_file", summary: { TargetFile: "/owned.txt" } }]);
    pending.resolve(full);
    await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(run.events.map((event) => event.eventType)).toEqual([AgentRunEventType.TURN_STARTED,
      AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, AgentRunEventType.TURN_COMPLETED]);
    expect(run.events[1]?.payload).toMatchObject({ arguments: full, turn_id: accepted.turnId,
      invocation_id: `agy-tool-${accepted.turnId}-2`, tool_name: "write_to_file" });
    expect(run.events[2]?.payload.arguments).toEqual(full);
    expect(run.events[2]?.payload.result).toEqual({ provider_state: "DONE", output: "unchanged provider result" });
    expect(readAgyNativeToolArguments).toHaveBeenCalledTimes(1);
  });

  it.each(["DONE", "ERROR"])("resolves before the first %s observation emits its synthetic STARTED", async (state) => {
    const run = setup(); await start(run.backend);
    run.process.emit(step(6, state)); run.process.emit(result());
    await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(run.events[1]?.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_STARTED);
    expect(run.events[1]?.payload.arguments).toEqual(full);
    expect(run.events[2]?.payload.arguments).toEqual(full);
    expect(run.events[2]?.eventType).toBe(state === "DONE" ? AgentRunEventType.TOOL_EXECUTION_SUCCEEDED : AgentRunEventType.TOOL_EXECUTION_FAILED);
  });

  it("uses the first full command for background close and starts a distinct next-turn lookup", async () => {
    const args = { CommandLine: "pnpm dev --host 127.0.0.1", Cwd: "/owned", IsDaemon: true };
    readAgyNativeToolArguments.mockResolvedValue(args);
    const run = setup(); const first = await start(run.backend);
    run.process.emit(step(2, "ACTIVE", "run_command", { CommandLine: "pnpm dev…" })); run.process.emit(result());
    await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(run.events.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)?.payload)
      .toMatchObject({ arguments: args, provider_state: "RUNNING" });
    const second = await start(run.backend);
    expect(second.turnId).not.toBe(first.turnId);
    run.process.emit(step(2, "DONE")); run.process.emit(result());
    await waitFor(() => run.events.filter((event) => event.eventType === AgentRunEventType.TURN_COMPLETED).length === 2);
    expect(readAgyNativeToolArguments).toHaveBeenCalledTimes(2);
  });

  it.each(["null", "throw"])("keeps summaries and execution usable when optional lookup returns %s", async (outcome) => {
    if (outcome === "throw") readAgyNativeToolArguments.mockRejectedValue(new Error("private source failure"));
    else readAgyNativeToolArguments.mockResolvedValue(null);
    const run = setup(); await start(run.backend);
    run.process.emit(step(2)); run.process.emit(step(2, "DONE", "write_to_file", {})); run.process.emit(result());
    await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(run.events[1]?.payload.arguments).toEqual({ TargetFile: "/owned.txt" });
    expect(run.events[2]?.payload.arguments).toEqual({ TargetFile: "/owned.txt" });
    expect(run.backend.isActive()).toBe(true);
    expect(JSON.stringify(run.events)).not.toContain("private source failure");
  });

  it.each(["interrupt", "terminate", "close"])("aborts pending evidence on %s and never publishes stale start/success", async (action) => {
    const pending = pendingLookup();
    const run = setup(); const accepted = await start(run.backend);
    run.process.emit(step(2)); run.process.emit(step(2, "DONE")); run.process.emit(result());
    await waitFor(() => readAgyNativeToolArguments.mock.calls.length === 1);
    const signal = readAgyNativeToolArguments.mock.calls[0]?.[2].signal as AbortSignal;
    const stopped = action === "interrupt" ? run.backend.interrupt(accepted.turnId ?? null)
      : action === "terminate" ? run.backend.terminate() : (run.process.close(), Promise.resolve());
    expect(signal.aborted).toBe(true);
    // Deliberately emulate an uncooperative late reader: the backend fence must still hold.
    pending.resolve(full); await stopped;
    await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_INTERRUPTED));
    expect(run.events.some((event) => [AgentRunEventType.TOOL_EXECUTION_STARTED,
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, AgentRunEventType.TURN_COMPLETED].includes(event.eventType))).toBe(false);
    expect(run.backend.isActive()).toBe(false);
  });

  it("allows ordered interruption to complete with an abort-cooperative reader", async () => {
    readAgyNativeToolArguments.mockImplementation((_id, _lookup, { signal }) => new Promise((resolve) => {
      signal.addEventListener("abort", () => resolve(null), { once: true });
    }));
    const run = setup(); const accepted = await start(run.backend);
    run.process.emit(step(2));
    await waitFor(() => readAgyNativeToolArguments.mock.calls.length === 1);
    await run.backend.interrupt(accepted.turnId ?? null);
    expect(run.events.map((event) => event.eventType)).toEqual([AgentRunEventType.TURN_STARTED, AgentRunEventType.TURN_INTERRUPTED]);
  });

  it("does not read native files for MCP (including projected images), malformed steps or conversation conflicts", async () => {
    const mcp = setup(); await start(mcp.backend);
    mcp.process.emit(step(2, "DONE", "call_mcp_tool", { ToolName: "generate_image", Arguments: {} })); mcp.process.emit(result());
    await waitFor(() => mcp.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    const malformed = setup(); await start(malformed.backend);
    malformed.process.emit(step(2, "BOGUS"));
    await waitFor(() => !malformed.backend.isActive());
    const conflict = setup(); await start(conflict.backend);
    const message = step(2);
    if (message.event === "step_update") message.step_update.conversation_id = "different";
    conflict.process.emit(message);
    await waitFor(() => !conflict.backend.isActive());
    expect(readAgyNativeToolArguments).not.toHaveBeenCalled();
  });

  it.each([false, true])("force release (activeTurn=%s) waits for exact stop, not early offline/terminal delivery", async activeTurn => {
    const current = setup();
    const run = new AgentRun({ context: current.backend.getContext(), backend: current.backend,
      providerInputNormalizer: { normalizeForProvider: input => input } });
    if (activeTurn) await start(current.backend);
    let resolve!: () => void;
    current.process.stop.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
    let settled = false;
    const release = run.forceReleaseRuntime().then(value => { settled = true; return value; });
    await waitFor(() => current.process.stop.mock.calls.length === 1);
    expect(run.isActive()).toBe(false);
    if (activeTurn) await waitFor(() => current.events.some(event => event.eventType === AgentRunEventType.TURN_INTERRUPTED));
    expect(settled).toBe(false);
    expect((await current.backend.dispatchUserInput({ kind: "start_turn", message: { content: "late" } } as never)).forwarded).toBe(false);
    resolve();
    expect((await release).accepted).toBe(true);
  });

  it.each([false, true])("force release (activeTurn=%s) retains failed exact stop for explicit same-owner retry", async activeTurn => {
    const current = setup();
    const run = new AgentRun({ context: current.backend.getContext(), backend: current.backend,
      providerInputNormalizer: { normalizeForProvider: input => input } });
    if (activeTurn) await start(current.backend);
    const failure = new Error("owned stop unconfirmed");
    current.process.stop.mockRejectedValueOnce(failure);
    await expect(run.forceReleaseRuntime()).rejects.toBe(failure);
    expect(current.process.stop).toHaveBeenCalledTimes(1);
    expect(run.isActive()).toBe(false); // still not release proof
    expect((await run.forceReleaseRuntime()).accepted).toBe(true);
    expect(current.process.stop).toHaveBeenCalledTimes(2);
    expect((await run.forceReleaseRuntime()).accepted).toBe(true);
    expect(current.process.stop).toHaveBeenCalledTimes(2); // AgentRun caches proven release only
    if (activeTurn) expect(current.events.filter(event => event.eventType === AgentRunEventType.TURN_INTERRUPTED)).toHaveLength(1);
  });

  it("records automatic send-error stop failure without an unhandled rejection or invented release", async () => {
    const current = setup();
    const failure = new Error("owned stop unconfirmed");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      vi.spyOn(current.process, "sendUserMessage").mockRejectedValueOnce(new Error("send rejected"));
      current.process.stop.mockRejectedValueOnce(failure);
      expect((await start(current.backend)).forwarded).toBe(false);
      expect(warn).toHaveBeenCalledWith("AGY_EXACT_STOP_FAILED", failure);
      expect((await current.backend.terminate()).accepted).toBe(true);
      expect(current.process.stop).toHaveBeenCalledTimes(2);
    } finally { warn.mockRestore(); }
  });
});
