import type {
  ApplicationEngineStatus,
  ApplicationPublishedArtifactEvent,
} from "@autobyteus/application-sdk-contracts";
import {
  type ApplicationEngineClientNotification,
} from "../runtime/application-engine-client.js";
import {
  APPLICATION_ENGINE_METHOD_CLOSE_WEBSOCKET,
  APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL,
  APPLICATION_ENGINE_METHOD_INVOKE_ARTIFACT_HANDLER,
  APPLICATION_ENGINE_METHOD_INVOKE_COMMAND,
  APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER,
  APPLICATION_ENGINE_METHOD_INVOKE_QUERY,
  APPLICATION_ENGINE_METHOD_INVOKE_AGENT_TOOL,
  APPLICATION_ENGINE_METHOD_OPEN_WEBSOCKET,
  APPLICATION_ENGINE_METHOD_ROUTE_REQUEST,
  APPLICATION_ENGINE_METHOD_STOP,
  APPLICATION_ENGINE_METHOD_WEBSOCKET_MESSAGE,
  type ApplicationExecutionEventDispatchResult,
  type ApplicationWorkerCloseWebSocketInput,
  type ApplicationWorkerExecuteGraphqlInput,
  type ApplicationWorkerInvokeArtifactHandlerInput,
  type ApplicationWorkerInvokeCommandInput,
  type ApplicationWorkerInvokeEventHandlerInput,
  type ApplicationWorkerInvokeQueryInput,
  type ApplicationWorkerInvokeAgentToolInput,
  type ApplicationWorkerInvokeAgentToolResult,
  type ApplicationWorkerOpenWebSocketInput,
  type ApplicationWorkerRouteRequestInput,
  type ApplicationWorkerWebSocketActionInput,
  type ApplicationWorkerWebSocketMessageInput,
} from "../runtime/protocol.js";
import {
  ApplicationEngineStateRegistry,
  createApplicationEngineBaseStatus,
  type ApplicationEngineRuntimeHandle,
} from "./application-engine-state-registry.js";
import { runApplicationEngineControlRequest } from "./application-engine-control-request.js";

export class ApplicationEngineController {
  private readonly state = new ApplicationEngineStateRegistry();

  hasAttachedEngine(applicationId: string): boolean {
    return this.state.getAttachedHandle(applicationId) !== null;
  }

  listAttachedApplicationIds(): readonly string[] {
    return this.state.listAttachedApplicationIds();
  }

  attach(
    applicationId: string,
    handle: ApplicationEngineRuntimeHandle,
  ): void {
    this.state.attach(applicationId, handle);
  }

  detachIfCurrent(
    applicationId: string,
    expectedHandle: ApplicationEngineRuntimeHandle,
  ): boolean {
    return this.state.detachIfCurrent(applicationId, expectedHandle);
  }

  onNotification(listener: (event: {
    applicationId: string;
    message: ApplicationEngineClientNotification;
  }) => void): () => void {
    return this.state.onNotification(listener);
  }

  onWebSocketAction(listener: (event: {
    applicationId: string;
    action: ApplicationWorkerWebSocketActionInput;
  }) => Promise<void> | void): () => void {
    return this.state.onWebSocketAction(listener);
  }

  onWorkerClose(listener: (event: {
    applicationId: string;
    error: Error | null;
  }) => void): () => void {
    return this.state.onWorkerClose(listener);
  }

  publishNotification(
    applicationId: string,
    message: ApplicationEngineClientNotification,
  ): void {
    this.state.publishNotification(applicationId, message);
  }

  async publishWebSocketAction(
    applicationId: string,
    action: ApplicationWorkerWebSocketActionInput,
  ): Promise<{ accepted: true }> {
    return this.state.publishWebSocketAction(applicationId, action);
  }

  publishWorkerClose(applicationId: string, error: Error | null): void {
    this.state.publishWorkerClose(applicationId, error);
  }

  getStatus(applicationId: string): ApplicationEngineStatus {
    return this.state.getStatus(applicationId);
  }

  updateStatus(
    applicationId: string,
    status: ApplicationEngineStatus,
    statusPath?: string,
  ): void {
    this.state.updateStatus(applicationId, status, statusPath);
  }

