import { AgentCreationError, AgentRunActivationError } from "../errors.js";
import type { AgentRun } from "../domain/agent-run.js";
import type {
  AgentRunResourceManager,
  AgentRunResourceReleaseResult,
} from "../services/agent-run-resource-manager.js";
import type { AgentRunCandidateAbortResult } from "../services/agent-run-activation-candidate.js";

export type AgentRunActivationClaim = Readonly<{
  runId: string;
  token: symbol;
}>;

export type AgentRunActivationClaimState =
  | "constructing"
  | "prepared"
  | "quarantined";

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

type PendingActivation = {
  claim: AgentRunActivationClaim;
  state: AgentRunActivationClaimState;
  run: AgentRun | null;
  quarantineError: Error | null;
};

export type AgentRunStopSnapshot = Readonly<{
  activeRuns: readonly AgentRun[];
  preparedRuns: readonly Readonly<{
    claim: AgentRunActivationClaim;
    run: AgentRun;
    quarantined: boolean;
  }>[];
  pruningErrors: readonly AgentRunRemovalCleanupError[];
}>;

export class AgentRunRemovalCleanupError extends AggregateError {
  constructor(
    readonly removalResult: Extract<AgentRunRemovalResult, { kind: "removed" }>,
  ) {
    super(
      removalResult.resources.errors,
      `Agent run '${removalResult.run.runId}' was removed, but resource cleanup failed.`,
    );
    this.name = "AgentRunRemovalCleanupError";
  }
}

export class AgentRunActivationRegistry {
  private readonly activeRuns = new Map<string, AgentRun>();
  private readonly pending = new Map<string, PendingActivation>();
  private claimsBlocked = false;

  constructor(private readonly resourceManager: AgentRunResourceManager) {}

  claim(runId: string): AgentRunActivationClaim {
    if (this.claimsBlocked) {
      throw new AgentRunActivationError(
        "AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT",
        "Agent run activation is stopping and cannot accept a new claim.",
      );
    }
    if (this.getActiveRun(runId)) {
      throw new AgentRunActivationError(
        "AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT",
        `Agent run '${runId}' is already active.`,
      );
    }
    const existing = this.pending.get(runId);
    if (existing) {
      throw new AgentRunActivationError(
        existing.state === "quarantined"
          ? "AGENT_RUN_ACTIVATION_CLEANUP_FAILED"
          : "AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT",
        existing.state === "quarantined"
          ? `Agent run '${runId}' is quarantined after uncertain cleanup.`
          : `Agent run '${runId}' already has a private activation candidate.`,
        { cause: existing.quarantineError ?? undefined },
      );
    }
    const claim = Object.freeze({ runId, token: Symbol(runId) });
    this.pending.set(runId, {
      claim,
      state: "constructing",
      run: null,
      quarantineError: null,
    });
    return claim;
  }

  markPrepared(claim: AgentRunActivationClaim, run: AgentRun): void {
    const record = this.requireClaim(claim);
    if (record.state !== "constructing" || run.runId !== claim.runId) {
      throw this.quarantine(claim, new Error("AgentRun preparation claim mismatch."));
    }
    this.resourceManager.attach(run);
    record.run = run;
    record.state = "prepared";
  }

  publish(claim: AgentRunActivationClaim, run: AgentRun): AgentRun {
    const record = this.requireClaim(claim);
    if (record.state !== "prepared" || record.run !== run || !run.isActive()) {
      throw this.quarantine(claim, new Error("AgentRun publication claim mismatch."));
    }
    if (this.activeRuns.has(run.runId)) {
      throw this.quarantine(claim, new Error("AgentRun publication invariant failed."));
    }
    this.activeRuns.set(run.runId, run);
    this.pending.delete(run.runId);
    return run;
  }

  releaseClaim(claim: AgentRunActivationClaim): boolean {
    const record = this.pending.get(claim.runId);
    if (!record || record.claim.token !== claim.token || record.run) return false;
    this.pending.delete(claim.runId);
    return true;
  }

