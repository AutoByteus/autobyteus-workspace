import type { AgentRunBackend } from "../backends/agent-run-backend.js";
import type { AgentRunEventDispatchQueue } from "../events/agent-run-event-dispatch-queue.js";
import type { AgentTurnLifecycleState } from "../events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import type { AgentSegmentLifecycleState } from "../events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { getDefaultAgentRunEventPipeline } from "../events/default-agent-run-event-pipeline.js";
import type {
  AgentRunInputAdmissionState,
  AgentRunInputDispatchClaim,
} from "../input/agent-run-input-admission-state.js";
import type { AgentOperationResult } from "./agent-operation-result.js";
import type { AgentRunInterruptState } from "./agent-run-interrupt-state.js";
import { AgentRunRootShutdownFence } from "./agent-run-root-shutdown-fence.js";
import { createPreparedAgentRunTermination, type PreparedAgentRunTermination } from "./prepared-agent-run-termination.js";

type AgentRunTerminationOptions = Readonly<{
  runId: string;
  backend: Pick<AgentRunBackend, "getLifecycleSnapshot" | "terminate">;
  dispatchQueue: AgentRunEventDispatchQueue;
  lifecycleState: AgentTurnLifecycleState;
  segmentLifecycleState: AgentSegmentLifecycleState;
  inputAdmissionState: AgentRunInputAdmissionState;
  interruptState: AgentRunInterruptState;
  inputDispatch: Readonly<{
    /** AgentRun's in-flight provider input dispatch. */
    active(): Promise<void> | null;
    /** The claim of AgentRun's uncertain (unconfirmed) input dispatch. */
    uncertainClaim(): AgentRunInputDispatchClaim | null;
    clearUncertain(): void;
  }>;
  /** `AgentRun.interrupt` (keeps its recoverable-block branch). */
  interrupt(): Promise<AgentOperationResult>;
  reconcileRecovery(): void;
  publishInputState(): void;
  drainInput(): Promise<void>;
  dispatchCanonicalStatus(): void;
  detachFromBackendSource(): void;
  warn(message: string): void;
}>;

/**
 * AgentRun's internal owner of the run's termination lifecycle (prepare, try-if-quiescent,
 * commit/finish, cancel) and of its root-shutdown fence attempts (SR-006 F-1–F-4 selection and
 * evaluation). It reaches AgentRun state only through its options; callers use AgentRun.
 */
export class AgentRunTermination {
  private recoveryShutdownFenced = false;
  /** The current root-shutdown attempt: shared while pending, kept once accepted, replaced after a failure. */
  private attempt: AgentRunRootShutdownFence | null = null;
  private tryingQuiescent: Promise<PreparedAgentRunTermination | null> | null = null;
  private preparing: Promise<PreparedAgentRunTermination> | null = null;
  private prepared: PreparedAgentRunTermination | null = null;
  private finishing: Promise<AgentOperationResult> | null = null;

  constructor(private readonly options: AgentRunTerminationOptions) {}

  prepare(): Promise<PreparedAgentRunTermination> {
    if (this.prepared) return Promise.resolve(this.prepared);
    if (this.preparing) return this.preparing;
    if (this.tryingQuiescent) {
      return this.tryingQuiescent.then((prepared) => prepared ?? this.prepare());
    }
    const preparation = this.prepareTerminationOnce();
    this.preparing = preparation;
    void preparation.finally(() => {
      if (this.preparing === preparation) this.preparing = null;
    }).catch(() => undefined);
    return preparation;
  }

  tryPrepareIfQuiescent(): Promise<PreparedAgentRunTermination | null> {
    if (this.prepared) return Promise.resolve(this.prepared);
    if (this.preparing) return Promise.resolve(null);
    if (this.tryingQuiescent) return this.tryingQuiescent;
    const attempt = this.options.dispatchQueue.enqueue(this.options.runId, () => {
      if (this.prepared) return this.prepared;
      this.options.lifecycleState.reconcileRuntimeSnapshot(this.options.backend.getLifecycleSnapshot());
      if (this.options.inputDispatch.active() || this.options.interruptState.hasActiveReservation
        || this.options.lifecycleState.activeTurn.kind !== "NONE" || this.options.lifecycleState.hasPendingCommand
        || !this.options.inputAdmissionState.tryQuiesceIfAlreadyQuiescent()) return null;
      return this.createTerminationPreparation();
    });
    this.tryingQuiescent = attempt;
    void attempt.finally(() => {
      if (this.tryingQuiescent === attempt) this.tryingQuiescent = null;
    }).catch(() => undefined);
    return attempt;
  }

  async fenceForRootShutdown(): Promise<AgentOperationResult> {
    const fenced = await this.options.dispatchQueue.enqueue(this.options.runId, () => {
      this.options.lifecycleState.reconcileRuntimeSnapshot(this.options.backend.getLifecycleSnapshot());
      this.options.inputAdmissionState.fenceForRootShutdown();
      this.recoveryShutdownFenced = !!this.options.lifecycleState.recoverableBlock;
      this.options.publishInputState();
      if (!this.attempt?.isReusable) this.attempt = this.createRootShutdownFence();
      return {
        attempt: this.attempt,
        gateWithoutTurn: this.recoveryShutdownFenced && this.options.lifecycleState.activeTurn.kind === "NONE",
      };
    });
    // The existing fence owns active-turn interruption; only the no-turn gate needs a separate control.
    if (fenced.gateWithoutTurn) await this.options.interrupt();
    this.scheduleRootShutdownEvaluation();
    return fenced.attempt.result;
  }

