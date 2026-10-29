import { AgentRunEventType, type AgentRunEvent } from "../../domain/agent-run-event.js";
import { TOOL_LIST_UPDATE_NOTICE_SENDER_ID } from "../../domain/system-task-notification-senders.js";
import type { AgentRunBackendInputDispatchResult } from "../../input/agent-run-input-contract.js";

/** The code of a turn-start dispatch that failed because the runtime session could not be reopened. */
export const RUNTIME_SESSION_REOPEN_FAILED = "RUNTIME_SESSION_REOPEN_FAILED";

/** The action of the failure notice: the web offers a restart (stop, then restore) of the run. */
export const RESTART_RUN_NOTICE_ACTION = "restart_run";

export const RUNTIME_SESSION_REOPEN_FAILED_NOTICE = "Couldn't give this run its new tools.";

/**
 * The run's notice that its runtime session could not be reopened with its new tools (Codex,
 * Grok). The web shows it with a "Restart this run with the new tools" button.
 */
export const buildRuntimeSessionReopenFailedNotice = (runId: string): AgentRunEvent => ({
  eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
  runId,
  payload: {
    sender_id: TOOL_LIST_UPDATE_NOTICE_SENDER_ID,
    content: RUNTIME_SESSION_REOPEN_FAILED_NOTICE,
    action: RESTART_RUN_NOTICE_ACTION,
  },
  statusHint: null,
});

/** The failed dispatch: the input is not sent, because the runtime session lacks the new tools. */
export const runtimeSessionReopenFailedResult = (
  runtimeLabel: string,
  error: unknown,
): AgentRunBackendInputDispatchResult => ({
  forwarded: false,
  code: RUNTIME_SESSION_REOPEN_FAILED,
  message: `${runtimeLabel} could not reopen its session with the new tools: ${error instanceof Error ? error.message : String(error)}`,
  turnId: null,
});

/** Whether two tool name lists hold the same names. */
export const isSameToolNameSet = (left: readonly string[], right: readonly string[]): boolean => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return leftSet.size === rightSet.size && [...leftSet].every((name) => rightSet.has(name));
};
