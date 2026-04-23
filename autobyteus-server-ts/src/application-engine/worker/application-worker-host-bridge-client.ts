import {
  APPLICATION_ENGINE_METHOD_RUNTIME_CONTROL,
  type ApplicationWorkerRuntimeControlInput,
} from "../runtime/protocol.js";

type JsonRpcId = string;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutHandle: NodeJS.Timeout;
};

export class ApplicationWorkerHostBridgeClient {
  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private nextRequestId = 1;

  constructor(
    private readonly writeFrame: (frame: Record<string, unknown>) => void,
  ) {}

  async invokeRuntimeControl(input: ApplicationWorkerRuntimeControlInput): Promise<unknown> {
    return this.request(APPLICATION_ENGINE_METHOD_RUNTIME_CONTROL, input as Record<string, unknown>);
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
      pending.reject(new Error(message));
      return true;
    }

    pending.resolve(payload.result);
    return true;
  }

  private async request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = `host:${this.nextRequestId++}`;
    const promise = new Promise<unknown>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Application host bridge request timed out: ${method}`));
      }, 30_000);
      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeoutHandle);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          reject(error);
        },
        timeoutHandle,
      });
    });

    this.writeFrame({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });
    return promise;
  }
}
