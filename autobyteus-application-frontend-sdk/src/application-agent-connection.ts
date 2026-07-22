import {
  APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
  ApplicationAgentConnectionError,
  type ApplicationAgentClientFrame,
  type ApplicationAgentConnectionClose,
  type ApplicationAgentEvent,
  type ApplicationAgentInput,
  type ApplicationAgentServerFrame,
  type ApplicationAgentTargetAddress,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationAgentConnectionTransport } from "./application-agent-connection-transport.js";
import {
  parseApplicationAgentServerFrame,
  sameApplicationAgentTargetAddress,
} from "./application-agent-server-frame-parser.js";

export type ApplicationAgentConnectionState = "connecting" | "open" | "closing" | "closed";
export type ApplicationAgentConnectionOptions = { signal?: AbortSignal };
export type ApplicationAgentConnection = {
  readonly address: ApplicationAgentTargetAddress;
  readonly state: ApplicationAgentConnectionState;
  readonly ready: Promise<void>;
  sendInput: (input: ApplicationAgentInput) => Promise<void>;
  onEvent: (listener: (event: ApplicationAgentEvent) => void) => () => void;
  onError: (listener: (error: ApplicationAgentConnectionError) => void) => () => void;
  onClose: (listener: (close: ApplicationAgentConnectionClose) => void) => () => void;
  close: () => void;
};

type PendingInput = { resolve: () => void; reject: (error: Error) => void };
const APPLICATION_AGENT_CLIENT_FRAME_BYTES_LIMIT = 1024 * 1024;
let requestSequence = 0;
const nextRequestId = (): string => {
  const randomUUID = (globalThis.crypto as { randomUUID?: () => string } | undefined)?.randomUUID;
  return randomUUID ? randomUUID.call(globalThis.crypto) : `application-agent-input-${Date.now()}-${++requestSequence}`;
};
const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));