  releasePrepared(
    claim: AgentRunActivationClaim,
    run: AgentRun,
  ): AgentRunResourceReleaseResult {
    const record = this.pending.get(claim.runId);
    if (!record || record.claim.token !== claim.token || record.run !== run) {
      return this.resourceManager.release(claim.runId, run);
    }
    return this.resourceManager.release(claim.runId, run);
  }

  completeAbort(
    claim: AgentRunActivationClaim,
    run: AgentRun | null,
    result: AgentRunCandidateAbortResult,
  ): void {
    const record = this.pending.get(claim.runId);
    if (!record || record.claim.token !== claim.token) return;
    if (run && record.run && record.run !== run) {
      this.quarantine(claim, new Error("AgentRun abort identity mismatch."));
      return;
    }
    if (result.kind === "aborted") {
      this.pending.delete(claim.runId);
      return;
    }
    record.state = "quarantined";
    record.quarantineError = result.error;
  }

  getActiveRun(runId: string): AgentRun | null {
    const run = this.activeRuns.get(runId) ?? null;
    if (!run) return null;
    if (run.isActive()) return run;
    this.assertCleanupSucceeded(this.removeIfCurrent({
      runId,
      expectedRun: run,
      reason: "inactive_discovery",
    }));
    return null;
  }

  listActiveRunIds(): string[] {
    const snapshot = this.snapshotForStop();
    if (snapshot.pruningErrors.length > 0) {
      throw new AggregateError(snapshot.pruningErrors, "Failed to prune inactive agent runs.");
    }
    return snapshot.activeRuns.map((run) => run.runId);
  }

  removeIfCurrent(input: {
    runId: string;
    expectedRun: AgentRun;
    reason: AgentRunRemovalReason;
  }): AgentRunRemovalResult {
    const currentRun = this.activeRuns.get(input.runId) ?? null;
    if (!currentRun) {
      return Object.freeze({ kind: "not_found" as const, runId: input.runId, reason: input.reason });
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

  blockNewClaims(): void {
    this.claimsBlocked = true;
  }

  snapshotForStop(): AgentRunStopSnapshot {
    const activeRuns: AgentRun[] = [];
    const pruningErrors: AgentRunRemovalCleanupError[] = [];
    for (const [runId, run] of Array.from(this.activeRuns.entries())) {
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
    const preparedRuns = Array.from(this.pending.values()).flatMap((record) =>
      record.run
        ? [{
            claim: record.claim,
            run: record.run,
            quarantined: record.state === "quarantined",
          }]
        : [],
    );
    return Object.freeze({
      activeRuns: Object.freeze(activeRuns),
      preparedRuns: Object.freeze(preparedRuns),
      pruningErrors: Object.freeze(pruningErrors),
    });
  }

  assertCleanupSucceeded(result: AgentRunRemovalResult): void {
    if (result.kind === "removed" && result.resources.errors.length > 0) {
      throw new AgentRunRemovalCleanupError(result);
    }
  }

  private requireClaim(claim: AgentRunActivationClaim): PendingActivation {
    const record = this.pending.get(claim.runId);
    if (!record || record.claim.token !== claim.token) {
      throw new AgentCreationError(`Agent run '${claim.runId}' activation claim is no longer current.`);
    }
    return record;
  }

  private quarantine(
    claim: AgentRunActivationClaim,
    error: Error,
  ): AgentRunActivationError {
    const record = this.pending.get(claim.runId);
    if (record?.claim.token === claim.token) {
      record.state = "quarantined";
      record.quarantineError = error;
    }
    return new AgentRunActivationError(
      "AGENT_RUN_ACTIVATION_CLEANUP_FAILED",
      `Agent run '${claim.runId}' cleanup could not be confirmed; activation is quarantined.`,
      { cause: error },
    );
  }
}
