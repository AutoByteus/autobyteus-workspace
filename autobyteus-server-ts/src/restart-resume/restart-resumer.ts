import { AgentRunEventType } from "../agent-execution/domain/agent-run-event.js";
import type { AgentRun } from "../agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import type { StandaloneRunCommandPort } from "../agent-execution/services/standalone-run-ports.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../agent-execution/domain/system-task-notification-senders.js";
import type { RootExecutionIdentity } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import { rootExecutionIdentityKey } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationRootResolver } from "../compositions/collaboration-root-resolver.js";
import { readBusyRunRecord, removeBusyRunRecord, type BusyRunEntry } from "./busy-run-record.js";
import { buildRestartNotice } from "./restart-notice.js";

/** A root's stored state, from its history catalog: why a run of that root must not be resumed, or `present`. */
export type RootHistoryState = "present" | "terminated" | "archived" | "gone";

export type ResumeReport = Readonly<{ recorded: number; notUpdate: number; skipped: number; resumed: number; failed: number }>;

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
 * Resumes, after an update restart, the runs recorded busy at the last graceful shutdown (autobyteus-285 D3,
 * REQ-002 to REQ-006). The record is deleted before any resume, so nothing is resumed twice; an entry is resumed
 * only when its own release differs from this server's. Per root, its delegated runs are resumed first, then its
 * host and members, whose notice lists the delegated runs that were accepted. Eligibility is checked again right
 * before each post. Every failure is logged and leaves the run stopped; it never throws.
 */
export class RestartResumer {
  constructor(private readonly dependencies: Readonly<{
    recordPath: string;
    version: () => string | null;
    liveRuns: Pick<AgentRunManager, "getActiveRun">;
    rootHistory: (root: RootExecutionIdentity) => Promise<RootHistoryState>;
    hosts: StandaloneRunCommandPort;
    rootResolver: CollaborationRootResolver;
    now?: () => Date;
    concurrency?: number;
  }>) {}

  async resumeAfterUpdate(): Promise<ResumeReport> {
    const empty = { recorded: 0, notUpdate: 0, skipped: 0, resumed: 0, failed: 0 };
    try {
      const read = await readBusyRunRecord(this.dependencies.recordPath);
      if (read.kind === "missing") return empty;
      // Consumed before anything else: a resume that fails or crashes the server is never repeated (REQ-005).
      try { await removeBusyRunRecord(this.dependencies.recordPath); }
      catch (error) {
        console.warn(`Restart resume skipped: the busy-run record could not be removed: ${String(error)}`);
        return empty;
      }
      if (read.kind === "invalid") {
        console.warn(`Restart resume: the busy-run record was invalid and was removed: ${read.reason}`);
        return empty;
      }
      const current = this.dependencies.version();
      const entries = read.record.entries;
      const updated = entries.filter((entry) => entry.version !== null && current !== null && entry.version !== current);
      const notUpdate = entries.length - updated.length;
      if (notUpdate) console.info(`Restart resume: ${notUpdate} recorded run(s) not resumed; the restart was not an update`);
      if (!updated.length || current === null) return { ...empty, recorded: entries.length, notUpdate };
      const outcomes = await this.resumeEntries(updated, current);
      const count = (kind: Outcome["kind"]) => outcomes.filter((outcome) => outcome.kind === kind).length;
      const report = { recorded: entries.length, notUpdate, skipped: count("skipped"), resumed: count("resumed"), failed: count("failed") };
      console.info(`Restart resume after the update to ${current}: ${report.resumed} resumed, ${report.skipped} skipped, ${report.failed} failed`);
      return report;
    } catch (error) {
      console.warn(`Restart resume failed: ${String(error)}`);
      return empty;
    }
  }

