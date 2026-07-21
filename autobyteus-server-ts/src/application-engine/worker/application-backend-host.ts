import type {
  ApplicationBackendDefinition,
  ApplicationExecutionEventFamily,
  ApplicationHandlerContext,
  ApplicationPublishedArtifactEvent,
  ApplicationRouteResponse,
} from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationExecutionEventDispatchResult,
  ApplicationWorkerCloseWebSocketInput,
  ApplicationWorkerContextCapabilityInput,
  ApplicationWorkerExecuteGraphqlInput,
  ApplicationWorkerInvokeArtifactHandlerInput,
  ApplicationWorkerInvokeCommandInput,
  ApplicationWorkerInvokeEventHandlerInput,
  ApplicationWorkerInvokeQueryInput,
  ApplicationWorkerLoadDefinitionInput,
  ApplicationWorkerLoadDefinitionResult,
  ApplicationWorkerNotificationParams,
  ApplicationWorkerOpenWebSocketInput,
  ApplicationWorkerRouteRequestInput,
  ApplicationWorkerStatusResult,
  ApplicationWorkerWebSocketActionInput,
  ApplicationWorkerWebSocketMessageInput,
} from "../runtime/protocol.js";
import {
  ApplicationBackendDefinitionLoader,
  matchApplicationPath,
  type LoadedApplicationDefinition,
} from "./application-backend-definition-loader.js";
import {
  ApplicationHandlerContextFactory,
  type ApplicationContextCapabilityInvoker,
  type ApplicationNotificationPublisher,
} from "./application-handler-context-factory.js";
import { ApplicationAgentStreamObserverRegistry } from "./application-agent-stream-observer-registry.js";
import { ApplicationWebSocketSessionRegistry } from "./application-websocket-session-registry.js";

const EVENT_HANDLER_KEY_BY_FAMILY: Record<
  ApplicationExecutionEventFamily,
  keyof NonNullable<ApplicationBackendDefinition["eventHandlers"]>
