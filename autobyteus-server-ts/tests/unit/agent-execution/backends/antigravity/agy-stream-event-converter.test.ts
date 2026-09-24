import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AgyStreamEventConverter } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import { parseAgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentSegmentLifecycleEventTransformer } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { AgentSegmentLifecycleState } from "../../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { AgentTurnLifecycleState } from "../../../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.js";

const fixture = (name: string) => fs.readFileSync(path.resolve(process.cwd(), `../tickets/in-progress/antigravity-cli-runtime-redesign-20260924/agy-tool-event-capture/${name}.stdout.jsonl`), "utf8")
  .split("\n").filter(Boolean).map((line) => parseAgyStreamMessage(line)).filter((event) => event !== null);

const convert = (name: string) => {
  const messages = fixture(name);
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
    expect(events.filter((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_COMPLETED)).toHaveLength(2);
    expect(events.every((event) => event.eventType !== AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(true);
    expect(events.filter((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT).map((event) => event.payload.delta).join(""))
      .toContain("FIRST-TURN-TOOL");
  });
  it("keeps headless denial failed despite result SUCCESS", () => {
    const events = convert("run_command_denied");
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_DENIED)).toBe(true);
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(false);
    expect(events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED)).toBe(true);
  });
  it("does not fabricate underlying command exit success", () => {
    const events = convert("run_command_nonzero");
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_COMPLETED)).toBe(true);
    expect(events.some((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(false);
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