  invokeApplicationQuery(
    applicationId: string,
    input: ApplicationWorkerInvokeQueryInput,
  ): Promise<unknown> {
    return this.request(applicationId, APPLICATION_ENGINE_METHOD_INVOKE_QUERY, input);
  }

  invokeApplicationCommand(
    applicationId: string,
    input: ApplicationWorkerInvokeCommandInput,
  ): Promise<unknown> {
    return this.request(applicationId, APPLICATION_ENGINE_METHOD_INVOKE_COMMAND, input);
  }

  invokeApplicationAgentTool(
    applicationId: string,
    input: ApplicationWorkerInvokeAgentToolInput,
  ): Promise<ApplicationWorkerInvokeAgentToolResult> {
    return this.request(applicationId, APPLICATION_ENGINE_METHOD_INVOKE_AGENT_TOOL, input);
  }

  routeApplicationRequest(
    applicationId: string,
    input: ApplicationWorkerRouteRequestInput,
  ): Promise<unknown> {
    return this.request(applicationId, APPLICATION_ENGINE_METHOD_ROUTE_REQUEST, input);
  }

  executeApplicationGraphql(
    applicationId: string,
    input: ApplicationWorkerExecuteGraphqlInput,
  ): Promise<unknown> {
    return this.request(applicationId, APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL, input);
  }

  async openApplicationWebSocket(
    applicationId: string,
    input: ApplicationWorkerOpenWebSocketInput,
  ): Promise<void> {
    await this.request(applicationId, APPLICATION_ENGINE_METHOD_OPEN_WEBSOCKET, input);
  }

  async deliverApplicationWebSocketMessage(
    applicationId: string,
    input: ApplicationWorkerWebSocketMessageInput,
  ): Promise<void> {
    await this.request(applicationId, APPLICATION_ENGINE_METHOD_WEBSOCKET_MESSAGE, input);
  }

  async closeApplicationWebSocket(
    applicationId: string,
    input: ApplicationWorkerCloseWebSocketInput,
  ): Promise<void> {
    const handle = this.state.getAttachedHandle(applicationId);
    if (!handle) {
      return;
    }
    await handle.client.request(
      APPLICATION_ENGINE_METHOD_CLOSE_WEBSOCKET,
      input as unknown as Record<string, unknown>,
    );
  }

  invokeApplicationEventHandler(
    applicationId: string,
    input: ApplicationWorkerInvokeEventHandlerInput,
  ): Promise<ApplicationExecutionEventDispatchResult> {
    return this.request(
      applicationId,
      APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER,
      input,
    );
  }

  invokeApplicationArtifactHandler(
    applicationId: string,
    input: { event: ApplicationPublishedArtifactEvent },
  ): Promise<ApplicationExecutionEventDispatchResult> {
    return this.request(
      applicationId,
      APPLICATION_ENGINE_METHOD_INVOKE_ARTIFACT_HANDLER,
      input as ApplicationWorkerInvokeArtifactHandlerInput,
    );
  }

  async stopAttachedEngine(applicationId: string): Promise<void> {
    const handle = this.state.getAttachedHandle(applicationId);
    if (!handle) {
      return;
    }
    this.updateStatus(applicationId, {
      ...this.getStatus(applicationId),
      state: "stopping",
      ready: false,
    });
    try {
      await runApplicationEngineControlRequest(
        handle,
        APPLICATION_ENGINE_METHOD_STOP,
        {},
      );
    } catch {
      // The worker may already have exited.
    }
    await handle.client.close();
    await handle.supervisor.stop();
    this.detachIfCurrent(applicationId, handle);
    this.updateStatus(applicationId, createApplicationEngineBaseStatus(applicationId));
  }

  clearListeners(): void {
    this.state.clearListeners();
  }

  private request<T>(
    applicationId: string,
    method: string,
    input: unknown,
  ): Promise<T> {
    const handle = this.state.getAttachedHandle(applicationId);
    if (!handle) {
      throw new Error(`Application engine '${applicationId}' is not running.`);
    }
    return handle.client.request<T>(
      method,
      input as Record<string, unknown>,
    );
  }
}
