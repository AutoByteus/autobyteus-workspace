import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  RequestError,
  ndJsonStream,
  type AnyMessage,
  type Client,
  type InitializeResponse,
  type ListSessionsRequest,
  type ListSessionsResponse,
  type LoadSessionRequest,
  type LoadSessionResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type ResumeSessionRequest,
  type ResumeSessionResponse,
  type SessionNotification,
  type SetSessionConfigOptionRequest,
  type SetSessionConfigOptionResponse,
  type Stream,
} from "@agentclientprotocol/sdk";
import type { AcpAgentProcess, AcpAgentProcessExit } from "./acp-agent-process.js";

/**
 * How long an agent may take to answer `initialize`, its start-up (autobyteus-551): an agent's own start-up was seen
 * at up to 34.6 s on a loaded machine; 90 s keeps a margin of about 2.5x while a hung agent still fails.
 */
const AGENT_START_TIMEOUT_MS = 90_000;
/** The bound of every other request with a time-out except the session opens (extension requests, config, list, close). */
const REQUEST_TIMEOUT_MS = 30_000;
const SESSION_OPEN_TIMEOUT_MS = 120_000;
const MAX_BUFFERED_FRAMES = 2_000;

const CLIENT_INFO = { name: "autobyteus", version: "1.0.0" } as const;
const logger = { warn: (...args: unknown[]) => console.warn(...args) };
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * The minimal shape the stage checks before routing a `session/update` (the SDK does not export its schema): a
 * non-empty string `sessionId` and an `update` object with a string `sessionUpdate`.
 */
const isSessionNotification = (params: Record<string, unknown>): boolean =>
  sessionIdOf(params) !== null && isRecord(params.update) && typeof params.update.sessionUpdate === "string";

/** JSON-RPC protocol notifications (`$/cancel_request`) stay the SDK's to handle. */
const isProtocolNotification = (method: string): boolean => method.startsWith("$/");

/** Receives the notifications of one connection that carry no `sessionId`. */
export type AcpConnectionNotificationListener = (method: string, params: Record<string, unknown>) => void;

/**
 * One SDK client connection over one agent process. Routes agent-to-client frames to the
 * registered session by `sessionId`, buffering frames for a session that is still being
 * opened until it registers; hands notifications without a `sessionId` (connection-wide) to
 * its connection listeners; and answers client methods AutoByteus does not offer.
 */
export class AcpClientConnection {
  private readonly sdk: ClientSideConnection;
  private readonly handlers = new Map<string, AcpSessionFrameHandler>();
  private readonly buffered = new Map<string, BufferedFrame[]>();
  private readonly closeListeners = new Set<(close: AcpConnectionClose) => void>();
  private readonly connectionListeners = new Set<AcpConnectionNotificationListener>();
  private bufferedCount = 0;
  private closeInfo: AcpConnectionClose | null = null;

  constructor(private readonly process: AcpAgentProcess, readonly agentLabel: string) {
    const client: Client = {
      // The inbound stage delivers session updates and extension notifications itself, in wire order
      // (`inboundFrameStage`); none reaches the SDK. Required by the SDK's Client type.
      sessionUpdate: async () => undefined,
      requestPermission: (params) => this.routePermission(params),
      extNotification: async () => undefined,
      extMethod: async (method) => { throw RequestError.methodNotFound(method); },
    };
    this.sdk = new ClientSideConnection(() => client,
      this.inboundFrameStage(ndJsonStream(process.output, process.input)));
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

  /**
   * Listens to the connection-wide notifications (no `sessionId`), in wire order. A listener's failure is logged and
   * contained; the other listeners and the stream go on. Returns the unsubscribe.
   */
  onConnectionNotification(listener: AcpConnectionNotificationListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  async initialize(): Promise<InitializeResponse> {
    return this.guard("initialize", withTimeout(this.sdk.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: CLIENT_INFO,
    }), AGENT_START_TIMEOUT_MS, "initialize"));
  }

  extension(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.guard(method, withTimeout(this.sdk.extMethod(method, params), REQUEST_TIMEOUT_MS, method));
  }

