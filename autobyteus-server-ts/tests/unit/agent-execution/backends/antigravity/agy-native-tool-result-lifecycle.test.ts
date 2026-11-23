import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const readAgyNativeToolArguments = vi.hoisted(() => vi.fn());
const readAgyNativeToolResult = vi.hoisted(() => vi.fn());
vi.mock("../../../../../src/agent-execution/backends/antigravity/stream/agy-native-tool-arguments-reader.js", () => ({ readAgyNativeToolArguments }));
vi.mock("../../../../../src/agent-execution/backends/antigravity/stream/agy-native-tool-result-reader.js", () => ({ readAgyNativeToolResult }));
vi.mock("../../../../../src/agent-execution/backends/antigravity/stream/agy-step-output-reader.js", () => ({ readAgyNativeImagePath: vi.fn() }));
vi.mock("../../../../../src/agent-execution/backends/antigravity/stream/agy-task-exit-message-reader.js", () => ({
  scanAgyTaskExitMessages: () => ({ settledFiles: [], exits: [], problem: null }),
}));
import { AgyAgentRunBackend } from "../../../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { stubAgyAgentTools } from "../../../../helpers/agent-tool-mcp-run-sessions-stub.js";
import { stubAgyCapsuleSkills } from "../../../../fixtures/run-workspace-skills-fixtures.js";

/** autobyteus-377: the backend asks for the row of a finished native step, in order, and degrades to the stream's result. */
const conversationId = "cb90a226-a23b-49cd-bc64-0128b9dcfa00";
const step = (index: number, state: string, name: string, output: unknown = "3 lines, 21 bytes"): AgyStreamMessage => ({
  event: "step_update", step_update: { conversation_id: conversationId, step_index: index, step_type: "tool", state, tool_name: name,
    tool_info: { parameters: { AbsolutePath: "/owned.txt" }, output } } });
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
  const backend = new AgyAgentRunBackend({ runId: "result-run", config: { runtimeKind: "antigravity_cli", llmModelIdentifier: "gemini" },
    runtimeContext: { conversationId } } as never, process as never, { compactionDetection: false }, stubAgyAgentTools("result-run"),
    stubAgyCapsuleSkills("result-run"));
  backends.push(backend);
  const events: AgentRunEvent[] = [];
  backend.subscribeToSourceEventBatches(async (batch) => { events.push(...batch); });
  return { backend, process, events };
};
const start = (backend: AgyAgentRunBackend) => backend.dispatchUserInput({ kind: "start_turn", message: { content: "owned input" } } as never);
const waitFor = async (condition: () => boolean) => {
  for (let i = 0; i < 100; i++) { if (condition()) return; await new Promise((resolve) => setTimeout(resolve, 5)); }
  throw new Error("condition not reached");
};
const succeeded = (events: AgentRunEvent[]) => events.filter((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  readAgyNativeToolArguments.mockReset(); readAgyNativeToolArguments.mockResolvedValue(null);
  readAgyNativeToolResult.mockReset();
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(async () => { await Promise.all(backends.splice(0).map((backend) => backend.terminate())); warn.mockRestore(); });

describe("AGY backend: native tool result recovery", () => {
  it("AC-001: the success carries the recovered text, in order, after one lookup of this step", async () => {
    readAgyNativeToolResult.mockResolvedValue({ text: "Showing lines 1-3 of 3\n1: a\n2: b\n3: c" });
    const run = setup(); await start(run.backend);
    run.process.emit(step(2, "ACTIVE", "read_file", null)); run.process.emit(step(2, "DONE", "read_file")); run.process.emit(result());
    await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(readAgyNativeToolResult).toHaveBeenCalledTimes(1);
    expect(readAgyNativeToolResult.mock.calls[0]?.slice(0, 2)).toEqual([conversationId, { stepIndex: 2, toolName: "read_file" }]);
    expect(run.events.map((event) => event.eventType)).toEqual([AgentRunEventType.TURN_STARTED, AgentRunEventType.TOOL_EXECUTION_STARTED,
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, AgentRunEventType.TURN_COMPLETED]);
    expect(succeeded(run.events)[0]?.payload.result).toEqual({ provider_state: "DONE", output: "Showing lines 1-3 of 3\n1: a\n2: b\n3: c" });
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(["INVALID_IDENTITY", "TRANSCRIPT_UNREADABLE", "ROW_NOT_FOUND", "ROW_NOT_CORROBORATED"])(
    "AC-007: a miss (%s) keeps the stream's result and logs one warning with the step and the reason", async (reason) => {
      readAgyNativeToolResult.mockResolvedValue({ reason });
      const run = setup(); await start(run.backend);
      run.process.emit(step(2, "DONE", "read_file")); run.process.emit(result());
      await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
      expect(succeeded(run.events)[0]?.payload.result).toEqual({ provider_state: "DONE", output: "3 lines, 21 bytes" });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(`AGY_TOOL_RESULT_UNRECOVERED run=result-run step=2 tool=read_file reason=${reason}`);
    });

  it("AC-007: a reader that throws changes nothing", async () => {
    readAgyNativeToolResult.mockRejectedValue(new Error("boom"));
    const run = setup(); await start(run.backend);
    run.process.emit(step(2, "DONE", "grep_search", null)); run.process.emit(result());
    await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(succeeded(run.events)[0]?.payload.result).toEqual({ provider_state: "DONE", output: null });
  });

  it("AC-002: no row is read for a step whose stream already has the real result, nor for run_command, MCP, images, ACTIVE or ERROR", async () => {
    const run = setup(); await start(run.backend);
    const mcp = step(5, "DONE", "call_mcp_tool", null);
    if (mcp.event === "step_update") mcp.step_update.tool_info = { parameters: { ServerName: "s", ToolName: "t", Arguments: {} }, output: null };
    for (const message of [step(1, "DONE", "run_command", "exit code 0\nhi"), step(2, "DONE", "read_file", "the real text"), mcp,
      step(3, "DONE", "generate_image", null), step(4, "ACTIVE", "read_file", null), step(6, "ERROR", "read_file", null)]) run.process.emit(message);
    run.process.emit(result());
    await waitFor(() => run.events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED));
    expect(readAgyNativeToolResult).not.toHaveBeenCalled();
  });

  it("an interrupt during the lookup drops the step: nothing is emitted for it afterwards", async () => {
    let signal: AbortSignal | undefined;
    readAgyNativeToolResult.mockImplementation((_id, _lookup, options) => new Promise((resolve) => {
      signal = options.signal; signal?.addEventListener("abort", () => resolve({ reason: "TRANSCRIPT_UNREADABLE" }));
    }));
    const run = setup(); const accepted = await start(run.backend);
    run.process.emit(step(2, "DONE", "read_file"));
    await waitFor(() => readAgyNativeToolResult.mock.calls.length === 1);
    await run.backend.interrupt(accepted.turnId as string);
    await waitFor(() => signal?.aborted === true);
    expect(succeeded(run.events)).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("a closed process aborts a pending lookup", async () => {
    let signal: AbortSignal | undefined;
    readAgyNativeToolResult.mockImplementation((_id, _lookup, options) => new Promise((resolve) => {
      signal = options.signal; signal?.addEventListener("abort", () => resolve({ reason: "TRANSCRIPT_UNREADABLE" }));
    }));
    const run = setup(); await start(run.backend);
    run.process.emit(step(2, "DONE", "read_file"));
    await waitFor(() => readAgyNativeToolResult.mock.calls.length === 1);
    run.process.close();
    await waitFor(() => signal?.aborted === true);
    expect(succeeded(run.events)).toEqual([]);
  });
});
