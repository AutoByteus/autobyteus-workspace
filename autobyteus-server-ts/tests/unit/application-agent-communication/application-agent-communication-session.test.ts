import { describe, expect, it, vi } from "vitest";
import { APPLICATION_AGENT_COMMUNICATION_PROTOCOL } from "@autobyteus/application-sdk-contracts";
import { APPLICATION_AGENT_COMMUNICATION_SOCKET_BUFFER_LIMIT } from "../../../src/application-communication-limits.js";
import { ApplicationAgentCommunicationSession } from "../../../src/application-agent-communication/services/application-agent-communication-session.js";

class TestSocket {
  bufferedAmount = 0;
  sent: string[] = [];
  closed: Array<{ code?: number; reason?: string }> = [];
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  send(payload: string): void { this.sent.push(payload); }
  close(code?: number, reason?: string): void { this.closed.push({ code, reason }); }
  on(event: string, listener: (...args: unknown[]) => void): void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }
  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

const address = { bindingId: "binding-1", target: { kind: "AGENT_RUN" as const } };
const parse = (socket: TestSocket) => socket.sent.map((value) => JSON.parse(value));
const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };

describe("ApplicationAgentCommunicationSession", () => {
  it("writes READY before enabling drain and correlates input without crossing the application backend", async () => {
    const socket = new TestSocket();
    const order: string[] = [];
    socket.send = (payload) => { order.push(JSON.parse(payload).type); socket.sent.push(payload); };
    const sendRunInput = vi.fn(async () => ({ bindingId: "binding-1" }));
    const session = new ApplicationAgentCommunicationSession({
      sessionId: "session-1",
      applicationId: "app-1",
      address,
      socket,
      streaming: {
        subscribePaused: vi.fn(async () => ({
          beginReadyCommit: () => true,
          enableDrain: () => { order.push("DRAIN_ENABLED"); return true; },
          cancelPreReady: vi.fn(),
          unsubscribe: vi.fn(async () => undefined),
        })),
      } as never,
      orchestration: { sendRunInput } as never,
      onFinalized: vi.fn(),
    });

    await session.establish();
    expect(order).toEqual(["READY", "DRAIN_ENABLED"]);
    socket.emit("message", JSON.stringify({
      protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
      type: "INPUT",
      requestId: "request-1",
      input: { text: "continue" },
    }), false);
    await flush();
    expect(sendRunInput).toHaveBeenCalledWith("app-1", { address, input: { text: "continue" } });
    expect(parse(socket).map((frame) => frame.type)).toEqual(["READY", "INPUT_ACCEPTED"]);
  });

  it("lets a pre-ready terminal callback win without exposing READY or events", async () => {
    const socket = new TestSocket();
    const cancelPreReady = vi.fn();
    const session = new ApplicationAgentCommunicationSession({
      sessionId: "session-2",
      applicationId: "app-1",
      address,
      socket,
      streaming: {
        subscribePaused: vi.fn(async (input: { onPreReadyTerminal: () => void }) => {
          input.onPreReadyTerminal();
          return { beginReadyCommit: vi.fn(() => true), enableDrain: vi.fn(() => true), cancelPreReady, unsubscribe: vi.fn(async () => undefined) };
        }),
      } as never,
      orchestration: { sendRunInput: vi.fn() } as never,
      onFinalized: vi.fn(),
    });

    await session.establish();
    expect(parse(socket).map((frame) => frame.type)).toEqual(["ERROR", "CLOSED"]);
    expect(parse(socket)[0].error.code).toBe("TARGET_NOT_AVAILABLE");
    expect(cancelPreReady).toHaveBeenCalledOnce();
    expect(socket.closed).toHaveLength(1);
  });

  it("rejects binary and duplicate in-flight input as a protocol failure", async () => {
    const socket = new TestSocket();
    let resolveInput!: () => void;
    const sendRunInput = vi.fn(() => new Promise<void>((resolve) => { resolveInput = resolve; }));
    const session = new ApplicationAgentCommunicationSession({
      sessionId: "session-3",
      applicationId: "app-1",
      address,
      socket,
      streaming: {
        subscribePaused: vi.fn(async () => ({ beginReadyCommit: () => true, enableDrain: () => true, cancelPreReady: vi.fn(), unsubscribe: vi.fn(async () => undefined) })),
      } as never,
      orchestration: { sendRunInput } as never,
      onFinalized: vi.fn(),
    });
    await session.establish();
    const input = JSON.stringify({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: "INPUT", requestId: "same", input: { text: "one" } });
    socket.emit("message", input, false);
    socket.emit("message", input, false);
    expect(parse(socket).slice(-2).map((frame) => frame.type)).toEqual(["ERROR", "CLOSED"]);
    expect(parse(socket).at(-2).error.code).toBe("PROTOCOL_ERROR");
    resolveInput();
  });

  it("treats a terminal observed during the synchronous READY write as post-ready and preserves ordering", async () => {
    const socket = new TestSocket();
    let terminal!: () => void;
    let emitter!: { emitClosed: (close: { reason: "BINDING_ENDED" }) => Promise<void> };
    const originalSend = socket.send.bind(socket);
    socket.send = (payload) => {
      originalSend(payload);
      if (JSON.parse(payload).type === "READY") terminal();
    };
    const session = new ApplicationAgentCommunicationSession({
      sessionId: "session-ready-terminal",
      applicationId: "app-1",
      address,
      socket,
      streaming: {
        subscribePaused: vi.fn(async (input: any) => {
          terminal = input.onPreReadyTerminal;
          emitter = input.emitter;
          return {
            beginReadyCommit: () => true,
            enableDrain: () => { void emitter.emitClosed({ reason: "BINDING_ENDED" }); return true; },
            cancelPreReady: vi.fn(),
            unsubscribe: vi.fn(async () => undefined),
          };
        }),
      } as never,
      orchestration: { sendRunInput: vi.fn() } as never,
      onFinalized: vi.fn(),
    });

    await session.establish();
    expect(parse(socket).map((frame) => frame.type)).toEqual(["READY", "CLOSED"]);
    expect(parse(socket).at(-1).close.reason).toBe("BINDING_ENDED");
  });

  it("drops the paused stream when the READY write itself throws", async () => {
    const socket = new TestSocket();
    const cancelPreReady = vi.fn();
    socket.send = () => { throw new Error("write failed"); };
    const session = new ApplicationAgentCommunicationSession({
      sessionId: "session-ready-failure",
      applicationId: "app-1",
      address,
      socket,
      streaming: {
        subscribePaused: vi.fn(async () => ({
          beginReadyCommit: () => true,
          enableDrain: vi.fn(() => true),
          cancelPreReady,
          unsubscribe: vi.fn(async () => undefined),
        })),
      } as never,
      orchestration: { sendRunInput: vi.fn() } as never,
      onFinalized: vi.fn(),
    });

    await session.establish();
    expect(socket.sent).toEqual([]);
    expect(cancelPreReady).toHaveBeenCalledOnce();
    expect(socket.closed).toHaveLength(1);
  });

  it("allows the exact network buffer bound and reports backpressure above it", async () => {
    const createSession = (socket: TestSocket) => new ApplicationAgentCommunicationSession({
      sessionId: `session-buffer-${socket.bufferedAmount}`,
      applicationId: "app-1",
      address,
      socket,
      streaming: {
        subscribePaused: vi.fn(async () => ({
          beginReadyCommit: () => true,
          enableDrain: () => true,
          cancelPreReady: vi.fn(),
          unsubscribe: vi.fn(async () => undefined),
        })),
      } as never,
      orchestration: { sendRunInput: vi.fn() } as never,
      onFinalized: vi.fn(),
    });
    const acceptedSocket = new TestSocket();
    acceptedSocket.bufferedAmount = APPLICATION_AGENT_COMMUNICATION_SOCKET_BUFFER_LIMIT;
    await createSession(acceptedSocket).establish();
    expect(parse(acceptedSocket).map((frame) => frame.type)).toEqual(["READY"]);

    const rejectedSocket = new TestSocket();
    rejectedSocket.bufferedAmount = APPLICATION_AGENT_COMMUNICATION_SOCKET_BUFFER_LIMIT + 1;
    await createSession(rejectedSocket).establish();
    expect(rejectedSocket.sent).toEqual([]);
    expect(rejectedSocket.closed).toEqual([{ code: 1013, reason: "backpressure limit" }]);
  });
});
