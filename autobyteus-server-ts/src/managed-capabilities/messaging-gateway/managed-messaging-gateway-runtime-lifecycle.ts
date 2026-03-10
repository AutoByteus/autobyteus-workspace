import fs from "node:fs/promises";
import path from "node:path";
import { MessagingGatewayAdminClient } from "./messaging-gateway-admin-client.js";
import {
  MessagingGatewayInstallerService,
  type MessagingGatewayInstallResult,
} from "./messaging-gateway-installer-service.js";
import { MessagingGatewayProcessSupervisor } from "./messaging-gateway-process-supervisor.js";
import { buildManagedMessagingGatewayRuntimeEnv } from "./managed-messaging-gateway-runtime-env.js";
import { ManagedMessagingGatewayStorage } from "./managed-messaging-gateway-storage.js";
import {
  type ManagedMessagingPersistedState,
  type ManagedMessagingReleaseDescriptor,
  type ManagedMessagingRuntimeSnapshot,
} from "./types.js";

export type ReachableManagedRuntime = {
  bindHost: string;
  bindPort: number;
  runtimeReliabilityStatus: Record<string, unknown>;
};

const DEFAULT_MANAGED_GATEWAY_HOST = "127.0.0.1";
const MANAGED_GATEWAY_SHUTDOWN_TIMEOUT_MS = 10_000;

export class ManagedMessagingGatewayRuntimeLifecycle {
  constructor(
    private readonly deps: {
      storage: ManagedMessagingGatewayStorage;
      installerService: MessagingGatewayInstallerService;
      processSupervisor: MessagingGatewayProcessSupervisor;
      adminClient: MessagingGatewayAdminClient;
      isClosing: () => boolean;
    },
  ) {}

  getRuntimeSnapshot(): ManagedMessagingRuntimeSnapshot {
    return this.deps.processSupervisor.getRuntimeSnapshot();
  }

  async installAndActivate(
    descriptor: ManagedMessagingReleaseDescriptor,
  ): Promise<MessagingGatewayInstallResult> {
    const installResult = await this.deps.installerService.ensureInstalled(descriptor);
    await this.deps.installerService.activateInstalledVersion(descriptor.artifactVersion);
    return installResult;
  }

  async startInstalledRuntime(
    installDir: string,
    version: string,
    statePatch: Partial<ManagedMessagingPersistedState>,
    options?: {
      allowAdoptExisting?: boolean;
      stopReachableRuntimeFirst?: boolean;
    },
  ): Promise<void> {
    if (this.deps.isClosing()) {
      return;
    }

    const providerConfig = await this.deps.storage.readProviderConfig();
    const currentState = await this.deps.storage.readState();
    const bindHost = DEFAULT_MANAGED_GATEWAY_HOST;
    const requestedPort = currentState.preferredBindPort ?? currentState.bindPort ?? 8010;
    const env = buildManagedMessagingGatewayRuntimeEnv({
      providerConfig,
      bindHost,
      bindPort: requestedPort,
      adminToken: currentState.adminToken,
      runtimeDataRoot: this.deps.installerService.getRuntimeDataRoot(),
    });

    await this.deps.storage.writeRuntimeEnv(env);

    if (options?.stopReachableRuntimeFirst) {
      await this.stopTrackedOrReachableRuntime(currentState);
    }
    if (this.deps.isClosing()) {
      return;
    }

    if (options?.allowAdoptExisting) {
      const adoptedState = await this.reconcileReachableRuntime({
        state: currentState,
        activeVersion: version,
        desiredVersion: statePatch.desiredVersion ?? currentState.desiredVersion ?? version,
        releaseTag: statePatch.releaseTag ?? currentState.releaseTag,
        preferredPort: requestedPort,
        allowMessageReset: true,
      });
      if (await this.hasRecoveredReachableRuntime(adoptedState)) {
        return;
      }
    }
    if (this.deps.isClosing()) {
      return;
    }

    await this.deps.storage.writeState(statePatch);
    if (this.deps.isClosing()) {
      return;
    }

    let runtime;
    try {
      runtime = await this.deps.processSupervisor.start({
        installDir,
        version,
        bindHost,
        bindPort: requestedPort,
        env,
        stdoutLogPath: path.join(this.deps.installerService.getLogsRoot(), "stdout.log"),
        stderrLogPath: path.join(this.deps.installerService.getLogsRoot(), "stderr.log"),
      });
    } catch (error) {
      const adoptedState = await this.reconcileReachableRuntime({
        state: await this.deps.storage.readState(),
        runtime: this.deps.processSupervisor.getRuntimeSnapshot(),
        activeVersion: version,
        desiredVersion: statePatch.desiredVersion ?? currentState.desiredVersion ?? version,
        releaseTag: statePatch.releaseTag ?? currentState.releaseTag,
        preferredPort: requestedPort,
        allowMessageReset: true,
      });
      if (await this.hasRecoveredReachableRuntime(adoptedState)) {
        return;
      }
      throw error;
    }

    await this.deps.storage.writeState({
      lifecycleState: "RUNNING",
      message: "Managed messaging gateway is running.",
      lastError: null,
      bindHost: runtime.bindHost,
      bindPort: runtime.bindPort,
      pid: runtime.pid,
      preferredBindPort: runtime.bindPort,
      activeVersion: version,
    });
  }

