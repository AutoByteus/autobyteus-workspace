import type { ApplicationEngineStatus } from "@autobyteus/application-sdk-contracts";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationStorageLifecycleService } from "../../application-storage/services/application-storage-lifecycle-service.js";
import type { ApplicationOrchestrationHostService } from "../../application-orchestration/services/application-orchestration-host-service.js";
import type { ApplicationAgentStreamingService } from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import { ApplicationEngineClient } from "../runtime/application-engine-client.js";
import { ApplicationWorkerSupervisor } from "../runtime/application-worker-supervisor.js";
import {
  APPLICATION_ENGINE_METHOD_CONTEXT_CAPABILITY,
  APPLICATION_ENGINE_METHOD_LOAD_DEFINITION,
  APPLICATION_ENGINE_METHOD_WEBSOCKET_ACTION,
  type ApplicationWorkerContextCapabilityInput,
  type ApplicationWorkerLoadDefinitionResult,
  type ApplicationWorkerWebSocketActionInput,
} from "../runtime/protocol.js";
import { applicationEngineStorageNeedsRepair } from "./application-engine-storage-health.js";
import type {
  ApplicationEngineController,
} from "./application-engine-controller.js";
import {
  createApplicationEngineBaseStatus,
  type ApplicationEngineRuntimeHandle,
} from "./application-engine-state-registry.js";
import { ApplicationEngineContextCapabilityHandler } from "./application-engine-context-capability-handler.js";
import { runApplicationEngineControlRequest } from "./application-engine-control-request.js";

export class ApplicationEngineLauncher {
  private readonly startupPromiseByApplicationId =
    new Map<string, Promise<ApplicationEngineStatus>>();
  private readonly contextCapabilityHandler: ApplicationEngineContextCapabilityHandler;

  constructor(private readonly dependencies: {
    applicationBundleService: ApplicationBundleService;
    storageLifecycleService: ApplicationStorageLifecycleService;
    orchestrationHostService: ApplicationOrchestrationHostService;
    agentStreamingService: ApplicationAgentStreamingService;
    controller: ApplicationEngineController;
  }) {
    this.contextCapabilityHandler = new ApplicationEngineContextCapabilityHandler({
      orchestrationHostService: dependencies.orchestrationHostService,
      agentStreamingService: dependencies.agentStreamingService,
    });
  }

  async ensureReady(applicationId: string): Promise<ApplicationEngineStatus> {
    const status = this.dependencies.controller.getStatus(applicationId);
    if (
      this.dependencies.controller.hasAttachedEngine(applicationId)
      && status.state === "ready"
    ) {
      if (this.runtimeStorageNeedsRepair(applicationId)) {
        await this.dependencies.storageLifecycleService
          .ensureStoragePrepared(applicationId);
      }
      return this.dependencies.controller.getStatus(applicationId);
    }

    const existing = this.startupPromiseByApplicationId.get(applicationId);
    if (existing) {
      return existing;
    }
    const startup = this.startApplicationEngine(applicationId).finally(() => {
      this.startupPromiseByApplicationId.delete(applicationId);
    });
    this.startupPromiseByApplicationId.set(applicationId, startup);
    return startup;
  }

  async stop(applicationId: string): Promise<void> {
    await this.startupPromiseByApplicationId.get(applicationId)?.catch(() => undefined);
    await this.dependencies.controller.stopAttachedEngine(applicationId);
    this.dependencies.agentStreamingService.stopApplication(applicationId);
  }

  async stopAll(): Promise<void> {
    await Promise.allSettled(this.startupPromiseByApplicationId.values());
    const outcomes = await Promise.allSettled(
      this.dependencies.controller.listAttachedApplicationIds()
        .map((applicationId) => this.stop(applicationId)),
    );
    this.dependencies.controller.clearListeners();
    const failures = outcomes.flatMap((outcome) =>
      outcome.status === "rejected" ? [outcome.reason] : []);
    if (failures.length > 0) {
      throw new AggregateError(failures, "Application engine cleanup failed.");
    }
  }

