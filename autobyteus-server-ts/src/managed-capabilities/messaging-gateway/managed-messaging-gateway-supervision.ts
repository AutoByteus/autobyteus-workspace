import { ManagedMessagingGatewayRuntimeLifecycle } from "./managed-messaging-gateway-runtime-lifecycle.js";
import {
  computeManagedGatewayRestartDelayMs,
  getManagedGatewayHeartbeatStaleAfterMs,
  getManagedGatewayRestartMaxAttempts,
  getManagedGatewaySupervisionIntervalMs,
  isHeartbeatStale,
  readManagedRuntimeReliabilityStatus,
  type ManagedRuntimeHealthEvaluation,
} from "./managed-messaging-gateway-runtime-health.js";
import { ManagedMessagingGatewayStorage } from "./managed-messaging-gateway-storage.js";
import { type ManagedMessagingPersistedState } from "./types.js";

export class ManagedMessagingGatewaySupervision {
  private supervisionTimer: ReturnType<typeof setInterval> | null = null;

  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  private supervisionCheckInFlight = false;

  private restartInFlight = false;

  private restartAttemptCount = 0;

  constructor(
    private readonly deps: {
      storage: ManagedMessagingGatewayStorage;
      runtimeLifecycle: ManagedMessagingGatewayRuntimeLifecycle;
      restartRuntime: (input: { reason: string }) => Promise<void>;
      isClosing: () => boolean;
    },
  ) {}

  onRuntimeStarted(): void {
    this.resetManagedRestartState();
    this.ensureRuntimeSupervisionLoop();
  }

  ensureRuntimeSupervisionLoop(): void {
    if (this.deps.isClosing() || this.supervisionTimer) {
      return;
    }
    this.supervisionTimer = setInterval(() => {
      void this.runRuntimeSupervisionCheck();
    }, getManagedGatewaySupervisionIntervalMs());
    this.supervisionTimer.unref?.();
  }