  newSession(request: NewSessionRequest): Promise<NewSessionResponse> {
    return this.guard("session/new",
      withTimeout(this.sdk.newSession(request), SESSION_OPEN_TIMEOUT_MS, "session/new"));
  }

  loadSession(request: LoadSessionRequest): Promise<LoadSessionResponse> {
    return this.guard("session/load",
      withTimeout(this.sdk.loadSession(request), SESSION_OPEN_TIMEOUT_MS, "session/load"));
  }

  /** Reopens an existing session without replaying its history. */
  resumeSession(request: ResumeSessionRequest): Promise<ResumeSessionResponse> {
    return this.guard("session/resume",
      withTimeout(this.sdk.resumeSession(request), SESSION_OPEN_TIMEOUT_MS, "session/resume"));
  }

  setSessionConfigOption(request: SetSessionConfigOptionRequest): Promise<SetSessionConfigOptionResponse> {
    return this.guard("session/set_config_option",
      withTimeout(this.sdk.setSessionConfigOption(request), REQUEST_TIMEOUT_MS, "session/set_config_option"));
  }

  listSessions(request: ListSessionsRequest): Promise<ListSessionsResponse> {
    return this.guard("session/list",
      withTimeout(this.sdk.listSessions(request), REQUEST_TIMEOUT_MS, "session/list"));
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.guard("session/close",
      withTimeout(this.sdk.closeSession({ sessionId }), REQUEST_TIMEOUT_MS, "session/close"));
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

  /**
   * The inbound stage (autobyteus-517, IR-001): every notification is handed to its session here, synchronously and in
   * wire order, before any later frame, a response included, reaches the SDK. The SDK resolves a response at once but
   * awaits notification handlers one by one, so on its own path a `session/prompt` response could overtake
   * notifications that preceded it. A `session/update` that fails the minimal checks is dropped; every other
   * notification goes to `routeExt` with its method unchanged; protocol (`$/`) notifications, responses and the
   * agent's requests (permission requests) pass on to the SDK; responses to requests this client never sent are
   * dropped. A handler's failure is logged and contained: the stage never throws, so the stream and every other
   * session stay open.
   */
  private inboundFrameStage(stream: Stream): Stream {
    return {
      writable: stream.writable,
      readable: stream.readable.pipeThrough(new TransformStream<AnyMessage, AnyMessage>({
        transform: (message, controller) => {
          if (isForeignResponse(message)) return;
          if ("method" in message && !("id" in message) && !isProtocolNotification(message.method)) {
            this.deliverNotification(message.method, isRecord(message.params) ? message.params : {});
            return;
          }
          controller.enqueue(message);
        },
      })),
    };
  }

  private deliverNotification(method: string, params: Record<string, unknown>): void {
    try {
      if (method !== "session/update") {
        this.routeExt(method, params);
      } else if (isSessionNotification(params)) {
        this.routeUpdate(params as unknown as SessionNotification);
      } else {
        logger.warn(`ACP_FRAME_DROPPED: ${this.agentLabel} sent a malformed session/update.`);
      }
    } catch (error: unknown) {
      logger.warn(`ACP_FRAME_HANDLER_FAILED: ${this.agentLabel} method=${method} session=${sessionIdOf(params) ?? "-"}: ${String(error)}`);
    }
  }

  private routeUpdate(notification: SessionNotification): void {
    this.route(notification.sessionId, { kind: "update", notification });
  }

  private routeExt(method: string, params: Record<string, unknown>): void {
    const sessionId = sessionIdOf(params);
    if (sessionId) this.route(sessionId, { kind: "ext", method, params });
    else this.notifyConnectionListeners(method, params);
  }

  /** Connection-wide notifications serve no run; runs register no listener, so they are dropped there as before. */
  private notifyConnectionListeners(method: string, params: Record<string, unknown>): void {
    for (const listener of this.connectionListeners) {
      try {
        listener(method, params);
      } catch (error: unknown) {
        logger.warn(`ACP_FRAME_HANDLER_FAILED: ${this.agentLabel} method=${method} connection listener: ${String(error)}`);
      }
    }
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
