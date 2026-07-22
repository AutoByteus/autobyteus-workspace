import type { ApplicationWebSocketFrame } from "@autobyteus/application-sdk-contracts";

export const APPLICATION_BACKEND_WEBSOCKET_FRAME_BYTES_LIMIT = 1024 * 1024;

export type ApplicationBackendWebSocketConnectionState = "connecting" | "open" | "closing" | "closed";
export type ApplicationBackendWebSocketCloseEvent = { code: number; reason: string; wasClean: boolean };
export type ApplicationBackendWebSocketConnectionErrorCode =
  | "CONNECTION_NOT_READY"
  | "CONNECTION_CLOSED"
  | "CONNECTION_ABORTED"
  | "CONNECTION_REJECTED"
  | "PROTOCOL_ERROR"
  | "FRAME_TOO_LARGE"
  | "BACKPRESSURE_LIMIT"
  | "BACKEND_UNAVAILABLE"
  | "TRANSPORT_FAILED"
  | "SEND_FAILED";

const ERROR_DETAILS: Record<ApplicationBackendWebSocketConnectionErrorCode, { message: string; recoverable: boolean }> = {
  CONNECTION_NOT_READY: { message: "The application backend WebSocket connection is not ready.", recoverable: true },
  CONNECTION_CLOSED: { message: "The application backend WebSocket connection is closed.", recoverable: true },
  CONNECTION_ABORTED: { message: "The application backend WebSocket connection was aborted.", recoverable: true },
  CONNECTION_REJECTED: { message: "The application backend WebSocket connection was rejected.", recoverable: true },
  PROTOCOL_ERROR: { message: "The application backend WebSocket readiness protocol was invalid.", recoverable: false },
  FRAME_TOO_LARGE: { message: "The application backend WebSocket frame exceeds the delivery limit.", recoverable: false },
  BACKPRESSURE_LIMIT: { message: "The application backend WebSocket exceeded its delivery limit.", recoverable: true },
  BACKEND_UNAVAILABLE: { message: "The application backend WebSocket handler is unavailable.", recoverable: true },
  TRANSPORT_FAILED: { message: "The application backend WebSocket transport failed.", recoverable: true },
  SEND_FAILED: { message: "The application backend WebSocket frame could not be sent.", recoverable: true },
};

export class ApplicationBackendWebSocketConnectionError extends Error {
  readonly recoverable: boolean;
  constructor(readonly code: ApplicationBackendWebSocketConnectionErrorCode) {
    super(ERROR_DETAILS[code].message);
    this.name = "ApplicationBackendWebSocketConnectionError";
    this.recoverable = ERROR_DETAILS[code].recoverable;
  }
}

export type ApplicationBackendWebSocketConnectOptions = {
  signal?: AbortSignal;
  query?: Record<string, string | string[]>;
};
export type ApplicationBackendWebSocketConnection = {
  readonly state: ApplicationBackendWebSocketConnectionState;
  readonly ready: Promise<void>;
  send: (frame: ApplicationWebSocketFrame | string | Uint8Array) => Promise<void>;
  onMessage: (listener: (frame: ApplicationWebSocketFrame) => void) => () => void;
  onError: (listener: (error: ApplicationBackendWebSocketConnectionError) => void) => () => void;
  onClose: (listener: (event: ApplicationBackendWebSocketCloseEvent) => void) => () => void;
  close: (code?: number, reason?: string) => void;
};
export type ApplicationBackendWebSocketTransport = {
  send: (frame: ApplicationWebSocketFrame) => void;
  close: (code?: number, reason?: string) => void;
  onMessage: (listener: (frame: ApplicationWebSocketFrame) => void) => () => void;
  onError: (listener: () => void) => () => void;
  onClose: (listener: (event: ApplicationBackendWebSocketCloseEvent) => void) => () => void;
};

const READY_PROTOCOL = "autobyteus.application-backend.websocket.v1";
const exactReady = (frame: ApplicationWebSocketFrame): boolean => {
  if (frame.kind !== "text") return false;
  try {
    const value = JSON.parse(frame.text) as Record<string, unknown>;
    return Object.keys(value).length === 2 && value.protocol === READY_PROTOCOL && value.type === "CONNECTION_READY";
  } catch { return false; }
};
const normalizeFrame = (frame: ApplicationWebSocketFrame | string | Uint8Array): ApplicationWebSocketFrame => {
  if (typeof frame === "string") return { kind: "text", text: frame };
  if (frame instanceof Uint8Array) return { kind: "binary", data: new Uint8Array(frame) };
  return frame.kind === "binary" ? { kind: "binary", data: new Uint8Array(frame.data) } : { kind: "text", text: frame.text };
};
const frameBytes = (frame: ApplicationWebSocketFrame): number =>
  frame.kind === "text" ? new TextEncoder().encode(frame.text).byteLength : frame.data.byteLength;
const codeForClose = (code: number, wasOpen: boolean): ApplicationBackendWebSocketConnectionErrorCode | null => {
  if (code === 1000) return null;
  if (code === 1002) return "PROTOCOL_ERROR";
  if (code === 1009) return "FRAME_TOO_LARGE";
  if (code === 1012) return "BACKEND_UNAVAILABLE";
  if (code === 1013) return "BACKPRESSURE_LIMIT";
  if (code === 1011) return wasOpen ? "BACKEND_UNAVAILABLE" : "CONNECTION_REJECTED";
  return "TRANSPORT_FAILED";
};

