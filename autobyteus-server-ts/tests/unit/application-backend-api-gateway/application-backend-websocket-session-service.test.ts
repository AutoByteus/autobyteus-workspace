import { describe, expect, it, vi } from "vitest";
import { ApplicationBackendWebSocketSessionService } from "../../../src/application-backend-api-gateway/websockets/application-backend-websocket-session-service.js";
import {
  APPLICATION_WEBSOCKET_INBOUND_QUEUE_LIMIT,
  APPLICATION_WEBSOCKET_NETWORK_BUFFERED_AMOUNT_LIMIT,
} from "../../../src/application-communication-limits.js";

class TestSocket {
  bufferedAmount = 0;
  sent: Array<string | Uint8Array> = [];
  closes: Array<{ code?: number; reason?: string }> = [];
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  send(value: string | Uint8Array): void { this.sent.push(value); }
  close(code?: number, reason?: string): void { this.closes.push({ code, reason }); }
  on(event: string, listener: (...args: unknown[]) => void): void { const set = this.listeners.get(event) ?? new Set(); set.add(listener); this.listeners.set(event, set); }
  emit(event: string, ...args: unknown[]): void { for (const listener of this.listeners.get(event) ?? []) listener(...args); }
}
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>((next) => { resolve = next; }); return { promise, resolve }; };
const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };

describe("ApplicationBackendWebSocketSessionService", () => {
  it("rejects a raw client frame before readiness instead of queueing it", async () => {
    const gate = deferred();
    const socket = new TestSocket();
    const engine = {
      onWebSocketAction: vi.fn(), onWorkerClose: vi.fn(),
      openApplicationWebSocket: vi.fn(async () => undefined), closeApplicationWebSocket: vi.fn(async () => undefined),
      deliverApplicationWebSocketMessage: vi.fn(async () => undefined),
    };
    const service = new ApplicationBackendWebSocketSessionService({ engineHostService: engine as never });
    service.connect({ applicationId: "app-1", request: { path: "/room", params: {}, query: {}, headers: {} }, socket, requireApplication: () => gate.promise });
    socket.emit("message", "early", false);
    gate.resolve();
    await flush();
    expect(socket.closes[0]?.code).toBe(1002);
    expect(engine.deliverApplicationWebSocketMessage).not.toHaveBeenCalled();
  });

  it("orders the reserved READY frame before backend sends accepted during open", async () => {
    const socket = new TestSocket();
    let actionListener!: (event: any) => Promise<void>;
    const engine: any = {
      onWebSocketAction: (listener: typeof actionListener) => { actionListener = listener; },
      onWorkerClose: vi.fn(), closeApplicationWebSocket: vi.fn(async () => undefined), deliverApplicationWebSocketMessage: vi.fn(async () => undefined),
    };
    engine.openApplicationWebSocket = vi.fn(async (_app: string, input: any) => {
      await actionListener({ applicationId: "app-1", action: { action: "send", sessionId: input.sessionId, frame: { kind: "text", text: "business" } } });
    });
    const service = new ApplicationBackendWebSocketSessionService({ engineHostService: engine });
    service.connect({ applicationId: "app-1", request: { path: "/room", params: {}, query: {}, headers: {} }, socket, requireApplication: async () => undefined });
    await flush();
    expect(socket.sent.map(String)).toEqual([
      JSON.stringify({ protocol: "autobyteus.application-backend.websocket.v1", type: "CONNECTION_READY" }),
      "business",
    ]);
  });

  it("accepts the inbound queue limit and closes only the overflowing session above it", async () => {
    const socket = new TestSocket();
    const delivery = deferred();
    const engine = {
      onWebSocketAction: vi.fn(), onWorkerClose: vi.fn(),
      openApplicationWebSocket: vi.fn(async () => undefined),
      closeApplicationWebSocket: vi.fn(async () => undefined),
      deliverApplicationWebSocketMessage: vi.fn(() => delivery.promise),
    };
    const service = new ApplicationBackendWebSocketSessionService({ engineHostService: engine as never });
    service.connect({ applicationId: "app-1", request: { path: "/room", params: {}, query: {}, headers: {} }, socket, requireApplication: async () => undefined });
    await flush();
    for (let index = 0; index < APPLICATION_WEBSOCKET_INBOUND_QUEUE_LIMIT; index += 1) {
      socket.emit("message", `frame-${index}`, false);
    }
    expect(socket.closes).toEqual([]);
    socket.emit("message", "overflow", false);
    expect(socket.closes[0]?.code).toBe(1013);
    delivery.resolve();
  });

  it("allows an equal socket buffer and closes above the network backpressure limit", async () => {
    const socket = new TestSocket();
    let actionListener!: (event: any) => Promise<void>;
    let sessionId = "";
    const engine: any = {
      onWebSocketAction: (listener: typeof actionListener) => { actionListener = listener; },
      onWorkerClose: vi.fn(),
      closeApplicationWebSocket: vi.fn(async () => undefined),
      deliverApplicationWebSocketMessage: vi.fn(async () => undefined),
      openApplicationWebSocket: vi.fn(async (_app: string, input: any) => { sessionId = input.sessionId; }),
    };
    const service = new ApplicationBackendWebSocketSessionService({ engineHostService: engine });
    service.connect({ applicationId: "app-1", request: { path: "/room", params: {}, query: {}, headers: {} }, socket, requireApplication: async () => undefined });
    await flush();
    socket.bufferedAmount = APPLICATION_WEBSOCKET_NETWORK_BUFFERED_AMOUNT_LIMIT;
    await actionListener({ applicationId: "app-1", action: { action: "send", sessionId, frame: { kind: "text", text: "equal" } } });
    expect(socket.sent.at(-1)).toBe("equal");
    socket.bufferedAmount += 1;
    await expect(actionListener({ applicationId: "app-1", action: { action: "send", sessionId, frame: { kind: "text", text: "above" } } })).rejects.toThrow(
      "backpressure limit exceeded",
    );
    expect(socket.closes.at(-1)?.code).toBe(1013);
  });
});
