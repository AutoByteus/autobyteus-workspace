import fs from "node:fs/promises";
import path from "node:path";
import { MessagingGatewayAdminClient } from "./messaging-gateway-admin-client.js";
import {
  MessagingGatewayInstallerService,
  type MessagingGatewayInstallResult,
} from "./messaging-gateway-installer-service.js";
import { MessagingGatewayProcessSupervisor } from "./messaging-gateway-process-supervisor.js";
import { MessagingGatewayReleaseManifestService } from "./messaging-gateway-release-manifest-service.js";
import {
  buildManagedMessagingGatewayRuntimeEnv,
  buildManagedMessagingProviderStatuses,
} from "./managed-messaging-gateway-runtime-env.js";
import { ManagedMessagingGatewayStorage } from "./managed-messaging-gateway-storage.js";
import {
  MANAGED_MESSAGING_EXCLUDED_PROVIDERS,
  MANAGED_MESSAGING_SUPPORTED_PROVIDERS,
  normalizeManagedMessagingProviderConfig,
  type ManagedMessagingPersistedState,
  type ManagedMessagingReleaseDescriptor,
  type ManagedMessagingRuntimeSnapshot,
  type ManagedMessagingStatus,
} from "./types.js";

type ReachableManagedRuntime = {
  bindHost: string;
  bindPort: number;
  runtimeReliabilityStatus: Record<string, unknown>;
};

const DEFAULT_MANAGED_GATEWAY_HOST = "127.0.0.1";
const MANAGED_GATEWAY_SHUTDOWN_TIMEOUT_MS = 10_000;

export class ManagedMessagingGatewayService {
  private readonly storage: ManagedMessagingGatewayStorage;

  constructor(
    private readonly deps: {
      manifestService: MessagingGatewayReleaseManifestService;
      installerService: MessagingGatewayInstallerService;
      processSupervisor: MessagingGatewayProcessSupervisor;
      adminClient: MessagingGatewayAdminClient;
    },
  ) {
    this.storage = new ManagedMessagingGatewayStorage({
      installerService: deps.installerService,
    });
    this.deps.processSupervisor.onExit(({ code, signal, expected }) => {
      void this.handleProcessExit(code, signal, expected);
    });
  }

  async getStatus(): Promise<ManagedMessagingStatus> {
    await this.storage.ensureRoots();
    const [initialState, providerConfig, installedVersions] = await Promise.all([
      this.storage.readState(),
      this.storage.readProviderConfig(),
      this.deps.installerService.listInstalledVersions(),
    ]);
    const runtime = this.deps.processSupervisor.getRuntimeSnapshot();
    const state = await this.reconcileReachableRuntime({
      state: initialState,
      runtime,
      activeVersion: initialState.activeVersion,
      desiredVersion: initialState.desiredVersion,
      releaseTag: initialState.releaseTag,
      allowMessageReset: true,
    });

    const providerStatuses = buildManagedMessagingProviderStatuses(providerConfig);
    const installRoot = state.activeVersion
      ? this.deps.installerService.getVersionInstallDir(state.activeVersion)
      : null;
    const diagnostics = {
      ...(await this.deps.processSupervisor.collectDiagnostics(
        state.activeVersion,
        installRoot,
      )),
      configPath: this.storage.getRuntimeEnvPath(),
      providerConfigPath: this.storage.getProviderConfigPath(),
      statePath: this.storage.getStatePath(),
      logsRoot: this.deps.installerService.getLogsRoot(),
      runtimeDataRoot: this.deps.installerService.getRuntimeDataRoot(),
    };

    const runtimeReliabilityStatus =
      state.bindHost && state.bindPort
        ? await this.safeGetRuntimeReliabilityStatus(
            state.bindHost,
            state.bindPort,
            state.adminToken,
          )
        : null;
    const runtimeRunning = runtime.running || runtimeReliabilityStatus !== null;

    return {
      supported: true,
      enabled: state.desiredEnabled,
      lifecycleState: state.lifecycleState,
      message: state.message,
      lastError: state.lastError,
      activeVersion: state.activeVersion,
      desiredVersion: state.desiredVersion,
      releaseTag: state.releaseTag,
      installedVersions,
      bindHost: runtime.running ? runtime.bindHost : state.bindHost,
      bindPort: runtime.running ? runtime.bindPort : state.bindPort,
      pid: runtime.running ? runtime.pid : state.pid,
      providerConfig,
      providerStatuses,
      supportedProviders: [...MANAGED_MESSAGING_SUPPORTED_PROVIDERS],
      excludedProviders: [...MANAGED_MESSAGING_EXCLUDED_PROVIDERS],
      diagnostics,
      runtimeReliabilityStatus,
      runtimeRunning,
    };
  }

