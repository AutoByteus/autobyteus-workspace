import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";

/**
 * Whether a stored tool result is an interruption (autobyteus-609 D-D2): the one rule the run replay and the work journal
 * read, so a call the user stopped reads "Stopped" live and read back alike.
 *
 * It decides from what each writer already stores; no writer changes:
 * - the node's trace sequencer (`runtime-tool-trace-sequencer.ts`, every runtime whose events the node records: Codex,
 *   Claude, Antigravity, the ACP runtimes) writes the interrupt event as the result's `sourceEvent`:
 *   `TOOL_EXECUTION_INTERRUPTED` for a call the runtime reports interrupted, `TURN_INTERRUPTED` for a call still open
 *   when the turn is interrupted;
 * - the native memory manager (`autobyteus-ts` `MemoryManager.finalizePendingToolCallsForTurn`, called only on an
 *   interrupt) writes `source: "AgentTurnInterruptedEvent"`. That package cannot import this file, so it keeps its own
 *   literal;
 * - a record that carries only an error: the interruption texts (`user_interrupt`, and the sequencer's default text).
 *
 * A failed call writes neither signal and stays a failure; a denial is decided before this rule.
 */
export const TOOL_EXECUTION_INTERRUPTED_TEXT = "Tool execution interrupted.";

const INTERRUPTION_SOURCE_EVENTS: ReadonlySet<string> = new Set([
  AgentRunEventType.TOOL_EXECUTION_INTERRUPTED,
  AgentRunEventType.TURN_INTERRUPTED,
  "AgentTurnInterruptedEvent",
]);

const INTERRUPTION_ERRORS: ReadonlySet<string> = new Set(["user_interrupt", TOOL_EXECUTION_INTERRUPTED_TEXT]);

export const isInterruptedToolResult = (result: Readonly<{ sourceEvent?: string | null; error?: string | null }>): boolean =>
  INTERRUPTION_SOURCE_EVENTS.has(result.sourceEvent ?? "") || INTERRUPTION_ERRORS.has(result.error?.trim() ?? "");
