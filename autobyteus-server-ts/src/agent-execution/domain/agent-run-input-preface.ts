import type { AgentRun } from "./agent-run.js";

/**
 * A platform notice waiting for a run's next external input. `text` goes to the provider in
 * front of the input; `presentation` is published as the run's system notice once delivered.
 */
export type AgentRunPreface = Readonly<{
  id: string;
  text: string;
  presentation: Readonly<{ senderId: string; content: string }>;
}>;

/** The dispatch a notice would ride on: a turn start, or input appended to the active turn. */
export type AgentRunPrefaceContext = Readonly<{
  dispatchKind: "start_turn" | "append_to_active_turn";
}>;

/**
 * The port through which `AgentRun` combines a pending platform notice into the provider message
 * of its next external input (one dispatch, one turn). `AgentRun` knows nothing about what the
 * notice is about.
 *
 * - `takePreface`: hands over the run's pending notice (now in flight), or null. The context
 *   names the dispatch kind; a source whose notice belongs to a turn start returns null for an
 *   append.
 * - `prefaceDelivered`: the dispatch carrying it was forwarded to the provider.
 * - `prefaceReturned`: it was not (rejected, requeued, failed, interrupted before forwarding);
 *   the notice is pending again for the next input.
 *
 * Implementations must not throw; `AgentRun` still guards every call, so a failing port never
 * affects the input itself.
 */
export interface AgentRunInputPreface {
  takePreface(run: AgentRun, context: AgentRunPrefaceContext): Promise<AgentRunPreface | null>;
  prefaceDelivered(run: AgentRun, preface: AgentRunPreface, turnId: string | null): void;
  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void;
}
