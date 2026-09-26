import { asArray, asObject, asString } from "../claude-runtime-shared.js";

/**
 * How far a completion recorded mid CLI turn has progressed towards the model:
 * a later tool_result then an assistant frame (before any Stop) mean a model call
 * that included the queued notification ran (probe J).
 */
type CompletionProgress = "awaiting_tool_result" | "awaiting_assistant" | "outside_cli_turn";

type BackgroundTaskCompletion = {
  taskId: string;
  description: string;
  status: string;
  outputFile: string | null;
  sequence: number;
  progress: CompletionProgress;
};

export type ClaudeBackgroundTaskCarryOver = Readonly<{
  taskIds: readonly string[];
  notes: readonly string[];
}>;

const NO_PENDING_COMPLETION_NOTICE = "Claude started a turn on its own.";

const noticeLine = (completion: BackgroundTaskCompletion): string =>
  `Background task completed: ${completion.description} (${completion.status})`;

const carryOverNote = (completion: BackgroundTaskCompletion): string =>
  `[System note: background task ${completion.taskId} (${completion.description}) finished with status ` +
  `${completion.status} while you were stopped` +
  (completion.outputFile ? `; its output is at ${completion.outputFile}.]` : ".]");

/**
 * Pure owner of the Claude CLI's background-task view: the live background set and
 * background completions the model may not have seen yet. Emits no turn events.
 */
export class ClaudeBackgroundTaskRegistry {
  private readonly backgroundTaskIds = new Set<string>();
  private readonly descriptions = new Map<string, string>();
  private pending: BackgroundTaskCompletion[] = [];
  private carryOver: BackgroundTaskCompletion[] = [];
  private sequence = 0;
  private cliTurnOpen = false;

  /** Last assigned completion sequence; completions recorded later have a larger one. */
  get currentSequence(): number {
    return this.sequence;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  observeTaskFrame(frame: Record<string, unknown>): void {
    const subtype = asString(frame.subtype);
    if (subtype === "background_tasks_changed") {
      for (const task of asArray(frame.tasks)) {
        const entry = asObject(task);
        const taskId = asString(entry?.task_id);
        if (!taskId) continue;
        this.backgroundTaskIds.add(taskId);
        const description = asString(entry?.description);
        if (description) this.descriptions.set(taskId, description);
      }
      return;
    }
    const taskId = asString(frame.task_id);
    if (!taskId) {
      return;
    }
    if (subtype === "task_started") {
      const description = asString(frame.description);
      if (description) this.descriptions.set(taskId, description);
      if (frame.is_backgrounded === true) this.backgroundTaskIds.add(taskId);
      return;
    }
    if (subtype === "task_updated") {
      if (asObject(frame.patch)?.is_backgrounded === true) this.backgroundTaskIds.add(taskId);
      return;
    }
    if (subtype === "task_notification") {
      this.recordCompletion(taskId, frame);
    }
  }

  /** Tracks consumption of pending completions by the running CLI turn (SPINE-3). */
  observeConversationFrame(frameType: "user" | "assistant", interruptRequested: boolean): void {
    if (interruptRequested) {
      return;
    }
    if (frameType === "user") {
      for (const completion of this.pending) {
        if (completion.progress === "awaiting_tool_result") completion.progress = "awaiting_assistant";
      }
      return;
    }
    this.pending = this.pending.filter((completion) => completion.progress !== "awaiting_assistant");
  }

  beginCliTurn(): void {
    this.cliTurnOpen = true;
    for (const completion of this.pending) completion.progress = "outside_cli_turn";
  }

  /**
   * A CLI turn the CLI ran for queued task notifications (`origin.kind === "task-notification"`)
   * delivered every completion recorded before that turn began.
   */
  endCliTurn(resultOrigin: unknown): void {
    this.cliTurnOpen = false;
    if (asString(asObject(resultOrigin)?.kind) === "task-notification") {
      this.pending = this.pending.filter((completion) => completion.progress !== "outside_cli_turn");
    }
    for (const completion of this.pending) completion.progress = "outside_cli_turn";
  }

  /** Notice text for a provider-initiated turn; drains every pending completion. */
  drainForProviderTurn(): string {
    const lines = this.pending.map(noticeLine);
    this.pending = [];
    return lines.length > 0 ? lines.join("\n") : NO_PENDING_COMPLETION_NOTICE;
  }

  /**
   * On an interrupted settle, completions recorded up to `stopSequence` may have been
   * dequeued by `cancelQueued`: announce them and carry them into the next input. Later
   * completions survived the cancel and stay pending for the CLI's own turn (IC-2).
   */
  announceStopped(stopSequence: number): string | null {
    const stopped = this.pending.filter((completion) => completion.sequence <= stopSequence);
    if (stopped.length === 0) {
      return null;
    }
    this.pending = this.pending.filter((completion) => completion.sequence > stopSequence);
    this.carryOver.push(...stopped);
    return stopped
      .map((completion) => `${noticeLine(completion)} — Claude was stopped before reporting it`)
      .join("\n");
  }

  peekCarryOver(): ClaudeBackgroundTaskCarryOver {
    return {
      taskIds: this.carryOver.map((completion) => completion.taskId),
      notes: this.carryOver.map(carryOverNote),
    };
  }

  clearCarryOver(taskIds: readonly string[]): void {
    const sent = new Set(taskIds);
    this.carryOver = this.carryOver.filter((completion) => !sent.has(completion.taskId));
  }

  /** The process closed or exited; its background tasks died with it. */
  clear(): void {
    this.backgroundTaskIds.clear();
    this.descriptions.clear();
    this.pending = [];
    this.carryOver = [];
    this.cliTurnOpen = false;
  }

  private recordCompletion(taskId: string, frame: Record<string, unknown>): void {
    if (!this.backgroundTaskIds.has(taskId)) {
      return; // foreground tasks also emit task_notification (probe J)
    }
    if (this.pending.some((completion) => completion.taskId === taskId)) {
      return;
    }
    this.sequence += 1;
    this.pending.push({
      taskId,
      description: this.descriptions.get(taskId) ?? asString(frame.summary) ?? taskId,
      status: asString(frame.status) ?? "completed",
      outputFile: asString(frame.output_file),
      sequence: this.sequence,
      progress: this.cliTurnOpen ? "awaiting_tool_result" : "outside_cli_turn",
    });
  }
}
