import { AgentCreationError } from "../errors.js";
import type { AgentRun } from "../domain/agent-run.js";
import type {
  AgentRunResourceManager,
  AgentRunResourceReleaseResult,
} from "../services/agent-run-resource-manager.js";

export type AgentRunRemovalReason =
  | "inactive_discovery"
  | "explicit_termination"
  | "inactive_replacement"
  | "stop_all"
  | "registration_rollback";

export type AgentRunRemovalResult =
  | Readonly<{
      kind: "removed";
      run: AgentRun;
      reason: AgentRunRemovalReason;
      resources: AgentRunResourceReleaseResult;
    }>
  | Readonly<{
      kind: "not_found";
      runId: string;
      reason: AgentRunRemovalReason;
    }>
  | Readonly<{
      kind: "identity_mismatch";
      runId: string;
      expectedRun: AgentRun;
      currentRun: AgentRun;
      reason: AgentRunRemovalReason;
    }>;

export type ActiveAgentRunSnapshot = Readonly<{
  activeRuns: readonly AgentRun[];
  pruningErrors: readonly AgentRunRemovalCleanupError[];
}>;

export class AgentRunRemovalCleanupError extends AggregateError {
  constructor(readonly removalResult: Extract<AgentRunRemovalResult, { kind: "removed" }>) {
    super(
      removalResult.resources.errors,
      `Agent run '${removalResult.run.runId}' was removed, but resource cleanup failed.`,
    );
    this.name = "AgentRunRemovalCleanupError";
  }
}

export class ActiveAgentRunRegistry {
  private readonly activeRuns = new Map<string, AgentRun>();

  constructor(private readonly resourceManager: AgentRunResourceManager) {}

  register(run: AgentRun): void {
    const existing = this.activeRuns.get(run.runId) ?? null;
    if (existing?.isActive()) {
      throw new AgentCreationError(`Agent run '${run.runId}' is already active.`);
    }
    if (existing) {
      this.assertCleanupSucceeded(this.removeIfCurrent({
        runId: run.runId,
        expectedRun: existing,
        reason: "inactive_replacement",
      }));
    }

    this.activeRuns.set(run.runId, run);
    try {
      this.resourceManager.attach(run);
    } catch (error) {
      const rollback = this.removeIfCurrent({
        runId: run.runId,
        expectedRun: run,
        reason: "registration_rollback",
      });
      if (rollback.kind === "removed" && rollback.resources.errors.length > 0) {
        throw new AggregateError(
          [error, ...rollback.resources.errors],
          `Agent run '${run.runId}' registration and rollback failed.`,
        );
      }
      throw error;
    }
  }

  getActiveRun(runId: string): AgentRun | null {
    const run = this.activeRuns.get(runId) ?? null;
    if (!run) {
      return null;
    }
    if (run.isActive()) {
      return run;
    }
    this.assertCleanupSucceeded(this.removeIfCurrent({
      runId,
      expectedRun: run,
      reason: "inactive_discovery",
    }));
    return null;
  }

  listActiveRuns(): readonly AgentRun[] {
    const snapshot = this.snapshotActiveRuns();
    if (snapshot.pruningErrors.length > 0) {
      throw new AggregateError(
        snapshot.pruningErrors,
        "Failed to prune inactive agent runs.",
      );
    }
    return snapshot.activeRuns;
  }

  snapshotActiveRuns(): ActiveAgentRunSnapshot {
    const activeRuns: AgentRun[] = [];
    const pruningErrors: AgentRunRemovalCleanupError[] = [];
    for (const runId of Array.from(this.activeRuns.keys())) {
      const run = this.activeRuns.get(runId) ?? null;
      if (!run) {
        continue;
      }
      if (run.isActive()) {
        activeRuns.push(run);
        continue;
      }
      const removal = this.removeIfCurrent({
        runId,
        expectedRun: run,
        reason: "inactive_discovery",
      });
      if (removal.kind === "removed" && removal.resources.errors.length > 0) {
        pruningErrors.push(new AgentRunRemovalCleanupError(removal));
      }
    }
    return Object.freeze({
      activeRuns: Object.freeze(activeRuns),
      pruningErrors: Object.freeze(pruningErrors),
    });
  }

  removeIfCurrent(input: {
    runId: string;
    expectedRun: AgentRun;
    reason: AgentRunRemovalReason;
  }): AgentRunRemovalResult {
    const currentRun = this.activeRuns.get(input.runId) ?? null;
    if (!currentRun) {
      return Object.freeze({
        kind: "not_found" as const,
        runId: input.runId,
        reason: input.reason,
      });
    }
    if (currentRun !== input.expectedRun) {
      return Object.freeze({
        kind: "identity_mismatch" as const,
        runId: input.runId,
        expectedRun: input.expectedRun,
        currentRun,
        reason: input.reason,
      });
    }
    this.activeRuns.delete(input.runId);
    return Object.freeze({
      kind: "removed" as const,
      run: currentRun,
      reason: input.reason,
      resources: this.resourceManager.release(input.runId, currentRun),
    });
  }

  assertCleanupSucceeded(result: AgentRunRemovalResult): void {
    if (result.kind === "removed" && result.resources.errors.length > 0) {
      throw new AgentRunRemovalCleanupError(result);
    }
  }
}