  getRuntimeSnapshot() {
    return this.deps.processSupervisor.getRuntimeSnapshot();
  }

  async saveProviderConfig(rawConfig: unknown): Promise<ManagedMessagingStatus> {
    await this.storage.ensureRoots();
    const normalized = normalizeManagedMessagingProviderConfig(rawConfig);
    await this.storage.writeProviderConfig(normalized);

    const state = await this.storage.readState();
    if (state.desiredEnabled && state.activeVersion) {
      await this.restartActiveRuntime({
        reason: "Provider configuration saved; restarting managed messaging gateway.",
      });
    } else {
      await this.storage.writeState({
        message: "Provider configuration saved.",
        lastError: null,
      });
    }
    return this.getStatus();
  }

  async enable(): Promise<ManagedMessagingStatus> {
    await this.storage.ensureRoots();
    const serverVersion = await this.storage.readServerVersion();
    await this.storage.writeState({
      desiredEnabled: true,
      lifecycleState: "RESOLVING_COMPATIBILITY",
      message: "Resolving managed messaging gateway compatibility.",
      lastError: null,
    });

    const descriptor = await this.deps.manifestService.resolveArtifact({
      serverVersion,
      platformKey: "node-generic",
    });

    await this.storage.writeState({
      desiredVersion: descriptor.artifactVersion,
      releaseTag: descriptor.releaseTag,
      lifecycleState: "INSTALLING",
      message: "Installing managed messaging gateway runtime.",
      lastError: null,
    });

    const installResult = await this.installAndActivate(descriptor);
    await this.startInstalledRuntime(
      installResult.installDir,
      descriptor.artifactVersion,
      {
        lifecycleState: "STARTING",
        message: installResult.reusedExistingInstall
          ? "Starting managed messaging gateway."
          : "Managed messaging gateway installed; starting runtime.",
        releaseTag: descriptor.releaseTag,
        desiredEnabled: true,
        desiredVersion: descriptor.artifactVersion,
        activeVersion: descriptor.artifactVersion,
      },
      {
        allowAdoptExisting: true,
      },
    );

    return this.getStatus();
  }

  async disable(): Promise<ManagedMessagingStatus> {
    await this.storage.ensureRoots();
    const state = await this.storage.readState();
    await this.storage.writeState({
      lifecycleState: "STOPPING",
      message: "Stopping managed messaging gateway.",
      lastError: null,
      desiredEnabled: false,
    });
    await this.stopTrackedOrReachableRuntime(state);
    await this.storage.writeState({
      lifecycleState: "DISABLED",
      message: "Managed messaging is disabled.",
      lastError: null,
      bindHost: null,
      bindPort: null,
      pid: null,
    });
    return this.getStatus();
  }

