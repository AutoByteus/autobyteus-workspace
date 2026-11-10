/**
 * A background task of a native run: a command started with `run_bash(run_in_background: true)`, or an `&` job
 * of a foreground `run_bash` call that was still running when the call's foreground part ended.
 */
export interface BackgroundTaskStart {
  /** The task's process id: `kill <pid>` stops it. */
  pid: number;
  /** The `run_bash` command text of the call that started it (no job text is parsed). */
  command: string;
  effectiveCwd: string;
  /** The call's output log; every task of one call shares it. */
  outputFile: string;
  /** ISO-8601 start time. */
  startedAt: string;
}

/** How a background task ended: its exit code, the signal that killed it, or why its end is unknown. */
export type BackgroundTaskOutcome = { exitCode: number } | { signal: string } | { error: string };

export interface BackgroundTaskEnd {
  pid: number;
  command: string;
  outcome: BackgroundTaskOutcome;
  durationMs: number;
  outputFile: string;
  /** The call's output log's last lines when the task ended (tasks of the same call share it). */
  lastLines: string;
}

/** The result of a foreground `run_bash` call. */
export class TerminalResult {
  constructor(
    public stdout: string,
    public stderr: string,
    public exitCode: number | null,
    public timedOut: boolean,
    public effectiveCwd: string,
    /** `&` jobs still running when the foreground part ended. */
    public backgroundTasksStarted: BackgroundTaskStart[] = [],
    /** Background tasks of this agent that ended while this call ran. */
    public backgroundTasksEnded: BackgroundTaskEnd[] = []
  ) {}

  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      exitCode: this.exitCode,
      effectiveCwd: this.effectiveCwd
    };
    if (this.stdout !== '') json.stdout = this.stdout;
    if (this.stderr !== '') json.stderr = this.stderr;
    if (this.timedOut) json.timedOut = this.timedOut;
    if (this.backgroundTasksStarted.length > 0) json.backgroundTasksStarted = this.backgroundTasksStarted;
    if (this.backgroundTasksEnded.length > 0) json.backgroundTasksEnded = this.backgroundTasksEnded;
    return json;
  }
}

/** The result of `run_bash(run_in_background: true)`. */
export type BackgroundCommandStarted = {
  pid: number;
  status: 'running';
  effectiveCwd: string;
  outputFile: string;
};