  private async resumeEntries(entries: readonly BusyRunEntry[], version: string): Promise<Outcome[]> {
    const limit = createPostLimiter(this.dependencies.concurrency ?? RESTART_RESUME_CONCURRENCY);
    const byRoot = new Map<string, BusyRunEntry[]>();
    for (const entry of entries) {
      const key = rootExecutionIdentityKey(entry.root);
      byRoot.set(key, [...(byRoot.get(key) ?? []), entry]);
    }
    const restartedAt = this.dependencies.now?.() ?? new Date();
    const perRoot = await Promise.all([...byRoot.values()].map(async (rootEntries) => {
      // Wave 1: the root's delegated runs. Waiting for them holds no post slot (only `limit` does).
      const delegated = rootEntries.filter((entry) => entry.place === "delegated");
      const first = await Promise.all(delegated.map((entry) => limit(() => this.resumeOne(entry, version, restartedAt, []))));
      const accepted = first.flatMap((outcome) => outcome.kind === "resumed" ? [outcome.displayName] : []);
      // Wave 2: the host and members, told which delegated runs are working again.
      const second = await Promise.all(rootEntries.filter((entry) => entry.place !== "delegated")
        .map((entry) => limit(() => this.resumeOne(entry, version, restartedAt, accepted))));
      return [...first, ...second];
    }));
    return perRoot.flat();
  }

  private async resumeOne(entry: BusyRunEntry, version: string, restartedAt: Date, resumedDelegated: readonly string[]): Promise<Outcome> {
    const label = `${entry.place} run '${entry.agentRunId}' of ${entry.root.rootSubjectKind} '${entry.root.rootRunId}'`;
    try {
      const reason = await this.ineligibility(entry);
      if (reason) {
        console.info(`Restart resume skipped ${label}: ${reason}`);
        return { kind: "skipped" };
      }
      const message = buildRestartNotice({ entry, version, restartedAt, resumedDelegated });
      const result = entry.place === "host" ? await this.postToHost(entry, message) : await this.postToMember(entry, message);
      if (result.accepted) {
        console.info(`Restart resume resumed ${label}`);
        return { kind: "resumed", displayName: result.displayName ? `${result.displayName} (${entry.agentRunId})` : entry.agentRunId };
      }
      console.warn(`Restart resume could not resume ${label}: ${result.message ?? result.code ?? "not accepted"}`);
      return { kind: "failed" };
    } catch (error) {
      console.warn(`Restart resume could not resume ${label}: ${String(error)}`);
      return { kind: "failed" };
    }
  }

  /** Checked right before the post: a live run already continues; a stopped, archived or deleted root is never resumed. */
  private async ineligibility(entry: BusyRunEntry): Promise<string | null> {
    if (this.dependencies.liveRuns.getActiveRun(entry.agentRunId)) return "it is already live (it received new input)";
    const state = await this.dependencies.rootHistory(entry.root);
    return state === "present" ? null : `its root is ${state === "gone" ? "no longer in history" : state}`;
  }

  /** A standalone host takes input only through its root manager; the notice is shown as a system notice once forwarded. */
  private async postToHost(entry: BusyRunEntry, message: ReturnType<typeof buildRestartNotice>): Promise<AgentOperationResult> {
    let host: AgentRun | null = null;
    const posted = await this.dependencies.hosts.postUserMessage({
      runId: entry.agentRunId,
      message,
      onActiveRunReady: (run) => { host = run; },
      postOptions: {
        lifecycleObserver: (fact) => {
          if (fact.kind !== "forwarded" || !host) return;
          const run: AgentRun = host;
          void run.publishEvent({
            eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: run.runId, statusHint: null,
            payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: message.content, ...(fact.turnId ? { turn_id: fact.turnId } : {}) },
          }).catch(() => undefined);
        },
      },
    });
    if (!posted) return { accepted: false, code: "RESTART_RESUME_ROOT_UNAVAILABLE", message: "the run cannot host a root" };
    if (posted.kind === "posted") return posted.post;
    return { accepted: false, code: "RESTART_RESUME_NOT_POSTED", message: posted.kind === "admission_failed" ? posted.message : posted.kind };
  }

  /** Members and delegated runs are woken through their root, which keeps its fences (a closed Task refuses). */
  private async postToMember(entry: BusyRunEntry, message: ReturnType<typeof buildRestartNotice>): Promise<AgentOperationResult> {
    const resolved = await this.dependencies.rootResolver.resolveOrRestore(entry.root);
    if (!resolved) return { accepted: false, code: "RESTART_RESUME_ROOT_UNAVAILABLE", message: "its root is not on this node" };
    return resolved.root.executeAgentCommand(entry.agentRunId, { kind: "post_message", message });
  }
}
