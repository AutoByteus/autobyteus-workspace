import type { BackgroundTaskKind, BackgroundTaskStatus } from '@autobyteus/agent-presentation-contracts';

export type { BackgroundTaskKind, BackgroundTaskStatus };

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
  /** ISO-8601 time the runtime first saw the task. */
  startedAt: string;
}
