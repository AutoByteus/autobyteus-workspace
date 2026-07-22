import type {
  ApplicationHandlerContext,
  ApplicationWebSocketFrame,
  ApplicationWebSocketRequest,
  ApplicationWebSocketSession,
  ApplicationWebSocketSessionClose,
  ApplicationWebSocketSessionHandler,
} from "@autobyteus/application-sdk-contracts";
import {
  APPLICATION_WEBSOCKET_FRAME_BYTES_LIMIT,
  APPLICATION_WEBSOCKET_WORKER_OUTBOUND_QUEUE_LIMIT,
} from "../../application-communication-limits.js";
import type {
  ApplicationWebSocketIpcFrame,
  ApplicationWorkerWebSocketActionInput,
} from "../runtime/protocol.js";

type Registration = {
  controller: AbortController;
  handler: ApplicationWebSocketSessionHandler | null;
  state: "OPENING" | "ACTIVE" | "CLOSING" | "CLOSED";
  closeEvent: ApplicationWebSocketSessionClose | null;
  closeHandled: boolean;
  inboundChain: Promise<void>;
  outboundChain: Promise<void>;
  outboundPending: number;
};

export const applicationWebSocketFrameFromIpc = (frame: ApplicationWebSocketIpcFrame): ApplicationWebSocketFrame =>
  frame.kind === "text"
    ? { kind: "text", text: frame.text }
    : { kind: "binary", data: Uint8Array.from(Buffer.from(frame.dataBase64, "base64")) };
export const applicationWebSocketFrameToIpc = (
  frame: ApplicationWebSocketFrame | string | Uint8Array,
): ApplicationWebSocketIpcFrame => {
  if (typeof frame === "string") return { kind: "text", text: frame };
  if (frame instanceof Uint8Array) return { kind: "binary", dataBase64: Buffer.from(new Uint8Array(frame)).toString("base64") };
  return frame.kind === "text"
    ? { kind: "text", text: frame.text }
    : { kind: "binary", dataBase64: Buffer.from(new Uint8Array(frame.data)).toString("base64") };
};
const frameBytes = (frame: ApplicationWebSocketIpcFrame): number =>
  frame.kind === "text" ? Buffer.byteLength(frame.text, "utf8") : Buffer.byteLength(frame.dataBase64, "base64");

export class ApplicationWebSocketSessionRegistry {
  private readonly registrations = new Map<string, Registration>();
  constructor(private readonly invokeAction: (input: ApplicationWorkerWebSocketActionInput) => Promise<unknown>) {}

  async open(input: {
    sessionId: string;
    request: ApplicationWebSocketRequest;
    context: ApplicationHandlerContext;
    openHandler: (
      request: ApplicationWebSocketRequest,
      session: ApplicationWebSocketSession,
      context: ApplicationHandlerContext,
    ) => Promise<ApplicationWebSocketSessionHandler | void> | ApplicationWebSocketSessionHandler | void;
  }): Promise<void> {
    if (this.registrations.has(input.sessionId)) throw new Error("Application WebSocket session is already registered.");
    const registration: Registration = {
      controller: new AbortController(),
      handler: null,
      state: "OPENING",
      closeEvent: null,
      closeHandled: false,
      inboundChain: Promise.resolve(),
      outboundChain: Promise.resolve(),
      outboundPending: 0,
    };
    this.registrations.set(input.sessionId, registration);
    const session: ApplicationWebSocketSession = {
      sessionId: input.sessionId,
      signal: registration.controller.signal,
      send: (frame) => this.send(input.sessionId, registration, frame),
      close: (code = 1000, reason = "") => this.requestBackendClose(input.sessionId, registration, code, reason),
    };
    try {
      const handler = await input.openHandler(input.request, session, input.context) ?? null;
      registration.handler = handler;
      if (registration.state !== "OPENING") {
        await this.notifyCloseHandler(registration);
        throw new Error("Application WebSocket session closed during establishment.");
      }
      registration.state = "ACTIVE";
    } catch (error) {
      if (registration.state !== "CLOSED") await this.failSession(input.sessionId, registration, 1011, "Application route open failed");
      throw error;
    }
  }

