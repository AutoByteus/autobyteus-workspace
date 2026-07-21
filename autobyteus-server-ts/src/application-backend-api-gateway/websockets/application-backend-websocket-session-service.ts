import { randomUUID } from "node:crypto";
import type { ApplicationWebSocketRequest } from "@autobyteus/application-sdk-contracts";
import {
  ApplicationEngineHostService,
  getApplicationEngineHostService,
} from "../../application-engine/services/application-engine-host-service.js";
import type {
  ApplicationWebSocketIpcFrame,
  ApplicationWorkerWebSocketActionInput,
} from "../../application-engine/runtime/protocol.js";
import {
  APPLICATION_WEBSOCKET_EARLY_OUTBOUND_QUEUE_LIMIT,
  APPLICATION_WEBSOCKET_FRAME_BYTES_LIMIT,
  APPLICATION_WEBSOCKET_INBOUND_QUEUE_LIMIT,
  APPLICATION_WEBSOCKET_NETWORK_BUFFERED_AMOUNT_LIMIT,
} from "../../application-communication-limits.js";

export type ApplicationBackendNetworkWebSocket = {
  bufferedAmount?: number;
  send: (data: string | Uint8Array) => void;
  close: (code?: number, reason?: string) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

type Session = {
  applicationId: string;
  sessionId: string;
  socket: ApplicationBackendNetworkWebSocket;
  state: "PENDING_WORKER" | "READY_COMMIT" | "ACTIVE" | "CLOSING" | "CLOSED";
  inbound: ApplicationWebSocketIpcFrame[];
  earlyOutbound: ApplicationWebSocketIpcFrame[];
  inboundDraining: boolean;
};

const READY_FRAME = JSON.stringify({
  protocol: "autobyteus.application-backend.websocket.v1",
  type: "CONNECTION_READY",
});
const frameBytes = (frame: ApplicationWebSocketIpcFrame): number =>
  frame.kind === "text" ? Buffer.byteLength(frame.text, "utf8") : Buffer.byteLength(frame.dataBase64, "base64");
const toIpcFrame = (data: unknown, isBinary: boolean): ApplicationWebSocketIpcFrame | null => {
  if (typeof data === "string") return isBinary
    ? { kind: "binary", dataBase64: Buffer.from(data).toString("base64") }
    : { kind: "text", text: data };
  if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
    const buffer = Buffer.from(data as Uint8Array);
    return isBinary ? { kind: "binary", dataBase64: buffer.toString("base64") } : { kind: "text", text: buffer.toString("utf8") };
  }
  return null;
};