export const createApplicationBackendWebSocketConnection = (input: {
  transport: ApplicationBackendWebSocketTransport;
  signal?: AbortSignal;
}): ApplicationBackendWebSocketConnection => {
  let state: ApplicationBackendWebSocketConnectionState = "connecting";
  let readySettled = false;
  let closed = false;
  let everOpened = false;
  let errorDispatched = false;
  const messages = new Set<(frame: ApplicationWebSocketFrame) => void>();
  const errors = new Set<(error: ApplicationBackendWebSocketConnectionError) => void>();
  const closes = new Set<(event: ApplicationBackendWebSocketCloseEvent) => void>();
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  void ready.catch(() => undefined);
  let releases: Array<() => void> = [];
  const dispatchError = (error: ApplicationBackendWebSocketConnectionError): void => {
    errorDispatched = true;
    for (const listener of errors) queueMicrotask(() => { try { listener(error); } catch { /* listener isolation */ } });
  };
  const rejectEstablishment = (code: ApplicationBackendWebSocketConnectionErrorCode, emit: boolean): void => {
    if (readySettled) return;
    readySettled = true;
    const error = new ApplicationBackendWebSocketConnectionError(code);
    rejectReady(error);
    if (emit) dispatchError(error);
  };
  const finalize = (event: ApplicationBackendWebSocketCloseEvent): void => {
    if (closed) return;
    closed = true;
    state = "closed";
    const code = codeForClose(event.code, everOpened);
    if (!readySettled) rejectEstablishment(code ?? "CONNECTION_REJECTED", code !== null);
    else if (code && !errorDispatched) dispatchError(new ApplicationBackendWebSocketConnectionError(code));
    input.signal?.removeEventListener("abort", abort);
    for (const release of releases.splice(0)) release();
    for (const listener of closes) queueMicrotask(() => { try { listener(event); } catch { /* listener isolation */ } });
  };
  const protocolFailure = (): void => {
    if (state !== "connecting") return;
    state = "closing";
    rejectEstablishment("PROTOCOL_ERROR", true);
    try { input.transport.close(1002, "Invalid readiness protocol"); }
    catch { finalize({ code: 1002, reason: "Invalid readiness protocol", wasClean: false }); }
  };
  const abort = (): void => {
    if (state === "closed" || state === "closing") return;
    const wasConnecting = state === "connecting";
    state = "closing";
    if (wasConnecting) rejectEstablishment("CONNECTION_ABORTED", false);
    try { input.transport.close(1000, "Aborted"); }
    catch { finalize({ code: 1000, reason: "Aborted", wasClean: true }); }
  };
  releases = [
    input.transport.onMessage((frame) => {
      if (state === "connecting") {
        if (!exactReady(frame)) { protocolFailure(); return; }
        state = "open";
        everOpened = true;
        readySettled = true;
        resolveReady();
        return;
      }
      if (state !== "open") return;
      for (const listener of messages) queueMicrotask(() => { try { listener(frame); } catch { /* listener isolation */ } });
    }),
    input.transport.onError(() => {
      if (state === "connecting") {
        state = "closing";
        rejectEstablishment("TRANSPORT_FAILED", true);
      } else if (state === "open") dispatchError(new ApplicationBackendWebSocketConnectionError("TRANSPORT_FAILED"));
    }),
    input.transport.onClose(finalize),
  ];
  input.signal?.addEventListener("abort", abort, { once: true });
  if (input.signal?.aborted) abort();
  return {
    get state() { return state; },
    ready,
    send: async (value) => {
      if (state === "connecting") throw new ApplicationBackendWebSocketConnectionError("CONNECTION_NOT_READY");
      if (state !== "open") throw new ApplicationBackendWebSocketConnectionError("CONNECTION_CLOSED");
      const frame = normalizeFrame(value);
      if (frameBytes(frame) > APPLICATION_BACKEND_WEBSOCKET_FRAME_BYTES_LIMIT) {
        throw new ApplicationBackendWebSocketConnectionError("FRAME_TOO_LARGE");
      }
      try { input.transport.send(frame); }
      catch {
        const error = new ApplicationBackendWebSocketConnectionError("SEND_FAILED");
        dispatchError(error);
        state = "closing";
        try { input.transport.close(1011, "Send failed"); } catch { /* close callback owns finalization */ }
        throw error;
      }
    },
    onMessage: (listener) => { messages.add(listener); return () => messages.delete(listener); },
    onError: (listener) => { errors.add(listener); return () => errors.delete(listener); },
    onClose: (listener) => { closes.add(listener); return () => closes.delete(listener); },
    close: (code = 1000, reason = "") => {
      if (state === "closed" || state === "closing") return;
      const wasConnecting = state === "connecting";
      state = "closing";
      if (wasConnecting) rejectEstablishment("CONNECTION_ABORTED", false);
      try { input.transport.close(code, reason); }
      catch { finalize({ code, reason, wasClean: code === 1000 }); }
    },
  };
};
