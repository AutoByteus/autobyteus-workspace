// autobyteus-609 D-D2: the node's one rule for "this stored tool result is an interruption", read by the run replay and
// the work journal. Production: `isInterruptedToolResult`.
import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import {
  isInterruptedToolResult,
  TOOL_EXECUTION_INTERRUPTED_TEXT,
} from "../../../src/agent-memory/domain/tool-result-interruption.js";

describe("isInterruptedToolResult (autobyteus-609 D-D2)", () => {
  it.each([
    ["the sequencer, a call the runtime reports interrupted", { sourceEvent: AgentRunEventType.TOOL_EXECUTION_INTERRUPTED, error: "stopped by the user" }],
    ["the sequencer, a call open when the turn is interrupted", { sourceEvent: AgentRunEventType.TURN_INTERRUPTED, error: "the run was shut down" }],
    ["native, a call open when the turn is interrupted", { sourceEvent: "AgentTurnInterruptedEvent", error: "any reason" }],
    ["an error-only record with user_interrupt", { sourceEvent: null, error: " user_interrupt " }],
    ["an error-only record with the sequencer's text", { error: TOOL_EXECUTION_INTERRUPTED_TEXT }],
  ])("%s: interrupted", (_case, result) => {
    expect(isInterruptedToolResult(result)).toBe(true);
  });

  it.each([
    ["a failed call", { sourceEvent: AgentRunEventType.TOOL_EXECUTION_FAILED, error: "exit 1" }],
    ["a native failure", { sourceEvent: "ToolResultEvent", error: "boom" }],
    ["a success", { sourceEvent: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, error: null }],
    ["nothing stored", {}],
  ])("%s: not interrupted", (_case, result) => {
    expect(isInterruptedToolResult(result)).toBe(false);
  });
});