  async restartActiveRuntime(input: { reason: string }): Promise<void> {
    if (this.deps.isClosing()) {
      return;
    }

    const state = await this.deps.storage.readState();
    const activeVersion = state.activeVersion;
    if (!activeVersion) {
      return;
    }

    await this.startInstalledRuntime(
      this.deps.installerService.getVersionInstallDir(activeVersion),
      activeVersion,
      {
        lifecycleState: "STARTING",
        message: input.reason,
        lastError: null,
        desiredEnabled: true,
        activeVersion,
        desiredVersion: state.desiredVersion ?? activeVersion,
        releaseTag: state.releaseTag,
      },
      {
        stopReachableRuntimeFirst: true,
      },
    );
  }

  async reconcileReachableRuntime(input: {
    state: ManagedMessagingPersistedState;
    activeVersion: string | null;
    desiredVersion: string | null;
    releaseTag: string | null;
    runtime?: ManagedMessagingRuntimeSnapshot;
    preferredPort?: number | null;
    allowMessageReset?: boolean;
  }): Promise<ManagedMessagingPersistedState> {
    if (!input.state.desiredEnabled || !input.activeVersion) {
      return input.state;
    }

    const reachableRuntime = await this.findReachableRuntime({
      state: input.state,
      runtime: input.runtime,
      preferredPort: input.preferredPort,
    });
    if (!reachableRuntime) {
      return input.state;
    }

    const nextState: ManagedMessagingPersistedState = {
      ...input.state,
      lifecycleState: "RUNNING",
      message:
        input.allowMessageReset && input.state.lifecycleState !== "RUNNING"
          ? "Managed messaging gateway recovered the existing runtime."
          : input.state.message,
      lastError: null,
      activeVersion: input.activeVersion,
      desiredVersion: input.desiredVersion,
      releaseTag: input.releaseTag,
      bindHost: reachableRuntime.bindHost,
      bindPort: reachableRuntime.bindPort,
      pid: null,
      preferredBindPort: reachableRuntime.bindPort,
      lastUpdatedAt: input.state.lastUpdatedAt,
    };

    const stateChanged =
      input.state.lifecycleState !== nextState.lifecycleState ||
      input.state.message !== nextState.message ||
      input.state.lastError !== nextState.lastError ||
      input.state.bindHost !== nextState.bindHost ||
      input.state.bindPort !== nextState.bindPort ||
      input.state.pid !== nextState.pid ||
      input.state.preferredBindPort !== nextState.preferredBindPort;

    if (stateChanged) {
      await this.deps.storage.writeState(nextState);
    }

    return nextState;
  }

  async findReachableRuntime(input: {
    state: ManagedMessagingPersistedState;
    runtime?: ManagedMessagingRuntimeSnapshot;
    preferredPort?: number | null;
  }): Promise<ReachableManagedRuntime | null> {
    const host =
      input.state.bindHost ?? input.runtime?.bindHost ?? DEFAULT_MANAGED_GATEWAY_HOST;
    const candidatePorts = [
      input.preferredPort,
      input.state.bindPort,
      input.state.preferredBindPort,
      input.runtime?.bindPort,
    ].filter((value): value is number => typeof value === "number" && value > 0);

    const seen = new Set<number>();
    for (const port of candidatePorts) {
      if (seen.has(port)) {
        continue;
      }
      seen.add(port);
      const runtimeReliabilityStatus = await this.safeGetRuntimeReliabilityStatus(
        host,
        port,
        input.state.adminToken,
      );
      if (!runtimeReliabilityStatus) {
        continue;
      }
      return {
        bindHost: host,
        bindPort: port,
        runtimeReliabilityStatus,
      };
    }

    return null;
  }

  async stopTrackedOrReachableRuntime(
    state: ManagedMessagingPersistedState,
  ): Promise<void> {
    if (this.deps.processSupervisor.isRunning()) {
      await this.deps.processSupervisor.stop();
      return;
    }

    const reachableRuntime = await this.findReachableRuntime({ state });
    if (!reachableRuntime) {
      return;
    }

    await this.deps.adminClient.shutdownRuntime({
      host: reachableRuntime.bindHost,
      port: reachableRuntime.bindPort,
      adminToken: state.adminToken,
    });
    await this.waitForRuntimeShutdown({
      host: reachableRuntime.bindHost,
      port: reachableRuntime.bindPort,
      adminToken: state.adminToken,
    });
  }

  async safeGetRuntimeReliabilityStatus(
    host: string,
    port: number,
    adminToken: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      return await this.deps.adminClient.getRuntimeReliabilityStatus({
        host,
        port,
        adminToken,
      });
    } catch {
      return null;
    }
  }

  async hasRecoveredReachableRuntime(
    state: ManagedMessagingPersistedState,
  ): Promise<boolean> {
    if (!this.hasRecoveredRuntime(state)) {
      return false;
    }
    const reachableRuntime = await this.findReachableRuntime({
      state,
      runtime: this.getRuntimeSnapshot(),
      preferredPort: state.bindPort ?? state.preferredBindPort,
    });
    return reachableRuntime !== null;
  }

  private async waitForRuntimeShutdown(input: {
    host: string;
    port: number;
    adminToken: string;
  }): Promise<void> {
    const deadline = Date.now() + MANAGED_GATEWAY_SHUTDOWN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const status = await this.safeGetRuntimeReliabilityStatus(
        input.host,
        input.port,
        input.adminToken,
      );
      if (!status) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error("Managed messaging gateway did not stop within the shutdown timeout.");
  }

  private hasRecoveredRuntime(state: ManagedMessagingPersistedState): boolean {
    return (
      state.lifecycleState === "RUNNING" &&
      typeof state.bindPort === "number" &&
      state.bindPort > 0 &&
      typeof state.bindHost === "string" &&
      state.bindHost.length > 0
    );
  }
}
