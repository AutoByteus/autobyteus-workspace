import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStreamHandler = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  handleMessage: vi.fn(),
}));
const mockAuthorizeRemoteAccessWebSocket = vi.hoisted(() => vi.fn());
const mockCloseSocketForRemoteAccessRejection = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/services/file-explorer-streaming/index.js", () => ({
  getFileExplorerStreamHandler: () => mockStreamHandler,
}));

vi.mock("../../../../src/api/websocket/remote-access-websocket-auth.js", () => ({
  authorizeRemoteAccessWebSocket: mockAuthorizeRemoteAccessWebSocket,
  closeSocketForRemoteAccessRejection: mockCloseSocketForRemoteAccessRejection,
}));

const { registerFileExplorerWebsocket } = await import("../../../../src/api/websocket/file-explorer.js");

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
    mockAuthorizeRemoteAccessWebSocket.mockReset().mockResolvedValue({ mode: "loopback", isAuthenticated: true });
    mockCloseSocketForRemoteAccessRejection.mockReset();

    const app = {
      get: vi.fn((_path, _options, handler) => {
        routeHandler = handler;
      }),
    };
    await registerFileExplorerWebsocket(app as any);
  });

  const attach = (socket: MockSocket) => {
    routeHandler?.({ socket }, {
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

  it("does not start backend connect after an authorization rejection closes the socket", async () => {
    const socket = new MockSocket();
    const rejection = { code: 4401, reason: "REMOTE_ACCESS_AUTH_INVALID" };
    mockAuthorizeRemoteAccessWebSocket.mockRejectedValue(rejection);

    attach(socket);
    await flushPromises();

    expect(mockCloseSocketForRemoteAccessRejection).toHaveBeenCalledWith(socket, rejection, expect.anything());
    expect(mockStreamHandler.connect).not.toHaveBeenCalled();
  });
});
