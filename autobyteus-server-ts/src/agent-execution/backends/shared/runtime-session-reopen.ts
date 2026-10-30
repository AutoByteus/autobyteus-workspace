import type { AgentRunBackendInputDispatchResult } from "../../input/agent-run-input-contract.js";

/** The code of a turn-start dispatch that failed because the runtime session could not be reopened. */
export const RUNTIME_SESSION_REOPEN_FAILED = "RUNTIME_SESSION_REOPEN_FAILED";

/**
 * The failed dispatch of a turn start whose runtime session could not be reopened with the run's
 * new tools (Codex, Grok). The input is not sent: it would reach a session without the new tools.
 * The message is shown as every failed message is; the next turn start tries again.
 */
export const runtimeSessionReopenFailedResult = (error: unknown): AgentRunBackendInputDispatchResult => ({
  forwarded: false,
  code: RUNTIME_SESSION_REOPEN_FAILED,
  message: `Couldn't give this run its new tools (${error instanceof Error ? error.message : String(error)}). `
    + "Send your message again to retry, or stop and resume the run.",
  turnId: null,
});

/** Whether two tool name lists hold the same names. */
export const isSameToolNameSet = (left: readonly string[], right: readonly string[]): boolean => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return leftSet.size === rightSet.size && [...leftSet].every((name) => rightSet.has(name));
};