export class ApplicationBackendWebSocketSessionService {
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly dependencies: { engineHostService?: ApplicationEngineHostService } = {}) {
    this.engineHostService.onWebSocketAction((event) => this.handleWorkerAction(event.applicationId, event.action));
    this.engineHostService.onWorkerClose(({ applicationId }) => this.closeApplicationSessions(applicationId));
  }
  private get engineHostService(): ApplicationEngineHostService {
    return this.dependencies.engineHostService ?? getApplicationEngineHostService();
  }

  connect(input: {
    applicationId: string;
    request: ApplicationWebSocketRequest;
    socket: ApplicationBackendNetworkWebSocket;
    requireApplication: () => Promise<void>;
  }): string {
    const session: Session = {
      applicationId: input.applicationId,
      sessionId: randomUUID(),
      socket: input.socket,
      state: "PENDING_WORKER",
      inbound: [],
      earlyOutbound: [],
      inboundDraining: false,
    };
    this.sessions.set(session.sessionId, session);
    input.socket.on("message", (data, isBinary) => this.receiveNetworkFrame(session, data, isBinary === true));
    input.socket.on("close", (code, reason) => this.onNetworkClose(session, Number(code ?? 1006), String(reason ?? "")));
    input.socket.on("error", () => this.onNetworkClose(session, 1011, "Network transport failed"));
    void this.establish(session, input).catch(() => this.closeNetwork(session, 1011, "Application backend connection rejected"));
    return session.sessionId;
  }

  private async establish(
    session: Session,
    input: { request: ApplicationWebSocketRequest; requireApplication: () => Promise<void> },
  ): Promise<void> {
    await input.requireApplication();
    if (session.state !== "PENDING_WORKER") return;
    await this.engineHostService.openApplicationWebSocket(session.applicationId, {
      sessionId: session.sessionId,
      request: input.request,
    });
    if (session.state !== "PENDING_WORKER") {
      await this.closeWorker(session, 1000, "Network session closed during establishment");
      return;
    }
    session.state = "READY_COMMIT";
    this.sendNetwork(session, { kind: "text", text: READY_FRAME });
    session.state = "ACTIVE";
    for (const frame of session.earlyOutbound.splice(0)) this.sendNetwork(session, frame);
  }

  private receiveNetworkFrame(session: Session, data: unknown, isBinary: boolean): void {
    if (session.state === "CLOSING" || session.state === "CLOSED") return;
    const frame = toIpcFrame(data, isBinary);
    if (!frame || frameBytes(frame) > APPLICATION_WEBSOCKET_FRAME_BYTES_LIMIT) {
      this.closeNetwork(session, 1009, "Application WebSocket frame exceeds the size limit");
      return;
    }
    if (session.state !== "ACTIVE") {
      this.closeNetwork(session, 1002, "Application WebSocket message arrived before readiness");
      return;
    }
    if (session.inbound.length >= APPLICATION_WEBSOCKET_INBOUND_QUEUE_LIMIT) {
      this.closeNetwork(session, 1013, "Application WebSocket inbound limit exceeded");
      return;
    }
    session.inbound.push(frame);
    this.scheduleInboundDrain(session);
  }

  private scheduleInboundDrain(session: Session): void {
    if (session.inboundDraining || session.state !== "ACTIVE") return;
    session.inboundDraining = true;
    queueMicrotask(() => { void this.drainInbound(session); });
  }

  private async drainInbound(session: Session): Promise<void> {
    try {
      while (session.state === "ACTIVE" && session.inbound.length > 0) {
        await this.engineHostService.deliverApplicationWebSocketMessage(session.applicationId, {
          sessionId: session.sessionId,
          frame: session.inbound.shift()!,
        });
      }
    } catch {
      this.closeNetwork(session, 1011, "Application backend message delivery failed");
    } finally {
      session.inboundDraining = false;
      if (session.state === "ACTIVE" && session.inbound.length > 0) this.scheduleInboundDrain(session);
    }
  }

  private async handleWorkerAction(applicationId: string, action: ApplicationWorkerWebSocketActionInput): Promise<void> {
    const session = this.sessions.get(action.sessionId);
    if (!session || session.applicationId !== applicationId || session.state === "CLOSED") {
      throw new Error("Application WebSocket session is not available.");
    }
    if (action.action === "close") {
      this.closeNetwork(session, action.code, action.reason);
      return;
    }
    if (frameBytes(action.frame) > APPLICATION_WEBSOCKET_FRAME_BYTES_LIMIT) {
      this.closeNetwork(session, 1009, "Application WebSocket frame exceeds the size limit");
      throw new Error("Application WebSocket frame exceeds the size limit.");
    }
    if (session.state !== "ACTIVE") {
      if (session.earlyOutbound.length >= APPLICATION_WEBSOCKET_EARLY_OUTBOUND_QUEUE_LIMIT) {
        this.closeNetwork(session, 1013, "Application WebSocket outbound limit exceeded");
        throw new Error("Application WebSocket outbound queue limit exceeded.");
      }
      session.earlyOutbound.push(action.frame);
      return;
    }
    this.sendNetwork(session, action.frame);
  }

  private sendNetwork(session: Session, frame: ApplicationWebSocketIpcFrame): void {
    if ((session.socket.bufferedAmount ?? 0) > APPLICATION_WEBSOCKET_NETWORK_BUFFERED_AMOUNT_LIMIT) {
      this.closeNetwork(session, 1013, "Application WebSocket network backpressure limit exceeded");
      throw new Error("Application WebSocket network backpressure limit exceeded.");
    }
    session.socket.send(frame.kind === "text" ? frame.text : Uint8Array.from(Buffer.from(frame.dataBase64, "base64")));
  }

  private onNetworkClose(session: Session, code: number, reason: string): void {
    if (session.state === "CLOSED") return;
    session.state = "CLOSED";
    this.sessions.delete(session.sessionId);
    session.inbound.length = 0;
    session.earlyOutbound.length = 0;
    void this.closeWorker(session, code, reason);
  }
  private closeNetwork(session: Session, code: number, reason: string): void {
    if (session.state === "CLOSED" || session.state === "CLOSING") return;
    session.state = "CLOSING";
    try { session.socket.close(code, reason.slice(0, 123)); } finally { this.onNetworkClose(session, code, reason); }
  }
  private async closeWorker(session: Session, code: number, reason: string): Promise<void> {
    await this.engineHostService.closeApplicationWebSocket(session.applicationId, {
      sessionId: session.sessionId,
      code,
      reason,
    }).catch(() => undefined);
  }
  private closeApplicationSessions(applicationId: string): void {
    for (const session of this.sessions.values()) {
      if (session.applicationId === applicationId) this.closeNetwork(session, 1012, "Application backend worker stopped");
    }
  }
}
