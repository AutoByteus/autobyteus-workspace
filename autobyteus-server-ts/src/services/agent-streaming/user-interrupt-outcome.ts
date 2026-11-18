import {
  NO_ACTIVE_TURN,
  RUN_NOT_ACTIVE,
  type AgentOperationResult,
} from "../../agent-execution/domain/agent-operation-result.js";

/**
 * The answer to a user's Stop (`INTERRUPT_GENERATION`) that finds nothing to stop: the run, its Team or its Org is not
 * running. A Stop's goal is that nothing generates, and that holds (autobyteus-533 REQ-001).
 */
export const NOTHING_TO_INTERRUPT: AgentOperationResult = Object.freeze({ accepted: true });

const NOTHING_TO_STOP_CODES: ReadonlySet<string> = new Set([NO_ACTIVE_TURN, RUN_NOT_ACTIVE]);

/**
 * The user interrupt command's outcome from a domain or relayed interrupt result: no active turn, or a run that is not
 * running, is nothing to stop and so accepted; every other result is passed on as it is. Only the user command boundary
 * applies it: the domain's own result stays truthful for its internal callers (termination, the root shutdown fence).
 */
export const userInterruptOutcome = (result: AgentOperationResult): AgentOperationResult =>
  !result.accepted && NOTHING_TO_STOP_CODES.has(result.code ?? "") ? NOTHING_TO_INTERRUPT : result;
