import fs from "node:fs";
import type { ApplicationEngineStatus } from "@autobyteus/application-sdk-contracts";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  ApplicationStorageLifecycleService,
  getApplicationStorageLifecycleService,
} from "../../application-storage/services/application-storage-lifecycle-service.js";
import {
  ApplicationOrchestrationHostService,
  getApplicationOrchestrationHostService,
} from "../../application-orchestration/services/application-orchestration-host-service.js";
import { ApplicationEngineClient, type ApplicationEngineClientNotification } from "../runtime/application-engine-client.js";
import { ApplicationWorkerSupervisor } from "../runtime/application-worker-supervisor.js";
import {
  APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL,
  APPLICATION_ENGINE_METHOD_GET_STATUS,
  APPLICATION_ENGINE_METHOD_INVOKE_COMMAND,
  APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER,
  APPLICATION_ENGINE_METHOD_INVOKE_QUERY,
  APPLICATION_ENGINE_METHOD_LOAD_DEFINITION,
  APPLICATION_ENGINE_METHOD_ROUTE_REQUEST,
  APPLICATION_ENGINE_METHOD_RUNTIME_CONTROL,
  APPLICATION_ENGINE_METHOD_STOP,
  type ApplicationExecutionEventDispatchResult,
  type ApplicationWorkerExecuteGraphqlInput,
  type ApplicationWorkerInvokeCommandInput,
  type ApplicationWorkerInvokeEventHandlerInput,
  type ApplicationWorkerInvokeQueryInput,
  type ApplicationWorkerLoadDefinitionResult,
  type ApplicationWorkerRouteRequestInput,
  type ApplicationWorkerRuntimeControlInput,
} from "../runtime/protocol.js";

const createBaseStatus = (applicationId: string): ApplicationEngineStatus => ({
  applicationId,
  state: "stopped",
  ready: false,
  startedAt: null,
  lastFailure: null,
  exposures: null,
});

type ApplicationEngineRuntimeHandle = {
  supervisor: ApplicationWorkerSupervisor;
  client: ApplicationEngineClient;
};

export class ApplicationEngineHostService {
  private static instance: ApplicationEngineHostService | null = null;

  static getInstance(
    dependencies: ConstructorParameters<typeof ApplicationEngineHostService>[0] = {},
  ): ApplicationEngineHostService {
    if (!ApplicationEngineHostService.instance) {
      ApplicationEngineHostService.instance = new ApplicationEngineHostService(dependencies);
    }
    return ApplicationEngineHostService.instance;
  }

  static resetInstance(): void {
    ApplicationEngineHostService.instance = null;
  }

