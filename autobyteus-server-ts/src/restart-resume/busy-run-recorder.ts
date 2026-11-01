import type { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { readBusyRunRecord, writeBusyRunRecord, type BusyRunEntry } from "./busy-run-record.js";

/**
 * Records the runs that are mid-turn at the start of a graceful shutdown (autobyteus-285 D2, REQ-001), before
 * anything is interrupted. Only the process's general runs are seen (application scopes have their own managers),
 * and only runs held by a collaboration root are recorded (DEC-005). It writes only when it has entries, merging
 * with a record not yet consumed, and never deletes. It never throws.
 */
export class BusyRunRecorder {
  constructor(private readonly dependencies: Readonly<{
    liveRuns: Pick<AgentRunManager, "listActiveRuns" | "getActiveRun">;
    roots: Pick<ActiveCollaborationRootDirectory, "placeOf">;
    recordPath: string;
    version: () => string | null;
    now?: () => Date;
  }>) {}

  async record(): Promise<void> {
    try {
      const entries = this.busyEntries();
      if (!entries.length) return;
      const recorded = new Set(entries.map((entry) => entry.agentRunId));
      const existing = await readBusyRunRecord(this.dependencies.recordPath);
      if (existing.kind === "invalid") console.warn(`Busy-run record replaced; the previous one was invalid: ${existing.reason}`);
      const kept = existing.kind === "present" ? existing.record.entries.filter((entry) => !recorded.has(entry.agentRunId)) : [];
      await writeBusyRunRecord(this.dependencies.recordPath, { entries: [...kept, ...entries] });
      console.info(`Recorded ${entries.length} busy run(s) for restart resume`
        + (kept.length ? ` (kept ${kept.length} not yet resumed)` : ""));
    } catch (error) {
      console.warn(`Busy runs could not be recorded for restart resume: ${String(error)}`);
    }
  }

  private busyEntries(): BusyRunEntry[] {
    const recordedAt = (this.dependencies.now?.() ?? new Date()).toISOString();
    const version = this.dependencies.version();
    return this.dependencies.liveRuns.listActiveRuns().flatMap((agentRunId) => {
      const status = this.dependencies.liveRuns.getActiveRun(agentRunId)?.getStatusSnapshot().status;
      if (status !== "initializing" && status !== "running") return [];
      const placed = this.dependencies.roots.placeOf(agentRunId);
      if (!placed) return [];
      return [Object.freeze({ root: placed.root, agentRunId, place: placed.place, status, recordedAt, version })];
    });
  }
}
