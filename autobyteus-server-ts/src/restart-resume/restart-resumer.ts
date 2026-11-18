import type { ClosedTaskEntryFence } from "../agent-collaboration/execution/task/closed-task-fence.js";
import type { AgentOperationResult } from "../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import type { AgentRunInputOptions } from "../agent-execution/input/agent-run-input-contract.js";
import type { RootExecutionIdentity } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { rootExecutionIdentityKey } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import type { DelegationIndex } from "../agent-collaboration/delegation/delegation-index.js";
import { runReferenceOf } from "../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { CollaborationRootResolver } from "../compositions/collaboration-root-resolver.js";
import type { StandaloneAgentRunRoot } from "../standalone-agent-run-root/domain/standalone-agent-run-root.js";
import { readBusyRunRecord, removeBusyRunRecord, type BusyRunEntry } from "./busy-run-record.js";
import { buildRestartNotice, restartNoticeLifecycleObserver } from "./restart-notice.js";
import { restartCauseOf } from "./restart-cause.js";
import type { PendingRestartReminder } from "./restart-reminder-record.js";
import type { ClaimedRestartReminder, RestartReminderService } from "./restart-reminder-service.js";

/** A root's stored state, from its history catalog: why a run of that root must not be resumed, or `present`. */
export type RootHistoryState = "present" | "terminated" | "archived" | "gone";

/** What the take kept for the wake after listening: the entries recorded by another release. */
export type PreviousSession = Readonly<{ recorded: number; updateEntries: readonly BusyRunEntry[] }>;

/** `reminded`: entries told with their next input (not an update); the others were woken, skipped or failed. */
export type ResumeReport = Readonly<{ recorded: number; reminded: number; skipped: number; resumed: number; failed: number }>;

/** At most this many resume posts run at once (DEC-002). */
export const RESTART_RESUME_CONCURRENCY = 3;

type Outcome = Readonly<{ kind: "resumed"; displayName: string } | { kind: "skipped" } | { kind: "failed" }>;