  async update(): Promise<ManagedMessagingStatus> {
    await this.storage.ensureRoots();
    const previousState = await this.storage.readState();
    const previousDesiredEnabled = previousState.desiredEnabled;
    const previousVersion = previousState.activeVersion;
    const previousDesiredVersion = previousState.desiredVersion;
    const previousReleaseTag = previousState.releaseTag;
    const previousRuntimeSnapshot = this.deps.processSupervisor.getRuntimeSnapshot();

    const serverVersion = await this.storage.readServerVersion();
    const descriptor = await this.deps.manifestService.resolveArtifact({
      serverVersion,
      platformKey: "node-generic",
    });

    await this.storage.writeState({
      lifecycleState: "UPDATING",
      message: "Updating managed messaging gateway runtime.",
      lastError: null,
      desiredEnabled: previousDesiredEnabled,
      desiredVersion: descriptor.artifactVersion,
      releaseTag: descriptor.releaseTag,
    });

    try {
      const installResult = await this.installAndActivate(descriptor);
      const alreadyOnLatestCompatibleVersion =
        previousVersion === descriptor.artifactVersion;

      if (!previousDesiredEnabled) {
        await this.stopTrackedOrReachableRuntime(previousState);
        await this.storage.writeState({
          lifecycleState: "DISABLED",
          message: alreadyOnLatestCompatibleVersion
            ? "Managed messaging gateway is already on the latest compatible version and remains disabled."
            : "Managed messaging gateway was updated and remains disabled.",
          lastError: null,
          desiredEnabled: false,
          desiredVersion: descriptor.artifactVersion,
          activeVersion: descriptor.artifactVersion,
          releaseTag: descriptor.releaseTag,
          bindHost: null,
          bindPort: null,
          pid: null,
        });
        return this.getStatus();
      }

      if (alreadyOnLatestCompatibleVersion && previousRuntimeSnapshot.running) {
        await this.storage.writeState({
          lifecycleState: "RUNNING",
          message:
            "Managed messaging gateway is already on the latest compatible version.",
          lastError: null,
          desiredEnabled: true,
          desiredVersion: descriptor.artifactVersion,
          activeVersion: descriptor.artifactVersion,
          releaseTag: descriptor.releaseTag,
        });
        return this.getStatus();
      }

      await this.startInstalledRuntime(
        installResult.installDir,
        descriptor.artifactVersion,
        {
          lifecycleState: "STARTING",
          message: alreadyOnLatestCompatibleVersion
            ? "Restarting managed messaging gateway on the latest compatible version."
            : "Starting updated managed messaging gateway runtime.",
          desiredEnabled: previousDesiredEnabled,
          desiredVersion: descriptor.artifactVersion,
          activeVersion: descriptor.artifactVersion,
          releaseTag: descriptor.releaseTag,
        },
        {
          stopReachableRuntimeFirst: previousDesiredEnabled,
        },
      );
    } catch (error) {
      if (previousVersion && previousVersion !== descriptor.artifactVersion) {
        await this.deps.installerService.activateInstalledVersion(previousVersion);
        if (previousDesiredEnabled) {
          const rollbackInstallDir =
            this.deps.installerService.getVersionInstallDir(previousVersion);
          await this.startInstalledRuntime(
            rollbackInstallDir,
            previousVersion,
            {
              lifecycleState: "RUNNING",
              message:
                "Managed messaging gateway update failed; previous version was restored.",
              lastError: error instanceof Error ? error.message : String(error),
              desiredEnabled: true,
              desiredVersion: previousDesiredVersion ?? previousVersion,
              activeVersion: previousVersion,
              releaseTag: previousReleaseTag,
            },
            {
              stopReachableRuntimeFirst: true,
            },
          );
          await this.storage.writeState({
            lifecycleState: "RUNNING",
            message:
              "Managed messaging gateway update failed; previous version was restored.",
            lastError: error instanceof Error ? error.message : String(error),
            desiredEnabled: true,
            desiredVersion: previousDesiredVersion ?? previousVersion,
            activeVersion: previousVersion,
            releaseTag: previousReleaseTag,
          });
        } else {
          await this.stopTrackedOrReachableRuntime(previousState);
          await this.storage.writeState({
            lifecycleState: "DISABLED",
            message:
              "Managed messaging gateway update failed; previous version remains installed and disabled.",
            lastError: error instanceof Error ? error.message : String(error),
            desiredEnabled: false,
            desiredVersion: previousDesiredVersion ?? previousVersion,
            activeVersion: previousVersion,
            releaseTag: previousReleaseTag,
            bindHost: null,
            bindPort: null,
            pid: null,
          });
        }
        return this.getStatus();
      }

      await this.storage.writeState({
        lifecycleState: "ERROR",
        message: "Managed messaging gateway update failed.",
        lastError: error instanceof Error ? error.message : String(error),
        desiredEnabled: previousDesiredEnabled,
        desiredVersion: previousDesiredVersion ?? descriptor.artifactVersion,
        activeVersion: previousVersion,
        releaseTag: previousReleaseTag ?? descriptor.releaseTag,
      });
      throw error;
    }

    return this.getStatus();
  }

  async restoreIfEnabled(): Promise<void> {
    await this.storage.ensureRoots();
    const state = await this.storage.readState();
    if (!state.desiredEnabled) {
      return;
    }
    if (!state.activeVersion) {
      await this.enable();
      return;
    }

    const installDir = this.deps.installerService.getVersionInstallDir(state.activeVersion);
    try {
      await fs.stat(path.join(installDir, "dist", "index.js"));
    } catch {
      await this.enable();
      return;
    }

    await this.startInstalledRuntime(
      installDir,
      state.activeVersion,
      {
        lifecycleState: "STARTING",
        message: "Restoring managed messaging gateway after server startup.",
        desiredEnabled: true,
        desiredVersion: state.desiredVersion ?? state.activeVersion,
        activeVersion: state.activeVersion,
        releaseTag: state.releaseTag,
      },
      {
        allowAdoptExisting: true,
      },
    );
  }

  async getWeComAccounts(): Promise<Array<Record<string, unknown>>> {
    const config = await this.storage.readProviderConfig();
    return config.wecomAppAccounts.map((account) => ({ ...account }));
  }

