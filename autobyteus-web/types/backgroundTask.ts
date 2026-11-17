import type { BackgroundTaskEndReason, BackgroundTaskKind, BackgroundTaskStatus } from '@autobyteus/agent-presentation-contracts';

export type { BackgroundTaskEndReason, BackgroundTaskKind, BackgroundTaskStatus };

/**
 * One background task of a run (work a runtime keeps running beyond its turn), as last
 * reported by the server. Runtime-neutral: the UI never interprets the runtime kind.
 */
export interface BackgroundTask {
  taskId: string;
  kind: BackgroundTaskKind;
  description: string;
  /** Exact shell command the task runs; null when unknown or not applicable. */
  command: string | null;
  status: BackgroundTaskStatus;
  /** Final summary the runtime reported; null while running. */
  summary: string | null;
  /** Why the task ended, when the runtime says so; null while running or when no reason was reported. */
  endReason: BackgroundTaskEndReason | null;
  /** The command's exit code, when the runtime reports one; null while running or when there is none. */
  exitCode: number | null;
  /** ISO-8601 time the runtime first saw the task. */
  startedAt: string;
}