  private async startApplicationEngine(
    applicationId: string,
  ): Promise<ApplicationEngineStatus> {
    const bundle = await this.dependencies.applicationBundleService
      .getApplicationById(applicationId);
    if (!bundle) {
      throw new Error(`Application '${applicationId}' was not found.`);
    }

    this.dependencies.controller.updateStatus(applicationId, {
      ...this.dependencies.controller.getStatus(applicationId),
      state: "preparing_storage",
      ready: false,
      lastFailure: null,
    });
    const layout = await this.dependencies.storageLifecycleService
      .ensureStoragePrepared(applicationId);
    this.dependencies.controller.updateStatus(applicationId, {
      ...this.dependencies.controller.getStatus(applicationId),
      state: "starting_worker",
      ready: false,
      lastFailure: null,
    });

    const supervisor = new ApplicationWorkerSupervisor();
    const childProcess = supervisor.start({
      cwd: bundle.applicationRootPath,
      stdoutLogPath: layout.workerStdoutLogPath,
      stderrLogPath: layout.workerStderrLogPath,
    });
    const client = new ApplicationEngineClient();
    client.attach(childProcess);
    const handle: ApplicationEngineRuntimeHandle = Object.freeze({
      supervisor,
      client,
    });
    client.registerRequestHandler(
      APPLICATION_ENGINE_METHOD_CONTEXT_CAPABILITY,
      async (params) => this.contextCapabilityHandler.handle(
        applicationId,
        params as unknown as ApplicationWorkerContextCapabilityInput,
        client,
      ),
    );
    client.registerRequestHandler(
      APPLICATION_ENGINE_METHOD_WEBSOCKET_ACTION,
      async (params) => this.dependencies.controller.publishWebSocketAction(
        applicationId,
        params as unknown as ApplicationWorkerWebSocketActionInput,
      ),
    );
    client.onNotification((message) =>
      this.dependencies.controller.publishNotification(applicationId, message));
    client.onClose((error) => {
      if (!this.dependencies.controller.detachIfCurrent(applicationId, handle)) {
        return;
      }
      this.dependencies.agentStreamingService.stopApplication(applicationId);
      this.dependencies.controller.publishWorkerClose(applicationId, error);
      this.dependencies.controller.updateStatus(applicationId, {
        ...createApplicationEngineBaseStatus(applicationId),
        state: error ? "failed" : "stopped",
        lastFailure: error ? error.message : null,
      });
    });
    supervisor.onExit(({ expected, code, signal }) => {
      if (expected || !this.dependencies.controller.detachIfCurrent(applicationId, handle)) {
        return;
      }
      const error = new Error(
        `Application worker exited unexpectedly (code=${String(code)}, signal=${String(signal)}).`,
      );
      this.dependencies.agentStreamingService.stopApplication(applicationId);
      this.dependencies.controller.publishWorkerClose(applicationId, error);
      this.dependencies.controller.updateStatus(applicationId, {
        ...createApplicationEngineBaseStatus(applicationId),
        state: "failed",
        lastFailure: error.message,
      });
    });
    this.dependencies.controller.attach(applicationId, handle);

    try {
      const definition = await runApplicationEngineControlRequest<ApplicationWorkerLoadDefinitionResult>(
        handle,
        APPLICATION_ENGINE_METHOD_LOAD_DEFINITION,
        {
          applicationId,
          entryModulePath: bundle.backend.entryModulePath,
          supportedExposures: bundle.backend.supportedExposures,
          storage: {
            rootPath: layout.rootPath,
            runtimePath: layout.runtimeDir,
            logsPath: layout.logsDir,
            appDatabasePath: layout.appDatabasePath,
            appDatabaseUrl: `file:${layout.appDatabasePath}`,
            assetsPath: bundle.backend.assetsDirPath,
          },
          declaredAgentToolNames: bundle.agentTools.map((tool) => tool.name),
        },
      );
      const status: ApplicationEngineStatus = {
        applicationId,
        state: "ready",
        ready: true,
        startedAt: new Date().toISOString(),
        lastFailure: null,
        exposures: definition.exposures,
      };
      this.dependencies.controller.updateStatus(
        applicationId,
        status,
        layout.engineStatusPath,
      );
      return status;
    } catch (error) {
      this.dependencies.controller.detachIfCurrent(applicationId, handle);
      await client.close();
      await supervisor.stop();
      const failureStatus: ApplicationEngineStatus = {
        ...createApplicationEngineBaseStatus(applicationId),
        state: "failed",
        lastFailure: error instanceof Error ? error.message : String(error),
      };
      this.dependencies.controller.updateStatus(
        applicationId,
        failureStatus,
        layout.engineStatusPath,
      );
      throw error;
    }
  }

  private runtimeStorageNeedsRepair(applicationId: string): boolean {
    const layout = this.dependencies.storageLifecycleService
      .getStorageLayout(applicationId);
    return applicationEngineStorageNeedsRepair(layout.appDatabasePath);
  }
}