export const createApplicationAgentConnection = (input: {
  address: ApplicationAgentTargetAddress;
  transport: ApplicationAgentConnectionTransport;
  signal?: AbortSignal;
}): ApplicationAgentConnection => {
  const address = structuredClone(input.address);
  let state: ApplicationAgentConnectionState = "connecting";
  let readySettled = false;
  let closeEmitted = false;
  let announcedClose: ApplicationAgentConnectionClose["reason"] | null = null;
  const events = new Set<(event: ApplicationAgentEvent) => void>();
  const errors = new Set<(error: ApplicationAgentConnectionError) => void>();
  const closes = new Set<(close: ApplicationAgentConnectionClose) => void>();
  const pendingInputs = new Map<string, PendingInput>();
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;
  const ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  void ready.catch(() => undefined);
  let releases: Array<() => void> = [];

  const dispatch = <T>(listeners: Set<(value: T) => void>, value: T): void => {
    for (const listener of listeners) queueMicrotask(() => { try { listener(value); } catch { /* listener isolation */ } });
  };
  const settleReadyFailure = (error: ApplicationAgentConnectionError, emit: boolean): void => {
    if (!readySettled) { readySettled = true; rejectReady(error); }
    if (emit) dispatch(errors, error);
  };
  const rejectInputs = (error: Error): void => {
    for (const pending of pendingInputs.values()) pending.reject(error);
    pendingInputs.clear();
  };
  const emitClose = (reason: ApplicationAgentConnectionClose["reason"]): void => {
    if (closeEmitted) return;
    closeEmitted = true;
    state = "closed";
    input.signal?.removeEventListener("abort", abort);
    for (const release of releases.splice(0)) release();
    rejectInputs(new ApplicationAgentConnectionError({
      code: "TRANSPORT_FAILED",
      message: "The application agent connection transport failed.",
      recoverable: true,
    }));
    dispatch(closes, { reason });
  };
  const fail = (error: ApplicationAgentConnectionError, reason: ApplicationAgentConnectionClose["reason"]): void => {
    if (state === "closed" || state === "closing") return;
    const wasConnecting = state === "connecting";
    state = "closing";
    announcedClose = reason;
    if (wasConnecting) settleReadyFailure(error, true);
    else dispatch(errors, error);
  };
  const failProtocol = (): void => {
    fail(new ApplicationAgentConnectionError({
      code: "PROTOCOL_ERROR",
      message: "The application agent connection protocol was invalid.",
      recoverable: false,
    }), "PROTOCOL_ERROR");
    try { input.transport.close(1002, "Protocol error"); } catch { emitClose("PROTOCOL_ERROR"); }
  };
  const onMessage = (raw: unknown): void => {
    const frame = parseApplicationAgentServerFrame(raw);
    if (!frame) { failProtocol(); return; }
    if (state === "connecting") {
      if (frame.type === "ERROR" && hasOnlyKeys(frame as unknown as Record<string, unknown>, ["protocol", "type", "error"])) {
        fail(new ApplicationAgentConnectionError(frame.error), "ESTABLISHMENT_FAILED");
        return;
      }
      if (frame.type !== "READY" || !sameApplicationAgentTargetAddress(frame.address, address)) {
        failProtocol();
        return;
      }
      state = "open";
      readySettled = true;
      resolveReady();
      return;
    }
    if (state === "closing") {
      if (frame.type === "CLOSED") {
        announcedClose = frame.close.reason;
        emitClose(frame.close.reason);
        try { input.transport.close(1000, ""); } catch { /* finalized */ }
      }
      return;
    }
    if (state !== "open") return;
    if (frame.type === "EVENT" && hasOnlyKeys(frame as unknown as Record<string, unknown>, ["protocol", "type", "event"])) {
      if (!sameApplicationAgentTargetAddress(frame.event.address, address)) { failProtocol(); return; }
      dispatch(events, frame.event);
      return;
    }
    if ((frame.type === "INPUT_ACCEPTED" || frame.type === "INPUT_REJECTED") && typeof frame.requestId === "string") {
      const expected = frame.type === "INPUT_ACCEPTED"
        ? ["protocol", "type", "requestId"]
        : ["protocol", "type", "requestId", "error"];
      if (!hasOnlyKeys(frame as unknown as Record<string, unknown>, expected)) return failProtocol();
      const pending = pendingInputs.get(frame.requestId);
      if (!pending) { failProtocol(); return; }
      pendingInputs.delete(frame.requestId);
      if (frame.type === "INPUT_ACCEPTED") pending.resolve();
      else pending.reject(new ApplicationAgentConnectionError(frame.error));
      return;
    }
    if (frame.type === "ERROR" && hasOnlyKeys(frame as unknown as Record<string, unknown>, ["protocol", "type", "error"])) {
      dispatch(errors, new ApplicationAgentConnectionError(frame.error));
      return;
    }
    if (frame.type === "CLOSED" && hasOnlyKeys(frame as unknown as Record<string, unknown>, ["protocol", "type", "close"])) {
      state = "closing";
      announcedClose = frame.close.reason;
      emitClose(frame.close.reason);
      try { input.transport.close(1000, ""); } catch { /* finalized */ }
      return;
    }
    failProtocol();
  };
  const onTransportFailure = (): void => {
    if (state === "closed" || state === "closing") return;
    fail(new ApplicationAgentConnectionError({
      code: "TRANSPORT_FAILED",
      message: "The application agent connection transport failed.",
      recoverable: true,
    }), "TRANSPORT_FAILED");
  };
  const abort = (): void => {
    if (state === "closed" || state === "closing") return;
    const wasConnecting = state === "connecting";
    state = "closing";
    announcedClose = "ABORTED";
    if (wasConnecting) settleReadyFailure(new ApplicationAgentConnectionError({
      code: "CONNECTION_ABORTED",
      message: "Application agent connection was aborted.",
      recoverable: true,
    }), false);
    try { input.transport.close(1000, "Aborted"); } catch { emitClose("ABORTED"); }
  };

  releases = [
    input.transport.onMessage(onMessage),
    input.transport.onError(onTransportFailure),
    input.transport.onClose(() => {
      if (state === "connecting") onTransportFailure();
      emitClose(announcedClose ?? "TRANSPORT_FAILED");
    }),
  ];
  input.signal?.addEventListener("abort", abort, { once: true });
  if (input.signal?.aborted) abort();

  return {
    get address() { return structuredClone(address); },
    get state() { return state; },
    ready,
    sendInput: (agentInput) => {
      if (state !== "open") {
        return Promise.reject(new ApplicationAgentConnectionError({
          code: state === "connecting" ? "INPUT_REJECTED" : "TRANSPORT_FAILED",
          message: state === "connecting"
            ? "Application agent input was rejected."
            : "The application agent connection transport failed.",
          recoverable: true,
        }));
      }
      const requestId = nextRequestId();
      return new Promise<void>((resolve, reject) => {
        let serialized: string;
        try {
          const frame: ApplicationAgentClientFrame = {
            protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
            type: "INPUT",
            requestId,
            input: structuredClone(agentInput),
          };
          serialized = JSON.stringify(frame);
          if (new TextEncoder().encode(serialized).byteLength > APPLICATION_AGENT_CLIENT_FRAME_BYTES_LIMIT) {
            reject(new ApplicationAgentConnectionError({
              code: "INPUT_REJECTED",
              message: "Application agent input was rejected.",
              recoverable: true,
            }));
            return;
          }
        } catch {
          reject(new ApplicationAgentConnectionError({
            code: "INPUT_REJECTED",
            message: "Application agent input was rejected.",
            recoverable: true,
          }));
          return;
        }
        pendingInputs.set(requestId, { resolve, reject });
        try { input.transport.send(serialized); }
        catch {
          pendingInputs.delete(requestId);
          reject(new ApplicationAgentConnectionError({
            code: "TRANSPORT_FAILED",
            message: "The application agent connection transport failed.",
            recoverable: true,
          }));
        }
      });
    },
    onEvent: (listener) => { events.add(listener); return () => { events.delete(listener); }; },
    onError: (listener) => { errors.add(listener); return () => { errors.delete(listener); }; },
    onClose: (listener) => { closes.add(listener); return () => { closes.delete(listener); }; },
    close: () => {
      if (state === "closed" || state === "closing") return;
      const wasConnecting = state === "connecting";
      state = "closing";
      announcedClose = "CLIENT_CLOSED";
      if (wasConnecting) settleReadyFailure(new ApplicationAgentConnectionError({
        code: "CONNECTION_ABORTED",
        message: "Application agent connection was aborted.",
        recoverable: true,
      }), false);
      try { input.transport.close(1000, ""); } catch { emitClose("CLIENT_CLOSED"); }
    },
  };
};
