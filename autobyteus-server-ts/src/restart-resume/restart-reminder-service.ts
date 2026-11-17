import { randomUUID } from "node:crypto";
import type { AgentRun } from "../agent-execution/domain/agent-run.js";
import type { AgentRunPlatformNoticeSource } from "../agent-execution/domain/agent-run-platform-notices.js";
import type { AgentRunPreface, AgentRunPrefaceContext } from "../agent-execution/domain/agent-run-input-preface.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../agent-execution/domain/system-task-notification-senders.js";
import { buildRestartNoticeText } from "./restart-notice.js";
import {
  readRestartReminderRecord,
  writeRestartReminderRecord,
  type PendingRestartReminder,
} from "./restart-reminder-record.js";

/** A reminder the wake after an update holds while it posts it; settle it as delivered or returned. */
export type ClaimedRestartReminder = Readonly<{ claimId: string; reminder: PendingRestartReminder }>;

/** `pending`: deliverable; `claimed`: the wake is posting it; `inFlight`: it rides an input as its preface. */
type Held = { reminder: PendingRestartReminder; state: "pending" | "claimed" | "inFlight"; id: string | null };

/**
 * The restart reminders still to tell (autobyteus-448 DS-004), the only owner of `restart-reminders.json`. Each run's
 * reminder is delivered exactly once, by whichever comes first: its next external input (the reminder rides it as a
 * preface, through `AgentRunPlatformNotices`), or, after an update, the resumer's wake, which claims it and posts it
 * as the run's first input. Only a pending reminder can be taken or claimed; one that is not delivered is pending
 * again. Every change is persisted, so a reminder survives the next restart until it is delivered.
 */
export class RestartReminderService implements AgentRunPlatformNoticeSource {
  private readonly held = new Map<string, Held>();
  private readonly loaded: Promise<void>;
  private writes: Promise<void> = Promise.resolve();

  constructor(private readonly dependencies: Readonly<{ recordPath: string }>) {
    this.loaded = this.load();
  }

  /**
   * Adds the previous session's reminders. A newer restart replaces a run's older pending reminder, keeping
   * `interruptedTurn` when either had it. Resolves once they are persisted; throws when they could not be.
   */
  async add(reminders: readonly PendingRestartReminder[]): Promise<void> {
    await this.loaded;
    for (const reminder of reminders) {
      const existing = this.held.get(reminder.agentRunId);
      const merged = existing
        ? { ...reminder, interruptedTurn: reminder.interruptedTurn || existing.reminder.interruptedTurn }
        : reminder;
      this.held.set(reminder.agentRunId, { reminder: Object.freeze(merged), state: existing?.state ?? "pending", id: existing?.id ?? null });
    }
    await this.persist();
  }

  /** Drops the reminders of runs that must get none (closed Task, root archived, terminated or gone). Never throws. */
  async prune(keep: (reminder: PendingRestartReminder) => Promise<boolean>): Promise<void> {
    try {
      await this.loaded;
      let dropped = 0;
      for (const [agentRunId, held] of [...this.held]) {
        if (held.state !== "pending" || await keep(held.reminder)) continue;
        if (this.held.get(agentRunId) === held && held.state === "pending") { this.held.delete(agentRunId); dropped += 1; }
      }
      if (dropped) await this.persist();
    } catch (error) {
      console.warn(`Restart reminders could not be pruned: ${String(error)}`);
    }
  }

  /** The wake after an update takes the run's pending reminder; `null` when its next input already carried it. */
  async claim(agentRunId: string): Promise<ClaimedRestartReminder | null> {
    await this.loaded;
    const held = this.held.get(agentRunId);
    if (!held || held.state !== "pending") return null;
    held.state = "claimed";
    held.id = randomUUID();
    return Object.freeze({ claimId: held.id, reminder: held.reminder });
  }

  /** `delivered`: the wake was accepted; `returned`: refused (the run had input first) or failed, pending again. */
  settleClaim(claim: ClaimedRestartReminder, outcome: "delivered" | "returned"): void {
    this.settle(claim.reminder.agentRunId, claim.claimId, outcome);
  }

  // --- the run's next external input (AgentRunInputPreface): a reminder rides either dispatch kind ---

  async takePreface(run: AgentRun, _context?: AgentRunPrefaceContext): Promise<AgentRunPreface | null> {
    await this.loaded;
    const held = this.held.get(run.runId);
    if (!held || held.state !== "pending") return null;
    held.state = "inFlight";
    held.id = randomUUID();
    const text = buildRestartNoticeText({ ...held.reminder, resumedDelegated: [] });
    return Object.freeze({ id: held.id, text, presentation: Object.freeze({ senderId: RESTART_RESUME_NOTICE_SENDER_ID, content: text }) });
  }

  prefaceDelivered(run: AgentRun, preface: AgentRunPreface): void {
    this.settle(run.runId, preface.id, "delivered");
  }

  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void {
    this.settle(run.runId, preface.id, "returned");
  }

  runPublished(): void {}

  runReleased(): void {}

  private settle(agentRunId: string, id: string, outcome: "delivered" | "returned"): void {
    const held = this.held.get(agentRunId);
    if (!held || held.id !== id || held.state === "pending") return;
    if (outcome === "returned") {
      held.state = "pending";
      held.id = null;
      return;
    }
    this.held.delete(agentRunId);
    void this.persist().catch((error) => console.warn(`Restart reminders could not be saved after a delivery: ${String(error)}`));
  }

  private async load(): Promise<void> {
    const read = await readRestartReminderRecord(this.dependencies.recordPath);
    if (read.kind === "invalid") console.warn(`Restart reminders were unreadable and are replaced: ${read.reason}`);
    if (read.kind !== "present") return;
    for (const reminder of read.reminders) this.held.set(reminder.agentRunId, { reminder, state: "pending", id: null });
  }

  /** Writes every reminder still to tell, one write after another. */
  private persist(): Promise<void> {
    const next = this.writes.then(() =>
      writeRestartReminderRecord(this.dependencies.recordPath, [...this.held.values()].map((held) => held.reminder)));
    this.writes = next.catch(() => undefined);
    return next;
  }
}
