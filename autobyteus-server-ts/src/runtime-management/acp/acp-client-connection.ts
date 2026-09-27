import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  RequestError,
  ndJsonStream,
  type AnyMessage,
  type Client,
  type InitializeResponse,
  type LoadSessionRequest,
  type LoadSessionResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
  type Stream,
} from "@agentclientprotocol/sdk";
import type { AcpAgentProcess, AcpAgentProcessExit } from "./acp-agent-process.js";

const INITIALIZE_TIMEOUT_MS = 30_000;
const SESSION_OPEN_TIMEOUT_MS = 120_000;
const MAX_BUFFERED_FRAMES = 2_000;

const CLIENT_INFO = { name: "autobyteus", version: "1.0.0" } as const;
const CANCELLED_PERMISSION: RequestPermissionResponse = { outcome: { outcome: "cancelled" } };

/** Receives the agent-to-client frames of one registered session. Must not throw. */
export interface AcpSessionFrameHandler {
  onSessionUpdate(notification: SessionNotification): void;
  onPermissionRequest(request: RequestPermissionRequest): Promise<RequestPermissionResponse>;
  onExtNotification(method: string, params: Record<string, unknown>): void;
}

export type AcpConnectionClose = Readonly<{
  code: "ACP_AGENT_PROCESS_EXITED" | "ACP_TRANSPORT_CLOSED";
  message: string;
  exit: AcpAgentProcessExit | null;
}>;

type BufferedFrame =
  | Readonly<{ kind: "update"; notification: SessionNotification }>
  | Readonly<{ kind: "ext"; method: string; params: Record<string, unknown> }>
  | Readonly<{
      kind: "permission";
      request: RequestPermissionRequest;
      resolve: (response: RequestPermissionResponse) => void;
    }>;

export class AcpRequestTimeoutError extends Error {
  constructor(readonly method: string) {
    super(`ACP_REQUEST_TIMEOUT: ${method} did not respond in time.`);
    this.name = "AcpRequestTimeoutError";
  }
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, method: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AcpRequestTimeoutError(method)), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });

const sessionIdOf = (params: Record<string, unknown>): string | null =>
  typeof params.sessionId === "string" && params.sessionId.length > 0 ? params.sessionId : null;

/**
 * The SDK numbers its own requests. A response carrying any other id answers a request
 * this client never sent (some agents emit such frames); it is dropped before the SDK.
 */
const isForeignResponse = (message: AnyMessage): boolean =>
  !("method" in message) && "id" in message && typeof message.id !== "number";

const filterForeignResponses = (stream: Stream): Stream => ({
  writable: stream.writable,
  readable: stream.readable.pipeThrough(new TransformStream<AnyMessage, AnyMessage>({
    transform(message, controller) {
      if (!isForeignResponse(message)) controller.enqueue(message);
    },
  })),
});

/**
 * One SDK client connection over one agent process. Routes agent-to-client frames to the
 * registered session by `sessionId`, buffering frames for a session that is still being
 * opened until it registers, and answers client methods AutoByteus does not offer.
 */
export class AcpClientConnection {
  private readonly sdk: ClientSideConnection;
  private readonly handlers = new Map<string, AcpSessionFrameHandler>();
  private readonly buffered = new Map<string, BufferedFrame[]>();
  private readonly closeListeners = new Set<(close: AcpConnectionClose) => void>();
  private bufferedCount = 0;
  private closeInfo: AcpConnectionClose | null = null;

  constructor(private readonly process: AcpAgentProcess, readonly agentLabel: string) {
    const client: Client = {
      sessionUpdate: (params) => { this.routeUpdate(params); },
      requestPermission: (params) => this.routePermission(params),
      extNotification: async (method, params) => { this.routeExt(method, params); },
      extMethod: async (method) => { throw RequestError.methodNotFound(method); },
    };
    this.sdk = new ClientSideConnection(() => client,
      filterForeignResponses(ndJsonStream(process.output, process.input)));
    process.onExit((exit) => this.markClosed({
      code: "ACP_AGENT_PROCESS_EXITED",
      message: `${agentLabel} process exited (${exit.spawnErrorCode ?? exit.code ?? exit.signal ?? "unknown"}).`,
      exit,
    }));
    const transportClosed = () => this.markClosed({
      code: "ACP_TRANSPORT_CLOSED", message: `${agentLabel} ACP connection closed.`, exit: process.exited,
    });
    void this.sdk.closed.then(transportClosed, transportClosed);
  }

  get closed(): AcpConnectionClose | null { return this.closeInfo; }

