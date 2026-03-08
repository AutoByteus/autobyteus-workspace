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
  type ManagedMessagingReleaseDescriptor,
  type ManagedMessagingPersistedState,
  type ManagedMessagingStatus,
} from "./types.js";

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
    this.deps.processSupervisor.onExit(({ code, signal }) => {
      void this.handleProcessExit(code, signal);
    });
  }

  async getStatus(): Promise<ManagedMessagingStatus> {
    await this.storage.ensureRoots();
    const [state, providerConfig, installedVersions] = await Promise.all([
      this.storage.readState(),
      this.storage.readProviderConfig(),
      this.deps.installerService.listInstalledVersions(),
    ]);
    const runtime = this.deps.processSupervisor.getRuntimeSnapshot();
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
      runtime.running && state.bindHost && state.bindPort
        ? await this.safeGetRuntimeReliabilityStatus(state.bindHost, state.bindPort, state.adminToken)
        : null;

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
      bindHost: runtime.bindHost ?? state.bindHost,
      bindPort: runtime.bindPort ?? state.bindPort,
      pid: runtime.pid ?? state.pid,
      providerConfig,
      providerStatuses,
      supportedProviders: [...MANAGED_MESSAGING_SUPPORTED_PROVIDERS],
      excludedProviders: [...MANAGED_MESSAGING_EXCLUDED_PROVIDERS],
      diagnostics,
      runtimeReliabilityStatus,
      runtimeRunning: runtime.running,
    };
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
    await this.startInstalledRuntime(installResult.installDir, descriptor.artifactVersion, {
      lifecycleState: "STARTING",
      message: installResult.reusedExistingInstall
        ? "Starting managed messaging gateway."
        : "Managed messaging gateway installed; starting runtime.",
      releaseTag: descriptor.releaseTag,
      desiredEnabled: true,
      desiredVersion: descriptor.artifactVersion,
      activeVersion: descriptor.artifactVersion,
    });

    return this.getStatus();
  }

  async disable(): Promise<ManagedMessagingStatus> {
    await this.storage.ensureRoots();
    await this.storage.writeState({
      lifecycleState: "STOPPING",
      message: "Stopping managed messaging gateway.",
      lastError: null,
      desiredEnabled: false,
    });
    await this.deps.processSupervisor.stop();
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
        await this.deps.processSupervisor.stop();
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

      if (
        alreadyOnLatestCompatibleVersion &&
        previousRuntimeSnapshot.running
      ) {
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
      );
    } catch (error) {
      if (previousVersion && previousVersion !== descriptor.artifactVersion) {
        await this.deps.installerService.activateInstalledVersion(previousVersion);
        if (previousDesiredEnabled) {
          const rollbackInstallDir =
            this.deps.installerService.getVersionInstallDir(previousVersion);
          await this.startInstalledRuntime(rollbackInstallDir, previousVersion, {
            lifecycleState: "RUNNING",
            message:
              "Managed messaging gateway update failed; previous version was restored.",
            lastError: error instanceof Error ? error.message : String(error),
            desiredEnabled: true,
            desiredVersion: previousDesiredVersion ?? previousVersion,
            activeVersion: previousVersion,
            releaseTag: previousReleaseTag,
          });
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
          await this.deps.processSupervisor.stop();
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

    await this.startInstalledRuntime(installDir, state.activeVersion, {
      lifecycleState: "STARTING",
      message: "Restoring managed messaging gateway after server startup.",
      desiredEnabled: true,
      desiredVersion: state.desiredVersion ?? state.activeVersion,
      activeVersion: state.activeVersion,
      releaseTag: state.releaseTag,
    });
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
    await this.deps.processSupervisor.stop();
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
  ): Promise<void> {
    const providerConfig = await this.storage.readProviderConfig();
    const currentState = await this.storage.readState();
    const bindHost = "127.0.0.1";
    const requestedPort = currentState.preferredBindPort ?? currentState.bindPort ?? 8010;
    const env = buildManagedMessagingGatewayRuntimeEnv({
      providerConfig,
      bindHost,
      bindPort: requestedPort,
      adminToken: currentState.adminToken,
      runtimeDataRoot: this.deps.installerService.getRuntimeDataRoot(),
    });

    await this.storage.writeRuntimeEnv(env);

    await this.storage.writeState(statePatch);

    const runtime = await this.deps.processSupervisor.start({
      installDir,
      version,
      bindHost,
      bindPort: requestedPort,
      env,
      stdoutLogPath: path.join(this.deps.installerService.getLogsRoot(), "stdout.log"),
      stderrLogPath: path.join(this.deps.installerService.getLogsRoot(), "stderr.log"),
    });

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
    await this.startInstalledRuntime(installDir, activeVersion, {
      lifecycleState: "STARTING",
      message: input.reason,
      lastError: null,
      desiredEnabled: true,
      activeVersion,
      desiredVersion: state.desiredVersion ?? activeVersion,
      releaseTag: state.releaseTag,
    });
  }

  private async handleProcessExit(
    code: number | null,
    signal: NodeJS.Signals | null,
  ): Promise<void> {
    const state = await this.storage.readState();
    if (!state.desiredEnabled) {
      return;
    }
    await this.storage.writeState({
      lifecycleState: "BLOCKED",
      message: "Managed messaging gateway exited unexpectedly.",
      lastError: `Process exit detected (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
      pid: null,
    });
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
}
