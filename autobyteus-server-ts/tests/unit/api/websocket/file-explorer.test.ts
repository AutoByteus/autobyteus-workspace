import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStreamHandler = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  handleMessage: vi.fn(),
}));

vi.mock("../../../../src/services/file-explorer-streaming/index.js", () => ({
  getFileExplorerStreamHandler: () => mockStreamHandler,
}));

const { registerFileExplorerWebsocket } = await import("../../../../src/api/websocket/file-explorer.js");
const { setWebSocketRefusal } = await import("../../../../src/api/security/node-access-gate.js");
const { NODE_ACCESS_REFUSALS } = await import("../../../../src/node-access/domain/node-access-refusal.js");

class MockSocket extends EventEmitter {
  send = vi.fn();
  close = vi.fn();
}

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("registerFileExplorerWebsocket", () => {
  let routeHandler: ((connection: unknown, req: unknown) => void) | null = null;

  beforeEach(async () => {
    routeHandler = null;
    mockStreamHandler.connect.mockReset();
    mockStreamHandler.disconnect.mockReset().mockResolvedValue(undefined);
    mockStreamHandler.handleMessage.mockReset().mockResolvedValue(null);

    const app = {
      get: vi.fn((_path, _options, handler) => {
        routeHandler = handler;
      }),
    };
    await registerFileExplorerWebsocket(app as any);
  });

  const attach = (socket: MockSocket) => {
    // The node access gate admitted the upgrade before the route runs; the route receives the socket itself.
    routeHandler?.(socket, {
      params: { workspaceId: "ws-1" },
      raw: { socket: { remoteAddress: "127.0.0.1" } },
      url: "/ws/file-explorer/ws-1",
    });
  };

  it("disconnects a late session when the socket closes before connect resolves", async () => {
    const socket = new MockSocket();
    let resolveConnect: (value: string | null) => void = () => undefined;
    mockStreamHandler.connect.mockReturnValue(new Promise((resolve) => {
      resolveConnect = resolve;
    }));

    attach(socket);
    await flushPromises();
    socket.emit("close");
    resolveConnect("late-session");
    await flushPromises();

    expect(mockStreamHandler.disconnect).toHaveBeenCalledWith("late-session");
  });

  it("disconnects an established session on close", async () => {
    const socket = new MockSocket();
    mockStreamHandler.connect.mockResolvedValue("session-1");

    attach(socket);
    await flushPromises();
    socket.emit("close");
    await flushPromises();

    expect(mockStreamHandler.disconnect).toHaveBeenCalledWith("session-1");
  });

  it("does not start backend connect when the node access gate refused the upgrade (closed with its code)", async () => {
    const socket = new MockSocket();
    const request = { params: { workspaceId: "ws-1" }, raw: {}, url: "/ws/file-explorer/ws-1" };
    setWebSocketRefusal(request as never, NODE_ACCESS_REFUSALS.credentialRequired);

    routeHandler?.(socket, request);
    await flushPromises();

    expect(socket.close).toHaveBeenCalledWith(4401, "NODE_CREDENTIAL_REQUIRED");
    expect(mockStreamHandler.connect).not.toHaveBeenCalled();
  });
});
