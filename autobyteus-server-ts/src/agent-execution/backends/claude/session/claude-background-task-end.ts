import type { AgentBackgroundTaskEndReason } from "../../../domain/agent-background-task.js";

/** How a Claude background task ended, as far as its notification says. */
export type ClaudeTaskEnd = Readonly<{
  endReason: AgentBackgroundTaskEndReason | null;
  exitCode: number | null;
}>;

export const NO_CLAUDE_TASK_END: ClaudeTaskEnd = Object.freeze({ endReason: null, exitCode: null });

/**
 * Claude Code 2.1.325 writes a background command's end only into the notification's summary text
 * (`Background command "<description>" completed (exit code N[: note])`, `... failed with exit code N`,
 * `... was stopped after reaching its background time limit`, `... was stopped because the system is running low
 * on memory`, `... was stopped`). The patterns match the summary's end, so a description with any text cannot
 * fake them. This file is the only place that knows the wording; unknown text gives no reason (RSK-002).
 */
const BACKGROUND_COMMAND_PREFIX = 'Background command "';
const COMPLETED_EXIT_CODE = /" completed \(exit code (-?\d+)(?::[\s\S]*)?\)$/;
const FAILED_EXIT_CODE = /" failed with exit code (-?\d+)$/;
const STOP_CAUSES: ReadonlyArray<readonly [RegExp, AgentBackgroundTaskEndReason]> = [
  [/" was stopped after reaching its background time limit$/, "time_limit"],
  [/" was stopped because the system is running low on memory$/, "low_memory"],
];

/** The SDK's `reason: 'worker_restart'`: the process that ran the task restarted, so the task ended with it. */
const WORKER_RESTART_REASON = "worker_restart";

/** Reads one `task_notification` (`status`, `summary`, `reason`) into a runtime-neutral end reason and exit code. */
export const readClaudeTaskEnd = (notification: Readonly<{
  status: string | null;
  summary: string | null;
  reason: string | null;
}>): ClaudeTaskEnd => {
  if (notification.reason === WORKER_RESTART_REASON) {
    return Object.freeze({ endReason: "run_ended", exitCode: null });
  }
  const summary = notification.summary?.trim() ?? "";
  if (!summary.startsWith(BACKGROUND_COMMAND_PREFIX)) {
    return NO_CLAUDE_TASK_END;
  }
  const exitCodePattern = notification.status === "completed" ? COMPLETED_EXIT_CODE
    : notification.status === "failed" ? FAILED_EXIT_CODE : null;
  if (exitCodePattern) {
    const match = exitCodePattern.exec(summary);
    return match ? Object.freeze({ endReason: null, exitCode: Number(match[1]) }) : NO_CLAUDE_TASK_END;
  }
  if (notification.status === "stopped") {
    const cause = STOP_CAUSES.find(([pattern]) => pattern.test(summary));
    return cause ? Object.freeze({ endReason: cause[1], exitCode: null }) : NO_CLAUDE_TASK_END;
  }
  return NO_CLAUDE_TASK_END;
};