  onClose(listener: (close: AcpConnectionClose) => void): () => void {
    if (this.closeInfo) {
      listener(this.closeInfo);
      return () => undefined;
    }
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  async initialize(): Promise<InitializeResponse> {
    return this.guard("initialize", withTimeout(this.sdk.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: CLIENT_INFO,
    }), INITIALIZE_TIMEOUT_MS, "initialize"));
  }

  newSession(request: NewSessionRequest): Promise<NewSessionResponse> {
    return this.guard("session/new",
      withTimeout(this.sdk.newSession(request), SESSION_OPEN_TIMEOUT_MS, "session/new"));
  }

  loadSession(request: LoadSessionRequest): Promise<LoadSessionResponse> {
    return this.guard("session/load",
      withTimeout(this.sdk.loadSession(request), SESSION_OPEN_TIMEOUT_MS, "session/load"));
  }

  /** No request timeout: turn liveness is owned by the session's idle timer. */
  prompt(request: PromptRequest): Promise<PromptResponse> {
    return this.guard("session/prompt", this.sdk.prompt(request));
  }

  async cancel(sessionId: string): Promise<void> {
    if (this.closeInfo) return;
    await this.sdk.cancel({ sessionId });
  }

  /** Registers the frame handler of one session and flushes frames buffered for it. */
  registerSession(sessionId: string, handler: AcpSessionFrameHandler): void {
    this.handlers.set(sessionId, handler);
    const frames = this.buffered.get(sessionId) ?? [];
    this.buffered.delete(sessionId);
    this.bufferedCount -= frames.length;
    for (const frame of frames) this.deliver(handler, frame);
  }

  unregisterSession(sessionId: string): void {
    this.handlers.delete(sessionId);
  }

  /** Stops the agent process; the connection reports closed once it exits. */
  async close(): Promise<void> {
    await this.process.stop();
  }

  private routeUpdate(notification: SessionNotification): void {
    this.route(notification.sessionId, { kind: "update", notification });
  }

  private routeExt(method: string, params: Record<string, unknown>): void {
    const sessionId = sessionIdOf(params);
    // Connection-wide extension notifications carry no session and serve no run.
    if (sessionId) this.route(sessionId, { kind: "ext", method, params });
  }

  private routePermission(request: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    if (this.closeInfo) return Promise.resolve(CANCELLED_PERMISSION);
    const handler = this.handlers.get(request.sessionId);
    if (handler) return this.answerPermission(handler, request);
    return new Promise((resolve) => this.buffer(request.sessionId, { kind: "permission", request, resolve }));
  }

  private route(sessionId: string, frame: BufferedFrame): void {
    const handler = this.handlers.get(sessionId);
    if (handler) this.deliver(handler, frame);
    else this.buffer(sessionId, frame);
  }

  private deliver(handler: AcpSessionFrameHandler, frame: BufferedFrame): void {
    if (frame.kind === "update") handler.onSessionUpdate(frame.notification);
    else if (frame.kind === "ext") handler.onExtNotification(frame.method, frame.params);
    else void this.answerPermission(handler, frame.request).then(frame.resolve);
  }

  private async answerPermission(
    handler: AcpSessionFrameHandler,
    request: RequestPermissionRequest,
  ): Promise<RequestPermissionResponse> {
    try { return await handler.onPermissionRequest(request); }
    catch { return CANCELLED_PERMISSION; }
  }

  private buffer(sessionId: string, frame: BufferedFrame): void {
    if (this.closeInfo) {
      if (frame.kind === "permission") frame.resolve(CANCELLED_PERMISSION);
      return;
    }
    const frames = this.buffered.get(sessionId) ?? [];
    frames.push(frame);
    this.buffered.set(sessionId, frames);
    this.bufferedCount += 1;
    if (this.bufferedCount > MAX_BUFFERED_FRAMES) this.dropOldestBufferedFrame();
  }

  private dropOldestBufferedFrame(): void {
    for (const [sessionId, frames] of this.buffered) {
      const dropped = frames.shift();
      if (frames.length === 0) this.buffered.delete(sessionId);
      if (!dropped) continue;
      this.bufferedCount -= 1;
      if (dropped.kind === "permission") dropped.resolve(CANCELLED_PERMISSION);
      return;
    }
  }

  private guard<T>(method: string, promise: Promise<T>): Promise<T> {
    if (this.closeInfo) return Promise.reject(new Error(`${this.closeInfo.code}: ${method} after close.`));
    return promise;
  }

  private markClosed(close: AcpConnectionClose): void {
    if (this.closeInfo) return;
    this.closeInfo = close;
    for (const frames of this.buffered.values()) {
      for (const frame of frames) if (frame.kind === "permission") frame.resolve(CANCELLED_PERMISSION);
    }
    this.buffered.clear();
    this.bufferedCount = 0;
    for (const listener of this.closeListeners) listener(close);
    this.closeListeners.clear();
  }
}