  private readonly statusByApplicationId = new Map<string, ApplicationEngineStatus>();
  private readonly runtimeHandleByApplicationId = new Map<string, ApplicationEngineRuntimeHandle>();
  private readonly startupPromiseByApplicationId = new Map<string, Promise<ApplicationEngineStatus>>();
  private readonly notificationListeners = new Set<(
    event: { applicationId: string; message: ApplicationEngineClientNotification },
  ) => void>();

  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      storageLifecycleService?: ApplicationStorageLifecycleService;
      orchestrationHostService?: ApplicationOrchestrationHostService;
    } = {},
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get storageLifecycleService(): ApplicationStorageLifecycleService {
    return this.dependencies.storageLifecycleService ?? getApplicationStorageLifecycleService();
  }

  private get orchestrationHostService(): ApplicationOrchestrationHostService {
    return this.dependencies.orchestrationHostService ?? getApplicationOrchestrationHostService();
  }

  onNotification(
    listener: (event: { applicationId: string; message: ApplicationEngineClientNotification }) => void,
  ): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  async ensureApplicationEngine(applicationId: string): Promise<ApplicationEngineStatus> {
    const runtimeHandle = this.runtimeHandleByApplicationId.get(applicationId);
    const status = this.getApplicationEngineStatus(applicationId);
    if (runtimeHandle && status.state === "ready") {
      return status;
    }

    const existingPromise = this.startupPromiseByApplicationId.get(applicationId);
    if (existingPromise) {
      return existingPromise;
    }

    const startupPromise = this.startApplicationEngine(applicationId).finally(() => {
      this.startupPromiseByApplicationId.delete(applicationId);
    });
    this.startupPromiseByApplicationId.set(applicationId, startupPromise);
    return startupPromise;
  }

  getApplicationEngineStatus(applicationId: string): ApplicationEngineStatus {
    return this.statusByApplicationId.get(applicationId) ?? createBaseStatus(applicationId);
  }

  async invokeApplicationQuery(applicationId: string, input: ApplicationWorkerInvokeQueryInput): Promise<unknown> {
    await this.ensureApplicationEngine(applicationId);
    return this.requireRuntimeHandle(applicationId).client.request(APPLICATION_ENGINE_METHOD_INVOKE_QUERY, input as Record<string, unknown>);
  }

  async invokeApplicationCommand(applicationId: string, input: ApplicationWorkerInvokeCommandInput): Promise<unknown> {
    await this.ensureApplicationEngine(applicationId);
    return this.requireRuntimeHandle(applicationId).client.request(APPLICATION_ENGINE_METHOD_INVOKE_COMMAND, input as Record<string, unknown>);
  }

  async routeApplicationRequest(applicationId: string, input: ApplicationWorkerRouteRequestInput): Promise<unknown> {
    await this.ensureApplicationEngine(applicationId);
    return this.requireRuntimeHandle(applicationId).client.request(APPLICATION_ENGINE_METHOD_ROUTE_REQUEST, input as Record<string, unknown>);
  }

  async executeApplicationGraphql(applicationId: string, input: ApplicationWorkerExecuteGraphqlInput): Promise<unknown> {
    await this.ensureApplicationEngine(applicationId);
    return this.requireRuntimeHandle(applicationId).client.request(APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL, input as Record<string, unknown>);
  }

  async invokeApplicationEventHandler(
    applicationId: string,
    input: ApplicationWorkerInvokeEventHandlerInput,
  ): Promise<ApplicationExecutionEventDispatchResult> {
    await this.ensureApplicationEngine(applicationId);
    return this.requireRuntimeHandle(applicationId).client.request<ApplicationExecutionEventDispatchResult>(
      APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER,
      input as Record<string, unknown>,
    );
  }

  async stopApplicationEngine(applicationId: string): Promise<void> {
    const runtimeHandle = this.runtimeHandleByApplicationId.get(applicationId);
    if (!runtimeHandle) {
      return;
    }
    this.updateStatus(applicationId, {
      ...this.getApplicationEngineStatus(applicationId),
      state: "stopping",
      ready: false,
    });
    try {
      await runtimeHandle.client.request(APPLICATION_ENGINE_METHOD_STOP, {});
    } catch {
      // no-op
    }
    await runtimeHandle.client.close();
    await runtimeHandle.supervisor.stop();
    this.runtimeHandleByApplicationId.delete(applicationId);
    this.updateStatus(applicationId, createBaseStatus(applicationId));
  }

  private async startApplicationEngine(applicationId: string): Promise<ApplicationEngineStatus> {
    const bundle = await this.applicationBundleService.getApplicationById(applicationId);
    if (!bundle) {
      throw new Error(`Application '${applicationId}' was not found.`);
    }

    this.updateStatus(applicationId, {
      ...this.getApplicationEngineStatus(applicationId),
      state: "preparing_storage",
      ready: false,
      lastFailure: null,
    });

    const layout = await this.storageLifecycleService.ensureStoragePrepared(applicationId);
    this.updateStatus(applicationId, {
      ...this.getApplicationEngineStatus(applicationId),
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
    client.registerRequestHandler(
      APPLICATION_ENGINE_METHOD_RUNTIME_CONTROL,
      async (params) => this.handleRuntimeControl(applicationId, params as ApplicationWorkerRuntimeControlInput),
    );

    client.onNotification((message) => {
      for (const listener of this.notificationListeners) {
        try {
          listener({ applicationId, message });
        } catch {
          // no-op
        }
      }
    });
    client.onClose((error) => {
      if (!this.runtimeHandleByApplicationId.has(applicationId)) {
        return;
      }
      this.runtimeHandleByApplicationId.delete(applicationId);
      this.updateStatus(applicationId, {
        ...createBaseStatus(applicationId),
        state: error ? "failed" : "stopped",
        lastFailure: error ? error.message : null,
      });
    });
    supervisor.onExit(({ expected, code, signal }) => {
      if (!expected && this.runtimeHandleByApplicationId.has(applicationId)) {
        this.runtimeHandleByApplicationId.delete(applicationId);
        this.updateStatus(applicationId, {
          ...createBaseStatus(applicationId),
          state: "failed",
          lastFailure: `Application worker exited unexpectedly (code=${String(code)}, signal=${String(signal)}).`,
        });
      }
    });

    this.runtimeHandleByApplicationId.set(applicationId, {
      supervisor,
      client,
    });

    try {
      const definitionResult = await client.request<ApplicationWorkerLoadDefinitionResult>(
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
        },
      );
      const status: ApplicationEngineStatus = {
        applicationId,
        state: "ready",
        ready: true,
        startedAt: new Date().toISOString(),
        lastFailure: null,
        exposures: definitionResult.exposures,
      };
      this.updateStatus(applicationId, status, layout.engineStatusPath);
      return status;
    } catch (error) {
      this.runtimeHandleByApplicationId.delete(applicationId);
      await client.close();
      await supervisor.stop();
      const failureStatus: ApplicationEngineStatus = {
        ...createBaseStatus(applicationId),
        state: "failed",
        lastFailure: error instanceof Error ? error.message : String(error),
      };
      this.updateStatus(applicationId, failureStatus, layout.engineStatusPath);
      throw error;
    }
  }

  private async handleRuntimeControl(
    applicationId: string,
    input: ApplicationWorkerRuntimeControlInput,
  ): Promise<unknown> {
    switch (input.action) {
      case "listAvailableResources":
        return this.orchestrationHostService.listAvailableResources(applicationId, input.input as never);
      case "startRun":
        return this.orchestrationHostService.startRun(applicationId, input.input as never);
      case "getRunBinding":
        return this.orchestrationHostService.getRunBinding(
          applicationId,
          (input.input as { bindingId?: string }).bindingId ?? "",
        );
      case "getRunBindingByIntentId":
        return this.orchestrationHostService.getRunBindingByIntentId(
          applicationId,
          (input.input as { bindingIntentId?: string }).bindingIntentId ?? "",
        );
      case "listRunBindings":
        return this.orchestrationHostService.listRunBindings(applicationId, input.input as never);
      case "postRunInput":
        return this.orchestrationHostService.postRunInput(applicationId, input.input as never);
      case "terminateRunBinding":
        return this.orchestrationHostService.terminateRunBinding(
          applicationId,
          (input.input as { bindingId?: string }).bindingId ?? "",
        );
      default:
        throw new Error(`Unsupported application runtimeControl action '${String(input.action)}'.`);
    }
  }

  private requireRuntimeHandle(applicationId: string): ApplicationEngineRuntimeHandle {
    const handle = this.runtimeHandleByApplicationId.get(applicationId);
    if (!handle) {
      throw new Error(`Application engine '${applicationId}' is not running.`);
    }
    return handle;
  }

  private updateStatus(applicationId: string, status: ApplicationEngineStatus, statusPath?: string): void {
    this.statusByApplicationId.set(applicationId, status);
    if (statusPath) {
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    }
  }
}

let cachedApplicationEngineHostService: ApplicationEngineHostService | null = null;

export const getApplicationEngineHostService = (): ApplicationEngineHostService => {
  if (!cachedApplicationEngineHostService) {
    cachedApplicationEngineHostService = ApplicationEngineHostService.getInstance();
  }
  return cachedApplicationEngineHostService;
};
