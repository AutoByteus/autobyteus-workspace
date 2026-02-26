export type RunDegradationPolicyOptions = {
  coordinatorFailureThreshold?: number;
  globalFailureThreshold?: number;
  globalFailureWindowMs?: number;
};

export type RecordRouteFailureInput = {
  teamRunId: string;
  isCoordinatorFailure: boolean;
  atMs?: number;
};

export type RecordRouteSuccessInput = {
  teamRunId: string;
  isCoordinatorTarget: boolean;
};

export type DegradationTransition =
  | "none"
  | "degraded"
  | "stop";

type RunFailureState = {
  status: "running" | "degraded" | "stopped";
  consecutiveCoordinatorFailures: number;
  globalFailureTimestamps: number[];
};

const createInitialState = (): RunFailureState => ({
  status: "running",
  consecutiveCoordinatorFailures: 0,
  globalFailureTimestamps: [],
});

export class RunDegradationPolicy {
  private readonly coordinatorFailureThreshold: number;
  private readonly globalFailureThreshold: number;
  private readonly globalFailureWindowMs: number;
  private readonly stateByRunId = new Map<string, RunFailureState>();

  constructor(options: RunDegradationPolicyOptions = {}) {
    this.coordinatorFailureThreshold = Math.max(
      1,
      Math.floor(options.coordinatorFailureThreshold ?? 2),
    );
    this.globalFailureThreshold = Math.max(
      1,
      Math.floor(options.globalFailureThreshold ?? 5),
    );
    this.globalFailureWindowMs = Math.max(
      1,
      Math.floor(options.globalFailureWindowMs ?? 60_000),
    );
  }

  recordRouteFailure(input: RecordRouteFailureInput): DegradationTransition {
    const now = input.atMs ?? Date.now();
    const state = this.getOrCreateState(input.teamRunId);
    this.trimWindow(state, now);
    state.globalFailureTimestamps.push(now);

    if (input.isCoordinatorFailure) {
      state.consecutiveCoordinatorFailures += 1;
    } else {
      state.consecutiveCoordinatorFailures = 0;
    }

    if (state.status === "running") {
      state.status = "degraded";
      return "degraded";
    }

    if (
      state.status === "degraded" &&
      (state.consecutiveCoordinatorFailures >= this.coordinatorFailureThreshold ||
        state.globalFailureTimestamps.length >= this.globalFailureThreshold)
    ) {
      state.status = "stopped";
      return "stop";
    }

    return "none";
  }

  recordRouteSuccess(input: RecordRouteSuccessInput): void {
    const state = this.stateByRunId.get(input.teamRunId);
    if (!state) {
      return;
    }
    if (input.isCoordinatorTarget) {
      state.consecutiveCoordinatorFailures = 0;
    }
  }

  getRunStatus(teamRunId: string): "running" | "degraded" | "stopped" | null {
    return this.stateByRunId.get(teamRunId)?.status ?? null;
  }

  clearRun(teamRunId: string): void {
    this.stateByRunId.delete(teamRunId);
  }

  private getOrCreateState(teamRunId: string): RunFailureState {
    const existing = this.stateByRunId.get(teamRunId);
    if (existing) {
      return existing;
    }
    const created = createInitialState();
    this.stateByRunId.set(teamRunId, created);
    return created;
  }

  private trimWindow(state: RunFailureState, now: number): void {
    const earliestMs = now - this.globalFailureWindowMs;
    state.globalFailureTimestamps = state.globalFailureTimestamps.filter(
      (timestamp) => timestamp >= earliestMs,
    );
  }
}
