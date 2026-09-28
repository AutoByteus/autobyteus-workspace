import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AgyStreamEventConverter, type AgyNativeImagePathResolver } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import { parseAgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentSegmentLifecycleEventTransformer } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { AgentSegmentLifecycleState } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { AgentTurnLifecycleState } from "../../../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import { LifecycleStatusEventTransformer } from "../../../../../src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-transformer.js";

const fixture = (name: string, directory = "agy-tool-event-capture") => fs.readFileSync(path.resolve(process.cwd(), `../tickets/done/antigravity-cli-runtime-redesign-20260924/${directory}/${name}.stdout.jsonl`), "utf8")
  .split("\n").filter(Boolean).map((line) => parseAgyStreamMessage(line)).filter((event) => event !== null);

const convert = (name: string, directory?: string) => {
  const messages = fixture(name, directory);
  const init = messages.find((message) => message.event === "init");
  if (!init || init.event !== "init") throw new Error("fixture lacks init");
  const converter = new AgyStreamEventConverter("run-a", init.conversation_id, "gemini-3.8-flash-low");
  const events = [] as ReturnType<typeof converter.convert>;
  events.push(...converter.startTurn("turn-a"));
  for (const message of messages) {
    if (message.event === "init") continue;
    events.push(...converter.convert(message));
    if (message.event === "result" && message !== messages.at(-1)) events.push(...converter.startTurn("turn-b"));
  }
  return events;
};

