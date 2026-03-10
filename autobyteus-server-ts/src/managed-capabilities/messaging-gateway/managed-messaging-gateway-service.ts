import fs from "node:fs/promises";
import path from "node:path";
import { MessagingGatewayAdminClient } from "./messaging-gateway-admin-client.js";
import {
  MessagingGatewayInstallerService,
  type MessagingGatewayInstallResult,
} from "./messaging-gateway-installer-service.js";
import { MessagingGatewayProcessSupervisor } from "./messaging-gateway-process-supervisor.js";
import { MessagingGatewayReleaseManifestService } from "./messaging-gateway-release-manifest-service.js";
import { ManagedMessagingGatewayRuntimeLifecycle } from "./managed-messaging-gateway-runtime-lifecycle.js";
import { ManagedMessagingGatewayStorage } from "./managed-messaging-gateway-storage.js";
import { ManagedMessagingGatewaySupervision } from "./managed-messaging-gateway-supervision.js";
import { buildManagedMessagingProviderStatuses } from "./managed-messaging-gateway-runtime-env.js";
import {
  MANAGED_MESSAGING_EXCLUDED_PROVIDERS,
  MANAGED_MESSAGING_SUPPORTED_PROVIDERS,
  normalizeManagedMessagingProviderConfig,
  type ManagedMessagingPersistedState,
  type ManagedMessagingReleaseDescriptor,
  type ManagedMessagingStatus,
} from "./types.js";

export class ManagedMessagingGatewayService {
  private readonly storage: ManagedMessagingGatewayStorage;

  private readonly runtimeLifecycle: ManagedMessagingGatewayRuntimeLifecycle;

  private readonly supervision: ManagedMessagingGatewaySupervision;

  private closing = false;

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
    this.runtimeLifecycle = new ManagedMessagingGatewayRuntimeLifecycle({
      storage: this.storage,
      installerService: deps.installerService,
      processSupervisor: deps.processSupervisor,
      adminClient: deps.adminClient,
      isClosing: () => this.closing,
    });
    this.supervision = new ManagedMessagingGatewaySupervision({
      storage: this.storage,
      runtimeLifecycle: this.runtimeLifecycle,
      restartRuntime: (input) => this.restartActiveRuntime(input),
      isClosing: () => this.closing,
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
    const state = await this.runtimeLifecycle.reconcileReachableRuntime({
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
        ? await this.runtimeLifecycle.safeGetRuntimeReliabilityStatus(
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
    this.stopRuntimeSupervision();
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
          await this.startInstalledRuntime(
            this.deps.installerService.getVersionInstallDir(previousVersion),
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
    if (this.closing) {
      return;
    }
    this.closing = true;
    this.stopRuntimeSupervision();
    const state = await this.storage.readState();
    await this.stopTrackedOrReachableRuntime(state);
  }

  async restartActiveRuntime(input: { reason: string }): Promise<void> {
    if (this.closing) {
      return;
    }
    await this.runtimeLifecycle.restartActiveRuntime(input);
    if (!this.closing) {
      this.supervision.onRuntimeStarted();
    }
  }

  async handleProcessExit(
    code: number | null,
    signal: NodeJS.Signals | null,
    expected: boolean,
  ): Promise<void> {
    await this.supervision.handleProcessExit(code, signal, expected);
  }

  ensureRuntimeSupervisionLoop(): void {
    this.supervision.ensureRuntimeSupervisionLoop();
  }

  stopRuntimeSupervision(): void {
    this.supervision.stopRuntimeSupervision();
  }

  async runRuntimeSupervisionCheck(): Promise<void> {
    await this.supervision.runRuntimeSupervisionCheck();
  }

  private async installAndActivate(
    descriptor: ManagedMessagingReleaseDescriptor,
  ): Promise<MessagingGatewayInstallResult> {
    return this.runtimeLifecycle.installAndActivate(descriptor);
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
    if (this.closing) {
      return;
    }
    await this.runtimeLifecycle.startInstalledRuntime(
      installDir,
      version,
      statePatch,
      options,
    );
    if (!this.closing) {
      this.supervision.onRuntimeStarted();
    }
  }

  private async stopTrackedOrReachableRuntime(
    state: ManagedMessagingPersistedState,
  ): Promise<void> {
    await this.runtimeLifecycle.stopTrackedOrReachableRuntime(state);
  }
}