  async terminate(): Promise<AgentOperationResult> {
    if (this.finishing) return this.finishing;
    const prepared = await this.prepare();
    return prepared.commit().finish();
  }

  /**
   * Task-scoped force release: commits termination without the quiescence wait. A failed finish is
   * not memoized (`finishing`), so a repeated call retries the same exact provider termination.
   */
  forceTerminate(): Promise<AgentOperationResult> {
    return this.createTerminationPreparation().commit().finish();
  }

  /** Evaluates whichever attempt is current when the microtask runs (never a captured one). */
  scheduleRootShutdownEvaluation(): void {
    queueMicrotask(() => this.attempt?.evaluate());
  }

  private createRootShutdownFence(): AgentRunRootShutdownFence {
    return new AgentRunRootShutdownFence({
      snapshot: () => ({
        quiescent: this.isRootShutdownQuiescent(),
        hasActiveTurn: this.options.lifecycleState.activeTurn.kind !== "NONE",
      }),
      interruptActiveTurn: () => this.options.interrupt(),
      diagnostics: () => ({ runId: this.options.runId, activeTurn: this.options.lifecycleState.activeTurn, hasPendingCommand: this.options.lifecycleState.hasPendingCommand }),
    }, { warn: (message) => this.options.warn(message) });
  }

  private async waitForActiveInputDispatch(): Promise<void> {
    while (this.options.inputDispatch.active()) await this.options.inputDispatch.active();
  }

  private async prepareTerminationOnce(): Promise<PreparedAgentRunTermination> {
    const blocked = await this.options.dispatchQueue.enqueue(this.options.runId, () => {
      this.options.reconcileRecovery();
      if (this.options.lifecycleState.recoverableBlock) { this.recoveryShutdownFenced = true; this.options.inputAdmissionState.fenceForRootShutdown(); }
      else this.options.inputAdmissionState.quiesce();
      this.options.publishInputState(); return this.options.lifecycleState.recoverableBlock !== null;
    });
    if (blocked) {
      await this.options.interrupt();
      await this.waitForActiveInputDispatch();
      // Unknown input delivery remains pinned until resource shutdown; no synthetic active turn wait.
      if (this.options.inputDispatch.uncertainClaim() && this.isFencedRecoveryWithoutTurn()) return this.createTerminationPreparation();
    }
    await this.options.drainInput();
    await this.options.inputAdmissionState.waitForQuiescence();
    await this.waitForActiveInputDispatch();

    return this.prepared ?? this.createTerminationPreparation();
  }

  private createTerminationPreparation(): PreparedAgentRunTermination {
    if (this.prepared) return this.prepared;
    const prepared = createPreparedAgentRunTermination({
      runId: this.options.runId,
      cancelPrepared: () => {
        this.options.inputAdmissionState.reopen();
        this.recoveryShutdownFenced = false;
        if (this.prepared === prepared) this.prepared = null;
        queueMicrotask(() => { void this.options.drainInput(); });
      },
      finishCommitted: () => this.finishCommittedTermination(),
    });
    this.prepared = prepared;
    return prepared;
  }

  private isRootShutdownQuiescent(): boolean {
    if (this.options.inputDispatch.uncertainClaim() && this.isFencedRecoveryWithoutTurn()) return true;
    return this.options.inputAdmissionState.isQuiescentNow && !this.options.inputDispatch.active()
      && !this.options.interruptState.hasActiveReservation && !this.options.lifecycleState.hasPendingCommand
      && !this.options.interruptState.hasPendingProviderRequest
      && this.options.lifecycleState.activeTurn.kind === "NONE";
  }

  private isFencedRecoveryWithoutTurn(): boolean {
    const snapshot = this.options.backend.getLifecycleSnapshot();
    return this.recoveryShutdownFenced && !this.options.inputDispatch.active() && !this.options.interruptState.hasPendingProviderRequest
      && !!snapshot.recoverableBlock && snapshot.recoverableBlock.state === "awaiting_user"
      && snapshot.currentTurn.kind === "NONE";
  }

  private finishCommittedTermination(): Promise<AgentOperationResult> {
    if (this.finishing) return this.finishing;
    const termination = this.finishCommittedTerminationOnce();
    this.finishing = termination;
    void termination.then((result) => {
      if (!result.accepted && this.finishing === termination) this.finishing = null;
    }, () => {
      if (this.finishing === termination) this.finishing = null;
    });
    return termination;
  }

  private async finishCommittedTerminationOnce(): Promise<AgentOperationResult> {
    const result = await this.options.backend.terminate();
    if (!result.accepted) return result;
    await this.options.dispatchQueue.enqueue(this.options.runId, async () => {
      const uncertainClaim = this.options.inputDispatch.uncertainClaim();
      if (uncertainClaim) this.options.inputAdmissionState.settleUndeterminedDispatchAfterTermination(uncertainClaim);
      this.options.inputDispatch.clearUncertain();
      this.options.inputAdmissionState.settleAcceptedTermination();
      this.options.interruptState.clear();
      this.options.lifecycleState.terminate();
      this.options.segmentLifecycleState.releaseRun();
      await getDefaultAgentRunEventPipeline().releaseRun(this.options.runId);
      this.options.dispatchCanonicalStatus();
    });
    this.options.detachFromBackendSource();
    return result;
  }
}