/** A semaphore over posts: the work holds a slot only while it runs. */
const createPostLimiter = (limit: number) => {
  let running = 0;
  const waiting: Array<() => void> = [];
  return async <T>(work: () => Promise<T>): Promise<T> => {
    if (running >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    running += 1;
    try { return await work(); }
    finally { running -= 1; waiting.shift()?.(); }
  };
};

/**
 * Tells the runs of the previous session that they were restarted (autobyteus-448, extending autobyteus-285 D3).
 *
 * `takePreviousSession()` runs right after the server is built, before this session records anything: it reads the
 * busy-run record, gives every entry its cause (`restartCauseOf`), hands all of them to the reminder service, which
 * persists them, and only then removes the record; the reminders of runs that must get none are pruned. Each run is
 * then told exactly once, by whichever comes first: its next input (the reminder rides it), or, for an update entry,
 * the wake after listening (`resumeAfterRestart`). The wake resumes the roots bottom-up along `delegatedFrom` (a delegated
 * run before the run that delegated to it, autobyteus-461 DS-9), at most 3 posts at a time; each run is restored
 * without posting, checked again, then its claimed reminder is posted as an input the run admits only as its first
 * (input that reached it first already carried the reminder). Every failure is logged; it never throws.
 */
export class RestartResumer {
  constructor(private readonly dependencies: Readonly<{
    recordPath: string;
    version: () => string | null;
    liveRuns: Pick<AgentRunManager, "getActiveRun">;
    rootHistory: (root: RootExecutionIdentity) => Promise<RootHistoryState>;
    rootResolver: CollaborationRootResolver;
    /** Who delegated to whom (the Task entries); `null` when the Task records are not loaded (nothing is related). */
    tree: Pick<DelegationIndex, "parentOf">;
    /** DS-15 (SR-070): a run whose Task is closed takes no input, the reminder included; it is not restored. */
    closedTasks: Pick<ClosedTaskEntryFence, "refusal">;
    reminders: Pick<RestartReminderService, "add" | "prune" | "claim" | "settleClaim">;
    now?: () => Date;
    concurrency?: number;
  }>) {}

  async takePreviousSession(): Promise<PreviousSession | null> {
    try {
      const read = await readBusyRunRecord(this.dependencies.recordPath);
      if (read.kind === "missing") return null;
      if (read.kind === "invalid") {
        console.warn(`Restart reminder: the busy-run record was invalid and is removed: ${read.reason}`);
        await removeBusyRunRecord(this.dependencies.recordPath);
        return null;
      }
      const current = this.dependencies.version();
      const restartedAt = (this.dependencies.now?.() ?? new Date()).toISOString();
      const { entries, shutdownAt } = read.record;
      const reminders: PendingRestartReminder[] = entries.map((entry) => Object.freeze({
        root: entry.root, agentRunId: entry.agentRunId, place: entry.place,
        cause: restartCauseOf(entry, shutdownAt, current), version: current, restartedAt, interruptedTurn: entry.status !== "idle",
      }));
      try { await this.dependencies.reminders.add(reminders); }
      catch (error) {
        // R-6: the record stays, but the new session's next change rewrites it; only this log line is certain.
        console.warn(`Restart reminder: the reminders could not be saved; the busy-run record is kept: ${String(error)}`);
        return null;
      }
      try { await removeBusyRunRecord(this.dependencies.recordPath); }
      catch (error) { console.warn(`Restart reminder: the busy-run record could not be removed: ${String(error)}`); }
      // REQ-005: a run whose Task is closed, or whose root is archived, terminated or gone, gets none.
      await this.dependencies.reminders.prune(async (reminder) =>
        !(await this.dependencies.closedTasks.refusal(reminder.root)) && await this.dependencies.rootHistory(reminder.root) === "present");
      const updateEntries = entries.filter((entry) => restartCauseOf(entry, shutdownAt, current) === "update");
      console.info(`Restart reminder: ${entries.length} run(s) to tell, ${updateEntries.length} woken after the update`);
      return Object.freeze({ recorded: entries.length, updateEntries });
    } catch (error) {
      console.warn(`Restart reminder: the previous session could not be taken: ${String(error)}`);
      return null;
    }
  }

  async resumeAfterRestart(previous: PreviousSession | null): Promise<ResumeReport> {
    const recorded = previous?.recorded ?? 0;
    const updateEntries = previous?.updateEntries ?? [];
    const report = { recorded, reminded: recorded - updateEntries.length, skipped: 0, resumed: 0, failed: 0 };
    const current = this.dependencies.version();
    if (!updateEntries.length || current === null) return report;
    try {
      const outcomes = await this.resumeEntries(updateEntries);
      const count = (kind: Outcome["kind"]) => outcomes.filter((outcome) => outcome.kind === kind).length;
      const done = { ...report, skipped: count("skipped"), resumed: count("resumed"), failed: count("failed") };
      console.info(`Restart resume after the update to ${current}: ${done.resumed} resumed, ${done.skipped} skipped, ${done.failed} failed`);
      return done;
    } catch (error) {
      console.warn(`Restart resume failed: ${String(error)}`);
      return report;
    }
  }

  private async resumeEntries(entries: readonly BusyRunEntry[]): Promise<Outcome[]> {
    const limit = createPostLimiter(this.dependencies.concurrency ?? RESTART_RESUME_CONCURRENCY);
    const tree = this.dependencies.tree;
    const parentKeyOf = (root: RootExecutionIdentity): string | null => {
      const reference = runReferenceOf(root);
      const parent = reference ? tree.parentOf(reference) : null;
      return parent ? rootExecutionIdentityKey(parent.delegatingRun) : null;
    };
    const byRoot = new Map<string, BusyRunEntry[]>();
    for (const entry of entries) {
      const key = rootExecutionIdentityKey(entry.root);
      byRoot.set(key, [...(byRoot.get(key) ?? []), entry]);
    }
    // Depth along `delegatedFrom` among the roots to resume: a delegated run is deeper than its delegator.
    const depth = new Map<string, number>();
    const depthOf = (key: string, root: RootExecutionIdentity, seen = new Set<string>()): number => {
      const known = depth.get(key);
      if (known !== undefined) return known;
      const parentKey = parentKeyOf(root);
      const parentRoot = parentKey && !seen.has(parentKey) ? byRoot.get(parentKey)?.[0]?.root : undefined;
      const value = parentKey && parentRoot ? 1 + depthOf(parentKey, parentRoot, new Set([...seen, key])) : 0;
      depth.set(key, value);
      return value;
    };
    for (const [key, rootEntries] of byRoot) depthOf(key, rootEntries[0]!.root);
    // The resumed runs, by the run that delegated to them, for that run's notice.
    const resumedBy = new Map<string, string[]>();
    const outcomes: Outcome[] = [];
    for (const level of [...new Set(depth.values())].sort((a, b) => b - a)) {
      const roots = [...byRoot.entries()].filter(([key]) => depth.get(key) === level);
      const results = await Promise.all(roots.map(async ([key, rootEntries]) => {
        const resumedDelegated = resumedBy.get(key) ?? [];
        const done = await Promise.all(rootEntries.map((entry) => limit(() => this.resumeOne(entry, resumedDelegated))));
        const parentKey = parentKeyOf(rootEntries[0]!.root);
        const names = done.flatMap((outcome) => outcome.kind === "resumed" ? [outcome.displayName] : []);
        if (parentKey && names.length) resumedBy.set(parentKey, [...(resumedBy.get(parentKey) ?? []), ...names]);
        return done;
      }));
      outcomes.push(...results.flat());
    }
    return outcomes;
  }

  private async resumeOne(entry: BusyRunEntry, resumedDelegated: readonly string[]): Promise<Outcome> {
    const label = `${entry.place} run '${entry.agentRunId}' of ${entry.root.rootSubjectKind} '${entry.root.rootRunId}'`;
    let claim: ClaimedRestartReminder | null = null;
    try {
      // A cheap pre-filter before restoring; the guards are the re-check after the restore and the first-input rule.
      if (this.dependencies.liveRuns.getActiveRun(entry.agentRunId)) return this.skipped(label, "it is already live (it received new input)");
      const fenced = await this.dependencies.closedTasks.refusal(entry.root);
      if (fenced) return this.skipped(label, fenced.code === "TASK_AGENT_RESOURCE_CLOSED" ? "its Task is closed" : "its Task record cannot be read");
      const before = await this.dependencies.rootHistory(entry.root);
      if (before !== "present") return this.skipped(label, describeState(before));
      const resolved = await this.dependencies.rootResolver.resolveOrRestore(entry.root);
      if (!resolved) return this.failed(label, "its root is not on this node");
      if (entry.place === "host" && resolved.kind !== "agent") return this.failed(label, "its root is not a standalone root");
      // Restore without posting: a host is made ready now; a member starts on the reminder itself.
      const host = entry.place === "host" && resolved.kind === "agent" ? await resolved.root.ensureHostReady() : null;
      const after = await this.dependencies.rootHistory(entry.root);
      if (after !== "present") return this.skipped(label, `${describeState(after)} (after the restore)`);
      // Exactly once (REQ-005): input that came first already carried the reminder, so there is none to claim.
      claim = await this.dependencies.reminders.claim(entry.agentRunId);
      if (!claim) return this.skipped(label, "its next input carried the reminder");
      const message = buildRestartNotice({ agentRunId: entry.agentRunId, facts: claim.reminder, resumedDelegated });
      const postOptions: AgentRunInputOptions = {
        lifecycleObserver: restartNoticeLifecycleObserver(() => host ?? this.dependencies.liveRuns.getActiveRun(entry.agentRunId), message),
        onlyAsFirstInput: true,
      };
      // A standalone root has one agent, its host; a Team or Org root posts to its member.
      const result = resolved.kind === "agent"
        ? host ? postedResult(await resolved.root.postHostUserMessage({ message, postOptions }))
          : { accepted: false as const, code: "RUN_NOT_FOUND", message: `AgentRun '${entry.agentRunId}' is not this Agent run's agent.` }
        : await resolved.root.executeAgentCommand(entry.agentRunId, { kind: "post_message", message, postOptions });
      if (result.accepted) {
        this.dependencies.reminders.settleClaim(claim, "delivered");
        console.info(`Restart resume resumed ${label}`);
        return { kind: "resumed", displayName: result.displayName ? `${result.displayName} (${entry.agentRunId})` : entry.agentRunId };
      }
      // Not delivered: pending again, so the run's next input carries it.
      this.dependencies.reminders.settleClaim(claim, "returned");
      if (result.code === "AGENT_RUN_INPUT_NOT_FIRST") return this.skipped(label, "the run already had input; its next input carries the reminder");
      return this.failed(label, result.message ?? result.code ?? "not accepted");
    } catch (error) {
      if (claim) this.dependencies.reminders.settleClaim(claim, "returned");
      return this.failed(label, String(error));
    }
  }

  private skipped(label: string, reason: string): Outcome {
    console.info(`Restart resume skipped ${label}: ${reason}`);
    return { kind: "skipped" };
  }

  private failed(label: string, reason: string): Outcome {
    console.warn(`Restart resume could not resume ${label}: ${reason}`);
    return { kind: "failed" };
  }
}

const describeState = (state: RootHistoryState): string =>
  `its root is ${state === "gone" ? "no longer in history" : state}`;

/** A host post's outcome as an operation result; a mention admission does not apply to the notice. */
const postedResult = (posted: Awaited<ReturnType<StandaloneAgentRunRoot["postHostUserMessage"]>>): AgentOperationResult =>
  posted.kind === "posted" ? posted.post
    : { accepted: false, code: "RESTART_RESUME_NOT_POSTED", message: posted.kind === "admission_failed" ? posted.message : posted.kind };