describe("AGY canonical stream conversion", () => {
  it("shows native image parameters, redacts native image denial, and does not classify an MCP image call as native", () => {
    const diagnostics: unknown[] = [];
    const resolver = vi.fn<AgyNativeImagePathResolver>();
    const converter = new AgyStreamEventConverter("run", "conversation", "gemini", (value) => diagnostics.push(value), resolver);
    converter.startTurn("turn");
    const active = converter.convert({ event: "step_update", step_update: { conversation_id: "conversation",
      step_index: 1, step_type: "tool", state: "ACTIVE", tool_name: "generate_image",
      tool_info: { parameters: { ImageName: "blue_dog", Prompt: "A blue dog" } } } });
    expect(active[0]?.payload.arguments).toEqual({ ImageName: "blue_dog", Prompt: "A blue dog" });
    const terminal = converter.convert({ event: "step_update", step_update: { conversation_id: "conversation",
      step_index: 1, step_type: "tool", state: "ERROR", tool_name: "generate_image",
      tool_info: { error: "permission denied token=private /private/path", output: "secret-output" } } });
    expect(JSON.stringify(terminal)).not.toMatch(/token=private|private\/path|secret-output/);
    expect(terminal[0]?.eventType).toBe(AgentRunEventType.TOOL_DENIED);
    expect(terminal[0]?.payload.result).toEqual({ provider_state: "ERROR", output: null });
    expect(diagnostics).toHaveLength(1);
    const doneWithError = converter.convert({ event: "step_update", step_update: { conversation_id: "conversation",
      step_index: 3, step_type: "tool", state: "DONE", tool_name: "generate_image",
      tool_info: { error: "quota token=private", output: "secret-output" } } });
    expect(JSON.stringify(doneWithError)).not.toMatch(/token=private|secret-output/);
    expect(doneWithError.at(-1)?.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_FAILED);
    expect(resolver).not.toHaveBeenCalled();
    const mcp = converter.convert({ event: "step_update", step_update: { conversation_id: "conversation",
      step_index: 2, step_type: "tool", state: "DONE", tool_name: "call_mcp_tool",
      tool_info: { parameters: { ToolName: "generate_image" }, output: { file_path: "/tmp/mcp.png" } } } });
    expect(mcp.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)?.payload.result)
      .toEqual({ provider_state: "DONE", output: { file_path: "/tmp/mcp.png" } });
    expect(resolver).not.toHaveBeenCalled();
  });

  it("enriches native image DONE with AGY's step output text and resolved file_path", () => {
    const resolver = vi.fn<AgyNativeImagePathResolver>().mockReturnValue({
      path: "/brain/conv/dog_1.jpg", outputText: "Generated image is saved at /brain/conv/dog_1.jpg.", reason: null,
    });
    const converter = new AgyStreamEventConverter("run", "conversation", "gemini", undefined, resolver);
    converter.startTurn("turn");
    const events = converter.convert({ event: "step_update", step_update: { conversation_id: "conversation",
      step_index: 2, step_type: "tool", state: "DONE", tool_name: "generate_image",
      tool_info: { parameters: { ImageName: "dog", Prompt: "A dog" }, output: { file_path: "/untrusted/provider-path.png" } } } });
    expect(events.map((item) => item.eventType)).toEqual([
      AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    ]);
    expect(resolver).toHaveBeenCalledExactlyOnceWith(2);
    expect(events[0]?.payload.arguments).toEqual({ ImageName: "dog", Prompt: "A dog" });
    expect(events[1]?.payload.result).toEqual({ provider_state: "DONE",
      output: "Generated image is saved at /brain/conv/dog_1.jpg.", file_path: "/brain/conv/dog_1.jpg" });
    expect(JSON.stringify(events)).not.toContain("/untrusted/provider-path.png");
    const terminal = converter.convert({ event: "result", result: {
      conversation_id: "conversation", status: "SUCCESS", response: "Image available in AGY.",
    } });
    expect(terminal.find((item) => item.eventType === AgentRunEventType.SEGMENT_CONTENT)?.payload.delta)
      .toBe("Image available in AGY.");
    expect(terminal.at(-1)?.eventType).toBe(AgentRunEventType.TURN_COMPLETED);
  });
  it.each(["OUTPUT_MISSING", "OUTPUT_UNSAFE", "OUTPUT_TOO_LARGE", "PATH_NOT_FOUND_IN_OUTPUT",
    "PATH_OUTSIDE_CONVERSATION", "IMAGE_MISSING", "READ_FAILED", "INVALID_IDENTITY"] as const)(
    "keeps native image DONE successful with output null and a content-free warning when unresolved (%s)", (reason) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        const converter = new AgyStreamEventConverter("run", "conversation", "gemini", undefined,
          () => ({ path: null, outputText: null, reason }));
        converter.startTurn("turn");
        const events = converter.convert({ event: "step_update", step_update: { conversation_id: "conversation",
          step_index: 5, step_type: "tool", state: "DONE", tool_name: "generate_image", tool_info: {} } });
        expect(events.at(-1)?.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
        expect(events.at(-1)?.payload.result).toEqual({ provider_state: "DONE", output: null });
        expect(warn).toHaveBeenCalledExactlyOnceWith(`AGY_NATIVE_IMAGE_PATH_UNRESOLVED run=run step=5 reason=${reason}`);
      } finally { warn.mockRestore(); }
    });
  it("never lets a throwing resolver escape convert", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini", undefined, () => {
        throw new Error("boom /secret/path");
      });
      converter.startTurn("turn");
      let events: ReturnType<typeof converter.convert> = [];
      expect(() => { events = converter.convert({ event: "step_update", step_update: { conversation_id: "conversation",
        step_index: 4, step_type: "tool", state: "DONE", tool_name: "generate_image", tool_info: {} } }); }).not.toThrow();
      expect(events.at(-1)?.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
      expect(events.at(-1)?.payload.result).toEqual({ provider_state: "DONE", output: null });
      expect(warn).toHaveBeenCalledExactlyOnceWith("AGY_NATIVE_IMAGE_PATH_UNRESOLVED run=run step=4 reason=RESOLVER_FAILED");
      expect(converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } })
        .at(-1)?.eventType).toBe(AgentRunEventType.TURN_COMPLETED);
    } finally { warn.mockRestore(); }
  });
  it("resolves distinct paths for parallel native image steps", () => {
    const converter = new AgyStreamEventConverter("run", "conversation", "gemini", undefined,
      (step) => ({ path: `/brain/conv/image_${step}.jpg`, outputText: `saved ${step}`, reason: null }));
    converter.startTurn("turn");
    const events = [6, 7].flatMap((stepIndex) => converter.convert({ event: "step_update", step_update: {
      conversation_id: "conversation", step_index: stepIndex, step_type: "tool", state: "DONE",
      tool_name: "generate_image", tool_info: {},
    } }));
    expect(events.filter((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)
      .map((item) => item.payload.result)).toEqual([
        { provider_state: "DONE", output: "saved 6", file_path: "/brain/conv/image_6.jpg" },
        { provider_state: "DONE", output: "saved 7", file_path: "/brain/conv/image_7.jpg" },
      ]);
  });
  it("reports distinct native image steps without duplicating terminal events", () => {
    const converter = new AgyStreamEventConverter("run", "conversation", "gemini");
    converter.startTurn("turn");
    const events = [4, 8].flatMap((stepIndex) => converter.convert({ event: "step_update", step_update: {
      conversation_id: "conversation", step_index: stepIndex, step_type: "tool", state: "DONE",
      tool_name: "generate_image", tool_info: {},
    } }));
    expect(events.filter((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED))
      .toHaveLength(2);
    expect(events.filter((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)
      .map((item) => item.payload.result)).toEqual([
        { provider_state: "DONE", output: null }, { provider_state: "DONE", output: null },
      ]);
    expect(converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } })
      .filter((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toHaveLength(0);
  });
  it.each(["ERROR", "UNKNOWN", undefined])("redacts failed terminal result with status %s, even without a tool", (status) => {
    const diagnostics: unknown[] = [];
    const converter = new AgyStreamEventConverter("run", "conversation", "gemini", (value) => diagnostics.push(value));
    converter.startTurn("turn");
    const events = converter.convert({ event: "result", result: {
      conversation_id: "conversation", status, error: "token=private-error",
      response: "token=private-response", usage: { secret: "token=private-usage" },
    } });
    expect(events.map((item) => item.eventType)).toEqual([AgentRunEventType.ERROR]);
    expect(events[0]).toMatchObject({ statusHint: "ERROR", payload: {
      turn_id: "turn", code: "AGY_TURN_ERROR", error_scope: "turn", error_effect: "terminal",
      message: "Antigravity could not complete this turn.",
    } });
    expect(JSON.stringify(events)).not.toMatch(/private-|UNKNOWN|provider_status|raw_usage_json/);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ kind: "turn", turnId: "turn", providerError: "token=private-error" });
  });
  it("treats SUCCESS with an explicit error as a failed terminal turn and keeps prior tool DONE factual", () => {
    const converter = new AgyStreamEventConverter("run", "conversation", "gemini");
    converter.startTurn("turn");
    const tool = converter.convert({ event: "step_update", step_update: {
      conversation_id: "conversation", step_index: 1, step_type: "tool", state: "DONE",
      tool_name: "generate_image", tool_info: {},
    } });
    const terminal = converter.convert({ event: "result", result: {
      conversation_id: "conversation", status: "SUCCESS", error: { message: "token=private" },
      response: "secret result", usage: { secret: "usage" },
    } });
    expect(tool.some((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(true);
    expect(terminal.map((item) => item.eventType)).toEqual([AgentRunEventType.ERROR]);
    expect(JSON.stringify(terminal)).not.toMatch(/token=private|secret result|usage|provider_status/);
  });
  it.each([undefined, "UNKNOWN", "ERROR"]) ("fails a %s status without an explicit error and leaves canonical status error", (status) => {
    const converter = new AgyStreamEventConverter("run", "conversation", "gemini");
    const start = converter.startTurn("turn");
    const terminal = converter.convert({ event: "result", result: { conversation_id: "conversation", status,
      response: "private failed reply" } });
    const state = new AgentTurnLifecycleState();
    const transformer = new LifecycleStatusEventTransformer();
    const output = [...start, ...terminal].flatMap((event) => transformer.transform({
      runContext: { runId: "run" } as never, events: [event], lifecycleState: state,
    }));
    expect(terminal.map((item) => item.eventType)).toEqual([AgentRunEventType.ERROR]);
    expect(state.status).toBe("error");
    expect(output.at(-1)?.payload.status).toBe("error");
    expect(JSON.stringify(output)).not.toContain("private failed reply");
  });
  it("keeps multi-turn text/tool order without repeating result.response", () => {
    const events = convert("multi_turn");
    expect(events.filter((event) => event.eventType === AgentRunEventType.TURN_COMPLETED)).toHaveLength(2);
    expect(events.filter((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toHaveLength(2);
    expect(events.filter((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT).map((event) => event.payload.delta).join(""))
      .toContain("FIRST-TURN-TOOL");
  });
  it("keeps headless denial failed despite result SUCCESS", () => {
    const events = convert("run_command_denied");
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_DENIED)).toBe(true);
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(false);
    expect(events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED)).toBe(true);
  });
  it.each(["exit0", "exit8_empty", "not_found"])("maps %s DONE to provider-step success without inventing shell exit", (name) => {
    const events = convert(name, "agy-command-outcome-matrix-probe");
    const success = events.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
    expect(success).toBeDefined();
    expect(success?.payload.result).toMatchObject({ provider_state: "DONE" });
    expect(JSON.stringify(success?.payload.result)).not.toMatch(/exit_code|exitCode/);
    if (name === "not_found") expect(JSON.stringify(success?.payload.result)).toContain("command not found");
  });
  it("does not mark headless denial green when the turn reports SUCCESS", () => {
    const events = convert("denied", "agy-command-outcome-matrix-probe");
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_DENIED)).toBe(true);
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(false);
  });
  it("prioritizes an explicit tool error even when AGY labels the step DONE", () => {
    const messages = fixture("exit0", "agy-command-outcome-matrix-probe");
    const init = messages.find((message) => message.event === "init");
    const terminal = messages.find((message) => message.event === "step_update" && message.step_update.step_type === "tool" && message.step_update.state === "DONE");
    if (!init || init.event !== "init" || !terminal || terminal.event !== "step_update") throw new Error("fixture lacks terminal tool step");
    const converter = new AgyStreamEventConverter("run-a", init.conversation_id, "gemini-3.8-flash-low");
    converter.startTurn("turn-a");
    const events = converter.convert({ ...terminal, step_update: {
      ...terminal.step_update,
      tool_info: { ...terminal.step_update.tool_info, output: "partial output", error: "permission denied" },
    } });
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_DENIED)).toBe(true);
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(false);
    expect(events.find((event) => event.eventType === AgentRunEventType.TOOL_DENIED)?.payload.result)
      .toEqual({ provider_state: "DONE", output: "partial output" });
  });
  it("emits assistant text that satisfies the canonical segment lifecycle contract", () => {
    const transformer = new AgentSegmentLifecycleEventTransformer();
    const segmentLifecycleState = new AgentSegmentLifecycleState();
    const lifecycleState = new AgentTurnLifecycleState();
    const canonicalEvents = convert("run_command_nonzero").flatMap((event) => {
      lifecycleState.observeEvent(event);
      return transformer.transform({
        runContext: {} as never,
        events: [event],
        lifecycleState,
        segmentLifecycleState,
      });
    });
    expect(canonicalEvents.some((event) => event.payload.code === "AGENT_SEGMENT_LIFECYCLE_INVALID")).toBe(false);
    expect(canonicalEvents.filter((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT)).not.toHaveLength(0);
    expect(canonicalEvents.filter((event) => event.eventType === AgentRunEventType.SEGMENT_END)).not.toHaveLength(0);
  });
});
