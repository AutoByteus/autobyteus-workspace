import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AgyStreamEventConverter } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import { parseAgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentSegmentLifecycleEventTransformer } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { AgentSegmentLifecycleState } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { AgentTurnLifecycleState } from "../../../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.js";

const fixture = (name: string, directory = "agy-tool-event-capture") => fs.readFileSync(path.resolve(process.cwd(), `../tickets/in-progress/antigravity-cli-runtime-redesign-20260924/${directory}/${name}.stdout.jsonl`), "utf8")
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
