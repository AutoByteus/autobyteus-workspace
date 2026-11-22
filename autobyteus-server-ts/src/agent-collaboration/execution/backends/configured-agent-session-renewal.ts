import type { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import { SavedRuntimeSessionMissingError } from "../../../agent-execution/errors.js";
import type {
  ConfiguredAgentActivationOperation,
  ConfiguredAgentActivationPlanner,
} from "./configured-agent-activation-planner.js";

/**
 * The member side of a session renewal (autobyteus-599, DS-002; REQ-006): when the restore of a member's saved runtime session
 * fails with that runtime's own "not found" (`SavedRuntimeSessionMissingError` for exactly the session the operation restored),
 * and the failed operation's release is confirmed, the planner begins the renewal: a fresh session of the same runtime and
 * model behind the lost-session marker. Any other failure, a quarantined cleanup (an `AggregateError`, not the typed error) or
 * a release that is not confirmed is rethrown unchanged, so the member fails as before.
 */
export const beginMemberSessionRenewal = async (input: {
  failure: unknown;
  failed: ConfiguredAgentActivationOperation;
  planner: ConfiguredAgentActivationPlanner;
  config: AgentRunConfig;
  /** The member's AutoByteus run ID, for the log line. */
  runId: string;
}): Promise<ConfiguredAgentActivationOperation> => {
  const { failure, failed } = input;
  const lost = failed.restoring;
  if (!lost || !(failure instanceof SavedRuntimeSessionMissingError) || failure.platformAgentRunId !== lost) throw failure;
  if ((await failed.operation.releasePrivate()).kind !== "released") throw failure;
  console.warn("RUNTIME_SESSION_LOST", { runId: input.runId, runtimeKind: failure.runtimeKind, lostPlatformAgentRunId: lost });
  return input.planner.beginSessionRenewal(input.config, lost);
};