> = {
  RUN_STARTED: "runStarted",
  RUN_TERMINATED: "runTerminated",
  RUN_FAILED: "runFailed",
  RUN_ORPHANED: "runOrphaned",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isRouteResponse = (value: unknown): value is ApplicationRouteResponse =>
  isRecord(value) && ["status", "headers", "body"].some((key) => Object.prototype.hasOwnProperty.call(value, key));

export class ApplicationBackendHost {
  private loaded: LoadedApplicationDefinition | null = null;
  private contextFactory: ApplicationHandlerContextFactory | null = null;
  private readonly observers = new ApplicationAgentStreamObserverRegistry();
  private readonly webSockets: ApplicationWebSocketSessionRegistry;

  constructor(
    private readonly publishNotification: ApplicationNotificationPublisher,
    private readonly invokeContextCapability: ApplicationContextCapabilityInvoker,
    invokeWebSocketAction: (input: ApplicationWorkerWebSocketActionInput) => Promise<unknown>,
    private readonly definitionLoader = new ApplicationBackendDefinitionLoader(),
  ) {
    this.webSockets = new ApplicationWebSocketSessionRegistry(invokeWebSocketAction);
  }

  async loadDefinition(input: ApplicationWorkerLoadDefinitionInput): Promise<ApplicationWorkerLoadDefinitionResult> {
    const loaded = await this.definitionLoader.load(input);
    this.loaded = loaded;
    this.contextFactory = new ApplicationHandlerContextFactory({
      storage: loaded.storage,
      supportedNotifications: loaded.exposures.supportedExposures.notifications,
      publishNotification: this.publishNotification,
      invokeContextCapability: this.invokeContextCapability,
      observerRegistry: this.observers,
    });
    if (loaded.definition.lifecycle?.onStart) {
      await loaded.definition.lifecycle.onStart(this.contextFactory.createLifecycle());
    }
    return { exposures: loaded.exposures };
  }

  getStatus(): ApplicationWorkerStatusResult {
    return { exposures: this.loaded?.exposures ?? null };
  }

  async invokeQuery(input: ApplicationWorkerInvokeQueryInput): Promise<unknown> {
    const handler = this.requireLoaded().definition.queries?.[input.queryName];
    if (!handler) throw new Error(`Application query handler '${input.queryName}' was not found.`);
    return handler(input.input, this.createContext(input.requestContext));
  }

  async invokeCommand(input: ApplicationWorkerInvokeCommandInput): Promise<unknown> {
    const handler = this.requireLoaded().definition.commands?.[input.commandName];
    if (!handler) throw new Error(`Application command handler '${input.commandName}' was not found.`);
    return handler(input.input, this.createContext(input.requestContext));
  }

  async routeRequest(input: ApplicationWorkerRouteRequestInput): Promise<ApplicationRouteResponse> {
    const routes = (this.requireLoaded().definition.routes ?? []).filter((route) => route.method === input.request.method);
    const matched = matchApplicationPath(routes, input.request.path);
    if (!matched) throw new Error(`No application route matched '${input.request.method} ${input.request.path}'.`);
    const response = await matched.route.handler(
      { ...input.request, params: matched.params },
      this.createContext(input.requestContext),
    );
    return isRouteResponse(response)
      ? { status: response.status ?? 200, headers: response.headers ?? {}, body: response.body ?? null }
      : { status: 200, headers: { "content-type": "application/json" }, body: response ?? null };
  }

  async executeGraphql(input: ApplicationWorkerExecuteGraphqlInput): Promise<unknown> {
    const executor = this.requireLoaded().definition.graphql?.execute;
    if (!executor) throw new Error("Application graphql executor was not found.");
    return executor(input.request, this.createContext(input.requestContext));
  }

  async openWebSocket(input: ApplicationWorkerOpenWebSocketInput): Promise<void> {
    const loaded = this.requireLoaded();
    if (!loaded.exposures.supportedExposures.webSockets) throw new Error("Backend manifest disables WebSockets for this application.");
    const matched = matchApplicationPath(loaded.definition.webSocketRoutes ?? [], input.request.path);
    if (!matched) throw new Error(`No application WebSocket route matched '${input.request.path}'.`);
    await this.webSockets.open({
      sessionId: input.sessionId,
      request: { ...input.request, params: matched.params },
      context: this.createContext({ applicationId: loaded.applicationId }),
      openHandler: matched.route.open,
    });
  }

  async deliverWebSocketMessage(input: ApplicationWorkerWebSocketMessageInput): Promise<void> {
    await this.webSockets.deliver(input.sessionId, input.frame);
  }

  async closeWebSocket(input: ApplicationWorkerCloseWebSocketInput): Promise<void> {
    await this.webSockets.close(input.sessionId, input.code, input.reason);
  }

  dispatchAgentStreamEvent(params: Record<string, unknown>): void {
    if (typeof params.subscriptionId === "string" && params.event) {
      this.observers.dispatchEvent(params.subscriptionId, params.event as never);
    }
  }

  dispatchAgentStreamError(params: Record<string, unknown>): void {
    if (typeof params.subscriptionId === "string" && params.error) {
      this.observers.dispatchError(params.subscriptionId, params.error as never);
    }
  }

  dispatchAgentStreamClosed(params: Record<string, unknown>): void {
    if (typeof params.subscriptionId === "string" && params.close) {
      this.observers.dispatchClosed(params.subscriptionId, params.close as never);
    }
  }

  async invokeEventHandler(input: ApplicationWorkerInvokeEventHandlerInput): Promise<ApplicationExecutionEventDispatchResult> {
    const handler = this.requireLoaded().definition.eventHandlers?.[
      EVENT_HANDLER_KEY_BY_FAMILY[input.envelope.event.family]
    ];
    if (!handler) return { status: "missing_handler" };
    await handler(input.envelope, this.createContext({ applicationId: input.envelope.event.applicationId }));
    return { status: "acknowledged" };
  }

  async invokeArtifactHandler(input: ApplicationWorkerInvokeArtifactHandlerInput): Promise<ApplicationExecutionEventDispatchResult> {
    const handler = this.requireLoaded().definition.artifactHandlers?.persisted;
    if (!handler) return { status: "missing_handler" };
    const event = input.event as ApplicationPublishedArtifactEvent;
    await handler(event, this.createContext({ applicationId: event.binding.applicationId }));
    return { status: "acknowledged" };
  }

  async stop(): Promise<void> {
    await this.webSockets.closeAll();
    await this.observers.closeAll();
    if (this.loaded?.definition.lifecycle?.onStop) {
      await this.loaded.definition.lifecycle.onStop(this.requireContextFactory().createLifecycle());
    }
  }

  private createContext(requestContext: ApplicationHandlerContext["requestContext"]): ApplicationHandlerContext {
    return this.requireContextFactory().create(requestContext);
  }

  private requireContextFactory(): ApplicationHandlerContextFactory {
    if (!this.contextFactory) throw new Error("Application backend host is not loaded.");
    return this.contextFactory;
  }

  private requireLoaded(): LoadedApplicationDefinition {
    if (!this.loaded) throw new Error("Application backend host is not loaded.");
    return this.loaded;
  }
}
