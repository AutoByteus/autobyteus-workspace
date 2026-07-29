import fs from "node:fs";
import type {
  ApplicationEngineStatus,
  ApplicationPublishedArtifactEvent,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import {
  ApplicationStorageLifecycleService,
  getApplicationStorageLifecycleService,
} from "../../application-storage/services/application-storage-lifecycle-service.js";
import {
  ApplicationOrchestrationHostService,
  getApplicationOrchestrationHostService,
} from "../../application-orchestration/services/application-orchestration-host-service.js";
import {
  ApplicationEngineClient,
  ApplicationEngineResponseAfterWrite,
  type ApplicationEngineClientNotification,
} from "../runtime/application-engine-client.js";
import {
  ApplicationAgentStreamingService,
  getApplicationAgentStreamingService,
} from "../../application-agent-streaming/services/application-agent-streaming-service.js";
import { ApplicationWorkerSupervisor } from "../runtime/application-worker-supervisor.js";
import {
  APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL,
  APPLICATION_ENGINE_METHOD_GET_STATUS,
  APPLICATION_ENGINE_METHOD_INVOKE_ARTIFACT_HANDLER,
  APPLICATION_ENGINE_METHOD_INVOKE_COMMAND,
  APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER,
  APPLICATION_ENGINE_METHOD_INVOKE_QUERY,
  APPLICATION_ENGINE_METHOD_LOAD_DEFINITION,
  APPLICATION_ENGINE_METHOD_ROUTE_REQUEST,
  APPLICATION_ENGINE_METHOD_CONTEXT_CAPABILITY,
  APPLICATION_ENGINE_METHOD_STOP,
  APPLICATION_ENGINE_METHOD_OPEN_WEBSOCKET,
  APPLICATION_ENGINE_METHOD_WEBSOCKET_MESSAGE,
  APPLICATION_ENGINE_METHOD_CLOSE_WEBSOCKET,
  APPLICATION_ENGINE_METHOD_WEBSOCKET_ACTION,
  type ApplicationExecutionEventDispatchResult,
  type ApplicationWorkerExecuteGraphqlInput,
  type ApplicationWorkerInvokeArtifactHandlerInput,
  type ApplicationWorkerInvokeCommandInput,
  type ApplicationWorkerInvokeEventHandlerInput,
  type ApplicationWorkerInvokeQueryInput,
  type ApplicationWorkerLoadDefinitionResult,
  type ApplicationWorkerRouteRequestInput,
  type ApplicationWorkerContextCapabilityInput,
  type ApplicationWorkerOpenWebSocketInput,
  type ApplicationWorkerWebSocketMessageInput,
  type ApplicationWorkerCloseWebSocketInput,
  type ApplicationWorkerWebSocketActionInput,
} from "../runtime/protocol.js";
import { createApplicationAgentStreamObserverActivationBarrier } from "./application-agent-stream-observer-activation-barrier.js";
import { applicationEngineStorageNeedsRepair } from "./application-engine-storage-health.js";

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
  private readonly notificationListeners = new Set<(event: { applicationId: string; message: ApplicationEngineClientNotification }) => void>();
  private readonly webSocketActionListeners = new Set<(event: { applicationId: string; action: ApplicationWorkerWebSocketActionInput }) => Promise<void> | void>();
  private readonly workerCloseListeners = new Set<(event: {
    applicationId: string;
    error: Error | null;
  }) => void>();

  constructor(
    private readonly dependencies: {
      applicationBundleService?: ApplicationBundleService;
      storageLifecycleService?: ApplicationStorageLifecycleService;
      orchestrationHostService?: ApplicationOrchestrationHostService;
      agentStreamingService?: ApplicationAgentStreamingService;
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

  private get agentStreamingService(): ApplicationAgentStreamingService {
    return this.dependencies.agentStreamingService ?? getApplicationAgentStreamingService();
  }

  onNotification(
    listener: (event: { applicationId: string; message: ApplicationEngineClientNotification }) => void,
  ): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  onWebSocketAction(listener: (event: {
    applicationId: string;
    action: ApplicationWorkerWebSocketActionInput;
  }) => Promise<void> | void): () => void {
    this.webSocketActionListeners.add(listener);
    return () => this.webSocketActionListeners.delete(listener);
  }

  onWorkerClose(listener: (event: { applicationId: string; error: Error | null }) => void): () => void {
    this.workerCloseListeners.add(listener);
    return () => this.workerCloseListeners.delete(listener);
  }

  async ensureApplicationEngine(applicationId: string): Promise<ApplicationEngineStatus> {
    const runtimeHandle = this.runtimeHandleByApplicationId.get(applicationId);
    const status = this.getApplicationEngineStatus(applicationId);
    if (runtimeHandle && status.state === "ready") {
      if (this.runtimeStorageNeedsRepair(applicationId)) {
        await this.storageLifecycleService.ensureStoragePrepared(applicationId);
      }
      return this.getApplicationEngineStatus(applicationId);
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

  async openApplicationWebSocket(applicationId: string, input: ApplicationWorkerOpenWebSocketInput): Promise<void> {
    await this.ensureApplicationEngine(applicationId);
    await this.requireRuntimeHandle(applicationId).client.request(
      APPLICATION_ENGINE_METHOD_OPEN_WEBSOCKET,
      input as unknown as Record<string, unknown>,
    );
  }

  async deliverApplicationWebSocketMessage(applicationId: string, input: ApplicationWorkerWebSocketMessageInput): Promise<void> {
    await this.requireRuntimeHandle(applicationId).client.request(
      APPLICATION_ENGINE_METHOD_WEBSOCKET_MESSAGE,
      input as unknown as Record<string, unknown>,
    );
  }

  async closeApplicationWebSocket(applicationId: string, input: ApplicationWorkerCloseWebSocketInput): Promise<void> {
    const handle = this.runtimeHandleByApplicationId.get(applicationId);
    if (!handle) return;
    await handle.client.request(
      APPLICATION_ENGINE_METHOD_CLOSE_WEBSOCKET,
      input as unknown as Record<string, unknown>,
    );
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

  async invokeApplicationArtifactHandler(
    applicationId: string,
    input: { event: ApplicationPublishedArtifactEvent },
  ): Promise<ApplicationExecutionEventDispatchResult> {
    await this.ensureApplicationEngine(applicationId);
    return this.requireRuntimeHandle(applicationId).client.request<ApplicationExecutionEventDispatchResult>(
      APPLICATION_ENGINE_METHOD_INVOKE_ARTIFACT_HANDLER,
      input as ApplicationWorkerInvokeArtifactHandlerInput as Record<string, unknown>,
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
    this.agentStreamingService.stopApplication(applicationId);
    this.updateStatus(applicationId, createBaseStatus(applicationId));
  }

  async stopAllApplicationEngines(): Promise<void> {
    await Promise.allSettled(this.startupPromiseByApplicationId.values());
    const applicationIds = Array.from(this.runtimeHandleByApplicationId.keys());
    const outcomes = await Promise.allSettled(
      applicationIds.map((applicationId) => this.stopApplicationEngine(applicationId)),
    );
    this.notificationListeners.clear();
    this.webSocketActionListeners.clear();
    this.workerCloseListeners.clear();
    const failures = outcomes.flatMap((outcome) =>
      outcome.status === "rejected" ? [outcome.reason] : []);
    if (failures.length > 0) {
      throw new AggregateError(failures, "Application engine cleanup failed.");
    }
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
      APPLICATION_ENGINE_METHOD_CONTEXT_CAPABILITY,
      async (params) => this.handleContextCapability(
        applicationId,
        params as unknown as ApplicationWorkerContextCapabilityInput,
        client,
      ),
    );
    client.registerRequestHandler(
      APPLICATION_ENGINE_METHOD_WEBSOCKET_ACTION,
      async (params) => this.handleWebSocketAction(
        applicationId,
        params as unknown as ApplicationWorkerWebSocketActionInput,
      ),
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
      this.agentStreamingService.stopApplication(applicationId);
      this.publishWorkerClose(applicationId, error);
      this.updateStatus(applicationId, {
        ...createBaseStatus(applicationId),
        state: error ? "failed" : "stopped",
        lastFailure: error ? error.message : null,
      });
    });
    supervisor.onExit(({ expected, code, signal }) => {
      if (!expected && this.runtimeHandleByApplicationId.has(applicationId)) {
        this.runtimeHandleByApplicationId.delete(applicationId);
        this.agentStreamingService.stopApplication(applicationId);
        this.publishWorkerClose(
          applicationId,
          new Error(`Application worker exited unexpectedly (code=${String(code)}, signal=${String(signal)}).`),
        );
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

  private async handleContextCapability(
    applicationId: string,
    input: ApplicationWorkerContextCapabilityInput,
    client: ApplicationEngineClient,
  ): Promise<unknown> {
    switch (input.capability) {
      case "agentExecution":
        switch (input.operation) {
          case "startAgent":
            return this.orchestrationHostService.startAgent(applicationId, input.input);
          case "startAgentTeam":
            return this.orchestrationHostService.startAgentTeam(applicationId, input.input);
          case "get":
            return this.orchestrationHostService.getRunBinding(
              applicationId,
              input.input.bindingId,
            );
          case "findByLaunchRequestId":
            return this.orchestrationHostService.findRunBindingByLaunchRequestId(
              applicationId,
              input.input.launchRequestId,
            );
          case "list":
            return this.orchestrationHostService.listRunBindings(applicationId, input.input);
          case "sendInput":
            return this.orchestrationHostService.sendRunInput(applicationId, input.input);
          case "subscribeEventStream": {
            const barrier = createApplicationAgentStreamObserverActivationBarrier(
              client,
              input.input.subscriptionId,
              () => {
                void this.agentStreamingService.unsubscribe(
                  applicationId,
                  input.input.subscriptionId,
                  "UNSUBSCRIBED",
                );
              },
            );
            const result = await this.agentStreamingService.subscribe({
              applicationId,
              subscriptionId: input.input.subscriptionId,
              address: input.input.address,
              emitter: barrier.emitter,
            });
            return new ApplicationEngineResponseAfterWrite(result, barrier.activate);
          }
          case "unsubscribeEventStream":
            await this.agentStreamingService.unsubscribe(
              applicationId,
              input.input.subscriptionId,
              input.input.reason,
            );
            return { unsubscribed: true };
          case "terminate":
            return this.orchestrationHostService.terminateRunBinding(
              applicationId,
              input.input.bindingId,
            );
        }
        break;
      case "agentResources":
        switch (input.operation) {
          case "listAvailable":
            return this.orchestrationHostService.listAvailableExecutionResources(applicationId, input.input);
          case "getConfigured":
            return this.orchestrationHostService.getConfiguredExecutionResource(
              applicationId,
              input.input.slotKey,
            );
        }
        break;
      case "publishedArtifacts":
        switch (input.operation) {
          case "list":
            return this.orchestrationHostService.listRunPublishedArtifacts(
              applicationId,
              input.input.runId,
            );
          case "readRevision":
            return this.orchestrationHostService.readPublishedArtifactRevision(
              applicationId,
              input.input,
            );
        }
        break;
    }

    throw new Error("Unsupported application context capability request.");
  }

  private async handleWebSocketAction(
    applicationId: string,
    action: ApplicationWorkerWebSocketActionInput,
  ): Promise<{ accepted: true }> {
    for (const listener of this.webSocketActionListeners) {
      await listener({ applicationId, action });
    }
    return { accepted: true };
  }

  private requireRuntimeHandle(applicationId: string): ApplicationEngineRuntimeHandle {
    const handle = this.runtimeHandleByApplicationId.get(applicationId);
    if (!handle) {
      throw new Error(`Application engine '${applicationId}' is not running.`);
    }
    return handle;
  }

  private runtimeStorageNeedsRepair(applicationId: string): boolean {
    const layout = this.storageLifecycleService.getStorageLayout(applicationId);
    return applicationEngineStorageNeedsRepair(layout.appDatabasePath);
  }

  private publishWorkerClose(applicationId: string, error: Error | null): void {
    for (const listener of this.workerCloseListeners) {
      try { listener({ applicationId, error }); } catch { /* lifecycle listeners are isolated */ }
    }
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
