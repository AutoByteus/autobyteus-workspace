import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRunInputOptions } from "../../../agent-execution/input/agent-run-input-contract.js";
import type { RuntimeSwitchCause } from "../../../run-history/store/agent-run-metadata-types.js";
import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";

/**
 * An automatic runtime switch of one agent of a live run (autobyteus-646 R-1): the launch it continues on, why (stored
 * with its pending switch, R-7), and the continue message posted to it as a system input (C-5).
 */
export type AgentRuntimeSwitchRequest = Readonly<{
  /** The launch that failed (the event's runtime and model): the root acts only while the agent is still on it (R-12). */
  from: Readonly<{ runtimeKind: string; llmModelIdentifier: string }>;
  launch: Readonly<{ runtimeKind: RuntimeKind; llmModelIdentifier: string; llmConfig: Readonly<Record<string, unknown>> | null }>;
  cause: RuntimeSwitchCause;
  notice: AgentInputUserMessage;
  /** Passed to the post unchanged: the observer that publishes the continue notice once forwarded (R-10). */
  postOptions?: AgentRunInputOptions;
}>;

/**
 * How a root's switch ended: switched (the continue message was posted); the agent was not quiet (nothing changed; the
 * caller may try again after its next idle status); or failed, with the reason (before the pending switch was written
 * the run is as it was; after, the switch applies at its next input).
 */
export type AgentRuntimeSwitchOutcome =
  | Readonly<{ kind: "switched" }>
  | Readonly<{ kind: "not_quiet" }>
  /** R-12: the agent is no longer on the failed launch, or a switch is already pending; nothing changed. */
  | Readonly<{ kind: "already_switched" }>
  | Readonly<{ kind: "failed"; reason: string }>;
