import { asArray, asObject, asString } from "../claude-runtime-shared.js";
import type {
  AgentBackgroundTask,
  AgentBackgroundTaskKind,
  AgentBackgroundTaskStatus,
} from "../../../domain/agent-background-task.js";

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

export type ClaudeBackgroundTaskChangeListener = (task: AgentBackgroundTask) => void;

/**
 * Raw CLI `task_type` -> runtime-neutral kind. Mirrors the CLI's own friendly labels
 * (SDK 0.3.280: local_bash=shell, local_agent=subagent, local_workflow=workflow,
 * monitor_mcp/monitor_ws=monitor); every other type is `other`.
 */
const toBackgroundTaskKind = (taskType: string | null): AgentBackgroundTaskKind => {
  switch (taskType) {
    case "local_bash":
      return "shell";
    case "local_agent":
      return "subagent";
    case "local_workflow":
      return "workflow";
    default:
      return taskType?.includes("monitor") ? "monitor" : "other";
  }
};

const TERMINAL_UPDATE_STATUSES: Readonly<Record<string, AgentBackgroundTaskStatus>> = {
  completed: "completed",
  failed: "failed",
  killed: "stopped",
};

const notificationStatus = (status: string | null): AgentBackgroundTaskStatus =>
  status === "failed" ? "failed" : status === "stopped" ? "stopped" : "completed";

const nonEmpty = (value: string | null): string | null => (value && value.length > 0 ? value : null);

const NO_PENDING_COMPLETION_NOTICE = "Claude started a turn on its own.";

const noticeLine = (completion: BackgroundTaskCompletion): string =>
  `Background task completed: ${completion.description} (${completion.status})`;

const carryOverNote = (completion: BackgroundTaskCompletion): string =>
  `[System note: background task ${completion.taskId} (${completion.description}) finished with status ` +
  `${completion.status} while you were stopped` +
  (completion.outputFile ? `; its output is at ${completion.outputFile}.]` : ".]");

/**
 * Pure owner of the Claude CLI's background-task view: the live background set, the
 * per-task snapshot shown to the user, and background completions the model may not
 * have seen yet. Emits no turn events; reports every snapshot change through
 * `onBackgroundTaskChanged`. Free of I/O: time comes from the injected clock.
 */
export class ClaudeBackgroundTaskRegistry {
  private readonly backgroundTaskIds = new Set<string>();
  private readonly descriptions = new Map<string, string>();
  private readonly taskTypes = new Map<string, string>();
  private readonly view = new Map<string, AgentBackgroundTask>();
  private pending: BackgroundTaskCompletion[] = [];
  private carryOver: BackgroundTaskCompletion[] = [];
  private sequence = 0;
  private cliTurnOpen = false;

  constructor(
    private readonly onBackgroundTaskChanged: ClaudeBackgroundTaskChangeListener,
    private readonly now: () => Date = () => new Date(),
  ) {}

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
      // Absence from the set does not end a task: a terminal frame follows (probes J/O).
      for (const task of asArray(frame.tasks)) {
        const entry = asObject(task);
        const taskId = asString(entry?.task_id);
        if (!taskId) continue;
        this.backgroundTaskIds.add(taskId);
        this.recordIdentity(taskId, asString(entry?.description), asString(entry?.task_type));
        this.enterBackground(taskId);
      }
      return;
    }
    const taskId = asString(frame.task_id);
    if (!taskId) {
      return;
    }
    if (subtype === "task_started") {
      this.recordIdentity(taskId, asString(frame.description), asString(frame.task_type));
      if (frame.is_backgrounded === true) {
        this.backgroundTaskIds.add(taskId);
        this.enterBackground(taskId);
      }
      return;
    }
    if (subtype === "task_updated") {
      const patch = asObject(frame.patch);
      if (patch?.is_backgrounded === true) {
        this.backgroundTaskIds.add(taskId);
        this.enterBackground(taskId);
      }
      const terminal = TERMINAL_UPDATE_STATUSES[asString(patch?.status) ?? ""];
      if (terminal) this.finishTask(taskId, terminal, nonEmpty(asString(patch?.error)));
      return;
    }
    if (subtype === "task_notification") {
      this.finishTask(taskId, notificationStatus(asString(frame.status)), nonEmpty(asString(frame.summary)));
      this.recordCompletion(taskId, frame);
    }
    // task_progress is ignored: it changes no snapshot field (QR-002).
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
    for (const task of [...this.view.values()]) {
      if (task.status === "running") this.publish({ ...task, status: "stopped" });
    }
    this.view.clear();
    this.taskTypes.clear();
    this.backgroundTaskIds.clear();
    this.descriptions.clear();
    this.pending = [];
    this.carryOver = [];
    this.cliTurnOpen = false;
  }

  private recordIdentity(taskId: string, description: string | null, taskType: string | null): void {
    if (description) this.descriptions.set(taskId, description);
    if (taskType) this.taskTypes.set(taskId, taskType);
    const task = this.view.get(taskId);
    if (task && task.description.length === 0 && description) this.publish({ ...task, description });
  }

  /** First sight of a background task adds it as running. */
  private enterBackground(taskId: string): void {
    if (this.view.has(taskId)) {
      return;
    }
    this.publish({
      taskId,
      kind: toBackgroundTaskKind(this.taskTypes.get(taskId) ?? null),
      description: this.descriptions.get(taskId) ?? "",
      status: "running",
      summary: null,
      startedAt: this.now().toISOString(),
    });
  }

  /** Foreground tasks are never in the view, so their terminal frames change nothing. */
  private finishTask(taskId: string, status: AgentBackgroundTaskStatus, summary: string | null): void {
    const task = this.view.get(taskId);
    if (!task) {
      return;
    }
    if (task.status === "running") {
      this.publish({ ...task, status, summary });
      return;
    }
    if (task.summary === null && summary !== null) {
      this.publish({ ...task, summary });
    }
  }

  private publish(task: AgentBackgroundTask): void {
    const snapshot = Object.freeze({ ...task });
    this.view.set(snapshot.taskId, snapshot);
    this.onBackgroundTaskChanged(snapshot);
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