  stopRuntimeSupervision(): void {
    if (this.supervisionTimer) {
      clearInterval(this.supervisionTimer);
      this.supervisionTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.supervisionCheckInFlight = false;
    this.restartInFlight = false;
    this.restartAttemptCount = 0;
  }

  async handleProcessExit(
    code: number | null,
    signal: NodeJS.Signals | null,
    expected: boolean,
  ): Promise<void> {
    if (expected || this.deps.isClosing()) {
      return;
    }

    const state = await this.deps.storage.readState();
    if (!state.desiredEnabled) {
      return;
    }

    const recoveredState = await this.deps.runtimeLifecycle.reconcileReachableRuntime({
      state,
      runtime: this.deps.runtimeLifecycle.getRuntimeSnapshot(),
      activeVersion: state.activeVersion,
      desiredVersion: state.desiredVersion,
      releaseTag: state.releaseTag,
      allowMessageReset: true,
    });
    if (await this.deps.runtimeLifecycle.hasRecoveredReachableRuntime(recoveredState)) {
      this.onRuntimeStarted();
      return;
    }

    await this.scheduleManagedRestart({
      reason: "Managed messaging gateway exited unexpectedly.",
      lastError: `Process exit detected (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
    });
  }

  async runRuntimeSupervisionCheck(): Promise<void> {
    if (
      this.deps.isClosing() ||
      this.supervisionCheckInFlight ||
      this.restartInFlight ||
      this.restartTimer
    ) {
      return;
    }

    this.supervisionCheckInFlight = true;
    try {
      const state = await this.deps.storage.readState();
      if (!state.desiredEnabled || !state.activeVersion) {
        return;
      }

      const evaluation = await this.evaluateManagedRuntimeHealth(state);
      if (!evaluation.healthy) {
        await this.scheduleManagedRestart({
          reason: evaluation.reason,
          lastError: evaluation.lastError,
        });
      }
    } finally {
      this.supervisionCheckInFlight = false;
    }
  }

  private resetManagedRestartState(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.restartInFlight = false;
    this.restartAttemptCount = 0;
  }

  private async evaluateManagedRuntimeHealth(
    state: ManagedMessagingPersistedState,
  ): Promise<ManagedRuntimeHealthEvaluation> {
    const reachableRuntime = await this.deps.runtimeLifecycle.findReachableRuntime({
      state,
      runtime: this.deps.runtimeLifecycle.getRuntimeSnapshot(),
      preferredPort: state.preferredBindPort,
    });
    if (!reachableRuntime) {
      return {
        healthy: false,
        reason: "Managed messaging gateway is not reachable during supervision.",
        lastError: "Managed messaging gateway did not respond to the runtime reliability probe.",
      };
    }

    const reliabilityStatus = readManagedRuntimeReliabilityStatus(
      reachableRuntime.runtimeReliabilityStatus,
    );
    if (!reliabilityStatus) {
      return {
        healthy: false,
        reason: "Managed messaging gateway returned an invalid runtime reliability payload.",
        lastError: "Managed messaging gateway runtime reliability payload was missing required fields.",
      };
    }

    if (reliabilityStatus.state !== "HEALTHY") {
      return {
        healthy: false,
        reason: "Managed messaging gateway reported an unhealthy runtime state.",
        lastError: `Managed messaging gateway runtime state is ${reliabilityStatus.state}.`,
      };
    }

    if (!reliabilityStatus.inboundForwarderRunning || !reliabilityStatus.outboundSenderRunning) {
      return {
        healthy: false,
        reason: "Managed messaging gateway reported stopped workers.",
        lastError:
          "Managed messaging gateway runtime reliability status reported one or more stopped workers.",
      };
    }

    if (
      !reliabilityStatus.inboxLockHeld ||
      !reliabilityStatus.outboxLockHeld ||
      reliabilityStatus.inboxLockLost ||
      reliabilityStatus.outboxLockLost
    ) {
      return {
        healthy: false,
        reason: "Managed messaging gateway lost required queue ownership.",
        lastError:
          "Managed messaging gateway runtime reliability status reported lost or unheld queue locks.",
      };
    }

    const nowEpoch = Date.now();
    const staleAfterMs = getManagedGatewayHeartbeatStaleAfterMs();
    if (
      isHeartbeatStale(reliabilityStatus.updatedAt, nowEpoch, staleAfterMs) ||
      isHeartbeatStale(reliabilityStatus.inboxLastHeartbeatAt, nowEpoch, staleAfterMs) ||
      isHeartbeatStale(reliabilityStatus.outboxLastHeartbeatAt, nowEpoch, staleAfterMs)
    ) {
      return {
        healthy: false,
        reason: "Managed messaging gateway heartbeat became stale.",
        lastError:
          "Managed messaging gateway runtime reliability heartbeat was not refreshed within the configured supervision threshold.",
      };
    }

    return {
      healthy: true,
    };
  }

  private async scheduleManagedRestart(input: {
    reason: string;
    lastError: string;
  }): Promise<void> {
    if (this.deps.isClosing() || this.restartInFlight || this.restartTimer) {
      return;
    }

    const state = await this.deps.storage.readState();
    if (!state.desiredEnabled || !state.activeVersion) {
      return;
    }

    const nextAttempt = this.restartAttemptCount + 1;
    const maxAttempts = getManagedGatewayRestartMaxAttempts();
    if (nextAttempt > maxAttempts) {
      await this.writeBlockedRestartState(input.reason, input.lastError);
      return;
    }

    this.restartAttemptCount = nextAttempt;
    if (this.supervisionTimer) {
      clearInterval(this.supervisionTimer);
      this.supervisionTimer = null;
    }

    const delayMs = computeManagedGatewayRestartDelayMs(nextAttempt);
    await this.deps.storage.writeState({
      lifecycleState: "DEGRADED",
      message: `${input.reason} Restart scheduled in ${delayMs}ms (attempt ${nextAttempt}/${maxAttempts}).`,
      lastError: input.lastError,
      bindHost: null,
      bindPort: null,
      pid: null,
    });

    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      void this.restartManagedRuntimeNow(input.reason);
    }, delayMs);
    this.restartTimer.unref?.();
  }

  private async restartManagedRuntimeNow(reason: string): Promise<void> {
    if (this.deps.isClosing() || this.restartInFlight) {
      return;
    }

    this.restartInFlight = true;
    try {
      const state = await this.deps.storage.readState();
      if (!state.desiredEnabled || !state.activeVersion) {
        this.resetManagedRestartState();
        return;
      }

      await this.deps.restartRuntime({ reason });
      this.resetManagedRestartState();
      this.ensureRuntimeSupervisionLoop();
    } catch (error) {
      const lastError = error instanceof Error ? error.message : String(error);
      if (this.restartAttemptCount >= getManagedGatewayRestartMaxAttempts()) {
        await this.writeBlockedRestartState(
          "Managed messaging gateway recovery attempts are exhausted.",
          lastError,
        );
      } else {
        this.restartInFlight = false;
        await this.scheduleManagedRestart({
          reason: "Managed messaging gateway restart retry failed.",
          lastError,
        });
        return;
      }
    } finally {
      this.restartInFlight = false;
    }
  }

  private async writeBlockedRestartState(
    message: string,
    lastError: string,
  ): Promise<void> {
    await this.deps.storage.writeState({
      lifecycleState: "BLOCKED",
      message,
      lastError,
      bindHost: null,
      bindPort: null,
      pid: null,
    });
  }
}