  async deliver(sessionId: string, frame: ApplicationWebSocketIpcFrame): Promise<void> {
    const registration = this.registrations.get(sessionId);
    if (!registration || registration.state !== "ACTIVE") throw new Error("Application WebSocket session is not active.");
    if (frameBytes(frame) > APPLICATION_WEBSOCKET_FRAME_BYTES_LIMIT) {
      await this.failSession(sessionId, registration, 1009, "Application WebSocket frame exceeds the size limit");
      throw new Error("Application WebSocket frame exceeds the size limit.");
    }
    const delivery = registration.inboundChain.then(async () => {
      if (registration.state !== "ACTIVE") throw new Error("Application WebSocket session is not active.");
      await registration.handler?.onMessage?.(applicationWebSocketFrameFromIpc(frame));
    });
    registration.inboundChain = delivery.catch(() => undefined);
    try { await delivery; }
    catch (error) {
      await this.failSession(sessionId, registration, 1011, "Application WebSocket message handler failed");
      throw error;
    }
  }

  async close(sessionId: string, code: number, reason: string): Promise<void> {
    const registration = this.registrations.get(sessionId);
    if (!registration) return;
    this.registrations.delete(sessionId);
    await this.finalize(registration, code, reason);
  }

  async closeAll(): Promise<void> {
    await Promise.allSettled(Array.from(this.registrations.keys()).map((sessionId) =>
      this.close(sessionId, 1012, "Application worker stopped")));
  }

  private async send(
    sessionId: string,
    registration: Registration,
    frame: ApplicationWebSocketFrame | string | Uint8Array,
  ): Promise<void> {
    if (registration.state !== "OPENING" && registration.state !== "ACTIVE") {
      throw new Error("Application WebSocket session is closed.");
    }
    const ipcFrame = applicationWebSocketFrameToIpc(frame);
    if (frameBytes(ipcFrame) > APPLICATION_WEBSOCKET_FRAME_BYTES_LIMIT) {
      throw new Error("Application WebSocket frame exceeds the size limit.");
    }
    if (registration.outboundPending >= APPLICATION_WEBSOCKET_WORKER_OUTBOUND_QUEUE_LIMIT) {
      await this.failSession(sessionId, registration, 1013, "Application WebSocket outbound limit exceeded");
      throw new Error("Application WebSocket outbound queue limit exceeded.");
    }
    registration.outboundPending += 1;
    const delivery = registration.outboundChain.then(async () => {
      if (registration.state !== "OPENING" && registration.state !== "ACTIVE") {
        throw new Error("Application WebSocket session is closed.");
      }
      await this.invokeAction({ action: "send", sessionId, frame: ipcFrame });
    });
    registration.outboundChain = delivery.catch(() => undefined);
    try { await delivery; }
    catch (error) {
      await this.failSession(sessionId, registration, 1011, "Application WebSocket outbound delivery failed");
      throw error;
    } finally {
      registration.outboundPending -= 1;
    }
  }

  private async requestBackendClose(
    sessionId: string,
    registration: Registration,
    code: number,
    reason: string,
  ): Promise<void> {
    if (registration.state === "CLOSING" || registration.state === "CLOSED") return;
    registration.state = "CLOSING";
    try { await this.invokeAction({ action: "close", sessionId, code, reason }); }
    finally {
      if (this.registrations.get(sessionId) === registration) this.registrations.delete(sessionId);
      await this.finalize(registration, code, reason);
    }
  }

  private async failSession(
    sessionId: string,
    registration: Registration,
    code: number,
    reason: string,
  ): Promise<void> {
    if (registration.state === "CLOSED") return;
    registration.state = "CLOSING";
    try { await this.invokeAction({ action: "close", sessionId, code, reason }); } catch { /* worker transport already failed */ }
    if (this.registrations.get(sessionId) === registration) this.registrations.delete(sessionId);
    await this.finalize(registration, code, reason);
  }

  private async finalize(registration: Registration, code: number, reason: string): Promise<void> {
    if (registration.state === "CLOSED") return;
    registration.state = "CLOSED";
    registration.closeEvent ??= { code, reason };
    if (!registration.controller.signal.aborted) registration.controller.abort();
    await this.notifyCloseHandler(registration);
  }

  private async notifyCloseHandler(registration: Registration): Promise<void> {
    if (registration.closeHandled || !registration.handler || !registration.closeEvent) return;
    registration.closeHandled = true;
    try { await registration.handler.onClose?.(registration.closeEvent); } catch { /* close isolation */ }
  }
}
