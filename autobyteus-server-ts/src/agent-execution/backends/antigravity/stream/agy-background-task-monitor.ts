import type { AgentBackgroundTask } from "../../../domain/agent-background-task.js";
import {
  scanAgyTaskExitMessages,
  type AgyTaskExitMessage,
  type AgyTaskExitMessageScan,
} from "./agy-task-exit-message-reader.js";

/** A tool step AGY left open when its turn ended (a daemon still running in the background). */
export type AgyBackgroundToolStep = Readonly<{ stepIndex: number; toolName: string; commandLine: string | null }>;

export type AgyBackgroundTaskMonitorOptions = Readonly<{
  runId: string;
  conversationId: string;
  /** Receives every changed snapshot; called synchronously from `track`, `stopAll` and polls. */
  emit: (tasks: readonly AgentBackgroundTask[]) => void;
  scanExitMessages?: (skipFiles: ReadonlySet<string>) => AgyTaskExitMessageScan;
  pollIntervalMs?: number;
  now?: () => Date;
}>;

const DEFAULT_POLL_INTERVAL_MS = 2_000;

/**
 * Owns the Antigravity background tasks of one run. AGY's stream never reports a daemon's
 * exit, so while any task runs this polls AGY's conversation message files and finishes a
 * task when its exit message appears (exit code 0 -> completed, otherwise failed). When AGY
 * stops, every task still running becomes stopped; an unreadable or unknown message format
 * therefore never produces a false completion.
 */
export class AgyBackgroundTaskMonitor {
  private readonly running = new Map<number, AgentBackgroundTask>();
  private readonly settledFiles = new Set<string>();
  /** Exit messages seen so far by step; a step can exit before its turn reports it open. */
  private readonly exits = new Map<number, AgyTaskExitMessage>();
  private readonly scanExitMessages: (skipFiles: ReadonlySet<string>) => AgyTaskExitMessageScan;
  private readonly pollIntervalMs: number;
  private readonly now: () => Date;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private problemLogged = false;

  constructor(private readonly options: AgyBackgroundTaskMonitorOptions) {
    this.scanExitMessages = options.scanExitMessages
      ?? ((skipFiles) => scanAgyTaskExitMessages(options.conversationId, skipFiles));
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.now = options.now ?? (() => new Date());
  }

  /** Registers steps still open at turn end as running tasks and polls for their exit at once. */
  track(steps: readonly AgyBackgroundToolStep[]): void {
    if (this.stopped) return;
    const started: AgentBackgroundTask[] = [];
    for (const step of steps) {
      if (this.running.has(step.stepIndex)) continue;
      const task: AgentBackgroundTask = Object.freeze({
        taskId: `${this.options.conversationId}/task-${step.stepIndex}`,
        kind: step.toolName === "run_command" ? "shell" : "other",
        description: step.commandLine ?? step.toolName,
        command: step.commandLine,
        status: "running",
        summary: null,
        startedAt: this.now().toISOString(),
      });
      this.running.set(step.stepIndex, task);
      started.push(task);
    }
    if (started.length === 0) return;
    this.options.emit(started);
    this.schedule(0);
  }

  /** AGY stopped: every running task becomes stopped and the monitor stays inert. */
  stopAll(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.clearTimer();
    const stopped = [...this.running.values()].map((task) => Object.freeze({ ...task, status: "stopped" as const }));
    this.running.clear();
    if (stopped.length > 0) this.options.emit(stopped);
  }

  private poll(): void {
    this.timer = null;
    if (this.stopped || this.running.size === 0) return;
    let scan: AgyTaskExitMessageScan;
    try {
      scan = this.scanExitMessages(this.settledFiles);
    } catch (error) {
      scan = { settledFiles: [], exits: [], problem: `SCAN_FAILED:${String(error)}` };
    }
    for (const file of scan.settledFiles) this.settledFiles.add(file);
    for (const exit of scan.exits) this.exits.set(exit.stepIndex, exit);
    if (scan.problem && !this.problemLogged) {
      this.problemLogged = true;
      console.warn(`AGY_BACKGROUND_TASK_MESSAGES_UNREADABLE run=${this.options.runId} problem=${scan.problem}`);
    }
    const finished: AgentBackgroundTask[] = [];
    for (const [stepIndex, task] of this.running) {
      const exit = this.exits.get(stepIndex);
      if (!exit) continue;
      this.running.delete(stepIndex);
      finished.push(Object.freeze({ ...task, status: exit.exitCode === 0 ? "completed" : "failed", summary: exit.summary }));
    }
    if (finished.length > 0) this.options.emit(finished);
    if (this.running.size > 0 && !this.stopped) this.schedule(this.pollIntervalMs);
  }

  private schedule(delayMs: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => this.poll(), delayMs);
    this.timer.unref?.();
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