  async getPeerCandidates(input: {
    provider: string;
    includeGroups?: boolean;
    limit?: number;
  }): Promise<Record<string, unknown>> {
    const status = await this.getStatus();
    if (!status.runtimeRunning || !status.bindHost || !status.bindPort) {
      throw new Error("Managed messaging gateway is not running.");
    }

    if (input.provider === "DISCORD") {
      const state = await this.storage.readState();
      return this.deps.adminClient.getDiscordPeerCandidates({
        host: status.bindHost,
        port: status.bindPort,
        adminToken: state.adminToken,
        accountId: status.providerConfig.discordAccountId,
        includeGroups: input.includeGroups,
        limit: input.limit,
      });
    }

    if (input.provider === "TELEGRAM") {
      const state = await this.storage.readState();
      return this.deps.adminClient.getTelegramPeerCandidates({
        host: status.bindHost,
        port: status.bindPort,
        adminToken: state.adminToken,
        accountId: status.providerConfig.telegramAccountId,
        includeGroups: input.includeGroups,
        limit: input.limit,
      });
    }

    throw new Error(
      `Peer candidate discovery is not supported for provider '${input.provider}'.`,
    );
  }

  async close(): Promise<void> {
    const state = await this.storage.readState();
    await this.stopTrackedOrReachableRuntime(state);
  }

  private async installAndActivate(
    descriptor: ManagedMessagingReleaseDescriptor,
  ): Promise<MessagingGatewayInstallResult> {
    const installResult = await this.deps.installerService.ensureInstalled(descriptor);
    await this.deps.installerService.activateInstalledVersion(descriptor.artifactVersion);
    return installResult;
  }

  private async startInstalledRuntime(
    installDir: string,
    version: string,
    statePatch: Partial<ManagedMessagingPersistedState>,
    options?: {
      allowAdoptExisting?: boolean;
      stopReachableRuntimeFirst?: boolean;
    },
  ): Promise<void> {
    const providerConfig = await this.storage.readProviderConfig();
    const currentState = await this.storage.readState();
    const bindHost = DEFAULT_MANAGED_GATEWAY_HOST;
    const requestedPort = currentState.preferredBindPort ?? currentState.bindPort ?? 8010;
    const env = buildManagedMessagingGatewayRuntimeEnv({
      providerConfig,
      bindHost,
      bindPort: requestedPort,
      adminToken: currentState.adminToken,
      runtimeDataRoot: this.deps.installerService.getRuntimeDataRoot(),
    });

    await this.storage.writeRuntimeEnv(env);

    if (options?.stopReachableRuntimeFirst) {
      await this.stopTrackedOrReachableRuntime(currentState);
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
      if (this.hasRecoveredRuntime(adoptedState)) {
        return;
      }
    }

    await this.storage.writeState(statePatch);

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
        state: await this.storage.readState(),
        runtime: this.deps.processSupervisor.getRuntimeSnapshot(),
        activeVersion: version,
        desiredVersion: statePatch.desiredVersion ?? currentState.desiredVersion ?? version,
        releaseTag: statePatch.releaseTag ?? currentState.releaseTag,
        preferredPort: requestedPort,
        allowMessageReset: true,
      });
      if (this.hasRecoveredRuntime(adoptedState)) {
        return;
      }
      throw error;
    }

    await this.storage.writeState({
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

  private async restartActiveRuntime(input: { reason: string }): Promise<void> {
    const state = await this.storage.readState();
    const activeVersion = state.activeVersion;
    if (!activeVersion) {
      return;
    }
    const installDir =
      this.deps.installerService.getVersionInstallDir(activeVersion);
    await this.startInstalledRuntime(
      installDir,
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

  private async handleProcessExit(
    code: number | null,
    signal: NodeJS.Signals | null,
    expected: boolean,
  ): Promise<void> {
    if (expected) {
      return;
    }

    const state = await this.storage.readState();
    if (!state.desiredEnabled) {
      return;
    }

    const recoveredState = await this.reconcileReachableRuntime({
      state,
      runtime: this.deps.processSupervisor.getRuntimeSnapshot(),
      activeVersion: state.activeVersion,
      desiredVersion: state.desiredVersion,
      releaseTag: state.releaseTag,
      allowMessageReset: true,
    });
    if (recoveredState.lifecycleState === "RUNNING" && recoveredState.bindPort) {
      return;
    }

    await this.storage.writeState({
      lifecycleState: "BLOCKED",
      message: "Managed messaging gateway exited unexpectedly.",
      lastError: `Process exit detected (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
      bindHost: null,
      bindPort: null,
      pid: null,
    });
  }

  private async reconcileReachableRuntime(input: {
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
      await this.storage.writeState(nextState);
    }

    return nextState;
  }

  private async findReachableRuntime(input: {
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

  private async stopTrackedOrReachableRuntime(
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

  private async safeGetRuntimeReliabilityStatus(
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
