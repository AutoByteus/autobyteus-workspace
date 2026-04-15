import fs from "node:fs";
import type { ApplicationEngineStatus } from "@autobyteus/application-sdk-contracts";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  ApplicationStorageLifecycleService,
  getApplicationStorageLifecycleService,
} from "../../application-storage/services/application-storage-lifecycle-service.js";
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
  APPLICATION_ENGINE_METHOD_STOP,
  type ApplicationWorkerExecuteGraphqlInput,
  type ApplicationWorkerInvokeCommandInput,
  type ApplicationWorkerInvokeEventHandlerInput,
  type ApplicationWorkerInvokeQueryInput,
  type ApplicationWorkerLoadDefinitionResult,
  type ApplicationWorkerRouteRequestInput,
  type ApplicationWorkerStatusResult,
} from "../runtime/protocol.js";
import type { ApplicationPublicationDispatchResult } from "../runtime/protocol.js";

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
    } = {},
  ) {}

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get storageLifecycleService(): ApplicationStorageLifecycleService {
    return this.dependencies.storageLifecycleService ?? getApplicationStorageLifecycleService();
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
    const client = this.requireRuntimeHandle(applicationId).client;
    return client.request(APPLICATION_ENGINE_METHOD_INVOKE_QUERY, input as Record<string, unknown>);
  }

  async invokeApplicationCommand(applicationId: string, input: ApplicationWorkerInvokeCommandInput): Promise<unknown> {
    await this.ensureApplicationEngine(applicationId);
    const client = this.requireRuntimeHandle(applicationId).client;
    return client.request(APPLICATION_ENGINE_METHOD_INVOKE_COMMAND, input as Record<string, unknown>);
  }

  async routeApplicationRequest(applicationId: string, input: ApplicationWorkerRouteRequestInput): Promise<unknown> {
    await this.ensureApplicationEngine(applicationId);
    const client = this.requireRuntimeHandle(applicationId).client;
    return client.request(APPLICATION_ENGINE_METHOD_ROUTE_REQUEST, input as Record<string, unknown>);
  }

  async executeApplicationGraphql(applicationId: string, input: ApplicationWorkerExecuteGraphqlInput): Promise<unknown> {
    await this.ensureApplicationEngine(applicationId);
    const client = this.requireRuntimeHandle(applicationId).client;
    return client.request(APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL, input as Record<string, unknown>);
  }

  async invokeApplicationEventHandler(
    applicationId: string,
    input: ApplicationWorkerInvokeEventHandlerInput,
  ): Promise<ApplicationPublicationDispatchResult> {
    await this.ensureApplicationEngine(applicationId);
    const client = this.requireRuntimeHandle(applicationId).client;
    return client.request<ApplicationPublicationDispatchResult>(
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
