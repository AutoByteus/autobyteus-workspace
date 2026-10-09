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
  it("declares AGY result usage as base input that excludes cache reads, carrying only the raw counts", () => {
    const converter = new AgyStreamEventConverter("run", "conversation", "gemini-3.8-flash-high");
    converter.startTurn("turn");
    const usage = converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS",
      num_turns: 3, usage: { input_tokens: 6_110, output_tokens: 1, total_tokens: 6_111, cache_read_tokens: 307_003 } } })
      .find((item) => item.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED);
    expect(usage?.payload).toMatchObject({
      usage_scope: "cumulative_snapshot", snapshot_series_key: "conversation",
      input_token_semantic: "base_excludes_cache",
      reported_input_tokens: 6_110, reported_output_tokens: 1, reported_total_tokens: 6_111,
      cache_read_input_tokens: 307_003, cache_state: "positive",
    });
    expect(usage?.payload).not.toHaveProperty("accounting_input_tokens");
    expect(usage?.payload).not.toHaveProperty("cache_miss_input_tokens");
    expect(usage?.payload).not.toHaveProperty("standard_input_tokens");
  });
  describe("background tool steps AGY never finishes", () => {
    const BACKGROUND = "Started as a background task; still running when the turn ended.";
    const step = (stepIndex: number, state: string, toolName = "run_command", toolInfo: Record<string, unknown> = {}) =>
      ({ event: "step_update" as const, step_update: { conversation_id: "conversation", step_index: stepIndex,
        step_type: "tool", state, tool_name: toolName, tool_info: toolInfo } });
    const text = (stepIndex: number, state: string, delta?: string) => ({ event: "step_update" as const, step_update: {
      conversation_id: "conversation", step_index: stepIndex, step_type: "agent_response", state, text_delta: delta } });

    it("closes an unfinished daemon step as a succeeded background task before TURN_COMPLETED", () => {
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini");
      converter.startTurn("turn");
      const started = converter.convert(step(2, "ACTIVE", "run_command",
        { parameters: { CommandLine: "pnpm dev", IsDaemon: true } }));
      const later = [
        ...converter.convert(step(3, "ACTIVE", "write_to_file", { parameters: { TargetFile: "a.ts" } })),
        ...converter.convert(step(3, "DONE", "write_to_file", { output: "written" })),
        ...converter.convert(text(4, "ACTIVE", "Dev server is up.")),
      ];
      const terminal = converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS",
        usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 } } });
      expect(started.map((item) => item.eventType)).toEqual([AgentRunEventType.TOOL_EXECUTION_STARTED]);
      expect(later.filter((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)
        .map((item) => item.payload.invocation_id)).toEqual(["agy-tool-turn-3"]);
      expect(terminal.map((item) => item.eventType)).toEqual([
        AgentRunEventType.SEGMENT_END, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
        AgentRunEventType.TOKEN_USAGE_UPDATED, AgentRunEventType.TURN_COMPLETED,
      ]);
      expect(terminal[1]).toMatchObject({ statusHint: null, payload: {
        turn_id: "turn", invocation_id: "agy-tool-turn-2", tool_name: "run_command",
        arguments: { CommandLine: "pnpm dev", IsDaemon: true }, provider_state: "RUNNING",
        result: { provider_state: "RUNNING", output: BACKGROUND },
      } });
      expect(terminal[1]?.payload).toEqual({ ...started[0]?.payload, provider_state: "RUNNING",
        result: { provider_state: "RUNNING", output: BACKGROUND } });
    });

    it("reports unfinished steps as background tool steps at result, and nothing when every step finished", () => {
      const reported: unknown[] = [];
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini", undefined, undefined,
        (steps) => reported.push(steps));
      converter.startTurn("turn");
      converter.convert(step(5, "ACTIVE", "browser_subagent", { parameters: { Task: "watch" } }));
      converter.convert(step(2, "ACTIVE", "run_command", { parameters: { CommandLine: "pnpm dev" } }));
      converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } });
      converter.startTurn("turn-2");
      converter.convert(step(7, "ACTIVE"));
      converter.convert(step(7, "DONE"));
      converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } });

      expect(reported).toEqual([[
        { stepIndex: 2, toolName: "run_command", commandLine: "pnpm dev" },
        { stepIndex: 5, toolName: "browser_subagent", commandLine: null },
      ]]);
    });

    it("does not report steps closed by an interrupt as background steps", () => {
      const reported: unknown[] = [];
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini", undefined, undefined,
        (steps) => reported.push(steps));
      converter.startTurn("turn");
      converter.convert(step(2, "ACTIVE"));
      converter.interrupt();

      expect(reported).toEqual([]);
    });

    it("closes every unfinished step in ascending step order", () => {
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini");
      converter.startTurn("turn");
      converter.convert(step(7, "ACTIVE"));
      converter.convert(step(5, "ACTIVE"));
      const terminal = converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } });
      expect(terminal.filter((item) => item.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)
        .map((item) => item.payload.invocation_id)).toEqual(["agy-tool-turn-5", "agy-tool-turn-7"]);
    });

    it("closes an unfinished step as background before the turn error on a non-SUCCESS result", () => {
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini", () => undefined);
      converter.startTurn("turn");
      converter.convert(step(2, "ACTIVE"));
      const terminal = converter.convert({ event: "result", result: { conversation_id: "conversation", status: "ERROR" } });
      expect(terminal.map((item) => item.eventType)).toEqual([
        AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, AgentRunEventType.ERROR,
      ]);
      expect(terminal[0]?.payload.result).toEqual({ provider_state: "RUNNING", output: BACKGROUND });
    });

    it("adds no background closure for steps AGY finished as DONE, ERROR or denied", () => {
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini");
      converter.startTurn("turn");
      const finished = [
        ...converter.convert(step(1, "ACTIVE")), ...converter.convert(step(1, "DONE", "run_command", { output: "ok" })),
        ...converter.convert(step(2, "ACTIVE")), ...converter.convert(step(2, "ERROR", "run_command", { error: "boom" })),
        ...converter.convert(step(3, "DONE", "run_command", { error: "permission denied" })),
      ];
      expect(finished.map((item) => item.eventType)).toEqual([
        AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
        AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_FAILED,
        AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_DENIED,
      ]);
      const terminal = converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } });
      expect(terminal.map((item) => item.eventType)).toEqual([AgentRunEventType.TURN_COMPLETED]);
    });

    it("keeps interruption semantics for an unfinished step and does not leak it into the next turn", () => {
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini");
      converter.startTurn("turn");
      converter.convert(step(2, "ACTIVE"));
      expect(converter.interrupt().map((item) => item.eventType)).toEqual([AgentRunEventType.TURN_INTERRUPTED]);
      converter.startTurn("turn-b");
      const terminal = converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } });
      expect(terminal.map((item) => item.eventType)).toEqual([AgentRunEventType.TURN_COMPLETED]);
    });
  });

  it.each(["ERROR", "UNKNOWN", undefined])("redacts credentials in failed terminal result with status %s, even without a tool", (status) => {
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
      message: "token=<redacted>",
    } });
    expect(JSON.stringify(events)).not.toMatch(/private-|UNKNOWN|provider_status|raw_usage_json/);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ kind: "turn", turnId: "turn", providerError: "token=private-error" });
  });
  it.each([
    "Individual quota reached for this model. Resets in 3h28m50s.",
    "  Workspace unavailable.  ",
    { message: "Workspace service temporarily unavailable. Try again later.", code: "UNFAMILIAR" },
    "Read limit reached. token=PRIVATE_AGY_SECRET Authorization: Bearer PRIVATE_BEARER",
    "<script>alert('runtime')</script> Workspace unavailable.",
    `Workspace unavailable. ${"Provider explanation. ".repeat(160)}`,
  ])("preserves useful terminal error text without exposing the response (%j)", (error) => {
    const converter = new AgyStreamEventConverter("run", "conversation", "gemini");
    converter.startTurn("turn");
    const terminal = converter.convert({ event: "result", result: {
      conversation_id: "conversation", status: "ERROR", error, response: "PRIVATE_RESPONSE_MARKER",
    } });
    const rawText = typeof error === "string" ? error : error.message;
    expect(terminal).toEqual([{ eventType: AgentRunEventType.ERROR, runId: "run", statusHint: "ERROR", payload: {
      turn_id: "turn", code: "AGY_TURN_ERROR", error_scope: "turn", error_effect: "terminal",
      message: rawText.trim().replace("PRIVATE_AGY_SECRET", "<redacted>").replace("PRIVATE_BEARER", "<redacted>"),
    } }]);
    expect(JSON.stringify(terminal)).not.toContain("PRIVATE_RESPONSE_MARKER");
  });
  it.each([undefined, null, "", "   ", 42, [], { message: 42 }, { message: "  ", response: "private" }].map((error) => [error]))(
    "uses only the generic fallback for unusable terminal error %j", (error) => {
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini");
      converter.startTurn("turn");
      const terminal = converter.convert({ event: "result", result: {
        conversation_id: "conversation", status: "ERROR", error, response: "PRIVATE_RESPONSE_MARKER",
      } });
      expect(terminal.map((event) => event.eventType)).toEqual([AgentRunEventType.ERROR]);
      expect(terminal[0]?.payload.message).toBe("Antigravity could not complete this turn.");
      expect(JSON.stringify(terminal)).not.toContain("PRIVATE_RESPONSE_MARKER");
    },
  );
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
  describe("MCP calls (wrapper shapes from the AGY 1.2.14 probe)", () => {
    const mcpStep = (stepIndex: number, state: string, parameters: Record<string, unknown>, rest: Record<string, unknown> = {}) =>
      ({ event: "step_update" as const, step_update: { conversation_id: "conversation", step_index: stepIndex,
        step_type: "tool", state, tool_name: "call_mcp_tool",
        tool_info: { name: "call_mcp_tool", parameters, ...rest } } });
    const start = (resolver?: AgyNativeImagePathResolver) => {
      const converter = new AgyStreamEventConverter("run", "conversation", "gemini", undefined, resolver);
      converter.startTurn("turn");
      return converter;
    };
    const toolFields = (event: { payload: Record<string, unknown> } | undefined) =>
      ({ tool_name: event?.payload.tool_name, arguments: event?.payload.arguments, invocation_id: event?.payload.invocation_id });

    describe("AutoByteus open_tab result contract", () => {
      const parameters = { ServerName: "autobyteus_agent_tools", ToolName: "open_tab",
        Arguments: { url: "about:blank", reuse_existing: false } };
      const result = { tab_id: "c1c04e", status: "opened", url: "about:blank", title: "Probe" };

      it.each([
        ["object", result],
        ["JSON text", JSON.stringify(result)],
        ["structured content", { structuredContent: result }],
        ["MCP text content", { content: [{ type: "text", text: JSON.stringify(result) }] }],
        ["reused tab", { ...result, status: "reused" }],
      ])("emits canonical %s with unchanged identity and exactly one start/terminal", (_label, output) => {
        const converter = start();
        const active = mcpStep(6, "ACTIVE", parameters);
        const done = mcpStep(6, "DONE", parameters, { output });
        const events = [...converter.convert(active), ...converter.convert(active), ...converter.convert(done)];
        expect(events.map((event) => event.eventType)).toEqual([
          AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
        ]);
        expect(events[0]?.payload).toEqual({ turn_id: "turn", invocation_id: "agy-tool-turn-6",
          tool_name: "open_tab", arguments: parameters.Arguments });
        expect(events[1]).toEqual({ eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          runId: "run", statusHint: null, payload: { ...events[0]?.payload, provider_state: "DONE",
            result: { ...result, status: _label === "reused tab" ? "reused" : "opened" } } });
        expect(converter.convert(done)).toEqual([]);
        expect(converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } })
          .map((event) => event.eventType)).toEqual([AgentRunEventType.TURN_COMPLETED]);
      });

      it.each([null, undefined, "not JSON", { status: "opened" }])(
        "does not fabricate a tab identity for output %j", (output) => {
          const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
          try {
            const events = start().convert(mcpStep(6, "DONE", parameters, { output }));
            expect(events.at(-1)?.payload.result).toEqual(output ?? null);
            expect(events.at(-1)?.payload.provider_state).toBe("DONE");
          } finally { warn.mockRestore(); }
        });

      it.each([
        ["ERROR", "navigation failed", AgentRunEventType.TOOL_EXECUTION_FAILED],
        ["DONE", "navigation failed", AgentRunEventType.TOOL_EXECUTION_FAILED],
        ["ERROR", "permission denied", AgentRunEventType.TOOL_DENIED],
        ["DONE", "permission denied", AgentRunEventType.TOOL_DENIED],
      ])("preserves %s with explicit %s instead of canonicalizing success", (state, error, eventType) => {
        const events = start().convert(mcpStep(6, state, parameters, { output: JSON.stringify(result), error }));
        expect(events.map((event) => event.eventType)).toEqual([AgentRunEventType.TOOL_EXECUTION_STARTED, eventType]);
        expect(events.at(-1)?.payload).toEqual({ ...events[0]?.payload, provider_state: state,
          error, reason: error, result: { provider_state: state, output: result } });
        expect(events.at(-1)?.statusHint).toBe("ERROR");
      });

      it.each([
        ["third-party open_tab", { ...parameters, ServerName: "other" }, "mcp__other__open_tab"],
        ["other browser tool", { ...parameters, ToolName: "navigate_to" }, "navigate_to"],
        ["non-browser MCP tool", { ...parameters, ToolName: "delegate_task" }, "delegate_task"],
        ["incomplete MCP identity", { ToolName: "open_tab" }, "call_mcp_tool"],
      ])("preserves the generic envelope for %s", (_label, args, toolName) => {
        const events = start().convert(mcpStep(6, "DONE", args, { output: result }));
        expect(events.at(-1)?.payload.tool_name).toBe(toolName);
        expect(events.at(-1)?.payload.result).toEqual({ provider_state: "DONE", output: result });
      });

      it("does not normalize a native tool named open_tab", () => {
        const message = mcpStep(6, "DONE", parameters, { output: JSON.stringify(result) });
        message.step_update.tool_name = "open_tab";
        const events = start().convert(message);
        expect(events.at(-1)?.payload.result).toEqual({ provider_state: "DONE", output: JSON.stringify(result) });
      });
    });

    it("presents an AutoByteus agent tool under its bare name and own arguments on start and success", () => {
      const converter = start();
      const parameters = { Arguments: { description: "Do the work", recipient_address: "/worker" },
        ServerName: "autobyteus_agent_tools", ToolName: "delegate_task" };
      const events = [
        ...converter.convert(mcpStep(6, "ACTIVE", parameters)),
        ...converter.convert(mcpStep(6, "DONE", parameters, { output: "{\n  \"target_agent_run_id\": \"run-x\"\n}" })),
      ];
      expect(events.map((event) => event.eventType)).toEqual([
        AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      ]);
      const expected = { tool_name: "delegate_task", invocation_id: "agy-tool-turn-6",
        arguments: { description: "Do the work", recipient_address: "/worker" } };
      expect(toolFields(events[0])).toEqual(expected);
      expect(toolFields(events[1])).toEqual(expected);
      expect(events[1]?.payload.result).toEqual({ provider_state: "DONE", output: { target_agent_run_id: "run-x" } });
      expect(events[1]?.payload.provider_state).toBe("DONE");
    });

    it("presents send_message_to with no arguments as an empty argument object", () => {
      const events = start().convert(mcpStep(3, "ACTIVE",
        { Arguments: {}, ServerName: "autobyteus_agent_tools", ToolName: "send_message_to" }));
      expect(toolFields(events[0])).toEqual({ tool_name: "send_message_to", arguments: {}, invocation_id: "agy-tool-turn-3" });
    });

    it("presents a third-party tool as mcp__<server>__<tool> and keeps plain text output unchanged", () => {
      const parameters = { Arguments: { note: "hello", options: { count: 2, tags: ["a", "b"] } },
        ServerName: "shape-test", ToolName: "echo_args" };
      const output = "ECHO:{\"note\": \"hello\", \"options\": {\"count\": 2, \"tags\": [\"a\", \"b\"]}}";
      const events = start().convert(mcpStep(6, "DONE", parameters, { output }));
      for (const event of events) {
        expect(event.payload.tool_name).toBe("mcp__shape-test__echo_args");
        expect(event.payload.arguments).toEqual({ note: "hello", options: { count: 2, tags: ["a", "b"] } });
      }
      expect(events.at(-1)?.payload.result).toEqual({ provider_state: "DONE", output });
    });

    it("reports a failed MCP call under the real tool name with the provider's error message", () => {
      const converter = start();
      const parameters = { Arguments: { reason: "probe" }, ServerName: "shape-test", ToolName: "always_fails" };
      const events = [
        ...converter.convert(mcpStep(10, "ACTIVE", parameters)),
        ...converter.convert(mcpStep(10, "ERROR", parameters, { output: "PROBE-FAILURE-9920: deliberate failure",
          error: { type: "TOOL_ERROR", message: "PROBE-FAILURE-9920: deliberate failure" } })),
      ];
      expect(events.map((event) => event.eventType)).toEqual([
        AgentRunEventType.TOOL_EXECUTION_STARTED, AgentRunEventType.TOOL_EXECUTION_FAILED,
      ]);
      expect(toolFields(events[1])).toEqual(toolFields(events[0]));
      expect(events[1]?.payload).toMatchObject({ tool_name: "mcp__shape-test__always_fails", arguments: { reason: "probe" },
        error: "PROBE-FAILURE-9920: deliberate failure", reason: "PROBE-FAILURE-9920: deliberate failure",
        result: { provider_state: "ERROR", output: "PROBE-FAILURE-9920: deliberate failure" } });
    });

    it("reports a denied MCP call under the real tool name", () => {
      const events = start().convert(mcpStep(4, "ERROR",
        { Arguments: { content: "hi", recipient_address: "/pong" }, ServerName: "autobyteus_agent_tools", ToolName: "send_message_to" },
        { error: "permission denied" }));
      expect(events.at(-1)?.eventType).toBe(AgentRunEventType.TOOL_DENIED);
      expect(events.at(-1)?.payload).toMatchObject({ tool_name: "send_message_to",
        arguments: { content: "hi", recipient_address: "/pong" }, error: "permission denied" });
    });

    it.each([
      ["missing ServerName", { ToolName: "send_message_to", Arguments: { content: "hi" } }],
      ["blank ToolName", { ServerName: "autobyteus_agent_tools", ToolName: " ", Arguments: { content: "hi" } }],
    ])("falls back to the provider presentation for a wrapper with %s and lets the turn continue", (_label, parameters) => {
      const converter = start();
      const events = [
        ...converter.convert(mcpStep(2, "ACTIVE", parameters)),
        ...converter.convert(mcpStep(2, "DONE", parameters, { output: "{\"ok\": true}" })),
      ];
      for (const event of events) {
        expect(event.payload.tool_name).toBe("call_mcp_tool");
        expect(event.payload.arguments).toEqual(parameters);
      }
      expect(events.at(-1)?.payload.result).toEqual({ provider_state: "DONE", output: "{\"ok\": true}" });
      expect(converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } })
        .at(-1)?.eventType).toBe(AgentRunEventType.TURN_COMPLETED);
    });

    it("never treats an AutoByteus MCP generate_image call as AGY's native image tool", () => {
      const resolver = vi.fn<AgyNativeImagePathResolver>();
      const events = start(resolver).convert(mcpStep(5, "DONE",
        { Arguments: { prompt: "A blue dog", output_file_path: "/tmp/dog.png" },
          ServerName: "autobyteus_agent_tools", ToolName: "generate_image" },
        { output: "{\"file_path\": \"/tmp/dog.png\"}" }));
      expect(resolver).not.toHaveBeenCalled();
      expect(events.at(-1)?.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
      expect(events.at(-1)?.payload).toMatchObject({ tool_name: "generate_image",
        arguments: { prompt: "A blue dog", output_file_path: "/tmp/dog.png" },
        result: { provider_state: "DONE", output: { file_path: "/tmp/dog.png" } } });
    });

    it("leaves native tool names, parameters and JSON-looking output untouched", () => {
      const events = start().convert({ event: "step_update", step_update: { conversation_id: "conversation",
        step_index: 2, step_type: "tool", state: "DONE", tool_name: "view_file",
        tool_info: { name: "view_file", parameters: { AbsolutePath: "/tmp/echo_args.json" }, output: "{\"a\": 1}" } } });
      expect(events.at(-1)?.payload).toMatchObject({ tool_name: "view_file",
        arguments: { AbsolutePath: "/tmp/echo_args.json" }, result: { provider_state: "DONE", output: "{\"a\": 1}" } });
    });
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
