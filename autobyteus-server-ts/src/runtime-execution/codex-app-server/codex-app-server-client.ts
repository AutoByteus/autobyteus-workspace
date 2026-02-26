import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";

type JsonRpcId = number | string;

type JsonRpcResponseError = {
  code?: number;
  message?: string;
  data?: unknown;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutHandle: NodeJS.Timeout;
};

export interface CodexAppServerClientOptions {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  requestTimeoutMs?: number;
}

export interface CodexNotificationMessage {
  method: string;
  params: Record<string, unknown>;
}

export interface CodexServerRequestMessage extends CodexNotificationMessage {
  id: JsonRpcId;
}

export class CodexAppServerClient {
  private readonly options: CodexAppServerClientOptions;
  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private readonly notificationListeners = new Set<(message: CodexNotificationMessage) => void>();
  private readonly serverRequestListeners = new Set<(message: CodexServerRequestMessage) => void>();
  private readonly closeListeners = new Set<(error: Error | null) => void>();
  private process: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = "";
  private nextRequestId = 1;
  private closed = false;

  constructor(options: CodexAppServerClientOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.process) {
      return;
    }
    this.closed = false;
    this.process = spawn(this.options.command, this.options.args, {
      cwd: this.options.cwd,
      env: this.options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.stdout.on("data", (chunk: Buffer) => {
      this.onStdout(chunk.toString("utf-8"));
    });
    this.process.stderr.on("data", (chunk: Buffer) => {
      console.warn(`[CodexAppServerClient] stderr: ${chunk.toString("utf-8").trimEnd()}`);
    });
    this.process.on("error", (error) => {
      this.failAllPending(new Error(`Codex app server process error: ${String(error)}`));
      this.emitClose(new Error(`Codex app server process error: ${String(error)}`));
    });
    this.process.on("close", (code, signal) => {
      if (this.closed) {
        return;
      }
      const error = new Error(
        `Codex app server process closed unexpectedly (code=${String(code)}, signal=${String(signal)}).`,
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
    this.failAllPending(new Error("Codex app server client closed."));
    proc.kill("SIGTERM");
    try {
      await once(proc, "close");
    } catch {
      // ignore
    }
    this.emitClose(null);
  }

  onNotification(listener: (message: CodexNotificationMessage) => void): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  onServerRequest(listener: (message: CodexServerRequestMessage) => void): () => void {
    this.serverRequestListeners.add(listener);
    return () => {
      this.serverRequestListeners.delete(listener);
    };
  }

  onClose(listener: (error: Error | null) => void): () => void {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
  }

  async request<T = unknown>(
    method: string,
    params: Record<string, unknown> | undefined,
    timeoutMs = this.options.requestTimeoutMs ?? 60_000,
  ): Promise<T> {
    this.ensureStarted();
    const id = this.nextRequestId++;
    const frame = {
      jsonrpc: "2.0",
      id,
      method,
      params: params ?? {},
    } satisfies Record<string, unknown>;

    const promise = new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Codex app server request timed out: ${method}`));
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

    this.writeFrame(frame);
    return promise;
  }

  notify(method: string, params?: Record<string, unknown>): void {
    this.ensureStarted();
    this.writeFrame({
      jsonrpc: "2.0",
      method,
      params: params ?? {},
    });
  }

  respondSuccess(id: JsonRpcId, result: Record<string, unknown>): void {
    this.ensureStarted();
    this.writeFrame({
      jsonrpc: "2.0",
      id,
      result,
    });
  }

  respondError(id: JsonRpcId, code: number, message: string, data?: unknown): void {
    this.ensureStarted();
    this.writeFrame({
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        data,
      },
    });
  }

  private emitClose(error: Error | null): void {
    for (const listener of this.closeListeners) {
      try {
        listener(error);
      } catch (listenerError) {
        console.warn(
          `[CodexAppServerClient] close listener failed: ${String(listenerError)}`,
        );
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

  private ensureStarted(): void {
    if (!this.process) {
      throw new Error("Codex app server client is not started.");
    }
  }

  private writeFrame(frame: Record<string, unknown>): void {
    if (!this.process) {
      throw new Error("Codex app server client is not started.");
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
    } catch (error) {
      console.warn(`[CodexAppServerClient] invalid JSON line: ${line} (${String(error)})`);
      return;
    }

    const envelope = this.asObject(payload);
    if (!envelope) {
      return;
    }

    const method = typeof envelope.method === "string" ? envelope.method : null;
    const id = this.parseId(envelope.id);
    const hasResult = Object.prototype.hasOwnProperty.call(envelope, "result");
    const error = this.asObject(envelope.error);

    if (method && id !== null) {
      const params = this.asObject(envelope.params) ?? {};
      for (const listener of this.serverRequestListeners) {
        try {
          listener({ id, method, params });
        } catch (listenerError) {
          console.warn(
            `[CodexAppServerClient] server-request listener failed: ${String(listenerError)}`,
          );
        }
      }
      return;
    }

    if (method) {
      const params = this.asObject(envelope.params) ?? {};
      for (const listener of this.notificationListeners) {
        try {
          listener({ method, params });
        } catch (listenerError) {
          console.warn(
            `[CodexAppServerClient] notification listener failed: ${String(listenerError)}`,
          );
        }
      }
      return;
    }

    if (id !== null && (hasResult || error)) {
      const pending = this.pendingRequests.get(id);
      if (!pending) {
        return;
      }
      this.pendingRequests.delete(id);
      if (error) {
        const rpcError = error as JsonRpcResponseError;
        pending.reject(
          new Error(
            `Codex app server RPC error${typeof rpcError.code === "number" ? ` ${rpcError.code}` : ""}: ${
              typeof rpcError.message === "string" ? rpcError.message : "Unknown error"
            }`,
          ),
        );
        return;
      }
      pending.resolve(envelope.result);
    }
  }

  private parseId(value: unknown): JsonRpcId | null {
    if (typeof value === "number" || typeof value === "string") {
      return value;
    }
    return null;
  }

  private asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }
}

