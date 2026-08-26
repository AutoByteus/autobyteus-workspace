import {
  APPLICATION_ENGINE_METHOD_CONTEXT_CAPABILITY,
  APPLICATION_ENGINE_METHOD_WEBSOCKET_ACTION,
  type ApplicationWorkerContextCapabilityInput,
  type ApplicationWorkerWebSocketActionInput,
} from "../runtime/protocol.js";
import {
  ApplicationAgentEventStreamSubscribeError,
  type ApplicationAgentEventStreamSubscribeErrorCode,
} from "@autobyteus/application-sdk-contracts";

type JsonRpcId = string;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export class ApplicationWorkerHostBridgeClient {
  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private nextRequestId = 1;
  private closeError: Error | null = null;

  constructor(
    private readonly writeFrame: (frame: Record<string, unknown>) => Promise<void>,
  ) {}

  async invokeContextCapability(input: ApplicationWorkerContextCapabilityInput): Promise<unknown> {
    return this.request(APPLICATION_ENGINE_METHOD_CONTEXT_CAPABILITY, input as unknown as Record<string, unknown>);
  }

  async invokeWebSocketAction(input: ApplicationWorkerWebSocketActionInput): Promise<unknown> {
    return this.request(APPLICATION_ENGINE_METHOD_WEBSOCKET_ACTION, input as unknown as Record<string, unknown>);
  }

  close(error: Error): void {
    if (this.closeError) return;
    this.closeError = error;
    for (const pending of this.pendingRequests.values()) pending.reject(error);
    this.pendingRequests.clear();
  }

  handleResponse(payload: Record<string, unknown>): boolean {
    const id = typeof payload.id === "string" ? payload.id : null;
    if (!id) {
      return false;
    }
    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return false;
    }
    this.pendingRequests.delete(id);

    if (Object.prototype.hasOwnProperty.call(payload, "error")) {
      const errorPayload = payload.error as Record<string, unknown> | undefined;
      const message =
        errorPayload && typeof errorPayload.message === "string"
          ? errorPayload.message
          : "Host bridge request failed.";
      const code = errorPayload && typeof errorPayload.code === "string"
        ? errorPayload.code as ApplicationAgentEventStreamSubscribeErrorCode
        : null;
      if (code && [
        "SUBSCRIPTION_NOT_AVAILABLE",
        "INVALID_STREAM_TARGET",
        "RUNTIME_NOT_ACTIVE",
        "SUBSCRIPTION_ABORTED",
        "WORKER_TRANSPORT_FAILED",
      ].includes(code)) {
        pending.reject(new ApplicationAgentEventStreamSubscribeError({
          code,
          message,
          recoverable: errorPayload?.recoverable === true,
        }));
      } else {
        pending.reject(new Error(message));
      }
      return true;
    }

    pending.resolve(payload.result);
    return true;
  }

  private async request(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (this.closeError) throw this.closeError;
    const id = `host:${this.nextRequestId++}`;
    const promise = new Promise<unknown>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    void this.writeFrame({
      jsonrpc: "2.0",
      id,
      method,
      params,
    }).catch((error) => {
      const pending = this.pendingRequests.get(id);
      if (!pending) return;
      this.pendingRequests.delete(id);
      pending.reject(error instanceof Error ? error : new Error(String(error)));
    });
    return promise;
  }
}
