import type { ChildProcessWithoutNullStreams } from "node:child_process";
import {
  APPLICATION_ENGINE_NOTIFICATION_METHOD,
  type ApplicationWorkerNotificationParams,
} from "./protocol.js";

type JsonRpcId = string | number;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutHandle: NodeJS.Timeout;
};

export type ApplicationEngineClientNotification = ApplicationWorkerNotificationParams;

export class ApplicationEngineClient {
  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private readonly notificationListeners = new Set<(message: ApplicationEngineClientNotification) => void>();
  private readonly closeListeners = new Set<(error: Error | null) => void>();
  private process: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = "";
  private nextRequestId = 1;
  private closed = false;

  attach(process: ChildProcessWithoutNullStreams): void {
    if (this.process) {
      throw new Error("Application engine client is already attached.");
    }

    this.process = process;
    this.closed = false;
    process.stdout.on("data", (chunk: Buffer) => {
      this.onStdout(chunk.toString("utf-8"));
    });
    process.on("error", (error) => {
      const engineError = new Error(`Application worker process error: ${String(error)}`);
      this.failAllPending(engineError);
      this.emitClose(engineError);
    });
    process.on("close", (code, signal) => {
      if (this.closed) {
        return;
      }
      const error = new Error(
        `Application worker process closed unexpectedly (code=${String(code)}, signal=${String(signal)}).`,
      );
      this.failAllPending(error);
      this.emitClose(error);
      this.process = null;
      this.closed = true;
    });
  }

  async close(): Promise<void> {
    const proc = this.process;
    if (!proc) {
      return;
    }
    this.closed = true;
    this.process = null;
    this.failAllPending(new Error("Application engine client closed."));
    try {
      proc.kill("SIGTERM");
    } catch {
      // no-op
    }
    this.emitClose(null);
  }

  onNotification(listener: (message: ApplicationEngineClientNotification) => void): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  onClose(listener: (error: Error | null) => void): () => void {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
  }

  async request<T = unknown>(method: string, params?: Record<string, unknown>, timeoutMs = 30_000): Promise<T> {
    this.ensureAttached();
    const id = this.nextRequestId++;
    const promise = new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Application worker request timed out: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeoutHandle);
          resolve(value as T);
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
      params: params ?? {},
    });
    return promise;
  }

  private emitClose(error: Error | null): void {
    for (const listener of this.closeListeners) {
      try {
        listener(error);
      } catch {
        // no-op
      }
    }
  }

  private failAllPending(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeoutHandle);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  private ensureAttached(): void {
    if (!this.process) {
      throw new Error("Application engine client is not attached to a worker process.");
    }
  }

  private writeFrame(frame: Record<string, unknown>): void {
    if (!this.process) {
      throw new Error("Application engine client is not attached to a worker process.");
    }
    this.process.stdin.write(`${JSON.stringify(frame)}\n`);
  }

  private onStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    while (true) {
      const newlineIndex = this.stdoutBuffer.indexOf("\n");
      if (newlineIndex < 0) {
        return;
      }
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (!line) {
        continue;
      }
      this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    let payload: unknown;
    try {
      payload = JSON.parse(line);
    } catch {
      return;
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return;
    }
    const envelope = payload as Record<string, unknown>;
    const method = typeof envelope.method === "string" ? envelope.method : null;
    const id = typeof envelope.id === "number" || typeof envelope.id === "string" ? envelope.id : null;

    if (method === APPLICATION_ENGINE_NOTIFICATION_METHOD) {
      for (const listener of this.notificationListeners) {
        try {
          listener((envelope.params ?? {}) as ApplicationEngineClientNotification);
        } catch {
          // no-op
        }
      }
      return;
    }

    if (id === null) {
      return;
    }

    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return;
    }
    this.pendingRequests.delete(id);

    if (Object.prototype.hasOwnProperty.call(envelope, "error")) {
      const errorPayload = envelope.error as Record<string, unknown> | undefined;
      const message =
        errorPayload && typeof errorPayload.message === "string"
          ? errorPayload.message
          : "Application worker request failed.";
      pending.reject(new Error(message));
      return;
    }

    pending.resolve(envelope.result);
  }
}
